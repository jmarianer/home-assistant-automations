import slug from 'slug';
import { HAClient } from './HAClient.js';

export async function getExistingHelperNames(ha: HAClient): Promise<string[]> {
  const entities = await ha.getEntities();
  return entities.result
    .map((entity: any) => entity.entity_id)
    .filter((entity_id: string) => entity_id.startsWith('input_'));
}

export async function getExistingTemplates(ha: HAClient): Promise<Record<string, any>> {
  const response = await ha.getResponse({
    type: 'config_entries/get',
    domain: 'template',
  });

  const templates: Record<string, any> = {};
  for (const entry of response.result) {
    const entryId = entry.entry_id;

    const response = await ha.callApi('POST', `/api/config/config_entries/options/flow`, {
      handler: entryId,
    });

    await ha.callApi('DELETE', `/api/config/config_entries/options/flow/${response.flow_id}`);
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

export async function getExistingHelpers(ha: HAClient): Promise<Record<string, object>> {
  const helpers: Record<string, object> = {};

  for (const helperType of [
    'input_boolean', 'input_button', 'input_datetime',
    'input_number', 'input_select', 'input_text',
  ]) {
    const helpersList = await ha.getResponse({ type: `${helperType}/list` });

    for (const helper of helpersList.result) {
      helper.id = `${helperType}.${helper.id}`;
      helpers[helper.id] = helper;
    }
  }

  return helpers;
}
