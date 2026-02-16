import { getExistingAutomations, getExistingAutomationNames } from './automations.js';
import { HAClient } from './HAClient.js';
import { jdDiff } from './jdDiff.js';
import { JsonnetEvaluator } from './JsonnetEvaluator.js';

export async function runDiff(ha: HAClient): Promise<void> {
  const existingAutomations = await getExistingAutomations(ha);
  const evaluator = new JsonnetEvaluator(ha, 'automations.jsonnet');
  const newAutomations = await evaluator.getAutomations();
  console.log('Diff between existing and generated automations:');
  console.log(await jdDiff(JSON.stringify(existingAutomations), JSON.stringify(newAutomations)));
}

export async function runDeploy(ha: HAClient): Promise<void> {
  const existingAutomations = await getExistingAutomationNames(ha);
  for (const id of existingAutomations) {
    console.log(`Removing existing automation ${id}...`);
    console.log(await ha.removeEntity(id));
  }

  const evaluator = new JsonnetEvaluator(ha, 'automations.jsonnet');
  const newAutomations = await evaluator.getAutomations();
  for (const [id, automation] of Object.entries(newAutomations)) {
    console.log(`Deploying automation ${id}...`);
    console.log(await ha.createOrUpdateAutomation(id, automation));
  }
}
