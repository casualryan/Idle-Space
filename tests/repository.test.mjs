import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import enemies from '../src/enemies/index.js';
import armor from '../src/items/armor/index.js';
import bionics from '../src/items/bionics/index.js';
import chips from '../src/items/chips/index.js';
import materials from '../src/items/materials/index.js';
import weapons from '../src/items/weapons/index.js';
import { RUNTIME_SCRIPTS } from '../src/runtimeScripts.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allItems = [...weapons, ...materials, ...armor, ...bionics, ...chips];
const itemNames = new Set(allItems.map(item => item.name));
const enemyNames = new Set(enemies.map(enemy => enemy.name));

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

const COMBAT_RUNTIME_FILES = [
  'combatState.js',
  'combatController.js',
  'combatEffects.js',
  'combatResolution.js',
  'delveRewards.js',
  'delveManager.js',
  'combatUI.js',
  'delveUI.js',
  'combat.js'
];

function readCombatRuntime() {
  return COMBAT_RUNTIME_FILES.map(read).join('\n');
}

function evaluateClassic(relativePath, expression, extraGlobals = {}) {
  const quietConsole = Object.fromEntries(
    ['log', 'warn', 'error', 'info', 'debug'].map(method => [method, () => {}])
  );
  const window = { coreboundConfig: { developerMode: true } };
  const sandbox = {
    window,
    console: quietConsole,
    Date,
    Math,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    ...extraGlobals
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    `${read(relativePath)}\n;globalThis.__testResult = (${expression});`,
    sandbox,
    { filename: relativePath }
  );
  return sandbox.__testResult;
}

test('all registered content has a unique name and required equipment level', () => {
  assert.equal(itemNames.size, allItems.length, 'duplicate item names were registered');
  assert.equal(enemyNames.size, enemies.length, 'duplicate enemy names were registered');

  const equipment = allItems.filter(item =>
    ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves', 'bionic', 'chip'].includes(item.slot)
  );
  const missingLevels = equipment
    .filter(item => {
      const requirement = item.levelRequirement ?? item.level;
      if (Number.isFinite(Number(requirement))) return false;
      return !Number.isFinite(Number(requirement?.min)) && !Number.isFinite(Number(requirement?.max));
    })
    .map(item => item.name);
  assert.deepEqual(missingLevels, [], `equipment without a level requirement: ${missingLevels.join(', ')}`);
});

test('recipes and disassembly only reference registered items', () => {
  const recipes = evaluateClassic('recipes.js', 'window.recipes');
  const badOutputs = recipes.filter(recipe => !itemNames.has(recipe.name)).map(recipe => recipe.name);
  const badIngredients = recipes.flatMap(recipe =>
    Object.keys(recipe.ingredients || {})
      .filter(name => !itemNames.has(name))
      .map(name => `${recipe.name} -> ${name}`)
  );
  const badDisassembly = allItems.flatMap(item =>
    (item.disassembleResults || [])
      .filter(result => !itemNames.has(result.name))
      .map(result => `${item.name} -> ${result.name}`)
  );

  assert.equal(badOutputs.length, 0, `recipes with missing outputs: ${badOutputs.join(', ')}`);
  assert.equal(badIngredients.length, 0, `recipes with missing ingredients: ${badIngredients.join(', ')}`);
  assert.equal(badDisassembly.length, 0, `missing disassembly materials: ${badDisassembly.join(', ')}`);
});

