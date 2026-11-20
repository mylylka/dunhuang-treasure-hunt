import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { TERRAIN_ANCHORS, toTerrainPoint } from '../src/content/world/terrain-layout-v001.ts';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../src/services/first-gallery-entry.ts';
import { MUSIC_GALLERY_PROGRESS_KEYS } from '../src/services/music-gallery-progress.ts';
import { sanitizeConnectedGalleryCheckpoint } from '../src/world/connected-gallery-session.ts';
import { TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS } from '../src/world/terrain-rules-v001.ts';

const origin = process.env.DUNHUANG_DESERT_ORIGIN ?? 'http://127.0.0.1:5174';
const output = process.env.DUNHUANG_DESERT_REPORT ?? 'work/qa/cleared-vegetation-v001';
const decorationPath = '/assets/world/desert-decoration/';
const firstGalleryKey = 'dunhuang:first-gallery:v1';
const travelerKey = 'dunhuang:traveler-selection:v1';
const artwork = {
  artworkId: 'cleared-vegetation-check', levelId: 'coloring-feitian-lotus',
  artworkVersion: 'v001', colors: { '1': '#d6a35d' }, materials: {},
  submittedAt: '2026-11-20T00:00:00.000Z',
};
const progress = {
  version: 1, muralParts: ['lotus', 'bird', 'grapes'],
  caissonCompleted: true, coloringCompleted: true, ceremonySeen: true,
  introductionsSeen: ['mural', 'caisson', 'easel'], firstSuccessSeen: true,
  displayedArtworkId: artwork.artworkId, artworks: { [artwork.artworkId]: artwork },
};
const storageFixture = {
  [firstGalleryKey]: JSON.stringify(progress),
  [travelerKey]: 'tripo',
  ...Object.fromEntries(MUSIC_GALLERY_PROGRESS_KEYS.map(key => [key, 'yes'])),
};

const scenes = [
  {
    name: 'crescent-overlook', entry: '/', position: { x: 144, z: 21.7 },
    lookAt: { x: 258, z: 9 }, checkPanorama: true,
  },
  {
    name: 'first-gallery-entrance', entry: '/first-gallery-v001.html', position: { x: 124.8, z: 18.78 },
    lookAt: toTerrainPoint('courtyard', { x: -13, z: -7 }), nearbyVenue: 'courtyard',
  },
  {
    name: 'tower-steps', entry: '/first-gallery-v001.html', position: { x: 314, z: 59 },
    lookAt: TERRAIN_ANCHORS.cliffDoor, nearbyVenue: 'cliff',
  },
];

function isVegetationRequest(path) {
  if (path.startsWith(decorationPath)) return !/\/r0[1-5]\.glb$/i.test(path);
  return /^\/assets\/world\/.*(?:tree|shrub|plant|grass|reed|foliage|vegetation).*\.(?:glb|gltf|webp|png)(?:$|\/)/i.test(path);
}

function verifyFormerPlantFootprints() {
  const sources = [
    ['terrain-courtyard-hall-v003-workshop-shrubs'],
    ['terrain-music-music-courtyard-tree', 'music-courtyard'],
    ['tower-tree-stylized'],
    ['tower-tree-broad'],
  ];
  return sources.map(([id, walkSurface]) => {
    const original = TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS.find(solid => solid.id === id);
    assert(original, 'Missing historical vegetation fixture: ' + id);
    const position = original.circle
      ? { x: original.circle.x, z: original.circle.z }
      : { x: (original.minX + original.maxX) / 2, z: (original.minZ + original.maxZ) / 2 };
    const restored = sanitizeConnectedGalleryCheckpoint({
      version: 1, position, heading: 0, cameraYaw: 0, visitedEvents: [], walkSurface,
    }, true, true);
    assert.deepEqual(restored.position, position, 'Former planting still obstructs checkpoint: ' + id);
    return { id, position };
  });
}

async function readScene(page) {
  return page.evaluate(({ firstGalleryKey, travelerKey, musicKeys, checkpointKey }) => {
    const state = window.__terrain.inspect();
    const terrain = state.terrain.scene;
    const decoration = state.desertDecoration;
    const gallery = JSON.parse(localStorage.getItem(firstGalleryKey) ?? 'null');
    return {
      checkpoint: state.checkpoint,
      camera: state.camera,
      region: state.terrain.region,
      streaming: terrain.streaming,
      legacyShrubs: terrain.outdoorShrubs.length,
      musicTree: terrain.musicTree ?? null,
      towerTrees: terrain.towerTrees ?? null,
      decoration: {
        placementAssets: decoration.placements.map(item => item.assetId),
        treeImpostors: decoration.treeImpostors,
        resident: decoration.resident,
        pending: decoration.pending,
        mounted: decoration.mounted,
        overviewTriangles: decoration.overviewTriangles,
      },
      progress: {
        artworkId: gallery?.displayedArtworkId,
        savedArtwork: gallery?.artworks?.[gallery.displayedArtworkId],
        completed: gallery?.ceremonySeen,
        musicCompleted: musicKeys.every(key => localStorage.getItem(key) === 'yes'),
        traveler: localStorage.getItem(travelerKey),
        session: JSON.parse(sessionStorage.getItem(checkpointKey) ?? 'null'),
      },
    };
  }, { firstGalleryKey, travelerKey, musicKeys: MUSIC_GALLERY_PROGRESS_KEYS, checkpointKey: FIRST_GALLERY_WORLD_SESSION_KEY });
}

