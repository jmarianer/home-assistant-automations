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

// HAClient will be initialized after parsing command-line arguments
let ha: HAClient | undefined;

async function generateAutomations(ha: HAClient): Promise<Record<string, any>> {
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

async function getExistingAutomationNames(ha: HAClient): Promise<string[]> {
  const entities = await ha.getEntities();
  return entities.result
    .map((entity: any) => entity.entity_id)
    .filter((entity_id: string) => entity_id.startsWith('automation.'));
}

async function getExistingAutomations(ha: HAClient): Promise<Record<string, object>> {
  const automationNames = await getExistingAutomationNames(ha);

  const automations: Record<string, object> = {};
  for (const entity_id of automationNames) {
    const details = await ha.getAutomationConfig(entity_id);
    automations[entity_id] = details.result.config;
  }

  return automations;
}

async function runDiff(ha: HAClient): Promise<void> {
  const existingAutomations = await getExistingAutomations(ha);
  const newAutomations = await generateAutomations(ha);
  console.log('Diff between existing and generated automations:');
  console.log(await jdDiff(JSON.stringify(existingAutomations), JSON.stringify(newAutomations)));
}

async function runDeploy(ha: HAClient): Promise<void> {
  const existingAutomations = await getExistingAutomationNames(ha);
  for (const id of existingAutomations) {
    console.log(`Removing existing automation ${id}...`);
    console.log(await ha.removeEntity(id));
  }

  const newAutomations = await generateAutomations(ha);
  for (const [id, automation] of Object.entries(newAutomations)) {
    console.log(`Deploying automation ${id}...`);
    console.log(await ha.createOrUpdateAutomation(id, automation));
  }
}

const program = new Command();
program
  .name('ha-automations')
  .description('Home Assistant automations management')
  .version('1.0.0')
  .option('--base-url <url>', 'Home Assistant base URL', process.env.HA_BASE_URL || 'http://homeassistant.local:8123')
  .option('--token <token>', 'Home Assistant long-lived access token', process.env.HA_TOKEN);

program
  .command('deploy')
  .description('Generate automations from jsonnet')
  .action(() => runDeploy(ha!));

program
  .command('diff')
  .description('Show diff between existing and generated automations')
  .action(() => runDiff(ha!));

// Initialize HAClient before any command action runs
program.hook('preAction', async () => {
  const options = program.opts();

  if (!options.token) {
    console.error('Error: Token is required. Provide via --token flag or HA_TOKEN environment variable');
    process.exit(1);
  }

  ha = new HAClient(options.baseUrl, options.token);
  await ha.connect();
  console.log('Connected to Home Assistant');
});

try {
  await program.parseAsync();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  if (ha) {
    await ha.disconnect();
    console.log('Disconnected from Home Assistant');
  }
}