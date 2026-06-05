import { Transport } from './Transport.js';

export class Automations {
  constructor(private transport: Transport) {}

  async listNames(): Promise<string[]> {
    const entities = await this.transport.getEntities();
    return entities.result
      .map((entity: any) => entity.entity_id)
      .filter((entity_id: string) => entity_id.startsWith('automation.'));
  }

  async list(): Promise<Record<string, object>> {
    const automationNames = await this.listNames();

    const automations: Record<string, object> = {};
    for (const entity_id of automationNames) {
      const details = await this.get(entity_id);
      automations[entity_id] = details.result.config;
    }

    return automations;
  }

  async get(entity_id: string): Promise<any> {
    return await this.transport.getResponse({ type: 'automation/config', entity_id });
  }

  async create(id: string, config: object): Promise<any> {
    return await this.transport.callApi("POST", `/api/config/automation/config/${id}`, config);
  }

  async remove(entity_id: string): Promise<any> {
    return await this.transport.removeEntity(entity_id);
  }
}
