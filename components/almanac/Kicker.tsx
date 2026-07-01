import type { ReactNode } from "react";
import { K } from "./tokens";

interface Props {
  children: ReactNode;
  color?: string;
}

export function Kicker({ children, color = K.copperHi }: Props) {
  return (
    <div
      style={{
        fontFamily: K.fMono,
        fontSize: 15,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        opacity: 0.85,
      }}
    >
      {children}
    </div>
  );
}
