import { Jsonnet } from '@hanazuki/node-jsonnet';
import slug from 'slug';
import { Transport } from './Transport.js';

export class JsonnetEvaluator {
  private _parsedPromise: Promise<void>;
  private _automationsById: Record<string, any> = {};
  private _helpersById: Record<string, any> = {};
  private _templatesById: Record<string, any> = {};
  private _dashboardsById: Record<string, any> = {};

  constructor(private transport: Transport, private filename: string) {
    this._parsedPromise = this.doParse();
  }

  private async doParse(): Promise<void> {
    const devices = await this.transport.getDevices();
    const entities = await this.transport.getEntities();

    const jsonnet = new Jsonnet();
    const parsedJsonnet = await jsonnet
      .extCode('devices', JSON.stringify(devices))
      .extCode('entities', JSON.stringify(entities))
      .nativeCallback('slug', (str) => slug(String(str), '_'), 'string')
      .evaluateFile(this.filename);
    const allEntities = JSON.parse(parsedJsonnet);

    // TODO: dispatch on an explicit `type` field instead of id prefixes, for
    // every resource — the synthetic 'dashboard.' id below is the first thing
    // that doesn't naturally have an entity id.
    for (const element of allEntities) {
      const id = element.id;
      if (!id) {
        throw new Error(`Element missing id: ${JSON.stringify(element)}`);
      }
      if (id.startsWith('automation.')) {
        this._automationsById[id] = element;
      }
      if (id.startsWith('input_')) {
        this._helpersById[id] = element;
      }
      if (id.startsWith('sensor.')) {
        this._templatesById[id] = element;
      }
      if (id.startsWith('dashboard.')) {
        this._dashboardsById[element.url_path] = element;
      }
    }
  }

  public async getAutomations(): Promise<Record<string, any>> {
    await this._parsedPromise;
    return this._automationsById;
  }

  public async getHelpers(): Promise<Record<string, any>> {
    await this._parsedPromise;
    return this._helpersById;
  }

  public async getTemplates(): Promise<Record<string, any>> {
    await this._parsedPromise;
    return this._templatesById;
  }

  public async getDashboards(): Promise<Record<string, any>> {
    await this._parsedPromise;
    return this._dashboardsById;
  }

  // Entity ids this run declares (helpers, templates, automations all become
  // entities). Used to validate dashboard card references against the union of
  // these and the live registry.
  public async getDeclaredEntityIds(): Promise<string[]> {
    await this._parsedPromise;
    return [
      ...Object.keys(this._automationsById),
      ...Object.keys(this._helpersById),
      ...Object.keys(this._templatesById),
    ];
  }
}