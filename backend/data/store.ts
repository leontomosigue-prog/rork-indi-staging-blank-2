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

export async function read<T>(name: string, fallback: T): Promise<T> {
  if (!HAS_DB_CONFIG) {
    return readFromMemory(name, fallback);
  }

  try {
    const result = await dbQuery(`SELECT * FROM ${name}`);

    if (result && result[0]?.result && result[0].result.length > 0) {
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
    try {
      await dbQuery(`DELETE ${name}`);
    } catch (deleteError) {
      console.warn(`Could not delete ${name} (table may not exist yet):`, deleteError);
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const rawId = item.id || Math.random().toString(36).substring(7);
        const safeId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
        await dbQuery(`CREATE ${name}:⟨${safeId}⟩ CONTENT $item`, { item });
      }
      console.log(`✅ Wrote ${data.length} items to ${name}`);
    } else {
      await dbQuery(`CREATE ${name}:data CONTENT $item`, { item: data });
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
