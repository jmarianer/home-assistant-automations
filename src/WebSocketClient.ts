import WebSocket from 'ws';

export class WebSocketClient {
  private ws: WebSocket;
  private messageQueue: string[] = [];
  private waiters: Array<(msg: string) => void> = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.on('message', (data: WebSocket.Data) => {
      const msg = data.toString();

      if (this.waiters.length > 0) {
        const resolve = this.waiters.shift()!;
        resolve(msg);
      } else {
        this.messageQueue.push(msg);
      }
    });
  }

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        resolve();
      } else {
        this.ws.once('open', resolve);
        this.ws.once('error', reject);
      }
    });
  }

  close() {
    this.ws.close();
  }

  sendRaw(data: string): void {
    this.ws.send(data);
  }

  send(data: object): void {
    this.ws.send(JSON.stringify(data));
  }

  async recvRaw(): Promise<string> {
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift()!;
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  async recv(): Promise<any> {
    return JSON.parse((await this.recvRaw()));
  }
}
