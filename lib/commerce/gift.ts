import { z } from "zod";

import type { CommerceTierKey } from "@/lib/commerce/config";

/**
 * Gift codes look like KAIROS-7HQK-M2XP-9DFA. The alphabet leaves out
 * 0/O, 1/I/L and U so a code read aloud or copied by hand still works.
 * Twelve characters from 30 symbols is about 59 bits, far past guessing.
 */
const GIFT_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const GIFT_CODE_PREFIX = "KAIROS";
const GIFT_CODE_GROUPS = 3;
const GIFT_CODE_GROUP_LENGTH = 4;

export const GIFT_MESSAGE_MAX = 600;
export const GIFT_NAME_MAX = 80;

export function generateGiftCode(): string {
  const length = GIFT_CODE_GROUPS * GIFT_CODE_GROUP_LENGTH;
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);

  // 256 is not a multiple of the alphabet size; reject the biased tail.
  const limit = 256 - (256 % GIFT_CODE_ALPHABET.length);
  const chars: string[] = [];
  let i = 0;
  while (chars.length < length) {
    if (i >= bytes.length) {
      globalThis.crypto.getRandomValues(bytes);
      i = 0;
    }
    const byte = bytes[i++];
    if (byte < limit) chars.push(GIFT_CODE_ALPHABET[byte % GIFT_CODE_ALPHABET.length]);
  }

  const groups: string[] = [];
  for (let g = 0; g < GIFT_CODE_GROUPS; g++) {
    groups.push(chars.slice(g * GIFT_CODE_GROUP_LENGTH, (g + 1) * GIFT_CODE_GROUP_LENGTH).join(""));
  }
  return [GIFT_CODE_PREFIX, ...groups].join("-");
}

/**
 * Accepts a code however someone typed or pasted it (lower case, spaces,
 * missing dashes, with or without the KAIROS prefix) and returns the
 * canonical form, or null if it can't be a gift code.
 */
export function normalizeGiftCode(input: string | null | undefined): string | null {
  if (!input) return null;
  let compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith(GIFT_CODE_PREFIX)) compact = compact.slice(GIFT_CODE_PREFIX.length);

  const length = GIFT_CODE_GROUPS * GIFT_CODE_GROUP_LENGTH;
  if (compact.length !== length) return null;
  if ([...compact].some((char) => !GIFT_CODE_ALPHABET.includes(char))) return null;

  const groups: string[] = [];
  for (let g = 0; g < GIFT_CODE_GROUPS; g++) {
    groups.push(compact.slice(g * GIFT_CODE_GROUP_LENGTH, (g + 1) * GIFT_CODE_GROUP_LENGTH));
  }
  return [GIFT_CODE_PREFIX, ...groups].join("-");
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be up to ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : null));

export const giftCheckoutSchema = z.object({
  tierKey: z.enum(["planner", "planner_oracle"], {
    errorMap: () => ({ message: "Choose which plan to give." }),
  }),
  purchaserName: optionalText(GIFT_NAME_MAX, "Your name"),
  recipientName: optionalText(GIFT_NAME_MAX, "Their name"),
  giftMessage: optionalText(GIFT_MESSAGE_MAX, "Your note"),
});

export type GiftCheckoutInput = z.infer<typeof giftCheckoutSchema>;

export const giftRedeemSchema = z.object({
  code: z.string().trim().min(1, "Enter your gift code."),
});

/** Stripe metadata marker so the webhook can tell gifts from the buyer's own purchases. */
export const GIFT_PURCHASE_KIND = "gift";

function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const next = new Date(`${isoDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return toISODate(next);
}

/**
 * The year a gift grants. It starts on `startDate` (redemption day, or the
 * day after the recipient's current paid year ends) and runs a full year.
 * If that year would end in October to December, it runs to December 31
 * instead, so a gift never stops a few weeks short of the year it covers.
 * Annual subscribers get the same rule (see computeFullAccessThrough).
 */
export function buildGiftEntitlementWindow(startDate: string) {
  const startsAt = startDate.slice(0, 10);
  let endsAt = addDays(startsAt, 364);
  const [year, month] = endsAt.split("-").map((part) => parseInt(part, 10));
  if (month >= 10) endsAt = `${year}-12-31`;
  return { startsAt, endsAt };
}

export interface GiftPreview {
  code: string;
  status: "paid" | "redeemed" | "refunded" | "voided";
  tierKey: CommerceTierKey;
  tierName: string;
  oracleEnabled: boolean;
  purchaserName: string | null;
  recipientName: string | null;
  giftMessage: string | null;
}

// ─── Refunds ───────────────────────────────────────────────────────────────

export type GiftRefundDecision =
  | { action: "ignore"; reason: "partial_refund" | "already_closed" | "unknown_status" }
  | { action: "refund"; revokeEntitlement: boolean };

/**
 * What a Stripe `charge.refunded` event means for one gift. Only a full
 * refund closes the gift; a partial refund leaves it as it is. A gift that
 * is already refunded or voided is left alone, so repeat events are no-ops.
 * If the gift was already redeemed, that gift's own entitlement is revoked.
 */
export function decideGiftRefund(params: {
  giftStatus: string;
  chargeRefunded: boolean;
  amountCents: number;
  amountRefundedCents: number;
}): GiftRefundDecision {
  if (params.giftStatus === "refunded" || params.giftStatus === "voided") {
    return { action: "ignore", reason: "already_closed" };
  }
  if (params.giftStatus !== "paid" && params.giftStatus !== "redeemed") {
    return { action: "ignore", reason: "unknown_status" };
  }
  const fullRefund = params.chargeRefunded || params.amountRefundedCents >= params.amountCents;
  if (!fullRefund) {
    return { action: "ignore", reason: "partial_refund" };
  }
  return { action: "refund", revokeEntitlement: params.giftStatus === "redeemed" };
}

/**
 * True when a Supabase/PostgREST error means the table itself is missing
 * (for example before migration 0059 is applied), not a failed write.
 */
export function isMissingRelationError(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const message = error.message ?? "";
  return /relation .* does not exist/i.test(message) || /could not find the table/i.test(message);
}
