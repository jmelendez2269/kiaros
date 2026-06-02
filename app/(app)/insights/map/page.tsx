import { CaptureGraph } from '@/components/insights/CaptureGraph'

export const metadata = {
  title: 'Mind map — Kiaros',
  description: 'A living map of the topics, aspects, and Human Design threads you and Stelloquy keep returning to.',
}

export default function CaptureMapPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-bone-muted">Insights</p>
        <h1 className="text-2xl text-bone">Mind map</h1>
        <p className="max-w-2xl text-sm leading-7 text-bone-muted">
          Every Stelloquy capture is tagged across five axes — themes, natal aspects, transit aspects, Human Design elements, and the moods you named. Nodes grow with frequency. Edges connect tags that appeared in the same capture. Watch what keeps returning.
        </p>
      </header>
      <CaptureGraph />
    </div>
  )
}
