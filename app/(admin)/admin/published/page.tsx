import { listCards } from "@/lib/admin/cards";
import { CategoryBadge } from "@/components/admin/CategoryBadge";

export default async function PublishedPage() {
  const result = await listCards({ status: "approved" });
  const cards = result.success ? result.data : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Published Cards</h1>
        <p className="text-muted-foreground mt-2">
          Approved cards ready for use in the planner
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.length === 0 ? (
          <div className="col-span-full rounded-lg border border-border bg-card px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No published cards yet. Approve cards in the drafts view.
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border border-border bg-card p-4 hover:border-accent/50 transition-colors"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{card.title}</h3>
                <CategoryBadge category={card.category} />
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {card.summary}
              </p>

              {card.confidence_score && (
                <div className="text-xs text-muted-foreground mb-3">
                  Confidence:{" "}
                  <span className="font-medium">
                    {Math.round(card.confidence_score * 100)}%
                  </span>
                </div>
              )}

              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Published: {cards.length} card{cards.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
