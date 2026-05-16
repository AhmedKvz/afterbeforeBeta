import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Summary {
  best_for?: string[];
  top_positives?: string[];
  common_complaints?: string[];
  best_nights?: string[];
  not_enough_data?: boolean;
}

export const AIVenueSummaryCard = ({ venueName }: { venueName: string }) => {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase.functions
      .invoke('summarize-venue-reviews', { body: { venue_name: venueName } })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setData({ not_enough_data: true });
        } else {
          setData(data as Summary);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [venueName]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analyzing reviews…
      </div>
    );
  }

  if (!data || data.not_enough_data) {
    return null;
  }

  const sections: { title: string; items?: string[]; tone: string }[] = [
    { title: 'Best for', items: data.best_for, tone: 'text-primary' },
    { title: 'Top positives', items: data.top_positives, tone: 'text-green-400' },
    { title: 'Common complaints', items: data.common_complaints, tone: 'text-orange-400' },
    { title: 'Best nights', items: data.best_nights, tone: 'text-pink-400' },
  ].filter((s) => s.items && s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent p-4 backdrop-blur"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-300" />
        <span className="text-sm font-bold text-purple-200">🤖 AI Review Summary</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title}>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${s.tone}`}>{s.title}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-foreground/90">
              {s.items!.map((it, i) => (
                <li key={i}>• {it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
