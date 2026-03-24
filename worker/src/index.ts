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
      if (path === '/api/leaderboard' && request.method === 'GET') {
        return handleLeaderboard(env);
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
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
  const body = await request.json() as { hash: string; raster: number[]; user?: string };
  if (!body.hash || !body.raster) {
    return json({ error: 'missing hash or raster' }, 400);
  }

  const registry = await getRegistry(env);
  const res = await registry.fetch(new Request('http://do/discover', {
    method: 'POST',
    body: JSON.stringify(body),
  }));
  const data = await res.json();

  // If new discovery, also write metadata to KV
  if ((data as { isNew: boolean }).isNew) {
    await env.SHAPES.put(`shape:${body.hash}`, JSON.stringify({
      hash: body.hash,
      raster: body.raster,
      discoverer: body.user || 'anonymous',
      timestamp: Date.now(),
    }));

    // Update stats counter
    const countStr = await env.SHAPES.get('stats:totalDiscovered');
    const count = countStr ? parseInt(countStr, 10) : 0;
    await env.SHAPES.put('stats:totalDiscovered', String(count + 1));
  }

  return json(data);
}

async function handleStats(env: Env): Promise<Response> {
  const countStr = await env.SHAPES.get('stats:totalDiscovered');
  return json({ totalDiscovered: countStr ? parseInt(countStr, 10) : 0 });
}

async function handleLeaderboard(env: Env): Promise<Response> {
  // Simple implementation: scan KV for discoverers
  // In production, maintain a sorted leaderboard in KV
  return json([]);
}