async function verifyScene(browser, scene) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(45_000);
    const errors = [];
    const requests = new Set();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.add(new URL(request.url()).pathname));
    const heading = Math.atan2(scene.position.x - scene.lookAt.x, scene.position.z - scene.lookAt.z);
    await page.addInitScript(({ storage, checkpointKey, position, yaw }) => {
      for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
      sessionStorage.setItem(checkpointKey, JSON.stringify({
        version: 1, position, heading: yaw, cameraYaw: yaw, visitedEvents: [],
      }));
    }, { storage: storageFixture, checkpointKey: FIRST_GALLERY_WORLD_SESSION_KEY, position: scene.position, yaw: heading });

    await page.goto(new URL(scene.entry, origin).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__terrain?.inspect()?.loaded, undefined, { timeout: 65_000 });
    const before = await readScene(page);
    const distance = Math.hypot(before.checkpoint.position.x - scene.position.x, before.checkpoint.position.z - scene.position.z);
    assert(distance < .1, `${scene.name}: seeded checkpoint was restored ${distance.toFixed(2)} m away`);
    assert(![...requests].some(path => path.startsWith(decorationPath)), 'Rock detail requested before the first movement');

    await page.keyboard.down('ArrowUp');
    try {
      await page.waitForFunction(start => {
        const { position } = window.__terrain.inspect().checkpoint;
        return Math.hypot(position.x - start.x, position.z - start.z) > .12;
      }, before.checkpoint.position);
    } finally {
      await page.keyboard.up('ArrowUp');
    }
    await page.waitForFunction(() => window.__terrain.inspect().desertDecoration?.resident.includes('r02'));
    if (scene.checkPanorama) {
      await page.waitForFunction(() => {
        const { streaming } = window.__terrain.inspect().terrain.scene;
        return streaming.musicBuildingVisible && streaming.cliffTowerVisible
          && streaming['cliff-rocks'] === 'ready' && streaming.scenery === 'ready';
      });
    }
    if (scene.nearbyVenue) {
      await page.waitForFunction(venue => {
        return window.__terrain.inspect().terrain.scene.streaming[venue] === 'ready';
      }, scene.nearbyVenue);
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const data = await readScene(page);
    assert.deepEqual(data.decoration.placementAssets, Array(11).fill('r02'));
    if (scene.checkPanorama) assert(data.decoration.overviewTriangles > 0, 'The distant rock silhouettes were lost');
    assert.deepEqual(data.decoration.treeImpostors, { ready: false, textureBytes: 0, visibleTrees: 0 });
    assert.equal(data.legacyShrubs, 0);
    assert.equal(data.musicTree, null);
    assert.equal(data.towerTrees, null);
    assert.deepEqual([...requests].filter(isVegetationRequest), [], 'Removed vegetation was requested');
    assert(data.progress.completed && data.progress.musicCompleted, 'Seeded gallery progress was lost');
    assert.deepEqual(data.progress.savedArtwork, artwork);
    assert.equal(data.progress.traveler, storageFixture[travelerKey]);
    assert.equal(data.progress.session?.version, 1);
    assert.deepEqual(errors, []);

    await page.screenshot({ path: join(output, scene.name + '.jpg'), type: 'jpeg', quality: 88 });
    return {
      name: scene.name, entry: scene.entry, requestedModelAssets: [...requests].filter(path => path.endsWith('.glb')),
      vegetationRequests: [...requests].filter(isVegetationRequest), ...data,
      progress: { ...data.progress, savedArtwork: data.progress.artworkId },
    };
  } finally {
    await context.close();
  }
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const results = [];
  for (const scene of scenes) {
    const report = await verifyScene(browser, scene);
    results.push(report);
    console.log(JSON.stringify({
      scene: report.name, entry: report.entry, rocks: report.decoration.placementAssets.length,
      treeImpostors: report.decoration.treeImpostors.visibleTrees, vegetationRequests: report.vegetationRequests.length,
    }));
  }
  const formerPlantFootprints = verifyFormerPlantFootprints();
  await writeFile(join(output, 'report.json'), JSON.stringify({
    origin, storage: 'isolated Playwright profiles', formerPlantFootprints, results,
  }, null, 2) + '\n');
} finally {
  await browser.close();
}
