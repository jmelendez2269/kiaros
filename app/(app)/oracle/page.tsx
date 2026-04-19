import { OracleChat } from '@/components/oracle/OracleChat'

export default function OraclePage() {
  const today = new Date().toISOString().slice(0, 10)
  return <OracleChat today={today} />
}
