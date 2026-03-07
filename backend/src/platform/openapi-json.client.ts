import WebSocket = require('ws');

type OpenApiMessage = {
  clientMsgId: string;
  payloadType: number;
  payload: Record<string, any>;
};

export class OpenApiJsonClient {
  private ws!: WebSocket;

  constructor(private url: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        return reject(e);
      }
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
    });
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  send<T = any>(
    msg: OpenApiMessage,
    expectTypes: number[],
    timeoutMs = 15000,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.ws?.off('message', onMessage as any);
        this.ws?.off('error', onError);
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const onMessage = (raw: WebSocket.RawData) => {
        try {
          const text = Buffer.isBuffer(raw)
            ? raw.toString('utf8')
            : Array.isArray(raw)
              ? Buffer.concat(raw).toString('utf8')
              : Buffer.from(raw as ArrayBuffer).toString('utf8');

          const data = JSON.parse(text);
          if (expectTypes.includes(data.payloadType)) {
            cleanup();
            resolve(data);
          } else if (data.payloadType === 2142) {
            cleanup();
            const code = data?.payload?.errorCode ?? 'UNKNOWN';
            const desc = data?.payload?.description ?? '';
            reject(
              new Error(`OpenAPI error: ${code}${desc ? ` - ${desc}` : ''}`),
            );
          }
        } catch {
          // ignore control frames
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('OpenAPI timeout'));
      }, timeoutMs);

      this.ws.on('message', onMessage as any);
      this.ws.on('error', onError);

      try {
        this.ws.send(JSON.stringify(msg));
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  }

  static nextId() {
    return `cm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
