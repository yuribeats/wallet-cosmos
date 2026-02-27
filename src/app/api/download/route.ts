import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const name = req.nextUrl.searchParams.get('name') || 'wallpaper';
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return new NextResponse(null, { status: res.status });

    const ct = res.headers.get('Content-Type') || 'image/png';
    const ext = ct.includes('jpeg') || ct.includes('jpg') ? '.jpg'
      : ct.includes('webp') ? '.webp'
      : ct.includes('gif') ? '.gif'
      : '.png';
    const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': ct,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
