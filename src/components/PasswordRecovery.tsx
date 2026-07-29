import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Globalni hvatač "Zaboravljena lozinka" linka iz mejla: Supabase vraća
 * korisnika na app sa recovery tokenom u hash-u, klijent digne sesiju i
 * ispali PASSWORD_RECOVERY — tada tražimo novu lozinku (updateUser).
 * Montirano u App.tsx da radi bez obzira na rutu na koju link sleti.
 */
export const PasswordRecovery = () => {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setOpen(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!open) return null;

  const save = async () => {
    if (pw.length < 6) { toast.error('Lozinka mora imati bar 6 karaktera.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error('Nije prošlo — traži novi link i pokušaj opet.'); return; }
    toast.success('Nova lozinka postavljena ✓ — ulogovan/a si.');
    setOpen(false);
    window.location.hash = '#/';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,5,7,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#141416', border: '1px solid rgba(255,255,255,.12)', borderRadius: 22, padding: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Nova lozinka</div>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>Unesi novu lozinku za svoj nalog — posle ovoga si odmah unutra.</div>
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nova lozinka (min 6)"
          autoFocus
          style={{ width: '100%', marginTop: 14, background: '#0B0B0D', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '13px 15px', fontSize: 15, color: '#fff', outline: 'none' }}
        />
        <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 15, background: 'oklch(0.88 0.19 158)', color: '#0B2012' }}>
          {busy ? '…' : 'Sačuvaj i uđi'}
        </button>
      </div>
    </div>
  );
};
