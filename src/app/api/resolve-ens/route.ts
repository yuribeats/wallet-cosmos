import { NextRequest, NextResponse } from 'next/server';
import { namehash } from '@ethersproject/hash';

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const url = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const node = namehash(name);

    // Step 1: Get the resolver for this ENS name from the registry
    const resolverRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_call',
        params: [{ to: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', data: '0x0178b8bf' + node.slice(2) }, 'latest'],
      }),
    });
    const resolverData = await resolverRes.json();
    const resolverAddr = '0x' + (resolverData.result || '').slice(26, 66);
    if (!resolverAddr || resolverAddr === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'ENS name not found' }, { status: 404 });
    }

    // Step 2: Call addr(bytes32) on the resolver
    const addrRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'eth_call',
        params: [{ to: resolverAddr, data: '0x3b3b57de' + node.slice(2) }, 'latest'],
      }),
    });
    const addrData = await addrRes.json();
    const address = '0x' + (addrData.result || '').slice(26, 66);
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'ENS name not found' }, { status: 404 });
    }

    return NextResponse.json({ address: address.toLowerCase() });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve ENS' }, { status: 500 });
  }
}
