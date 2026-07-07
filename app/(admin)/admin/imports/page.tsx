import { listImports } from "@/lib/admin/imports";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default async function ImportsPage() {
  const result = await listImports();
  const imports = result.success ? result.data : [];
  const loadError = result.success ? null : result.error;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Imports</h1>
        <a
          href="/admin/imports#add"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          New Import
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Title
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Type
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loadError ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-red-400">
                  Couldn&apos;t load imports: {loadError}
                </td>
              </tr>
            ) : imports.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  No imports yet. Create one to start curating.
                </td>
              </tr>
            ) : (
              imports.map((imp) => (
                <tr key={imp.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {imp.title || "Untitled"}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {imp.import_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <StatusBadge status={imp.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(imp.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Showing {imports.length} import{imports.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
