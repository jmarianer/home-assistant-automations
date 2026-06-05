import { Transport } from './Transport.js';

export class Helpers {
  constructor(private transport: Transport) {}

  async listNames(): Promise<string[]> {
    const entities = await this.transport.getEntities();
    return entities.result
      .map((entity: any) => entity.entity_id)
      .filter((entity_id: string) => entity_id.startsWith('input_'));
  }

  async list(): Promise<Record<string, object>> {
    const helpers: Record<string, object> = {};

    for (const helperType of [
      'input_boolean', 'input_button', 'input_datetime',
      'input_number', 'input_select', 'input_text',
    ]) {
      const helpersList = await this.transport.getResponse({ type: `${helperType}/list` });

      for (const helper of helpersList.result) {
        helper.id = `${helperType}.${helper.id}`;
        helpers[helper.id] = helper;
      }
    }

    return helpers;
  }

  async create(id: string, config: any): Promise<any> {
    const type = config.id.split('.')[0];
    const { id: _, ...configWithoutId } = config;
    return await this.transport.getResponse({
      type: `${type}/create`,
      ...configWithoutId,
    });
  }

  async remove(id: string): Promise<any> {
    const type = id.split('.')[0];
    const name = id.split('.')[1];
    return await this.transport.getResponse({
      type: `${type}/delete`,
      [`${type}_id`]: name,
    });
  }
}
