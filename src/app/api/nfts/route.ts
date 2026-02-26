import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNfts, fetchNewestNfts } from '@/lib/alchemy';
import type { ChainKey } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const chain = request.nextUrl.searchParams.get('chain') as ChainKey | null;
  const wallet = request.nextUrl.searchParams.get('wallet') || undefined;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '0') || 0;
  const mode = request.nextUrl.searchParams.get('mode');

  try {
    if (mode === 'newest') {
      const nfts = await fetchNewestNfts(wallet, limit || 100);
      return NextResponse.json({ tokens: nfts, count: nfts.length });
    }

    const nfts = await fetchAllNfts(wallet, chain || undefined, limit);
    return NextResponse.json({ tokens: nfts, count: nfts.length });
  } catch (error) {
    console.error('NFT fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs' },
      { status: 500 }
    );
  }
}
