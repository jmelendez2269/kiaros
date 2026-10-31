const methodRowBorder = "1px solid rgba(164,163,177,0.61)";

const focusRingShadow =
  "0 0 0 2px #090911, 0 0 0 4px #A98AEF !important";

const methodRowFocusRing = {
  "&:focus": {
    boxShadow: focusRingShadow,
    outline: "none",
  },
  "&:focus-visible": {
    boxShadow: focusRingShadow,
    outline: "none",
  },
  "& *:focus": {
    boxShadow: focusRingShadow,
    outline: "none",
  },
  "& *:focus-visible": {
    boxShadow: focusRingShadow,
    outline: "none",
  },
};

const securedByBranding = {
  color: "#A4A3B1",
  "& span": { color: "#A4A3B1 !important" },
  '& [class*="cl-internal"]': { color: "#A4A3B1 !important" },
};

const footerLinkViolet = {
  color: "#A98AEF !important",
  "&:hover": { color: "#A98AEF !important" },
};

const pickerLabelText = {
  color: "#E3E2ED",
  backgroundColor: "#12141F",
  border: methodRowBorder,
  "& span": { color: "#E3E2ED !important" },
  "& *": { color: "#E3E2ED !important" },
};

export const clerkAppearance = {
  variables: {
    colorPrimary: "#A98AEF",
    colorRing: "#A98AEF",
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
    socialButtonsBlockButton: {
      border: methodRowBorder,
      color: "#E3E2ED",
      backgroundColor: "hsla(237, 30%, 8%, 0.8)",
      ...methodRowFocusRing,
    },
    socialButtonsBlockButtonText: {
      color: "#E3E2ED",
      fontWeight: 500,
      ...methodRowFocusRing,
    },
    dividerLine: "bg-border",
    dividerText: "text-bone-muted",
    formFieldLabel: "text-bone-muted font-medium",
    formFieldInput:
      "h-11 rounded-xl border border-border bg-input text-foreground placeholder:text-bone-muted/60",
    formButtonPrimary:
      "h-11 rounded-xl !bg-[#A98AEF] !text-[#0A0C14] !bg-none hover:!bg-[#A98AEF]/90 focus-visible:!ring-2 focus-visible:!ring-[#A98AEF] focus-visible:!ring-offset-2",
    alternativeMethodsBlockButton: {
      border: methodRowBorder,
      color: "#E3E2ED",
      backgroundColor: "transparent",
      ...methodRowFocusRing,
    },
    alternativeMethodsBlockButtonText: {
      color: "#E3E2ED",
      ...methodRowFocusRing,
    },
    phoneInputBox: {
      ...pickerLabelText,
    },
    selectButton: {
      ...pickerLabelText,
    },
    selectButtonIcon: {
      color: "#E3E2ED",
      "& svg": {
        fill: "#E3E2ED !important",
        stroke: "#E3E2ED !important",
      },
    },
    logoBox: securedByBranding,
    logoGroup: securedByBranding,
    logoGroupItem: securedByBranding,
    logoImage: {
      opacity: 1,
      filter: "none",
    },
    footerActionText: "text-bone-muted",
    footerActionLink: footerLinkViolet,
    footerPagesLink: footerLinkViolet,
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
