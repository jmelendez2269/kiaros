import { BRAND } from "@/lib/brand";

export interface GiftEmailContent {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sent to the buyer right after a gift is paid for. Transactional, so no unsubscribe link. */
export function giftPurchaseEmail(input: {
  code: string;
  redeemUrl: string;
  tierName: string;
  recipientName: string | null;
  purchaserName: string | null;
}): GiftEmailContent {
  const forWhom = input.recipientName ? ` for ${input.recipientName}` : "";
  const subject = input.recipientName
    ? `Your ${BRAND.product} gift for ${input.recipientName}`
    : `Your ${BRAND.product} gift is ready`;
  const greeting = input.purchaserName ? `${input.purchaserName},` : "Hello,";

  const textParagraphs = [
    greeting,
    `Thank you. Your gift of a year of ${input.tierName}${forWhom} is ready to give.`,
    `Gift code: ${input.code}`,
    `Send them this link, or write the code in a card. They'll open it, make an account and add the gift, and their year starts the day they redeem it:\n${input.redeemUrl}`,
    `The code doesn't expire, and the year doesn't renew or charge them anything.`,
    `If you have any trouble, just reply to this email.`,
    `Jack`,
  ];

  const safeCode = escapeHtml(input.code);
  const safeUrl = escapeHtml(input.redeemUrl);
  const htmlParagraphs = [
    escapeHtml(greeting),
    escapeHtml(textParagraphs[1]),
    `<span style="display:inline-block;padding:14px 18px;border:1px solid #a98aef;border-radius:10px;font-family:'Courier New',monospace;font-size:18px;letter-spacing:0.12em;color:#f2ead8;">${safeCode}</span>`,
    `Send them <a href="${safeUrl}" style="color:#d8b497;">this link</a>, or write the code in a card. They'll open it, make an account and add the gift, and their year starts the day they redeem it.`,
    escapeHtml(textParagraphs[4]),
    escapeHtml(textParagraphs[5]),
    "Jack",
  ];

  const html = `<!doctype html>
<html>
  <body style="background:#12100e;color:#e8e2d8;font-family:Georgia,'Times New Roman',serif;padding:32px 20px;">
    <div style="max-width:480px;margin:0 auto;">
      ${htmlParagraphs.map((p) => `<p style="margin:0 0 18px;">${p}</p>`).join("\n      ")}
    </div>
  </body>
</html>`;

  return { subject, text: textParagraphs.join("\n\n"), html };
}
