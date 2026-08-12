import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import { journalConsentInputSchema } from '@/lib/journal/consent'
import { createJournalEntry } from '@/lib/journal/entry-service'

const transitContextSchema = z
  .object({
    area: z.string().trim().min(1).max(120).optional(),
    theme: z.string().trim().min(1).max(200).optional(),
    prompt: z.string().trim().min(1).max(500).optional(),
    week: z.number().int().min(1).max(52).optional(),
    start: z.string().trim().min(1).max(20).optional(),
    end: z.string().trim().min(1).max(20).optional(),
    context: z.string().trim().min(1).max(2000).optional(),
  })
  .partial()
  .nullable()
  .optional()

const createJournalEntrySchema = z.object({
  title: z.string().trim().max(160).optional().nullable(),
  body: z.string().trim().min(1).max(12000),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_ritual: z.boolean().optional(),
  oracle_memory: z.boolean().optional(),
  ...journalConsentInputSchema.shape,
  transit_context: transitContextSchema,
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  try {
    const body = createJournalEntrySchema.parse(await req.json())
    const result = await createJournalEntry({
      title: body.title,
      body: body.body,
      entryDate: body.entry_date,
      isRitual: body.is_ritual,
      transitContext: body.transit_context,
      consent: {
        oracle_memory: body.oracle_memory,
        include_in_insights: body.include_in_insights,
        include_in_stelloquy: body.include_in_stelloquy,
        memory_pinned: body.memory_pinned,
        memory_importance: body.memory_importance,
      },
      source: 'journal_api',
    })

    if (!result.success) {
      const status = result.code === 'profile_not_found' ? 404 : 500
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid journal entry' },
        { status: 400 },
      )
    }

    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}
