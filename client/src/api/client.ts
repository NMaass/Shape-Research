import type { DiscoverResult, StatsResult } from 'shape-research-shared';

const API_BASE = '/api';

export async function discoverShape(
  hash: string,
  raster: number[],
  user?: string,
): Promise<DiscoverResult> {
  try {
    const res = await fetch(`${API_BASE}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash, raster, user }),
    });
    if (res.ok) return res.json();
    // Server returned an error — do not claim discovery
    return { isNew: false };
  } catch {
    // Network failure — do not claim discovery without server confirmation
    return { isNew: false };
  }
}

export async function getStats(): Promise<StatsResult | null> {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) return res.json();
  } catch {
    // Server unavailable
  }
  return null;
}
