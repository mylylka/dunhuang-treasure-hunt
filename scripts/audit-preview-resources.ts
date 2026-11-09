import { readFile, readdir } from 'node:fs/promises';
import { worldPreviewResourceProfile } from '../src/world/preview-resource-profile';

const root = new URL('../', import.meta.url);
const files = (await readdir(root)).filter(file => file.endsWith('.html') && file !== 'index.html').sort();
const failures: string[] = [];
for (const file of files) {
  const html = await readFile(new URL(file, root), 'utf8');
  const entry = html.match(/data-preview-resource-entry="([^"]+)"/)?.[1];
  if (entry !== file) {
    failures.push(`${file}: missing or mismatched resource entry declaration`);
    continue;
  }
  const profile = worldPreviewResourceProfile('/index.html', entry);
  if (!profile?.starts.length) failures.push(`${file}: no startup resource profile`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`${files.length} preview source entries declare startup, approach and interaction scopes.`);
}
