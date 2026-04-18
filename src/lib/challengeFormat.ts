import { formatDistanceToNowStrict } from 'date-fns';
import { sr } from 'date-fns/locale';

export const formatDeadline = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return 'završeno';
  return formatDistanceToNowStrict(d, { locale: sr, addSuffix: false });
};

export const statusLabel = (status: 'live' | 'voting' | 'resolved'): string => {
  switch (status) {
    case 'live':
      return 'Live';
    case 'voting':
      return 'Glasanje';
    case 'resolved':
      return 'Završen';
  }
};
