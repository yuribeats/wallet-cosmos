import { NextRequest, NextResponse } from 'next/server';
import { fetchAllErc20 } from '@/lib/alchemy';
import type { ChainKey } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const chain = request.nextUrl.searchParams.get('chain') as ChainKey | null;

  try {
    const tokens = await fetchAllErc20(chain || undefined);
    return NextResponse.json({ tokens, count: tokens.length });
  } catch (error) {
    console.error('Token fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
