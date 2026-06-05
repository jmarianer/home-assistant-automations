import { Command } from 'commander';
import { HAClient } from './HAClient.js';
import { runDeploy, runDiff } from './commands.js';

let ha: HAClient | undefined;
async function connect(): Promise<HAClient> {
  const options = program.opts();

  if (!options.token) {
    console.error('Error: Token is required. Provide via --token flag or HA_TOKEN environment variable');
    process.exit(1);
  }

  ha = new HAClient(options.baseUrl, options.token, options.verbose);
  await ha.connect();
  console.log('Connected to Home Assistant');

  return ha;
};

const program = new Command();
program
  .name('ha-automations')
  .description('Home Assistant automations management')
  .version('1.0.0')
  .option('--base-url <url>', 'Home Assistant base URL', process.env.HA_BASE_URL || 'http://homeassistant.local:8123')
  .option('--token <token>', 'Home Assistant long-lived access token', process.env.HA_TOKEN)
  .option('--verbose', 'Log HTTP and WebSocket requests and responses', false);

program
  .command('deploy')
  .description('Generate automations from jsonnet')
  .action(async () => runDeploy(await connect()));

program
  .command('diff')
  .description('Show diff between existing and generated automations')
  .action(async () => runDiff(await connect()));

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