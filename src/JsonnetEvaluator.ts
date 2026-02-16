import { Jsonnet } from '@hanazuki/node-jsonnet';
import slug from 'slug';
import { HAClient } from './HAClient.js';

export class JsonnetEvaluator {
  private _parsedPromise: Promise<void>;
  private _automationsById: Record<string, any> = {};
  private _helpersById: Record<string, any> = {};

  constructor(private ha: HAClient, private filename: string) {
    this._parsedPromise = this.doParse();
  }

  private async doParse(): Promise<void> {
    const devices = await this.ha.getDevices();
    const entities = await this.ha.getEntities();

    const jsonnet = new Jsonnet();
    const parsedJsonnet = await jsonnet
      .extCode('devices', JSON.stringify(devices))
      .extCode('entities', JSON.stringify(entities))
      .nativeCallback('slug', (str) => slug(String(str), '_'), 'string')
      .evaluateFile(this.filename);
    const allEntities = JSON.parse(parsedJsonnet);

    for (const element of allEntities) {
      const id = element.id;
      if (!id) {
        throw new Error(`Element missing id: ${JSON.stringify(element)}`);
      }
      if (element.id.startsWith('automation.')) {
        this._automationsById[id] = element;
      }
      if (id.startsWith('input_')) {
        this._helpersById[id] = element;
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
}