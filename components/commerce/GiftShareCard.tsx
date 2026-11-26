"use client";

import { useState } from "react";

interface Props {
  code: string;
  redeemUrl: string;
  recipientName: string | null;
}

export function GiftShareCard({ code, redeemUrl, recipientName }: Props) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  const shareText = recipientName
    ? `${recipientName}, I got you a year of Kairos. Open your gift here: ${redeemUrl}`
    : `I got you a year of Kairos. Open your gift here: ${redeemUrl}`;

  return (
    <div className="grid gap-4">
      <div className="rounded-[1.1rem] border border-leather-300/45 bg-leather-300/12 px-5 py-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-leather-200">Gift code</p>
        <p className="mt-2 break-all font-mono text-xl tracking-[0.12em] text-bone md:text-2xl">{code}</p>
        <p className="mt-3 break-all text-sm text-bone-muted">{redeemUrl}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => copy(redeemUrl, "link")}
          className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
        >
          {copied === "link" ? "Link copied" : "Copy gift link"}
        </button>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
        >
          {copied === "code" ? "Code copied" : "Copy code"}
        </button>
        <a
          href={`sms:?&body=${encodeURIComponent(shareText)}`}
          className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
        >
          Send by text
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent("A gift for your year")}&body=${encodeURIComponent(shareText)}`}
          className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
        >
          Send by email
        </a>
      </div>
    </div>
  );
}
