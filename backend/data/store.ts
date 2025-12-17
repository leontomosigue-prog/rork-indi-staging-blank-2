const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

if (!DB_ENDPOINT || !DB_NAMESPACE || !DB_TOKEN) {
  throw new Error('Missing SurrealDB configuration');
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
