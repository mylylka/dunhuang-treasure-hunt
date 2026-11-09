import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { closeSync, constants, fstatSync, mkdtempSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { alreadyShareClone, allowedTerrainRelative, cloneFdIntoDirectory, flagsAndAttributes, parseOptions, preservedMetadata, restoreTimes, resumePaths, sameIdentity, verifySharedClone } from '../../scripts/deduplicate-terrain-apfs.mjs';

describe('APFS terrain deduplication safety', () => {
  it('requires explicit apply, limit and an absolute new journal', () => {
    assert.equal(parseOptions([]).mode, 'dry-run');
    assert.throws(() => parseOptions(['--apply']));
    assert.throws(() => parseOptions(['--apply', '--limit', '0', '--log', '/tmp/a']));
    assert.throws(() => parseOptions(['--apply', '--limit', '1', '--log', 'relative']));
    assert.equal(parseOptions(['--apply', '--limit', '1', '--log', '/tmp/a']).limit, 1);
  });
  it('rejects traversal, other versions and noncanonical paths', () => {
    assert.equal(allowedTerrainRelative('v001/assets/a.glb'), true);
    assert.equal(allowedTerrainRelative('v013/a.png'), true);
    for (const path of ['v014/a', 'v000/a', '../v001/a', 'v001/../v002/a', 'v001//a', 'v001/a\n', '/v001/a', 'v001/a\\b']) assert.equal(allowedTerrainRelative(path), false);
  });
  it('checks target identity and requires an independent inode', () => {
    const base = { dev: 1n, ino: 2n, mode: 33188n, uid: 501n, gid: 20n, nlink: 1n, size: 123n, atimeNs: 2n, mtimeNs: 3n, ctimeNs: 4n, birthtimeNs: 1n };
    assert.equal(sameIdentity(base, { ...base }), true);
    assert.equal(sameIdentity(base, { ...base, ctimeNs: 5n }), false);
    assert.equal(preservedMetadata(base, { ...base }), false);
    assert.equal(preservedMetadata(base, { ...base, ino: 3n }), true);
    assert.equal(preservedMetadata(base, { ...base, ino: 3n, birthtimeNs: 2n }), false);
    assert.equal(preservedMetadata(base, { ...base, ino: 3n, nlink: 2n }), false);
  });
  it('refuses to resume an interrupted rename that lacks final verification', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dunhuang-apfs-journal-test-'));
    const unresolved = join(dir, 'unresolved.jsonl'), resolved = join(dir, 'resolved.jsonl');
    const ready = { event: 'ready-to-replace', path: 'v002/a', oldInode: '1', cloneInode: '2' };
    writeFileSync(unresolved, `${JSON.stringify({ event: 'cloning', path: 'v002/a' })}\n${JSON.stringify(ready)}\n`);
    writeFileSync(resolved, `${JSON.stringify(ready)}\n${JSON.stringify({ event: 'replaced', path: 'v002/a' })}\n`);
    assert.throws(() => resumePaths(unresolved), /unresolved/);
    assert.equal(resumePaths(resolved).has('v002/a'), true);
  });
  it('uses native clonefile without fallback and preserves source and xattrs', { skip: process.platform !== 'darwin' }, () => {
    // These newly created fixtures intentionally remain in /tmp; no user data
    // or fixture file is deleted or replaced by this test.
    const dir = mkdtempSync(join(tmpdir(), 'dunhuang-apfs-clone-test-'));
    const source = join(dir, 'source'), target = join(dir, 'target'), name = '.codex-apfs-dedup-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', clone = join(dir, name);
    writeFileSync(source, 'source-content');
    writeFileSync(target, 'source-content');
    execFileSync('/usr/bin/xattr', ['-w', 'com.example.dunhuang-test', 'marker', source]);
    execFileSync('/usr/bin/xattr', ['-w', 'com.example.dunhuang-test', 'marker', target]);
    execFileSync('python3', ['-c', 'import os,sys;os.utime(sys.argv[1],ns=(1550000000123456789,1550000000123456789));os.utime(sys.argv[2],ns=(1560000000987654321,1560000000987654321))', source, target]);
    const sourceFd = openSync(source, constants.O_RDONLY), targetFd = openSync(target, constants.O_RDONLY), dirFd = openSync(dir, constants.O_RDONLY);
    try {
      assert.equal(alreadyShareClone(sourceFd, targetFd), false, 'independent files must not be skipped');
      assert.throws(() => alreadyShareClone(-1, -1), 'query failures must stop rather than imply different groups');
      const beforeClone = fstatSync(sourceFd, { bigint: true });
      cloneFdIntoDirectory(sourceFd, dirFd, name);
      assert.equal(sameIdentity(beforeClone, fstatSync(sourceFd, { bigint: true })), true, 'cloning does not alter source identity/ctime');
      assert.equal(readFileSync(clone, 'utf8'), 'source-content');
      assert.notEqual(statSync(clone, { bigint: true }).ino, fstatSync(sourceFd, { bigint: true }).ino);
      assert.equal(execFileSync('/usr/bin/xattr', ['-p', 'com.example.dunhuang-test', clone], { encoding: 'utf8' }).trim(), 'marker');
      assert.deepEqual(flagsAndAttributes(clone), flagsAndAttributes(target));
      const cloneFd = openSync(clone, constants.O_RDONLY);
      try {
        assert.equal(alreadyShareClone(sourceFd, cloneFd), true, 'a previously cloned target is skipped');
        assert.notEqual(verifySharedClone(sourceFd, cloneFd), '0');
        const targetStat = statSync(target, { bigint: true });
        execFileSync('/usr/bin/touch', ['-r', target, clone]);
        assert.equal(fstatSync(cloneFd, { bigint: true }).atimeNs, targetStat.atimeNs);
        assert.equal(fstatSync(cloneFd, { bigint: true }).mtimeNs, targetStat.mtimeNs);
        restoreTimes(cloneFd, targetStat);
        assert.equal(fstatSync(cloneFd, { bigint: true }).atimeNs, targetStat.atimeNs);
        assert.equal(fstatSync(cloneFd, { bigint: true }).mtimeNs, targetStat.mtimeNs);
      } finally { closeSync(cloneFd); }
      assert.throws(() => cloneFdIntoDirectory(sourceFd, dirFd, name));
      writeFileSync(clone, 'changed-clone');
      assert.equal(readFileSync(source, 'utf8'), 'source-content');
    } finally { closeSync(sourceFd); closeSync(targetFd); closeSync(dirFd); }
  });
});
