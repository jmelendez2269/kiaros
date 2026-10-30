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
      "!border !border-[rgba(164,163,177,0.61)] bg-card/80 !text-[#E3E2ED] hover:bg-secondary hover:!border-[#A98AEF] focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#A98AEF] focus-visible:!ring-offset-2 focus-visible:!ring-offset-[#090911]",
    socialButtonsBlockButtonText: "!text-[#E3E2ED] font-medium",
    dividerLine: "bg-border",
    dividerText: "text-bone-muted",
    formFieldLabel: "text-bone-muted font-medium",
    formFieldInput:
      "h-11 rounded-xl border border-border bg-input text-foreground placeholder:text-bone-muted/60",
    formButtonPrimary:
      "h-11 rounded-xl !bg-[#A98AEF] !text-[#0A0C14] !bg-none hover:!bg-[#A98AEF]/90 focus-visible:!ring-2 focus-visible:!ring-[#A98AEF] focus-visible:!ring-offset-2",
    alternativeMethodsBlockButton:
      "!text-[#E3E2ED] !bg-transparent !border !border-[rgba(164,163,177,0.61)] hover:!bg-[rgba(169,138,239,0.12)] hover:!border-[#A98AEF] focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#A98AEF] focus-visible:!ring-offset-2 focus-visible:!ring-offset-[#090911]",
    alternativeMethodsBlockButtonText: "!text-[#E3E2ED]",
    phoneInputBox:
      "!bg-[#12141F] !text-[#E3E2ED] !border !border-[rgba(164,163,177,0.61)]",
    selectButton: "!bg-[#12141F] !text-[#E3E2ED] !border !border-[rgba(164,163,177,0.61)]",
    selectButtonIcon:
      "!text-[#E3E2ED] [&_svg]:fill-[#E3E2ED] [&_svg]:stroke-[#E3E2ED]",
    footer: "!text-[#A4A3B1] [&_svg]:fill-[#A4A3B1] [&_svg]:text-[#A4A3B1]",
    footerPages: "!text-[#A4A3B1]",
    logoBox: "!text-[#A4A3B1] [&_svg]:fill-[#A4A3B1]",
    logoImage: "!opacity-100",
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
