import { ServiceClient, ServiceError } from './client.js';

/** Typed wrapper over the render API. */
export class RenderClient extends ServiceClient {
  /** @param {string} s */
  static seg(s) {
    return encodeURIComponent(s);
  }

  templates() {
    return this.json('GET', '/v1/templates');
  }

  /** @param {object} body */
  createTemplate(body) {
    return this.json('POST', '/v1/templates', { body });
  }

  /** @param {string} name */
  template(name) {
    return this.json('GET', `/v1/templates/${RenderClient.seg(name)}`);
  }

  /** @param {string} name @param {{ description: string }} body */
  describe(name, body) {
    return this.json('PATCH', `/v1/templates/${RenderClient.seg(name)}`, { body });
  }

  /** @param {string} name */
  deleteTemplate(name) {
    return this.json('DELETE', `/v1/templates/${RenderClient.seg(name)}`);
  }

  /** @param {string} name @param {{ layout: object, note?: string }} body */
  publish(name, body) {
    return this.json('POST', `/v1/templates/${RenderClient.seg(name)}/versions`, { body });
  }

  /** @param {string} name @param {number} version */
  version(name, version) {
    return this.json('GET', `/v1/templates/${RenderClient.seg(name)}/versions/${version}`);
  }

  /**
   * Render an unsaved layout; the PDF response is returned for relaying, errors become
   * ServiceErrors carrying the service's code and details (validation paths, block paths).
   * @param {{ layout: object, data?: object }} body
   * @returns {Promise<Response>}
   */
  async preview(body) {
    const res = await this.request('POST', '/v1/render/preview', { body, timeoutMs: 60_000, headers: { accept: 'application/pdf, application/json' } });
    if (!res.ok) {
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = null; }
      throw new ServiceError(data?.error?.message ?? `${this.def.id} responded ${res.status}`, { statusCode: res.status, code: data?.error?.code, details: data?.error?.details, service: this.def.id });
    }
    return res;
  }

  fonts() {
    return this.json('GET', '/v1/fonts');
  }

  /** @param {{ status?: string, limit?: number, cursor?: string }} q */
  renders(q) {
    return this.json('GET', `/v1/renders?${RenderClient.params(q, ['status', 'limit', 'cursor'])}`);
  }

  /** @param {{ template: string, version?: number, data?: object, filename?: string, store?: boolean }} body */
  createRender(body) {
    return this.json('POST', '/v1/renders', { body });
  }

  /** @param {string} id */
  render(id) {
    return this.json('GET', `/v1/renders/${RenderClient.seg(id)}`);
  }

  /** @param {string} id */
  cancelRender(id) {
    return this.json('POST', `/v1/renders/${RenderClient.seg(id)}/cancel`);
  }

  /** The finished PDF of a job, for relaying. @param {string} id @returns {Promise<Response>} */
  async renderPdf(id) {
    const res = await this.request('GET', `/v1/renders/${RenderClient.seg(id)}/pdf`, { headers: { accept: 'application/pdf, application/json' } });
    if (!res.ok) {
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = null; }
      throw new ServiceError(data?.error?.message ?? `${this.def.id} responded ${res.status}`, { statusCode: res.status, code: data?.error?.code, details: data?.error?.details, service: this.def.id });
    }
    return res;
  }

  /** @param {Record<string, string|number|undefined>} q @param {readonly string[]} keys */
  static params(q, keys) {
    const p = new URLSearchParams();
    for (const k of keys) if (q[k] !== undefined && q[k] !== '') p.set(k, String(q[k]));
    return p;
  }

  stats() {
    return this.json('GET', '/v1/stats');
  }

  /** Overview card facts, from `/v1/stats`. */
  async summary() {
    const s = /** @type {any} */ (await this.stats());
    return { templates: s.templates, renders24h: s.last24h.renders, failed24h: s.last24h.failed, avgMs: s.last24h.avgMs, pages24h: s.last24h.pages };
  }
}
