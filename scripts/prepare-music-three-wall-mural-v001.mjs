import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const art = new URL('art-source/world/music-three-wall-mural/v001/', root);
const runtime = new URL('public/assets/world/music-three-wall-mural/v001/', root);
const master = new URL('panorama-master.png', art);
const walls = [
  { name: 'back-stair', width: 3445, mobileWidth: 1722 },
  { name: 'east', width: 3653, mobileWidth: 1827 },
  { name: 'flying-reverse', width: 3802, mobileWidth: 1901 },
];
const height = 3072;
const totalWidth = walls.reduce((sum, wall) => sum + wall.width, 0);

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

mkdirSync(runtime, { recursive: true });
// Remove the editing guide's letterbox. The 27-pixel left trim and 48-pixel
// reflected edge align the temple axis to the center of the east wall.
// Both operations are confined to outer margin ornament.
const projection = [
  'crop=2172:618:0:52:exact=1',
  'pad=2220:618:0:0',
  'fillborders=right=48:mode=mirror',
  'crop=2193:618:27:0:exact=1',
  `scale=${totalWidth}:${height}:flags=lanczos`,
  'format=rgb24',
].join(',');
run('ffmpeg', [
  '-v', 'error', '-y', '-i', fileURLToPath(new URL('wide-edit.png', art)),
  '-vf', projection, '-frames:v', '1', '-update', '1', fileURLToPath(master),
]);

let x = 0;
for (const wall of walls) {
  const crop = ['-crop', String(x), '0', String(wall.width), String(height)];
  const encode = (suffix, quality, resize = []) => {
    run('cwebp', [
      '-quiet', '-q', String(quality), '-m', '6', '-sharp_yuv', ...crop, ...resize,
      fileURLToPath(master), '-o', fileURLToPath(new URL(`${wall.name}${suffix}.webp`, runtime)),
    ]);
  };
  encode('', 91);
  encode('-mobile', 84, ['-resize', String(wall.mobileWidth), '1536']);
  x += wall.width;
}
