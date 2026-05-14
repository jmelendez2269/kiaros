import { K } from "./tokens";

interface Props {
  /** 0 = new moon (dark), 0.5 = full moon (lit), 1 = back to new */
  phase?: number;
  size?: number;
  color?: string;
}

// Filled SVG circle with a clipped terminator. Stable across SSR/CSR.
export function MoonGlyph({ phase = 0.5, size = 18, color = K.copperHi }: Props) {
  const r = size / 2;
  const illum = Math.max(0, Math.min(1, phase));
  const tx = Math.abs(0.5 - illum) * 2 * r;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <circle cx={r} cy={r} r={r - 0.5} fill={K.bg} stroke={color} strokeWidth="1" />
      {illum > 0.02 ? (
        <>
          <path
            d={
              illum < 0.5
                ? `M ${r},${0.5} A ${r - 0.5},${r - 0.5} 0 0 1 ${r},${size - 0.5} A ${tx},${
                    r - 0.5
                  } 0 0 0 ${r},${0.5} Z`
                : `M ${r},${0.5} A ${r - 0.5},${r - 0.5} 0 0 1 ${r},${size - 0.5} A ${tx},${
                    r - 0.5
                  } 0 0 1 ${r},${0.5} Z`
            }
            fill={color}
          />
          {illum > 0.5 ? (
            <path
              d={`M ${r},${0.5} A ${r - 0.5},${r - 0.5} 0 0 0 ${r},${size - 0.5} A ${tx},${
                r - 0.5
              } 0 0 1 ${r},${0.5} Z`}
              fill={color}
            />
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
