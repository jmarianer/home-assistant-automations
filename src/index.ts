import { Jsonnet } from '@hanazuki/node-jsonnet';
import { spawn } from 'child_process';
import { Writable } from 'stream';
import { Command } from 'commander';
import slug from 'slug';
import { HAClient } from './HAClient.js';

function jdDiff(a: string, b: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('jd', ['/dev/fd/3', '/dev/fd/4'], {
      stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe']
      //       stdin  stdout stderr  fd3     fd4
    });

    const fd3 = proc.stdio[3] as Writable;
    const fd4 = proc.stdio[4] as Writable;
 
    fd3.end(a);
    fd4.end(b);

    let stdout = '';
    proc.stdout.on('data', (chunk) => stdout += chunk);
    proc.on('close', (code) => {
      // jd exits 0 for no diff, 1 for diff, 2 for error
      if (code === 2) reject(new Error(`jd failed`));
      else resolve(stdout);
    });
  });
}

const TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZjY1N2YyOTkzMmI0MDljYWU5ZGZhZDI4MWFkNzUxNSIsImlhdCI6MTc3MDUzNDA3NiwiZXhwIjoyMDg1ODk0MDc2fQ.hKpN8XveDKdcMdHG0LeSLHXDM_BnzrMRWHR6qQ7D6H0";
const ha = new HAClient(TOKEN);

async function generateAutomations(): Promise<Record<string, any>> {
  const devices = await ha.getDevices();
  const entities = await ha.getEntities();

  const jsonnet = new Jsonnet();
  const newAutomationsString = await jsonnet
    .extCode('devices', JSON.stringify(devices))
    .extCode('entities', JSON.stringify(entities))
    .nativeCallback('slug', (str) => slug(String(str), '_'), 'string')
    .evaluateFile('automations.jsonnet');

  const newAutomations = JSON.parse(newAutomationsString);
  const newAutomationsById: Record<string, any> = {};
  for (const automation of newAutomations) {
    const id = automation.id;
    if (!id) {
      throw new Error(`Automation missing id: ${JSON.stringify(automation)}`);
    }
    newAutomationsById[id] = automation;
  }

  return newAutomationsById;
}

async function getExistingAutomationNames(): Promise<string[]> {
  const entities = await ha.getEntities();
  return entities.result
    .map((entity: any) => entity.entity_id)
    .filter((entity_id: string) => entity_id.startsWith('automation.'));
}

async function getExistingAutomations(): Promise<Record<string, object>> {
  const automationNames = await getExistingAutomationNames();

  const automations: Record<string, object> = {};
  for (const entity_id of automationNames) {
    const details = await ha.getResponse({ type: 'automation/config', entity_id: `${entity_id}` });
    automations[entity_id] = details.result.config;
  }

  return automations;
}


async function runDiff(): Promise<void> {
  const existingAutomations = await getExistingAutomations();
  const newAutomations = await generateAutomations();
  console.log('Diff between existing and generated automations:');
  console.log(await jdDiff(JSON.stringify(existingAutomations), JSON.stringify(newAutomations)));
}

async function runDeploy(): Promise<void> {
  const existingAutomations = await getExistingAutomationNames();
  for (const id of existingAutomations) {
    console.log(`Removing existing automation ${id}...`);
    console.log(await ha.getResponse({ type: 'config/entity_registry/remove', entity_id: `${id}` }));
  }

  const newAutomations = await generateAutomations();
  for (const [id, automation] of Object.entries(newAutomations)) {
    console.log(`Deploying automation ${id}...`);
    console.log(await ha.callApi("POST", `/api/config/automation/config/${id}`, automation));
  }
}

const program = new Command();
program
  .name('ha-automations')
  .description('Home Assistant automations management')
  .version('1.0.0');

program
  .command('deploy')
  .description('Generate automations from jsonnet')
  .action(runDeploy);

program
  .command('diff')
  .description('Show diff between existing and generated automations')
  .action(runDiff);

try {
  await ha.connect();
  console.log('Connected to Home Assistant');
  await program.parseAsync();
} catch (error) {
  console.error('Error:', error);
} finally {
  await ha.disconnect();
  console.log('Disconnected from Home Assistant');
}