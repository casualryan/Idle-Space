import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

import enemies from '../src/enemies/index.js';
import armor from '../src/items/armor/index.js';
import bionics from '../src/items/bionics/index.js';
import chips from '../src/items/chips/index.js';
import materials from '../src/items/materials/index.js';
import weapons from '../src/items/weapons/index.js';
import { RUNTIME_SCRIPTS } from '../src/runtimeScripts.js';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const allItems = [...weapons, ...materials, ...armor, ...bionics, ...chips];
const itemNames = new Set(allItems.map(item => item.name));
const enemyNames = new Set(enemies.map(enemy => enemy.name));

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
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

test('classic runtime evaluates in its declared order', () => {
  const storage = new Map();
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
});

test('Codex sources live enemy, loot, and debuff registries', () => {
  const source = read('codex.js');
  assert.match(source, /window\.enemies/);
  assert.match(source, /window\.debuffs/);
  assert.match(source, /LOOT_POOLS/);
  assert.match(source, /window\.debuffBaseChance/);
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

test('new-character, fabrication, empowered reward, and claim-cache rules remain wired', () => {
  assert.match(read('global.js'), /const STARTING_CREDITS = 1000/);
  assert.match(read('fabrication.js'), /Object\.keys\(ongoingFabrications\)\.length > 0/);
  assert.match(read('combat.js'), /enemy\.isEmpowered = true/);
  assert.match(read('combat.js'), /xp = Math\.floor\(xp \* 1\.5\)/);
  assert.match(read('combat.js'), /Starting a new delve destroyed/);
  assert.match(read('combat.js'), /Auto re-deploy paused until the Delve Claim Cache is cleared/);
  assert.match(read('global.js'), /delveClaimCache/);
  assert.match(read('combat.js'), /function preparePlayerForCombat/);
  assert.doesNotMatch(read('combat.js'), /player\.baseStats = JSON\.parse\(JSON\.stringify\(playerBaseStats\)\)/);
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
