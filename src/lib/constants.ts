export const DEFAULT_WALLET = '0x7b753919b953b1021a33f55671716dc13c1eae08';

export const CHAINS = {
  ethereum: {
    name: 'Ethereum',
    network: 'eth-mainnet',
    color: '#627EEA',
    alchemyNetwork: 'ETH_MAINNET',
    explorer: 'https://etherscan.io',
  },
  base: {
    name: 'Base',
    network: 'base-mainnet',
    color: '#0052FF',
    alchemyNetwork: 'BASE_MAINNET',
    explorer: 'https://basescan.org',
  },
  optimism: {
    name: 'Optimism',
    network: 'opt-mainnet',
    color: '#FF0420',
    alchemyNetwork: 'OPT_MAINNET',
    explorer: 'https://optimistic.etherscan.io',
  },
  zora: {
    name: 'Zora',
    network: 'zora-mainnet',
    color: '#5B5BD6',
    alchemyNetwork: 'ZORA_MAINNET',
    explorer: 'https://explorer.zora.energy',
  },
} as const;

export type ChainKey = keyof typeof CHAINS;

export const CHAIN_KEYS = Object.keys(CHAINS) as ChainKey[];

export const TOKEN_STANDARDS = {
  ERC721: 'ERC721',
  ERC1155: 'ERC1155',
} as const;

export function isEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}
