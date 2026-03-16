const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;
const HAS_DB_CONFIG = Boolean(DB_ENDPOINT && DB_NAMESPACE && DB_TOKEN);

const memoryStore = new Map<string, any>();

if (!HAS_DB_CONFIG) {
  console.warn('⚠️  SurrealDB configuration missing - using in-memory storage');
}

async function dbQuery(query: string): Promise<any> {
  const response = await fetch(`${DB_ENDPOINT}/sql`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'text/plain',
      'NS': DB_NAMESPACE as string,
      'DB': DB_NAMESPACE as string,
      'Authorization': `Bearer ${DB_TOKEN}`,
    },
    body: query,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`DB query failed: ${response.status} ${text}`);
  }

  const results = await response.json();

  if (Array.isArray(results)) {
    for (const r of results) {
      if (r.status && r.status !== 'OK') {
        console.warn(`⚠️ SurrealDB statement warning: ${r.status} - ${r.detail || r.result}`);
      }
    }
  }

  return results;
}

async function dbQuerySafe(query: string): Promise<any> {
  try {
    return await dbQuery(query);
  } catch (error) {
    console.warn(`⚠️ dbQuerySafe swallowed error for query "${query.slice(0, 60)}":`, error);
    return null;
  }
}

export async function read<T>(name: string, fallback: T): Promise<T> {
  if (!HAS_DB_CONFIG) {
    return readFromMemory(name, fallback);
  }

  try {
    const result = await dbQuery(`SELECT * FROM ${name};`);

    if (result && result[0]?.result && Array.isArray(result[0].result) && result[0].result.length > 0) {
      console.log(`📁 Loaded ${result[0].result.length} items from ${name}`);
      return result[0].result as T;
    }

    console.log(`📁 No data in ${name}, using fallback`);
    if (Array.isArray(fallback) && fallback.length > 0) {
      await write(name, fallback);
    }
    return fallback;
  } catch (error) {
    console.error(`Error reading ${name}:`, error);
    return fallback;
  }
}

export async function write<T>(name: string, data: T): Promise<void> {
  if (!HAS_DB_CONFIG) {
    return writeToMemory(name, data);
  }

  try {
    await dbQuerySafe(`DELETE ${name};`);

    if (Array.isArray(data)) {
      for (const item of data) {
        const rawId = (item.id || Math.random().toString(36).substring(7)).replace(/[^a-zA-Z0-9_]/g, '_');
        const content = JSON.stringify(item);
        await dbQuery(`CREATE ${name}:\`${rawId}\` CONTENT ${content};`);
      }
      console.log(`✅ Wrote ${data.length} items to ${name}`);
    } else {
      const content = JSON.stringify(data);
      await dbQuery(`CREATE ${name}:\`data\` CONTENT ${content};`);
      console.log(`✅ Wrote data to ${name}`);
    }
  } catch (error) {
    console.error(`Error writing ${name}:`, error);
    throw error;
  }
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
