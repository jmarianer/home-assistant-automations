import { HAClient } from './HAClient.js';

export async function getExistingHelperNames(ha: HAClient): Promise<string[]> {
  const entities = await ha.getEntities();
  return entities.result
    .map((entity: any) => entity.entity_id)
    .filter((entity_id: string) => entity_id.startsWith('input_'));
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
