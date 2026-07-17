import Link from 'next/link'
import type { AreaPreview } from '@/components/self/SelfView'

interface Props {
  previews: AreaPreview[]
}

export function AreasChapter({ previews }: Props) {
  return (
    <section id="areas" className="scroll-mt-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="shell-kicker mb-2">Chapter VI</p>
          <h2 className="font-serif text-3xl italic text-bone">Areas</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
            The rooms of your life you&apos;re actively building, mapped to your chart.
          </p>
        </div>
        <Link href="/areas" className="text-sm text-leather-200 underline underline-offset-2">
          Open full Areas workspace
        </Link>
      </div>

      {previews.length === 0 ? (
        <p className="text-sm text-bone-muted">Your selected areas will appear here after onboarding.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {previews.map((preview) => (
            <Link
              key={preview.id}
              href={`/areas/${preview.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-border/50 bg-stone-950/50 px-5 py-5 transition-colors hover:border-leather-400/35 hover:bg-leather-500/8"
            >
              <div>
                <div className="flex items-center gap-2">
                  {preview.iconKey ? <span className="text-leather-200">{preview.iconKey}</span> : null}
                  <h3 className="font-serif text-lg text-bone">{preview.name}</h3>
                </div>
                <p className="mt-2 text-xs leading-5 text-bone-muted">{preview.summary}</p>
                {preview.houseDetails.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {preview.houseDetails.map((detail) => (
                      <span key={detail.house} className="shell-pill">
                        House {detail.house}
                        {detail.sign ? ` · ${detail.sign}` : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {preview.currentWindow ? (
                <p className="mt-4 text-xs text-bone-muted">This week: {preview.currentWindow.theme}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
