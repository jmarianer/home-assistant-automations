import { getExistingAutomations, getExistingAutomationNames } from './automations.js';
import { HAClient } from './HAClient.js';
import { getExistingHelpers, getExistingTemplates } from './helpers.js';
import { jdDiff } from './jdDiff.js';
import { JsonnetEvaluator } from './JsonnetEvaluator.js';

export async function runDiff(ha: HAClient): Promise<void> {
  const evaluator = new JsonnetEvaluator(ha, 'automations.jsonnet');

  const existingAutomations = await getExistingAutomations(ha);
  const newAutomations = await evaluator.getAutomations();
  console.log('Diff between existing and generated automations:');
  console.log(await jdDiff(JSON.stringify(existingAutomations), JSON.stringify(newAutomations)));

  const existingHelpers = await getExistingHelpers(ha);
  const newHelpers = await evaluator.getHelpers();
  console.log('Diff between existing and generated helpers:');
  console.log(await jdDiff(JSON.stringify(existingHelpers), JSON.stringify(newHelpers)));

  const existingTemplates = await getExistingTemplates(ha);
  const newTemplates = await evaluator.getTemplates();
  console.log('Diff between existing and generated templates:');
  console.log(await jdDiff(JSON.stringify(existingTemplates), JSON.stringify(newTemplates)));
}

export async function runDeploy(ha: HAClient): Promise<void> {
  const evaluator = new JsonnetEvaluator(ha, 'automations.jsonnet');

  const existingAutomations = await getExistingAutomationNames(ha);
  for (const id of existingAutomations) {
    console.log(`Removing existing automation ${id}...`);
    console.log(await ha.removeEntity(id));
  }

  const newAutomations = await evaluator.getAutomations();
  for (const [id, automation] of Object.entries(newAutomations)) {
    console.log(`Deploying automation ${id}...`);
    console.log(await ha.createOrUpdateAutomation(id, automation));
  }

  const existingHelpers = await getExistingHelpers(ha);
  for (const id of Object.keys(existingHelpers)) {
    console.log(`Removing existing helper ${id}...`);
    console.log(await ha.removeHelper(id));
  }

  const newHelpers = await evaluator.getHelpers();
  for (const [id, helper] of Object.entries(newHelpers)) {
    console.log(`Deploying helper ${id}...`);
    console.log(await ha.createHelper(id, helper));
  }

  const existingTemplates = await getExistingTemplates(ha);
  for (const id of Object.keys(existingTemplates)) {
    console.log(`Removing existing template ${id}...`);
    console.log(await ha.removeTemplate(id));
  }

  const newTemplates = await evaluator.getTemplates();
  for (const [id, template] of Object.entries(newTemplates)) {
    console.log(`Deploying template ${id}...`);
    console.log(await ha.createTemplate(template));
  }
}
