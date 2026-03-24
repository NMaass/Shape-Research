export class ShapeRegistry implements DurableObject {
  private hashes: Set<string>;
  private initialized: boolean;
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.hashes = new Set();
    this.initialized = false;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    // Hydrate from durable storage
    const stored = await this.state.storage.get<string[]>('hashes');
    if (stored) {
      for (const h of stored) this.hashes.add(h);
    }
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    await this.state.storage.put('hashes', [...this.hashes]);
  }

  async fetch(request: Request): Promise<Response> {
    await this.init();

    const url = new URL(request.url);

    if (url.pathname === '/check') {
      const body = await request.json() as { hash: string };
      const exists = this.hashes.has(body.hash);
      return Response.json({ isNew: !exists });
    }

    if (url.pathname === '/discover') {
      const body = await request.json() as { hash: string; raster: number[]; user?: string };

      if (this.hashes.has(body.hash)) {
        return Response.json({ isNew: false });
      }

      // Atomic insert
      this.hashes.add(body.hash);
      await this.persist();

      return Response.json({
        isNew: true,
        discoveryNumber: this.hashes.size,
      });
    }

    return Response.json({ error: 'unknown path' }, { status: 404 });
  }
}
