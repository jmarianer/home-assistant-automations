import { WebSocketClient } from './WebSocketClient.js';

export class HAClient {
  private ws: WebSocketClient;
  private counter: number = 1;
  private token: string;
  private baseUrl: string;

  constructor(baseUrl: string, token: string) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.ws = new WebSocketClient(`${baseUrl.replace(/^http/, 'ws')}/api/websocket`);
  }

  async connect() {
    await this.ws.open();
    await this.ws.recv();
    // TODO if message.type !== auth_required throw error
    this.ws.send({ type: 'auth', access_token: this.token });
    await this.ws.recv();
    // TODO if message.type !== auth_ok throw error
  }

  async disconnect() {
    this.ws.close();
  }

  private async getResponse(request: object): Promise<any> {
    this.ws.send({ id: this.counter++, ...request });
    return await this.ws.recv();
  }

  async getAutomationConfig(entity_id: string): Promise<any> {
    return await this.getResponse({ type: 'automation/config', entity_id });
  }

  async removeEntity(entity_id: string): Promise<any> {
    return await this.getResponse({ type: 'config/entity_registry/remove', entity_id });
  }

  async getDevices(): Promise<any> {
    return await this.getResponse({ type: 'config/device_registry/list' });
  }

  async getEntities(): Promise<any> {
    return await this.getResponse({ type: 'config/entity_registry/list' });
  }

  private async callApi(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
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
      const fullUrl = `${url}?${queryParams}`;
      const response = await fetch(fullUrl, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }

  async createOrUpdateAutomation(id: string, config: object): Promise<any> {
    return await this.callApi("POST", `/api/config/automation/config/${id}`, config);
  }
}
