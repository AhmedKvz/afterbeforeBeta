import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';

const db = supabase as any;

/**
 * SCENA — profili umetnika (DJ/tattoo/vizuelni/foto/VJ). Odluka 2026-08-08:
 * umetnici daju publiku i sadržaj, NE transakcije (booking = Phase 2).
 * Svi upiti su graceful: dok migracija 20260808120000 ne legne, vraćaju
 * prazno umesto da ruše SCENA prikaz.
 */
export interface Artist {
  userId: string;
  name: string;
  type: string;          // dj | tattoo | visual | photo | vj | other
  ambassador: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  linkUrl: string | null;
  instagram: string | null;
  followers: number;
  nextGig: { title: string; date: string; venue: string | null } | null;
}

export const ARTIST_TYPE_LABEL: Record<string, string> = {
  dj: 'DJ', tattoo: 'TATTOO', visual: 'VIZUELNI UMETNIK', photo: 'FOTOGRAF', vj: 'VJ', other: 'UMETNIK',
};

const today = () => new Date().toISOString().slice(0, 10);

export const useArtists = () => {
  return useQuery<Artist[]>({
    queryKey: ['scena-artists'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data: rows, error } = await db
        .from('profiles')
        .select('user_id, display_name, artist_type, is_ambassador, avatar_url, cover_url, bio, link_url, instagram_handle')
        .eq('account_type', 'artist')
        .order('is_ambassador', { ascending: false });
      if (error || !rows?.length) return []; // pre-migracija ili prazna mreža → pošteno prazno
      const ids = rows.map((r: any) => r.user_id);
      // pratioci + sledeći nastup — oba tolerantna na nepostojeće tabele
      const [{ data: fol }, { data: gigs }] = await Promise.all([
        db.from('artist_follows').select('artist_id').in('artist_id', ids),
        db.from('event_artists').select('artist_id, events(title, date, venue_name)')
          .in('artist_id', ids).gte('events.date', today()),
      ]);
      const folBy: Record<string, number> = {};
      (fol || []).forEach((f: any) => { folBy[f.artist_id] = (folBy[f.artist_id] || 0) + 1; });
      const gigBy: Record<string, any> = {};
      (gigs || []).forEach((g: any) => {
        if (!g.events?.date) return;
        const cur = gigBy[g.artist_id];
        if (!cur || g.events.date < cur.date) gigBy[g.artist_id] = g.events;
      });
      return rows.map((r: any): Artist => ({
        userId: r.user_id, name: r.display_name || 'Umetnik',
        type: r.artist_type || 'other', ambassador: !!r.is_ambassador,
        avatarUrl: r.avatar_url, coverUrl: r.cover_url, bio: r.bio,
        linkUrl: r.link_url, instagram: r.instagram_handle,
        followers: folBy[r.user_id] || 0,
        nextGig: gigBy[r.user_id]
          ? { title: gigBy[r.user_id].title, date: gigBy[r.user_id].date, venue: gigBy[r.user_id].venue_name }
          : null,
      }));
    },
  });
};

/** Timetable umetnika = njegovi eventi (nadolazeći + prošli), automatski. */
export const useArtistGigs = (artistId: string | null) => {
  return useQuery({
    queryKey: ['artist-gigs', artistId],
    enabled: !!artistId,
    queryFn: async () => {
      const { data, error } = await db
        .from('event_artists')
        .select('role, events(id, title, date, start_time, venue_name, image_url, music_genres, venue_type, event_type)')
        .eq('artist_id', artistId);
      if (error) return { upcoming: [], past: [] };
      const evs = (data || []).map((r: any) => r.events).filter(Boolean)
        .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
      const t = today();
      return {
        upcoming: evs.filter((e: any) => (e.date || '') >= t),
        past: evs.filter((e: any) => (e.date || '') < t).reverse().slice(0, 5),
      };
    },
  });
};

export const useArtistGallery = (artistId: string | null) => {
  return useQuery({
    queryKey: ['artist-gallery', artistId],
    enabled: !!artistId,
    queryFn: async () => {
      const { data, error } = await db
        .from('artist_gallery')
        .select('id, image_url, caption, position')
        .eq('artist_id', artistId)
        .order('position', { ascending: true });
      return error ? [] : (data || []);
    },
  });
};

export const useFollowArtist = (artistId: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: following = false } = useQuery({
    queryKey: ['artist-following', artistId, user?.id],
    enabled: !!artistId && !!user,
    queryFn: async () => {
      const { data, error } = await db.from('artist_follows')
        .select('id').eq('artist_id', artistId).eq('user_id', user!.id).maybeSingle();
      return !error && !!data;
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !artistId) throw new Error('auth');
      if (following) {
        await db.from('artist_follows').delete().eq('artist_id', artistId).eq('user_id', user.id);
      } else {
        await db.from('artist_follows').insert({ artist_id: artistId, user_id: user.id });
      }
      return !following;
    },
    onSuccess: (now) => {
      track(now ? 'artist_follow' : 'artist_unfollow', { artist_id: artistId });
      if (now) toast.success('Pratiš ✓ — vidiš njegove evente u GRAD-u.');
      qc.invalidateQueries({ queryKey: ['artist-following', artistId] });
      qc.invalidateQueries({ queryKey: ['scena-artists'] });
    },
    onError: () => toast.error('Nije prošlo — pokušaj ponovo.'),
  });
  return { following, toggle: () => toggle.mutate(), busy: toggle.isPending };
};
