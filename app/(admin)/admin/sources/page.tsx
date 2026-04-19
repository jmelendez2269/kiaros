import { listSources } from "@/lib/admin/sources";

export default async function SourcesPage() {
  const result = await listSources();
  const sources = result.success ? result.data : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sources</h1>
        <a
          href="/admin/sources#add"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          Add Source
        </a>
      </div>

      {/* Sources table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Source
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Astrologer
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Type
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Trust Level
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sources.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  No sources yet. Create one to get started.
                </td>
              </tr>
            ) : (
              sources.map((source) => (
                <tr key={source.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {source.source_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {source.astrologer_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {source.source_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {source.trust_level}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {source.active ? (
                      <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent">
                        active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Showing {sources.length} source{sources.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
