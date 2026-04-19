import { currentUser } from '@clerk/nextjs/server'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'

export default async function DashboardPage() {
  const user = await currentUser()
  return <DashboardOverview firstName={user?.firstName ?? null} />
}
