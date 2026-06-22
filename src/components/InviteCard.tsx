import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReferral, useApplyReferral } from '@/hooks/useReferral';
import { track } from '@/lib/analytics';
import { Share2, Check, Users } from 'lucide-react';

/** Share-to-earn: invite the crew. When a friend checks in (pings), you earn AFC (Z6). */
export const InviteCard = () => {
  const { profile } = useAuth();
  const { data: ref } = useMyReferral();
  const apply = useApplyReferral();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!ref) return null;
  const link = `${window.location.origin}/#/auth?ref=${ref.code}`;
  const wasReferred = !!(profile as any)?.referred_by;

  const share = async () => {
    track('referral_shared', { code: ref.code });
    const text = `Uđi u AfterBefore — beogradska scena na dlanu. Moj kod: ${ref.code}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'AfterBefore', text, url: link });
      } else {
        await navigator.clipboard.writeText(`${text}\n${link}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* user cancelled share */ }
  };

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-secondary/5 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-accent" />
        <div className="font-bold text-[15px]">Pozovi ekipu</div>
      </div>
      <div className="text-[11px] text-muted-foreground mb-3">
        Drugar uđe na tvoj kod i čekira se na žurci → <span className="text-accent font-semibold">+{ref.afc_per_convert} AFC</span> tebi. Što više ekipe, više guest-listi.
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 px-3 py-2.5 rounded-xl bg-card border border-border font-mono font-extrabold tracking-[0.25em] text-center">{ref.code}</div>
        <button onClick={share} className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-1.5"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}{copied ? 'Kopirano' : 'Podeli'}
        </button>
      </div>

      <div className="flex gap-2 text-center mb-1">
        <div className="flex-1 p-2 rounded-xl bg-card border border-border">
          <div className="text-lg font-bold">{ref.invited}</div>
          <div className="text-[10px] text-muted-foreground">Pozvano</div>
        </div>
        <div className="flex-1 p-2 rounded-xl bg-card border border-border">
          <div className="text-lg font-bold text-accent">{ref.converted}</div>
          <div className="text-[10px] text-muted-foreground">Došlo na žurku</div>
        </div>
      </div>

      {!wasReferred && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Imaš pozivni kod?"
            maxLength={6}
            className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-sm font-mono tracking-[0.15em] uppercase outline-none focus:border-primary"
          />
          <button
            onClick={() => apply.mutate(code)}
            disabled={apply.isPending || code.length < 4}
            className="px-3.5 py-2 rounded-xl border border-border-strong font-semibold text-sm disabled:opacity-50"
          >Unesi</button>
        </div>
      )}
    </div>
  );
};
