"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Join Kiaros</h1>
        <p className="text-muted-foreground">
          Create your account to get started with personalized planning
        </p>
      </div>
      <SignUp
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
