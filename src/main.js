import weapons from './items/weapons/index.js';
import materials from './items/materials/index.js';
import armor from './items/armor/index.js';
import bionics from './items/bionics/index.js';
import chips from './items/chips/index.js';
import enemyTemplates from './enemies/index.js';
import { RUNTIME_SCRIPTS } from './runtimeScripts.js';

const DEV_MODE_STORAGE_KEY = 'coreboundDeveloperMode';

function resolveDeveloperMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('dev') === '1') {
    localStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
  } else if (params.get('dev') === '0') {
    localStorage.removeItem(DEV_MODE_STORAGE_KEY);
  }
  return localStorage.getItem(DEV_MODE_STORAGE_KEY) === 'true';
}

const developerMode = resolveDeveloperMode();
const EQUIPMENT_SLOTS = new Set(['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves', 'bionic', 'chip']);
const visibleOnly = (entries) => entries
  .filter(entry => developerMode || !entry.developerOnly)
  .map(entry => {
    if (!EQUIPMENT_SLOTS.has(entry.slot) || entry.levelRequirement != null) return entry;
    return { ...entry, levelRequirement: Number(entry.level || 1) };
  });

window.coreboundConfig = Object.freeze({
  developerMode,
  missingIcon: 'icons/default-icon.png'
});

window.weapons = visibleOnly(weapons);
window.materials = visibleOnly(materials);
window.armor = visibleOnly(armor);
window.bionics = visibleOnly(bionics);
window.chips = visibleOnly(chips);
window.enemies = visibleOnly(enemyTemplates);

window.loadItems = function loadItems() {
  window.items = [
    ...window.weapons,
    ...window.armor,
    ...window.bionics,
    ...window.materials,
    ...window.chips
  ];
  return window.items;
};

window.loadItems();

// A missing bespoke image should never render as the browser's broken-image icon.
document.addEventListener('error', (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (image.dataset.fallbackApplied === 'true') return;
  image.dataset.fallbackApplied = 'true';
  image.src = window.coreboundConfig.missingIcon;
}, true);

function loadClassicScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `./${path}`;
    script.async = false;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${path}`)), { once: true });
    document.head.appendChild(script);
  });
}

for (const path of RUNTIME_SCRIPTS) {
  await loadClassicScript(path);
}

window.dispatchEvent(new CustomEvent('coreboundReady', {
  detail: {
    developerMode,
    itemCount: window.items.length,
    enemyCount: window.enemies.length
  }
}));
