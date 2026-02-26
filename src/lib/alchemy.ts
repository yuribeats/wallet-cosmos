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

export async function fetchNftsForChain(chain: ChainKey, wallet: string): Promise<UnifiedToken[]> {
  const client = getClient(chain);
  const tokens: UnifiedToken[] = [];
  let pageKey: string | undefined;

  do {
    let response;
    try {
      response = await client.nft.getNftsForOwner(wallet, {
        excludeFilters: [NftFilters.SPAM],
        pageKey,
        pageSize: 100,
      });
    } catch {
      try {
        response = await client.nft.getNftsForOwner(wallet, {
          excludeFilters: [NftFilters.SPAM],
          pageKey,
          pageSize: 100,
          omitMetadata: true,
        });
      } catch {
        break;
      }
    }

    for (const nft of response.ownedNfts) {
      const media = resolveMedia(
        nft.raw?.metadata as Record<string, unknown> | undefined,
        nft.image
      );

      tokens.push({
        id: `${chain}-${nft.contract.address}-${nft.tokenId}`,
        chain,
        contractAddress: nft.contract.address,
        tokenId: nft.tokenId,
        standard: nft.tokenType === 'ERC1155' ? 'ERC1155' : 'ERC721',
        name: nft.name || nft.contract.name || `Token ${nft.tokenId}`,
        description: nft.description || undefined,
        creator: nft.contract.contractDeployer || undefined,
        collectionName: nft.contract.name || undefined,
        media,
        balance: nft.balance,
        attributes: (nft.raw?.metadata as Record<string, unknown>)?.attributes as
          | Array<{ trait_type: string; value: string }>
          | undefined,
        rawMetadata: nft.raw?.metadata as Record<string, unknown> | undefined,
        lastUpdated: nft.timeLastUpdated,
      });
    }

    pageKey = response.pageKey;
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
