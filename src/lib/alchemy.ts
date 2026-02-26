import { Alchemy, Network, NftFilters } from 'alchemy-sdk';
import { DEFAULT_WALLET, CHAIN_KEYS, type ChainKey } from './constants';
import { resolveMedia } from './mediaUtils';
import type { UnifiedToken, WalletConnection } from './types';

function getClient(chain: ChainKey): Alchemy {
  const networkMap: Record<ChainKey, Network> = {
    ethereum: Network.ETH_MAINNET,
    base: Network.BASE_MAINNET,
    optimism: Network.OPT_MAINNET,
    zora: Network.ZORA_MAINNET,
  };
  return new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: networkMap[chain],
  });
}

export async function fetchNftsForChain(chain: ChainKey, wallet: string, limit: number = 0): Promise<UnifiedToken[]> {
  const client = getClient(chain);
  const tokens: UnifiedToken[] = [];
  let pageKey: string | undefined;

  do {
    let nfts: Array<Record<string, unknown>> = [];
    let nextPageKey: string | undefined;

    try {
      const response = await client.nft.getNftsForOwner(wallet, {
        excludeFilters: [NftFilters.SPAM],
        pageKey,
        pageSize: 100,
      });
      nfts = response.ownedNfts as unknown as Array<Record<string, unknown>>;
      nextPageKey = response.pageKey;
    } catch {
      try {
        const fallback = await client.nft.getNftsForOwner(wallet, {
          excludeFilters: [NftFilters.SPAM],
          pageKey,
          pageSize: 100,
          omitMetadata: true,
        });
        nextPageKey = fallback.pageKey;

        const enriched = await Promise.allSettled(
          fallback.ownedNfts.map((n) => client.nft.getNftMetadata(n.contractAddress, n.tokenId))
        );
        for (const result of enriched) {
          if (result.status === 'fulfilled') {
            nfts.push(result.value as unknown as Record<string, unknown>);
          }
        }
      } catch {
        break;
      }
    }

    for (const nft of nfts) {
      const raw = nft.raw as Record<string, unknown> | undefined;
      const metadata = raw?.metadata as Record<string, unknown> | undefined;
      const contract = nft.contract as Record<string, unknown> | undefined;
      const image = nft.image as { cachedUrl?: string; thumbnailUrl?: string; originalUrl?: string } | undefined;
      const media = resolveMedia(metadata, image);

      tokens.push({
        id: `${chain}-${contract?.address || ''}-${nft.tokenId || ''}`,
        chain,
        contractAddress: (contract?.address as string) || '',
        tokenId: nft.tokenId as string | undefined,
        standard: nft.tokenType === 'ERC1155' ? 'ERC1155' : 'ERC721',
        name: (nft.name as string) || (contract?.name as string) || `Token ${nft.tokenId || ''}`,
        description: (nft.description as string) || undefined,
        creator: (contract?.contractDeployer as string) || undefined,
        collectionName: (contract?.name as string) || undefined,
        media,
        balance: nft.balance as string | undefined,
        attributes: metadata?.attributes as Array<{ trait_type: string; value: string }> | undefined,
        rawMetadata: metadata,
        lastUpdated: nft.timeLastUpdated as string | undefined,
        acquiredAt: ((nft as Record<string, unknown>).acquiredAt as { blockTimestamp?: string } | undefined)?.blockTimestamp || undefined,
        mintedAt: ((nft as Record<string, unknown>).mint as { timestamp?: string } | undefined)?.timestamp || undefined,
      });
    }

    if (limit > 0 && tokens.length >= limit) break;
    pageKey = nextPageKey;
  } while (pageKey);

  return limit > 0 ? tokens.slice(0, limit) : tokens;
}

