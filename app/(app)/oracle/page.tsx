import { OracleChat } from '@/components/oracle/OracleChat'

export default function OraclePage() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date())
  return <OracleChat today={today} />
}
