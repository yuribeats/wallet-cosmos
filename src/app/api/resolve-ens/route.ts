import { NextRequest, NextResponse } from 'next/server';
import { Alchemy, Network } from 'alchemy-sdk';

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const alchemy = new Alchemy({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: Network.ETH_MAINNET,
    });
    const address = await alchemy.core.resolveName(name);
    if (!address) {
      return NextResponse.json({ error: 'ENS name not found' }, { status: 404 });
    }
    return NextResponse.json({ address });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve ENS' }, { status: 500 });
  }
}
