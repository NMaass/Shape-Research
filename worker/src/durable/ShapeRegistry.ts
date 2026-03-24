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

      // Use blockConcurrencyWhile to prevent interleaving between the
      // existence check and the write, ensuring atomic discovery.
      let result: { isNew: boolean; discoveryNumber?: number } = { isNew: false };

      await this.state.blockConcurrencyWhile(async () => {
        const exists = await this.state.storage.get<boolean>(`hash:${body.hash}`);
        if (exists) return;

        const count = await this.state.storage.get<number>('meta:count') ?? 0;
        await this.state.storage.put({
          [`hash:${body.hash}`]: true,
          'meta:count': count + 1,
        });

        result = { isNew: true, discoveryNumber: count + 1 };
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
