import { GRID_SIZE } from 'shape-research-shared';
import { ShapeRegistry } from './durable/ShapeRegistry';

export { ShapeRegistry };

export interface Env {
  SHAPE_REGISTRY: DurableObjectNamespace;
  SHAPES: KVNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function isValidRaster(raster: unknown): raster is number[] {
  if (!Array.isArray(raster)) return false;
  if (raster.length !== GRID_SIZE * GRID_SIZE) return false;
  return raster.every(v => v === 0 || v === 1);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/check' && request.method === 'GET') {
        return handleCheck(url, env);
      }
      if (path === '/api/discover' && request.method === 'POST') {
        return handleDiscover(request, env);
      }
      if (path === '/api/stats' && request.method === 'GET') {
        return handleStats(env);
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
      console.error('request failed:', err);
      return json({ error: 'internal error' }, 500);
    }
  },
};

async function getRegistry(env: Env): Promise<DurableObjectStub> {
  const id = env.SHAPE_REGISTRY.idFromName('singleton');
  return env.SHAPE_REGISTRY.get(id);
}

async function handleCheck(url: URL, env: Env): Promise<Response> {
  const hash = url.searchParams.get('hash');
  if (!hash) return json({ error: 'missing hash parameter' }, 400);

  const registry = await getRegistry(env);
  const res = await registry.fetch(new Request('http://do/check', {
    method: 'POST',
    body: JSON.stringify({ hash }),
  }));
  const data = await res.json();
  return json(data);
}

async function handleDiscover(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { hash: string; raster: unknown; user?: string };
  if (!body.hash || !isValidRaster(body.raster)) {
    return json({ error: 'missing or invalid hash/raster' }, 400);
  }

  const registry = await getRegistry(env);
  const res = await registry.fetch(new Request('http://do/discover', {
    method: 'POST',
    body: JSON.stringify({ hash: body.hash, raster: body.raster, user: body.user }),
  }));
  const data = await res.json() as { isNew: boolean; discoveryNumber?: number };

  // If new discovery, write metadata to KV (count comes from DO, no race)
  if (data.isNew) {
    await env.SHAPES.put(`shape:${body.hash}`, JSON.stringify({
      hash: body.hash,
      raster: body.raster,
      discoverer: body.user || 'anonymous',
      timestamp: Date.now(),
    }));

    if (data.discoveryNumber !== undefined) {
      await env.SHAPES.put('stats:totalDiscovered', String(data.discoveryNumber));
    }
  }

  return json(data);
}

async function handleStats(env: Env): Promise<Response> {
  const countStr = await env.SHAPES.get('stats:totalDiscovered');
  return json({ totalDiscovered: countStr ? parseInt(countStr, 10) : 0 });
}
