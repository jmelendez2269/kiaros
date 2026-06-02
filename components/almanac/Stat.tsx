import type { ReactNode } from "react";
import { K } from "./tokens";

interface Props {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export function Stat({ label, value, mono = true }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          fontFamily: K.fMono,
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: K.inkSoft,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? K.fMono : K.fSerif,
          fontSize: mono ? 13 : 18,
          color: K.ink,
          fontWeight: mono ? 500 : 400,
        }}
      >
        {value}
      </div>
    </div>
  );
}
