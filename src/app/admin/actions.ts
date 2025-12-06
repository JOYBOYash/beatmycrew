
'use server';

import fs from 'fs/promises';
import path from 'path';

// This is not a real database, so it's not safe for production with multiple users.
// For this demo, it's fine.
const aliasesPath = path.join(process.cwd(), 'src', 'lib', 'aliases.json');

export async function updateAlias(originalName: string, alias: string): Promise<{ success: boolean, error?: string }> {
  try {
    const file = await fs.readFile(aliasesPath, 'utf-8');
    const aliases: Record<string, string> = JSON.parse(file);

    aliases[originalName] = alias;

    await fs.writeFile(aliasesPath, JSON.stringify(aliases, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update alias:', error);
    return { success: false, error: error.message };
  }
}
