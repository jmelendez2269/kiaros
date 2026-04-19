import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json([]);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6`;

  const res = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "Kiaros/1.0 (kiaros.app)",
    },
  });

  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();
  return NextResponse.json(data);
}
