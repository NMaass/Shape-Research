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

      let result: { isNew: boolean; discoveryNumber?: number; timestamp: string; count: number } = {
        isNew: false, timestamp: '', count: 0,
      };

      await this.state.blockConcurrencyWhile(async () => {
        const existing = await this.state.storage.get<{ timestamp: string; count: number } | boolean>(`hash:${body.hash}`);

        if (existing) {
          // Migrate old boolean entries
          const entry = typeof existing === 'boolean'
            ? { timestamp: new Date().toISOString(), count: 1 }
            : existing;
          entry.count += 1;
          await this.state.storage.put(`hash:${body.hash}`, entry);
          result = { isNew: false, timestamp: entry.timestamp, count: entry.count };
          return;
        }

        const totalCount = await this.state.storage.get<number>('meta:count') ?? 0;
        const timestamp = new Date().toISOString();
        const entry = { timestamp, count: 1 };
        await this.state.storage.put({
          [`hash:${body.hash}`]: entry,
          'meta:count': totalCount + 1,
        });

        // Track per-user discovery count
        const user = body.user || 'anonymous';
        const userCount = await this.state.storage.get<number>(`user:${user}`) ?? 0;
        await this.state.storage.put(`user:${user}`, userCount + 1);

        result = { isNew: true, discoveryNumber: totalCount + 1, timestamp, count: 1 };
      });

      return Response.json(result);
    }

    if (url.pathname === '/count') {
      const count = await this.state.storage.get<number>('meta:count') ?? 0;
      return Response.json({ count });
    }

    return Response.json({ error: 'unknown path' }, { status: 404 });
  }
}