test('loot pools, enemy tables, locations, and gathering references resolve', () => {
  const lootPools = evaluateClassic('lootPools.js', 'LOOT_POOLS');
  const locations = evaluateClassic('locations.js', 'allLocations');
  const gatheringActivities = evaluateClassic('gathering_activities.js', 'gatheringActivities');

  const badPoolItems = Object.entries(lootPools).flatMap(([poolName, pool]) =>
    pool.items
      .filter(entry => !itemNames.has(entry.itemName))
      .map(entry => `${poolName} -> ${entry.itemName}`)
  );
  const badEnemyPools = enemies.flatMap(enemy =>
    Object.values(enemy.lootConfig?.poolsByTier || {}).flat()
      .filter(poolName => !lootPools[poolName])
      .map(poolName => `${enemy.name} -> ${poolName}`)
  );
  const enemiesUsingDirectDrops = enemies.filter(enemy => 'lootTable' in enemy).map(enemy => enemy.name);
  const enemiesUsingLegacyStatuses = enemies.filter(enemy => 'statusEffects' in enemy).map(enemy => enemy.name);
  const badLocationEnemies = locations.flatMap(location =>
    location.enemies
      .filter(entry => !enemyNames.has(entry.name))
      .map(entry => `${location.name} -> ${entry.name}`)
  );
  const badGatheringItems = gatheringActivities.flatMap(activity =>
    [activity.item?.name, activity.rareFind?.name]
      .filter(Boolean)
      .filter(name => !itemNames.has(name))
      .map(name => `${activity.name} -> ${name}`)
  );

  assert.equal(badPoolItems.length, 0, `loot pools reference missing items: ${badPoolItems.join(', ')}`);
  assert.equal(badEnemyPools.length, 0, `enemies reference missing loot pools: ${badEnemyPools.join(', ')}`);
  assert.equal(enemiesUsingDirectDrops.length, 0, `enemies still use direct drops: ${enemiesUsingDirectDrops.join(', ')}`);
  assert.equal(enemiesUsingLegacyStatuses.length, 0, `enemies still use legacy statuses: ${enemiesUsingLegacyStatuses.join(', ')}`);
  assert.equal(badLocationEnemies.length, 0, `locations reference missing enemies: ${badLocationEnemies.join(', ')}`);
  assert.equal(badGatheringItems.length, 0, `gathering references missing items: ${badGatheringItems.join(', ')}`);
});

test('effect chances use percentage authoring and base weapons stay base weapons', () => {
  const allEffects = [...allItems, ...enemies].flatMap(entry => entry.effects || []);
  const invalidChances = allEffects
    .filter(effect => !Number.isFinite(effect.chance) || effect.chance < 0 || effect.chance > 100)
    .map(effect => effect.chance);
  assert.deepEqual(invalidChances, []);

  const ordinaryWeapons = [
    'Broken Phase Sword',
    'Makeshift Laser Sword',
    'Scorpion Sword',
    'Toxic Blade',
    'Phase Reaver',
    'Frost Cannon',
    'Neurotoxin Needler',
    'Acidic Ripper'
  ];
  for (const name of ordinaryWeapons) {
    const weapon = weapons.find(item => item.name === name);
    assert.ok(weapon, `${name} is not registered`);
    assert.equal((weapon.effects || []).length, 0, `${name} still has a bespoke effect`);
  }

  const pyroBlaster = weapons.find(item => item.name === 'Pyro Blaster');
  assert.equal(pyroBlaster.effects?.[0]?.enabled, false, 'area damage should remain dormant until multi-enemy combat');

  for (const name of ['Metal Carapace', 'Light Armor', 'Stealth Suit']) {
    const item = armor.find(candidate => candidate.name === name);
    assert.ok(item, `${name} is not registered`);
    assert.equal((item.effects || []).length, 0, `${name} still has a copied proc package`);
  }
});

test('placeholder passives only accept authored bonuses and lower-tier points unlock later tiers', () => {
  const passiveDefinitions = evaluateClassic('passives.js', 'passives');
  const passiveNames = new Set(passiveDefinitions.map(passive => passive.name));
  const invalidBonuses = allItems.flatMap(item => {
    const direct = Object.keys(item.passiveBonuses || {});
    const rolled = (item.rollGroups || []).flatMap(group => (group.from || []))
      .map(option => String(option.path || ''))
      .filter(pathName => pathName.startsWith('passiveBonuses.'))
      .map(pathName => pathName.slice('passiveBonuses.'.length));
    return [...direct, ...rolled]
      .filter(name => !passiveNames.has(name))
      .map(name => `${item.name} -> ${name}`);
  });
  assert.deepEqual(invalidBonuses, []);

  const player = {
    passiveAllocations: {
      'Swift Strikes': 2,
      'Critical Precision': 3,
      'Raw Power': 4
    },
    passivePoints: 0,
    gearPassiveBonuses: {},
    passiveBonuses: {}
  };
  const document = {
    addEventListener: () => {},
    getElementById: () => null
  };
  const helpers = evaluateClassic(
    'passivesUI.js',
    '({ getInvestedPassivePointsBelowTier, getPassiveMaxEffectiveRank })',
    { player, passives: passiveDefinitions, document }
  );
  assert.equal(helpers.getInvestedPassivePointsBelowTier(2), 2, 'tier 2 counted points invested in later tiers');
  assert.equal(helpers.getInvestedPassivePointsBelowTier(3), 5, 'tier 3 did not count all earlier tiers');
  assert.equal(helpers.getPassiveMaxEffectiveRank(passiveDefinitions.find(p => p.name === 'Swift Strikes')), 7);
  assert.equal(helpers.getPassiveMaxEffectiveRank(passiveDefinitions.find(p => p.name === 'Critical Precision')), 6);
});

