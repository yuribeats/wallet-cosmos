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
    const rawColumns: Array<string | { name: string }> = block.columns || [];
    const columns: string[] = rawColumns.map((c) => typeof c === 'string' ? c : c.name);
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
  const chainList = chainIds.join(', ');

  const queries: Array<{ sig: string; sql: string; parse: (rows: QueryRow[]) => void }> = [];

  const tokens: DiscoveredToken[] = [];
  const seen = new Set<string>();

  function addToken(t: DiscoveredToken) {
    const key = `${CHAIN_IDS[t.chain]}-${t.contract}-${t.tokenId}`;
    if (seen.has(key)) return;
    seen.add(key);
    tokens.push(t);
  }

  queries.push({
    sig: 'SetupNewToken(uint256 indexed tokenId, address indexed sender, string newURI, uint256 maxSupply)',
    sql: `select chain, address, tokenid, sender, block_num from setupnewtoken where sender = ${addr} and chain in (${chainList}) limit 200`,
    parse: (rows) => {
      for (const row of rows) {
        const chain = ID_TO_CHAIN[Number(row.chain)];
        if (!chain) continue;
        addToken({ contract: String(row.address).toLowerCase(), tokenId: String(row.tokenid), chain });
      }
    },
  });

  queries.push({
    sig: 'CoinCreated(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, address pool, string version)',
    sql: `select chain, caller, coin, name, symbol, uri, block_num from coincreated where caller = ${addr} and chain in (${chainList}) limit 200`,
    parse: (rows) => {
      for (const row of rows) {
        const chain = ID_TO_CHAIN[Number(row.chain)];
        if (!chain) continue;
        addToken({
          contract: String(row.coin).toLowerCase(),
          tokenId: '0',
          chain,
          name: row.name ? String(row.name) : undefined,
          symbol: row.symbol ? String(row.symbol) : undefined,
        });
      }
    },
  });

  queries.push({
    sig: 'CreatedDrop(address indexed creator, address indexed editionContractAddress, uint256 editionSize)',
    sql: `select chain, creator, editioncontractaddress, editionsize from createddrop where creator = ${addr} and chain in (${chainList}) limit 200`,
    parse: (rows) => {
      for (const row of rows) {
        const chain = ID_TO_CHAIN[Number(row.chain)];
        if (!chain) continue;
        addToken({ contract: String(row.editioncontractaddress).toLowerCase(), tokenId: '1', chain });
      }
    },
  });

  queries.push({
    sig: 'CreatedEdition(uint256 indexed editionId, address indexed creator, uint256 editionSize, address editionContractAddress)',
    sql: `select chain, creator, editioncontractaddress, editionsize, editionid from creatededition where creator = ${addr} and chain in (${chainList}) limit 200`,
    parse: (rows) => {
      for (const row of rows) {
        const chain = ID_TO_CHAIN[Number(row.chain)];
        if (!chain) continue;
        addToken({ contract: String(row.editioncontractaddress).toLowerCase(), tokenId: '1', chain });
      }
    },
  });

  queries.push({
    sig: 'Minted(address indexed creator, uint256 indexed tokenId, string indexed indexedTokenCID, string tokenCID)',
    sql: `select chain, address, creator, tokenid from minted where creator = ${addr} and chain in (${chainList}) limit 200`,
    parse: (rows) => {
      for (const row of rows) {
        const chain = ID_TO_CHAIN[Number(row.chain)];
        if (!chain) continue;
        addToken({ contract: String(row.address).toLowerCase(), tokenId: String(row.tokenid), chain });
      }
    },
  });

  const results = await Promise.allSettled(
    queries.map((q) => queryIndexSupply(q.sql, q.sig, chainIds))
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') queries[i].parse(r.value);
  }

  return tokens;
}
