import { K } from "./tokens";

interface Props {
  glyph?: string;
}

// Etched divider — thin rule with a glyph centered on it.
export function Divider({ glyph = "·" }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
      <div
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(to right, transparent, ${K.line} 30%, ${K.line} 70%, transparent)`,
        }}
      />
      <span style={{ color: K.copper, fontFamily: K.fSerif, fontSize: 14, fontStyle: "italic" }}>
        {glyph}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(to right, transparent, ${K.line} 30%, ${K.line} 70%, transparent)`,
        }}
      />
    </div>
  );
}
