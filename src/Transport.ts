import { WebSocketClient } from './WebSocketClient.js';
import { formatWithMarker } from './utils.js';

/**
 * Low-level transport to Home Assistant: connection/auth, the WebSocket
 * request/response cycle, raw HTTP calls, and the generic entity/device
 * registry primitives that the resource namespaces build on top of.
 */
export class Transport {
  private ws: WebSocketClient;
  private counter: number = 1;
  private token: string;
  private baseUrl: string;
  private verbose: boolean;

  constructor(baseUrl: string, token: string, verbose: boolean = false) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.verbose = verbose;
    this.ws = new WebSocketClient(`${baseUrl.replace(/^http/, 'ws')}/api/websocket`, verbose);
  }

  async connect() {
    await this.ws.open();
    const authRequiredMsg = await this.ws.recv();
    if (authRequiredMsg.type !== 'auth_required') {
      throw new Error(`Expected auth_required, got ${authRequiredMsg.type}`);
    }

    this.ws.send({ type: 'auth', access_token: this.token });
    const authResponseMsg = await this.ws.recv();

    if (authResponseMsg.type === 'auth_invalid') {
      throw new Error('Authentication failed: Invalid access token');
    }
    if (authResponseMsg.type !== 'auth_ok') {
      throw new Error(`Expected auth_ok, got ${authResponseMsg.type}`);
    }
  }

  async disconnect() {
    this.ws.close();
  }

  async getResponse(request: object): Promise<any> {
    this.ws.send({ id: this.counter++, ...request });
    return await this.ws.recv();
  }

  async callApi(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    let url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    };

    if (parameters && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(parameters);
    } else if (parameters && method === 'GET') {
      const queryParams = new URLSearchParams(parameters);
      url = `${url}?${queryParams}`;
    }

    if (this.verbose) {
      console.error(`[HTTP] --> ${method} ${url}`);
      if (options.body) {
        console.error(formatWithMarker('[HTTP]', options.body as string));
      }
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      if (this.verbose) {
        console.error(`[HTTP] <-- ${method} ${url} ${response.status} ${response.statusText}`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (this.verbose) {
      console.error(`[HTTP] <-- ${method} ${url} ${response.status}`);
      console.error(formatWithMarker('[HTTP]', json));
    }
    return json;
  }

  async getDevices(): Promise<any> {
    return await this.getResponse({ type: 'config/device_registry/list' });
  }

  async getEntities(): Promise<any> {
    return await this.getResponse({ type: 'config/entity_registry/list' });
  }

  async removeEntity(entity_id: string): Promise<any> {
    return await this.getResponse({ type: 'config/entity_registry/remove', entity_id });
  }
}
