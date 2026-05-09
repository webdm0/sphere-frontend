import { del, get, set } from 'idb-keyval';
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import { isLegacyNumericEntityId, isTempId } from '@/utils/entityId';
import { hasStoredDemoSessionExpired } from '@/utils/demoSession';

const ENTITY_KEY_PATTERN = /(^id$|Id$)/;
const TEMP_ENTITY_KEY_PATTERN = /^id$/;
const QUERY_KEYS_WITH_ENTITY_ID = new Set(['board', 'card', 'boardMembers']);

const hasLegacyNumericIds = (
  value: unknown,
  visited = new WeakSet<object>()
): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (visited.has(value as object)) return false;
  visited.add(value as object);

  if (Array.isArray(value)) {
    return value.some((item) => hasLegacyNumericIds(item, visited));
  }

  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (ENTITY_KEY_PATTERN.test(key) && isLegacyNumericEntityId(nested)) return true;
    return hasLegacyNumericIds(nested, visited);
  });
};

const hasTempIds = (
  value: unknown,
  visited = new WeakSet<object>()
): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (visited.has(value as object)) return false;
  visited.add(value as object);

  if (Array.isArray(value)) {
    return value.some((item) => hasTempIds(item, visited));
  }

  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (TEMP_ENTITY_KEY_PATTERN.test(key) && typeof nested === 'string' && isTempId(nested)) {
      return true;
    }
    return hasTempIds(nested, visited);
  });
};

const queryKeyHasLegacyNumericEntityId = (queryKey: unknown): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false;

  const [scope, possibleEntityId] = queryKey;
  if (typeof scope !== 'string' || !QUERY_KEYS_WITH_ENTITY_ID.has(scope)) return false;

  return isLegacyNumericEntityId(possibleEntityId);
};

const queryKeyHasTempEntityId = (queryKey: unknown): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false;

  const [scope, possibleEntityId] = queryKey;
  if (typeof scope !== 'string' || !QUERY_KEYS_WITH_ENTITY_ID.has(scope)) return false;

  return typeof possibleEntityId === 'string' && isTempId(possibleEntityId);
};

export function createPersister(idbKey = 'reactQuery'): Persister {
  const sanitizeClient = (client: PersistedClient | undefined) => {
    if (!client?.clientState?.queries) return client;

    const hasLegacyIds = client.clientState.queries.some((query) => {
      if (queryKeyHasLegacyNumericEntityId(query.queryKey)) return true;
      return hasLegacyNumericIds(query.state?.data);
    });
    if (hasLegacyIds) {
      return undefined;
    }

    const safeQueries = client.clientState.queries.filter(
      (query) =>
        query.state?.status === 'success' &&
        !queryKeyHasTempEntityId(query.queryKey) &&
        !hasTempIds(query.state?.data)
    );

    if (safeQueries.length === client.clientState.queries.length) {
      return client;
    }

    return {
      ...client,
      clientState: {
        ...client.clientState,
        queries: safeQueries,
      },
    };
  };

  return {
    persistClient: async (client) => {
      const sanitizedClient = sanitizeClient(client);
      if (!sanitizedClient) {
        await del(idbKey);
        return;
      }

      await set(idbKey, sanitizedClient);
    },
    restoreClient: async () => {
      if (hasStoredDemoSessionExpired()) {
        await del(idbKey);
        return undefined;
      }

      const client = await get<PersistedClient>(idbKey);
      const sanitizedClient = sanitizeClient(client ?? undefined);

      if (!sanitizedClient) {
        if (client) {
          await del(idbKey);
        }
        return undefined;
      }

      if (client && sanitizedClient !== client) {
        await set(idbKey, sanitizedClient);
      }

      return sanitizedClient;
    },
    removeClient: async () => {
      await del(idbKey);
    },
  };
}
