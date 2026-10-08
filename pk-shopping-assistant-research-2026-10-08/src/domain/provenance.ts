import type { AccessKind, AccessRecord, Id, SourceKind } from './types.js';

export const LOCAL_PURPOSE_DECLARATION_VERSION = 1;
export const LOCAL_ALLOWED_USES = [
  'personal_local_display',
  'personal_local_comparison',
  'personal_export',
] as const;

export function createLocalAccessRecord(id: Id, kind: Extract<AccessKind, 'personal_manual' | 'synthetic_owned'>): AccessRecord {
  return {
    id,
    rightsHolder: kind === 'synthetic_owned' ? 'Prototype fixture author' : 'Local notebook user',
    evidenceRef: `local-purpose:v${LOCAL_PURPOSE_DECLARATION_VERSION}`,
    kind,
    sourceHosts: [],
    merchantIds: [],
    fields: [],
    methods: ['manual'],
    allowedUses: [...LOCAL_ALLOWED_USES],
    approvedPathsOrEndpoints: [],
    approvedSkus: [],
    historyRetentionDays: null,
    cacheSeconds: null,
    attribution: null,
    effectiveAt: null,
    expiresAt: null,
    revokedAt: null,
    costTermsRef: null,
    state: 'not_applicable',
  };
}

export function localSourceMatchesAccess(sourceKind: SourceKind, record: AccessRecord): boolean {
  return (sourceKind === 'manual' && record.kind === 'personal_manual')
    || (sourceKind === 'synthetic' && record.kind === 'synthetic_owned');
}
