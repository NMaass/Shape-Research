import type { DiscoverResult, StatsResult, LeaderboardEntry } from 'shape-research-shared';

const API_BASE = '/api';

export type { DiscoverResult, StatsResult, LeaderboardEntry };

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
    // Network failure — optimistically allow offline use
    return { isNew: true };
  }
}

export async function getStats(): Promise<StatsResult> {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) return res.json();
  } catch {
    // Server unavailable
  }
  return { totalDiscovered: 0 };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (res.ok) return res.json();
  } catch {
    // Server unavailable
  }
  return [];
}
