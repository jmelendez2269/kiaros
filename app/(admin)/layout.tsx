import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();
  const isAdmin =
    (sessionClaims?.publicMetadata as { isAdmin?: boolean } | undefined)
      ?.isAdmin === true;

  if (!userId || !isAdmin) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="ml-56 flex flex-1 flex-col min-h-screen">
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
