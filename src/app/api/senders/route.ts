import { NextRequest, NextResponse } from 'next/server';
import { fetchSenders, resolveEnsNames } from '@/lib/alchemy';
import type { ChainKey } from '@/lib/constants';
import { CHAIN_KEYS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  const chain = request.nextUrl.searchParams.get('chain') as ChainKey | null;

  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  if (!chain || !CHAIN_KEYS.includes(chain)) {
    return NextResponse.json({ error: 'valid chain required' }, { status: 400 });
  }

  try {
    console.log(`Fetching senders for ${wallet} on ${chain}`);
    const senders = await fetchSenders(wallet, chain);
    console.log(`Found ${senders.length} senders`);

    const addresses = senders.map((s) => s.address);
    const ensMap = addresses.length > 0 ? await resolveEnsNames(addresses) : new Map();

    const enriched = senders.map((s) => ({
      ...s,
      ensName: ensMap.get(s.address) || undefined,
    }));

    return NextResponse.json({ senders: enriched });
  } catch (error) {
    console.error('Senders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch senders' }, { status: 500 });
  }
}
