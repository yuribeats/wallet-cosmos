'use client';

import { useEffect } from 'react';
import { useStore } from './useStore';

export function useWalletData() {
  const walletAddress = useStore((s) => s.walletAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const setTokens = useStore((s) => s.setTokens);
  const setConnections = useStore((s) => s.setConnections);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);

  useEffect(() => {
    if (!walletLoaded || !walletAddress) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ wallet: walletAddress });

        const [nftRes, tokenRes] = await Promise.all([
          fetch(`/api/nfts?${params}`),
          fetch(`/api/tokens?${params}`),
        ]);

        if (cancelled) return;

        const nftData = await nftRes.json();
        const tokenData = await tokenRes.json();

        if (!nftRes.ok) throw new Error(nftData.error || 'Failed to fetch NFTs');
        if (!tokenRes.ok) throw new Error(tokenData.error || 'Failed to fetch tokens');

        const allTokens = [...(nftData.tokens || []), ...(tokenData.tokens || [])];
        setTokens(allTokens);

        fetch(`/api/transfers?${params}`)
          .then((r) => r.json())
          .then((data) => {
            if (!cancelled && data.connections) {
              setConnections(data.connections);
            }
          })
          .catch(() => {});
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
  }, [walletAddress, walletLoaded, setTokens, setConnections, setLoading, setError]);
}
