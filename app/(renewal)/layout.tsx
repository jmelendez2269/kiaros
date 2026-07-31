import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RenewalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-stone-950 bg-shell-glow text-bone">
      {children}
    </div>
  );
}
