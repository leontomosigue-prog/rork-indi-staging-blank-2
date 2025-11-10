import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const DATA_DIR = join(process.cwd(), "backend", "data");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export async function read<T>(name: string, fallback: T): Promise<T> {
  const filePath = join(DATA_DIR, `${name}.json`);
  
  try {
    if (!existsSync(filePath)) {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      console.log(`📁 Created ${name}.json with fallback data`);
      return fallback;
    }
    const text = readFileSync(filePath, 'utf-8');
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Error reading ${name}.json:`, error);
    return fallback;
  }
}

export async function write<T>(name: string, data: T): Promise<void> {
  const filePath = join(DATA_DIR, `${name}.json`);
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${name}.json:`, error);
    throw error;
  }
}
