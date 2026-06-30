import { EtsyImportForm } from "@/components/commerce/EtsyImportForm";
import { ManualOrderForm } from "@/components/commerce/ManualOrderForm";
import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function CommerceAdminPage() {
  const supabase = createAdminSupabase();
  const { data: orders } = await supabase
    .from("marketplace_orders")
    .select("external_order_id, purchaser_email, product_tier, planner_year, status, imported_at")
    .eq("source", "etsy")
    .order("imported_at", { ascending: false })
    .limit(12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commerce</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Import Etsy orders so the public activation flow can verify purchases end-to-end.
        </p>
      </div>

      <ManualOrderForm />

      <EtsyImportForm />

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Etsy orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Order</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Tier</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Year</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders?.length ? (
                orders.map((order) => (
                  <tr key={order.external_order_id}>
                    <td className="px-6 py-4 text-sm text-foreground">{order.external_order_id}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.purchaser_email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.product_tier}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.planner_year}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-8 text-sm text-muted-foreground" colSpan={5}>
                    No Etsy orders imported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
