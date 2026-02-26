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
  solana: {
    name: 'Solana',
    network: 'solana-mainnet',
    color: '#9945FF',
    alchemyNetwork: 'SOLANA_MAINNET',
    explorer: 'https://solscan.io',
  },
} as const;

export type ChainKey = keyof typeof CHAINS;

export const CHAIN_KEYS = Object.keys(CHAINS) as ChainKey[];

export const EVM_CHAIN_KEYS = CHAIN_KEYS.filter((k) => k !== 'solana') as ChainKey[];

export const TOKEN_STANDARDS = {
  ERC721: 'ERC721',
  ERC1155: 'ERC1155',
  ERC20: 'ERC20',
} as const;

export function isEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function isSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}
