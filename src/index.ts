import { WebSocketClient } from './WebSocketClient.js';
import { Jsonnet } from '@hanazuki/node-jsonnet';
import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { Writable } from 'stream';

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
await ha.connect(TOKEN);
const devices = await ha.getDevices();
const entities = await ha.getEntities();
// console.log(entities.result.filter((x: any) => x.platform === 'automation'));//.map((x: any) => x.entity_id));

const jsonnet = new Jsonnet();
const newAutomations = await jsonnet
  .extCode('devices', JSON.stringify(devices))
  .extCode('entities', JSON.stringify(entities))
  .evaluateFile('automations.jsonnet');

const automationsYaml = await fs.readFile('/Volumes/config/automations.yaml', 'utf-8');
const existingAutomations = yaml.parse(automationsYaml);

console.log(await jdDiff(JSON.stringify(existingAutomations), newAutomations));

await ha.disconnect();