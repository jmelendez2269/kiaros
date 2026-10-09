export type SubscriptionCancelSnapshot = {
  cancel_at_period_end: boolean;
  cancel_at: number | null;
};

export function isSubscriptionScheduledToCancel(sub: SubscriptionCancelSnapshot): boolean {
  return sub.cancel_at_period_end === true || sub.cancel_at != null;
}

export function buildSubscriptionCancelMetadata(sub: SubscriptionCancelSnapshot): {
  cancel_at_period_end: boolean;
  cancel_at: string | null;
} {
  return {
    cancel_at_period_end: isSubscriptionScheduledToCancel(sub),
    cancel_at: sub.cancel_at != null ? new Date(sub.cancel_at * 1000).toISOString() : null,
  };
}
