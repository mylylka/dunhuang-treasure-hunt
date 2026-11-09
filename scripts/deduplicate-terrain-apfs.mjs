#!/usr/bin/env node
/**
 * Controlled APFS COW deduplication of *only* exact terrain v001–v013 copies.
 * Default is a read-only dry run. Apply requires both an explicit limit and a
 * new journal outside outputs/terrain. Never substitutes hard links or copies.
 *
 * node scripts/deduplicate-terrain-apfs.mjs --dry-run
 * node scripts/deduplicate-terrain-apfs.mjs --apply --limit 1 --log /tmp/terrain-pilot.jsonl
 * node scripts/deduplicate-terrain-apfs.mjs --apply --limit 705 --resume /tmp/terrain-pilot.jsonl --log /tmp/terrain-rest.jsonl
 *
 * A replaced inode's ctime necessarily changes. Original bytes, mode, owner,
 * group, atime, mtime, birthtime, flags and xattrs are checked; files with
 * ACLs, differing xattrs/birthtime or unsupported metadata are skipped.
 */
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, readSync, realpathSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const terrain = join(repo, 'outputs', 'terrain');
const MiB = 1024 * 1024;
const nofollow = constants.O_NOFOLLOW ?? 0;
const buffer = Buffer.allocUnsafe(MiB);
const clonePython = String.raw`import ctypes, os, sys
libc = ctypes.CDLL(None, use_errno=True)
fn = libc.fclonefileat
fn.argtypes = (ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int)
fn.restype = ctypes.c_int
if fn(3, 4, os.fsencode(sys.argv[1]), 0) != 0:
    err = ctypes.get_errno()
    sys.stderr.write('fclonefileat errno=' + str(err) + '\n')
    sys.exit(1)
`;
const cloneIdentityPython = String.raw`import ctypes as c, json, struct, sys
class Attr(c.Structure):
    _fields_ = [('bitmapcount',c.c_ushort),('reserved',c.c_ushort),('commonattr',c.c_uint32),('volattr',c.c_uint32),('dirattr',c.c_uint32),('fileattr',c.c_uint32),('forkattr',c.c_uint32)]
lib = c.CDLL(None, use_errno=True)
fn = lib.fgetattrlist
fn.argtypes = (c.c_int,c.POINTER(Attr),c.c_void_p,c.c_size_t,c.c_ulong)
fn.restype = c.c_int
out = []
for fd in (3, 4):
    attr = Attr(5,0,0,0,0,0,0x1108)
    buf = c.create_string_buffer(64)
    if fn(fd, c.byref(attr), buf, 64, 0x20) != 0:
        sys.stderr.write('fgetattrlist errno=' + str(c.get_errno()) + '\n')
        sys.exit(1)
    private, clone_id, refcount = struct.unpack_from('=qQI', buf.raw, 4)
    out.append([str(clone_id), refcount])
print(json.dumps(out))
`;
const restoreTimesPython = String.raw`import os, sys
os.utime(3, ns=(int(sys.argv[1]), int(sys.argv[2])))
`;

export function parseOptions(args) {
  const result = { mode: 'dry-run', limit: null, log: null, resume: null };
  let modeSeen = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') return { ...result, help: true };
    if (arg === '--apply' || arg === '--dry-run') {
      if (modeSeen) throw new Error('Specify only one mode');
      result.mode = arg.slice(2); modeSeen = true;
    } else if (arg === '--limit') {
      if (result.limit !== null || !/^[1-9]\d*$/.test(args[i + 1] ?? '')) throw new Error('Invalid --limit');
      result.limit = Number(args[++i]);
      if (!Number.isSafeInteger(result.limit)) throw new Error('Invalid --limit');
    } else if (arg === '--log' || arg === '--resume') {
      const field = arg.slice(2);
      if (result[field] || !isAbsolute(args[i + 1] ?? '')) throw new Error(`${arg} requires an absolute path`);
      result[field] = resolve(args[++i]);
    } else throw new Error(`Unsupported option: ${arg}`);
  }
  if (result.mode === 'apply' && (!result.limit || !result.log)) throw new Error('--apply requires --limit and --log');
  if (result.mode === 'dry-run' && (result.log || result.resume)) throw new Error('--log and --resume require --apply');
  return result;
}

