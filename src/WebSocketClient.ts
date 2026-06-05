import WebSocket from 'ws';
import { formatWithMarker } from './utils.js';

export class WebSocketClient {
  private ws: WebSocket;
  private messageQueue: string[] = [];
  private waiters: Array<(msg: string) => void> = [];
  private verbose: boolean;

  constructor(url: string, verbose: boolean = false) {
    this.verbose = verbose;
    this.ws = new WebSocket(url);

    this.ws.on('message', (data: WebSocket.Data) => {
      const msg = data.toString();
      if (this.verbose) {
        console.error('[WS] <--');
        console.error(formatWithMarker('[WS]', msg));
      }

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

  send(data: object): void {
    const serialized = JSON.stringify(data);
    if (this.verbose) {
      console.error('[WS] -->');
      console.error(formatWithMarker('[WS]', serialized));
    }
    this.ws.send(serialized);
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
