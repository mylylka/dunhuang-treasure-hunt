// A 2D deep link must not download the terrain preview (and Three.js) first.
// The normal world entry still owns its initial station/session setup.
const path = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
const opening = path.length === 0 ? import('./world/terrain-preview-v001').then(module => module.mainReady) : import('./main');
void opening.catch(() => {
  const startup = document.getElementById('startup');
  if (!startup) return;
  startup.replaceChildren();
  const message = document.createElement('span');
  message.textContent = '游戏暂未加载成功';
  const retry = document.createElement('button');
  retry.type = 'button'; retry.textContent = '重新打开';
  retry.addEventListener('click', () => location.reload());
  startup.append(message, retry);
});
export {};