export function allowedTerrainRelative(path) {
  return typeof path === 'string' && /^v(?:00[1-9]|01[0-3])\//.test(path) &&
    !path.includes('\\') && !/[\0\r\n]/.test(path) &&
    path.split('/').every(part => part && part !== '.' && part !== '..');
}

export function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.uid === b.uid &&
    a.gid === b.gid && a.nlink === b.nlink && a.size === b.size &&
    a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs && a.birthtimeNs === b.birthtimeNs;
}

export function preservedMetadata(target, clone) {
  return target.dev === clone.dev && target.ino !== clone.ino && clone.nlink === 1n &&
    target.mode === clone.mode && target.uid === clone.uid && target.gid === clone.gid &&
    target.size === clone.size && target.atimeNs === clone.atimeNs &&
    target.mtimeNs === clone.mtimeNs && target.birthtimeNs === clone.birthtimeNs;
}

function safePath(path) {
  const rel = relative(terrain, path).split(sep).join('/');
  if (!allowedTerrainRelative(rel)) throw new Error('Path outside authorised terrain versions');
  let current = terrain;
  if (lstatSync(current).isSymbolicLink() || realpathSync(current) !== current) throw new Error('Terrain root is not a real directory');
  for (const part of rel.split('/')) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error('Symlink in candidate path');
  }
  return rel;
}

export function flagsAndAttributes(path) {
  const flags = execFileSync('/usr/bin/stat', ['-f', '%f', path], { encoding: 'utf8' }).trim();
  if (flags !== '0') return { supported: false, reason: 'flags' };
  const listing = execFileSync('/bin/ls', ['-lde', path], { encoding: 'utf8' }).trimEnd().split('\n');
  if (listing.length !== 1 || /^\S*\+/.test(listing[0])) return { supported: false, reason: 'acl' };
  const names = execFileSync('/usr/bin/xattr', [path], { encoding: 'utf8' }).split('\n').filter(Boolean).sort();
  const attrs = names.map(name => [name, execFileSync('/usr/bin/xattr', ['-px', '--', name, path], { encoding: 'utf8' }).replace(/\s+/g, '')]);
  return { supported: true, attrs: JSON.stringify(attrs) };
}

function hashFd(fd) {
  const hash = createHash('sha256');
  let position = 0;
  for (;;) {
    const length = readSync(fd, buffer, 0, buffer.length, position);
    if (!length) break;
    position += length; hash.update(buffer.subarray(0, length));
  }
  return hash.digest('hex');
}

/** fclonefileat never falls back to ordinary copying, unlike `cp -c`. */
export function cloneFdIntoDirectory(sourceFd, directoryFd, tempName) {
  if (!/^\.codex-apfs-dedup-[0-9a-f-]+$/.test(tempName)) throw new Error('Invalid temporary name');
  const result = spawnSync('python3', ['-c', clonePython, tempName], {
    stdio: ['ignore', 'pipe', 'pipe', sourceFd, directoryFd], encoding: 'utf8',
  });
  if (result.error || result.status !== 0) throw new Error(`APFS clone failed: ${result.error?.message ?? result.stderr.trim()}`);
}

function readCloneIdentities(firstFd, secondFd) {
  const result = spawnSync('python3', ['-c', cloneIdentityPython], {
    stdio: ['ignore', 'pipe', 'pipe', firstFd, secondFd], encoding: 'utf8',
  });
  if (result.error || result.status !== 0) throw new Error(`APFS clone identity unavailable: ${result.error?.message ?? result.stderr.trim()}`);
  const identities = JSON.parse(result.stdout);
  if (!Array.isArray(identities) || identities.length !== 2 || identities.some(item =>
    !Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'string' || !/^\d+$/.test(item[0]) ||
    !Number.isSafeInteger(item[1]) || item[1] < 0)) throw new Error('Invalid APFS clone identity response');
  return identities;
}

