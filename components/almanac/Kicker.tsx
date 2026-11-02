import type { ReactNode } from "react";
import { K } from "./tokens";

interface Props {
  children: ReactNode;
  color?: string;
  /** Default 0.85 matches legacy kicker dimming; use 1 for solid contrast tokens. */
  opacity?: number;
}

export function Kicker({ children, color = K.copperHi, opacity = 0.85 }: Props) {
  return (
    <div
      style={{
        fontFamily: K.fMono,
        fontSize: 15,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        opacity,
      }}
    >
      {children}
    </div>
  );
}
