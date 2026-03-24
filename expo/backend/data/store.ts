const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;
const HAS_DB_CONFIG = Boolean(DB_ENDPOINT && DB_NAMESPACE && DB_TOKEN);

const memoryStore = new Map<string, any>();

if (!HAS_DB_CONFIG) {
  console.warn('⚠️  SurrealDB configuration missing - using in-memory storage');
}

async function dbQuery(query: string, vars?: Record<string, any>) {
  let fullQuery = query;

  if (vars && Object.keys(vars).length > 0) {
    const letStatements = Object.entries(vars)
      .map(([key, value]) => `LET $${key} = ${JSON.stringify(value)};`)
      .join(' ');
    fullQuery = `${letStatements} ${query}`;
  }

  const response = await fetch(`${DB_ENDPOINT}/sql`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'text/plain',
      'NS': DB_NAMESPACE as string,
      'DB': DB_NAMESPACE as string,
      'Authorization': `Bearer ${DB_TOKEN}`,
    },
    body: fullQuery,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`DB query failed: ${text || response.statusText}`);
  }

  const results = await response.json();

  if (Array.isArray(results)) {
    for (const result of results) {
      if (result.status === 'ERR') {
        console.warn(`SurrealDB query warning: ${result.result}`);
      }
    }
  }

  return results;
}

function normalizeId(id: any, tableName: string): string {
  if (typeof id !== 'string') return String(id ?? '');
  const prefix = `${tableName}:`;
  let clean = id;
  if (clean.startsWith(prefix)) {
    clean = clean.slice(prefix.length);
  }
  clean = clean.replace(/^⟨/, '').replace(/⟩$/, '');
  return clean;
}

function normalizeRecord(item: any, tableName: string): any {
  if (!item || typeof item !== 'object') return item;
  if (typeof item.id === 'string' && item.id.includes(':')) {
    return { ...item, id: normalizeId(item.id, tableName) };
  }
  return item;
}

function readFromMemory<T>(name: string, fallback: T): T {
  if (memoryStore.has(name)) {
    const stored = memoryStore.get(name);
    console.log(`📁 Loaded ${name} from memory`);
    return JSON.parse(JSON.stringify(stored)) as T;
  }

  console.log(`📁 No data in memory for ${name}, using fallback`);
  writeToMemory(name, fallback);
  return JSON.parse(JSON.stringify(fallback)) as T;
}

function writeToMemory<T>(name: string, data: T): void {
  memoryStore.set(name, JSON.parse(JSON.stringify(data)));
  const count = Array.isArray(data) ? data.length : 1;
  console.log(`✅ Wrote ${count} item(s) to memory store [${name}]`);
}

async function loadFromDb(name: string): Promise<any[] | null> {
  try {
    const result = await dbQuery(`SELECT * FROM ${name}`);
    if (result && result[0]?.result && result[0].result.length > 0) {
      const normalized = (result[0].result as any[]).map(item => normalizeRecord(item, name));
      console.log(`📁 Loaded ${normalized.length} items from DB [${name}]`);
      return normalized;
    }
    return null;
  } catch (error) {
    console.error(`Error reading ${name} from DB:`, error);
    return null;
  }
}

export function invalidateCache(name: string): void {
  memoryStore.delete(name);
  console.log(`🗑️ Cache invalidated for [${name}]`);
}

export async function readFresh<T>(name: string, fallback: T): Promise<T> {
  invalidateCache(name);
  return read(name, fallback);
}

export async function read<T>(name: string, fallback: T): Promise<T> {
  // Memory is always the source of truth during a session.
  // DB is only used for initial load when memory is empty (e.g. after server restart).
  if (memoryStore.has(name)) {
    return readFromMemory(name, fallback);
  }

  if (!HAS_DB_CONFIG) {
    return readFromMemory(name, fallback);
  }

  // Memory is empty — try to hydrate from DB (initial load)
  const dbData = await loadFromDb(name);
  if (dbData && dbData.length > 0) {
    const data = dbData as unknown as T;
    writeToMemory(name, data);
    return data;
  }

  console.log(`📁 No data in DB for ${name}, using fallback`);
  if (Array.isArray(fallback) && (fallback as any[]).length > 0) {
    await write(name, fallback);
  }
  return fallback;
}

export async function write<T>(name: string, data: T): Promise<void> {
  // Always write to memory first — this is the authoritative in-session store
  writeToMemory(name, data);

  if (!HAS_DB_CONFIG) {
    return;
  }

  // Sync to DB synchronously so data is persisted before returning
  try {
    await syncToDb(name, data);
  } catch (error) {
    console.warn(`⚠️ DB sync failed for ${name}, data is safe in memory:`, error);
  }
}

async function syncToDb<T>(name: string, data: T): Promise<void> {
  try {
    await dbQuery(`DELETE ${name}`);
  } catch (deleteError) {
    console.warn(`Could not delete ${name} from DB:`, deleteError);
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      try {
        const rawId = item.id || Math.random().toString(36).substring(7);
        const cleanId = normalizeId(String(rawId), name);
        const safeId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanItem = { ...item, id: cleanId };
        await dbQuery(`CREATE ${name}:⟨${safeId}⟩ CONTENT $item`, { item: cleanItem });
      } catch (itemError) {
        console.warn(`⚠️ Could not sync item to DB [${name}]:`, itemError);
      }
    }
    console.log(`✅ Synced ${(data as any[]).length} items to DB [${name}]`);
  } else {
    await dbQuery(`CREATE ${name}:data CONTENT $item`, { item: data });
    console.log(`✅ Synced data to DB [${name}]`);
  }
}