/** A failed or inconsistent query throws: it must not be treated as different. */
export function alreadyShareClone(sourceFd, targetFd) {
  const [source, target] = readCloneIdentities(sourceFd, targetFd);
  if (source[0] === '0' || target[0] === '0') throw new Error('APFS clone identity is indeterminate');
  if (source[0] !== target[0]) return false;
  if (source[1] < 2 || target[1] < 2) throw new Error('Inconsistent APFS clone reference count');
  return true;
}

/** Verify both open inodes are in the same APFS clone group. */
export function verifySharedClone(sourceFd, cloneFd) {
  const identities = readCloneIdentities(sourceFd, cloneFd);
  if (identities[0][0] === '0' || identities[0][0] !== identities[1][0] || identities[0][1] < 2 || identities[1][1] < 2) {
    throw new Error('APFS clone does not share the source clone group');
  }
  return identities[0][0];
}

export function restoreTimes(fd, stat) {
  const result = spawnSync('python3', ['-c', restoreTimesPython, String(stat.atimeNs), String(stat.mtimeNs)], {
    stdio: ['ignore', 'pipe', 'pipe', fd], encoding: 'utf8',
  });
  if (result.error || result.status !== 0) throw new Error(`Could not restore target times: ${result.error?.message ?? result.stderr.trim()}`);
}

function requireApfs(path) {
  if (process.platform !== 'darwin') throw new Error('APFS cloning is only supported on macOS');
  const df = execFileSync('/bin/df', ['-P', path], { encoding: 'utf8' }).trim().split('\n').at(-1);
  const device = df?.trim().split(/\s+/)[0];
  if (!device?.startsWith('/dev/')) throw new Error('Could not determine filesystem device');
  const plist = execFileSync('/usr/sbin/diskutil', ['info', '-plist', device]);
  const filesystem = execFileSync('/usr/bin/plutil', ['-extract', 'FilesystemType', 'raw', '-o', '-', '-'], { input: plist, encoding: 'utf8' }).trim();
  if (filesystem.toLowerCase() !== 'apfs') throw new Error('Terrain is not on APFS');
}

function inventory() {
  const output = execFileSync(process.execPath, [join(repo, 'scripts/audit-terrain-duplicates.mjs'), '--json'], { maxBuffer: 32 * MiB });
  const report = JSON.parse(output.toString('utf8'));
  if (report.issues?.length || report.scope !== 'outputs/terrain/v001..v013') throw new Error('Audit incomplete');
  return report.groups.filter(group => group.bytesPerFile >= MiB);
}

export function resumePaths(path) {
  if (!path) return new Set();
  const text = readFileSync(path, 'utf8');
  const items = new Set(), pending = new Set();
  for (const line of text.split('\n').filter(Boolean)) {
    const entry = JSON.parse(line);
    if ((entry.event === 'cloning' || entry.event === 'ready-to-replace') && allowedTerrainRelative(entry.path)) pending.add(entry.path);
    if (entry.event === 'replaced' && allowedTerrainRelative(entry.path)) { items.add(entry.path); pending.delete(entry.path); }
  }
  if (pending.size) throw new Error(`Journal contains ${pending.size} unresolved replacement(s); inspect before resuming`);
  return items;
}

