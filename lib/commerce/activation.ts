import { z } from "zod";

export const activationClaimSchema = z.object({
  orderNumber: z.string().trim().min(3, "Enter your Etsy order number."),
  email: z.string().trim().email("Enter the email used for your Etsy purchase."),
});

export const activationCompleteSchema = z.object({
  claimToken: z.string().trim().min(12, "Claim token is missing or invalid."),
});

export function normalizeMarketplaceEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeOrderNumber(orderNumber: string) {
  return orderNumber.trim().toUpperCase();
}

export function buildClaimExpiryDate(days = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}
