import Image from "next/image";

type BrandMarkSize = "header" | "footer";

const sizeClasses: Record<BrandMarkSize, string> = {
  header: "h-6 w-6 rounded-md sm:h-7 sm:w-7",
  footer: "h-5 w-5 rounded-md",
};

const pixelSize: Record<BrandMarkSize, number> = {
  header: 28,
  footer: 20,
};

interface BrandMarkProps {
  size: BrandMarkSize;
}

/** Kairos triangle mark for marketing headers and footers (decorative; wordmark carries the name). */
export function BrandMark({ size }: BrandMarkProps) {
  const px = pixelSize[size];
  return (
    <Image
      src="/icon-192.png"
      width={px}
      height={px}
      alt=""
      aria-hidden
      className={sizeClasses[size]}
    />
  );
}
