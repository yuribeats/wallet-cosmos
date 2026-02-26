export interface UnifiedToken {
  id: string;
  chain: 'ethereum' | 'base' | 'optimism' | 'zora';
  contractAddress: string;
  tokenId?: string;
  standard: 'ERC721' | 'ERC1155';
  name: string;
  description?: string;
  creator?: string;
  collectionName?: string;

  media: {
    image?: string;
    thumbnail?: string;
    video?: string;
    audio?: string;
    mediaType: 'image' | 'video' | 'audio' | 'text' | 'html' | 'unknown';
  };

  balance?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  rawMetadata?: Record<string, unknown>;
  lastUpdated?: string;

  position?: [number, number, number];
}

export interface WalletConnection {
  address: string;
  transferCount: number;
  chains: string[];
  tokenTypes: string[];
}

export type FilterState = {
  standards: string[];
  mediaTypes: string[];
  sortBy: 'newest' | 'date' | 'creator' | 'mediaType' | 'tokenType' | 'chain' | 'grid';
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  selectedCreator?: string;
  density: number;
  newestCount: number;
};
