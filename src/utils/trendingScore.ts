export function calculateTrendingScore(
  averageRating: number,
  reviewCount: number,
  latestReviewDate: Date | null
): number {
  if (!latestReviewDate || reviewCount === 0) {
    return 0;
  }
  
  const hoursSinceReview = (Date.now() - latestReviewDate.getTime()) / (1000 * 60 * 60);
  const recencyFactor = Math.max(0.5, 1 - (hoursSinceReview / 168)); // Decay over 1 week
  
  return averageRating * reviewCount * recencyFactor;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