test('only the authored Balanced combat style is player-facing', () => {
  const styles = evaluateClassic('skills.js', 'combatStyles');
  assert.deepEqual(Array.from(styles, style => style.id), ['balancedStyle']);
});

test('loot tier rolls are restricted to tiers populated by the defeated enemy', () => {
  const lootTiers = evaluateClassic('lootPools.js', 'LOOT_TIERS');
  const lootPools = evaluateClassic('lootPools.js', 'LOOT_POOLS');
  const helpers = evaluateClassic('lootHandler.js', '({ getAvailableLootTiers, rollLootTier })', {
    LOOT_TIERS: lootTiers,
    LOOT_POOLS: lootPools
  });
  const enemy = {
    lootConfig: {
      poolsByTier: {
        1: ['genericCommon'],
        2: [],
        4: ['advancedComponents']
      }
    }
  };
  assert.deepEqual(Array.from(helpers.getAvailableLootTiers(enemy)), [1, 4]);
  assert.equal(helpers.rollLootTier({}, [4]), 4);
});

test('developer fixtures are quarantined without hiding Knight O’Hare', () => {
  assert.equal(enemies.find(enemy => enemy.name === "Knight O'Hare")?.developerOnly, undefined);
  assert.equal(enemies.find(enemy => enemy.name === 'Big Bertha')?.developerOnly, true);
  assert.match(read('locations.js'), /name: "Testing Grounds"[\s\S]*?developerOnly: true/);
  assert.match(read('global.js'), /bionicSlots: \[null, null, null, null\]/);
});

test('classic runtime load order has no missing files or duplicate top-level lexical names', () => {
  const declarations = new Map();
  const duplicates = [];
  const functionDeclarations = new Map();
  const duplicateFunctions = [];

  for (const relativePath of RUNTIME_SCRIPTS) {
    assert.ok(fs.existsSync(path.join(repositoryRoot, relativePath)), `${relativePath} does not exist`);
    const source = read(relativePath);
    const declarationPattern = /^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
    for (const match of source.matchAll(declarationPattern)) {
      const previous = declarations.get(match[1]);
      if (previous) duplicates.push(`${match[1]} (${previous}, ${relativePath})`);
      else declarations.set(match[1], relativePath);
    }
    const functionPattern = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    for (const match of source.matchAll(functionPattern)) {
      const previous = functionDeclarations.get(match[1]);
      if (previous) duplicateFunctions.push(`${match[1]} (${previous}, ${relativePath})`);
      else functionDeclarations.set(match[1], relativePath);
    }
  }

  assert.deepEqual(duplicates, [], `classic scripts redeclare lexical globals: ${duplicates.join(', ')}`);
  assert.deepEqual(duplicateFunctions, [], `classic scripts silently override functions: ${duplicateFunctions.join(', ')}`);
});

