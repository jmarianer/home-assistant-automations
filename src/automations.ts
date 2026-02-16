import { HAClient } from './HAClient.js';

export async function getExistingAutomationNames(ha: HAClient): Promise<string[]> {
  const entities = await ha.getEntities();
  return entities.result
    .map((entity: any) => entity.entity_id)
    .filter((entity_id: string) => entity_id.startsWith('automation.'));
}

export async function getExistingAutomations(ha: HAClient): Promise<Record<string, object>> {
  const automationNames = await getExistingAutomationNames(ha);

  const automations: Record<string, object> = {};
  for (const entity_id of automationNames) {
    const details = await ha.getAutomationConfig(entity_id);
    automations[entity_id] = details.result.config;
  }

  return automations;
}
