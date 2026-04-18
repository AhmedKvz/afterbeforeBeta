const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

const numFormatter = new Intl.NumberFormat('de-DE');

export const formatEurCents = (cents: number) => eurFormatter.format(cents / 100);
export const formatEUR = formatEurCents;
export const formatNumber = (n: number) => numFormatter.format(n);
