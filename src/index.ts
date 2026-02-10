import { WebSocketClient } from './WebSocketClient.js';
import { Jsonnet } from '@hanazuki/node-jsonnet';
import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { Writable } from 'stream';
import { Command } from 'commander';

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

class HAClient {
  private ws: WebSocketClient;
  private counter: number = 1;
  
  constructor() {
    this.ws = new WebSocketClient('ws://homeassistant.local:8123/api/websocket');
  }

  async connect(token: string) {
    await this.ws.open();
    await this.ws.recv();
    // TODO if message.type !== auth_required throw error
    this.ws.send({ type: 'auth', access_token: token });
    await this.ws.recv();
    // TODO if message.type !== auth_ok throw error
  }

  async disconnect() {
    this.ws.close();
  }

  async getResponse(request: object): Promise<any> {
    this.ws.send({ id: this.counter++, ...request });
    return await this.ws.recv();
  }

  async getDevices(): Promise<any> {
    return await this.getResponse({ type: 'config/device_registry/list' });
  }

  async getEntities(): Promise<any> {
    return await this.getResponse({ type: 'config/entity_registry/list' });
  }
}

const TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZjY1N2YyOTkzMmI0MDljYWU5ZGZhZDI4MWFkNzUxNSIsImlhdCI6MTc3MDUzNDA3NiwiZXhwIjoyMDg1ODk0MDc2fQ.hKpN8XveDKdcMdHG0LeSLHXDM_BnzrMRWHR6qQ7D6H0";
const ha = new HAClient();

async function generateAutomations(): Promise<string> {
  const devices = await ha.getDevices();
  const entities = await ha.getEntities();

  const jsonnet = new Jsonnet();
  const newAutomations = await jsonnet
    .extCode('devices', JSON.stringify(devices))
    .extCode('entities', JSON.stringify(entities))
    .evaluateFile('automations.jsonnet');

  return newAutomations;
}

async function runDeploy(): Promise<void> {
  const newAutomations = await generateAutomations();
  await fs.writeFile('/Volumes/config/automations.yaml', newAutomations);
  await ha.getResponse({
    type: 'call_service',
    domain: 'automation',
    service: 'reload'
  });
}

async function runDiff(): Promise<void> {
  const newAutomations = await generateAutomations();
  const existingAutomationsYaml = await fs.readFile('/Volumes/config/automations.yaml', 'utf-8');
  const existingAutomations = yaml.parse(existingAutomationsYaml);

  console.log('Diff between existing and generated automations:');
  console.log(await jdDiff(JSON.stringify(existingAutomations), newAutomations));
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
  await ha.connect(TOKEN);
  console.log('Connected to Home Assistant');
  await program.parseAsync();
  await ha.disconnect();
} catch (error) {
  console.error('Error:', error);
}