test('combat runtime keeps state, rules, sequencing, rewards, and rendering in explicit owners', () => {
  const runtimeCombatFiles = RUNTIME_SCRIPTS.filter(file => COMBAT_RUNTIME_FILES.includes(file));
  assert.deepEqual(runtimeCombatFiles, COMBAT_RUNTIME_FILES, 'combat subsystem dependency order changed');

  const logicFiles = [
    'combatState.js',
    'combatController.js',
    'combatEffects.js',
    'combatResolution.js',
    'delveRewards.js',
    'delveManager.js'
  ];
  for (const file of logicFiles) {
    assert.doesNotMatch(read(file), /\bdocument\./, `${file} reaches into the DOM instead of its UI adapter`);
  }

  const expectedOwners = new Map([
    ['combatController.js', ['startCombat', 'stopCombat']],
    ['combatResolution.js', ['playerAttack', 'enemyAttack']],
    ['combatEffects.js', ['applyDamage']],
    ['delveManager.js', ['startAdventure', 'beginNextMonsterInSequence']],
    ['delveRewards.js', ['finalizeDelveLoot']],
    ['delveUI.js', ['displayAdventureLocations', 'updateDelveBagUI']]
  ]);
  for (const [file, functions] of expectedOwners) {
    const source = read(file);
    for (const name of functions) {
      assert.match(source, new RegExp(`function\\s+${name}\\s*\\(`), `${name} is no longer owned by ${file}`);
    }
  }

  const bootstrap = read('combat.js');
  assert.ok(bootstrap.split('\n').length <= 15, 'combat bootstrap accumulated subsystem behavior');
  assert.doesNotMatch(bootstrap, /\bdocument\./, 'combat bootstrap contains rendering behavior');
  assert.match(read('combatState.js'), /window\.coreboundCombatState\s*=\s*combatState/);
});

test('classic runtime evaluates in its declared order', () => {
    const storage = new Map();
    const runtimeInitializers = [];
  const document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      addEventListener: () => {},
      append: () => {},
      appendChild: () => {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      dataset: {},
      style: {}
    }),
    body: { appendChild: () => {} },
    head: { appendChild: () => {} }
  };
  const sandbox = {
    console: Object.fromEntries(['log', 'warn', 'error', 'info', 'debug'].map(method => [method, () => {}])),
    document,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    navigator: {},
    location: { search: '' },
    CustomEvent: class CustomEvent {},
    Event: class Event {},
    HTMLImageElement: class HTMLImageElement {},
    Date,
    Math,
    JSON,
    URLSearchParams,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.dispatchEvent = () => true;
  sandbox.registerCoreboundInitializer = initializer => runtimeInitializers.push(initializer);
  sandbox.coreboundConfig = { developerMode: false, missingIcon: 'icons/default-icon.png' };
  sandbox.weapons = weapons;
  sandbox.materials = materials;
  sandbox.armor = armor;
  sandbox.bionics = bionics;
  sandbox.chips = chips;
  sandbox.enemies = enemies.filter(enemy => !enemy.developerOnly);
  sandbox.items = allItems.filter(item => !item.developerOnly);

  vm.createContext(sandbox);
  for (const relativePath of RUNTIME_SCRIPTS) {
    vm.runInContext(read(relativePath), sandbox, { filename: relativePath });
  }

  assert.ok(runtimeInitializers.length > 0, 'classic runtime did not register its startup work');
});

