import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;
const HAS_DB_CONFIG = Boolean(DB_ENDPOINT && DB_NAMESPACE && DB_TOKEN);

const dataDir = path.dirname(new URL(import.meta.url).pathname);

if (!HAS_DB_CONFIG) {
  console.warn('⚠️  SurrealDB configuration missing - using local JSON storage');
}

async function dbQuery(query: string, vars?: Record<string, any>) {
  const response = await fetch(`${DB_ENDPOINT}/sql`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'NS': DB_NAMESPACE as string,
      'DB': DB_NAMESPACE as string,
      'Authorization': `Bearer ${DB_TOKEN}`,
    },
    body: JSON.stringify({ query, vars }),
  });

  if (!response.ok) {
    throw new Error(`DB query failed: ${response.statusText}`);
  }

  const results = await response.json();
  return results;
}

export async function read<T>(name: string, fallback: T): Promise<T> {
  if (!HAS_DB_CONFIG) {
    return readFromFile(name, fallback);
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
    return writeToFile(name, data);
  }

  try {
    await dbQuery(`DELETE ${name}`);
    
    if (Array.isArray(data)) {
      for (const item of data) {
        const id = item.id || Math.random().toString(36).substring(7);
        await dbQuery(`CREATE ${name}:${id} CONTENT $item`, { item });
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

async function readFromFile<T>(name: string, fallback: T): Promise<T> {
  const filePath = path.join(dataDir, `${name}.json`);

  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as T;
    console.log(`📁 Loaded ${name} from local storage (${filePath})`);
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Error reading ${name} from file:`, error);
    }

    console.log(`📁 No local data for ${name}, using fallback and creating file`);
    await writeToFile(name, fallback);
    return fallback;
  }
}

async function writeToFile<T>(name: string, data: T): Promise<void> {
  const filePath = path.join(dataDir, `${name}.json`);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Wrote ${name} to local storage (${filePath})`);
}
