import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import JSZip from 'jszip';

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, content, 'utf8');
}

export async function addDirectoryToZip(zip: JSZip, directory: string, zipRoot = ''): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const archivePath = join(zipRoot, relative(directory, absolutePath)).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, absolutePath, join(zipRoot, entry.name));
    } else if (entry.isFile()) {
      zip.file(archivePath, await readFile(absolutePath));
    }
  }
}
