"use client";

import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/components/auth/clerkAppearance";
import { BRAND } from "@/lib/brand";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="shell-kicker">{BRAND.product}</p>
        <h1 className="font-display text-4xl leading-tight text-bone">
          Welcome back
        </h1>
        <p className="mx-auto max-w-sm text-bone-muted">
          Sign in to continue to {BRAND.product}
        </p>
      </div>
      <SignIn appearance={clerkAppearance} />
    </div>
  );
}
