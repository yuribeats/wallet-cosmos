import { Alchemy, Network, NftFilters } from 'alchemy-sdk';
import { WALLET_ADDRESS, CHAIN_KEYS, type ChainKey } from './constants';
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

export async function fetchNftsForChain(chain: ChainKey): Promise<UnifiedToken[]> {
  const client = getClient(chain);
  const tokens: UnifiedToken[] = [];
  let pageKey: string | undefined;

  do {
    const response = await client.nft.getNftsForOwner(WALLET_ADDRESS, {
      excludeFilters: [NftFilters.SPAM],
      pageKey,
      pageSize: 100,
    });

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

export async function fetchAllNfts(chainFilter?: ChainKey): Promise<UnifiedToken[]> {
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const results = await Promise.allSettled(chains.map((c) => fetchNftsForChain(c)));

  const tokens: UnifiedToken[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      tokens.push(...result.value);
    }
  }
  return tokens;
}

export async function fetchErc20ForChain(chain: ChainKey): Promise<UnifiedToken[]> {
  const client = getClient(chain);
  const balances = await client.core.getTokenBalances(WALLET_ADDRESS);
  const tokens: UnifiedToken[] = [];

  const nonZero = balances.tokenBalances.filter(
    (t) => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  const metadataPromises = nonZero.map((t) =>
    client.core.getTokenMetadata(t.contractAddress).catch(() => null)
  );
  const metadataResults = await Promise.allSettled(metadataPromises);

  for (let i = 0; i < nonZero.length; i++) {
    const bal = nonZero[i];
    const metaResult = metadataResults[i];
    const meta = metaResult.status === 'fulfilled' ? metaResult.value : null;

    if (!meta) continue;

    tokens.push({
      id: `${chain}-${bal.contractAddress}-erc20`,
      chain,
      contractAddress: bal.contractAddress,
      standard: 'ERC20',
      name: meta.name || 'Unknown Token',
      symbol: meta.symbol || undefined,
      decimals: meta.decimals || undefined,
      balance: bal.tokenBalance || undefined,
      logo: meta.logo || undefined,
      media: {
        image: meta.logo || undefined,
        thumbnail: meta.logo || undefined,
        mediaType: meta.logo ? 'image' : 'text',
      },
    });
  }

  return tokens;
}

export async function fetchAllErc20(chainFilter?: ChainKey): Promise<UnifiedToken[]> {
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const results = await Promise.allSettled(chains.map((c) => fetchErc20ForChain(c)));

  const tokens: UnifiedToken[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      tokens.push(...result.value);
    }
  }
  return tokens;
}

export async function fetchTransfers(chainFilter?: ChainKey): Promise<WalletConnection[]> {
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const connectionMap = new Map<string, { count: number; chains: Set<string>; types: Set<string> }>();

  for (const chain of chains) {
    const client = getClient(chain);

    const [sent, received] = await Promise.allSettled([
      client.core.getAssetTransfers({
        fromAddress: WALLET_ADDRESS,
        category: ['erc721' as never, 'erc1155' as never, 'erc20' as never],
        maxCount: 100,
      }),
      client.core.getAssetTransfers({
        toAddress: WALLET_ADDRESS,
        category: ['erc721' as never, 'erc1155' as never, 'erc20' as never],
        maxCount: 100,
      }),
    ]);

    const transfers = [
      ...(sent.status === 'fulfilled' ? sent.value.transfers : []),
      ...(received.status === 'fulfilled' ? received.value.transfers : []),
    ];

    for (const tx of transfers) {
      const otherAddress = tx.from.toLowerCase() === WALLET_ADDRESS.toLowerCase()
        ? tx.to
        : tx.from;

      if (!otherAddress || otherAddress.toLowerCase() === WALLET_ADDRESS.toLowerCase()) continue;

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
