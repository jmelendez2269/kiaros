"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to continue to Kiaros
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            card: "bg-card border border-border",
            formButtonPrimary:
              "bg-primary hover:bg-primary/90 text-primary-foreground",
            formFieldInput: "bg-input border-border text-foreground",
          },
        }}
      />
    </div>
  );
}
