import { HAClient } from './HAClient.js';
import { jdDiff } from './jdDiff.js';
import { JsonnetEvaluator } from './JsonnetEvaluator.js';

export async function runDiff(ha: HAClient): Promise<void> {
  const evaluator = new JsonnetEvaluator(ha.transport, 'automations.jsonnet');

  const existingAutomations = await ha.automations.list();
  const newAutomations = await evaluator.getAutomations();
  console.log('Diff between existing and generated automations:');
  console.log(await jdDiff(JSON.stringify(existingAutomations), JSON.stringify(newAutomations)));

  const existingHelpers = await ha.helpers.list();
  const newHelpers = await evaluator.getHelpers();
  console.log('Diff between existing and generated helpers:');
  console.log(await jdDiff(JSON.stringify(existingHelpers), JSON.stringify(newHelpers)));

  const existingTemplates = await ha.templates.list();
  const newTemplates = await evaluator.getTemplates();
  console.log('Diff between existing and generated templates:');
  console.log(await jdDiff(JSON.stringify(existingTemplates), JSON.stringify(newTemplates)));

  const newDashboards = await evaluator.getDashboards();
  const existingDashboards = await ha.dashboards.list();
  console.log('Diff between existing and generated dashboards:');
  console.log(await jdDiff(JSON.stringify(existingDashboards), JSON.stringify(newDashboards)));
}

export async function runDeploy(ha: HAClient): Promise<void> {
  const evaluator = new JsonnetEvaluator(ha.transport, 'automations.jsonnet');

  const existingAutomations = await ha.automations.listNames();
  for (const id of existingAutomations) {
    console.log(`Removing existing automation ${id}...`);
    await ha.automations.remove(id);
  }

  const newAutomations = await evaluator.getAutomations();
  for (const [id, automation] of Object.entries(newAutomations)) {
    console.log(`Deploying automation ${id}...`);
    await ha.automations.create(id, automation);
  }

  const existingHelpers = await ha.helpers.list();
  for (const id of Object.keys(existingHelpers)) {
    console.log(`Removing existing helper ${id}...`);
    await ha.helpers.remove(id);
  }

  const newHelpers = await evaluator.getHelpers();
  for (const [id, helper] of Object.entries(newHelpers)) {
    console.log(`Deploying helper ${id}...`);
    await ha.helpers.create(id, helper);
  }

  const existingTemplates = await ha.templates.list();
  for (const id of Object.keys(existingTemplates)) {
    console.log(`Removing existing template ${id}...`);
    await ha.templates.remove(id);
  }

  const newTemplates = await evaluator.getTemplates();
  for (const [id, template] of Object.entries(newTemplates)) {
    console.log(`Deploying template ${id}...`);
    await ha.templates.create(template);
  }

  const existingDashboards = await ha.dashboards.list();
  for (const dashboard of Object.values(existingDashboards)) {
    console.log(`Removing existing dashboard ${dashboard.url_path}...`);
    await ha.dashboards.remove(dashboard.id);
  }

  const newDashboards = await evaluator.getDashboards();
  for (const dashboard of Object.values(newDashboards)) {
    console.log(`Deploying dashboard ${dashboard.url_path}...`);
    await ha.dashboards.create({ url_path: dashboard.url_path, title: dashboard.title, icon: dashboard.icon });
    await ha.dashboards.saveConfig(dashboard.url_path, { views: dashboard.views });
  }
}