function nftToToken(nft: Record<string, unknown>, chain: ChainKey, mintedAt?: string): UnifiedToken {
  const raw = nft.raw as Record<string, unknown> | undefined;
  const metadata = raw?.metadata as Record<string, unknown> | undefined;
  const contract = nft.contract as Record<string, unknown> | undefined;
  const image = nft.image as { cachedUrl?: string; thumbnailUrl?: string; originalUrl?: string } | undefined;
  const media = resolveMedia(metadata, image);

  return {
    id: `${chain}-${contract?.address || ''}-${nft.tokenId || ''}`,
    chain,
    contractAddress: (contract?.address as string) || '',
    tokenId: nft.tokenId as string | undefined,
    standard: nft.tokenType === 'ERC1155' ? 'ERC1155' : 'ERC721',
    name: (nft.name as string) || (contract?.name as string) || `Token ${nft.tokenId || ''}`,
    description: (nft.description as string) || undefined,
    creator: (contract?.contractDeployer as string) || undefined,
    collectionName: (contract?.name as string) || undefined,
    media,
    balance: nft.balance as string | undefined,
    attributes: metadata?.attributes as Array<{ trait_type: string; value: string }> | undefined,
    rawMetadata: metadata,
    lastUpdated: nft.timeLastUpdated as string | undefined,
    mintedAt,
  };
}

const CHAIN_RPC: Record<ChainKey, string> = {
  ethereum: 'eth-mainnet',
  base: 'base-mainnet',
  optimism: 'opt-mainnet',
  zora: 'zora-mainnet',
};

async function fetchTransfersRaw(chain: ChainKey, wallet: string, maxCount: number) {
  const url = `https://${CHAIN_RPC[chain]}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getAssetTransfers',
      params: [{
        toAddress: wallet,
        category: ['erc721', 'erc1155'],
        order: 'desc',
        withMetadata: true,
        maxCount: `0x${maxCount.toString(16)}`,
      }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result?.transfers || [];
}

export async function fetchNewestForChain(chain: ChainKey, wallet: string, limit: number = 100): Promise<UnifiedToken[]> {
  const client = getClient(chain);

  const transfers = await fetchTransfersRaw(chain, wallet, limit * 2);

  let latestBlock: number | null = null;
  let now: number | null = null;

  const seen = new Set<string>();
  const transferList: Array<{ contract: string; tokenId: string; timestamp: string }> = [];

  for (const t of transfers) {
    const contract = (t.rawContract?.address as string)?.toLowerCase();
    const rawId = t.erc721TokenId || t.tokenId || t.erc1155Metadata?.[0]?.tokenId;
    if (!contract || !rawId) continue;

    const decId = BigInt(rawId).toString();
    const key = `${contract}-${decId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let timestamp = t.metadata?.blockTimestamp || '';

    if (!timestamp && t.blockNum) {
      if (latestBlock === null) {
        try {
          latestBlock = await client.core.getBlockNumber();
        } catch {
          const url = `https://${CHAIN_RPC[chain]}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
          const blockRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
          });
          const blockData = await blockRes.json();
          latestBlock = parseInt(blockData.result, 16);
        }
        now = Date.now();
      }
      const blockNum = parseInt(t.blockNum, 16);
      timestamp = new Date(now! - (latestBlock - blockNum) * 1000).toISOString();
    }

    transferList.push({ contract, tokenId: decId, timestamp });
    if (transferList.length >= limit) break;
  }

  const metadataResults = await Promise.allSettled(
    transferList.map((t) => client.nft.getNftMetadata(t.contract, t.tokenId))
  );

  const tokens: UnifiedToken[] = [];
  for (let i = 0; i < metadataResults.length; i++) {
    const r = metadataResults[i];
    if (r.status !== 'fulfilled') continue;
    const nft = r.value as unknown as Record<string, unknown>;
    tokens.push(nftToToken(nft, chain, transferList[i].timestamp));
  }

  return tokens;
}

async function buildDateMap(chain: ChainKey, wallet: string): Promise<Map<string, string>> {
  const dateMap = new Map<string, string>();
  try {
    const transfers = await fetchTransfersRaw(chain, wallet, 1000);
    let latestBlock: number | null = null;
    let now: number | null = null;

    for (const t of transfers) {
      const contract = (t.rawContract?.address as string)?.toLowerCase();
      const rawId = t.erc721TokenId || t.tokenId || t.erc1155Metadata?.[0]?.tokenId;
      if (!contract || !rawId) continue;

      const decId = BigInt(rawId).toString();
      const key = `${contract}-${decId}`;
      if (dateMap.has(key)) continue;

      let timestamp = t.metadata?.blockTimestamp || '';
      if (!timestamp && t.blockNum) {
        if (latestBlock === null) {
          const url = `https://${CHAIN_RPC[chain]}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
          const blockRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
          });
          const blockData = await blockRes.json();
          latestBlock = parseInt(blockData.result, 16);
          now = Date.now();
        }
        const blockNum = parseInt(t.blockNum, 16);
        timestamp = new Date(now! - (latestBlock - blockNum) * 1000).toISOString();
      }
      if (timestamp) dateMap.set(key, timestamp);
    }
  } catch { /* date enrichment is best-effort */ }
  return dateMap;
}

