import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { KairosHome } from "@/components/marketing/KairosHome";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/today");

  return <KairosHome isSignedIn={false} />;
}
