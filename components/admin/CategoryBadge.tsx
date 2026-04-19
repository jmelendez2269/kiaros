import type { CardCategory } from "@/types/admin";

const CATEGORY_COLORS: Record<CardCategory, string> = {
  rising_sign: "bg-violet-100 text-violet-800",
  house: "bg-blue-100 text-blue-800",
  planet: "bg-yellow-100 text-yellow-800",
  transit_timing: "bg-orange-100 text-orange-800",
  planner_translation: "bg-green-100 text-green-800",
  general_framework: "bg-slate-100 text-slate-800",
};

export function CategoryBadge({
  category,
}: {
  category: CardCategory;
}) {
  const colors =
    CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-800";

  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {category.replace(/_/g, " ")}
    </span>
  );
}