function outsideTerrain(path) {
  const rel = relative(terrain, path);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node scripts/deduplicate-terrain-apfs.mjs [--dry-run] | --apply --limit N --log ABSOLUTE_PATH [--resume ABSOLUTE_PATH]');
    console.log('Only exact >=1 MiB copies in terrain v001–v013; ctime necessarily changes.');
    return;
  }
  requireApfs(terrain);
  const rootStat = lstatSync(terrain, { bigint: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || realpathSync(terrain) !== terrain) throw new Error('Invalid terrain root');
  const groups = inventory();
  const candidates = groups.reduce((sum, group) => sum + group.paths.length - 1, 0);
  if (options.mode === 'dry-run') {
    console.log(`Read-only audit: ${groups.length} groups, ${candidates} >=1 MiB candidate copies; no files changed.`);
    return;
  }
  if (!outsideTerrain(options.log) || !outsideTerrain(realpathSync(dirname(options.log))) ||
      (options.resume && (!outsideTerrain(options.resume) || !outsideTerrain(realpathSync(options.resume))))) {
    throw new Error('Journal must be outside terrain, including through symlinks');
  }
  const prior = resumePaths(options.resume);
  const journal = openSync(options.log, 'wx', 0o600);
  const note = event => { writeSync(journal, `${JSON.stringify(event)}\n`); fsyncSync(journal); };
  let replaced = 0, skipped = 0, logicalBytes = 0, activeTemp = null;
  function cleanupTemp() {
    if (activeTemp) {
      try { unlinkSync(activeTemp); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      activeTemp = null;
    }
  }
  const signal = name => { try { cleanupTemp(); note({ event: 'interrupted', signal: name }); } finally { closeSync(journal); process.exit(1); } };
  process.once('SIGINT', () => signal('SIGINT'));
  process.once('SIGTERM', () => signal('SIGTERM'));
  note({ event: 'start', scope: 'outputs/terrain/v001..v013', groups: groups.length, candidates, limit: options.limit, ctimeChanges: true });
  try {
    outer: for (const group of groups) {
      const sourceRel = group.paths[0];
      if (!allowedTerrainRelative(sourceRel)) throw new Error('Invalid source path');
      const source = join(terrain, sourceRel);
      safePath(source);
      for (const targetRel of group.paths.slice(1)) {
        if (replaced >= options.limit) break outer;
        if (prior.has(targetRel)) continue;
        if (!allowedTerrainRelative(targetRel)) throw new Error('Invalid target path');
        const target = join(terrain, targetRel);
        safePath(source); safePath(target);
        let sourceFd, targetFd, dirFd, cloneFd;
        try {
          sourceFd = openSync(source, constants.O_RDONLY | nofollow);
          targetFd = openSync(target, constants.O_RDONLY | nofollow);
          const s = fstatSync(sourceFd, { bigint: true }), t = fstatSync(targetFd, { bigint: true });
          if (!s.isFile() || !t.isFile() || s.dev !== rootStat.dev || t.dev !== rootStat.dev || s.nlink !== 1n || t.nlink !== 1n ||
              s.size < BigInt(MiB) || s.size !== t.size || s.mode !== t.mode || s.uid !== t.uid || s.gid !== t.gid || s.birthtimeNs !== t.birthtimeNs) {
            skipped++; note({ event: 'skip', path: targetRel, reason: 'file-or-metadata' }); continue;
          }
          if (!sameIdentity(s, lstatSync(source, { bigint: true })) || !sameIdentity(t, lstatSync(target, { bigint: true }))) throw new Error('Candidate changed before hashing');
          const sourceExtra = flagsAndAttributes(source), targetExtra = flagsAndAttributes(target);
          if (!sourceExtra.supported || !targetExtra.supported || sourceExtra.attrs !== targetExtra.attrs) {
            skipped++; note({ event: 'skip', path: targetRel, reason: 'acl-flags-or-xattrs' }); continue;
          }
          if (hashFd(sourceFd) !== group.sha256 || hashFd(targetFd) !== group.sha256 ||
              !sameIdentity(s, fstatSync(sourceFd, { bigint: true })) || !sameIdentity(t, fstatSync(targetFd, { bigint: true }))) throw new Error('Candidate content or identity changed');
          if (alreadyShareClone(sourceFd, targetFd)) {
            skipped++; note({ event: 'skip', path: targetRel, reason: 'already-shared-clone' }); continue;
          }
          dirFd = openSync(dirname(target), constants.O_RDONLY | nofollow);
          const tempName = `.codex-apfs-dedup-${randomUUID()}`;
          const tempPath = join(dirname(target), tempName);
          note({ event: 'cloning', path: targetRel, source: sourceRel, temp: tempName, sha256: group.sha256 });
          cloneFdIntoDirectory(sourceFd, dirFd, tempName);
          // fclonefileat is atomic: only mark the name ours after success, so
          // EEXIST or a failed syscall can never delete an unrelated file.
          activeTemp = tempPath;
          cloneFd = openSync(activeTemp, constants.O_RDONLY | nofollow);
          if (hashFd(cloneFd) !== group.sha256) throw new Error('Clone SHA-256 mismatch');
          const cloneId = verifySharedClone(sourceFd, cloneFd);
          const cloneExtra = flagsAndAttributes(activeTemp);
          if (!cloneExtra.supported || cloneExtra.attrs !== targetExtra.attrs) throw new Error('Clone extended attributes or ACL mismatch');
          execFileSync('/usr/bin/touch', ['-r', target, activeTemp]);
          const clone = fstatSync(cloneFd, { bigint: true });
          const now = fstatSync(targetFd, { bigint: true });
          if (!preservedMetadata(t, clone) || !sameIdentity(t, now) || t.atimeNs !== now.atimeNs ||
              !sameIdentity(t, lstatSync(target, { bigint: true })) || !sameIdentity(s, lstatSync(source, { bigint: true })) ||
              flagsAndAttributes(target).attrs !== targetExtra.attrs) throw new Error('Metadata or identity verification failed');
          safePath(source); safePath(target);
          // This durable pre-rename record lets a reviewer recover even if
          // the process dies in the narrow interval after rename but before
          // the next journal entry, by comparing the two inode numbers.
          note({ event: 'ready-to-replace', path: targetRel, source: sourceRel, temp: tempName,
            oldInode: String(t.ino), cloneInode: String(clone.ino), cloneId, sha256: group.sha256 });
          // Recheck after the durable journal write and immediately before the
          // atomic rename: a concurrent edit during fsync must not be lost.
          safePath(source); safePath(target);
          const atRename = lstatSync(target, { bigint: true });
          if (!sameIdentity(t, atRename) || t.atimeNs !== atRename.atimeNs ||
              !sameIdentity(s, lstatSync(source, { bigint: true }))) throw new Error('Candidate changed before replacement');
          renameSync(activeTemp, target); activeTemp = null;
          note({ event: 'renamed', path: targetRel, source: sourceRel, cloneInode: String(clone.ino) });
          if (hashFd(cloneFd) !== group.sha256) throw new Error('Post-replacement SHA-256 mismatch');
          restoreTimes(cloneFd, t);
          const after = lstatSync(target, { bigint: true });
          const afterExtra = flagsAndAttributes(target);
          if (after.ino !== clone.ino || !preservedMetadata(t, after) || !afterExtra.supported || afterExtra.attrs !== targetExtra.attrs) throw new Error('Post-replacement verification failed');
          replaced++; logicalBytes += Number(t.size);
          note({ event: 'replaced', path: targetRel, source: sourceRel, sha256: group.sha256, bytes: Number(t.size) });
        } finally {
          if (cloneFd !== undefined) closeSync(cloneFd);
          if (dirFd !== undefined) closeSync(dirFd);
          if (targetFd !== undefined) closeSync(targetFd);
          if (sourceFd !== undefined) closeSync(sourceFd);
          cleanupTemp();
        }
      }
    }
    note({ event: 'complete', replaced, skipped, logicalBytes });
    console.log(`Completed: ${replaced} cloned copies; ${skipped} skipped; logical duplicates ${Math.round(logicalBytes / MiB)} MiB. Physical savings are not guaranteed.`);
  } catch (error) {
    note({ event: 'error', message: error.message, replaced, skipped, logicalBytes });
    throw error;
  } finally { closeSync(journal); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`Stopped: ${error.message}`); process.exitCode = 1; }
}
