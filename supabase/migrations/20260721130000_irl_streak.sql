-- M1 IRL STREAK (HANDOFF-GAMIFIKACIJA §M1): Snap streak, ali se plaća telom.
-- Niz UZASTOPNIH NEDELJA u kojima su dvoje bili na ISTOM mestu iste noći.
-- Bez novih tabela (computed), bez ekonomije u v1 — čist socijalni trofej.
-- Consent ograda: par postoji SAMO ako veza već postoji (mutual iskra,
-- ista ekipa, ili završena ŠIFRA) — nikad random stranci.
CREATE OR REPLACE FUNCTION public.get_irl_streaks()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid();
BEGIN
  IF v IS NULL THEN RETURN '[]'::json; END IF;

  RETURN COALESCE((
    WITH mutuals AS (
      SELECT DISTINCT partner FROM (
        SELECT CASE WHEN s.from_user = v THEN s.to_user ELSE s.from_user END AS partner
          FROM public.sparks s
         WHERE s.status = 'mutual' AND (s.from_user = v OR s.to_user = v)
        UNION
        SELECT cm2.user_id
          FROM public.crew_members cm1
          JOIN public.crew_members cm2 ON cm2.crew_id = cm1.crew_id AND cm2.user_id <> v
         WHERE cm1.user_id = v
        UNION
        SELECT CASE WHEN dp.user_a = v THEN dp.user_b ELSE dp.user_a END
          FROM public.dare_pairs dp
         WHERE dp.completed_at IS NOT NULL AND (dp.user_a = v OR dp.user_b = v)
      ) x WHERE partner IS NOT NULL AND partner <> v
    ),
    -- Zajedničke noći: isti venue, ista nightlife noć (posle ponoći = ista noć).
    shared AS (
      SELECT m.partner,
             public.nightlife_date_of(a.created_at) AS night,
             a.venue_id
        FROM mutuals m
        JOIN public.venue_checkins a ON a.user_id = v
        JOIN public.venue_checkins b ON b.user_id = m.partner
         AND b.venue_id = a.venue_id
         AND public.nightlife_date_of(b.created_at) = public.nightlife_date_of(a.created_at)
       GROUP BY m.partner, public.nightlife_date_of(a.created_at), a.venue_id
    ),
    weeks AS (
      SELECT partner, date_trunc('week', night)::date AS wk, max(night) AS last_night
        FROM shared GROUP BY partner, date_trunc('week', night)::date
    ),
    -- Uzastopnost: rednи broj nedelje minus rang → konstanta unutar niza.
    grp AS (
      SELECT partner, wk, last_night,
             (wk - (row_number() OVER (PARTITION BY partner ORDER BY wk))::int * 7) AS anchor
        FROM weeks
    ),
    runs AS (
      SELECT partner, anchor, count(*)::int AS weeks_in_run,
             max(wk) AS last_wk, max(last_night) AS last_night
        FROM grp GROUP BY partner, anchor
    ),
    -- Živ niz = završava se ovom ili prošlom nedeljom (tekuća bez izlaska ne lomi).
    live AS (
      SELECT DISTINCT ON (partner) partner, weeks_in_run, last_wk, last_night
        FROM runs
       WHERE last_wk >= date_trunc('week', now())::date - 7
       ORDER BY partner, last_wk DESC
    )
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT l.partner AS partner_id,
             COALESCE(p.display_name, 'raver') AS partner_name,
             p.avatar_url AS partner_avatar,
             l.weeks_in_run AS streak_weeks,
             l.last_night,
             (SELECT vn.name FROM public.venue_checkins vc
                JOIN public.venues vn ON vn.id = vc.venue_id
               WHERE vc.user_id = v AND public.nightlife_date_of(vc.created_at) = l.last_night
               ORDER BY vc.created_at DESC LIMIT 1) AS last_venue,
             -- da li ste OBOJE tu VEČERAS (živ chip u hubu)
             EXISTS (
               SELECT 1 FROM public.venue_checkins a
                 JOIN public.venue_checkins b ON b.venue_id = a.venue_id
                  AND public.nightlife_date_of(b.created_at) = public.nightlife_date_of(a.created_at)
                WHERE a.user_id = v AND b.user_id = l.partner
                  AND public.nightlife_date_of(a.created_at) = public.nightlife_date_of(now())
             ) AS together_tonight
        FROM live l
        LEFT JOIN public.profiles p ON p.user_id = l.partner
       WHERE l.weeks_in_run >= 1
       ORDER BY l.weeks_in_run DESC, l.last_night DESC
       LIMIT 10
    ) t
  ), '[]'::json);
END;$$;
