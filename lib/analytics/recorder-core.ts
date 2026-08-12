import {
  validateFunnelEvent,
  type FunnelEventInput,
  type FunnelEventRecord,
} from "./funnel-events.ts";

export type FunnelEventInsertResult = "inserted" | "duplicate";

export interface FunnelEventDatabaseAdapter {
  insertEvent(event: FunnelEventRecord): Promise<FunnelEventInsertResult>;
  linkAnonymousEvents(anonymousId: string, userId: string): Promise<number>;
}

export type FunnelEventRecordResult =
  | { status: "disabled"; linked_events: 0 }
  | { status: "rejected"; error: string; linked_events: 0 }
  | { status: "recorded" | "duplicate"; linked_events: number };

export async function recordFunnelEventWithAdapter(
  input: FunnelEventInput | unknown,
  adapter: FunnelEventDatabaseAdapter,
  options: { enabled: boolean; now?: Date } = { enabled: false },
): Promise<FunnelEventRecordResult> {
  if (!options.enabled) return { status: "disabled", linked_events: 0 };

  const parsed = validateFunnelEvent(input, { now: options.now, allowUserId: true });
  if (!parsed.success) return { status: "rejected", error: parsed.error, linked_events: 0 };

  const insertResult = await adapter.insertEvent(parsed.event);
  const linkedEvents = parsed.event.anonymous_id && parsed.event.user_id
    ? await adapter.linkAnonymousEvents(parsed.event.anonymous_id, parsed.event.user_id)
    : 0;

  return {
    status: insertResult === "duplicate" ? "duplicate" : "recorded",
    linked_events: linkedEvents,
  };
}
