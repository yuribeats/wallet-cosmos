import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNfts, fetchSolanaAssets } from '@/lib/alchemy';
import { isSolanaAddress, type ChainKey } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const chain = request.nextUrl.searchParams.get('chain') as ChainKey | null;
  const wallet = request.nextUrl.searchParams.get('wallet') || undefined;

  try {
    const tokens = [];

    if (wallet && isSolanaAddress(wallet)) {
      const solTokens = await fetchSolanaAssets(wallet);
      tokens.push(...solTokens.filter((t) => t.standard !== 'ERC20'));
    } else {
      const nfts = await fetchAllNfts(wallet, chain || undefined);
      tokens.push(...nfts);
    }

    return NextResponse.json({ tokens, count: tokens.length });
  } catch (error) {
    console.error('NFT fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs' },
      { status: 500 }
    );
  }
}
