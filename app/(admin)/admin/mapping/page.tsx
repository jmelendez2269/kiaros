"use client";

import { useEffect, useState } from "react";
import type { AdminPlannerMapping, AdminCard, AdminApiResponse } from "@/types/admin";

export default function MappingPage() {
  const [mappings, setMappings] = useState<AdminPlannerMapping[]>([]);
  const [cards, setCards] = useState<AdminCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mappingsRes, cardsRes] = await Promise.all([
          fetch("/api/admin/mapping"),
          fetch("/api/admin/cards?status=approved"),
        ]);

        const mappingsData = (await mappingsRes.json()) as AdminApiResponse<AdminPlannerMapping[]>;
        const cardsData = (await cardsRes.json()) as AdminApiResponse<AdminCard[]>;

        if (mappingsData.success) {
          setMappings(mappingsData.data);
        }
        if (cardsData.success) {
          setCards(cardsData.data);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Planner Mapping</h1>
        <p className="text-muted-foreground mt-2">
          Map approved cards to planner layers and use cases
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading mappings...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Card
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Layer
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Use Case
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappings.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No mappings yet. Create one to connect cards to planner behavior.
                  </td>
                </tr>
              ) : (
                mappings.map((mapping) => {
                  const card = cards.find((c) => c.id === mapping.card_id);
                  return (
                    <tr key={mapping.id} className="hover:bg-muted transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {card?.title || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {mapping.planner_layer}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {mapping.use_case || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {mapping.priority_weight}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Mappings: {mappings.length}</p>
      </div>
    </div>
  );
}
