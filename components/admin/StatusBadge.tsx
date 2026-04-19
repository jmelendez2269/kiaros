import type { CardStatus, ImportStatus } from "@/types/admin";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-accent/20 text-accent",
  rejected: "bg-destructive/20 text-destructive",
  pending: "bg-muted text-muted-foreground",
  fetched: "bg-accent/20 text-accent",
  processed: "bg-accent/20 text-accent",
  failed: "bg-destructive/20 text-destructive",
};

export function StatusBadge({
  status,
}: {
  status: CardStatus | ImportStatus;
}) {
  const style =
    STATUS_STYLES[status] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
