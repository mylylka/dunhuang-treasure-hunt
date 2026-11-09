import { execFileSync } from 'node:child_process';
import { lstatSync, readdirSync, realpathSync, unlinkSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const root = realpathSync(new URL('..', import.meta.url));
const work = join(root, 'work');
const hour = 60 * 60 * 1000;
const traceOutputName = /^test-results(?:-[a-z0-9][a-z0-9-]*)?$/;
const temporaryZipName = /^2d-playtest-[a-z0-9][a-z0-9-]*\.zip$/;
const temporaryZipMarker = 'dunhuang-temporary-2d-playtest-v1';
const legacyTraceOutputs = [
  'deer-story-v002-e2e',
  'world/first-gallery-v001/e2e-entry',
  'world/mogao-exhibit-v001/mural-skip-v001/official-e2e',
];

function run(command, args, maxBuffer = 4 * 1024 * 1024) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer, timeout: 15000 });
}

function trackedWorkPaths() {
  return new Set(run('git', ['-C', root, 'ls-files', '--cached', '-z', '--', 'work']).split('\0'));
}

function safePath(path, isDirectory = false) {
  const info = lstatSync(path, { throwIfNoEntry: false });
  if (!info || (isDirectory ? !info.isDirectory() : !info.isFile() || info.nlink !== 1)) return;
  if (realpathSync(path) === path) return info;
}

function zipRead(args, maxBuffer) {
  try {
    return run('unzip', args, maxBuffer);
  } catch (error) {
    // Corrupt, unsupported, or unexpectedly large ZIPs stay on disk.
    if (error.code === 'ENOBUFS' || Number.isInteger(error.status)) return;
    throw error;
  }
}

function zipEntries(path) {
  const output = zipRead(['-Z', '-1', path]);
  return new Set(output?.trimEnd().split('\n'));
}

function isPlaywrightTrace(path, allowRunnerOnly) {
  const entries = zipEntries(path);
  if (!entries.has('test.trace')) return false;
  const hasBrowserTrace = [...entries].some(entry => {
    const chunk = /^(\d+)-trace\.network$/.exec(entry)?.[1];
    return chunk !== undefined && entries.has(`${chunk}-trace.trace`);
  });
  if (!hasBrowserTrace && !(allowRunnerOnly && [...entries].some(entry => /^attachments\/[a-f0-9]{40}$/.test(entry)))) return false;
  const firstLine = zipRead(['-p', path, 'test.trace'])?.split('\n', 1)[0];
  try {
    const header = JSON.parse(firstLine);
    return header?.type === 'context-options' && header.origin === 'testRunner'
      && Number.isInteger(header.version) && /^\d+\.\d+\.\d+/.test(header.playwrightVersion ?? '');
  } catch {
    return false;
  }
}

function isTemporary2DZip(path) {
  const entries = zipEntries(path);
  const marker = `.${temporaryZipMarker}`;
  return entries.has('index.html') && entries.has(marker)
    && ![...entries].some(entry => /(?:^|\/)assets\/world\/|\.(?:glb|gltf|blend|fbx)$/i.test(entry))
    && zipRead(['-p', path, marker], 4096) === `${temporaryZipMarker}\n`;
}

function findTraces(directory, allowRunnerOnly, candidates, tracked, now, allTraces) {
  if (tracked.has(relative(root, directory)) || !safePath(directory, true)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      findTraces(path, allowRunnerOnly, candidates, tracked, now, allTraces);
    } else if (entry.isFile() && entry.name === 'trace.zip' && !tracked.has(relative(root, path))) {
      const info = safePath(path);
      const retention = allTraces ? hour / 12 : 7 * 24 * hour;
      if (info && now - Math.max(info.mtimeMs, info.ctimeMs) >= retention && isPlaywrightTrace(path, allowRunnerOnly)) {
        candidates.push({ kind: 'traces', path, info });
      }
    }
  }
}

