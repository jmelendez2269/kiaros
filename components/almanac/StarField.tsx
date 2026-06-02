import { K } from "./tokens";

interface Props {
  count?: number;
  seed?: number;
  opacity?: number;
}

// Deterministic LCG — same input always produces the same star layout, so
// SSR and CSR renders agree. Cheap enough to recompute each render without
// memoization, which keeps this a Server Component.
function seededStars(count: number, seed: number) {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    r: (next() * 1.6 + 0.4) * 0.18,
    o: 0.3 + next() * 0.7,
  }));
}

export function StarField({ count = 36, seed = 7, opacity = 0.7 }: Props) {
  const stars = seededStars(count, seed);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        pointerEvents: "none",
      }}
    >
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill={K.ink} opacity={st.o} />
      ))}
    </svg>
  );
}
