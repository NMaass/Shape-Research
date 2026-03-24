import { useState, useEffect } from 'react';

const STORAGE_KEY = 'shape-research-discoveries';

export interface StoredShape {
  hash: string;
  raster: number[];
  timestamp: number;
}

export function getMyShapes(): StoredShape[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShape(hash: string, raster: number[]): void {
  const shapes = getMyShapes();
  if (shapes.some(s => s.hash === hash)) return;
  shapes.unshift({ hash, raster, timestamp: Date.now() });
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
