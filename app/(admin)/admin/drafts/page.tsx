"use client";

import { useEffect, useState } from "react";
import { CategoryBadge } from "@/components/admin/CategoryBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminCard, AdminApiResponse } from "@/types/admin";

export default function DraftsPage() {
  const [cards, setCards] = useState<AdminCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<AdminCard | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch("/api/admin/cards?status=draft");
        const data = (await res.json()) as AdminApiResponse<AdminCard[]>;
        if (data.success) {
          setCards(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch draft cards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cards/${id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== id));
        setSelectedCard(null);
      }
    } catch (err) {
      console.error("Failed to approve card:", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cards/${id}/reject`, {
        method: "POST",
      });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== id));
        setSelectedCard(null);
      }
    } catch (err) {
      console.error("Failed to reject card:", err);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Draft Cards</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve cards generated from imports
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading draft cards...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <p className="text-muted-foreground">
            No draft cards. Generate them from an import.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Cards list */}
          <div className="lg:col-span-1 space-y-2">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`w-full text-left rounded-md px-4 py-3 transition-colors border ${
                  selectedCard?.id === card.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.category.replace(/_/g, " ")}
                    </p>
                  </div>
                  <CategoryBadge category={card.category} />
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selectedCard && (
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {selectedCard.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCard.category.replace(/_/g, " ")}
                  </p>
                </div>
                {selectedCard.confidence_score && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      Confidence
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {Math.round(selectedCard.confidence_score * 100)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6 space-y-4">
                {selectedCard.summary && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Summary
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedCard.summary}
                    </p>
                  </div>
                )}

                {selectedCard.usable_copy && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Usable Copy
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 bg-muted p-3 rounded">
                      {selectedCard.usable_copy}
                    </p>
                  </div>
                )}

                {selectedCard.source_quotes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Source Quotes
                    </h3>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-2">
                      {selectedCard.source_quotes.map((quote, i) => (
                        <li key={i} className="italic">
                          "{quote}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedCard.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCard.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 border-t border-border pt-4">
                <button
                  onClick={() => handleApprove(selectedCard.id)}
                  className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedCard.id)}
                  className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
