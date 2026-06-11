import { Transport } from './Transport.js';

// TODO: Create dashboard-everything in automations.jsonnet and remove this hardcoded exception.
const PROTECTED_DASHBOARDS = new Set(['dashboard-everything']);

/** Registration metadata for a storage-mode dashboard. */
export interface DashboardRegistration {
  url_path: string;
  title: string;
  icon?: string | null;
  show_in_sidebar?: boolean;
  require_admin?: boolean;
}

export class Dashboards {
  constructor(private transport: Transport) {}

  /** All registered dashboards (registration metadata, not their content). */
  async list(): Promise<Record<string, any>> {
    const response = await this.transport.getResponse({ type: 'lovelace/dashboards/list' });
    const dashboards: Record<string, any> = {};
    for (const d of response.result) {
      dashboards[d.url_path] = {...d, ...await this.getConfig(d.url_path)};
    }
    for (const p of PROTECTED_DASHBOARDS) {
      delete dashboards[p];
    }
    return dashboards;
  }

  /**
   * The stored content (views/cards) of a dashboard, or null if it has none
   * yet (e.g. an auto-generated or freshly-created dashboard).
   */
  async getConfig(url_path: string | null): Promise<any | null> {
    const response = await this.transport.getResponse({ type: 'lovelace/config', url_path });
    return response.success ? response.result : null;
  }

  async create(registration: DashboardRegistration): Promise<any> {
    return await this.transport.getResponse({
      type: 'lovelace/dashboards/create',
      mode: 'storage',
      show_in_sidebar: true,
      require_admin: false,
      ...registration,
    });
  }

  async update(dashboard_id: string, registration: Partial<DashboardRegistration>): Promise<any> {
    return await this.transport.getResponse({
      type: 'lovelace/dashboards/update',
      dashboard_id,
      ...registration,
    });
  }

  async remove(dashboard_id: string): Promise<any> {
    return await this.transport.getResponse({
      type: 'lovelace/dashboards/delete',
      dashboard_id,
    });
  }

  async saveConfig(url_path: string, config: object): Promise<any> {
    return await this.transport.getResponse({
      type: 'lovelace/config/save',
      url_path,
      config,
    });
  }
}
