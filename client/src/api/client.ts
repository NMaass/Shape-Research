const API_BASE = '/api';

export interface DiscoverResult {
  isNew: boolean;
  discoveryNumber?: number;
}

export interface StatsResult {
  totalDiscovered: number;
}

export interface LeaderboardEntry {
  name: string;
  count: number;
  recentShapes: number[][];
}

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
  } catch {
    // Server unavailable — fall through to stub
  }
  return { isNew: true };
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
