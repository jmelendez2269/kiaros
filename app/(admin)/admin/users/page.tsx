import { createAdminSupabase } from "@/lib/supabase/admin";
import { RegenerateBlueprintButton } from "@/components/admin/RegenerateBlueprintButton";

const TRADITION_LABELS: Record<string, string> = {
  evolutionary: "Evolutionary",
  karmic: "Karmic",
  psychological: "Psychological",
  traditional: "Traditional",
  synthesis: "Synthesis",
};

const STATUS_STYLES: Record<string, string> = {
  ready: "text-emerald-400",
  generating: "text-amber-400",
  error: "text-red-400",
};

export default async function UsersAdminPage() {
  const admin = createAdminSupabase();

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("id, display_name, email, tradition, plan_year, onboarding_completed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const userIds = (profiles ?? []).map((p) => p.id);

  const { data: blueprints } = userIds.length
    ? await admin
        .from("blueprints")
        .select("user_id, status, version, updated_at")
        .in("user_id", userIds)
        .order("version", { ascending: false })
    : { data: [] };

  const latestByUser = new Map<string, { status: string; version: number; updated_at: string }>();
  for (const bp of blueprints ?? []) {
    if (!latestByUser.has(bp.user_id)) {
      latestByUser.set(bp.user_id, { status: bp.status, version: bp.version, updated_at: bp.updated_at });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profiles?.length ?? 0} users · Re-generate replaces the active blueprint with a new version
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">User</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Tradition</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Blueprint</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Updated</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(profiles ?? []).map((profile) => {
                const bp = latestByUser.get(profile.id);
                return (
                  <tr key={profile.id}>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-foreground">
                        {profile.display_name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{profile.email}</div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {profile.tradition ? (TRADITION_LABELS[profile.tradition] ?? profile.tradition) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {bp ? (
                        <span className={`text-sm font-medium ${STATUS_STYLES[bp.status] ?? "text-muted-foreground"}`}>
                          {bp.status} v{bp.version}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">none</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                      {bp ? bp.updated_at.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {profile.onboarding_completed_at ? (
                        <RegenerateBlueprintButton
                          userId={profile.id}
                          displayName={profile.display_name}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground/50">onboarding incomplete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!profiles?.length && (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={5}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
