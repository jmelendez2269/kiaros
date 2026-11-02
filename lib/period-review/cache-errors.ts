export class PeriodReviewCacheStorageFullError extends Error {
  constructor() {
    super(
      'All four quarterly_reviews rows for this plan year contain authored quarterly review content; period-review cache needs a dedicated storage slot (schema change required).',
    )
    this.name = 'PeriodReviewCacheStorageFullError'
  }
}
