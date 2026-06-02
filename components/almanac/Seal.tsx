import type { ReactNode } from "react";
import { K } from "./tokens";

interface Props {
  children: ReactNode;
  color?: string;
  size?: number;
}

// Small etched circular seal — used for nav glyphs, dates, brand mark.
export function Seal({ children, color = K.copper, size = 28 }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${color}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontFamily: K.fSerif,
        fontSize: size * 0.45,
        fontStyle: "italic",
        background: `radial-gradient(circle, ${K.bg3} 0%, ${K.bg} 100%)`,
        boxShadow: `inset 0 0 0 1px ${K.bg2}, 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {children}
    </div>
  );
}
