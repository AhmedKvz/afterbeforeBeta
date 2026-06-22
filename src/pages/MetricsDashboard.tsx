import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const db = supabase as any;

const DOW = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'];

interface Metrics {
  total_users: number;
  activated_users: number;
  activation_pct: number;
  signups_7d: number;
  founding_ravers: number;
  checkins_total: number;
  checkins_7d: number;
  checkins_by_dow: Record<string, number>;
  active_streaks: number;
  avg_streak: number;
  nps_total: number;
  nps_yes: number;
  nps_maybe: number;
  nps_no: number;
  nps_pct: number;
  weekend_cohort: number;
  weekend_retained: number;
  weekend_retention: number;
}

const Stat = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">{label}</div>
    <div className={`text-3xl font-black ${accent ? 'text-green-400' : 'text-foreground'}`}>{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const RetentionBar = ({ pct, label }: { pct: number; label: string }) => (
  <div>
    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
      <span>{label}</span><span className="font-bold text-foreground">{pct}%</span>
    </div>
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          background: pct >= 40 ? 'oklch(0.65 0.22 145)' : pct >= 20 ? 'oklch(0.65 0.18 60)' : 'oklch(0.65 0.18 15)',
        }}
      />
    </div>
  </div>
);

const MetricsDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Metrics>({
    queryKey: ['beta-metrics'],
    queryFn: async () => {
      const { data, error } = await db.rpc('get_beta_metrics');
      if (error) throw error;
      return data as Metrics;
    },
    refetchInterval: false,
    retry: false,
  });

  if (!profile?.is_founding_raver) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-2">🔒</div>
          <div className="text-sm">Nemaš pristup ovoj stranici.</div>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
      Greška pri učitavanju metrika.
    </div>
  );

  const dowMax = Math.max(...Object.values(data.checkins_by_dow || {}), 1);

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="px-4 pt-safe pt-4 pb-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="text-[15px] font-bold">Beta Metrics</div>
          <div className="text-[11px] text-muted-foreground">Smart Start grant dashboard</div>
        </div>
        <button onClick={() => refetch()} className={`w-9 h-9 rounded-full bg-white/5 flex items-center justify-center ${isFetching ? 'opacity-50' : ''}`}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ── KEY GRANT METRIC ─────────────────────── */}
        <div>
          <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">🏆 GRANT METRIC — WEEKEND RETENTION</div>
          <div
            className="rounded-2xl border p-5 text-center"
            style={{ background: 'linear-gradient(135deg, oklch(0.20 0.10 145 / 0.5), oklch(0.15 0.06 145 / 0.3))', borderColor: 'oklch(0.45 0.18 145 / 0.5)' }}
          >
            <div className="text-[64px] font-black leading-none" style={{ color: 'oklch(0.72 0.22 145)' }}>
              {data.weekend_retention}%
            </div>
            <div className="text-sm font-semibold mt-1">Korisnika se vratilo sledećeg vikenda</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {data.weekend_retained} od {data.weekend_cohort} koji su izašli bar jednom
            </div>
            <RetentionBar pct={data.weekend_retention} label="" />
            <div className="text-[10px] text-muted-foreground/60 mt-2">Cilj za grant: ≥ 40%</div>
          </div>
        </div>

        {/* ── USERS ──────────────────────────────────── */}
        <div>
          <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">KORISNICI</div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Ukupno" value={data.total_users} sub={`+${data.signups_7d} ove nedelje`} />
            <Stat label="Founding Ravers" value={data.founding_ravers} sub="🏴 OG members" />
            <Stat label="Aktivirani" value={`${data.activation_pct}%`} sub={`${data.activated_users} check-in ≥1×`} accent={data.activation_pct >= 50} />
            <Stat label="Aktivni streaks" value={data.active_streaks} sub={`prosek ${data.avg_streak} dana`} />
          </div>
        </div>

        {/* ── CHECK-INS ──────────────────────────────── */}
        <div>
          <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">CHECK-INI (GPS-VERIFIED)</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="Ukupno" value={data.checkins_total} />
            <Stat label="Ova nedelja" value={data.checkins_7d} accent={data.checkins_7d > 0} />
          </div>

          {/* Day-of-week chart */}
          {Object.keys(data.checkins_by_dow || {}).length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-3">CHECK-INI PO DANU</div>
              <div className="flex items-end gap-1.5 h-16">
                {Array.from({ length: 7 }, (_, dow) => {
                  const cnt = data.checkins_by_dow?.[String(dow)] ?? 0;
                  const h = Math.round((cnt / dowMax) * 56);
                  const isWeekend = dow === 5 || dow === 6;
                  return (
                    <div key={dow} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          height: `${Math.max(h, cnt > 0 ? 4 : 0)}px`,
                          background: isWeekend ? 'oklch(0.55 0.22 260)' : 'rgba(255,255,255,0.15)',
                        }}
                      />
                      <div className={`text-[9px] font-semibold ${isWeekend ? 'text-primary' : 'text-muted-foreground'}`}>{DOW[dow]}</div>
                      <div className="text-[9px] text-muted-foreground">{cnt}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── NPS ────────────────────────────────────── */}
        <div>
          <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">NPS — "PREPORUČIO BI PRIJATELJU?"</div>
          <div className="rounded-2xl border border-border bg-card p-4">
            {data.nps_total === 0 ? (
              <div className="text-[13px] text-muted-foreground text-center py-2">Nema odgovora još · pojavljuje se posle prvog check-in-a</div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-black text-green-400">{data.nps_pct}%</span>
                  <span className="text-[13px] text-muted-foreground">bi preporučilo · {data.nps_total} odgovora</span>
                </div>
                <div className="space-y-2">
                  <RetentionBar pct={Math.round(data.nps_yes * 100 / data.nps_total)} label="🔥 Da, definitivno" />
                  <RetentionBar pct={Math.round(data.nps_maybe * 100 / data.nps_total)} label="🤔 Možda" />
                  <RetentionBar pct={Math.round(data.nps_no * 100 / data.nps_total)} label="👎 Ne baš" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── GRANT COPY ─────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">📋 GRANT TEKST (kopiraj)</div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            "AfterBefore beleži{' '}
            <strong className="text-foreground">{data.weekend_retention}% retenciju</strong>{' '}
            na drugom vikendu — od {data.weekend_cohort} korisnika koji su se čekirali bar jednom,{' '}
            {data.weekend_retained} se vrati sledećeg vikenda. Korisnici ocenjuju iskustvo sa{' '}
            <strong className="text-foreground">{data.nps_pct}% preporuke</strong>{' '}
            ({data.nps_total} prikupljenih odgovora)."
          </p>
        </div>

      </div>
    </div>
  );
};

export default MetricsDashboard;
