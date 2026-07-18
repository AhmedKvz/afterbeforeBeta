import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

const inp = 'w-full px-3 py-3 rounded-xl bg-card border border-border focus:border-primary outline-none text-sm';
const lbl = 'block text-xs font-medium text-muted-foreground mb-1';

/** Samouslužna objava događaja — svako registrovano mesto (klub/kafić/bar).
 *  publish_venue_event server-side veže event za red u IMENIKU (venues) —
 *  auto-kreira mesto ako ne postoji, pa join-by-name i geofence ostaju čisti. */
export const VenueEventForm = ({ onDone }: { onDone: () => void }) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ title: '', date: '', start: '23:00', end: '', genres: '', lineup: '' });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | null) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/events/${Date.now()}.${ext}`;
      const up = await db.storage.from('media').upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      setImageUrl(pub.publicUrl);
      toast.success('Slika ubačena ✓');
    } catch { toast.error('Upload nije uspeo.'); }
    finally { setBusy(false); }
  };

  const publish = async () => {
    if (!f.title.trim()) { toast.error('Naslov je obavezan.'); return; }
    if (!f.date) { toast.error('Datum je obavezan.'); return; }
    setBusy(true);
    const { error } = await db.rpc('publish_venue_event', {
      p_title: f.title.trim(), p_date: f.date, p_start: f.start || '23:00', p_end: f.end || null,
      p_genres: f.genres.split(',').map((x) => x.trim()).filter(Boolean),
      p_lineup: f.lineup.split(',').map((x) => x.trim()).filter(Boolean),
      p_image_url: imageUrl,
    });
    setBusy(false);
    if (error) { toast.error(error.message || 'Objava nije prošla.'); return; }
    toast.success('Događaj objavljen 🎉 Odmah je vidljiv u appu.');
    setF({ title: '', date: '', start: '23:00', end: '', genres: '', lineup: '' }); setImageUrl(null);
    onDone();
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/60 p-4 space-y-3">
      <div>
        <label className={lbl}>Naslov *</label>
        <input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="npr. Friday Session w/ ..." />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className={lbl}>Datum *</label><input type="date" className={inp} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <div><label className={lbl}>Od</label><input type="time" className={inp} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
        <div><label className={lbl}>Do</label><input type="time" className={inp} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
      </div>
      <div><label className={lbl}>Žanrovi (zarezom)</label><input className={inp} value={f.genres} onChange={(e) => setF({ ...f, genres: e.target.value })} placeholder="techno, house" /></div>
      <div><label className={lbl}>Lineup (zarezom)</label><input className={inp} value={f.lineup} onChange={(e) => setF({ ...f, lineup: e.target.value })} placeholder="DJ jedan, DJ dva" /></div>
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0] || null)} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          {imageUrl ? '✓ Slika ubačena — promeni' : '📷 Dodaj sliku događaja (opciono)'}
        </button>
      </div>
      <button onClick={publish} disabled={busy} className="btn-gradient w-full py-3 rounded-xl font-bold text-sm disabled:opacity-60">
        {busy ? 'Objavljujem…' : 'Objavi događaj →'}
      </button>
    </div>
  );
};

/** Profil mesta: Instagram + cover slika + lokacija (za „kako stići" i geofence). */
export const VenueProfileCard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { data: v } = useQuery({
    queryKey: ['my-venue', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db.from('venues').select('id, name, instagram, cover_url, latitude, longitude, verified, claim_status').eq('claimed_by', user!.id).maybeSingle();
      return data;
    },
  });
  const [ig, setIg] = useState<string | null>(null);

  const save = async (patch: { p_instagram?: string | null; p_cover_url?: string | null; p_lat?: number | null; p_lng?: number | null }) => {
    setBusy(true);
    const { error } = await db.rpc('update_my_venue', { p_instagram: null, p_cover_url: null, p_lat: null, p_lng: null, ...patch });
    setBusy(false);
    if (error) { toast.error(error.message || 'Nije sačuvano.'); return; }
    toast.success('Profil mesta ažuriran ✓');
    qc.invalidateQueries({ queryKey: ['my-venue'] });
    qc.invalidateQueries({ queryKey: ['venue-directory'] });
  };

  const uploadCover = async (file: File | null) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/cover/${Date.now()}.${ext}`;
      const up = await db.storage.from('media').upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      await save({ p_cover_url: pub.publicUrl });
    } catch { toast.error('Upload nije uspeo.'); setBusy(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Lokacija nije dostupna.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => save({ p_lat: pos.coords.latitude, p_lng: pos.coords.longitude }),
      () => toast.error('Ne mogu da očitam lokaciju.'),
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Profil mesta {v?.name ? `· ${v.name}` : ''}</h3>
        {v?.verified && <span className="text-xs text-success font-semibold">✓ Verifikovan</span>}
      </div>
      <div
        className="h-28 rounded-xl border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground bg-center bg-cover"
        style={v?.cover_url ? { backgroundImage: `url(${v.cover_url})` } : undefined}
      >
        {!v?.cover_url && 'Cover slika mesta'}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0] || null)} />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full py-2.5 rounded-xl border border-border text-sm">
        {v?.cover_url ? 'Promeni cover' : '📷 Dodaj cover'}
      </button>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <input className={inp + ' pl-7'} defaultValue={v?.instagram || ''} onChange={(e) => setIg(e.target.value)} placeholder="instagram" />
        </div>
        <button onClick={() => save({ p_instagram: ig })} disabled={busy || ig === null} className="px-4 rounded-xl border border-border text-sm">Sačuvaj</button>
      </div>
      <button onClick={useMyLocation} disabled={busy} className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground">
        📍 {v?.latitude ? 'Ažuriraj lokaciju (stojiš u lokalu?)' : 'Postavi lokaciju — stani u lokal i tapni'}
      </button>
    </div>
  );
};
