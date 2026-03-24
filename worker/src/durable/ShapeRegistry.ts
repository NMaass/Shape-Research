export class ShapeRegistry implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/check') {
      const body = await request.json() as { hash: string };
      const stored = await this.state.storage.get<boolean>(`hash:${body.hash}`);
      return Response.json({ isNew: !stored });
    }

    if (url.pathname === '/discover') {
      const body = await request.json() as { hash: string; raster: number[]; user?: string };

      const exists = await this.state.storage.get<boolean>(`hash:${body.hash}`);
      if (exists) {
        return Response.json({ isNew: false });
      }

      // Store hash and update count in a single atomic put
      const count = await this.state.storage.get<number>('meta:count') ?? 0;
      await this.state.storage.put({
        [`hash:${body.hash}`]: true,
        'meta:count': count + 1,
      });

      return Response.json({
        isNew: true,
        discoveryNumber: count + 1,
      });
    }

    if (url.pathname === '/count') {
      const count = await this.state.storage.get<number>('meta:count') ?? 0;
      return Response.json({ count });
    }

    return Response.json({ error: 'unknown path' }, { status: 404 });
  }
}
