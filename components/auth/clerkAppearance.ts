export const clerkAppearance = {
  variables: {
    colorPrimary: "#A98AEF",
    colorBackground: "transparent",
    colorText: "#E3E2ED",
    colorTextSecondary: "#A4A3B1",
    colorInputText: "#E3E2ED",
    colorInputBackground: "#12141F",
    colorNeutral: "#E3E2ED",
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
      "h-11 rounded-xl !bg-[#A98AEF] !text-[#0A0C14] !bg-none hover:!bg-[#A98AEF]/90 focus-visible:!ring-2 focus-visible:!ring-[#A98AEF] focus-visible:!ring-offset-2",
    alternativeMethodsBlockButton:
      "!text-[#E3E2ED] !bg-transparent !border !border-[rgba(164,163,177,0.45)] hover:!bg-[rgba(169,138,239,0.12)] hover:!border-[#A98AEF] focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#A98AEF] focus-visible:!ring-offset-2 focus-visible:!ring-offset-[#0A0C14]",
    alternativeMethodsBlockButtonText: "!text-[#E3E2ED]",
    footerActionText: "text-bone-muted",
    footerActionLink: "!text-[#A98AEF]",
    formResendCodeLink: "!text-[#A98AEF]",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "!text-[#A98AEF]",
    backLink: "!text-[#A98AEF]",
    otpCodeFieldInput:
      "h-11 w-11 rounded-xl border border-border bg-input text-foreground",
    alertText: "text-foreground",
    formFieldSuccessText: "text-foreground",
    formFieldWarningText: "text-foreground",
    formFieldErrorText: "text-red-300",
  },
};
