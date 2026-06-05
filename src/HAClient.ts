import { WebSocketClient } from './WebSocketClient.js';

export class HAClient {
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
      console.error(`[HTTP] --> ${method} ${url}`, options.body ?? '');
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
      console.error(`[HTTP] <-- ${method} ${url} ${response.status}`, JSON.stringify(json));
    }
    return json;
  }

  async createOrUpdateAutomation(id: string, config: object): Promise<any> {
    return await this.callApi("POST", `/api/config/automation/config/${id}`, config);
  }

  async removeHelper(id: string): Promise<any> {
    const type = id.split('.')[0];
    const name = id.split('.')[1];
    return await this.getResponse({
      type: `${type}/delete`,
      [`${type}_id`]: name,
    });
  }

  async createHelper(id: string, config: any): Promise<any> {
    const type = config.id.split('.')[0];
    const { id: _, ...configWithoutId } = config;
    return await this.getResponse({
        type: `${type}/create`,
        ...configWithoutId,
      });
  }

  async removeTemplate(entry_id: string): Promise<any> {
    return await this.getResponse({
      type: 'config_entries/remove',
      entry_id,
    });
  }

  async createTemplate(config: any): Promise<any> {
    const { subtype, id, ...userInput } = config;

    const init = await this.callApi('POST', '/api/config/config_entries/flow', {
      handler: 'template',
    });
    const flowId = init.flow_id;

    await this.callApi('POST', `/api/config/config_entries/flow/${flowId}`, {
      next_step_id: 'sensor',
    });

    return await this.callApi('POST', `/api/config/config_entries/flow/${flowId}`, userInput);
  }
}
