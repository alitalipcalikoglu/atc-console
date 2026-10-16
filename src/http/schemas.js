import { Ids } from '@atc-web/atc-service-core/ids';

/** JSON Schemas for the console's own API. */
export class Schemas {
  static email = { type: 'string', format: 'email', maxLength: 254 };
  // Console admin username; AdminService trims and lower-cases it before applying the strict rule.
  static username = { type: 'string', minLength: 1, maxLength: 128, pattern: '^\\s*[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\s*$' };
  static password = { type: 'string', minLength: 1, maxLength: 1024 };
  static code = { type: 'string', pattern: '^[0-9]{6}$' };
  static adminId = { type: 'string', pattern: Ids.pattern('adm') };
  static id = { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9_.:-]+$' };
  static sid = { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$', maxLength: 40 };

  /** @param {string[]} required @param {Record<string, object>} properties */
  static body(required, properties) {
    return { type: 'object', additionalProperties: false, required, properties };
  }

  static login = Schemas.body(['username', 'password'], { username: { type: 'string', minLength: 1, maxLength: 128 }, password: Schemas.password });
  static totp = Schemas.body(['code'], { code: Schemas.code });
  static changePassword = Schemas.body(['currentPassword', 'newPassword'], { currentPassword: Schemas.password, newPassword: Schemas.password });
  static disableTotp = Schemas.body(['password', 'code'], { password: Schemas.password, code: Schemas.code });
  static serviceScope = { type: ['array', 'null'], maxItems: 40, items: Schemas.sid };
  static createAdmin = Schemas.body(['username', 'password', 'role'], { username: Schemas.username, password: Schemas.password, name: { type: 'string', maxLength: 80 }, role: { type: 'string', enum: ['admin', 'viewer'] }, services: Schemas.serviceScope });
  static patchAdmin = { type: 'object', additionalProperties: false, minProperties: 1, properties: { name: { type: 'string', minLength: 1, maxLength: 80 }, role: { type: 'string', enum: ['admin', 'viewer'] }, status: { type: 'string', enum: ['active', 'disabled'] }, services: Schemas.serviceScope } };
  static setPassword = Schemas.body(['password'], { password: Schemas.password });
  static serviceParams = { type: 'object', properties: { sid: Schemas.sid }, required: ['sid'] };
  static serviceIdParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.id }, required: ['sid', 'id'] };
  static serviceEmailParams = { type: 'object', properties: { sid: Schemas.sid, email: { type: 'string', format: 'email', maxLength: 254 } }, required: ['sid', 'email'] };
  static notifySuppressionQuery = { type: 'object', additionalProperties: false, properties: { limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', maxLength: 512 }, q: { type: 'string', maxLength: 254 } } };
  static notifySuppression = Schemas.body(['email'], { email: { type: 'string', format: 'email', maxLength: 254 }, reason: { type: 'string', enum: ['hard_bounce', 'complaint', 'soft_bounce', 'unsubscribe', 'manual'] }, note: { type: 'string', maxLength: 500 } });
  static serviceIdSubParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.id, sub: Schemas.id }, required: ['sid', 'id', 'sub'] };
  static mediaQuarantineParams = { type: 'object', properties: { sid: Schemas.sid, id: { type: 'string', pattern: Ids.pattern('qua') } }, required: ['sid', 'id'] };
  static mediaFilesQuery = { type: 'object', additionalProperties: false, properties: { limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', maxLength: 200 }, owner: { type: 'string', pattern: '^[A-Za-z0-9_.-]{1,64}$' } } };
  static mediaUploadQuery = { type: 'object', additionalProperties: false, properties: { visibility: { type: 'string', enum: ['public', 'private'] }, name: { type: 'string', maxLength: 255 } } };
  static auditQuery = {
    type: 'object', additionalProperties: false,
    properties: {
      source: { type: 'string', maxLength: 64 }, action: { type: 'string', maxLength: 120 }, actionPrefix: { type: 'string', maxLength: 120 },
      outcome: { type: 'string', enum: ['success', 'failure', 'denied'] }, actorType: { type: 'string', maxLength: 32 }, actorId: { type: 'string', maxLength: 128 },
      targetType: { type: 'string', maxLength: 32 }, targetId: { type: 'string', maxLength: 128 }, ip: { type: 'string', maxLength: 45 }, requestId: { type: 'string', maxLength: 128 },
      from: { type: 'string', maxLength: 40 }, to: { type: 'string', maxLength: 40 },
      limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', maxLength: 200 },
      format: { type: 'string', enum: ['ndjson', 'csv'] }, hours: { type: 'string', pattern: '^[0-9]{1,3}$' }, fromSeq: { type: 'string', pattern: '^[0-9]{1,16}$' }, toSeq: { type: 'string', pattern: '^[0-9]{1,16}$' },
    },
  };
  static shortlinkQuery = {
    type: 'object', additionalProperties: false,
    properties: {
      q: { type: 'string', maxLength: 200 }, tag: { type: 'string', maxLength: 40 }, status: { type: 'string', enum: ['active', 'disabled', 'expired', 'exhausted'] },
      createdBy: { type: 'string', maxLength: 64 }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', maxLength: 200 },
      days: { type: 'string', pattern: '^[0-9]{1,3}$' }, scale: { type: 'string', pattern: '^[0-9]{1,2}$' }, margin: { type: 'string', pattern: '^[0-8]$' },
    },
  };
  static shortlinkBody = {
    url: { type: 'string', minLength: 8, maxLength: 8192 }, slug: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$' }, permanent: { type: 'boolean' }, enabled: { type: 'boolean' },
    expiresAt: { type: 'string', maxLength: 40, nullable: true }, maxClicks: { type: 'integer', minimum: 1, maximum: 1000000000, nullable: true },
    tags: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 40 } }, note: { type: 'string', maxLength: 500, nullable: true },
  };
  static schedulerQuery = {
    type: 'object', additionalProperties: false,
    properties: {
      q: { type: 'string', maxLength: 120 }, tag: { type: 'string', maxLength: 40 }, enabled: { type: 'string', enum: ['true', 'false'] },
      status: { type: 'string', enum: ['pending', 'running', 'retrying', 'succeeded', 'failed', 'skipped', 'cancelled'] }, job: { type: 'string', maxLength: 80 },
      limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', maxLength: 80 },
      cron: { type: 'string', maxLength: 100 }, timezone: { type: 'string', maxLength: 64 }, count: { type: 'string', pattern: '^([1-9]|[1-4][0-9]|50)$' },
    },
  };
  static schedulerFields = {
    description: { type: 'string', maxLength: 500 }, tags: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 40 } }, enabled: { type: 'boolean' },
    schedule: { type: 'object', additionalProperties: false, properties: { cron: { type: 'string', minLength: 1, maxLength: 100 }, timezone: { type: 'string', minLength: 1, maxLength: 64 }, at: { type: 'string', minLength: 20, maxLength: 40 } } },
    target: { type: 'object', additionalProperties: false, required: ['url'], properties: { url: { type: 'string', minLength: 8, maxLength: 2048 }, method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }, headers: { type: 'object', maxProperties: 10, additionalProperties: { type: 'string', maxLength: 1024 }, propertyNames: { maxLength: 64 } }, body: {} } },
    targetKey: { type: ['string', 'null'], maxLength: 64 }, timeoutMs: { type: 'integer', minimum: 1000, maximum: 3600000 },
    retry: { type: 'object', additionalProperties: false, properties: { max: { type: 'integer', minimum: 0, maximum: 1000 }, backoffSec: { type: 'integer', minimum: 1, maximum: 86400 } } },
  };
  static schedulerCreate = Schemas.body(['name', 'schedule', 'target'], { name: { type: 'string', pattern: '^[a-z0-9]+([.\\-_][a-z0-9]+)*$', maxLength: 80 }, ...Schemas.schedulerFields });
  static schedulerPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: Schemas.schedulerFields };
  static webhookQuery = {
    type: 'object', additionalProperties: false,
    properties: {
      q: { type: 'string', maxLength: 120 }, status: { type: 'string', enum: ['active', 'paused', 'disabled', 'pending', 'running', 'retrying', 'succeeded', 'failed', 'cancelled'] },
      event: { type: 'string', maxLength: 120 }, type: { type: 'string', maxLength: 120 }, subscription: { type: 'string', pattern: Ids.pattern('sub') },
      limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', maxLength: 80 },
    },
  };
  static webhookFields = {
    name: { type: 'string', pattern: '^[a-z0-9]+([.\\-_][a-z0-9]+)*$', maxLength: 80 }, url: { type: 'string', minLength: 8, maxLength: 2048 },
    events: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', minLength: 1, maxLength: 120 } }, description: { type: 'string', maxLength: 500 },
    headers: { type: 'object', maxProperties: 10, additionalProperties: { type: 'string', maxLength: 1024 }, propertyNames: { maxLength: 64 } }, enabled: { type: 'boolean' },
  };
  static webhookCreate = Schemas.body(['name', 'url', 'events'], Schemas.webhookFields);
  static webhookPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: Schemas.webhookFields };
  static webhookReplay = Schemas.body(['from'], { from: { type: 'string', minLength: 20, maxLength: 40 }, to: { type: 'string', minLength: 20, maxLength: 40 } });
  static searchName = { type: 'string', pattern: '^[a-z0-9]+([.\\-_][a-z0-9]+)*$', maxLength: 80 };
  static searchIndexFields = { description: { type: 'string', maxLength: 500 }, weights: { type: 'object', additionalProperties: false, properties: { title: { type: 'number' }, body: { type: 'number' }, tags: { type: 'number' } } }, facets: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 64 } }, language: { type: 'string', enum: ['none', 'tr'] } };
  static searchIndexCreate = Schemas.body(['name'], { name: Schemas.searchName, ...Schemas.searchIndexFields });
  static searchIndexPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: Schemas.searchIndexFields };
  static searchQuery = { type: 'object', additionalProperties: false, properties: { limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', maxLength: 1200 } } };
  static searchBody = Schemas.body([], { q: { type: 'string', maxLength: 500 }, filters: { type: 'object', maxProperties: 20, additionalProperties: { type: 'array', maxItems: 50, items: { type: 'string', maxLength: 200 } } }, facets: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 64 } }, limit: { type: 'integer', minimum: 1, maximum: 100 }, cursor: { type: 'string', maxLength: 64 }, highlight: { type: 'boolean' }, sort: { type: 'string', enum: ['relevance', 'newest', 'oldest'] } });
  static searchUpsert = Schemas.body(['documents'], { documents: { type: 'array', minItems: 1, maxItems: 500, items: { type: 'object', required: ['id', 'title'], additionalProperties: false, properties: { id: { type: 'string', minLength: 1, maxLength: 200 }, title: { type: 'string' }, body: { type: 'string' }, tags: { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 100 } }, attrs: { type: 'object' }, url: { type: 'string', maxLength: 2048 } } } } });
  static rlName = { type: 'string', pattern: '^[a-z0-9]+([.\\-_][a-z0-9]+)*$', maxLength: 80 };
  static rlSubject = { type: 'string', minLength: 1, maxLength: 200, pattern: '^[^\\u0000-\\u001f\\u007f]+$' };
  static rlLimits = { type: 'array', minItems: 1, maxItems: 20, items: { type: 'object', additionalProperties: false, required: ['window', 'limit'], properties: { window: { type: 'integer', minimum: 1 }, limit: { type: 'integer', minimum: 0 } } } };
  static rlPolicyCreate = Schemas.body(['name', 'limits'], { name: Schemas.rlName, description: { type: 'string', maxLength: 500 }, limits: Schemas.rlLimits });
  static rlPolicyPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: { description: { type: 'string', maxLength: 500 }, limits: Schemas.rlLimits } };
  static rlOverride = Schemas.body(['limits'], { limits: Schemas.rlLimits, note: { type: 'string', maxLength: 500 }, expiresAt: { type: ['string', 'null'], maxLength: 40 } });
  static rlCheck = Schemas.body(['policy', 'subject'], { policy: Schemas.rlName, subject: Schemas.rlSubject, cost: { type: 'integer', minimum: 0, maximum: 1000000 }, peek: { type: 'boolean' } });
  static rlStatsQuery = { type: 'object', additionalProperties: false, properties: { hours: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|[1-6][0-9][0-9]|7[0-1][0-9]|720)$' } } };
  static rlTopQuery = { type: 'object', additionalProperties: false, properties: { window: { type: 'string', pattern: '^[1-9][0-9]{0,7}$' }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' } } };
  static geoLang = { type: 'string', minLength: 2, maxLength: 35, pattern: '^[A-Za-z0-9-]+$' };
  static geoIpQuery = { type: 'object', additionalProperties: false, required: ['ip'], properties: { ip: { type: 'string', minLength: 2, maxLength: 64 }, lang: Schemas.geoLang } };
  static geoIpBatch = Schemas.body(['ips'], { ips: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', minLength: 2, maxLength: 64 } }, lang: Schemas.geoLang });
  static geoCountriesQuery = { type: 'object', additionalProperties: false, properties: { q: { type: 'string', maxLength: 100 }, continent: { type: 'string', pattern: '^[A-Za-z]{2}$' }, eu: { type: 'string', enum: ['true', 'false'] }, currency: { type: 'string', pattern: '^[A-Za-z]{3}$' }, lang: Schemas.geoLang } };
  static geoTimezonesQuery = { type: 'object', additionalProperties: false, properties: { country: { type: 'string', minLength: 2, maxLength: 3 }, q: { type: 'string', maxLength: 100 }, lang: Schemas.geoLang } };
  static geoPhoneQuery = { type: 'object', additionalProperties: false, required: ['number'], properties: { number: { type: 'string', minLength: 1, maxLength: 40 }, country: { type: 'string', minLength: 2, maxLength: 3 } } };
  static geoPair = { type: 'string', pattern: '^\\s*-?\\d{1,3}(\\.\\d+)?\\s*,\\s*-?\\d{1,3}(\\.\\d+)?\\s*$' };
  static geoDistanceQuery = { type: 'object', additionalProperties: false, required: ['from', 'to'], properties: { from: Schemas.geoPair, to: Schemas.geoPair } };
  static geoCollectionCreate = Schemas.body(['name'], { name: Schemas.rlName, description: { type: 'string', maxLength: 500 } });
  static geoCollectionPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: { description: { type: 'string', maxLength: 500 } } };
  static geoPlaces = Schemas.body(['places'], { places: { type: 'array', minItems: 1, maxItems: 5000, items: { type: 'object', additionalProperties: false, required: ['id', 'name', 'lat', 'lng'], properties: { id: { type: 'string', minLength: 1, maxLength: 200 }, name: { type: 'string', maxLength: 200 }, lat: { type: 'number' }, lng: { type: 'number' }, attrs: { type: 'object', maxProperties: 50 } } } } });
  static geoNearbyQuery = { type: 'object', additionalProperties: false, required: ['lat', 'lng'], properties: { lat: { type: 'string', pattern: '^-?\\d{1,3}(\\.\\d+)?$' }, lng: { type: 'string', pattern: '^-?\\d{1,3}(\\.\\d+)?$' }, radius: { type: 'string', pattern: '^\\d{1,5}(\\.\\d+)?$' }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' } } };
  static contentNs = { type: 'string', pattern: '^[a-z][a-z0-9-]{0,63}$' };
  static contentLocale = { type: 'string', minLength: 2, maxLength: 35, pattern: '^[A-Za-z0-9-]+$' };
  static contentFallback = { anyOf: [Schemas.contentLocale, { type: 'null' }] };
  static contentNamespaceCreate = Schemas.body(['name', 'defaultLocale'], { name: Schemas.contentNs, defaultLocale: Schemas.contentLocale, description: { type: 'string', maxLength: 500 }, locales: { type: 'array', maxItems: 500, items: Schemas.body(['locale'], { locale: Schemas.contentLocale, fallback: Schemas.contentFallback }) } });
  static contentNamespacePatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: { description: { type: 'string', maxLength: 500 }, defaultLocale: Schemas.contentLocale } };
  static contentLocalePut = Schemas.body([], { fallback: Schemas.contentFallback });
  static contentKeyPut = Schemas.body([], { description: { type: 'string', maxLength: 500 }, values: { type: 'object', maxProperties: 500, additionalProperties: { anyOf: [{ type: 'string', maxLength: 100000 }, { type: 'null' }] } } });
  static contentImport = Schemas.body(['locale', 'strings'], { locale: Schemas.contentLocale, strings: { type: 'object' } });
  static contentReview = Schemas.body(['items', 'decision'], { decision: { type: 'string', enum: ['approve', 'reject'] }, note: { type: 'string', maxLength: 500 }, items: { type: 'array', minItems: 1, maxItems: 500, items: { type: 'object', additionalProperties: false, required: ['key', 'locale'], properties: { key: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{0,127}$' }, locale: Schemas.contentLocale, value: { type: 'string', maxLength: 1000000 } } } } });
  static contentPublish = Schemas.body([], { note: { type: 'string', maxLength: 500 } });
  static contentRollback = Schemas.body(['release'], { release: { type: 'integer', minimum: 1, maximum: 1000000000 }, note: { type: 'string', maxLength: 500 }, restoreDraft: { type: 'boolean' } });
  static contentKeysQuery = { type: 'object', additionalProperties: false, properties: { q: { type: 'string', minLength: 1, maxLength: 120 }, missing: Schemas.contentLocale, review: { type: 'string', enum: ['pending', 'approved', 'rejected'] }, reviewLocale: Schemas.contentLocale, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{0,127}$' } } };
  static contentExportQuery = { type: 'object', additionalProperties: false, properties: { source: { type: 'string', enum: ['draft', 'published'] }, format: { type: 'string', enum: ['flat', 'nested'] } } };
  static contentReleaseParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.contentNs, sub: { type: 'string', pattern: '^[1-9][0-9]{0,9}$' } }, required: ['sid', 'id', 'sub'] };
  static contentReleasesQuery = { type: 'object', additionalProperties: false, properties: { limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', pattern: '^[0-9]{1,10}$' } } };
  static exportId = { type: 'string', pattern: Ids.pattern('exp') };
  static exportParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.exportId }, required: ['sid', 'id'] };
  static exportCreate = Schemas.body(['source', 'format'], { source: { type: 'string', pattern: '^atc-[a-z][a-z0-9-]{0,30}$' }, format: { type: 'string', enum: ['csv', 'ndjson'] }, filters: { type: 'object', maxProperties: 20, additionalProperties: { type: 'string', maxLength: 254 } }, notifyEmail: Schemas.email });
  static exportListQuery = { type: 'object', additionalProperties: false, properties: { status: { type: 'string', enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'] }, source: { type: 'string', pattern: '^atc-[a-z][a-z0-9-]{0,30}$' }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', pattern: Ids.pattern('exp') } } };
  static renderName = { type: 'string', pattern: '^[a-z][a-z0-9-]{0,63}$' };
  static renderParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.renderName }, required: ['sid', 'id'] };
  static renderVersionParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.renderName, sub: { type: 'string', pattern: '^[1-9][0-9]{0,8}$' } }, required: ['sid', 'id', 'sub'] };
  // Layouts are validated by the render service itself (its schema names the failing block); the console only bounds the shape.
  static renderLayout = { type: 'object', required: ['blocks'], properties: { blocks: { type: 'array', minItems: 1, maxItems: 1000 } } };
  static renderCreate = Schemas.body(['name', 'layout'], { name: Schemas.renderName, description: { type: 'string', maxLength: 500 }, layout: Schemas.renderLayout, note: { type: 'string', maxLength: 500 } });
  static renderDescribe = Schemas.body(['description'], { description: { type: 'string', maxLength: 500 } });
  static renderPublish = Schemas.body(['layout'], { layout: Schemas.renderLayout, note: { type: 'string', maxLength: 500 } });
  static renderPreview = Schemas.body(['layout'], { layout: Schemas.renderLayout, data: { type: 'object' } });
  static queueName = { type: 'string', pattern: '^[a-z][a-z0-9._-]{0,63}$' };
  static queueMessageId = { type: 'string', pattern: Ids.pattern('msg') };
  static queueParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.queueName }, required: ['sid', 'id'] };
  static queueMessageParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.queueName, sub: Schemas.queueMessageId }, required: ['sid', 'id', 'sub'] };
  static queuePut = { type: 'object', additionalProperties: false, properties: { description: { type: 'string', maxLength: 500 }, visibilitySec: { type: 'integer', minimum: 1, maximum: 43200 }, maxAttempts: { type: 'integer', minimum: 1, maximum: 100 }, backoffBaseSec: { type: 'integer', minimum: 0, maximum: 86400 }, backoffMaxSec: { type: 'integer', minimum: 0, maximum: 604800 }, paused: { type: 'boolean' }, push: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['url'], properties: { url: { type: 'string', minLength: 8, maxLength: 2048 }, secret: { type: 'string', minLength: 32, maxLength: 256 }, concurrency: { type: 'integer', minimum: 1, maximum: 32 } } }] } } };
  static queueDeleteQuery = { type: 'object', additionalProperties: false, properties: { force: { type: 'string', enum: ['true', 'false'] } } };
  static queuePurge = Schemas.body(['state'], { state: { type: 'string', enum: ['ready', 'dead', 'all'] } });
  static queueRedrive = { type: 'object', additionalProperties: false, properties: { ids: { type: 'array', minItems: 1, maxItems: 1000, items: Schemas.queueMessageId }, all: { const: true } } };
  static queueEnqueue = Schemas.body(['body'], { body: {}, delaySec: { type: 'integer', minimum: 0, maximum: 1209600 }, priority: { type: 'integer', minimum: -100, maximum: 100 }, dedupeKey: { type: 'string', minLength: 1, maxLength: 200 } });
  static queueMessagesQuery = { type: 'object', additionalProperties: false, properties: { state: { type: 'string', enum: ['ready', 'delayed', 'leased', 'dead'] }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', pattern: '^[0-9]{1,15}$' } } };
  static backupSource = { type: 'string', pattern: '^[a-z][a-z0-9-]{0,63}$' };
  static backupId = { type: 'string', pattern: Ids.pattern('bk') };
  static backupSourceParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.backupSource }, required: ['sid', 'id'] };
  static backupParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.backupId }, required: ['sid', 'id'] };
  static backupListQuery = { type: 'object', additionalProperties: false, properties: { source: Schemas.backupSource, status: { type: 'string', enum: ['running', 'ok', 'failed'] }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', pattern: '^[0-9]{1,15}~bk_[0-9a-z]{6,12}[0-9a-f]{16}$' } } };
  static backupRestore = { type: 'object', additionalProperties: false, properties: { target: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$' }, overwrite: { type: 'boolean' }, live: { type: 'boolean' }, confirm: { type: 'string', maxLength: 64 } } };
  static statusMonitorId = { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{0,63}$' };
  static statusMonitorParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.statusMonitorId }, required: ['sid', 'id'] };
  static statusMonitorPut = { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', enum: ['http', 'tcp', 'tls', 'dns', 'heartbeat'] }, dnsType: { type: 'string', enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'] }, expectText: { type: ['string', 'null'], maxLength: 200 }, warnDays: { type: 'integer', minimum: 1, maximum: 365 }, graceSec: { type: 'integer', minimum: 0, maximum: 86400 }, rotateToken: { type: 'boolean' }, name: { type: 'string', minLength: 1, maxLength: 100 }, description: { type: 'string', maxLength: 500 }, url: { type: 'string', minLength: 1, maxLength: 2000 }, method: { type: 'string', enum: ['GET', 'HEAD'] }, intervalSec: { type: 'integer', minimum: 10, maximum: 86400 }, timeoutMs: { type: 'integer', minimum: 500, maximum: 60000 }, expectStatus: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'integer', minimum: 100, maximum: 599 } }, failThreshold: { type: 'integer', minimum: 1, maximum: 20 }, public: { type: 'boolean' }, paused: { type: 'boolean' } } };
  static statusMaintenanceParams = { type: 'object', properties: { sid: Schemas.sid, id: { type: 'string', pattern: Ids.pattern('mnt') } }, required: ['sid', 'id'] };
  static statusMaintenanceCreate = Schemas.body(['title', 'startsAt', 'endsAt'], { title: { type: 'string', minLength: 1, maxLength: 120 }, message: { type: 'string', maxLength: 1000 }, monitors: { type: ['array', 'null'], maxItems: 100, items: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{0,63}$' } }, startsAt: { type: 'string', format: 'date-time' }, endsAt: { type: 'string', format: 'date-time' } });
  static statusIncidentParams = { type: 'object', properties: { sid: Schemas.sid, id: { type: 'string', pattern: Ids.pattern('inc') } }, required: ['sid', 'id'] };
  static statusIncidentUpdate = Schemas.body(['status', 'message'], { status: { type: 'string', enum: ['investigating', 'identified', 'monitoring', 'resolved'] }, message: { type: 'string', minLength: 1, maxLength: 2000 } });
  static statusSubscriberParams = { type: 'object', properties: { sid: Schemas.sid, id: { type: 'string', pattern: Ids.pattern('sub') } }, required: ['sid', 'id'] };
  static statusAlertId = { type: 'string', pattern: Ids.pattern('alr') };
  static statusAlertParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.statusAlertId }, required: ['sid', 'id'] };
  static statusAlertsQuery = { type: 'object', additionalProperties: false, properties: { state: { type: 'string', enum: ['open', 'acked'] }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', pattern: '^[0-9]{1,15}~alr_[0-9a-z]{6,12}[0-9a-f]{16}$' } } };
  static statusChecksQuery = { type: 'object', additionalProperties: false, properties: { limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', pattern: '^[0-9]{1,15}$' } } };
  static statusIncidentsQuery = { type: 'object', additionalProperties: false, properties: { monitor: Schemas.statusMonitorId, state: { type: 'string', enum: ['open', 'closed'] }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', pattern: '^[0-9]{1,15}~inc_[0-9a-z]{6,12}[0-9a-f]{16}$' } } };
  static paymentId = { type: 'string', pattern: Ids.pattern('pay') };
  static paymentParams = { type: 'object', properties: { sid: Schemas.sid, id: Schemas.paymentId }, required: ['sid', 'id'] };
  static paymentReconcile = { type: 'object', additionalProperties: false, required: ['from', 'to'], properties: { from: { type: 'string', format: 'date-time' }, to: { type: 'string', format: 'date-time' }, repair: { type: 'boolean' } } };
  static paymentsQuery = { type: 'object', additionalProperties: false, properties: { status: { type: 'string', enum: ['pending', 'processing', 'succeeded', 'canceled', 'partially_refunded', 'refunded'] }, email: { type: 'string', maxLength: 254 }, currency: { type: 'string', pattern: '^[A-Za-z]{3}$' }, minAmount: { type: 'string', pattern: '^[0-9]{1,9}$' }, maxAmount: { type: 'string', pattern: '^[0-9]{1,9}$' }, from: { type: 'string', maxLength: 40 }, to: { type: 'string', maxLength: 40 }, metaKey: { type: 'string', pattern: '^[A-Za-z0-9_.-]{1,40}$' }, metaValue: { type: 'string', maxLength: 500 }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', pattern: '^[0-9]{1,15}~pay_[0-9a-z]{6,12}[0-9a-f]{16}$' } } };
  static paymentRefund = Schemas.body(['idempotencyKey'], { amount: { type: 'integer', minimum: 1, maximum: 99999999 }, reason: { type: 'string', enum: ['duplicate', 'fraudulent', 'requested_by_customer'] }, idempotencyKey: { type: 'string', pattern: '^[A-Za-z0-9._:-]{8,255}$' } });
  static paymentDisputeParams = { type: 'object', properties: { sid: Schemas.sid, id: { type: 'string', pattern: '^(dp|du)_[A-Za-z0-9]{6,64}$' } }, required: ['sid', 'id'] };
  static paymentDisputesQuery = { type: 'object', additionalProperties: false, properties: { status: { type: 'string', pattern: '^[a-z_]{2,40}$' }, open: { type: 'string', enum: ['true', 'false'] }, payment: Schemas.paymentId, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', maxLength: 120 } } };
  static paymentDisputeEvidence = Schemas.body(['evidence'], { evidence: { type: 'object', minProperties: 1, maxProperties: 18, additionalProperties: { type: 'string', maxLength: 20000 } }, submit: { type: 'boolean' } });
  static paymentEventsQuery = { type: 'object', additionalProperties: false, properties: { limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' } } };
  static flagsQuery = {
    type: 'object', additionalProperties: false,
    properties: {
      q: { type: 'string', maxLength: 120 }, tag: { type: 'string', maxLength: 40 }, kind: { type: 'string', enum: ['boolean', 'string', 'number', 'json'] }, archived: { type: 'string', enum: ['true', 'false'] },
      limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$' }, cursor: { type: 'string', maxLength: 80 },
    },
  };
  static flagsChangesQuery = { type: 'object', additionalProperties: false, properties: { status: { type: 'string', enum: ['pending', 'approved', 'rejected'] }, key: { type: 'string', maxLength: 80 }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' } } };
  static flagsChangeParams = { type: 'object', properties: { sid: Schemas.sid, id: { type: 'string', pattern: Ids.pattern('chg') } }, required: ['sid', 'id'] };
  static flagsReject = { type: 'object', additionalProperties: false, properties: { note: { type: 'string', maxLength: 500 } } };
  static flagsEnv = { type: 'string', pattern: '^[a-z][a-z0-9-]{0,31}$' };
  static flagsCreate = Schemas.body(['key', 'kind'], { key: { type: 'string', pattern: '^[a-z0-9]+([.\\-_][a-z0-9]+)*$', maxLength: 80 }, kind: { type: 'string', enum: ['boolean', 'string', 'number', 'json'] }, description: { type: 'string', maxLength: 500 }, tags: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 40 } }, value: {}, offValue: {}, enabled: { type: 'boolean' } });
  static flagsPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: { description: { type: 'string', maxLength: 500 }, tags: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 40 } }, archived: { type: 'boolean' }, reshuffle: { type: 'boolean' } } };
  static flagsEnvPatch = { type: 'object', additionalProperties: false, minProperties: 1, properties: { enabled: { type: 'boolean' }, value: {}, offValue: {}, percentage: { type: 'integer', minimum: 0, maximum: 100 }, rules: { type: 'array', maxItems: 100 } } };
  static flagsEvaluate = Schemas.body(['env'], { env: Schemas.flagsEnv, context: { type: 'object', additionalProperties: false, properties: { userId: { type: 'string', maxLength: 128 }, email: { type: 'string', maxLength: 254 }, attrs: { type: 'object', maxProperties: 32, additionalProperties: { type: 'string', maxLength: 128 } } } }, keys: { type: 'array', maxItems: 200, items: { type: 'string', maxLength: 80 } } });
  static paging = { type: 'object', additionalProperties: true, properties: { limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' }, cursor: { type: 'string', maxLength: 200 }, status: { type: 'string', maxLength: 20 }, email: { type: 'string', maxLength: 254 }, action: { type: 'string', maxLength: 60 } } };
}
