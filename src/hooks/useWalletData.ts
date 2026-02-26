'use client';

import { useEffect } from 'react';
import { useStore } from './useStore';

export function useWalletData() {
  const evmAddress = useStore((s) => s.evmAddress);
  const solanaAddress = useStore((s) => s.solanaAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const setTokens = useStore((s) => s.setTokens);
  const appendTokens = useStore((s) => s.appendTokens);
  const setConnections = useStore((s) => s.setConnections);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);

  useEffect(() => {
    if (!walletLoaded) return;
    if (!evmAddress && !solanaAddress) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const fetches: Promise<void>[] = [];

        // Fetch EVM tokens
        if (evmAddress) {
          const evmParams = new URLSearchParams({ wallet: evmAddress });
          fetches.push(
            Promise.all([
              fetch(`/api/nfts?${evmParams}`),
              fetch(`/api/tokens?${evmParams}`),
            ]).then(async ([nftRes, tokenRes]) => {
              if (cancelled) return;
              const nftData = await nftRes.json();
              const tokenData = await tokenRes.json();
              if (!nftRes.ok) throw new Error(nftData.error || 'Failed to fetch EVM NFTs');
              if (!tokenRes.ok) throw new Error(tokenData.error || 'Failed to fetch EVM tokens');
              const evmTokens = [...(nftData.tokens || []), ...(tokenData.tokens || [])];
              if (!cancelled) setTokens(evmTokens);
            })
          );

          // Fetch connections in background (EVM only)
          fetch(`/api/transfers?${new URLSearchParams({ wallet: evmAddress })}`)
            .then((r) => r.json())
            .then((data) => {
              if (!cancelled && data.connections) setConnections(data.connections);
            })
            .catch(() => {});
        }

        // Fetch Solana tokens
        if (solanaAddress) {
          const solParams = new URLSearchParams({ wallet: solanaAddress });
          fetches.push(
            fetch(`/api/nfts?${solParams}`)
              .then(async (res) => {
                if (cancelled) return;
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to fetch Solana assets');
                if (!cancelled && data.tokens?.length) {
                  if (evmAddress) {
                    appendTokens(data.tokens);
                  } else {
                    setTokens(data.tokens);
                  }
                }
              })
          );
        }

        await Promise.all(fetches);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [evmAddress, solanaAddress, walletLoaded, setTokens, appendTokens, setConnections, setLoading, setError]);
}
