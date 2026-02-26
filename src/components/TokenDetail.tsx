'use client';

import type { UnifiedToken } from '@/lib/types';
import { CHAINS, type ChainKey } from '@/lib/constants';
import MediaRenderer from './MediaRenderer';

interface TokenDetailProps {
  token: UnifiedToken;
  onClose: () => void;
}

export default function TokenDetail({ token, onClose }: TokenDetailProps) {
  const chain = CHAINS[token.chain as ChainKey];
  const explorerUrl = `${chain.explorer}/address/${token.contractAddress}`;
  const truncAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '420px',
      background: 'rgba(10, 10, 15, 0.92)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      overflowY: 'auto',
      zIndex: 100,
      padding: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '6px 12px',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          fontSize: '12px',
          textTransform: 'uppercase',
          cursor: 'crosshair',
        }}
      >
        CLOSE
      </button>

      <div style={{ marginTop: '48px', marginBottom: '20px' }}>
        <MediaRenderer token={token} />
      </div>

      <h2 style={{
        fontSize: '16px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        margin: '0 0 16px',
        letterSpacing: '0.05em',
      }}>
        {token.name}
      </h2>

      <div style={{ fontSize: '12px', lineHeight: '2', fontFamily: 'monospace' }}>
        {token.collectionName && (
          <div><span style={{ color: '#666' }}>COLLECTION:</span> {token.collectionName}</div>
        )}
        {token.creator && (
          <div><span style={{ color: '#666' }}>CREATOR:</span> {truncAddr(token.creator)}</div>
        )}
        <div>
          <span style={{ color: '#666' }}>CHAIN:</span>{' '}
          <span style={{ color: chain.color }}>{chain.name.toUpperCase()}</span>
        </div>
        <div><span style={{ color: '#666' }}>STANDARD:</span> {token.standard}</div>
        {token.tokenId && (
          <div><span style={{ color: '#666' }}>TOKEN ID:</span> {token.tokenId}</div>
        )}
        {token.balance && token.standard === 'ERC20' && token.decimals !== undefined && (
          <div>
            <span style={{ color: '#666' }}>BALANCE:</span>{' '}
            {(Number(BigInt(token.balance)) / Math.pow(10, token.decimals)).toFixed(4)} {token.symbol}
          </div>
        )}
      </div>

      {token.description && (
        <p style={{
          fontSize: '12px',
          color: '#999',
          lineHeight: '1.6',
          marginTop: '16px',
          fontFamily: 'monospace',
        }}>
          {token.description}
        </p>
      )}

      {token.attributes && token.attributes.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            color: '#666',
            marginBottom: '8px',
            letterSpacing: '0.1em',
          }}>
            ATTRIBUTES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {token.attributes.map((attr, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '6px 10px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                }}
              >
                <div style={{ color: '#666' }}>{attr.trait_type}</div>
                <div style={{ color: '#fff', marginTop: '2px' }}>{attr.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            textTransform: 'uppercase',
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          VIEW ON EXPLORER
        </a>
      </div>
    </div>
  );
}