export async function fetchAllNfts(wallet?: string, chainFilter?: ChainKey, limit: number = 0): Promise<UnifiedToken[]> {
  const addr = wallet || DEFAULT_WALLET;
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const results = await Promise.allSettled(
    chains.map(async (c) => {
      const [tokens, dateMap] = await Promise.all([
        fetchNftsForChain(c, addr, limit),
        buildDateMap(c, addr),
      ]);
      return tokens.map((t) => {
        const key = `${t.contractAddress.toLowerCase()}-${t.tokenId || ''}`;
        const ts = dateMap.get(key);
        return ts ? { ...t, mintedAt: ts } : t;
      });
    })
  );

  const tokens: UnifiedToken[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      tokens.push(...result.value);
    }
  }
  return tokens;
}

export async function fetchNewestNfts(wallet?: string, limit: number = 100, chain: ChainKey = 'base'): Promise<UnifiedToken[]> {
  const addr = wallet || DEFAULT_WALLET;
  const results = await Promise.allSettled([fetchNewestForChain(chain, addr, limit)]);

  const tokens: UnifiedToken[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      tokens.push(...result.value);
    }
  }

  tokens.sort((a, b) => {
    const ta = a.mintedAt ? new Date(a.mintedAt).getTime() : 0;
    const tb = b.mintedAt ? new Date(b.mintedAt).getTime() : 0;
    return tb - ta;
  });

  return tokens.slice(0, limit);
}

export async function fetchTransfers(wallet?: string, chainFilter?: ChainKey): Promise<WalletConnection[]> {
  const addr = wallet || DEFAULT_WALLET;
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const connectionMap = new Map<string, { count: number; chains: Set<string>; types: Set<string> }>();

  for (const chain of chains) {
    const client = getClient(chain);

    const [sent, received] = await Promise.allSettled([
      client.core.getAssetTransfers({
        fromAddress: addr,
        category: ['erc721' as never, 'erc1155' as never],
        maxCount: 100,
      }),
      client.core.getAssetTransfers({
        toAddress: addr,
        category: ['erc721' as never, 'erc1155' as never],
        maxCount: 100,
      }),
    ]);

    const transfers = [
      ...(sent.status === 'fulfilled' ? sent.value.transfers : []),
      ...(received.status === 'fulfilled' ? received.value.transfers : []),
    ];

    for (const tx of transfers) {
      const otherAddress = tx.from.toLowerCase() === addr.toLowerCase()
        ? tx.to
        : tx.from;

      if (!otherAddress || otherAddress.toLowerCase() === addr.toLowerCase()) continue;

      const key = otherAddress.toLowerCase();
      const existing = connectionMap.get(key) || { count: 0, chains: new Set(), types: new Set() };
      existing.count++;
      existing.chains.add(chain);
      if (tx.category) existing.types.add(tx.category);
      connectionMap.set(key, existing);
    }
  }

  return Array.from(connectionMap.entries()).map(([address, data]) => ({
    address,
    transferCount: data.count,
    chains: Array.from(data.chains),
    tokenTypes: Array.from(data.types),
  }));
}
