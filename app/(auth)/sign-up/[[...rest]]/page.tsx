"use client";

import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/components/auth/clerkAppearance";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="shell-kicker">Kiaros</p>
        <h1 className="font-display text-4xl leading-tight text-bone">
          Join Kiaros
        </h1>
        <p className="mx-auto max-w-sm text-bone-muted">
          Create your account to get started with personalized planning
        </p>
      </div>
      <SignUp appearance={clerkAppearance} />
    </div>
  );
}
