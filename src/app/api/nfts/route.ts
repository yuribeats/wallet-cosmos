import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNfts } from '@/lib/alchemy';
import type { ChainKey } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const chain = request.nextUrl.searchParams.get('chain') as ChainKey | null;
  const wallet = request.nextUrl.searchParams.get('wallet') || undefined;

  try {
    const nfts = await fetchAllNfts(wallet, chain || undefined);
    return NextResponse.json({ tokens: nfts, count: nfts.length });
  } catch (error) {
    console.error('NFT fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs' },
      { status: 500 }
    );
  }
}
