#!/usr/bin/env node
/**
 * Read-only inventory of exact duplicate files in terrain v001–v013.
 *
 *   node scripts/audit-terrain-duplicates.mjs
 *   node scripts/audit-terrain-duplicates.mjs --json > /tmp/terrain-duplicates.json
 *
 * --json emits the full path manifest to stdout; this script never writes a
 * report file itself. Redirect it outside outputs/terrain. The duplicate byte
 * counts are logical and cannot establish physical APFS space savings.
 */
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readdirSync, readSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/audit-terrain-duplicates.mjs [--json]');
  console.log('Default: concise summary. --json: full SHA-256 manifest on redirected stdout.');
  console.log('Logical duplicate bytes are not guaranteed reclaimable disk space.');
  process.exit(0);
}
if (args.some(arg => arg !== '--json') || args.filter(arg => arg === '--json').length > 1) {
  console.error('Unsupported option. Use --help for usage.');
  process.exit(2);
}
const json = args.includes('--json');
if (json && process.stdout.isTTY) {
  console.error('The full manifest is large; redirect --json stdout to a file outside outputs/terrain.');
  process.exit(2);
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const terrain = join(repo, 'outputs', 'terrain');
const bySize = new Map();
const issues = [];
let count = 0, logicalBytes = 0, skippedSymlinks = 0, emptyFiles = 0;

function visit(dir, version) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch (error) { issues.push(`${relative(repo, dir)}: ${error.code ?? error.message}`); return; }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) { skippedSymlinks++; continue; }
    if (entry.isDirectory()) { visit(path, version); continue; }
    if (!entry.isFile()) continue;
    let fd;
    try {
      // Do not follow a symlink if a path is exchanged while scanning.
      fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const stat = fstatSync(fd);
      if (!stat.isFile()) continue;
      count++; logicalBytes += stat.size;
      if (stat.size === 0) { emptyFiles++; continue; }
      const item = { path, version, size: stat.size };
      const list = bySize.get(stat.size) ?? [];
      list.push(item); bySize.set(stat.size, list);
    } catch (error) { issues.push(`${relative(repo, path)}: ${error.code ?? error.message}`); }
    finally { if (fd !== undefined) closeSync(fd); }
  }
}

for (let i = 1; i <= 13; i++) {
  const version = `v${String(i).padStart(3, '0')}`;
  visit(join(terrain, version), version);
}

const hashed = new Map();
const buffer = Buffer.allocUnsafe(1024 * 1024);
let hashedFiles = 0;
for (const [size, files] of bySize) {
  if (files.length < 2) continue;
  for (const file of files) {
    let fd;
    try {
      fd = openSync(file.path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const before = fstatSync(fd);
      if (!before.isFile() || before.size !== size) throw new Error('changed before hashing');
      const hash = createHash('sha256');
      for (;;) {
        const length = readSync(fd, buffer, 0, buffer.length, null);
        if (!length) break;
        hash.update(buffer.subarray(0, length));
      }
      const after = fstatSync(fd);
      if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error('changed while hashing');
      const digest = hash.digest('hex');
      const key = `${size}:${digest}`;
      const group = hashed.get(key) ?? { sha256: digest, bytesPerFile: size, files: [] };
      group.files.push(file); hashed.set(key, group); hashedFiles++;
    } catch (error) { issues.push(`${relative(repo, file.path)}: ${error.code ?? error.message}`); }
    finally { if (fd !== undefined) closeSync(fd); }
  }
}

const groups = [...hashed.values()]
  .filter(group => new Set(group.files.map(file => file.version)).size > 1)
  .map(group => ({
    sha256: group.sha256,
    bytesPerFile: group.bytesPerFile,
    copies: group.files.length,
    versions: [...new Set(group.files.map(file => file.version))].sort(),
    logicalDuplicateBytes: group.bytesPerFile * (group.files.length - 1),
    paths: group.files.map(file => relative(terrain, file.path).split(sep).join('/')).sort(),
  }))
  .sort((a, b) => b.logicalDuplicateBytes - a.logicalDuplicateBytes || a.sha256.localeCompare(b.sha256));

const bytes = list => list.reduce((sum, group) => sum + group.logicalDuplicateBytes, 0);
const large = groups.filter(group => group.bytesPerFile >= 1024 * 1024);
const result = {
  scope: 'outputs/terrain/v001..v013',
  note: 'Logical duplicates only; APFS clones, hard links and block sharing mean physical savings are not established.',
  fileCount: count, logicalBytes, hashedFiles, emptyFiles, skippedSymlinks,
  crossVersionGroups: groups.length,
  crossVersionInstances: groups.reduce((sum, group) => sum + group.copies, 0),
  logicalDuplicateBytes: bytes(groups),
  atLeast1MiB: { groups: large.length, instances: large.reduce((sum, group) => sum + group.copies, 0), logicalDuplicateBytes: bytes(large) },
  issues,
};

if (json) {
  process.stdout.write(`${JSON.stringify({ ...result, groups }, null, 2)}\n`);
} else {
  const mib = n => `${(n / 1024 / 1024).toFixed(2)} MiB`;
  console.log(`Scope: ${result.scope}`);
  console.log(`Files: ${count}; logical total: ${mib(logicalBytes)}; SHA-256 hashed: ${hashedFiles}`);
  console.log(`Cross-version groups: ${groups.length}; file instances: ${result.crossVersionInstances}; logical duplicates: ${mib(result.logicalDuplicateBytes)}`);
  console.log(`Files >= 1 MiB: ${large.length} groups, ${result.atLeast1MiB.instances} instances; logical duplicates: ${mib(result.atLeast1MiB.logicalDuplicateBytes)}`);
  for (const [i, group] of large.slice(0, 5).entries()) {
    console.log(`${i + 1}. ${group.paths[0]} — ${group.copies} copies, ${mib(group.bytesPerFile)} each, ${mib(group.logicalDuplicateBytes)} logical duplicates`);
  }
  console.log(result.note);
  if (emptyFiles || skippedSymlinks) console.log(`Zero-byte files excluded: ${emptyFiles}; symlinks skipped: ${skippedSymlinks}`);
  if (issues.length) console.error(`Incomplete scan: ${issues.length} read errors; see --json output for details.`);
}
if (issues.length) process.exitCode = 1;