function findTemporary2DZips(candidates, tracked, now) {
  const directory = join(work, 'temporary-2d-playtests');
  if (tracked.has(relative(root, directory)) || !safePath(directory, true)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !temporaryZipName.test(entry.name)) continue;
    const path = join(directory, entry.name);
    if (tracked.has(relative(root, path))) continue;
    const info = safePath(path);
    if (info && now - Math.max(info.mtimeMs, info.ctimeMs, info.birthtimeMs) >= 48 * hour && isTemporary2DZip(path)) {
      candidates.push({ kind: 'temporary2DZips', path, info });
    }
  }
}

function findOpenPaths(candidates) {
  const open = new Set();
  for (let index = 0; index < candidates.length; index += 100) {
    const paths = candidates.slice(index, index + 100).map(candidate => candidate.path);
    let output;
    try {
      output = run('lsof', ['-nP', '-F0n', '--', ...paths]);
    } catch (error) {
      // lsof returns 1 if any of the requested paths was not open.
      if (error.status !== 1 || error.stderr) throw error;
      output = error.stdout;
    }
    for (const field of output.split('\0')) {
      const value = field.trimStart();
      if (value.startsWith('n')) open.add(value.slice(1));
    }
  }
  return open;
}

function unchanged(path, original) {
  const current = safePath(path);
  return current && current.dev === original.dev && current.ino === original.ino && current.size === original.size
    && current.mtimeMs === original.mtimeMs && current.ctimeMs === original.ctimeMs;
}

function main(args) {
  if (args.includes('--help')) {
    console.log(`node scripts/prune-playtest-artifacts.mjs [--apply] [--all-traces] [--list]\n`
      + '默认预览 7 天前的 Playwright 回放及 48 小时前的受管 2D 临时包。\n'
      + '--apply 执行清理，--all-traces 将回放保留期临时缩短至 5 分钟，--list 列出相对路径。\n'
      + `2D 临时包放在 work/temporary-2d-playtests/，命名为 2d-playtest-*.zip，根目录需有 index.html 和 .${temporaryZipMarker}。\n`
      + `标记内容为 ${temporaryZipMarker} 加一个换行。生成时使用其他后缀，完成后改名。需要暂留时加同名 .zip.in-use 文件。`);
    return;
  }
  if (args.some(arg => !['--apply', '--all-traces', '--list'].includes(arg))) throw new Error('未知参数，运行 --help 查看用法。');
  const apply = args.includes('--apply');
  const allTraces = args.includes('--all-traces');
  const candidates = [];
  const now = Date.now();
  if (safePath(work, true)) {
    const tracked = trackedWorkPaths();
    for (const entry of readdirSync(work, { withFileTypes: true })) {
      if (entry.isDirectory() && traceOutputName.test(entry.name)) {
        findTraces(join(work, entry.name), true, candidates, tracked, now, allTraces);
      }
    }
    for (const directory of legacyTraceOutputs) {
      findTraces(join(work, directory), false, candidates, tracked, now, allTraces);
    }
    findTemporary2DZips(candidates, tracked, now);
  }
  const summary = { mode: apply ? 'apply' : 'preview', traces: 0, temporary2DZips: 0, logicalBytes: 0, active: 0, changed: 0 };
  const open = findOpenPaths(candidates);
  const tracked = apply && candidates.length ? trackedWorkPaths() : new Set();
  try {
    for (const { kind, path, info } of candidates) {
      if (open.has(path) || (kind === 'temporary2DZips' && lstatSync(`${path}.in-use`, { throwIfNoEntry: false }))) {
        summary.active++;
        continue;
      }
      const projectPath = relative(root, path);
      if (tracked.has(projectPath) || !unchanged(path, info)) {
        summary.changed++;
        continue;
      }
      if (apply) unlinkSync(path);
      summary[kind]++;
      summary.logicalBytes += info.size;
      if (args.includes('--list')) console.log(projectPath);
    }
  } finally {
    console.log(JSON.stringify(summary));
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`清理停止。${error.message}`);
  process.exitCode = 1;
}
