import type { ChainKey } from './constants';

const CHAIN_IDS: Record<ChainKey, number> = {
  ethereum: 1,
  base: 8453,
  optimism: 10,
  zora: 7777777,
};

const ID_TO_CHAIN: Record<number, ChainKey> = Object.fromEntries(
  Object.entries(CHAIN_IDS).map(([k, v]) => [v, k as ChainKey])
) as Record<number, ChainKey>;

export interface DiscoveredToken {
  contract: string;
  tokenId: string;
  chain: ChainKey;
  name?: string;
  symbol?: string;
}

interface QueryRow {
  [key: string]: string | number;
}

async function queryIndexSupply(
  sql: string,
  signatures: string,
  chainIds: number[]
): Promise<QueryRow[]> {
  try {
    const params = new URLSearchParams({
      query: sql,
      signatures,
      event_signatures: signatures,
    });
    for (const id of chainIds) {
      params.append('chain', String(id));
    }

    const url = `https://api.indexsupply.net/v2/query?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const block = data[0];
    const columns: string[] = block.columns || [];
    const rows: Array<Array<string | number>> = block.rows || [];

    return rows.map((row) => {
      const obj: QueryRow = {};
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i];
      }
      return obj;
    });
  } catch {
    return [];
  }
}

export async function discoverCreatedTokens(
  wallet: string,
  chainFilter?: ChainKey
): Promise<DiscoveredToken[]> {
  const chains = chainFilter ? [chainFilter] : (['ethereum', 'base', 'optimism', 'zora'] as ChainKey[]);
  const chainIds = chains.map((c) => CHAIN_IDS[c]);
  const addr = wallet.toLowerCase();

  const setupSig = 'SetupNewToken(uint256 indexed tokenId, address indexed sender, string newURI, uint256 maxSupply)';
  const setupSql = `select chain_id, address, tokenid, sender, block_num from setupnewtoken where sender = ${addr} limit 200`;

  const coinSig = 'CoinCreated(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, address pool, string version)';
  const coinSql = `select chain_id, caller, coin, name, symbol, uri, block_num from coincreated where caller = ${addr} limit 200`;

  const [setupResult, coinResult] = await Promise.allSettled([
    queryIndexSupply(setupSql, setupSig, chainIds),
    queryIndexSupply(coinSql, coinSig, chainIds),
  ]);

  const tokens: DiscoveredToken[] = [];
  const seen = new Set<string>();

  if (setupResult.status === 'fulfilled') {
    for (const row of setupResult.value) {
      const chainId = Number(row.chain_id);
      const chain = ID_TO_CHAIN[chainId];
      if (!chain) continue;
      const contract = String(row.address).toLowerCase();
      const tokenId = String(row.tokenid);
      const key = `${chainId}-${contract}-${tokenId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tokens.push({ contract, tokenId, chain });
    }
  }

  if (coinResult.status === 'fulfilled') {
    for (const row of coinResult.value) {
      const chainId = Number(row.chain_id);
      const chain = ID_TO_CHAIN[chainId];
      if (!chain) continue;
      const contract = String(row.coin).toLowerCase();
      const key = `${chainId}-${contract}-0`;
      if (seen.has(key)) continue;
      seen.add(key);
      tokens.push({
        contract,
        tokenId: '0',
        chain,
        name: row.name ? String(row.name) : undefined,
        symbol: row.symbol ? String(row.symbol) : undefined,
      });
    }
  }

  return tokens;
}
