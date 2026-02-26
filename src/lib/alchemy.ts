import { Alchemy, Network, NftFilters } from 'alchemy-sdk';
import { DEFAULT_WALLET, CHAIN_KEYS, type ChainKey } from './constants';
import { resolveMedia } from './mediaUtils';
import type { UnifiedToken, WalletConnection, SenderInfo } from './types';

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

export async function fetchNftsForChain(chain: ChainKey, wallet: string): Promise<UnifiedToken[]> {
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
      });
    }

    pageKey = nextPageKey;
  } while (pageKey);

  return tokens;
}

export async function fetchAllNfts(wallet?: string, chainFilter?: ChainKey): Promise<UnifiedToken[]> {
  const addr = wallet || DEFAULT_WALLET;
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const results = await Promise.allSettled(chains.map((c) => fetchNftsForChain(c, addr)));

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

export async function fetchSenders(wallet: string, chain: ChainKey): Promise<SenderInfo[]> {
  const client = getClient(chain);
  const senderMap = new Map<string, { count: number; contracts: Set<string> }>();

  try {
    const response = await client.core.getAssetTransfers({
      toAddress: wallet,
      category: ['erc721' as never, 'erc1155' as never],
    });

    for (const tx of response.transfers) {
      const sender = tx.from?.toLowerCase();
      if (!sender || sender === wallet.toLowerCase()) continue;

      const existing = senderMap.get(sender) || { count: 0, contracts: new Set() };
      existing.count++;
      const contract = (tx.rawContract?.address || '').toLowerCase();
      if (contract) existing.contracts.add(contract);
      senderMap.set(sender, existing);
    }
  } catch (err) {
    console.error('fetchSenders error:', err);
  }

  return Array.from(senderMap.entries())
    .map(([address, data]) => ({
      address,
      transferCount: data.count,
      contractAddresses: Array.from(data.contracts),
    }))
    .sort((a, b) => b.transferCount - a.transferCount);
}

export async function resolveEnsNames(addresses: string[]): Promise<Map<string, string>> {
  const ethClient = getClient('ethereum');
  const results = new Map<string, string>();

  const batch = addresses.slice(0, 50);
  const lookups = await Promise.allSettled(
    batch.map(async (addr) => {
      const name = await ethClient.core.lookupAddress(addr);
      return { addr, name };
    })
  );

  for (const result of lookups) {
    if (result.status === 'fulfilled' && result.value.name) {
      results.set(result.value.addr, result.value.name);
    }
  }

  return results;
}
