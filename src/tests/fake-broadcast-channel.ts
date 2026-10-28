// In-memory BroadcastChannel for tests. Like the real one, a message reaches
// every other open channel with the same name but never the sender itself.
export class FakeBroadcastChannel {
  static open = new Set<FakeBroadcastChannel>();
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(readonly name: string) {
    FakeBroadcastChannel.open.add(this);
  }

  postMessage(data: unknown): void {
    for (const peer of FakeBroadcastChannel.open) {
      if (peer !== this && peer.name === this.name) {
        peer.onmessage?.({ data } as MessageEvent);
      }
    }
  }

  close(): void {
    FakeBroadcastChannel.open.delete(this);
  }
}
