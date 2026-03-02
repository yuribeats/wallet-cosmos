import { Alchemy, Network, NftFilters } from 'alchemy-sdk';
import { DEFAULT_WALLET, CHAIN_KEYS, type ChainKey } from './constants';
import { resolveMedia } from './mediaUtils';
import type { UnifiedToken, WalletConnection } from './types';
import { discoverCreatedTokens } from './indexsupply';

async function retry<T>(fn: () => Promise<T>, attempts = 2, delay = 500): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('retry exhausted');
}

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
          fallback.ownedNfts.map((n) => retry(() => client.nft.getNftMetadata(n.contractAddress, n.tokenId)))
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

    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];
      const raw = nft.raw as Record<string, unknown> | undefined;
      const metadata = raw?.metadata as Record<string, unknown> | undefined;
      const contract = nft.contract as Record<string, unknown> | undefined;
      const image = nft.image as { cachedUrl?: string; thumbnailUrl?: string; originalUrl?: string } | undefined;
      const media = resolveMedia(metadata, image);

      const deployer = (contract?.contractDeployer as string) || undefined;
      const isDeployerMatch = deployer && wallet.toLowerCase() === deployer.toLowerCase();
      const mint = (nft as Record<string, unknown>).mint as { mintAddress?: string; timestamp?: string } | undefined;
      const isMintedByWallet = nft.tokenType !== 'ERC1155' && mint?.mintAddress && wallet.toLowerCase() === mint.mintAddress.toLowerCase();
      const isCreated = isDeployerMatch || isMintedByWallet;

      tokens.push({
        id: `${chain}-${contract?.address || ''}-${nft.tokenId || ''}`,
        chain,
        contractAddress: (contract?.address as string) || '',
        tokenId: nft.tokenId as string | undefined,
        standard: nft.tokenType === 'ERC1155' ? 'ERC1155' : 'ERC721',
        name: (nft.name as string) || (contract?.name as string) || `Token ${nft.tokenId || ''}`,
        description: (nft.description as string) || undefined,
        creator: deployer,
        collectionName: (contract?.name as string) || undefined,
        media,
        balance: nft.balance as string | undefined,
        attributes: metadata?.attributes as Array<{ trait_type: string; value: string }> | undefined,
        rawMetadata: metadata,
        lastUpdated: nft.timeLastUpdated as string | undefined,
        acquiredAt: ((nft as Record<string, unknown>).acquiredAt as { blockTimestamp?: string } | undefined)?.blockTimestamp || undefined,
        mintedAt: mint?.timestamp || undefined,
        ...(isCreated ? { createdByWallet: true, creationSource: isDeployerMatch ? 'owned_deployer_match' as const : 'minted' as const } : {}),
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

export async function fetchNewestForChain(chain: ChainKey, wallet: string, limit: number = 100): Promise<UnifiedToken[]> {
  const tokens = await fetchNftsForChain(chain, wallet, limit);

  tokens.sort((a, b) => {
    const ta = a.acquiredAt ? new Date(a.acquiredAt).getTime() : a.mintedAt ? new Date(a.mintedAt).getTime() : 0;
    const tb = b.acquiredAt ? new Date(b.acquiredAt).getTime() : b.mintedAt ? new Date(b.mintedAt).getTime() : 0;
    return tb - ta;
  });

  return tokens.slice(0, limit);
}

export async function fetchAllNfts(wallet?: string, chainFilter?: ChainKey, limit: number = 0): Promise<UnifiedToken[]> {
  const addr = wallet || DEFAULT_WALLET;
  const chains = chainFilter ? [chainFilter] : CHAIN_KEYS;
  const results = await Promise.allSettled(
    chains.map((c) => fetchNftsForChain(c, addr, limit))
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

export async function fetchCreatedNfts(wallet?: string, chainFilter?: ChainKey, limit: number = 0): Promise<UnifiedToken[]> {
  const addr = wallet || DEFAULT_WALLET;
  const discovered = await discoverCreatedTokens(addr, chainFilter);

  const contractsByChain = new Map<ChainKey, Set<string>>();
  for (const d of discovered) {
    const set = contractsByChain.get(d.chain) || new Set();
    set.add(d.contract);
    contractsByChain.set(d.chain, set);
  }

  const allTokens: UnifiedToken[] = [];
  const seenIds = new Set<string>();

  const chainResults = await Promise.allSettled(
    Array.from(contractsByChain.entries()).map(async ([chain, contracts]) => {
      const client = getClient(chain);
      const tokens: UnifiedToken[] = [];

      const contractResults = await Promise.allSettled(
        Array.from(contracts).map(async (contract) => {
          const response = await retry(() =>
            client.nft.getNftsForContract(contract, { pageSize: 50 })
          );
          const nfts = response.nfts as unknown as Array<Record<string, unknown>>;
          for (const nft of nfts) {
            const token = nftToToken(nft, chain);
            if (!seenIds.has(token.id)) {
              seenIds.add(token.id);
              tokens.push({ ...token, createdByWallet: true, creationSource: 'minted' });
            }
          }
        })
      );

      for (const r of contractResults) {
        if (r.status === 'rejected') {
          console.error('Contract fetch failed:', r.reason);
        }
      }

      return tokens;
    })
  );

  for (const result of chainResults) {
    if (result.status === 'fulfilled') {
      allTokens.push(...result.value);
    }
  }

  return limit > 0 ? allTokens.slice(0, limit) : allTokens;
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
