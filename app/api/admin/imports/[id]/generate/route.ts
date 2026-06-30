import { currentUser } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { getImport, updateImportStatus } from "@/lib/admin/imports";
import { getSource } from "@/lib/admin/sources";
import { createCard } from "@/lib/admin/cards";
import { generateDraftCards } from "@/lib/admin/card-generator";
import type { AdminSource } from "@/types/admin";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  const { id } = await params;

  if (!user || user.publicMetadata?.isAdmin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const importResult = await getImport(id);

  if (!importResult.success) {
    return NextResponse.json({ error: importResult.error }, { status: 404 });
  }

  const imp = importResult.data;
  const cleanedContent = imp.cleaned_content;

  if (!cleanedContent) {
    return NextResponse.json(
      {
        error:
          "Import has no cleaned content. Fetch transcript first.",
      },
      { status: 400 }
    );
  }

  // Kick off generation post-response
  after(async () => {
    try {
      let sourceMeta: Pick<
        AdminSource,
        "source_name" | "astrologer_name" | "trust_level"
      > = {
        source_name: imp.title ?? "Unknown",
        astrologer_name: null as string | null,
        trust_level: "medium" as const,
      };

      // Try to get source metadata if source_id exists
      if (imp.source_id) {
        const sourceResult = await getSource(imp.source_id);
        if (sourceResult.success) {
          const src = sourceResult.data;
          sourceMeta = {
            source_name: src.source_name,
            astrologer_name: src.astrologer_name,
            trust_level: src.trust_level,
          };
        }
      }

      const result = await generateDraftCards(cleanedContent, sourceMeta);

      if (!result.success) {
        await updateImportStatus(id, "failed", result.error);
        return;
      }

      // Insert draft cards
      for (const draft of result.data) {
        await createCard({
          ...draft,
          import_id: id,
          status: "draft",
          editor_notes: null,
          source_refs: imp.url ? [imp.url] : [],
        });
      }

      // Mark import as processed
      await updateImportStatus(id, "processed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateImportStatus(id, "failed", message);
    }
  });

  return NextResponse.json({
    success: true,
    message: "Card generation started",
  });
}
