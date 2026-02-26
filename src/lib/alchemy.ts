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

async function enrichTokenDates(tokens: UnifiedToken[], chain: ChainKey, wallet: string): Promise<UnifiedToken[]> {
  const client = getClient(chain);

  try {
    const result = await client.core.getAssetTransfers({
      toAddress: wallet,
      category: ['erc721' as never, 'erc1155' as never],
      order: 'desc' as never,
      withMetadata: true,
      maxCount: 500,
    });

    const dateMap = new Map<string, string>();
    const missingBlocks = new Set<string>();

    for (const t of result.transfers) {
      const contract = t.rawContract?.address?.toLowerCase();
      const rawId = t.erc721TokenId || t.tokenId || (t.erc1155Metadata as Array<{ tokenId: string }> | null)?.[0]?.tokenId;
      if (!contract || !rawId) continue;
      const decId = BigInt(rawId).toString();
      const key = `${contract}-${decId}`;
      if (dateMap.has(key)) continue;

      const meta = t.metadata as { blockTimestamp?: string } | null;
      if (meta?.blockTimestamp) {
        dateMap.set(key, meta.blockTimestamp);
      } else if (t.blockNum) {
        missingBlocks.add(t.blockNum);
        dateMap.set(key, t.blockNum);
      }
    }

    if (missingBlocks.size > 0) {
      const latestBlock = await client.core.getBlockNumber();
      const now = Date.now();
      for (const [key, val] of dateMap) {
        if (val.startsWith('0x')) {
          const blockNum = parseInt(val, 16);
          const estimatedMs = now - (latestBlock - blockNum) * 1000;
          dateMap.set(key, new Date(estimatedMs).toISOString());
        }
      }
    }

    return tokens.map((token) => {
      const key = `${token.contractAddress.toLowerCase()}-${token.tokenId || ''}`;
      const ts = dateMap.get(key);
      return ts ? { ...token, mintedAt: ts } : token;
    });
  } catch {
    return tokens;
  }
}

export async function fetchAllNfts(wallet?: string, chainFilter?: ChainKey, limit: number = 0): Promise<UnifiedToken[]> {
  const addr = wallet || DEFAULT_WALLET;
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const results = await Promise.allSettled(
    chains.map(async (c) => {
      const tokens = await fetchNftsForChain(c, addr, limit);
      return enrichTokenDates(tokens, c, addr);
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
