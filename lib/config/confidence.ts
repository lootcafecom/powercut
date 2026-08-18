/**
 * Confidence score thresholds that drive the publishing workflow.
 * Kept configurable in one place rather than scattered as magic numbers.
 */
export const confidenceThresholds = {
  autoPublish: 90, // 90-100 -> publish automatically
  publishIfTrustedSource: 75, // 75-89 -> publish only if source is highly trusted
  needsAdminReview: 50, // 50-74 -> goes to admin review queue
  // below 50 -> rejected / manual review required
} as const;

export function recommendedVerificationStatus(
  confidenceScore: number,
  isTrustedSource: boolean
): "published" | "pending_review" | "rejected" {
  if (confidenceScore >= confidenceThresholds.autoPublish) return "published";
  if (
    confidenceScore >= confidenceThresholds.publishIfTrustedSource &&
    isTrustedSource
  )
    return "published";
  if (confidenceScore >= confidenceThresholds.needsAdminReview)
    return "pending_review";
  return "rejected";
}
