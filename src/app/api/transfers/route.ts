import { NextRequest, NextResponse } from 'next/server';
import { fetchTransfers } from '@/lib/alchemy';
import { isSolanaAddress, type ChainKey } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const chain = request.nextUrl.searchParams.get('chain') as ChainKey | null;
  const wallet = request.nextUrl.searchParams.get('wallet') || undefined;

  try {
    if (wallet && isSolanaAddress(wallet)) {
      return NextResponse.json({ connections: [], count: 0 });
    }

    const connections = await fetchTransfers(wallet, chain || undefined);
    return NextResponse.json({ connections, count: connections.length });
  } catch (error) {
    console.error('Transfer fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}
