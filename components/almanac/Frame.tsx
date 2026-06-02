import type { CSSProperties, ReactNode } from "react";
import { K } from "./tokens";
import { StarField } from "./StarField";

type Tone = "cocoa" | "umber" | "raised" | "deep";

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  stars?: boolean;
  padding?: number;
  tone?: Tone;
}

const TONE_BG: Record<Tone, string> = {
  cocoa: K.bg,
  umber: K.bg2,
  raised: K.bg3,
  deep: K.bg4,
};

export function Frame({
  children,
  style,
  stars = false,
  padding = 24,
  tone = "umber",
}: Props) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: TONE_BG[tone],
        border: `1px solid ${K.line}`,
        borderRadius: 16,
        padding,
        ...style,
      }}
    >
      {stars ? <StarField opacity={0.18} /> : null}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}
