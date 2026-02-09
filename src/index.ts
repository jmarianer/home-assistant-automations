import { WebSocketClient } from './WebSocketClient.js';

async function getDevices(token: string): Promise<{ devices: any; entities: any }> {
  const ws = new WebSocketClient('ws://homeassistant.local:8123/api/websocket');
  
  await ws.open();
  await ws.recv();
  // TODO if message.type !== auth_required throw error
  ws.send({ type: 'auth', access_token: token });
  await ws.recv();
  // TODO if message.type !== auth_ok throw error

  ws.send({ id: 1, type: 'config/device_registry/list' });
  const devices = await ws.recv();

  ws.send({ id: 1, type: 'config/entity_registry/list' });
  const entities = await ws.recv();

  ws.close();

  return { devices, entities };
}

const TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZjY1N2YyOTkzMmI0MDljYWU5ZGZhZDI4MWFkNzUxNSIsImlhdCI6MTc3MDUzNDA3NiwiZXhwIjoyMDg1ODk0MDc2fQ.hKpN8XveDKdcMdHG0LeSLHXDM_BnzrMRWHR6qQ7D6H0";

try {
  await getDevices(TOKEN);
} catch (err) {
  console.error('Error:', err);
}