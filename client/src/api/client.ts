import type { DiscoverResult, StatsResult } from 'shape-research-shared';

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function discoverShape(
  hash: string,
  raster: number[],
  user?: string,
): Promise<DiscoverResult> {
  const res = await fetch(`${API_BASE}/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash, raster, user }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || `server error ${res.status}`);
  }
  return res.json();
}

export async function getStats(): Promise<StatsResult> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) {
    throw new ApiError(res.status, `server error ${res.status}`);
  }
  return res.json();
}