test('async runtime loading cannot miss the one-time DOMContentLoaded event', () => {
  const mainSource = read('src/main.js');
  assert.match(mainSource, /window\.registerCoreboundInitializer/);
  assert.match(mainSource, /await documentReady/);

  const directDomReadyListeners = RUNTIME_SCRIPTS.filter(relativePath =>
    /document\.addEventListener\(['"]DOMContentLoaded['"]/.test(read(relativePath))
  );
  assert.deepEqual(
    directDomReadyListeners,
    [],
    `late-loaded runtime files still subscribe directly to DOMContentLoaded: ${directDomReadyListeners.join(', ')}`
  );
});

test('fabrication cards keep intrinsic row height inside the scrolling screen', () => {
  const styles = read('style.css');
  const recipeContainerRule = styles.match(/\.recipe-container\s*\{([^}]*)\}/)?.[1] || '';
  const recipeCardRule = styles.match(/\.recipe-card\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(recipeContainerRule, /grid-auto-rows:\s*max-content/);
  assert.match(recipeContainerRule, /flex:\s*0 0 auto/);
  assert.match(recipeContainerRule, /overflow:\s*visible/);
  assert.match(recipeCardRule, /width:\s*100%/);
  assert.match(recipeCardRule, /height:\s*auto/);
});

test('Codex sources live enemy, loot, and debuff registries', () => {
  const source = read('codex.js');
  assert.match(source, /window\.enemies/);
  assert.match(source, /window\.debuffs/);
  assert.match(source, /LOOT_POOLS/);
  assert.match(source, /window\.debuffBaseChance/);
});

test('enemy Codex presents interpreted combat and loot information', () => {
  const source = read('codex.js');
  assert.match(source, /calculateItemRollOdds/);
  assert.match(source, /Base loot chance/);
  assert.match(source, /Items on success/);
  assert.match(source, /Chance for each generated item/);
  assert.match(source, /LEVEL_BANDS/);
  assert.match(source, /DAMAGE_COLORS/);
  assert.doesNotMatch(source, /\(weight \$\{/);
  assert.ok(enemies.every(enemy => !/Corebound progression enemy for zone/i.test(enemy.description || '')));
});

test('delve dashboard keeps primary stats visible and advanced telemetry collapsible', () => {
  const html = read('index.html');
  const requiredIds = [
    'player-hp-bar', 'player-total-dps', 'player-damage-types', 'player-defense-types',
    'enemy-hp-bar', 'enemy-total-dps', 'enemy-damage-types', 'enemy-defense-types',
    'delve-bag-container', 'log-messages'
  ];
  for (const id of requiredIds) {
    assert.equal((html.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length, 1, `${id} must appear exactly once`);
  }
  assert.match(html, /<details class="advanced-telemetry">/);
  assert.match(html, /class="container combat-dashboard"/);
});

test('consumable combat debuffs carry the approved mechanics', () => {
  const damageCalls = [];
  const definitions = evaluateClassic('debuffs.js', 'debuffs', {
    applyEffectDamage: (target, amount, damageType, ignoreDefense, source) => {
      damageCalls.push({ target, amount, damageType, ignoreDefense, source });
    }
  });
  assert.equal(definitions.exposed.hitsRemaining, 3);
  assert.match(definitions.exposed.description, /maximum damage roll/i);
  assert.equal(definitions.zapped.critDamageBonus, 0.5);
  assert.match(definitions.zapped.description, /guaranteed.*critical.*\+50%/i);
  assert.match(definitions.shocked.description, /additional 100%.*electric/i);
  assert.match(definitions.unstable.description, /radiation damage equal/i);
  assert.equal(typeof definitions.unstable.onAfterAttack, 'function');

  const shocked = { ...definitions.shocked };
  const shockedTarget = { name: 'Target', activeDebuffs: [shocked] };
  shocked.onReceiveHit(shockedTarget, { total: 80 });
  assert.equal(shockedTarget.activeDebuffs.length, 0);
  assert.equal(damageCalls[0].amount, 80);
  assert.equal(damageCalls[0].damageType, 'electric');
  assert.equal(damageCalls[0].ignoreDefense, false);

  const unstable = { ...definitions.unstable };
  const unstableAttacker = { name: 'Attacker', activeDebuffs: [unstable] };
  unstable.onAfterAttack(unstableAttacker, {}, { total: 125 });
  assert.equal(unstableAttacker.activeDebuffs.length, 0);
  assert.equal(damageCalls[1].amount, 125);
  assert.equal(damageCalls[1].damageType, 'radiation');
  assert.equal(damageCalls[1].ignoreDefense, false);

  assert.equal(definitions.seepingWound.maxStacks, 5);
  assert.equal(definitions.seepingWound.variableMaxStacks, true);
  assert.equal(definitions.severedLimb.maxStacks, 1);
  assert.equal(definitions.severedLimb.variableMaxStacks, true);

  const severSource = { totalStats: { maxSeveredLimbs: 2 } };
  const severTarget = { name: 'Target', totalStats: {}, activeDebuffs: [] };
  const applyDebuff = evaluateClassic('debuffs.js', 'applyDebuff');
  applyDebuff(severTarget, 'severedLimb', severSource);
  applyDebuff(severTarget, 'severedLimb', severSource);
  applyDebuff(severTarget, 'severedLimb', severSource);
  assert.equal(severTarget.activeDebuffs[0].stacks, 2);
  assert.equal(severTarget.totalStats.damageMultipliers.severedLimb, 0.75 ** 2);
});

test('incoming-hit debuffs consume on player, enemy, and combo hit paths', () => {
  const combatSource = readCombatRuntime();
  const incomingHookCalls = [...combatSource.matchAll(/runIncomingHitDebuffs\(/g)].length;
  assert.ok(incomingHookCalls >= 4, 'incoming-hit hooks are not wired into every damage path');

  const result = evaluateClassic(
    'debuffs.js',
    `(() => {
      const target = { name: 'Target', activeDebuffs: [], totalStats: { defenseTypes: {} } };
      applyDebuff(target, 'exposed');
      target.activeDebuffs[0].onReceiveHit(target, { total: 10 });
      target.activeDebuffs[0].onReceiveHit(target, { total: 10 });
      applyDebuff(target, 'exposed');
      const refreshedCharges = target.activeDebuffs[0].hitsRemaining;
      target.activeDebuffs[0].onReceiveHit(target, { total: 10 });
      target.activeDebuffs[0].onReceiveHit(target, { total: 10 });
      target.activeDebuffs[0].onReceiveHit(target, { total: 10 });
      return { refreshedCharges, remaining: target.activeDebuffs.length };
    })()`,
    { applyEffectDamage: () => {} }
  );

  assert.equal(result.refreshedCharges, 3);
  assert.equal(result.remaining, 0);
});

test('timed damage debuffs deliver their final scheduled tick before expiring', () => {
  let now = 0;
  const clock = { now: () => now, set: value => { now = value; } };
  const damageCalls = [];
  const result = evaluateClassic(
    'debuffs.js',
    `(() => {
      Date.set(0);
      const target = { name: 'Target', activeDebuffs: [], totalStats: { defenseTypes: {} } };
      applyDebuff(target, 'ablaze', null, 50);
      Date.set(5000);
      processDebuffs(target, 5);
      return { remaining: target.activeDebuffs.length };
    })()`,
    {
      Date: clock,
      player: {},
      enemy: {},
      applyEffectDamage: (...args) => damageCalls.push(args)
    }
  );

  assert.equal(result.remaining, 0);
  assert.equal(damageCalls.length, 5);
  assert.equal(damageCalls.reduce((sum, call) => sum + call[1], 0), 100);
});

test('indefinite debuffs declare whether they are permanent or consumed', () => {
  const definitions = evaluateClassic('debuffs.js', 'debuffs', { applyEffectDamage: () => {} });
  const ambiguous = Object.entries(definitions)
    .filter(([, definition]) => definition.duration === -1)
    .filter(([, definition]) => !definition.permanent && !definition.consumesOn)
    .map(([id]) => id);
  assert.deepEqual(ambiguous, []);
});

test('overlapping timed stat debuffs restore without erasing one another', () => {
  const result = evaluateClassic(
    'debuffs.js',
    `(() => {
      const target = {
        name: 'Target',
        activeDebuffs: [],
        totalStats: {
          attackSpeed: 2,
          defenseTypes: { physicalResistance: 40, elementalResistance: 20, chemicalResistance: 10 }
        }
      };
      const source = { totalStats: { debuffBonus: 0 } };
      applyDebuff(target, 'scorched', source);
      applyDebuff(target, 'crushed', source);
      applyDebuff(target, 'frigid', source);
      applyDebuff(target, 'rusted', source);
      removeDebuff(target, 'scorched');
      removeDebuff(target, 'frigid');
      removeDebuff(target, 'crushed');
      removeDebuff(target, 'rusted');
      return target.totalStats;
    })()`,
    { player: {}, enemy: {}, applyEffectDamage: () => {} }
  );

  assert.ok(Math.abs(result.attackSpeed - 2) < 1e-9);
  assert.ok(Math.abs(result.defenseTypes.physicalResistance - 40) < 1e-9);
  assert.ok(Math.abs(result.defenseTypes.elementalResistance - 20) < 1e-9);
  assert.ok(Math.abs(result.defenseTypes.chemicalResistance - 10) < 1e-9);
});

test('Marty unlocks only common enemy components after five drops', () => {
  const lootPools = evaluateClassic('lootPools.js', 'LOOT_POOLS');
  const commonNames = new Set(Object.values(lootPools)
    .filter(pool => pool.tier === 1)
    .flatMap(pool => pool.items.map(entry => entry.itemName)));
  const shopWindow = {
    coreboundConfig: { developerMode: false },
    componentDropCounts: {},
    registerCoreboundInitializer: () => {}
  };
  const shop = evaluateClassic(
    'npcshops.js',
    '({ npcs, MARTY_COMMON_COMPONENTS, isShopItemVisible })',
    { window: shopWindow }
  );

  assert.deepEqual(Array.from(shop.npcs, npc => npc.name), ['Marty', 'Clarissa', 'Zara']);
  assert.ok(shop.MARTY_COMMON_COMPONENTS.every(entry => commonNames.has(entry.itemName)));
  assert.ok(shop.MARTY_COMMON_COMPONENTS.every(entry => !shop.isShopItemVisible(entry)));
  shopWindow.componentDropCounts['Scrap Metal'] = 5;
  assert.equal(shop.isShopItemVisible(shop.MARTY_COMMON_COMPONENTS[0]), true);
  assert.equal(shop.npcs.find(npc => npc.name === 'Clarissa').inventory.some(item => item.itemName === 'Minor Electronic Circuit'), false);
});

test('area XP rewards advance each five-level band in a reasonable number of clears', () => {
  const areas = evaluateClassic('locations.js', 'locations');
  const enemyByName = new Map(enemies.map(entry => [entry.name, entry]));
  const xpForLevel = level => level <= 1 ? 100 : Math.round((xpForLevel(level - 1) + 15) * 1.15);

  for (const area of areas.filter(entry => !entry.developerOnly && entry.recommendedLevel < 50)) {
    const totalWeight = area.enemies.reduce((sum, entry) => sum + entry.spawnRate, 0);
    const xpPerFight = area.enemies.reduce((sum, entry) => {
      return sum + (entry.spawnRate / totalWeight) * enemyByName.get(entry.name).experienceValue;
    }, 0);
    const xpPerClear = xpPerFight * area.numFights;
    const bandStart = area.recommendedLevel;
    const bandXp = Array.from({ length: Math.min(5, 50 - bandStart) }, (_, offset) => xpForLevel(bandStart + offset))
      .reduce((sum, value) => sum + value, 0);
    const expectedClears = bandXp / xpPerClear;

    assert.ok(expectedClears >= 7 && expectedClears <= 13,
      `${area.name} requires about ${expectedClears.toFixed(1)} clears for its level band`);
  }
});

test('max-level areas form four ordered endgame tiers', () => {
  const areas = evaluateClassic('locations.js', 'locations').filter(area => area.locationCategory === 'endgame');
  assert.deepEqual(Array.from(areas, area => area.endgameTier), [1, 2, 3, 4]);
  assert.ok(areas.every(area => area.recommendedLevel === 50));
  assert.ok(areas.every(area => area.enemies.length >= 5));

  const enemyByName = new Map(enemies.map(entry => [entry.name, entry]));
  for (const area of areas) {
    assert.ok(area.enemies.every(entry => enemyByName.get(entry.name)?.level > 50));
  }
  for (let index = 1; index < areas.length; index++) {
    assert.ok(areas[index].numFights >= areas[index - 1].numFights);
    assert.ok(areas[index].enemies[0].empoweredChance >= areas[index - 1].enemies[0].empoweredChance);
  }
});

test('delve visibility and endgame clears are persistent progression', () => {
  const combat = readCombatRuntime();
  const global = read('global.js');

  assert.match(combat, /function getVisibleDelveLocations/);
  assert.match(combat, /recommendedLevel \|\| 1\) <= playerLevel \+ 2/);
  assert.match(combat, /Number\(candidate\.endgameTier\) === tier - 1/);
  assert.match(combat, /completed\[previousTier\.name\] > 0/);
  assert.match(combat, /recordDelveCompletion\(currentDelveLocation\);\s*finalizeDelveLoot\(\);/);
  assert.match(global, /completedDelveLocations:/);
  assert.match(global, /completedDelveLocations = gameState\.completedDelveLocations/);
  assert.match(global, /completedDelveLocations = \{\}/);
});

test('balance simulation preserves the authored difficulty curve', () => {
  const output = execFileSync(process.execPath, ['scripts/analyze-progression-balance.mjs'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  });
  const report = JSON.parse(output);
  const leveling = report.filter(area => area.contentBand === 'leveling');
  const endgame = report.filter(area => area.contentBand === 'max-level');
  const starterRate = leveling.find(area => area.starter).starter.result.winRate;
  const middleRates = leveling
    .filter(area => area.entry.profile.level >= 16 && area.entry.profile.level <= 41)
    .map(area => area.entry.result.winRate);

  assert.ok(starterRate >= 0.5 && starterRate <= 0.7);
  assert.ok(middleRates.reduce((sum, rate) => sum + rate, 0) / middleRates.length >= 0.85);
  assert.ok(endgame[0].baseline.result.winRate >= 0.8);

  for (let index = 1; index < endgame.length; index++) {
    assert.ok(endgame[index].baseline.result.winRate < endgame[index - 1].baseline.result.winRate);
    assert.ok(endgame[index].fineTuned.result.winRate < endgame[index - 1].fineTuned.result.winRate);
  }

  assert.ok(endgame[2].fineTuned.result.winRate >= 0.6 && endgame[2].fineTuned.result.winRate <= 0.9);
  assert.ok(endgame[3].fineTuned.result.winRate >= 0.25 && endgame[3].fineTuned.result.winRate <= 0.6);
});

test('new-character, fabrication, empowered reward, and claim-cache rules remain wired', () => {
  const combat = readCombatRuntime();
  assert.match(read('global.js'), /const STARTING_CREDITS = 1000/);
  assert.match(read('fabrication.js'), /Object\.keys\(ongoingFabrications\)\.length > 0/);
  assert.match(combat, /enemy\.isEmpowered = true/);
  assert.match(combat, /xp = Math\.floor\(xp \* 1\.5\)/);
  assert.match(combat, /Starting a new delve destroyed/);
  assert.match(combat, /Auto re-deploy paused until the Delve Claim Cache is cleared/);
  assert.match(read('global.js'), /delveClaimCache/);
  assert.match(combat, /function preparePlayerForCombat/);
  assert.doesNotMatch(combat, /player\.baseStats = JSON\.parse\(JSON\.stringify\(playerBaseStats\)\)/);
  assert.match(read('buffs.js'), /damageTypes:\s*\{\s*kinetic: 5/);
});

test('Exposed maximizes the roll and Zapped adds 50% critical damage', () => {
  const baseEntity = {
    name: 'Test Entity',
    totalStats: {
      damageTypes: { slashing: 100 },
      damageTypeModifiers: { slashing: 1 },
      damageGroupModifiers: { physical: 1, elemental: 1, chemical: 1 },
      damageMultipliers: {},
      defenseTypes: { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 },
      precision: 0,
      deflection: 0,
      criticalChance: 0,
      criticalMultiplier: 1.5
    }
  };
  const result = evaluateClassic(
    'stats.js',
    `(() => {
      const attacker = ${JSON.stringify(baseEntity)};
      const defender = ${JSON.stringify(baseEntity)};
      defender.activeDebuffs = [
        { name: 'Exposed' },
        { name: 'Zapped', critDamageBonus: 0.5 }
      ];
      return calculateDamage(attacker, defender);
    })()`,
    {
      player: {},
      removeDebuff: (target, name) => {
        target.activeDebuffs = target.activeDebuffs.filter(debuff => debuff.name !== name);
      },
      logMessage: () => {}
    }
  );

  assert.equal(result.damageRoll, 1);
  assert.equal(result.isCritical, true);
  assert.equal(result.total, 200);
});
