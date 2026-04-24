import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse, after } from "next/server";
import { listImports, createImport, updateImportStatus } from "@/lib/admin/imports";
import { getTranscriptFetcher } from "@/lib/admin/transcript-ingestion";
import type { CreateImportPayload } from "@/types/admin";

export const maxDuration = 60;

function isAdminSession(sessionClaims: unknown): boolean {
  return (
    (sessionClaims as { publicMetadata?: { isAdmin?: boolean } } | null)
      ?.publicMetadata?.isAdmin === true
  );
}

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const source_id = searchParams.get("source_id") ?? undefined;

  const result = await listImports({
    status: (status as any) || undefined,
    source_id: source_id || undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();

  if (!userId || !isAdminSession(sessionClaims)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: CreateImportPayload = await req.json();

  const result = await createImport(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const inserted = result.data;

  // Auto-fetch transcript in background
  after(async () => {
    const fetcher = getTranscriptFetcher(body.import_type);

    if (!body.url) {
      return;
    }

    try {
      const transcript = await fetcher.fetchTranscript(body.url, body.import_type);

      await updateImportStatus(inserted.id, "fetched");

      // Update with transcript content
      const { updateImport } = await import("@/lib/admin/imports");
      await updateImport(inserted.id, {
        raw_content: transcript.raw_content,
        cleaned_content: transcript.cleaned_content,
        title: transcript.title,
        status: "fetched",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateImportStatus(inserted.id, "failed", message);
    }
  });

  return NextResponse.json(result, { status: 201 });
}
