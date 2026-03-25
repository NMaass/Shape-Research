import { useState, useEffect } from 'react';
import type { ShapeDescriptor } from 'shape-research-shared';

const STORAGE_KEY = 'shape-research-discoveries';
const STATS_KEY = 'shape-research-personal-stats';
const MAX_STORED_SHAPES = 500;

export interface StoredShape {
  hash: string;
  descriptor: ShapeDescriptor;
  timestamp: number;
  /** @deprecated old raster format, kept for migration */
  raster?: number[];
}

export interface PersonalStats {
  count: number;
  newStreak: number;
  foundStreak: number;
  bestNewStreak: number;
}

const DEFAULT_STATS: PersonalStats = {
  count: 0,
  newStreak: 0,
  foundStreak: 0,
  bestNewStreak: 0,
};

export function getPersonalStats(): PersonalStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      newStreak: typeof parsed.newStreak === 'number' ? parsed.newStreak : 0,
      foundStreak: typeof parsed.foundStreak === 'number' ? parsed.foundStreak : 0,
      bestNewStreak: typeof parsed.bestNewStreak === 'number' ? parsed.bestNewStreak : 0,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function recordDiscovery(isNew: boolean): PersonalStats {
  const stats = getPersonalStats();
  if (isNew) {
    stats.count += 1;
    stats.newStreak += 1;
    stats.foundStreak = 0;
    stats.bestNewStreak = Math.max(stats.bestNewStreak, stats.newStreak);
  } else {
    stats.foundStreak += 1;
    stats.newStreak = 0;
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

export function getMyShapes(): StoredShape[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShape(hash: string, descriptor: ShapeDescriptor): void {
  const shapes = getMyShapes();
  if (shapes.some(s => s.hash === hash)) return;
  shapes.unshift({ hash, descriptor, timestamp: Date.now() });
  if (shapes.length > MAX_STORED_SHAPES) shapes.length = MAX_STORED_SHAPES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
  window.dispatchEvent(new Event('shapes-updated'));
}

export function useMyShapes(): StoredShape[] {
  const [shapes, setShapes] = useState<StoredShape[]>([]);

  useEffect(() => {
    setShapes(getMyShapes());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setShapes(getMyShapes());
    };
    const onUpdate = () => setShapes(getMyShapes());
    window.addEventListener('storage', onStorage);
    window.addEventListener('shapes-updated', onUpdate);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('shapes-updated', onUpdate);
    };
  }, []);

  return shapes;
}
