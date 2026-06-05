import { Transport } from './Transport.js';
import { Automations } from './Automations.js';
import { Helpers } from './Helpers.js';
import { Templates } from './Templates.js';

/**
 * Facade over a {@link Transport}, exposing each Home Assistant resource as
 * its own namespace: `ha.automations.list()`, `ha.helpers.create(...)`, etc.
 */
export class HAClient {
  readonly transport: Transport;
  readonly automations: Automations;
  readonly helpers: Helpers;
  readonly templates: Templates;

  constructor(baseUrl: string, token: string, verbose: boolean = false) {
    this.transport = new Transport(baseUrl, token, verbose);
    this.automations = new Automations(this.transport);
    this.helpers = new Helpers(this.transport);
    this.templates = new Templates(this.transport);
  }

  connect() {
    return this.transport.connect();
  }

  disconnect() {
    return this.transport.disconnect();
  }
}
