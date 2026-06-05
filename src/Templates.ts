import slug from 'slug';
import { Transport } from './Transport.js';

export class Templates {
  constructor(private transport: Transport) {}

  async list(): Promise<Record<string, any>> {
    const response = await this.transport.getResponse({
      type: 'config_entries/get',
      domain: 'template',
    });

    const templates: Record<string, any> = {};
    for (const entry of response.result) {
      const entryId = entry.entry_id;

      const response = await this.transport.callApi('POST', `/api/config/config_entries/options/flow`, {
        handler: entryId,
      });

      await this.transport.callApi('DELETE', `/api/config/config_entries/options/flow/${response.flow_id}`);
      const id = `sensor.${slug(entry.title, '_')}`;
      templates[id] = {
        name: entry.title,
        id,
        ...Object.fromEntries(
          response.data_schema.map((item: any) => {
            return [item.name, item.description?.suggested_value];
          })
        )
      };
    }
    return templates;
  }

  async create(config: any): Promise<any> {
    const { subtype, id, ...userInput } = config;

    const init = await this.transport.callApi('POST', '/api/config/config_entries/flow', {
      handler: 'template',
    });
    const flowId = init.flow_id;

    await this.transport.callApi('POST', `/api/config/config_entries/flow/${flowId}`, {
      next_step_id: 'sensor',
    });

    return await this.transport.callApi('POST', `/api/config/config_entries/flow/${flowId}`, userInput);
  }

  async remove(entry_id: string): Promise<any> {
    return await this.transport.getResponse({
      type: 'config_entries/remove',
      entry_id,
    });
  }
}
