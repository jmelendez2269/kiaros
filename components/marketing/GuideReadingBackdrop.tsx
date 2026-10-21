import { StarField } from "@/components/almanac/StarField";

const GUIDE_MEASURE_PX = 720;

interface Props {
  seed: number;
}

/**
 * Full-bleed stars sit behind the reading column; a soft horizontal fade
 * keeps dots out of the 720px measure.
 */
export function GuideReadingBackdrop({ seed }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <StarField count={72} seed={seed} opacity={0.35} />
      <div
        className="absolute inset-0 flex justify-center"
        style={{
          background:
            "radial-gradient(ellipse 50% 45% at 20% 20%, rgba(112,75,210,0.18), transparent 65%)",
        }}
      >
        <div
          className="h-full w-full max-w-[720px]"
          style={{
            background: `linear-gradient(
              90deg,
              rgba(10, 12, 20, 0) 0%,
              rgba(10, 12, 20, 0.75) 10%,
              rgba(10, 12, 20, 0.92) 22%,
              rgba(10, 12, 20, 0.92) 78%,
              rgba(10, 12, 20, 0.75) 90%,
              rgba(10, 12, 20, 0) 100%
            )`,
            maxWidth: GUIDE_MEASURE_PX,
          }}
        />
      </div>
    </div>
  );
}
