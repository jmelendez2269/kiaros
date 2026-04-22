export const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(252 72% 68%)",
    colorBackground: "transparent",
    colorText: "hsl(235 22% 91%)",
    colorTextSecondary: "hsl(233 12% 74%)",
    colorInputText: "hsl(235 22% 91%)",
    colorInputBackground: "hsl(237 20% 13%)",
    colorNeutral: "hsl(237 20% 16%)",
    colorDanger: "hsl(0 84% 68%)",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "border-0 bg-transparent shadow-none p-0",
    headerTitle: "font-display text-3xl text-bone tracking-tight",
    headerSubtitle: "text-bone-muted",
    socialButtonsBlockButton:
      "border border-border bg-card/80 text-foreground hover:bg-secondary",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    dividerLine: "bg-border",
    dividerText: "text-bone-muted",
    formFieldLabel: "text-bone-muted font-medium",
    formFieldInput:
      "h-11 rounded-xl border border-border bg-input text-foreground placeholder:text-bone-muted/60",
    formButtonPrimary:
      "h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90",
    footerActionText: "text-bone-muted",
    footerActionLink: "text-accent hover:text-accent/90",
    formResendCodeLink: "text-accent hover:text-accent/90",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "text-accent hover:text-accent/90",
    otpCodeFieldInput:
      "h-11 w-11 rounded-xl border border-border bg-input text-foreground",
    alertText: "text-foreground",
    formFieldSuccessText: "text-foreground",
    formFieldWarningText: "text-foreground",
    formFieldErrorText: "text-red-300",
  },
};
