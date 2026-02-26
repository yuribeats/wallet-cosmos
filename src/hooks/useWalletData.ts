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

        if (evmAddress) {
          const evmParams = new URLSearchParams({ wallet: evmAddress });
          fetches.push(
            fetch(`/api/nfts?${evmParams}`)
              .then(async (res) => {
                if (cancelled) return;
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to fetch EVM NFTs');
                if (!cancelled) setTokens(data.tokens || []);
              })
          );

          fetch(`/api/transfers?${new URLSearchParams({ wallet: evmAddress })}`)
            .then((r) => r.json())
            .then((data) => {
              if (!cancelled && data.connections) setConnections(data.connections);
            })
            .catch(() => {});
        }

        if (solanaAddress) {
          const solParams = new URLSearchParams({ wallet: solanaAddress });
          fetches.push(
            fetch(`/api/nfts?${solParams}`)
              .then(async (res) => {
                if (cancelled) return;
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to fetch Solana NFTs');
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
