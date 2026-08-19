import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import enemies from '../src/enemies/index.js';
import { createScaledCoreboundEnemy } from '../src/enemies/coreboundProgressionEnemies.js';
import armor from '../src/items/armor/index.js';
import bionics from '../src/items/bionics/index.js';
import chips from '../src/items/chips/index.js';
import materials from '../src/items/materials/index.js';
import weapons from '../src/items/weapons/index.js';
import {
  WEAPON_CHASSIS_DEFINITIONS,
  WEAPON_CHASSIS_GRADES,
  WEAPON_DAMAGE_CORE_DEFINITIONS,
  resolveWeaponChassisTemplate,
  weaponChassisTemplates
} from '../src/items/weapons/chassisCatalog.js';
import {
  WEAPON_FAMILY_DEFINITIONS,
  WEAPON_TAG_DEFINITIONS,
  validateWeaponTaxonomy
} from '../src/items/weapons/taxonomy.js';
import { RUNTIME_SCRIPTS } from '../src/runtimeScripts.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allItems = [...weapons, ...materials, ...armor, ...bionics, ...chips];
const itemNames = new Set(allItems.map(item => item.name));
const enemyNames = new Set(enemies.map(enemy => enemy.name));

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

const COMBAT_RUNTIME_FILES = [
  'combatSchema.js',
  'combatState.js',
  'combatController.js',
  'combatEffects.js',
  'propagation.js',
  'combatResolution.js',
  'delveRewards.js',
  'delveManager.js',
  'combatUI.js',
  'combatVFX.js',
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
  const suppliedWindow = extraGlobals.window || {};
  const window = {
    bionics,
    chips,
    weaponChassisDefinitions: WEAPON_CHASSIS_DEFINITIONS,
    weaponDamageCoreDefinitions: WEAPON_DAMAGE_CORE_DEFINITIONS,
    weaponChassisTemplates,
    ...suppliedWindow,
    coreboundConfig: {
      developerMode: true,
      ...(suppliedWindow.coreboundConfig || {})
    }
  };
  const sandbox = {
    window,
    console: quietConsole,
    Date,
    Math,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    ...extraGlobals,
    window
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const relativePaths = Array.isArray(relativePath) ? relativePath : [relativePath];
  vm.runInContext(
    `${relativePaths.map(read).join('\n')}\n;globalThis.__testResult = (${expression});`,
    sandbox,
    { filename: relativePaths.join(' + ') }
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

test('every registered enemy has a unique 256px portrait', () => {
  const portraitPaths = enemies.map(enemy => enemy.portrait);
  assert.equal(new Set(portraitPaths).size, enemies.length, 'enemy portraits must be unique');

  for (const enemy of enemies) {
    assert.match(enemy.portrait, /^images\/enemies\/[a-z0-9-]+\.png$/, `${enemy.name} has an invalid portrait path`);
    const portraitPath = path.join(repositoryRoot, enemy.portrait);
    assert.ok(fs.existsSync(portraitPath), `${enemy.name} portrait does not exist`);
    const png = fs.readFileSync(portraitPath);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${enemy.name} portrait is not a PNG`);
    assert.equal(png.readUInt32BE(16), 256, `${enemy.name} portrait is not 256px wide`);
    assert.equal(png.readUInt32BE(20), 256, `${enemy.name} portrait is not 256px tall`);
  }
});

test('every weapon has a validated family, mechanical tags, and supported progression', () => {
  const validation = validateWeaponTaxonomy(weapons);
  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.deepEqual(Object.keys(validation.familyCounts).sort(), Object.keys(WEAPON_FAMILY_DEFINITIONS).sort());
  assert.equal(weapons.every(weapon => WEAPON_FAMILY_DEFINITIONS[weapon.weaponFamily]), true);
  assert.equal(weapons.every(weapon => Array.isArray(weapon.weaponTags) && weapon.weaponTags.length >= 3), true);
  assert.equal(weapons.every(weapon => weapon.weaponTags.every(tag => WEAPON_TAG_DEFINITIONS[tag])), true);

  const playerWeapons = weapons.filter(weapon => !weapon.developerOnly);
  for (const family of Object.keys(WEAPON_FAMILY_DEFINITIONS)) {
    const levels = playerWeapons
      .filter(weapon => weapon.weaponFamily === family)
      .map(weapon => Number(weapon.levelRequirement?.min ?? weapon.levelRequirement));
    assert.ok(Math.min(...levels) <= 10, `${family} has no early-game weapon`);
    assert.ok(Math.max(...levels) >= 40, `${family} has no late-game weapon`);
  }
});

test('weapon chassis cover every family at six fixed grades and resolve every damage core', () => {
  const families = Object.keys(WEAPON_FAMILY_DEFINITIONS);
  assert.equal(weaponChassisTemplates.length, families.length * 6);
  assert.deepEqual(WEAPON_CHASSIS_GRADES.map(grade => grade.level), [1, 10, 20, 30, 40, 50]);
  assert.deepEqual(Object.keys(WEAPON_DAMAGE_CORE_DEFINITIONS), [
    'kinetic', 'slashing', 'pyro', 'cryo', 'electric', 'corrosive', 'radiation'
  ]);

  for (const grade of WEAPON_CHASSIS_GRADES) {
    for (const family of families) {
      const name = `${grade.label} ${WEAPON_FAMILY_DEFINITIONS[family].label} Chassis`;
      const template = weaponChassisTemplates.find(item => item.name === name);
      assert.ok(template, `missing chassis: ${name}`);
      assert.equal(template.levelRequirement, grade.level);
      assert.equal(template.weaponFamily, family);
      assert.equal(template.icon, `icons/weapons/${grade.id}_${family}_chassis.png`);

      const iconPath = path.join(repositoryRoot, template.icon);
      assert.ok(fs.existsSync(iconPath), `${name} icon does not exist`);
      const png = fs.readFileSync(iconPath);
      assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${name} icon is not a PNG`);
      assert.equal(png.readUInt32BE(16), 512, `${name} icon is not 512px wide`);
      assert.equal(png.readUInt32BE(20), 512, `${name} icon is not 512px tall`);

      for (const damageType of Object.keys(WEAPON_DAMAGE_CORE_DEFINITIONS)) {
        const resolved = resolveWeaponChassisTemplate(template, damageType, () => 0);
        assert.deepEqual(Object.keys(resolved.weaponBaseDamage), [damageType]);
        assert.equal(resolved.chassisTemplateName, template.name);
        assert.equal(resolved.icon, template.icon);
        assert.match(resolved.name, new RegExp(WEAPON_DAMAGE_CORE_DEFINITIONS[damageType].label));
      }
    }
  }
});

test('generated chassis weapons restore through their stable chassis template', () => {
  const result = evaluateClassic(
    'saveSchema.js',
    `(() => {
      const template = window.items.find(item => item.name === 'Dominion Rifles Chassis');
      const saved = {
        name: 'Dominion Kinetic Rifle',
        chassisTemplateName: 'Dominion Rifles Chassis',
        icon: 'icons/default-icon.png',
        rolledModifiers: [{ id: 'saved-roll', value: 47 }]
      };
      const restoredTemplate = findSavedItemTemplate(saved, window.items);
      return {
        templateName: restoredTemplate?.name,
        icon: restoredTemplate?.icon,
        savedRoll: saved.rolledModifiers[0].value
      };
    })()`,
    { window: { items: weaponChassisTemplates } }
  );

  assert.equal(result.templateName, 'Dominion Rifles Chassis');
  assert.equal(result.icon, 'icons/weapons/dominion_rifles_chassis.png');
  assert.equal(result.savedRoll, 47);
});

test('mixed chassis families randomize one- and two-handed subtypes per craft', () => {
  for (const family of ['blades', 'impact', 'conduits']) {
    const template = weaponChassisTemplates.find(item =>
      item.weaponFamily === family && item.levelRequirement === 30
    );
    const light = resolveWeaponChassisTemplate(template, 'corrosive', () => 0);
    const heavy = resolveWeaponChassisTemplate(template, 'corrosive', () => 0.999999);
    assert.ok(light.weaponTags.includes('oneHanded'), `${family} did not produce its one-handed subtype`);
    assert.ok(heavy.weaponTags.includes('twoHanded'), `${family} did not produce its two-handed subtype`);
    assert.ok(heavy.weaponTags.includes('deliberate'), `${family} heavy subtype lost its cadence tag`);
    if (family === 'blades') assert.ok(light.weaponTags.includes('rapid'), 'light blades lost their rapid cadence tag');
    assert.notEqual(light.weaponType, heavy.weaponType);
    assert.deepEqual(Object.keys(light.weaponBaseDamage), ['corrosive']);
    assert.deepEqual(Object.keys(heavy.weaponBaseDamage), ['corrosive']);
  }

  for (const family of ['sidearms', 'rifles', 'projectors', 'ordnance']) {
    const template = weaponChassisTemplates.find(item =>
      item.weaponFamily === family && item.levelRequirement === 30
    );
    const first = resolveWeaponChassisTemplate(template, 'radiation', () => 0);
    const last = resolveWeaponChassisTemplate(template, 'radiation', () => 0.999999);
    assert.equal(first.weaponType, last.weaponType, `${family} unexpectedly randomized handling`);
    assert.deepEqual(first.weaponTags, last.weaponTags);
  }
});

test('kinetic and slashing component ladders use dedicated 512px icons', () => {
  const componentNames = [
    'Stabilizer',
    'Advanced Barrel',
    'Precision Mechanism',
    'Titanium Thorn',
    'Metal Scorpion Fang',
    'Enhanced Cutting Edge'
  ];

  for (const name of componentNames) {
    const material = materials.find(candidate => candidate.name === name);
    assert.ok(material, `${name} is not registered`);
    assert.notEqual(material.icon, 'icons/default-icon.png', `${name} still uses the default icon`);

    const iconPath = path.join(repositoryRoot, material.icon);
    assert.ok(fs.existsSync(iconPath), `${material.icon} does not exist`);
    const png = fs.readFileSync(iconPath);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${material.icon} is not a PNG`);
    assert.equal(png.readUInt32BE(16), 512, `${material.icon} is not 512px wide`);
    assert.equal(png.readUInt32BE(20), 512, `${material.icon} is not 512px tall`);
  }
});

test('recipes and disassembly only reference registered items', () => {
  const recipes = evaluateClassic('recipes.js', 'window.recipes');
  const badOutputs = recipes.filter(recipe => !itemNames.has(recipe.name)).map(recipe => recipe.name);
  const badIngredients = recipes.flatMap(recipe =>
    [recipe.ingredients || {}, ...Object.values(recipe.ingredientsByDamage || {})].flatMap(ingredients => Object.keys(ingredients))
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

test('ordinary weapon recipes are retired while chassis recipes preserve full combination coverage', () => {
  const result = evaluateClassic('recipes.js', `({
    active: window.recipes,
    retired: window.retiredRecipes
  })`);
  const chassisRecipes = result.active.filter(recipe => recipe.weaponChassis);
  assert.equal(chassisRecipes.length, 42);
  assert.equal(result.retired.length, 49);
  assert.equal(result.retired.every(recipe => recipe.retired === true), true);
  assert.equal(result.retired.some(retired => result.active.some(recipe => recipe.name === retired.name)), false);
  assert.equal(chassisRecipes.every(recipe => recipe.damageOptions.length === 7), true);
  assert.equal(chassisRecipes.every(recipe => Object.keys(recipe.ingredientsByDamage).length === 7), true);
  assert.equal(result.active.some(recipe => recipe.name === 'Makeshift Laser Sword'), false);
  assert.equal(result.active.some(recipe => recipe.name === 'Scorpion Sword'), false);
  assert.equal(result.active.some(recipe => recipe.name === 'Fire Spewer Mk1'), false);

  const fabricationSource = read('fabrication.js');
  assert.match(fabricationSource, /selectedWeaponFamily/);
  assert.match(fabricationSource, /ingredientsByDamage/);
  assert.match(fabricationSource, /craftingOptions:\s*fabrication\.recipe\.craftingOptions/);
  assert.match(fabricationSource, /window\.retiredRecipes/);
  assert.match(fabricationSource, /window\.resolveWeaponChassisTemplate/);
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

test('radial passive tree is connected, stable, and honors allocation/refund rules', () => {
  const passiveDefinitions = evaluateClassic('passives.js', 'passives');
  const passiveNames = new Set(passiveDefinitions.map(passive => passive.name));
  const passiveIds = new Set(passiveDefinitions.map(passive => passive.id));
  const invalidBonuses = allItems.flatMap(item => {
    const direct = Object.keys(item.passiveBonuses || {});
    const rolled = (item.rollGroups || []).flatMap(group => (group.from || []))
      .map(option => String(option.path || ''))
      .filter(pathName => pathName.startsWith('passiveBonuses.'))
      .map(pathName => pathName.slice('passiveBonuses.'.length));
    return [...direct, ...rolled]
      .filter(name => !passiveNames.has(name) && !passiveIds.has(name))
      .map(name => `${item.name} -> ${name}`);
  });
  assert.deepEqual(invalidBonuses, []);

  const result = evaluateClassic(
    'passives.js',
    `(() => {
      const validation = validatePassiveTree();
      const gateway = getPassiveNode('core-kinetic-gateway');
      const outerId = gateway.connections.find(id => id.startsWith('kinetic-'));
      const before = canAllocatePassiveNode({}, gateway.id);
      const blockedOuter = canAllocatePassiveNode({}, outerId);
      const allocations = { [gateway.id]: 1, [outerId]: 1 };
      const blockedRefund = canRefundPassiveNode(allocations, gateway.id);
      const leafRefund = canRefundPassiveNode(allocations, outerId);
      return {
        validation,
        nodeCount: validation.nodeCount,
        edgeCount: validation.edgeCount,
        clusterCount: validation.clusterCount,
        notableCount: validation.notableCount,
        sectorCounts: PASSIVE_TREE_SECTOR_ORDER.map(sector => passives.filter(node => node.sector === sector).length),
        lifeCounts: PASSIVE_TREE_SECTOR_ORDER.map(sector => passives.filter(node => node.sector === sector && (node.effects.flatHealth > 0 || node.effects.healthPercent > 0)).length),
        shieldCounts: PASSIVE_TREE_SECTOR_ORDER.map(sector => passives.filter(node => node.sector === sector && (node.effects.flatEnergyShield > 0 || node.effects.energyShieldPercent > 0)).length),
        keystones: passives.filter(node => node.type === 'keystone').length,
        travelDegrees: passives.filter(node => node.type === 'travel').map(node => node.connections.length),
        familyTargets: PASSIVE_TREE_SECTOR_ORDER.map(sector => [...new Set(passives.filter(node => node.sector === sector && node.specialty === 'family').map(node => node.target))]),
        tagTargets: PASSIVE_TREE_SECTOR_ORDER.map(sector => [...new Set(passives.filter(node => node.sector === sector && node.specialty === 'tag').map(node => node.target))]),
        styleTargets: PASSIVE_TREE_SECTOR_ORDER.map(sector => [...new Set(passives.filter(node => node.sector === sector && node.specialty === 'style').map(node => node.target))]),
        propagationWheels: PASSIVE_TREE_SECTOR_ORDER.map(sector => {
          const notable = passives.find(node => node.id === sector + '-propagation-notable');
          const minors = passives.filter(node => node.sector === sector && node.specialty === 'propagation' && node.type === 'minor');
          return {
            notableEffects: notable?.effects,
            minorEffects: minors.map(node => node.effects),
            minorCount: minors.length,
            notableConnections: notable?.connections.length,
            matchingDamage: minors.every(node => node.effects.damageTypes?.[sector] === 8 && Object.keys(node.effects).length === 1)
          };
        }),
        bridgeSeams: PASSIVE_BRIDGE_DEFINITIONS.map(bridge => {
          const nodes = passives.filter(node => node.sector === 'bridge'
            && node.sectors?.join('|') === bridge.sectors.join('|'));
          return {
            count: nodes.length,
            types: nodes.map(node => node.type),
            names: nodes.map(node => node.name),
            lifeBonuses: nodes.map(node => Number(node.effects.healthPercent || 0)),
            expectedNames: [bridge.notable, bridge.lifeNotable],
            isTwoNodeRoute: nodes.length === 2
              && nodes.every(node => node.connections.length === 2)
              && nodes[0].connections.includes(nodes[1].id)
          };
        }),
        jewels: passives.filter(node => node.type === 'jewel').length,
        before, blockedOuter, blockedRefund, leafRefund
      };
    })()`
  );
  assert.equal(result.validation.valid, true, result.validation.errors.join('; '));
  assert.equal(result.nodeCount, 1546);
  assert.equal(result.edgeCount, 1827);
  assert.equal(result.clusterCount, 154);
  assert.equal(result.notableCount, 217);
  assert.equal(result.keystones, 35);
  assert.equal(result.jewels, 0);
  assert.equal(result.travelDegrees.every(degree => degree >= 3), true, 'travel roads still contain forced single-lane rail nodes');
  assert.equal(result.familyTargets.every(targets => targets.length === 7), true, 'weapon families are not distributed through every sector');
  assert.equal(result.tagTargets.every(targets => targets.length === 4), true, 'weapon tags are not distributed through every sector');
  assert.equal(result.styleTargets.every(targets => targets.length === 4), true, 'combat styles are not distributed through every sector');
  assert.equal(result.propagationWheels.every(wheel => wheel.minorCount === 7 && wheel.notableConnections === 2), true, 'a propagation wheel lost its three/four route topology');
  assert.equal(result.propagationWheels.every(wheel => wheel.notableEffects?.propagationTargets === 1 && Object.keys(wheel.notableEffects).length === 1), true, 'a propagation notable has the wrong effect package');
  assert.equal(result.propagationWheels.every(wheel => wheel.matchingDamage), true, 'a propagation route minor is not exactly 8% matching damage');
  assert.equal(result.bridgeSeams.every(seam => seam.count === 2), true, 'an outer sector seam contains more than two passives');
  assert.equal(result.bridgeSeams.every(seam => seam.types.every(type => type === 'notable')), true, 'outer sector seams are not exclusively notables');
  assert.equal(result.bridgeSeams.every(seam => seam.names.join('|') === seam.expectedNames.join('|')), true, 'an outer sector seam lost its authored notable identities');
  assert.equal(result.bridgeSeams.every(seam => seam.isTwoNodeRoute), true, 'an outer sector seam is not a two-point route');
  assert.equal(result.bridgeSeams.every(seam => seam.lifeBonuses.filter(bonus => bonus === 3).length === 1), true, 'an outer sector seam lacks its 3% maximum-health notable');
  assert.equal(result.sectorCounts.every(count => count >= 207), true);
  assert.equal(result.lifeCounts.every(count => count >= 20), true, 'life access is not distributed across every sector');
  assert.equal(result.shieldCounts.every(count => count >= 15), true, 'Energy Shield access is not distributed across every sector');
  assert.equal(result.before.ok, true, 'an origin gateway was not allocatable');
  assert.equal(result.blockedOuter.ok, false, 'a disconnected outer node was allocatable');
  assert.equal(result.blockedRefund.ok, false, 'a connecting node could orphan an allocation');
  assert.equal(result.leafRefund.ok, true, 'an outer leaf could not be refunded');
});

test('passive tree uses immediate viewport tooltips instead of persistent node labels', () => {
  const uiSource = read('passivesUI.js');
  const styles = read('style.css');
  assert.doesNotMatch(uiSource, /passive-node-label/, 'persistent node labels returned to the passive graph');
  assert.doesNotMatch(uiSource, /<title>/, 'native delayed SVG tooltips returned to passive nodes');
  assert.doesNotMatch(uiSource, /strokeText|fillText/, 'large damage-sector labels returned to the graph');
  assert.match(uiSource, /id="passive-node-tooltip"[^>]*role="tooltip"/, 'passive tooltip layer is missing');
  assert.match(uiSource, /schedulePassiveTreePointerHover[\s\S]*?requestAnimationFrame[\s\S]*?hitTestPassiveCanvasNode/, 'passive tooltip hit testing is not frame-coalesced');
  assert.match(uiSource, /addEventListener\('focusin'/, 'keyboard focus does not expose passive details');
  assert.doesNotMatch(uiSource, /querySelectorAll\('\[data-node-id\]'\)/, 'thousands of passive nodes received individual event listeners');
  assert.match(styles, /\.passive-node-tooltip\s*\{[\s\S]*?pointer-events:\s*none/, 'tooltip can interfere with node hover');
});

test('passive tree renderer uses a culled canvas graph with an incremental SVG interaction layer', () => {
  const uiSource = read('passivesUI.js');
  const styles = read('style.css');
  const passiveStyles = styles.slice(styles.indexOf('/* Radial passive tree v2 */'), styles.indexOf('/* Glow effect for the entire tier container */'));
  const passiveDefinitions = evaluateClassic('passives.js', 'passives');
  const overviewTypes = new Set(['origin', 'gateway', 'travel', 'connector', 'bridge', 'notable', 'keystone']);
  const overviewNodeCount = passiveDefinitions.filter(node => overviewTypes.has(node.type)).length;

  assert.equal(overviewNodeCount, 503, 'overview detail unexpectedly includes the full minor-node population');
  assert.ok(overviewNodeCount < passiveDefinitions.length / 2, 'overview detail does not substantially reduce live node count');
  assert.match(uiSource, /id="passive-tree-canvas"/, 'passive graph canvas layer is missing');
  assert.match(uiSource, /canvas\.getContext\('2d'\)/, 'passive graph does not initialize a 2D canvas renderer');
  assert.match(uiSource, /drawPassiveCanvasEdges[\s\S]*?PASSIVE_TREE\.edges/, 'connections are not painted on canvas');
  assert.match(uiSource, /drawPassiveCanvasNode[\s\S]*?context\.arc/, 'ordinary passive nodes are not painted on canvas');
  assert.match(uiSource, /PASSIVE_TREE_SVG_TYPES\s*=\s*new Set\(\['origin', 'notable', 'keystone'\]\)/, 'SVG interaction layer is not limited to priority node types');
  assert.match(uiSource, /hitTestPassiveCanvasNode[\s\S]*?visibleNodeIds/, 'canvas nodes cannot be interacted with');
  assert.doesNotMatch(uiSource, /svg\.innerHTML/, 'passive graph still destroys and recreates the SVG scene');
  assert.doesNotMatch(uiSource, /createPassiveSvgElement\('line'/, 'connections are still individual SVG line elements');
  assert.doesNotMatch(uiSource, /passive-tree-edge/, 'connection SVG elements still exist in the hybrid renderer');
  assert.match(uiSource, /PASSIVE_TREE_RENDER_BUFFER[\s\S]*?passiveTreeBoundsContainView/, 'buffered viewport culling is missing');
  assert.match(uiSource, /PASSIVE_TREE_OVERVIEW_TYPES[\s\S]*?detailLevel === 'overview'/, 'zoom-dependent overview detail is missing');
  assert.match(uiSource, /requestAnimationFrame\(\(\) => \{[\s\S]*?passiveTreePendingView/, 'pan and zoom are not frame-coalesced');
  assert.match(uiSource, /PASSIVE_TREE_SEARCH_DELAY_MS[\s\S]*?setTimeout/, 'search input is not debounced');
  assert.match(uiSource, /syncPassiveTreeInteractiveNode\(previousNodeId[\s\S]*?syncPassiveTreeInteractiveNode\(nodeId/, 'selection still refreshes the entire graph');
  assert.doesNotMatch(passiveStyles, /vector-effect:\s*non-scaling-stroke/, 'passive SVG still forces every stroke to remain screen-sized');
  assert.match(passiveStyles, /#passive-tree-canvas\s*\{[\s\S]*?pointer-events:\s*none/, 'canvas background can interfere with SVG hit testing');
  assert.doesNotMatch(passiveStyles, /\.passive-tree-node\.is-active circle\s*\{[^}]*filter:/, 'every allocated node still owns an expensive glow filter');
});

test('passive canvas maps pointer coordinates and paints at a capped device pixel ratio', () => {
  const result = evaluateClassic(
    ['passives.js', 'passivesUI.js'],
    `(() => {
      const rect = { left: 0, top: 0, width: 800, height: 600 };
      const home = getPassiveTreeHomeView(rect.width / rect.height);
      const origin = getPassiveNode(PASSIVE_TREE_ORIGIN_ID);
      const calls = { arcs: 0, lines: 0, transforms: 0 };
      const context = {
        setTransform: () => { calls.transforms++; }, clearRect: () => {}, beginPath: () => {},
        arc: () => { calls.arcs++; }, fill: () => {}, stroke: () => {}, save: () => {}, restore: () => {},
        setLineDash: () => {}, moveTo: () => { calls.lines++; }, lineTo: () => {}, closePath: () => {},
        strokeText: () => {}, fillText: () => {}
      };
      const canvas = { width: 0, height: 0 };
      const svg = { getBoundingClientRect: () => rect };
      passiveTreeView = home;
      passiveTreeRenderer = {
        canvas, context, svg, visibleNodeIds: new Set(passives.map(node => node.id)),
        renderedNodeIds: new Set(), renderBounds: getPassiveTreeRenderBounds(home),
        detailLevel: 'overview', viewportRect: rect
      };
      window.devicePixelRatio = 3;
      const scale = Math.min(rect.width / home.width, rect.height / home.height);
      const clientX = (rect.width - home.width * scale) / 2 + (origin.x - home.x) * scale;
      const clientY = (rect.height - home.height * scale) / 2 + (origin.y - home.y) * scale;
      const hitNodeId = hitTestPassiveCanvasNode(clientX, clientY, svg);
      drawPassiveTreeCanvas(home, getPassiveTreeManualActiveSet());
      return {
        hitNodeId, canvasWidth: canvas.width, canvasHeight: canvas.height, calls,
        viewAspect: home.width / home.height,
        paintedWidth: home.width * scale,
        paintedHeight: home.height * scale
      };
    })()`,
    {
      player: {
        passiveTreeVersion: 6, passiveAllocations: {}, passivePoints: 2, gearPassiveBonuses: {}, level: 1,
        totalStats: { health: 100, energyShield: 0 }, currentHealth: 100, currentShield: 0,
        calculateStats: () => {}
      },
      document: { getElementById: () => null },
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {}
    }
  );
  assert.equal(result.hitNodeId, 'core-origin', 'canvas hit testing is not aligned with the SVG viewBox');
  assert.equal(result.canvasWidth, 1600, 'canvas backing width did not cap device pixel ratio at 2x');
  assert.equal(result.canvasHeight, 1200, 'canvas backing height did not cap device pixel ratio at 2x');
  assert.ok(Math.abs(result.viewAspect - 4 / 3) < 0.0001, 'passive view does not match the viewport aspect ratio');
  assert.ok(Math.abs(result.paintedWidth - 800) < 0.01, 'canvas leaves a horizontal dead band');
  assert.ok(Math.abs(result.paintedHeight - 600) < 0.01, 'canvas leaves a vertical dead band');
  assert.ok(result.calls.arcs > 1490, 'canvas did not paint nodes and cluster rings');
  assert.ok(result.calls.lines > 0, 'canvas did not paint graph connections');
  assert.ok(result.calls.transforms >= 2, 'canvas transform was not reset and reapplied');
});

test('passive tree repairs a hidden square viewport before allocation-driven rendering', () => {
  const result = evaluateClassic(
    ['passives.js', 'passivesUI.js'],
    `(() => {
      passiveTreeView = getPassiveTreeHomeView(1);
      const before = { ...passiveTreeView };
      const rect = { left: 0, top: 0, width: 1200, height: 700 };
      const changed = synchronizePassiveTreeViewToViewport(rect);
      const after = { ...passiveTreeView };
      const scale = Math.min(rect.width / after.width, rect.height / after.height);
      return {
        changed,
        beforeAspect: before.width / before.height,
        afterAspect: after.width / after.height,
        viewportAspect: rect.width / rect.height,
        centerShiftX: (after.x + after.width / 2) - (before.x + before.width / 2),
        centerShiftY: (after.y + after.height / 2) - (before.y + before.height / 2),
        paintedWidth: after.width * scale,
        paintedHeight: after.height * scale,
        horizontalPanFor100Pixels: 100 / scale,
        verticalPanFor100Pixels: 100 / scale
      };
    })()`,
    {
      player: {
        passiveTreeVersion: 6, passiveAllocations: {}, passivePoints: 2, gearPassiveBonuses: {}, level: 1,
        totalStats: { health: 100, energyShield: 0 }, currentHealth: 100, currentShield: 0,
        calculateStats: () => {}
      },
      document: { getElementById: () => null },
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {}
    }
  );
  assert.equal(result.changed, true, 'hidden square initialization was not corrected when the viewport became visible');
  assert.equal(result.beforeAspect, 1);
  assert.ok(Math.abs(result.afterAspect - result.viewportAspect) < 0.0001, 'tree view does not match the visible viewport aspect');
  assert.ok(Math.abs(result.centerShiftX) < 0.0001 && Math.abs(result.centerShiftY) < 0.0001, 'aspect repair moved the camera center');
  assert.ok(Math.abs(result.paintedWidth - 1200) < 0.01, 'aspect repair leaves horizontal dead bands');
  assert.ok(Math.abs(result.paintedHeight - 700) < 0.01, 'aspect repair leaves vertical dead bands');
  assert.equal(result.horizontalPanFor100Pixels, result.verticalPanFor100Pixels, 'drag axes do not use the same rendered scale');
});

test('passive tree keeps vertical routes painted independently of endpoint culling', () => {
  const result = evaluateClassic(
    ['passives.js', 'passivesUI.js'],
    `(() => {
      const view = { x: -1200, y: -675, width: 2400, height: 1350 };
      const renderBounds = getPassiveTreeRenderBounds(view);
      const smallVerticalPan = { ...view, y: view.y + view.height * PASSIVE_TREE_RENDER_BUFFER * 0.75 };
      return {
        refreshesWithReserve: !passiveTreeBoundsContainView(renderBounds, smallVerticalPan),
        crossingVerticalEdge: passiveTreeSegmentBoundsOverlap(
          { x: 0, y: view.y - 700 },
          { x: 0, y: view.y + view.height + 700 },
          view
        ),
        rejectsDistantVerticalEdge: passiveTreeSegmentBoundsOverlap(
          { x: view.x + view.width + 700, y: view.y - 700 },
          { x: view.x + view.width + 700, y: view.y + view.height + 700 },
          view
        )
      };
    })()`,
    {
      player: {
        passiveTreeVersion: 6, passiveAllocations: {}, passivePoints: 2, gearPassiveBonuses: {}, level: 1,
        totalStats: { health: 100, energyShield: 0 }, currentHealth: 100, currentShield: 0,
        calculateStats: () => {}
      },
      document: { getElementById: () => null },
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {}
    }
  );
  assert.equal(result.refreshesWithReserve, true, 'vertical culling waits until its entire buffer is exhausted');
  assert.equal(result.crossingVerticalEdge, true, 'a route crossing the viewport was culled with both endpoints off-screen');
  assert.equal(result.rejectsDistantVerticalEdge, false, 'unrelated distant routes are no longer culled');
});

test('level progression awards two passive points and starts level one with two', () => {
  const globalSource = read('global.js');
  const codexSource = read('codex.js');
  assert.match(globalSource, /passivePoints:\s*2/, 'new characters do not begin with two passive points');
  assert.match(globalSource, /passivePoints\s*=\s*\(player\.passivePoints\s*\|\|\s*0\)\s*\+\s*2/, 'level-up does not award two passive points');
  assert.match(globalSource, /const MAX_PLAYER_LEVEL = 50;/, 'player level is not hard-capped at 50');
  assert.match(codexSource, /two passive points per level/, 'the Codex does not explain the two-point progression rate');
});

test('combat styles expose four attack patterns with three exclusive mastery tiers', () => {
  const styles = evaluateClassic('skills.js', 'combatStyles');
  assert.deepEqual(Array.from(styles, style => style.id), ['balancedStyle', 'heavyStyle', 'twinStyle', 'counterStyle']);
  assert.equal(styles.every(style => style.masteries.length === 3), true);
  assert.equal(styles.every(style => style.masteries.every(mastery => mastery.choices.length === 3)), true);
  const choiceIds = Array.from(styles, style => style.masteries.flatMap(mastery => mastery.choices.map(choice => choice.id))).flat();
  assert.equal(new Set(choiceIds).size, 36, 'combat mastery choice IDs are not unique');
});

test('combat mastery choices replace tier siblings and alter live style profiles', () => {
  const testPlayer = {
    level: 10,
    equippedSkillId: 'heavyStyle',
    unlockedSkillIds: [],
    combatStyleAllocations: {},
    combatStyleVersion: 2,
    totalStats: { attackSpeed: 1, energyShield: 100 },
    currentShield: 20
  };
  const result = evaluateClassic(
    ['skills.js', 'skillResolver.js'],
    `(() => {
      normalizeCombatStylesState(player);
      const locked = canAllocateStyleNode(player, 'heavyStyle', 'heavy-patient-aim');
      player.level = 41;
      const first = allocateStyleNode(player, 'heavyStyle', 'heavy-patient-aim');
      const replacement = allocateStyleNode(player, 'heavyStyle', 'heavy-overpower');
      const heavy = resolveSkillProfile(player);

      player.equippedSkillId = 'twinStyle';
      allocateStyleNode(player, 'twinStyle', 'twin-opening-feint');
      const twin = prepareCombatStyleAttack(player, { currentHealth: 100, totalStats: { health: 100 } });
      const twinFirst = buildHitContext(twin, 0);
      const twinSecond = buildHitContext(twin, 1);

      player.equippedSkillId = 'counterStyle';
      resetCombatStyleState(player);
      recordCombatStyleIncomingHit(player);
      const counter = prepareCombatStyleAttack(player, { currentHealth: 100, totalStats: { health: 100 } });
      return {
        locked, first, replacement,
        heavy,
        heavyNodes: player.combatStyleAllocations.heavyStyle.nodes,
        twin, twinFirst, twinSecond,
        counter,
        unlocked: player.unlockedSkillIds
      };
    })()`,
    { player: testPlayer }
  );

  assert.equal(result.locked.ok, false, 'tier one unlocked before level 11');
  assert.equal(result.first.ok, true);
  assert.equal(result.replacement.replaced, 'heavy-patient-aim');
  assert.deepEqual(Object.keys(result.heavyNodes), ['heavy-overpower']);
  assert.equal(result.heavy.damageMultiplier, 1.85);
  assert.equal(result.heavy.criticalDamageBonus, 0.35);
  assert.equal(result.twin.hitCount, 2);
  assert.equal(result.twinFirst.skipCrit, true);
  assert.equal(result.twinSecond.critChanceBonus, 0.25);
  assert.equal(result.counter.isCounterAttack, true);
  assert.equal(result.counter.damageMultiplier, 1.65);
  assert.deepEqual([...result.unlocked], ['balancedStyle', 'heavyStyle', 'twinStyle', 'counterStyle']);
});

test('style cadence state drives Heavy, Balanced, Twin, and Counter attack behavior', () => {
  const testPlayer = {
    level: 50,
    equippedSkillId: 'balancedStyle',
    unlockedSkillIds: [],
    combatStyleAllocations: {},
    combatStyleVersion: 2,
    totalStats: { attackSpeed: 1, energyShield: 100 },
    currentShield: 20
  };
  const result = evaluateClassic(
    ['skills.js', 'skillResolver.js'],
    `(() => {
      normalizeCombatStylesState(player);
      allocateStyleNode(player, 'balancedStyle', 'balanced-perfect-form');
      const target = { currentHealth: 100, totalStats: { health: 100 } };
      const balancedOne = prepareCombatStyleAttack(player, target);
      finishCombatStyleAttack(player, target, balancedOne);
      const balancedTwo = prepareCombatStyleAttack(player, target);
      finishCombatStyleAttack(player, target, balancedTwo);
      const balancedThree = prepareCombatStyleAttack(player, target);

      player.equippedSkillId = 'heavyStyle';
      resetCombatStyleState(player);
      allocateStyleNode(player, 'heavyStyle', 'heavy-aftershock');
      const heavy = prepareCombatStyleAttack(player, target);
      const heavyHits = [buildHitContext(heavy, 0), buildHitContext(heavy, 1)];

      player.equippedSkillId = 'twinStyle';
      resetCombatStyleState(player);
      allocateStyleNode(player, 'twinStyle', 'twin-threefold-pattern');
      const twin = prepareCombatStyleAttack(player, target);

      player.equippedSkillId = 'counterStyle';
      resetCombatStyleState(player);
      allocateStyleNode(player, 'counterStyle', 'counter-braced-guard');
      allocateStyleNode(player, 'counterStyle', 'counter-quick-riposte');
      allocateStyleNode(player, 'counterStyle', 'counter-perfect-parry');
      const incoming = () => ({ total: 100, damage: { kinetic: 100 }, damageBreakdown: { kinetic: 100 }, isCritical: false });
      const firstIncoming = modifyIncomingDamageForCombatStyle(player, target, incoming());
      recordCombatStyleIncomingHit(player);
      const secondIncoming = modifyIncomingDamageForCombatStyle(player, target, incoming());
      recordCombatStyleIncomingHit(player);
      const thirdIncoming = modifyIncomingDamageForCombatStyle(player, target, incoming());
      recordCombatStyleIncomingHit(player);
      const counter = prepareCombatStyleAttack(player, target);
      const counterInterval = getPlayerAttackInterval(player);
      return { balancedOne, balancedTwo, balancedThree, heavy, heavyHits, twin, firstIncoming, secondIncoming, thirdIncoming, counter, counterInterval };
    })()`,
    { player: testPlayer }
  );

  assert.equal(result.balancedOne.forceMaxDamageRoll, undefined);
  assert.equal(result.balancedTwo.forceMaxDamageRoll, undefined);
  assert.equal(result.balancedThree.forceMaxDamageRoll, true);
  assert.equal(result.heavy.hitCount, 2);
  assert.equal(result.heavyHits[0].damageMultiplier, 1.85);
  assert.equal(result.heavyHits[1].damageMultiplier, 1.85 * 0.25);
  assert.equal(result.twin.hitCount, 3);
  assert.deepEqual([...result.twin.hitDamageMultipliers], [0.46, 0.46, 0.46]);
  assert.equal(result.firstIncoming.total, 90, 'Braced Guard did not reduce the arming hit');
  assert.equal(result.secondIncoming.total, 100);
  assert.equal(result.thirdIncoming.total, 60, 'Perfect Parry did not reduce every third hit');
  assert.equal(result.counter.forceMaxDamageRoll, true);
  assert.equal(result.counterInterval, 1.05 * 0.75, 'Quick Riposte did not accelerate the armed counter');
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
    'combatSchema.js',
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
    ['combatSchema.js', ['createCombatantReference', 'createDamagePacket', 'createDamageApplicationResult']],
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
  assert.doesNotMatch(
    read('combatResolution.js'),
    /applyDamage\((?:player|enemy|attacker|defender)\s*,/,
    'live attack resolution bypasses canonical damage packets'
  );
  assert.match(read('stats.js'), /return createDamagePacket\(\{/);
});

test('enemy templates and runtime combatants satisfy the authoritative combat schema', () => {
  const schema = evaluateClassic(
    ['enemyAbilities.js', 'combatSchema.js'],
    '({ validateEnemyCombatTemplate, validateCombatantReference })'
  );
  const invalidEnemies = enemies
    .map(schema.validateEnemyCombatTemplate)
    .filter(result => !result.valid)
    .map(result => `${result.name}: ${result.errors.join('; ')}`);
  assert.deepEqual(invalidEnemies, []);

  const runtimeEntity = {
    name: 'Schema Drone',
    level: 12,
    currentHealth: 80,
    currentShield: 15,
    activeBuffs: [],
    activeDebuffs: [],
    totalStats: {
      health: 100,
      energyShield: 25,
      attackSpeed: 1.2,
      criticalChance: 0.1,
      criticalMultiplier: 1.5,
      damageTypes: { electric: 20 },
      defenseTypes: { physicalResistance: 4, elementalResistance: 8, chemicalResistance: 2 }
    }
  };
  const validation = schema.validateCombatantReference(runtimeEntity);
  assert.equal(validation.valid, true);
  assert.equal(validation.value.resources.health.current, 80);
  assert.equal(validation.value.resources.health.maximum, 100);
  assert.deepEqual({ ...validation.value.offense.damage }, { electric: 20 });
});

test('debuffs and item-triggered effects satisfy the authoritative combat schema', () => {
  const definitions = evaluateClassic('debuffs.js', 'debuffs', { applyEffectDamage: () => {} });
  const schema = evaluateClassic(
    'combatSchema.js',
    '({ validateDebuffDefinition, validateCombatItemEffects, validateCombatEffectDefinition })'
  );

  const invalidDebuffs = Object.entries(definitions)
    .map(([key, definition]) => schema.validateDebuffDefinition(key, definition))
    .filter(result => !result.valid)
    .map(result => `${result.name}: ${result.errors.join('; ')}`);
  const invalidItems = allItems
    .map(item => schema.validateCombatItemEffects(item, definitions))
    .filter(result => !result.valid)
    .map(result => `${result.name}: ${result.errors.join('; ')}`);

  assert.deepEqual(invalidDebuffs, []);
  assert.deepEqual(invalidItems, []);

  const reservedAreaEffect = allItems
    .flatMap(item => item.effects || [])
    .find(effect => effect.action === 'areaEffect');
  assert.ok(reservedAreaEffect, 'the disabled multi-enemy area-effect fixture disappeared');
  assert.equal(schema.validateCombatEffectDefinition(reservedAreaEffect, 'reserved effect', definitions).valid, true);
  assert.equal(
    schema.validateCombatEffectDefinition({ ...reservedAreaEffect, enabled: true }, 'enabled reserved effect', definitions).valid,
    false
  );
  assert.equal(
    schema.validateCombatEffectDefinition(
      { trigger: 'sometimes', chance: 100, action: 'mystery', parameters: {} },
      'unknown effect',
      definitions
    ).valid,
    false
  );
});

test('the stat pipeline applies only declared item stats and is idempotent', () => {
  const result = evaluateClassic(
    ['combatSchema.js', 'stats.js'],
    `(() => {
      const directStats = {
        precision: 0,
        maxSeveredLimbs: 1,
        maxSeepingWoundStacks: 5,
        damageTypes: {},
        damageTypeModifiers: {},
        damageGroupModifiers: { physical: 1, elemental: 1, chemical: 1 },
        defenseTypes: {}
      };
      applyItemModifiers(directStats, {
        precision: 5,
        statModifiers: {
          precision: 99,
          maxSeveredLimbs: 1,
          maxSeepingWoundStacks: 5,
          precison: 500
        }
      });

      const playerObject = {
        baseStats: {
          maxHealth: 100,
          maxEnergyShield: 0,
          healthRegen: 0,
          criticalChance: 0,
          criticalMultiplier: 1,
          precision: 0,
          deflection: 0,
          damageTypes: {},
          defenseTypes: {}
        },
        equipment: {
          mainHand: null, offHand: null, head: null, chest: null, legs: null, feet: null, gloves: null,
          bionicSlots: [{
            name: 'Synced Bionic', slot: 'bionic',
            precision: 10,
            statModifiers: { damageTypes: { kinetic: 20 } }
          }, {
            name: 'Sync Relay', slot: 'bionic', bionicSync: 10
          }]
        },
        passiveBonuses: {
          flatHealth: 0, flatEnergyShield: 0, healthRegen: 0, precision: 0, deflection: 0,
          healthPercent: 0, energyShieldPercent: 0, criticalChance: 0, criticalMultiplier: 0,
          flatDamageTypes: {}, defenseTypes: {}, damageTypes: {}, damageGroups: {}
        },
        passiveAttackSpeedBonus: 0,
        activeBuffs: [], activeDebuffs: [], gatheringSkills: {}, currentHealth: null, currentShield: null
      };
      playerObject.baseStats.bionicSync = 50;
      const first = calculatePlayerStats(playerObject);
      const firstJson = JSON.stringify(first);
      const second = calculatePlayerStats(playerObject);
      playerObject.equipment.bionicSlots = [null, null, null, null];
      const afterRemoval = calculatePlayerStats(playerObject);
      return {
        directStats,
        unknownKeys: getUnknownItemStatModifierKeys({ statModifiers: { precison: 5 } }),
        first,
        afterRemoval,
        unchanged: firstJson === JSON.stringify(second)
      };
    })()`
  );

  assert.equal(result.directStats.precision, 5, 'top-level and nested aliases were both applied');
  assert.equal(result.directStats.maxSeveredLimbs, 2);
  assert.equal(result.directStats.maxSeepingWoundStacks, 10);
  assert.equal(result.directStats.precison, undefined);
  assert.deepEqual([...result.unknownKeys], ['precison']);
  assert.equal(result.first.precision, 16, 'Bionic Sync did not amplify a bionic static stat');
  assert.equal(result.first.damageTypeModifiers.kinetic, 1.32, 'Bionic Sync did not amplify bionic damage modifiers');
  assert.equal(result.first.bionicSync, 60, 'Bionic Sync rolled on a bionic did not support the installed set');
  assert.equal(result.unchanged, true, 'recalculating unchanged equipment changed totalStats');
  assert.equal(result.afterRemoval.precision, 0, 'removed equipment left a scalar contribution behind');
  assert.equal(result.afterRemoval.damageTypeModifiers.kinetic, undefined, 'removed equipment left a typed contribution behind');
});

test('weapon-family, weapon-tag, and combat-style passives react to live loadout changes', () => {
  const result = evaluateClassic(
    ['combatSchema.js', 'stats.js', 'skills.js', 'skillResolver.js'],
    `(() => {
      const playerObject = {
        level: 30,
        baseStats: {
          maxHealth: 100, maxEnergyShield: 0, healthRegen: 0,
          criticalChance: 0, criticalMultiplier: 1, precision: 0, deflection: 0,
          damageTypes: {}, defenseTypes: { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 }
        },
        equipment: {
          mainHand: {
            name: 'Taxonomy Blade', type: 'Weapon', slot: 'mainHand', weaponType: 'Sword',
            weaponFamily: 'blades', weaponTags: ['melee', 'oneHanded', 'contact'],
            bAttackSpeed: 1, weaponBaseDamage: { kinetic: 100 }
          },
          offHand: null, head: null, chest: null, legs: null, feet: null, gloves: null, bionicSlots: []
        },
        passiveBonuses: {
          flatDamageTypes: {}, defenseTypes: {}, damageTypes: {}, damageGroups: {},
          weaponFamilyBonuses: { blades: { directDamageMultiplier: 0.1, precision: 5 } },
          weaponTagBonuses: {
            melee: { armorPenetration: 4 },
            oneHanded: { attackSpeed: 10 },
            ranged: { damageRollFloorBonus: 0.05 }
          },
          combatStyleBonuses: {
            heavyStyle: { defenseTypes: { physicalResistance: 7 } },
            balancedStyle: { attackTimeModifier: -0.1 }
          }
        },
        equippedSkillId: 'heavyStyle', combatStyleAllocations: {}, combatStyleVersion: 2,
        unlockedSkillIds: ['balancedStyle', 'heavyStyle', 'twinStyle', 'counterStyle'],
        activeBuffs: [], activeDebuffs: [], gatheringSkills: {}, currentHealth: null, currentShield: null
      };
      const bladeHeavy = calculatePlayerStats(playerObject);
      playerObject.equipment.mainHand = {
        ...playerObject.equipment.mainHand,
        name: 'Taxonomy Rifle', weaponType: 'Rifle', weaponFamily: 'rifles',
        weaponTags: ['ranged', 'twoHanded', 'projectile']
      };
      const rifleHeavy = calculatePlayerStats(playerObject);
      playerObject.equippedSkillId = 'balancedStyle';
      const rifleBalanced = calculatePlayerStats(playerObject);
      const balancedProfile = resolveSkillProfile(playerObject);
      return { bladeHeavy, rifleHeavy, rifleBalanced, balancedProfile };
    })()`
  );

  assert.equal(result.bladeHeavy.precision, 5);
  assert.equal(result.bladeHeavy.directDamageMultiplier, 1.1);
  assert.equal(result.bladeHeavy.attackSpeed, 1.1);
  assert.equal(result.bladeHeavy.armorPenetration, 4);
  assert.equal(result.bladeHeavy.defenseTypes.physicalResistance, 7);
  assert.equal(result.rifleHeavy.precision, 0, 'blade bonuses survived a weapon-family swap');
  assert.equal(result.rifleHeavy.attackSpeed, 1, 'one-handed tag bonuses survived a tag swap');
  assert.equal(result.rifleHeavy.damageRollFloorBonus, 0.05);
  assert.equal(result.rifleBalanced.defenseTypes.physicalResistance, 0, 'Heavy Style bonuses survived a style swap');
  assert.equal(result.balancedProfile.attackTimeMultiplier, 0.9);
});

test('ordered save migrations preserve rolls and produce a valid current snapshot', () => {
  const result = evaluateClassic(
    'saveSchema.js',
    `(() => {
      const original = {
        player: {
          level: 12,
          experience: 55,
          baseStats: { defenseTypes: { toughness: 8, heatResistance: 4 } },
          equipment: {
            mainHand: {
              name: 'Legacy Blade', type: 'Weapon', slot: 'mainHand', level: 9,
              damageTypes: { mental: 17 }, rolledModifiers: [{ id: 'preserved-roll', value: 17 }]
            },
            bionicSlots: [{ name: 'Legacy Bionic', type: 'Bionic', slot: 'bionic', defenseTypes: { immunity: 3 } }]
          },
          passives: { allocations: { 'Swift Strikes': 3 }, points: 4, gearBonuses: { GhostPassive: 99 } },
          skills: { equipped: 'legacyStyle' }
        },
        inventory: [
          { name: 'Scrap Metal', type: 'Material', quantity: 12, stackable: true },
          { name: 'Scrap Metal', type: 'Material', quantity: 8, stackable: true },
          { name: 'Wire Bundle', type: 'Material', quantity: 3, stackable: true },
          { name: 'Small Power Cell', type: 'Material', quantity: 2, stackable: true },
          { name: 'Partical Fuser', type: 'Material', quantity: 4, stackable: true }
        ],
        delveBag: { items: [{ name: 'Corrosive Fluid', type: 'Material', quantity: 2 }], credits: 0 },
        componentDropCounts: { 'Basic Sensor Array': 5 },
        meta: { version: 0 }
      };
      const before = JSON.stringify(original);
      const migrated = migrateGameStateSnapshot(original);
      const validation = validateGameStateSnapshot(migrated.state);
      const repeated = migrateGameStateSnapshot(migrated.state);
      return {
        beforeUnchanged: before === JSON.stringify(original),
        migrated,
        validation,
        repeatUnchanged: JSON.stringify(migrated.state) === JSON.stringify(repeated.state)
      };
    })()`
  );

  assert.equal(result.beforeUnchanged, true, 'migration mutated the parsed legacy payload');
  assert.equal(result.migrated.toVersion, 20);
  assert.deepEqual([...result.migrated.appliedVersions], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(result.migrated.state.inventory.length, 0, 'legacy material stacks still occupy ordinary slots');
  assert.equal(result.migrated.state.materialInventory['Scrap Metal'], 20);
  assert.equal(result.migrated.state.materialInventory['Wire Bundle'], 7);
  assert.equal(result.migrated.state.materialInventory['Advanced Electronic Circuit'], 4);
  assert.equal(result.migrated.state.materialInventory['Small Power Cell'], undefined);
  assert.equal(result.migrated.state.delveBag.items[0].name, 'Synthetic Biofluid');
  assert.equal(result.migrated.state.componentDropCounts['Targeting Module'], 5);
  assert.equal(result.migrated.state.player.equipment.mainHand.weaponBaseDamage.slashing, 17);
  assert.equal(result.migrated.state.player.equipment.mainHand.rolledModifiers[0].value, 17);
  assert.equal(result.migrated.state.player.equipment.mainHand.levelRequirement, 9);
  assert.equal(result.migrated.state.player.baseStats.defenseTypes.physicalResistance, 8);
  assert.equal(result.migrated.state.player.baseStats.defenseTypes.elementalResistance, 4);
  assert.equal(result.migrated.state.player.equipment.bionicSlots[0].defenseTypes.chemicalResistance, 3);
  assert.equal(result.migrated.state.player.equipment.bionicSlots.length, 4);
  assert.equal(result.migrated.state.player.passives.gearBonuses, undefined);
  assert.equal(result.migrated.state.player.passives.treeVersion, 6);
  assert.equal(result.migrated.state.player.passives.points, 24, 'retired ranks and two-points-per-level catch-up were not applied');
  assert.equal(Object.keys(result.migrated.state.player.passives.allocations).length, 0);
  assert.equal(result.migrated.state.player.combatStyles.version, 2);
  assert.equal(result.migrated.state.player.feed, 1000);
  assert.deepEqual({ ...result.migrated.state.coreInventory }, {});
  assert.deepEqual({ ...result.migrated.state.cacheInventory }, {});
  assert.deepEqual(Object.keys(result.migrated.state.player.combatStyles.allocations), []);
  assert.equal(result.validation.valid, true);
  assert.equal(result.repeatUnchanged, true, 'current save migration was not idempotent');

  assert.throws(
    () => evaluateClassic('saveSchema.js', 'migrateGameStateSnapshot({ meta: { version: 99 } })'),
    /newer than supported version/,
    'a future-version save was accepted'
  );
});

test('v2 passive saves are refunded and caught up to two points per level', () => {
  const result = evaluateClassic(
    'saveSchema.js',
    `(() => {
      const migrated = migrateGameStateSnapshot({
        player: {
          level: 19,
          passives: {
            allocations: { 'kinetic-offense-1': 1, 'kinetic-offense-2': 1, 'kinetic-offense-3': 1 },
            points: 4,
            treeVersion: 2
          }
        },
        meta: { version: 12 }
      });
      return migrated;
    })()`
  );

  assert.deepEqual([...result.appliedVersions], [13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(result.state.player.passives.treeVersion, 6);
  assert.deepEqual(Object.keys(result.state.player.passives.allocations), []);
  assert.equal(result.state.player.passives.points, 38);
});

test('v14 saves with stale passive treeVersion are refunded to tree version 6', () => {
  const result = evaluateClassic(
    'saveSchema.js',
    `(() => {
      const migrated = migrateGameStateSnapshot({
        player: {
          level: 10,
          passives: {
            allocations: { 'kinetic-offense-1': 1, 'kinetic-offense-2': 1 },
            points: 6,
            treeVersion: 5
          }
        },
        meta: { version: 14 }
      });
      return migrated;
    })()`
  );

  assert.deepEqual([...result.appliedVersions], [15, 16, 17, 18, 19, 20]);
  assert.equal(result.toVersion, 20);
  assert.equal(result.state.player.passives.treeVersion, 6);
  assert.deepEqual(Object.keys(result.state.player.passives.allocations), []);
  assert.equal(result.state.player.passives.points, 20);
});

test('v16 migration converts retired single-type bionic boosters into grouped boosters', () => {
  const result = evaluateClassic(
    'saveSchema.js',
    `migrateGameStateSnapshot({
      player: {
        level: 20,
        equipment: {
          mainHand: null, offHand: null, head: null, chest: null, legs: null, feet: null, gloves: null,
          bionicSlots: [{
            name: 'Pyro Booster', type: 'Bionic', slot: 'bionic',
            statModifiers: { damageTypes: { pyro: 17 } }
          }]
        },
        passives: { allocations: {}, points: 40, treeVersion: 6 },
        combatStyles: { version: 2, allocations: {} }
      },
      inventory: [{
        name: 'Kinetic Booster', type: 'Bionic', slot: 'bionic',
        statModifiers: { damageTypes: { kinetic: 13 } }
      }],
      meta: { version: 15 }
    })`
  );
  assert.deepEqual([...result.appliedVersions], [16, 17, 18, 19, 20]);
  assert.equal(result.state.player.equipment.bionicSlots[0].name, 'Elemental Booster');
  assert.equal(result.state.player.equipment.bionicSlots[0].statModifiers.damageGroups.elemental, 17);
  assert.equal(result.state.inventory[0].name, 'Physical Booster');
  assert.equal(result.state.inventory[0].statModifiers.damageGroups.physical, 13);
});

test('v17 migrates Credits to Feed and initializes new resource stores safely', () => {
  const result = evaluateClassic(
    'saveSchema.js',
    `migrateGameStateSnapshot({
      player: {
        level: 20, currency: 4321,
        equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null, feet: null, gloves: null, bionicSlots: [] },
        passives: { allocations: {}, points: 40, treeVersion: 6 },
        combatStyles: { version: 2, allocations: {} }
      },
      inventory: [], materialInventory: {},
      delveBag: { items: [], credits: 77 },
      delveClaimCache: { items: [], credits: 19 },
      meta: { version: 16 }
    })`
  );

  assert.deepEqual([...result.appliedVersions], [17, 18, 19, 20]);
  assert.equal(result.state.player.feed, 4321);
  assert.equal(result.state.player.currency, undefined);
  assert.equal(result.state.delveBag.feed, 77);
  assert.equal(result.state.delveClaimCache.feed, 19);
  assert.deepEqual({ ...result.state.coreInventory }, {});
  assert.deepEqual({ ...result.state.cacheInventory }, {});
  assert.equal(result.state.pendingCacheResolution, null);
  assert.deepEqual([...result.state.completedOperationSeeds], []);
  assert.equal(result.state.completedOperationCount, 0);
  assert.deepEqual([...result.state.operationBoard.offers], []);
});

test('v19 clamps accidental level-51 saves without discarding allocated passives', () => {
  const result = evaluateClassic(
    'saveSchema.js',
    `migrateGameStateSnapshot({
      player: {
        level: 51, experience: 999,
        passives: { allocations: { 'kept-node': 1 }, points: 4, treeVersion: 6 }
      },
      operationBoard: { version: 1, generation: 12, offers: [{ operationId: 'legacy' }] },
      meta: { version: 18 }
    })`
  );

  assert.deepEqual([...result.appliedVersions], [19, 20]);
  assert.equal(result.state.player.level, 50);
  assert.equal(result.state.player.experience, 0);
  assert.equal(result.state.player.passives.points, 2);
  assert.deepEqual(Object.keys(result.state.player.passives.allocations), ['kept-node']);
  assert.equal(result.state.operationBoard.version, 3);
  assert.deepEqual([...result.state.operationBoard.offers], []);
  assert.deepEqual(JSON.parse(JSON.stringify(result.state.deepSectorProgress)), {
    intel: 0,
    highestUnlockedLevel: 55,
    selectedLevel: 55,
    shop: { cache: 0, flux: 0, material: 0, feed: 0 }
  });
});

test('Core, Cache, and Flux registries use distinct dedicated 512px icons', () => {
  const resources = evaluateClassic(
    'resourceSystem.js',
    `({ cores: CORE_DEFINITIONS, caches: CACHE_DEFINITIONS })`,
    { window: { coreInventory: {}, cacheInventory: {}, registerCoreboundInitializer: () => {} } }
  );
  const flux = materials.filter(material => material.resourceType === 'Flux');
  assert.equal(resources.cores.length, 8);
  assert.equal(resources.caches.length, 9);
  assert.equal(flux.length, 5);
  assert.equal(new Set(resources.cores.map(entry => entry.id)).size, resources.cores.length);
  assert.equal(new Set(resources.caches.map(entry => entry.id)).size, resources.caches.length);

  for (const entry of [...resources.cores, ...resources.caches, ...flux]) {
    const iconPath = path.join(repositoryRoot, entry.icon);
    assert.ok(fs.existsSync(iconPath), `${entry.name} icon does not exist`);
    const png = fs.readFileSync(iconPath);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${entry.name} icon is not a PNG`);
    assert.equal(png.readUInt32BE(16), 512, `${entry.name} icon is not 512px wide`);
    assert.equal(png.readUInt32BE(20), 512, `${entry.name} icon is not 512px tall`);
  }
});

test('Operations consume one Core, randomize event spacing, and out-reward Patrols', () => {
  const result = evaluateClassic(
    ['resourceSystem.js', 'operationSystem.js'],
    `(() => {
      const spacing = [randomOperationSpacing(() => 0), randomOperationSpacing(() => 0.4), randomOperationSpacing(() => 0.999)];
      const normalizedExhausted = normalizeOperationState({ encounterTarget: 6, nextEventAt: null });
      window.coreInventory.accelerator = 2;
      const operation = beginOperationState({ numFights: 6 }, 'accelerator');
      const operationRewards = getActiveOperationRewardModifiers();
      currentRunMode = 'patrol';
      const patrolRewards = getActiveOperationRewardModifiers();
      return {
        spacing,
        exhaustedEventIsInfinite: normalizedExhausted.nextEventAt === Number.POSITIVE_INFINITY,
        remainingCores: window.coreInventory.accelerator,
        attackSpeed: operation.modifiers.attackSpeedPercent,
        encounterTarget: operation.encounterTarget,
        operationRewards,
        patrolRewards
      };
    })()`,
    {
      window: { coreInventory: {}, cacheInventory: {}, registerCoreboundInitializer: () => {} },
      document: { getElementById: () => null },
      currentRunMode: null,
      operationState: null,
      currentMonsterIndex: 0,
      currentDelveLocation: null,
      logMessage: () => {}
    }
  );

  assert.deepEqual([...result.spacing], [1, 2, 3]);
  assert.equal(result.exhaustedEventIsInfinite, true);
  assert.equal(result.remainingCores, 1);
  assert.equal(result.attackSpeed, 0.15);
  assert.equal(result.encounterTarget, 6);
  assert.ok(result.operationRewards.material > result.patrolRewards.material);
  assert.ok(result.operationRewards.cache > result.patrolRewards.cache);
  assert.match(read('operationSystem.js'), /function showOperationEvent[\s\S]*?stopHealthRegen\(\)/, 'Operation event choices do not pause regeneration');
});

test('Operation events expose the approved catalog and persist reusable effects', () => {
  const result = evaluateClassic(
    ['resourceSystem.js', 'operationSystem.js'],
    `(() => {
      const state = normalizeOperationState({ encounterTarget: 8 });
      const echo = OPERATION_EVENT_DEFINITIONS.find(event => event.id === 'temporal-salvage-echo');
      echo.choices[0].apply(state, () => 0);
      echo.choices[1].apply(state, () => 0);
      echo.choices[2].apply(state, () => 0);
      state.completionRewards.push({ kind: 'flux', quantity: 1 });
      state.bonusEventsAt.push(3);
      state.temporaryEffects.push({ remainingEncounters: 3, playerModifiers: { damageMultiplier: 0.1 }, enemyModifiers: {} });
      state.eventHistory.push({
        id: 'sealed-security-door', title: 'Sealed Security Door', choice: 'Attempt an override',
        summary: 'Override failed. Lost 400 Health.', status: 'failure', encounter: 2
      });
      const restored = normalizeOperationState(JSON.parse(JSON.stringify(state)));
      operationState = restored;
      currentRunMode = 'operation';
      const door = OPERATION_EVENT_DEFINITIONS.find(event => event.id === 'sealed-security-door');
      player.currentHealth = 1000;
      const failedOverride = door.choices[1].apply(restored, () => 0.99);
      player.currentHealth = 1000;
      const successfulOverride = door.choices[1].apply(restored, () => 0);
      player.currentHealth = 0;
      player.currentShield = 0;
      restored.survivalProtocol = 'shield';
      const survived = tryConsumeOperationSurvivalProtocol(player);
      return {
        count: OPERATION_EVENT_DEFINITIONS.length,
        unique: new Set(OPERATION_EVENT_DEFINITIONS.map(event => event.id)).size,
        choiceCounts: OPERATION_EVENT_DEFINITIONS.map(event => event.choices.length),
        hasDoor: OPERATION_EVENT_DEFINITIONS.some(event => event.id === 'sealed-security-door'),
        hasShipment: OPERATION_EVENT_DEFINITIONS.some(event => event.id === 'misrouted-cache-shipment'),
        descriptions: OPERATION_EVENT_DEFINITIONS.flatMap(event => event.choices.map(choice => choice.detail)),
        duplication: restored.dropDuplication,
        savedCompletionRewards: restored.completionRewards.length,
        savedBonusEvents: restored.bonusEventsAt.length,
        savedTemporaryEffects: restored.temporaryEffects.length,
        savedEventHistory: restored.eventHistory,
        failedOverride,
        successfulOverride,
        survived,
        survivalHealth: player.currentHealth,
        survivalShield: player.currentShield,
        protocolConsumed: restored.survivalProtocol === null
      };
    })()`,
    {
      window: { coreInventory: {}, cacheInventory: {}, materials, registerCoreboundInitializer: () => {} },
      document: { getElementById: () => null },
      currentRunMode: null,
      operationState: null,
      currentMonsterIndex: 0,
      currentDelveLocation: { recommendedLevel: 50 },
      player: { level: 50, currentHealth: 100, currentShield: 0, totalStats: { health: 1000, energyShield: 400 } },
      updatePlayerStatsDisplay: () => {},
      logMessage: () => {}
    }
  );

  assert.equal(result.count, 35);
  assert.equal(result.unique, 35);
  assert.equal(result.choiceCounts.every(count => count >= 3), true);
  assert.equal(result.hasDoor, true);
  assert.equal(result.hasShipment, true);
  assert.equal(result.descriptions.some(description => /level.?eligible/i.test(description)), false);
  assert.equal(result.duplication.material, 3);
  assert.equal(result.duplication.feed, 3);
  assert.equal(result.duplication.core, 3);
  assert.equal(result.savedCompletionRewards, 1);
  assert.equal(result.savedBonusEvents, 1);
  assert.equal(result.savedTemporaryEffects, 1);
  assert.equal(result.savedEventHistory.length, 1);
  assert.equal(result.savedEventHistory[0].summary, 'Override failed. Lost 400 Health.');
  assert.equal(result.savedEventHistory[0].status, 'failure');
  assert.equal(result.failedOverride.status, 'failure');
  assert.match(result.failedOverride.summary, /Lost 400 Health/);
  assert.equal(result.successfulOverride.status, 'success');
  assert.match(result.successfulOverride.summary, /Core.*added to storage/);
  assert.equal(result.survived, true);
  assert.equal(result.survivalHealth, 1);
  assert.equal(result.survivalShield, 200);
  assert.equal(result.protocolConsumed, true);
  assert.match(read('index.html'), /id="operation-event-history"[\s\S]*id="operation-event-history-list"/);
  assert.match(read('operationSystem.js'), /function recordOperationEventOutcome[\s\S]*function showOperationEventResult/);
  assert.match(read('operationSystem.js'), /showOperationEventResult\(entry/);
  assert.match(read('style.css'), /\.operation-event-history\s*\{[\s\S]*position:\s*absolute/);
});

test('Operation boards gate Deep Sectors until level 50 and reroll every offer on deployment', () => {
  const result = evaluateClassic(
    ['resourceSystem.js', 'operationSystem.js'],
    `(() => {
      const deterministicA = generateOperationOffer('fixed-operation-seed', 28, window.enemies);
      const deterministicB = generateOperationOffer('fixed-operation-seed', 28, window.enemies);
      const sampleRewards = Array.from({ length: 250 }, (_, index) =>
        generateOperationOffer('reward-sample-' + index, 28, window.enemies).guaranteedReward
      );
      const materialNames = new Set(window.materials.map(material => material.name));
      const validRewards = sampleRewards.every(reward => {
        if (reward.kind === 'feed') return reward.quantity > 0;
        if (reward.kind === 'cache') return CACHE_DEFINITIONS.some(cache => cache.id === reward.id);
        if (reward.kind === 'core') return CORE_DEFINITIONS.some(core => core.id === reward.id);
        if (reward.kind === 'material') return materialNames.has(reward.name);
        if (reward.kind === 'materialBundle') return reward.items.every(item => materialNames.has(item.name) && item.quantity > 0);
        return false;
      });
      const preEndgameBoard = normalizeOperationBoard(null, {
        playerLevel: 28,
        enemies: window.enemies,
        random: () => 0.25,
        now: () => 1000
      });
      const normalizedAgain = normalizeOperationBoard(JSON.parse(JSON.stringify(preEndgameBoard)), {
        playerLevel: 28,
        enemies: window.enemies,
        random: () => 0.99,
        now: () => 9999
      });
      window.deepSectorProgress = normalizeDeepSectorProgress({ intel: 1, highestUnlockedLevel: 55, selectedLevel: 55 });
      window.player.level = 50;
      window.operationBoard = normalizeOperationBoard(null, {
        playerLevel: 50,
        enemies: window.enemies,
        random: () => 0.4,
        now: () => 2000
      });
      let lowRewardRoll = 0;
      const level45Feed = chooseOperationGuaranteedReward(45, () => lowRewardRoll++ === 0 ? 0 : 0.999999);
      const level50Feed = chooseOperationGuaranteedReward(50, () => 0);
      const completed = window.operationBoard.offers[0];
      completed.guaranteedReward = { kind: 'feed', quantity: 333 };
      currentDelveLocation = completed;
      const idsBeforeDeployment = window.operationBoard.offers.map(offer => offer.operationId);
      const endgameBands = window.operationBoard.offers.map(offer => offer.difficultyBand);
      const deepLevels = window.operationBoard.offers.filter(offer => offer.deepSector).map(offer => offer.recommendedLevel);
      beginOperationState(completed);
      const idsAfterDeployment = window.operationBoard.offers.map(offer => offer.operationId);
      const reward = completeGeneratedOperation(completed);
      const idsAfterCompletion = window.operationBoard.offers.map(offer => offer.operationId);
      return {
        deterministic: JSON.stringify(deterministicA) === JSON.stringify(deterministicB),
        rewardKinds: [...new Set(sampleRewards.map(reward => reward.kind))],
        validRewards,
        preEndgameBoardSize: preEndgameBoard.offers.length,
        preEndgameBands: preEndgameBoard.offers.map(offer => offer.difficultyBand),
        stableAcrossNormalization: JSON.stringify(preEndgameBoard) === JSON.stringify(normalizedAgain),
        endgameBoardSize: idsBeforeDeployment.length,
        endgameBands,
        deepLevels,
        level45Feed: level45Feed.quantity,
        level50Feed: level50Feed.quantity,
        enemyLevels: deterministicA.enemies.map(spawn => window.enemies.find(enemy => enemy.name === spawn.name).level),
        recommendedLevel: deterministicA.recommendedLevel,
        visibleReward: formatOperationReward(deterministicA.guaranteedReward),
        reward,
        completedSeed: completed.seed,
        stagedFeed: delveBag.feed,
        idsBeforeDeployment,
        idsAfterDeployment,
        idsAfterCompletion,
        intelAfterClear: window.deepSectorProgress.intel,
        completedOperationSeeds,
        completedOperationCount
      };
    })()`,
    {
      window: {
        coreInventory: {}, cacheInventory: {}, materials, enemies,
        player: { level: 28 }, registerCoreboundInitializer: () => {}, operationBoard: null, deepSectorProgress: null
      },
      document: { getElementById: () => null },
      operationState: null,
      currentRunMode: 'operation',
      currentMonsterIndex: 0,
      currentDelveLocation: null,
      delveBag: { items: [], feed: 0 },
      completedOperationSeeds: Array.from({ length: 10 }, (_, index) => `old-${index}`),
      completedOperationCount: 10,
      addItemToDelveBag: () => {},
      logMessage: () => {}
    }
  );

  assert.equal(result.deterministic, true);
  assert.equal(result.validRewards, true);
  assert.deepEqual(new Set(result.rewardKinds), new Set(['feed', 'cache', 'core', 'material', 'materialBundle']));
  assert.equal(result.preEndgameBoardSize, 4);
  assert.deepEqual([...result.preEndgameBands], ['current', 'current', 'lower', 'lower']);
  assert.equal(result.stableAcrossNormalization, true, 'redrawing or loading rerolled the board');
  assert.equal(result.endgameBoardSize, 6);
  assert.deepEqual([...result.endgameBands], ['current', 'current', 'lower', 'lower', 'deep', 'deep']);
  assert.deepEqual([...result.deepLevels], [55, 55]);
  assert.ok(result.level50Feed > result.level45Feed, 'higher-level Feed rewards can roll below lower-level rewards');
  assert.ok(result.enemyLevels.every(level => Math.abs(level - result.recommendedLevel) <= 5));
  assert.ok(result.visibleReward.length > 0);
  assert.equal(result.reward.quantity, 333);
  assert.equal(result.stagedFeed, 333);
  assert.equal(result.idsAfterDeployment.every(id => !result.idsBeforeDeployment.includes(id)), true);
  assert.deepEqual([...result.idsAfterCompletion], [...result.idsAfterDeployment]);
  assert.equal(result.intelAfterClear, 2, 'a level-50 Standard Operation did not award Intel');
  assert.equal(result.completedOperationSeeds.length, 10);
  assert.equal(result.completedOperationSeeds[0], 'old-1');
  assert.equal(result.completedOperationSeeds[9], result.completedSeed);
  assert.equal(result.completedOperationCount, 11);
});

test('Deep Sector Intel sustains escalation and funds permanent Operation loot upgrades', () => {
  const result = evaluateClassic(
    ['resourceSystem.js', 'operationSystem.js'],
    `(() => {
      window.deepSectorProgress = normalizeDeepSectorProgress({ intel: 1 });
      window.operationBoard = normalizeOperationBoard(null, {
        playerLevel: 50,
        enemies: window.enemies,
        random: () => 0.35,
        now: () => 5000
      });
      const deepOffer = window.operationBoard.offers.find(offer => offer.deepSector);
      deepOffer.guaranteedReward = { kind: 'feed', quantity: 500 };
      const cost = deepOffer.intelCost;
      const recovery = deepOffer.intelReward;
      beginOperationState(deepOffer);
      const intelAfterDeployment = window.deepSectorProgress.intel;
      completeGeneratedOperation(deepOffer);
      const intelAfterClear = window.deepSectorProgress.intel;
      const unlockedLevel = window.deepSectorProgress.highestUnlockedLevel;
      const selectedLevel = window.deepSectorProgress.selectedLevel;
      const firstUpgradeCost = getDeepSectorShopUpgradeCost('flux');
      const purchased = purchaseDeepSectorShopUpgrade('flux');
      const shopMultipliers = getDeepSectorIntelShopMultipliers();
      ensureOperationBoard();
      return {
        cost,
        recovery,
        intelAfterDeployment,
        intelAfterClear,
        unlockedLevel,
        selectedLevel,
        firstUpgradeCost,
        purchased,
        fluxRank: window.deepSectorProgress.shop.flux,
        intelAfterPurchase: window.deepSectorProgress.intel,
        shopMultipliers,
        visibleDeepLevels: window.operationBoard.offers.filter(offer => offer.deepSector).map(offer => offer.recommendedLevel),
        level100Cost: getDeepSectorIntelCost(100),
        level100Recovery: getDeepSectorIntelReward(100)
      };
    })()`,
    {
      window: {
        coreInventory: {}, cacheInventory: {}, materials, enemies,
        player: { level: 50 }, registerCoreboundInitializer: () => {}, operationBoard: null, deepSectorProgress: null
      },
      document: { getElementById: () => null },
      operationState: null,
      currentRunMode: null,
      currentMonsterIndex: 0,
      currentDelveLocation: null,
      delveBag: { items: [], feed: 0 },
      completedOperationSeeds: [],
      completedOperationCount: 0,
      addItemToDelveBag: () => {},
      logMessage: () => {}
    }
  );

  assert.equal(result.cost, 1);
  assert.equal(result.recovery, 3);
  assert.equal(result.intelAfterDeployment, 0);
  assert.equal(result.intelAfterClear, 3);
  assert.equal(result.unlockedLevel, 60);
  assert.equal(result.selectedLevel, 60);
  assert.equal(result.firstUpgradeCost, 2);
  assert.equal(result.purchased, true);
  assert.equal(result.fluxRank, 1);
  assert.equal(result.intelAfterPurchase, 1);
  assert.equal(result.shopMultipliers.flux, 1.05);
  assert.deepEqual([...result.visibleDeepLevels], [60, 60]);
  assert.equal(result.level100Cost, 10);
  assert.equal(result.level100Recovery, 12);
  assert.match(read('combatController.js'), /excessLevels \* 0\.07/);
  assert.match(read('combatController.js'), /excessLevels \* 0\.04/);
  assert.match(read('delveUI.js'), /playerLevel >= 50[\s\S]*Deep Sector Operations/);
});

test('Deep Sector offer lists persist across threat switching and all reroll on deployment', () => {
  const result = evaluateClassic(
    ['resourceSystem.js', 'operationSystem.js'],
    `(() => {
      window.deepSectorProgress = normalizeDeepSectorProgress({
        intel: 20,
        highestUnlockedLevel: 65,
        selectedLevel: 55
      });
      window.operationBoard = normalizeOperationBoard(null, {
        playerLevel: 50,
        enemies: window.enemies,
        random: () => 0.31,
        now: () => 7000
      });
      const idsForLevel = level => window.operationBoard.deepSectorOffers[level].map(offer => offer.operationId);
      const allDeepIds = () => Object.values(window.operationBoard.deepSectorOffers)
        .flatMap(offers => offers.map(offer => offer.operationId));
      const initial55 = idsForLevel(55);
      const initial60 = idsForLevel(60);
      const initial65 = idsForLevel(65);
      const generationBeforeSwitching = window.operationBoard.generation;

      selectDeepSectorLevel(60, { enemies: window.enemies, random: () => 0.99, now: () => 9999 });
      const visible60 = window.operationBoard.offers.slice(4).map(offer => offer.operationId);
      selectDeepSectorLevel(55, { enemies: window.enemies, random: () => 0.77, now: () => 8888 });
      const visible55 = window.operationBoard.offers.slice(4).map(offer => offer.operationId);
      selectDeepSectorLevel(60, { enemies: window.enemies, random: () => 0.66, now: () => 7777 });
      const secondVisible60 = window.operationBoard.offers.slice(4).map(offer => offer.operationId);
      const generationAfterSwitching = window.operationBoard.generation;

      const restored = normalizeOperationBoard(JSON.parse(JSON.stringify(window.operationBoard)), {
        playerLevel: 50,
        enemies: window.enemies,
        random: () => 0.01,
        now: () => 123456
      });
      const persistedAfterLoad = JSON.stringify(restored.deepSectorOffers) === JSON.stringify(window.operationBoard.deepSectorOffers);
      const beforeDeployment = allDeepIds();
      const selectedOperation = window.operationBoard.offers[0];
      beginOperationState(selectedOperation);
      const afterDeployment = allDeepIds();

      return {
        levels: Object.keys(window.operationBoard.deepSectorOffers),
        sizes: Object.values(window.operationBoard.deepSectorOffers).map(offers => offers.length),
        initial55,
        initial60,
        initial65,
        visible55,
        visible60,
        secondVisible60,
        generationBeforeSwitching,
        generationAfterSwitching,
        persistedAfterLoad,
        everyDeepOfferRerolled: afterDeployment.every(id => !beforeDeployment.includes(id))
      };
    })()`,
    {
      window: {
        coreInventory: {}, cacheInventory: {}, materials, enemies,
        player: { level: 50 }, registerCoreboundInitializer: () => {}, operationBoard: null, deepSectorProgress: null
      },
      document: { getElementById: () => null },
      operationState: null,
      currentRunMode: null,
      currentMonsterIndex: 0,
      currentDelveLocation: null,
      completedOperationSeeds: [],
      completedOperationCount: 0,
      refreshOperationEventHistoryUI: () => {},
      logMessage: () => {}
    }
  );

  assert.deepEqual([...result.levels], ['55', '60', '65']);
  assert.deepEqual([...result.sizes], [2, 2, 2]);
  assert.deepEqual([...result.visible55], [...result.initial55]);
  assert.deepEqual([...result.visible60], [...result.initial60]);
  assert.deepEqual([...result.secondVisible60], [...result.initial60]);
  assert.equal(result.generationAfterSwitching, result.generationBeforeSwitching);
  assert.equal(result.persistedAfterLoad, true);
  assert.equal(result.everyDeepOfferRerolled, true);
  assert.equal(result.initial65.length, 2);
});

test('Caches always contain guaranteed theme-matching contents while unopened caches retain Feed value', () => {
  const result = evaluateClassic(
    'resourceSystem.js',
    `(() => {
      const kinetic = rollCacheContents('kinetic', () => 0.2);
      const flux = rollCacheContents('flux', () => 0.2);
      const variedFluxValues = [0.999, 0, 0.25, 0.5, 0.75, 0.999];
      let variedFluxIndex = 0;
      const variedFlux = rollCacheContents('flux', () => variedFluxValues[variedFluxIndex++] ?? 0);
      const themed = CACHE_DEFINITIONS.filter(cache => !['flux', 'core'].includes(cache.theme)).map(cache => ({
        theme: cache.theme,
        rewards: [0, 0.2, 0.999].flatMap(value => rollCacheContents(cache.id, () => value))
      }));
      const core = rollCacheContents('core', () => 0.2);
      window.cacheInventory.kinetic = 2;
      const sold = sellCache('kinetic', 1);
      return {
        kinetic,
        flux,
        variedFlux,
        themed,
        themedMatches: themed.every(entry => entry.rewards.every(reward => (
          reward.kind === 'material' && CACHE_THEME_MATERIALS[entry.theme].includes(reward.name)
        ))),
        core,
        sold,
        remaining: window.cacheInventory.kinetic,
        playerFeed
      };
    })()`,
    {
      window: { coreInventory: {}, cacheInventory: {}, registerCoreboundInitializer: () => {} },
      document: { getElementById: () => null },
      player: { level: 30 },
      playerFeed: 0,
      logMessage: () => {}
    }
  );

  assert.equal(result.kinetic[0].name, 'Stabilizer');
  assert.match(result.flux[0].name, /^Flux I{1,3}|Flux IV|Flux V$/);
  assert.equal(result.flux.reduce((total, reward) => total + reward.quantity, 0), 4);
  assert.equal(result.variedFlux.reduce((total, reward) => total + reward.quantity, 0), 5);
  assert.equal(result.variedFlux.every(reward => reward.kind === 'material' && /^Flux (I|II|III|IV|V)$/.test(reward.name)), true);
  assert.equal(result.themed.every(entry => entry.rewards.length > 0), true);
  assert.equal(result.themedMatches, true);
  assert.equal(result.core.length, 1);
  assert.equal(result.core[0].kind, 'core');
  assert.equal([...result.themed.flatMap(entry => entry.rewards), ...result.flux, ...result.variedFlux, ...result.core]
    .some(reward => reward.kind === 'feed'), false);
  assert.equal(result.sold, true);
  assert.equal(result.remaining, 1);
  assert.equal(result.playerFeed, 105);
  assert.match(read('index.html'), /Open for guaranteed themed contents or sell unopened for Feed/);
});

test('Operation and Cache reward manifests are informational and confirm before overflow handling', () => {
  const resources = read('resourceSystem.js');
  const delveRewards = read('delveRewards.js');
  const summaryStart = resources.indexOf('function showRewardSummaryPopup');
  const summaryEnd = resources.indexOf('function attemptResolvePendingCache');
  const summarySource = resources.slice(summaryStart, summaryEnd);

  assert.ok(summaryStart >= 0 && summaryEnd > summaryStart);
  assert.match(summarySource, /confirmButton\.textContent = 'Confirm'/);
  assert.doesNotMatch(summarySource, /Claim|Discard|Sell Remaining/);
  assert.match(resources, /attemptResolvePendingCache\(\{ suppressPopup: true \}\)/);
  assert.match(resources, /if \(window\.pendingCacheResolution\) showCacheResolutionPopup\(\)/);
  assert.match(resources, /eyebrow: 'CACHE OPENED'/);
  assert.match(delveRewards, /eyebrow: 'OPERATION COMPLETE'/);
  assert.match(delveRewards, /rewards: rewardSummary/);
  assert.match(delveRewards, /onConfirm: showPendingClaims/);
});

test('Equipment telemetry exposes complete tabbed stats and presents resistance caps honestly', () => {
  const source = read('inventory.js');
  const styles = read('style.css');
  const requiredStats = [
    'health', 'energyShield', 'healthRegen', 'attackSpeed', 'criticalChance', 'criticalMultiplier',
    'precision', 'deflection', 'armorEfficiency', 'weaponEfficiency', 'bionicEfficiency', 'bionicSync',
    'comboAttack', 'comboEffectiveness', 'additionalComboAttacks', 'propagationTargets',
    'armorPenetration', 'damageRollFloorBonus', 'debuffChanceBonus', 'debuffDurationBonus',
    'statusResistance', 'statusDurationReduction', 'directDamageMultiplier', 'dotDamageMultiplier',
    'damageVsDebuffed', 'damageTakenReduction', 'kineticMastery', 'slashingMastery',
    'severedLimbChance', 'maxSeveredLimbs', 'maxSeepingWoundStacks'
  ];

  for (const stat of requiredStats) {
    assert.match(source, new RegExp(`total\\.${stat}\\b`), `${stat} is missing from Equipment telemetry`);
  }
  assert.match(source, /\['kinetic', 'slashing', 'pyro', 'cryo', 'electric', 'corrosive', 'radiation'\]/);
  assert.match(source, /data-equipment-stats-tab="overview"/);
  assert.match(source, /data-equipment-stats-tab="offense"/);
  assert.match(source, /data-equipment-stats-tab="defense"/);
  assert.match(source, /const cappedPointPercent = \(value, cap = 80\)/);
  assert.match(source, /raw > cap \? `\$\{effectiveText\} <span class="equipment-stat-raw">/);
  assert.match(styles, /grid-template-columns: minmax\(330px, 380px\) minmax\(660px, 980px\)/);
  assert.match(styles, /\.equipment-stat-card-grid/);
});

test('Flux rerolls the permanently bound slot across modifier types, grades, and values', () => {
  const result = evaluateClassic(
    'itemgenerator.js',
    `(() => {
      const item = {
        name: 'Test Plate', type: 'Armor', slot: 'chest', levelRequirement: 45, healthBonus: 150, deflection: 17,
        fluxTargetModifierId: 'flatMaxHealth',
        rolledModifiers: [
          { id: 'flatMaxHealth', displayName: 'Max Health', grade: 3, gradeLabel: 'Grade III', value: 150, displayValue: 150, statPath: 'healthBonus' },
          { id: 'deflection', displayName: 'Deflection', grade: 3, gradeLabel: 'Grade III', value: 17, displayValue: 17, statPath: 'deflection' }
        ]
      };
      const rolls = [0.999999, 0.999999, 0];
      const rerolled = rerollBoundItemModifier(item, () => rolls.shift() ?? 0);
      return {
        rerolled,
        healthBonus: item.healthBonus || 0,
        deflection: item.deflection,
        untouchedModifier: item.rolledModifiers[1],
        fluxTargetModifierId: item.fluxTargetModifierId
      };
    })()`
  );

  assert.equal(result.rerolled.previous.id, 'flatMaxHealth');
  assert.notEqual(result.rerolled.next.id, result.rerolled.previous.id);
  assert.equal(result.rerolled.next.grade, 5);
  assert.equal(result.healthBonus, 0);
  assert.equal(result.deflection, 17);
  assert.equal(result.untouchedModifier.id, 'deflection');
  assert.equal(result.untouchedModifier.displayValue, 17);
  assert.equal(result.fluxTargetModifierId, result.rerolled.next.id);
});

test('Flux can up-tier a bound modifier once and permanently close only Flux modification', () => {
  const result = evaluateClassic(
    'itemgenerator.js',
    `(() => {
      const chip = { name: 'Test Chip', color: 'red' };
      const item = {
        name: 'Test Plate', type: 'Armor', slot: 'chest', levelRequirement: 25,
        healthBonus: 50,
        fluxTargetModifierId: 'flatMaxHealth',
        rolledModifiers: [
          { id: 'flatMaxHealth', displayName: 'Max Health', grade: 2, gradeLabel: 'Grade II', value: 50, displayValue: 50, statPath: 'healthBonus' }
        ],
        rolledWires: [{ color: 'red', chip }]
      };
      const upgraded = upgradeBoundItemModifierGrade(item, () => 0);
      const rerollAfterLock = rerollBoundItemModifier(item, () => 0);
      const secondUpgrade = upgradeBoundItemModifierGrade(item, () => 0);
      return {
        upgraded,
        modifier: item.rolledModifiers[0],
        healthBonus: item.healthBonus,
        locked: item.fluxModificationLocked,
        rerollAfterLock,
        secondUpgrade,
        wireColor: item.rolledWires[0].color,
        chipName: item.rolledWires[0].chip.name
      };
    })()`
  );

  assert.equal(result.upgraded.previous.grade, 2);
  assert.equal(result.upgraded.next.grade, 3);
  assert.equal(result.modifier.grade, 3);
  assert.equal(result.healthBonus, result.modifier.value);
  assert.equal(result.locked, true);
  assert.equal(result.rerollAfterLock, null);
  assert.equal(result.secondUpgrade, null);
  assert.equal(result.wireColor, 'red');
  assert.equal(result.chipName, 'Test Chip');

  const modifierUi = read('itemModification.js');
  assert.match(modifierUi, /const FLUX_GRADE_UPGRADE_COST = 10/);
  assert.match(modifierUi, /updateEquipmentDisplay\(\)/);
  assert.match(modifierUi, /This item can never be rerolled or up-tiered again/);
  assert.match(modifierUi, /Wire and Chip management will remain available/);
  assert.match(read('saveSchema.js'), /item\.fluxModificationLocked = Boolean\(item\.fluxModificationLocked\)/);
});

test('Flux conversion trades five upward and one into three downward', () => {
  const result = evaluateClassic(
    'materialStorage.js',
    `(() => {
      const upgraded = convertFluxStorage(1, 2);
      const afterUpgrade = { low: getMaterialQuantity('Flux I'), high: getMaterialQuantity('Flux II') };
      const downgraded = convertFluxStorage(2, 1);
      return {
        upgraded,
        afterUpgrade,
        downgraded,
        finalLow: getMaterialQuantity('Flux I'),
        finalHigh: getMaterialQuantity('Flux II'),
        invalid: convertFluxStorage(1, 3)
      };
    })()`,
    { window: { materialInventory: { 'Flux I': 5, 'Flux II': 1 } } }
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result.upgraded)), {
    sourceName: 'Flux I', targetName: 'Flux II', sourceCost: 5, outputQuantity: 1
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.afterUpgrade)), { low: 0, high: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(result.downgraded)), {
    sourceName: 'Flux II', targetName: 'Flux I', sourceCost: 1, outputQuantity: 3
  });
  assert.equal(result.finalLow, 3);
  assert.equal(result.finalHigh, 1);
  assert.equal(result.invalid, null);
});

test('max-level Flux drops retain every grade and use the increased drop rate', () => {
  const result = evaluateClassic(
    'resourceSystem.js',
    `(() => {
      const rolls = [0.99, 0.99, 0.06, 0];
      return {
        lowest: getFluxNameForLevel(50, () => 0),
        highest: getFluxNameForLevel(50, () => 0.999999),
        drops: rollEnemySpecialDrops({ level: 50, damageTypes: { kinetic: 10 }, _rewardScale: 1 }, () => rolls.shift() ?? 0.99)
      };
    })()`,
    {
      window: {
        coreInventory: {}, cacheInventory: {}, pendingCacheResolution: null,
        materials: [
          { name: 'Flux I', type: 'Material' }, { name: 'Flux II', type: 'Material' },
          { name: 'Flux III', type: 'Material' }, { name: 'Flux IV', type: 'Material' },
          { name: 'Flux V', type: 'Material' }
        ],
        registerCoreboundInitializer: () => {}
      },
      document: { getElementById: () => null },
      player: { level: 50 }
    }
  );

  assert.equal(result.lowest, 'Flux I');
  assert.equal(result.highest, 'Flux V');
  assert.equal(result.drops.some(drop => drop.name === 'Flux I'), true);
  assert.match(read('resourceSystem.js'), /const fluxChance = Math\.min\(0\.2, \(0\.012 \+ level \* 0\.0011\)/);
});

test('Modification UI exposes the complete eligible roll pool for the selected item', () => {
  const result = evaluateClassic(
    'itemgenerator.js',
    `getPossibleRandomModifiers({
      name: 'Test Projector', type: 'Weapon', slot: 'mainHand', levelRequirement: 45,
      weaponBaseDamage: { pyro: 120 }
    })`
  );
  const modifierUi = read('itemModification.js');

  assert.equal(result.level, 45);
  assert.equal(result.countRange, '3-4');
  assert.ok(result.modifiers.length > 0);
  assert.equal(result.modifiers.every(modifier => modifier.grades.map(grade => grade.grade).join(',') === '3,4,5'), true);
  assert.ok(result.modifiers.some(modifier => modifier.displayName === 'Weapon Attack Speed'));
  assert.ok(result.modifiers.some(modifier => modifier.displayName === 'Weapon Pyro Damage'));
  assert.match(modifierUi, /Possible Rolls \(\$\{info\.modifiers\.length\}\)/);
  assert.match(modifierUi, /renderPossibleModifierBrowser\(item\)/);
  assert.match(modifierUi, /LAST MODIFICATION/);
  assert.match(modifierUi, /renderFluxExchange\(locked\)/);
});

test('obsolete bottom-left loot popup system is fully removed', () => {
  const runtime = [read('combatUI.js'), read('gathering.js'), read('lootHandler.js')].join('\n');
  assert.doesNotMatch(runtime, /displayLootPopup|displayGatheringLootPopup|loot-popups-container|loot-popup/);
  assert.doesNotMatch(read('index.html'), /loot-popups-container/);
  assert.doesNotMatch(read('style.css'), /#loot-popups-container|\.loot-popup/);
});

test('material storage has deterministic slots, capped stacks, and actionable source tooltips', () => {
  const result = evaluateClassic(
    ['lootPools.js', 'locations.js', 'materialStorage.js'],
    `(() => {
      addMaterialToStorage('Scrap Metal', 49999);
      addMaterialToStorage('Scrap Metal', 99);
      const capped = getMaterialQuantity('Scrap Metal');
      const removed = removeMaterialFromStorage('Scrap Metal', 17);
      const sources = getMaterialDropSourceRows('Scrap Metal');
      const tooltip = getMaterialStorageTooltipContent('Scrap Metal', 'Raw Salvage & Alloys');
      return {
        groups: MATERIAL_STORAGE_GROUPS.map(group => ({ id: group.id, materials: [...group.materials] })),
        capped,
        removed,
        remaining: getMaterialQuantity('Scrap Metal'),
        sources,
        tooltip
      };
    })()`,
    {
      window: {
        coreboundConfig: { developerMode: false },
        enemies,
        materials,
        materialInventory: {}
      }
    }
  );

  const slottedNames = result.groups.flatMap(group => group.materials);
  assert.equal(new Set(slottedNames).size, materials.length, 'material slots contain duplicates or omit catalog entries');
  assert.deepEqual(new Set(slottedNames), new Set(materials.map(material => material.name)));
  assert.equal(result.capped, 50000);
  assert.equal(result.removed, true);
  assert.equal(result.remaining, 49983);
  assert.equal(result.sources[0].enemy, 'Scrapmite Drone');
  assert.equal(result.sources[0].location, 'Scrap Intake Yard');
  assert.match(result.tooltip, /49,983 \/ 50,000/);
  assert.match(result.tooltip, /Known enemy drops/);
  assert.match(result.tooltip, /Scrapmite Drone/);
  assert.match(result.tooltip, /Scrap Intake Yard/);

  const inventorySource = read('inventory.js');
  assert.match(inventorySource, /if \(isMaterialItem\(newItem\)\)[\s\S]*?addMaterialToStorage/);
  assert.match(inventorySource, /getUsedInventorySlots\(\)[\s\S]*?!isMaterialItem/);
});

test('content validation rejects unsupported item stats and roll paths', () => {
  const validation = evaluateClassic(
    ['combatSchema.js', 'stats.js', 'contentSchema.js'],
    `validateCoreboundContent({
      items: [{
        name: 'Broken Authoring Test', type: 'Bionic', slot: 'bionic', levelRequirement: 1,
        defelction: 10,
        statModifiers: { precison: 10 },
        rollGroups: [{ pick: 1, from: [{ path: 'statModifiers.damageTypes.poison', value: '1-4' }] }]
      }],
      enemies: [], recipes: [], shops: [], locations: [], passives: [], lootPools: {}, lootTiers: {}
    })`,
    { window: { coreboundConfig: { developerMode: true }, registerCoreboundInitializer: () => {} } }
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => /unknown item field: defelction/.test(error)));
  assert.ok(validation.errors.some(error => /unknown statModifiers key: precison/.test(error)));
  assert.ok(validation.errors.some(error => /unknown roll-group path.*poison/.test(error)));
});

test('all authored registries satisfy the unified content contract', () => {
  const validateRegistries = (developerMode) => evaluateClassic(
    ['enemyAbilities.js', 'combatSchema.js', 'stats.js', 'recipes.js', 'npcshops.js', 'passives.js', 'skills.js', 'lootPools.js', 'locations.js', 'contentSchema.js'],
    `validateCoreboundContent({
      items: testItems,
      enemies: testEnemies,
      recipes: window.recipes,
      shops: npcs,
      locations,
      passives,
      combatStyles,
      lootPools: LOOT_POOLS,
      lootTiers: LOOT_TIERS,
      materialAcquisition: MATERIAL_ACQUISITION,
      developerMode: ${developerMode}
    })`,
    {
      testItems: allItems.filter(item => developerMode || !item.developerOnly),
      testEnemies: enemies.filter(enemy => developerMode || !enemy.developerOnly),
      window: {
        coreboundConfig: { developerMode },
        bionics,
        chips,
        registerCoreboundInitializer: () => {}
      },
      document: {
        getElementById: () => null,
        querySelectorAll: () => []
      },
      player: { level: 1 },
      playerCurrency: 0,
      items: allItems,
      logMessage: () => {}
    }
  );
  const developmentValidation = validateRegistries(true);
  const playerValidation = validateRegistries(false);

  assert.deepEqual([...developmentValidation.errors], []);
  assert.equal(developmentValidation.valid, true);
  assert.deepEqual([...playerValidation.errors], []);
  assert.equal(playerValidation.valid, true);
  assert.equal(developmentValidation.warnings.some(warning => /armorPenetration.*reserved/i.test(warning)), false);
});

test('random affix pools preserve slot identities and restrained late-game counts', () => {
  const pools = evaluateClassic(
    'itemgenerator.js',
    `(() => {
      const ids = item => getEligibleRandomModifiers(item)
        .filter(modifier => 50 >= modifier.minLevel)
        .map(modifier => modifier.id);
      return {
        countRange: getModifierCountRangeForLevel(50),
        weapon: ids({ name: 'Pyro Test Weapon', type: 'Weapon', slot: 'mainHand', levelRequirement: 50, weaponBaseDamage: { pyro: { min: 10, max: 20 } } }),
        chest: ids({ name: 'Test Chest', type: 'Armor', slot: 'chest', levelRequirement: 50 }),
        gloves: ids({ name: 'Thermal Test Gloves', type: 'Armor', slot: 'gloves', levelRequirement: 50 }),
        feet: ids({ name: 'Test Boots', type: 'Armor', slot: 'feet', levelRequirement: 50 }),
        bionic: ids({ name: 'Elemental Booster', type: 'Bionic', slot: 'bionic', levelRequirement: 50, statModifiers: { damageGroups: { elemental: 10 } } }),
        generated: Array.from({ length: 25 }, () => {
          const item = generateItemInstance({
            name: 'Generated Test Chest', type: 'Armor', slot: 'chest',
            levelRequirement: { min: 50, max: 50 }, healthBonus: { min: 100, max: 100 }
          });
          const families = (item.rolledModifiers || []).map(roll =>
            RANDOM_MODIFIER_DEFINITIONS.find(modifier => modifier.id === roll.id)?.family
          );
          return { count: item.rolledModifiers?.length || 0, unique: new Set(families).size === families.length };
        }),
        familiesUnique: (() => {
          const item = { name: 'Test Chest', type: 'Armor', slot: 'chest', levelRequirement: 50 };
          const families = getEligibleRandomModifiers(item).map(modifier => modifier.family);
          return families.includes('maximumHealth') && families.includes('energyShield');
        })()
      };
    })()`,
    {
      getRandomInt: (min) => min,
      getRandomFloat: (min) => min
    }
  );

  assert.equal(pools.countRange, '3-4');
  assert.ok(pools.weapon.includes('weaponDamageTypePercent_pyro'));
  assert.ok(pools.weapon.includes('armorPenetration'));
  assert.equal(pools.weapon.some(id => id.startsWith('weaponConversion_')), false);
  assert.ok(pools.chest.includes('allResistances'));
  assert.equal(pools.chest.includes('attackSpeed'), false);
  assert.ok(pools.gloves.includes('criticalChance'));
  assert.ok(pools.gloves.includes('statusApplicationChance'));
  assert.ok(pools.feet.includes('comboAttackChance'));
  assert.ok(pools.bionic.includes('globalDamageGroupPercent_elemental'));
  assert.equal(pools.bionic.includes('globalDamageTypePercent_pyro'), false);
  assert.ok(pools.bionic.includes('bionicEfficiency'));
  assert.equal(pools.familiesUnique, true);
  assert.equal(pools.generated.every(sample => sample.count >= 3 && sample.count <= 4), true);
  assert.equal(pools.generated.every(sample => sample.unique), true);
});

test('equipment tooltips separate base rolls from affixes without duplicated totals', () => {
  const html = evaluateClassic(
    'tooltip.js',
    `window.getItemTooltipContent({
      name: 'Aegis Reactor Shell', type: 'Armor', slot: 'chest', levelRequirement: 48,
      healthBonus: 1552,
      energyShieldBonus: 903,
      energyShieldBonusPercent: 0.14,
      defenseTypes: { physicalResistance: 0, elementalResistance: 34, chemicalResistance: 0 },
      deflection: 138,
      armorEfficiency: 28,
      bionicSync: 15.5,
      description: 'This description should not render.',
      rolledModifiers: [
        { id: 'resistance_elementalResistance', displayName: 'Elemental Resistance', grade: 5, gradeLabel: 'Grade V', value: 24, displayValue: 24, statPath: 'defenseTypes.elementalResistance', isPercent: true },
        { id: 'bionicSync', displayName: 'Bionic Sync', grade: 4, gradeLabel: 'Grade IV', value: 15.5, displayValue: 15.5, statPath: 'bionicSync', isPercent: true },
        { id: 'deflection', displayName: 'Deflection', grade: 5, gradeLabel: 'Grade V', value: 138, displayValue: 138, statPath: 'deflection', isPercent: false },
        { id: 'armorEfficiency', displayName: 'Armor Efficiency', grade: 5, gradeLabel: 'Grade V', value: 28, displayValue: 28, statPath: 'armorEfficiency', isPercent: true }
      ],
      rolledWires: [{ color: 'green' }]
    })`,
    {
      window: {
        registerCoreboundInitializer: () => {},
        coreboundWeaponTaxonomy: { resolveWeapon: () => null }
      }
    }
  );
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  for (const expected of [
    'Slot: Chest', 'Type: Armor', 'Requires Level: 48',
    'BASE ROLLS', '+1552 Health', '+903 Energy Shield', '+14% Maximum Energy Shield',
    '+10% Elemental Resistance', 'MODIFIERS', '+24% Elemental Resistance', '[Grade V]',
    'WIRES', 'Green'
  ]) {
    assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(text, /\+34% Elemental Resistance/);
  assert.doesNotMatch(text, /\+0% (Physical|Elemental|Chemical) Resistance/);
  assert.doesNotMatch(text, /Bionic Enhancement/);
  assert.doesNotMatch(text, /This description should not render/);
  assert.equal((text.match(/WIRES/g) || []).length, 1);
  assert.doesNotMatch(read('inventory.js'), /tooltipHtml\s*\+=/);
});

test('fabrication tooltip previews show every intrinsic range in the compact layout', () => {
  const html = evaluateClassic(
    'tooltip.js',
    `window.getItemTooltipContent({
      name: 'Aegis Reactor Shell', type: 'Armor', slot: 'chest',
      levelRequirement: { min: 48, max: 48 },
      healthBonus: { min: 1400, max: 1700 },
      energyShieldBonus: { min: 850, max: 950 },
      energyShieldBonusPercentRange: { min: 12, max: 16 },
      defenseTypes: { elementalResistance: { min: 6, max: 10 } }
    }, true)`,
    {
      window: {
        registerCoreboundInitializer: () => {},
        coreboundWeaponTaxonomy: { resolveWeapon: () => null },
        getRandomModifierPreviewInfo: () => ({ countRange: '3-4', maxGradeLabel: 'Grade V' })
      }
    }
  );
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  assert.match(text, /\+1400-1700 Health/);
  assert.match(text, /\+850-950 Energy Shield/);
  assert.match(text, /\+12-16% Maximum Energy Shield/);
  assert.match(text, /\+6-10% Elemental Resistance/);
  assert.match(text, /3-4 Random Modifiers \(up to Grade V\)/);
});

test('bionics use grouped boosters, four progression bands, and a smaller affix budget', () => {
  const names = new Set(bionics.map(item => item.name));
  for (const name of ['Physical Booster', 'Elemental Booster', 'Chemical Booster']) {
    assert.equal(names.has(name), true, `${name} is missing`);
  }
  for (const retired of ['Kinetic Booster', 'Slashing Booster', 'Pyro Booster', 'Cryo Booster', 'Electric Booster', 'Radiation Booster']) {
    assert.equal(names.has(retired), false, `${retired} remained in the live catalog`);
  }

  const bands = bionics.reduce((seen, item) => {
    const level = Number(item.levelRequirement);
    if (level <= 10) seen.add('foundation');
    else if (level <= 25) seen.add('systems');
    else if (level <= 40) seen.add('hybrids');
    else seen.add('endgame');
    return seen;
  }, new Set());
  assert.deepEqual([...bands].sort(), ['endgame', 'foundation', 'hybrids', 'systems']);

  const budgets = evaluateClassic(
    'itemgenerator.js',
    `({
      early: getRandomModifierPreviewInfo({ name: 'Health Module', type: 'Bionic', slot: 'bionic', levelRequirement: 5 }).countRange,
      mid: getRandomModifierPreviewInfo({ name: 'Combo Relay', type: 'Bionic', slot: 'bionic', levelRequirement: 22 }).countRange,
      late: getRandomModifierPreviewInfo({ name: 'Elemental Booster', type: 'Bionic', slot: 'bionic', levelRequirement: 50, statModifiers: { damageGroups: { elemental: 10 } } }).countRange,
      normalLate: getRandomModifierPreviewInfo({ name: 'Chest', type: 'Armor', slot: 'chest', levelRequirement: 50 }).countRange
    })`
  );
  assert.equal(budgets.early, '1');
  assert.equal(budgets.mid, '1-2');
  assert.equal(budgets.late, '2');
  assert.equal(budgets.normalLate, '3-4');
});

test('wires begin at level 30 and black wires remain uncommon universal sockets', () => {
  const result = evaluateClassic(
    'itemgenerator.js',
    `(() => {
      const originalRandom = Math.random;
      const make = (level, rolls) => {
        Math.random = () => rolls.length ? rolls.shift() : 0.5;
        return generateItemInstance({
          name: 'Wire Test Armor', type: 'Armor', slot: 'chest', levelRequirement: level,
          disableRandomModifiers: true
        });
      };
      const low = make(29, [0.99]);
      const noWire = make(30, [0, 0.2]);
      const black = make(30, [0, 0.5, 0.01]);
      const ordinary = make(30, [0, 0.5, 0.5, 0]);
      const bionic = generateItemInstance({
        name: 'Wireless Bionic', type: 'Bionic', slot: 'bionic', levelRequirement: 50,
        disableRandomModifiers: true
      });
      Math.random = originalRandom;
      return { low, noWire, black, ordinary, bionic };
    })()`
  );

  assert.equal(result.low.rolledWires, undefined);
  assert.equal(result.noWire.rolledWires, undefined);
  assert.equal(result.black.rolledWires.length, 1);
  assert.equal(result.black.rolledWires[0].color, 'black');
  assert.equal(result.ordinary.rolledWires[0].color, 'red');
  assert.equal(result.bionic.rolledWires, undefined);
});

test('colored chips are craftable, black chips are apex drops, and offense favors flat damage', () => {
  const recipeCatalog = evaluateClassic('recipes.js', 'window.recipes', {
    window: { coreboundConfig: { developerMode: false }, bionics, chips }
  });
  const recipeNames = new Set(recipeCatalog.map(recipe => recipe.name));
  const colored = chips.filter(item => item.color !== 'black');
  const black = chips.filter(item => item.color === 'black');
  assert.equal(colored.every(item => recipeNames.has(item.name)), true);
  assert.equal(black.every(item => !recipeNames.has(item.name)), true);

  const red = chips.filter(item => item.color === 'red');
  assert.ok(red.filter(item => item.damageTypes).length >= 14);
  assert.equal(red.some(item => item.statModifiers?.damageTypes || item.statModifiers?.damageGroups), false);

  const apexNames = new Set(evaluateClassic('lootPools.js', `LOOT_POOLS.exceptionalApex.items.map(entry => entry.itemName)`));
  assert.equal(black.every(item => apexNames.has(item.name)), true);
});

test('multiple equipped Black Chips are all disabled while colored chips remain active', () => {
  const result = evaluateClassic(
    ['combatSchema.js', 'stats.js'],
    `(() => {
      const blackA = { name: 'Black A', type: 'Chip', color: 'black', healthBonus: 100 };
      const blackB = { name: 'Black B', type: 'Chip', color: 'black', healthBonus: 100 };
      const red = { name: 'Red', type: 'Chip', color: 'red', healthBonus: 25 };
      const makePlayer = secondBlack => ({
        baseStats: {
          maxHealth: 100, maxEnergyShield: 0, healthRegen: 0,
          criticalChance: 0, criticalMultiplier: 1, precision: 0, deflection: 0,
          damageTypes: {}, defenseTypes: {}
        },
        equipment: {
          mainHand: null,
          offHand: { name: 'First', type: 'Armor', slot: 'offHand', rolledWires: [{ color: 'black', chip: blackA }, { color: 'red', chip: red }] },
          head: secondBlack ? { name: 'Second', type: 'Armor', slot: 'head', rolledWires: [{ color: 'black', chip: blackB }] } : null,
          chest: null, legs: null, feet: null, gloves: null, bionicSlots: []
        },
        passiveBonuses: { flatDamageTypes: {}, defenseTypes: {}, damageTypes: {}, damageGroups: {} },
        activeBuffs: [], activeDebuffs: [], gatheringSkills: {}, currentHealth: null, currentShield: null
      });
      const valid = makePlayer(false);
      const conflict = makePlayer(true);
      const validStats = calculatePlayerStats(valid);
      const conflictStats = calculatePlayerStats(conflict);
      const conflictState = getEquippedChipState(conflict);
      return {
        validHealth: validStats.health,
        conflictHealth: conflictStats.health,
        blackCount: conflictState.blackCount,
        conflict: conflictState.hasBlackConflict,
        blackEnabled: isEquippedChipEnabled(blackA, conflictState),
        redEnabled: isEquippedChipEnabled(red, conflictState)
      };
    })()`
  );

  assert.equal(result.validHealth, 225);
  assert.equal(result.conflictHealth, 125);
  assert.equal(result.blackCount, 2);
  assert.equal(result.conflict, true);
  assert.equal(result.blackEnabled, false);
  assert.equal(result.redEnabled, true);
  assert.match(read('inventory.js'), /chip\.effects/);
  assert.match(read('global.js'), /BLACK CHIP CONFLICT/);
});

test('fabrication ingredients are sourced no later than their recipe output', () => {
  const audit = evaluateClassic(
    ['recipes.js', 'lootPools.js'],
    `window.recipes.flatMap(recipe => {
      const output = testItems.find(item => item.name === recipe.name);
      const authoredLevel = output?.levelRequirement ?? output?.level;
      const outputLevel = typeof authoredLevel === 'number'
        ? authoredLevel
        : Number(authoredLevel?.min ?? authoredLevel?.max);
      const ingredientSets = [recipe.ingredients || {}, ...Object.values(recipe.ingredientsByDamage || {})];
      return ingredientSets.flatMap(ingredients => Object.keys(ingredients)).flatMap(ingredient => {
        const source = MATERIAL_ACQUISITION[ingredient];
        if (!source) return [recipe.name + ' -> ' + ingredient + ' (unsourced)'];
        if (Number.isFinite(outputLevel) && source.level > outputLevel) {
          return [recipe.name + ' -> ' + ingredient + ' (level ' + source.level + ' after ' + outputLevel + ')'];
        }
        return [];
      });
    })`,
    { testItems: allItems }
  );
  assert.deepEqual([...audit], []);
});

test('fabrication economy uses compact recipes with progression-scaled bulk costs', () => {
  const recipes = evaluateClassic('recipes.js', 'window.recipes');
  const itemByName = new Map(allItems.map(item => [item.name, item]));
  const retiredMaterials = new Set([
    'Partical Fuser', 'Spider Leg Segment', 'Optic Sensor', 'Memory Chip',
    'Basic Sensor Array', 'Power Converter', 'Neural Processor', 'Pristine Metal Plate',
    'Pure Iron Nugget', 'Copper Vein Sample', 'Titanium Alloy Fragment',
    'Corrosive Fluid', 'Small Power Cell'
  ]);
  const bands = Array.from({ length: 6 }, () => []);
  const usedMaterials = new Set();

  for (const recipe of recipes) {
    const output = itemByName.get(recipe.name);
    const authoredLevel = output?.levelRequirement ?? output?.level ?? 1;
    const level = typeof authoredLevel === 'number'
      ? authoredLevel
      : Number(authoredLevel?.min ?? authoredLevel?.max ?? 1);
    const band = level <= 5 ? 0 : level <= 10 ? 1 : level <= 20 ? 2 : level <= 30 ? 3 : level <= 40 ? 4 : 5;
    const ingredientNames = Object.keys(recipe.ingredients || {});
    const allIngredientNames = [recipe.ingredients || {}, ...Object.values(recipe.ingredientsByDamage || {})]
      .flatMap(ingredients => Object.keys(ingredients));
    const totalUnits = Object.values(recipe.ingredients || {}).reduce((sum, quantity) => sum + Number(quantity), 0);
    bands[band].push(totalUnits);
    allIngredientNames.forEach(name => usedMaterials.add(name));

    assert.ok(ingredientNames.length >= 3 && ingredientNames.length <= 6,
      `${recipe.name} uses ${ingredientNames.length} ingredient types`);
    assert.equal(ingredientNames.includes('Metal Fasteners'), true, `${recipe.name} lost its fastener foundation`);
    assert.equal(ingredientNames.includes('Wire Bundle'), true, `${recipe.name} lost its wiring foundation`);
    assert.equal(ingredientNames.some(name => retiredMaterials.has(name)), false, `${recipe.name} uses a retired material`);
  }

  const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const averages = bands.map(average);
  assert.ok(averages[0] >= 4 && averages[0] <= 6);
  assert.ok(averages[1] >= 8 && averages[1] <= 12);
  assert.ok(averages[2] >= 15 && averages[2] <= 22);
  assert.ok(averages[3] >= 28 && averages[3] <= 38);
  assert.ok(averages[4] >= 45 && averages[4] <= 58);
  assert.ok(averages[5] >= 60 && averages[5] <= 80);
  assert.deepEqual(materials.map(material => material.name)
    .filter(name => !name.startsWith('Flux ') && !usedMaterials.has(name)), []);
  for (const recipe of recipes) {
    assert.ok(Number.isInteger(recipe.feedCost) && recipe.feedCost >= 20, `${recipe.name} has no Feed cost`);
  }
  assert.equal(materials.some(material => retiredMaterials.has(material.name)), false);
});

test('enemy material drops carry foundations forward and preserve targeted thematic ladders', () => {
  const lootPools = evaluateClassic('lootPools.js', 'LOOT_POOLS');
  const storageGroups = evaluateClassic('materialStorage.js', 'MATERIAL_STORAGE_GROUPS', {
    window: { materialInventory: {}, materials }
  });
  const thematicIds = ['kinetic', 'slashing', 'pyro', 'cryo', 'electric', 'chemical', 'radiation'];
  for (const id of thematicIds) {
    const group = storageGroups.find(entry => entry.id === id);
    assert.equal(group.materials.length, 3, `${id} does not have a three-stage material ladder`);
  }

  for (let zone = 1; zone <= 10; zone++) {
    const foundationNames = new Set(lootPools[`foundationZ${zone}`].items.map(entry => entry.itemName));
    assert.equal(foundationNames.has('Metal Fasteners'), true, `zone ${zone} stopped dropping fasteners`);
    assert.equal(foundationNames.has('Wire Bundle'), true, `zone ${zone} stopped dropping wire bundles`);
  }
  const earlyFasteners = lootPools.foundationZ1.items.find(entry => entry.itemName === 'Metal Fasteners');
  const apexFasteners = lootPools.foundationZ10.items.find(entry => entry.itemName === 'Metal Fasteners');
  assert.ok(apexFasteners.minQuantity > earlyFasteners.maxQuantity, 'fastener stacks do not scale with progression');

  const flameVent = enemies.find(enemy => enemy.name === 'Flame Vent Drone');
  const acidCrawler = enemies.find(enemy => enemy.name === 'Acid Vat Crawler');
  assert.ok(flameVent.lootConfig.poolsByTier[2].includes('themePyroCommon'));
  assert.ok(flameVent.lootConfig.poolsByTier[3].includes('themePyroAdvanced'));
  assert.equal(acidCrawler.lootConfig.poolsByTier[2].includes('themePyroCommon'), false);
  assert.ok(lootPools.legacyThemesZ2.items.some(entry => entry.itemName === 'Flame Shell'),
    'later off-theme content cannot carry early Flame Shells forward');

  const apexLegacyNames = new Set(lootPools.legacyThemesZ10.items.map(entry => entry.itemName));
  for (const group of storageGroups.filter(entry => thematicIds.includes(entry.id))) {
    group.materials.forEach(name => assert.equal(apexLegacyNames.has(name), true, `${name} disappears from apex progression`));
  }
});

test('Flame Shell targeted farming stays practical across progression', () => {
  const lootPools = evaluateClassic('lootPools.js', 'LOOT_POOLS');
  const lootTiers = evaluateClassic('lootPools.js', 'LOOT_TIERS');
  const locations = evaluateClassic('locations.js', 'locations');
  const tierWeights = new Map(Object.values(lootTiers).map(tier => [Number(tier.id), Number(tier.chance)]));

  const quantityMultiplier = (quantityClass, zone) => {
    if (quantityClass === 'thematicCommon') return Math.max(1, Math.ceil(zone / 2));
    if (quantityClass === 'thematicAdvanced') return Math.max(1, Math.ceil((zone - 1) / 3));
    if (quantityClass === 'thematicApex' && zone >= 11) return 2;
    return 1;
  };
  const expectedUnitsPerKill = (enemy, itemName) => {
    const viableTiers = Object.entries(enemy.lootConfig.poolsByTier)
      .map(([tierId, poolNames]) => [Number(tierId), poolNames.filter(name => lootPools[name]?.items?.length)])
      .filter(([, poolNames]) => poolNames.length > 0);
    const tierTotal = viableTiers.reduce((sum, [tierId]) => sum + tierWeights.get(tierId), 0);
    let unitsPerGeneratedStack = 0;
    for (const [tierId, poolNames] of viableTiers) {
      const tierChance = tierWeights.get(tierId) / tierTotal;
      for (const poolName of poolNames) {
        const entries = lootPools[poolName].items;
        const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
        for (const entry of entries.filter(candidate => candidate.itemName === itemName)) {
          const averageQuantity = ((entry.minQuantity ?? 1) + (entry.maxQuantity ?? entry.minQuantity ?? 1)) / 2;
          unitsPerGeneratedStack += tierChance * (1 / poolNames.length) * (entry.weight / totalWeight)
            * averageQuantity * quantityMultiplier(entry.quantityClass, enemy.zone);
        }
      }
    }
    const averageStacks = (enemy.lootConfig.minItems + enemy.lootConfig.maxItems) / 2;
    return enemy.lootConfig.baseDropChance * averageStacks * unitsPerGeneratedStack;
  };
  const expectedUnitsPerDelve = (location, itemName) => {
    const totalSpawnWeight = location.enemies.reduce((sum, spawn) => sum + spawn.spawnRate, 0);
    const perFight = location.enemies.reduce((sum, spawn) => {
      const enemy = enemies.find(candidate => candidate.name === spawn.name);
      return sum + (spawn.spawnRate / totalSpawnWeight) * expectedUnitsPerKill(enemy, itemName);
    }, 0);
    return perFight * location.numFights;
  };

  const scrapYard = locations.find(location => location.name === 'Scrap Intake Yard');
  const alloyFloor = locations.find(location => location.name === 'Alloy Processing Floor');
  const contaminatedWing = locations.find(location => location.name === 'Contaminated Fabrication Wing');
  const flameVent = enemies.find(enemy => enemy.name === 'Flame Vent Drone');
  assert.ok(expectedUnitsPerDelve(scrapYard, 'Flame Shell') >= 0.3);
  assert.ok(expectedUnitsPerDelve(alloyFloor, 'Flame Shell') >= 0.6);
  assert.ok(expectedUnitsPerDelve(contaminatedWing, 'Flame Shell') >= 0.8);
  assert.ok(expectedUnitsPerKill(flameVent, 'Flame Shell') >= 0.75);
});

test('Energy Shield refills between delve encounters without healing Health', () => {
  const logs = [];
  const result = evaluateClassic(
    'delveManager.js',
    `(() => {
      const restored = refreshEnergyShieldBetweenDelveEncounters();
      return { restored, health: player.currentHealth, shield: player.currentShield };
    })()`,
    {
      player: { currentHealth: 37, currentShield: 0, totalStats: { health: 100, energyShield: 42 } },
      logMessage: message => logs.push(message),
      updatePlayerStatsDisplay: () => {}
    }
  );
  assert.equal(result.restored, 42);
  assert.equal(result.health, 37);
  assert.equal(result.shield, 42);
  assert.match(logs[0], /Energy Shield reconstituted/);
  assert.match(read('combatController.js'), /currentMonsterIndex < getOperationEncounterTarget\(\)/);
});

test('status resistance affixes modify chance and hostile duration through live stats', () => {
  const durationMultiplier = evaluateClassic(
    'debuffs.js',
    `getDebuffDurationMultiplier(
      { totalStats: { debuffDurationBonus: 0.5 } },
      { totalStats: { statusDurationReduction: 0.2 } }
    )`,
    {
      displayDamagePopup: () => {},
      updatePlayerDebuffsUI: () => {},
      updateEnemyDebuffsUI: () => {},
      player: {},
      enemy: {}
    }
  );
  assert.ok(Math.abs(durationMultiplier - 1.2) < 1e-9);
  assert.match(read('debuffs.js'), /debuffChance -= Math\.max\(0, Number\(target\?\.totalStats\?\.statusResistance/);
});

test('damage packets carry explicit actors and application returns a structured result', () => {
  const result = evaluateClassic(
    ['combatSchema.js', 'combatEffects.js'],
    `(() => {
      const source = {
        name: 'Source',
        currentHealth: 100,
        currentShield: 0,
        activeBuffs: [],
        activeDebuffs: [],
        totalStats: { health: 100, energyShield: 0, attackSpeed: 1, damageTypes: { pyro: 12 }, defenseTypes: {} }
      };
      const target = {
        name: 'Target',
        currentHealth: 20,
        currentShield: 5,
        activeBuffs: [],
        activeDebuffs: [],
        totalStats: { health: 20, energyShield: 5, attackSpeed: 1, damageTypes: {}, defenseTypes: {} }
      };
      const packet = createDamagePacket({ source, target, damage: { pyro: 12 }, total: 12, tags: ['hit'] });
      const application = applyDamage(packet);
      return { packet, application, target };
    })()`,
    {
      player: null,
      enemy: null,
      animateShieldBarChunk: () => {},
      animateHpBarChunk: () => {},
      updateHPESBars: () => {},
      addToCombatLog: () => {},
      getDamageTypeColor: () => '#fff',
      capitalize: value => value,
      awardXPWithZonePenalty: () => {},
      stopCombat: () => {}
    }
  );

  assert.equal(result.packet.schema, 'corebound.damage-packet@1');
  assert.equal(result.packet.source.name, 'Source');
  assert.equal(result.packet.target.name, 'Target');
  assert.equal(result.application.schema, 'corebound.damage-result@1');
  assert.equal(result.application.shieldDamage, 5);
  assert.equal(result.application.healthDamage, 7);
  assert.equal(result.application.appliedDamage, 12);
  assert.equal(result.target.currentShield, 0);
  assert.equal(result.target.currentHealth, 13);
  assert.equal(result.application.target.resources.health.current, 13);
});

test('damage schema normalizes legacy aliases and rejects unknown combat types', () => {
  const result = evaluateClassic(
    'combatSchema.js',
    `(() => {
      const source = { name: 'Source' };
      const target = { name: 'Target' };
      const aliased = createDamagePacket({ source, target, damage: { chemical: 9 }, total: 9 });
      const unknown = createDamagePacket({ source, target, damage: { plasma: 9 }, total: 9 });
      return {
        aliased,
        aliasedValidation: validateDamagePacket(aliased),
        unknownValidation: validateDamagePacket(unknown),
        scaled: scaleDamagePacket(aliased, 0.5)
      };
    })()`
  );

  assert.equal(result.aliased.damage.corrosive, 9);
  assert.equal(result.aliasedValidation.valid, true);
  assert.equal(result.unknownValidation.valid, false);
  assert.match(result.unknownValidation.errors.join(' '), /plasma/);
  assert.equal(result.scaled.damage.corrosive, 4.5);
  assert.equal(result.scaled.total, 5);
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
  assert.equal(sandbox.enemies.length, enemies.filter(enemy => !enemy.developerOnly).length, 'live encounter state replaced the enemy registry');
  assert.deepEqual([...sandbox.encounterEnemies], [], 'live encounter state must begin empty');
});

test('save coordinator enforces one writer and keeps rotating recovery snapshots', () => {
  const storageData = new Map();
  const localStorage = {
    getItem: key => storageData.get(key) ?? null,
    setItem: (key, value) => storageData.set(key, String(value)),
    removeItem: key => storageData.delete(key)
  };
  const result = evaluateClassic(
    'saveCoordinator.js',
    `(() => {
      const first = window.coreboundSaveCoordinator;
      const second = window.createCoreboundSaveCoordinator({
        storage: localStorage,
        eventTarget: { addEventListener: () => {} },
        autoClaim: false,
        tabId: 'second-tab',
        now: () => 2000,
        setIntervalFn: () => 0,
        clearIntervalFn: () => {}
      });
      const firstInitiallyOwned = first.isWriter();
      const secondTookControl = second.takeControl();
      const firstAfterTakeover = first.isWriter();

      const level14 = JSON.stringify({ player: { level: 14 }, meta: { savedAt: 1000 } });
      const level15 = JSON.stringify({ player: { level: 15 }, meta: { savedAt: 2000 } });
      const level19 = JSON.stringify({ player: { level: 19 }, meta: { savedAt: 70000 } });
      const firstBackup = second.backupCurrentSave(4, level14, { force: true });
      const skippedNearDuplicate = second.backupCurrentSave(4, level15);
      const laterBackup = second.backupCurrentSave(4, level19);
      const backupLevels = second.getBackups(4).map(entry => entry.state.player.level);
      const manualBackup = second.backupCurrentSave(4, level15, { force: true, saveKind: 'manual' });
      const manualBackupLevels = second.getBackups(4, 'manual').map(entry => entry.state.player.level);
      second.clearBackups(4);

      return {
        firstInitiallyOwned,
        secondTookControl,
        firstAfterTakeover,
        secondOwns: second.isWriter(),
        firstBackup,
        skippedNearDuplicate,
        laterBackup,
        backupLevels,
        manualBackup,
        manualBackupLevels,
        backupsAfterClear: second.getBackups(4).length
      };
    })()`,
    { localStorage }
  );

  assert.equal(result.firstInitiallyOwned, true);
  assert.equal(result.secondTookControl, true);
  assert.equal(result.firstAfterTakeover, false, 'the previous tab remained a writer');
  assert.equal(result.secondOwns, true);
  assert.equal(result.firstBackup, true);
  assert.equal(result.skippedNearDuplicate, false, 'five-second autosaves should not consume every recovery slot');
  assert.equal(result.laterBackup, true);
  assert.deepEqual([...result.backupLevels], [19, 14]);
  assert.equal(result.manualBackup, true);
  assert.deepEqual([...result.manualBackupLevels], [15]);
  assert.equal(result.backupsAfterClear, 0);
});

test('profile saves keep autosave and manual snapshots independent and preserve legacy slots', () => {
  const storageData = new Map();
  const localStorage = {
    getItem: key => storageData.get(key) ?? null,
    setItem: (key, value) => storageData.set(key, String(value)),
    removeItem: key => storageData.delete(key)
  };
  const result = evaluateClassic(
    'saveProfiles.js',
    `(() => {
      const store = window.coreboundSaveProfiles;
      const legacy = JSON.stringify({ player: { level: 12, currency: 400 }, meta: { savedAt: 1000 } });
      const manual = JSON.stringify({ player: { level: 18, currency: 900 }, meta: { savedAt: 2000 } });
      const autosave = JSON.stringify({ player: { level: 20, currency: 1200 }, meta: { savedAt: 3000 } });
      localStorage.setItem(store.getLegacySnapshotKey(2), legacy);
      const legacyPreview = store.previewSnapshot(2, 'autosave');
      store.writeSnapshot(2, 'manual', manual);
      store.writeSnapshot(2, 'autosave', autosave);
      store.setActiveSlot(2);
      const profile = store.getProfile(2);
      const continuation = store.getContinueChoice();
      store.writeSnapshot(2, 'manual', JSON.stringify({ player: { level: 21 }, meta: { savedAt: 4000 } }));
      const newerManualContinuation = store.getContinueChoice();
      localStorage.setItem(store.getSnapshotKey(2, 'autosave'), '{broken');
      const manualFallback = store.getContinueChoice();
      store.deleteProfile(2);
      return {
        legacyState: legacyPreview.state,
        legacyLevel: legacyPreview.level,
        legacyFlag: legacyPreview.legacy,
        autosaveLevel: profile.autosave.level,
        manualLevel: profile.manual.level,
        continuationKind: continuation.kind,
        continuationLevel: continuation.level,
        newerContinuationKind: newerManualContinuation.kind,
        newerContinuationLevel: newerManualContinuation.level,
        fallbackKind: manualFallback.kind,
        fallbackLevel: manualFallback.level,
        occupiedAfterDelete: store.getProfile(2).occupied
      };
    })()`,
    { localStorage }
  );

  assert.equal(result.legacyState, 'ok');
  assert.equal(result.legacyLevel, 12);
  assert.equal(result.legacyFlag, true);
  assert.equal(result.autosaveLevel, 20);
  assert.equal(result.manualLevel, 18);
  assert.equal(result.continuationKind, 'autosave');
  assert.equal(result.continuationLevel, 20);
  assert.equal(result.newerContinuationKind, 'manual');
  assert.equal(result.newerContinuationLevel, 21);
  assert.equal(result.fallbackKind, 'manual');
  assert.equal(result.fallbackLevel, 21);
  assert.equal(result.occupiedAfterDelete, false);
});

test('save UI only reports manual success after a confirmed write', () => {
  const source = read('global.js');
  assert.match(source, /const result = saveGame\(false, slot\);\s*if \(result\.ok\)/);
  assert.match(source, /if \(!saveRuntimeReady \|\| !ownsSaveWriterLease\(\)\) return;/);
  assert.match(source, /backupCurrentSave\(targetSlot, previousRaw/);
  assert.match(source, /return \{ ok: false, reason: 'save_error'/);
  assert.match(source, /showManualSaveConfirmation\(slot\)/);
  assert.match(source, /window\.addEventListener\('pagehide', forceExitAutosave\)/);
  assert.match(source, /saveRuntimeReady = false;\s*const result = loadGame\(slot, kind\)/);
  assert.match(read('index.html'), /id="save-owner-overlay"/);
  assert.match(read('index.html'), /id="main-menu-overlay"/);
  assert.match(read('index.html'), /id="logout-to-main-menu"/);
  assert.doesNotMatch(read('index.html'), /id="load-game"/);
});

test('character detail export captures the complete balance-facing build', () => {
  const exportPlayer = {
    name: 'Balance Test',
    level: 50,
    experience: 12345,
    currentHealth: 975,
    currentShield: 420,
    passivePoints: 3,
    passiveTreeVersion: 6,
    passiveAllocations: { 'test-passive': 1 },
    gearPassiveBonuses: {},
    passiveBonuses: { healthPercent: 25 },
    equippedSkillId: 'heavyStyle',
    combatStyleAllocations: {
      heavyStyle: { nodes: { 'heavy-choice': 1 } }
    },
    baseStats: { maxHealth: 100 },
    totalStats: { health: 1000, energyShield: 500, attackSpeed: 1.25 },
    gatheringSkills: { Mining: { level: 8, experience: 200 } },
    activeBuffs: [],
    activeDebuffs: [],
    equipment: {
      mainHand: {
        name: 'Terminus Breaker',
        type: 'Weapon',
        slot: 'mainHand',
        icon: 'icons/test.png',
        description: 'presentation-only copy',
        levelRequirement: 50,
        weaponBaseDamage: { kinetic: 200 },
        rolledModifiers: [{ id: 'weaponDamage', grade: 5, value: 45 }],
        rollGroups: [{ id: 'possibleAffix' }]
      },
      offHand: null,
      head: null,
      chest: null,
      legs: null,
      feet: null,
      gloves: null,
      bionicSlots: [null, null, null, null]
    }
  };
  const heavyStyleDefinition = {
    id: 'heavyStyle',
    name: 'Heavy Style',
    description: 'Committed attacks.',
    base: { damageMultiplier: 1.85 },
    tree: {
      nodes: [{
        id: 'heavy-choice',
        name: 'Singular Force',
        description: 'Stronger direct damage.',
        tier: 3,
        tierName: 'Doctrine',
        unlockLevel: 41,
        modifiers: { multiply: { damageMultiplier: 1.3 } },
        mechanics: []
      }]
    }
  };
  const exportText = evaluateClassic(
    'characterExport.js',
    `buildCharacterDetailsExport(player, {
      recalculate: false,
      generatedAt: new Date('2026-08-10T12:00:00.000Z'),
      feed: 7654,
      completedOperationCount: 14,
      completedOperationSeeds: ['op-seed-five', 'op-seed-six'],
      deepSectorProgress: { intel: 17, highestUnlockedLevel: 75, selectedLevel: 70, shop: { cache: 2, flux: 3, material: 1, feed: 4 } },
      completedLocations: { 'Corebound Terminus': 2 },
      locationDefinitions: [{ name: 'Corebound Terminus', locationCategory: 'endgame', endgameTier: 4, recommendedLevel: 50 }]
    })`,
    {
      window: {
        combatStyles: [heavyStyleDefinition],
        registerCoreboundInitializer: () => {}
      },
      player: exportPlayer,
      getPassiveNode: id => id === 'test-passive' ? {
        id,
        name: 'Hardened Core',
        sector: 'kinetic',
        type: 'notable',
        description: 'A defensive allocation.',
        effects: { healthPercent: 25 }
      } : null,
      getPassiveEffectLines: () => ['+25% Maximum Health']
    }
  );

  assert.match(exportText, /Level: 50/);
  assert.match(exportText, /Highest Endgame Tier Cleared: 4/);
  assert.match(exportText, /Total Operation Clears: 14/);
  assert.match(exportText, /Deep Sector Intel: 17/);
  assert.match(exportText, /Highest Deep Sector Threat: 75/);
  assert.match(exportText, /Flux Resonance: 3\/10/);
  assert.match(exportText, /COMPLETED OPERATION SEEDS \(LAST 10\)/);
  assert.match(exportText, /1\. op-seed-five/);
  assert.match(exportText, /2\. op-seed-six/);
  assert.match(exportText, /Active Style: Heavy Style \(heavyStyle\)/);
  assert.match(exportText, /Singular Force \(heavy-choice\)/);
  assert.match(exportText, /Terminus Breaker/);
  assert.match(exportText, /"grade": 5/);
  assert.match(exportText, /Hardened Core \(test-passive\)/);
  assert.match(exportText, /Effect: \+25% Maximum Health/);
  assert.match(exportText, /"health": 1000/);
  assert.match(exportText, /Corebound Terminus: 2 clear\(s\)/);
  assert.doesNotMatch(exportText, /icons\/test\.png/);
  assert.doesNotMatch(exportText, /possibleAffix/);
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

test('delve combat stage uses compact cards, six target slots, and closed utility drawers', () => {
  const html = read('index.html');
  const requiredIds = [
    'delve-combat-stage', 'player-stats', 'player-hp-bar', 'player-es-bar',
    'player-attack-progress-bar',
    'enemy-combat-grid', 'delve-bag-toggle', 'combat-log-toggle',
    'delve-bag-drawer', 'combat-log-drawer', 'delve-bag-container', 'log-messages'
  ];
  for (const id of requiredIds) {
    assert.equal((html.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length, 1, `${id} must appear exactly once`);
  }

  const ui = read('combatUI.js');
  const controller = read('combatController.js');
  const styles = read('style.css');
  assert.match(ui, /for \(let slot = 0; slot < 6; slot\+\+\)/);
  assert.match(ui, /enemy-attack-progress-bar/);
  assert.match(ui, /function startAttackProgressBarCycle\(combatant, durationSeconds, elapsedSeconds = 0\)/);
  assert.match(ui, /bar\.style\.transition = `width \$\{remaining\}s linear`/);
  assert.match(controller, /startAttackProgressBarCycle\('player', playerNextAttackTime\)/);
  assert.match(controller, /startAttackProgressBarCycle\(attacker, nextAttack\)/);
  assert.doesNotMatch(controller, /setAttackProgressBar\([^,]+, Math\.min/, 'combat-loop sampling must not truncate attack-bar animations');
  assert.doesNotMatch(controller, /isPropagationPresentationBusy/, 'propagation visuals must not pause combat timers');
  assert.match(ui, /selectEnemyTarget\(combatId\)/);
  assert.match(ui, /function setDelveCombatUIActive\(active\)/);
  assert.match(ui, /if \(!active\) closeCombatDrawers\(\)/);
  assert.match(ui, /function fitEnemyCardName\(nameElement\)/);
  assert.match(ui, /maximumSize \* \(availableWidth \/ nameElement\.scrollWidth\)/);
  assert.match(ui, /Math\.max\(10,/);
  assert.match(styles, /"top-left top-center top-right"\s*"bottom-left bottom-center bottom-right"/);
  assert.match(styles, /\.enemy-combat-card:nth-child\(1\)\s*\{\s*grid-area:\s*top-center/);
  assert.match(styles, /\.enemy-combat-card:nth-child\(6\)\s*\{\s*grid-area:\s*bottom-right/);
  assert.match(styles, /#player-stats\.player-combat-card\s*\{[^}]*width:\s*min\(364px, 100%\)[^}]*height:\s*188px/s);
  assert.match(styles, /\.player-combat-card\s*\{[^}]*grid-template-rows:\s*27px repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(styles, /\.player-combat-card > h2\s*\{[^}]*overflow:\s*visible/s);
  assert.match(styles, /\.enemy-combat-card\s*\{[^}]*height:\s*188px/s);
  assert.match(styles, /\.enemy-combat-card \.enemy-card-name\s*\{[^}]*white-space:\s*nowrap/s);
});

test('Staggered visibly reports the attack it interrupts', () => {
  const source = read('debuffs.js');
  assert.match(source, /attack was interrupted by <strong>Staggered<\/strong>/);
  assert.match(source, /showAttackInterrupted\(attacker, 'STAGGERED'\)/);
  assert.match(read('combatUI.js'), /function showAttackInterrupted\(combatant, label = 'INTERRUPTED'\)/);
  assert.match(read('style.css'), /\.combat-interruption\s*\{[^}]*animation:\s*combat-interruption/s);
});

test('enemy attacks use canvas assault presentation without delaying combat resolution', () => {
  const html = read('index.html');
  const vfx = read('combatVFX.js');
  const resolution = read('combatResolution.js');
  const styles = read('style.css');
  assert.equal((html.match(/id=["']combat-vfx-canvas["']/g) || []).length, 1);
  assert.match(vfx, /function queueEnemyAttackPresentation\(attacker, target, damagePacket\)/);
  assert.match(vfx, /quadraticCombatVfxPoint/);
  assert.match(vfx, /spawnEnemyAssaultTrailParticle/);
  assert.match(vfx, /spawnEnemyAssaultImpact/);
  assert.match(vfx, /globalCompositeOperation = 'lighter'/);
  assert.match(resolution, /queueEnemyAttackPresentation\(attacker, player, presentationPacket\);[\s\S]*resolveEnemyAttackImpact\(attacker, presented \? presentationPacket : damageResult\)/);
  assert.match(resolution, /flags: \{ \.\.\.damageResult\.flags, animate: false \}/);
  assert.match(styles, /\.combat-vfx-canvas\s*\{[^}]*z-index:\s*5/s);
  assert.match(styles, /\.enemy-assault-damage\s*\{[^}]*font:\s*900 26px/s);
  assert.match(read('combatController.js'), /cancelCombatVfx\(\)/);
});

test('Blade attacks use constrained damage-colored slash VFX through the weapon presentation dispatcher', () => {
  const vfx = read('combatVFX.js');
  const resolution = read('combatResolution.js');
  const propagation = read('propagation.js');
  const ui = read('combatUI.js');
  const styles = read('style.css');
  assert.match(vfx, /const WEAPON_ATTACK_PRESENTERS = Object\.freeze\(\{[\s\S]*blades: queueBladePrimaryAttackPresentation/);
  assert.match(vfx, /const WEAPON_PROPAGATION_PRESENTERS = Object\.freeze\(\{[\s\S]*blades: queueBladePropagationPresentation/);
  assert.match(vfx, /function queuePlayerAttackPresentation\(attacker, target, damagePacket, context = \{\}\)/);
  assert.match(vfx, /angleMagnitude = 0\.48 \+ Math\.random\(\) \* 0\.18/);
  assert.match(vfx, /curvature = \(Math\.random\(\) - 0\.5\) \* length \* 0\.1/);
  assert.match(vfx, /crossCut: true/);
  assert.match(vfx, /radiation: Object\.freeze\(\{ glow: '#24d483'/);
  assert.match(resolution, /queuePlayerAttackPresentation\(attacker, defender, damageResult,[\s\S]*?applyDamage\(damageResult\)/);
  assert.match(ui, /queueWeaponPropagationPresentation\(sequence, complete\)/);
  assert.match(propagation, /dominantDamageType: getDominantPropagationDamageType\(primaryPacket\)/);
  assert.match(styles, /\.enemy-combat-card\.blade-impact-hit\s*\{[^}]*animation:\s*blade-impact-card-hit/s);
  assert.match(styles, /\.blade-propagation-damage:not\(\.critical\)/);
});

test('Impact attacks fracture cards and propagate through directional aftershock VFX', () => {
  const vfx = read('combatVFX.js');
  const styles = read('style.css');
  assert.match(vfx, /impact: queueImpactPrimaryAttackPresentation/);
  assert.match(vfx, /impact: queueImpactPropagationPresentation/);
  assert.match(vfx, /function buildImpactFractures\(center, radius, secondary, critical\)/);
  assert.match(vfx, /7 \+ Math\.floor\(Math\.random\(\) \* 3\)/);
  assert.match(vfx, /aftershockDelayMs: reducedMotion \? 34 : 62/);
  assert.match(vfx, /function drawImpactPressureWave\(context, wave, progress\)/);
  assert.match(vfx, /context\.ellipse\(0, 0, size \* 0\.48, size, 0, -Math\.PI \/ 2, Math\.PI \/ 2\)/);
  assert.match(vfx, /const targetReadyAt = new Map\(\[\[sequence\.primaryTargetId, 0\]\]\)/);
  assert.match(vfx, /originReadyAt \+ \(reducedMotion \? 30 : 55\)/);
  assert.match(vfx, /spawnImpactStrikeParticles\(impact, true\)/);
  assert.match(styles, /\.enemy-combat-card\.impact-strike-hit\s*\{[^}]*animation:\s*impact-strike-card-hit/s);
  assert.match(styles, /\.impact-propagation-damage:not\(\.critical\)/);
});

test('Sidearm attacks fire damage-colored projectile streams with smaller Barrage shots', () => {
  const vfx = read('combatVFX.js');
  const styles = read('style.css');
  assert.match(vfx, /sidearms: queueSidearmPrimaryAttackPresentation/);
  assert.match(vfx, /sidearms: queueSidearmPropagationPresentation/);
  assert.match(vfx, /function buildSidearmShot\(origin, target, options = \{\}\)/);
  assert.match(vfx, /durationMs: reducedMotion \? 125 : secondary \? 235 : 255/);
  assert.match(vfx, /flightPortion: reducedMotion \? 0\.62 : secondary \? 0\.48 : 0\.5/);
  assert.match(vfx, /function drawSidearmMuzzleFlash\(context, shot, progress\)/);
  assert.match(vfx, /function drawSidearmImpactBloom\(context, shot, impactProgress\)/);
  assert.match(vfx, /event\.index \* \(reducedMotion \? 34 : 68\)/);
  assert.match(vfx, /spawnSidearmMuzzleParticles\(shot\)/);
  assert.match(vfx, /spawnSidearmImpactParticles\(shot\)/);
  assert.match(styles, /\.enemy-combat-card\.sidearm-shot-hit\s*\{[^}]*animation:\s*sidearm-shot-card-hit/s);
  assert.match(styles, /\.sidearm-propagation-damage:not\(\.critical\)/);
});

test('Rifle attacks fire heavy rounds and Chain through each resolved origin-target path', () => {
  const vfx = read('combatVFX.js');
  const styles = read('style.css');
  assert.match(vfx, /rifles: queueRiflePrimaryAttackPresentation/);
  assert.match(vfx, /rifles: queueRiflePropagationPresentation/);
  assert.match(vfx, /function buildRifleRound\(origin, target, options = \{\}\)/);
  assert.match(vfx, /durationMs: reducedMotion \? 145 : secondary \? 205 : 310/);
  assert.match(vfx, /const origin = anchors\[event\.originId\];[\s\S]*const target = anchors\[event\.targetId\];[\s\S]*queueRifleRound\(origin, target/);
  assert.match(vfx, /event\.index \* \(reducedMotion \? 60 : 88\)/);
  assert.match(vfx, /function drawRifleRound\(context, round, progress\)/);
  assert.match(vfx, /spawnRifleImpact\(round\)/);
  assert.match(styles, /\.enemy-combat-card\.rifle-round-hit\s*\{[^}]*animation:\s*rifle-round-card-hit/s);
});

test('Ordnance attacks lob payloads before fanning Detonation shrapnel from the primary target', () => {
  const vfx = read('combatVFX.js');
  const styles = read('style.css');
  assert.match(vfx, /ordnance: queueOrdnancePrimaryAttackPresentation/);
  assert.match(vfx, /ordnance: queueOrdnancePropagationPresentation/);
  assert.match(vfx, /function buildOrdnanceEffect\(origin, target, options = \{\}\)/);
  assert.match(vfx, /y: Math\.min\(start\.y, end\.y\) - Math\.min\(165, 78 \+ distance \* 0\.12\)/);
  assert.match(vfx, /shrapnel: true/);
  assert.match(vfx, /delayMs: \(reducedMotion \? 120 : 355\) \+ event\.index \* \(reducedMotion \? 8 : 14\)/);
  assert.match(vfx, /spawnOrdnanceImpact\(effect, true\)/);
  assert.match(styles, /\.enemy-combat-card\.ordnance-blast-hit\s*\{[^}]*animation:\s*ordnance-blast-card-hit/s);
  assert.match(styles, /\.enemy-combat-card\.ordnance-shrapnel-hit\s*\{[^}]*animation:\s*ordnance-shrapnel-card-hit/s);
});

test('Projector attacks snap on sustained beams and pulse Barrage beams sequentially', () => {
  const vfx = read('combatVFX.js');
  const styles = read('style.css');
  assert.match(vfx, /projectors: queueProjectorPrimaryAttackPresentation/);
  assert.match(vfx, /projectors: queueProjectorPropagationPresentation/);
  assert.match(vfx, /function buildProjectorBeam\(origin, target, options = \{\}\)/);
  assert.match(vfx, /durationMs: reducedMotion \? 145 : secondary \? 215 : 305/);
  assert.match(vfx, /strikeProgress: reducedMotion \? 0\.18 : 0\.13/);
  assert.match(vfx, /function traceProjectorBeamPath\(context, beam, reveal, offset, phase\)/);
  assert.match(vfx, /event\.index \* \(reducedMotion \? 40 : 82\)/);
  assert.match(vfx, /spawnProjectorDischarge\(beam, true\)/);
  assert.match(styles, /\.enemy-combat-card\.projector-beam-hit\s*\{[^}]*animation:\s*projector-beam-card-hit/s);
});

test('Conduit attacks form synthetic sigils and burst Nova targets simultaneously', () => {
  const vfx = read('combatVFX.js');
  const styles = read('style.css');
  assert.match(vfx, /conduits: queueConduitPrimaryAttackPresentation/);
  assert.match(vfx, /conduits: queueConduitPropagationPresentation/);
  assert.match(vfx, /function buildConduitEffect\(origin, targets, options = \{\}\)/);
  assert.match(vfx, /const targets = sequence\.events\.map\(event => \(\{ anchor: anchors\[event\.targetId\], event \}\)\)/);
  assert.match(vfx, /nova: true/);
  assert.match(vfx, /for \(const \{ anchor, event \} of targets\)/);
  assert.match(vfx, /function drawConduitSigil\(context, target, effect, progress, alphaMultiplier = 1\)/);
  assert.match(vfx, /const radius = 28 \+ release \* 430/);
  assert.match(vfx, /spawnConduitBurst\(effect\)/);
  assert.match(styles, /\.enemy-combat-card\.conduit-sigil-hit\s*\{[^}]*animation:\s*conduit-sigil-card-hit/s);
});

test('delve deployment grid expands without an internal scrollbar', () => {
  const ui = read('delveUI.js');
  const styles = read('style.css');
  assert.doesNotMatch(ui, /locationScrollContainer\.style\.(?:overflow|maxHeight)/);
  assert.doesNotMatch(ui, /locations-scroll-container::-(?:webkit-)?scrollbar/);
  assert.match(styles, /\.locations-scroll-container\s*\{[^}]*max-height:\s*none\s*!important[^}]*overflow:\s*visible\s*!important/s);
});

test('encounter sizing rises by area level while retaining smaller max-level groups', () => {
  const result = JSON.parse(evaluateClassic(
    'combatController.js',
    `JSON.stringify({
      level1: [getEncounterEnemyCount({ recommendedLevel: 1 }, () => 0), getEncounterEnemyCount({ recommendedLevel: 1 }, () => 0.9)],
      level15: [getEncounterEnemyCount({ recommendedLevel: 15 }, () => 0.1), getEncounterEnemyCount({ recommendedLevel: 15 }, () => 0.4), getEncounterEnemyCount({ recommendedLevel: 15 }, () => 0.95)],
      level25: [getEncounterEnemyCount({ recommendedLevel: 25 }, () => 0.1), getEncounterEnemyCount({ recommendedLevel: 25 }, () => 0.3), getEncounterEnemyCount({ recommendedLevel: 25 }, () => 0.9)],
      level35: [getEncounterEnemyCount({ recommendedLevel: 35 }, () => 0.1), getEncounterEnemyCount({ recommendedLevel: 35 }, () => 0.3), getEncounterEnemyCount({ recommendedLevel: 35 }, () => 0.9)],
      level45: [getEncounterEnemyCount({ recommendedLevel: 45 }, () => 0.1), getEncounterEnemyCount({ recommendedLevel: 45 }, () => 0.3), getEncounterEnemyCount({ recommendedLevel: 45 }, () => 0.9)],
      level50: [getEncounterEnemyCount({ recommendedLevel: 50 }, () => 0.05), getEncounterEnemyCount({ recommendedLevel: 50 }, () => 0.2), getEncounterEnemyCount({ recommendedLevel: 50 }, () => 0.9)],
      developer: getEncounterEnemyCount({ recommendedLevel: 50, developerOnly: true }, () => 0.9)
    })`
  ));

  assert.deepEqual(result.level1, [1, 2]);
  assert.deepEqual(result.level15, [1, 2, 3]);
  assert.deepEqual(result.level25, [2, 3, 4]);
  assert.deepEqual(result.level35, [3, 4, 5]);
  assert.deepEqual(result.level45, [4, 5, 6]);
  assert.deepEqual(result.level50, [4, 5, 6]);
  assert.equal(result.developer, 1);
});

test('taunt redirects attacks without replacing the selected target', () => {
  const combatants = [
    { name: 'Shield', _combatId: 'shield', _slotIndex: 0, currentHealth: 100 },
    { name: 'Selected', _combatId: 'selected', _slotIndex: 1, currentHealth: 100 },
    { name: 'Right', _combatId: 'right', _slotIndex: 2, currentHealth: 100 }
  ];
  const result = JSON.parse(evaluateClassic(
    'combatController.js',
    `JSON.stringify((() => {
      const defaultTarget = getDefaultEnemyTarget();
      selectEnemyTarget(encounterEnemies[1], { silent: true });
      const selectedBeforeTaunt = selectedEnemyId;
      activateEnemyTaunt(encounterEnemies[0], 3);
      const forcedTarget = getEffectivePlayerTarget()._combatId;
      tauntOverride.expiresAt = 0;
      const restoredTarget = getEffectivePlayerTarget()._combatId;
      return { defaultTarget: defaultTarget._combatId, selectedBeforeTaunt, forcedTarget, restoredTarget, selectedAfterTaunt: selectedEnemyId };
    })())`,
    {
      encounterEnemies: combatants,
      enemy: null,
      selectedEnemyId: null,
      tauntOverride: null,
      logMessage: () => {},
      updateEnemyStatsDisplay: () => {}
    }
  ));

  assert.deepEqual(result, {
    defaultTarget: 'selected',
    selectedBeforeTaunt: 'selected',
    forcedTarget: 'shield',
    restoredTarget: 'selected',
    selectedAfterTaunt: 'selected'
  });
  assert.ok(enemies.some(enemy => enemy.tauntAbility), 'no enemy archetype received taunt');
  assert.ok(enemies
    .filter(enemy => ['shield', 'heavy', 'heavyShield'].includes(enemy.archetype) && (enemy.enemyAbilityIds || []).length === 0)
    .every(enemy => enemy.tauntAbility));
});

test('enemy combat roles are authored, validated, and visibly communicated', () => {
  const roleIds = new Set(enemies.flatMap(enemy => enemy.enemyAbilityIds || []));
  assert.deepEqual([...roleIds].sort(), ['berserker', 'cleanser', 'commander', 'repair', 'shieldProjector']);

  const definitions = evaluateClassic('enemyAbilities.js', 'window.enemyAbilityDefinitions');
  for (const roleId of roleIds) {
    assert.ok(definitions[roleId], `missing enemy ability definition: ${roleId}`);
    assert.ok(definitions[roleId].label);
    assert.ok(definitions[roleId].description);
  }

  const controller = read('combatController.js');
  const ui = read('combatUI.js');
  const styles = read('style.css');
  assert.match(controller, /function executeRepairAbility/);
  assert.match(controller, /function executeCleanserAbility/);
  assert.match(controller, /function processShieldProjectorChannels/);
  assert.match(controller, /function applyEnemyAbilityStatModifiers/);
  assert.match(controller, /function processBerserkerAbilities/);
  assert.match(ui, /data-enemy-resistance="physical"/);
  assert.match(ui, /class="enemy-damage-tag"/);
  assert.match(ui, /class="enemy-ability-tag"/);
  assert.match(ui, /function playEnemySupportAbilityEffect/);
  assert.match(styles, /\.enemy-support-link--repair/);
  assert.match(styles, /\.enemy-support-link--shieldProjector/);
  assert.match(styles, /\.enemy-ability-float--berserker/);
});

test('enemy shield damage slices cannot accumulate into card width', () => {
  const ui = read('combatUI.js');
  const styles = read('style.css');
  assert.match(styles, /\.hp-slice,\s*\.es-slice\s*\{[^}]*position:\s*absolute[^}]*animation:\s*fade-out/s);
  assert.match(ui, /const damageWidth = Math\.min\(containerWidth, Math\.max\(0, \(shieldDamageAmount \/ totalEs\) \* containerWidth\)\)/);
  assert.match(ui, /slice\.addEventListener\('animationend', \(\) => slice\.remove\(\), \{ once: true \}\)/);
  assert.match(ui, /setTimeout\(\(\) => slice\.remove\(\), 1200\)/);
});

test('enemy action bars use independent animation cycles for attacks and support actions', () => {
  const ui = read('combatUI.js');
  const controller = read('combatController.js');
  const styles = read('style.css');
  assert.match(ui, /bar\._attackProgressAnimation = bar\.animate/);
  assert.match(ui, /data-enemy-action-label/);
  assert.match(controller, /enemyNextAttackTimes\[candidate\._combatId\] = getEnemyActionInterval\(candidate\)/);
  assert.match(controller, /executeEnemyAction\(attacker\)/);
  assert.match(styles, /\.progress-bar\.attack-bar\s*\{[^}]*display:\s*block/s);
});

test('enemy support roles heal, cleanse, project shields, command allies, and escalate', () => {
  const result = JSON.parse(evaluateClassic(
    ['enemyAbilities.js', 'combatController.js'],
    `JSON.stringify((() => {
      const repairer = { name: 'Repairer', _combatId: 'repairer', currentHealth: 100, enemyAbilityIds: ['repair'], totalStats: { health: 100, energyShield: 0, attackSpeed: 1, damageTypes: { kinetic: 10 }, defenseTypes: {} } };
      const projector = { name: 'Projector', _combatId: 'projector', currentHealth: 100, enemyAbilityIds: ['shieldProjector'], totalStats: { health: 100, energyShield: 20, attackSpeed: 1, damageTypes: { electric: 10 }, defenseTypes: {} } };
      const commander = { name: 'Commander', _combatId: 'commander', currentHealth: 100, enemyAbilityIds: ['commander'], totalStats: { health: 100, energyShield: 0, attackSpeed: 1, damageTypes: { kinetic: 10 }, defenseTypes: {} } };
      const cleanser = { name: 'Cleanser', _combatId: 'cleanser', currentHealth: 100, enemyAbilityIds: ['cleanser'], totalStats: { health: 100, energyShield: 0, attackSpeed: 1, damageTypes: { radiation: 10 }, defenseTypes: {} } };
      const berserker = { name: 'Berserker', _combatId: 'berserker', currentHealth: 100, enemyAbilityIds: ['berserker'], totalStats: { health: 100, energyShield: 0, attackSpeed: 1, damageTypes: { slashing: 10 }, defenseTypes: {} } };
      const ally = {
        name: 'Ally', _combatId: 'ally', currentHealth: 40, currentShield: 10,
        activeDebuffs: [{ name: 'Test', onRemove: () => {} }],
        enemyAbilityIds: [],
        totalStats: { health: 100, energyShield: 100, attackSpeed: 1, precision: 0, damageTypes: { kinetic: 100 }, defenseTypes: {} }
      };
      encounterEnemies = [repairer, projector, commander, cleanser, berserker, ally];
      initializeEnemyAbilityState(projector).shieldTargetId = ally._combatId;
      const repaired = executeRepairAbility(repairer, getEnemyAbilityDefinition('repair'));
      const healthAfterRepair = ally.currentHealth;
      const cleansed = executeCleanserAbility(cleanser);
      processShieldProjectorChannels(1);
      const commandedStats = { attackSpeed: 1, precision: 0, damageTypes: { kinetic: 100 } };
      applyEnemyAbilityStatModifiers(ally, commandedStats);
      processBerserkerAbilities(4.1);
      return {
        repaired,
        healthAfterRepair,
        cleansed,
        debuffsAfterCleanse: ally.activeDebuffs.length,
        shieldAfterChannel: ally.currentShield,
        commandedStats,
        berserkerStacks: berserker._enemyAbilityState.berserkerStacks
      };
    })())`,
    {
      encounterEnemies: [],
      enemyNextAttackTimes: {},
      healEntity: (target, amount) => { target.currentHealth = Math.min(target.totalStats.health, target.currentHealth + amount); },
      calculateEnemyStats: () => {},
      updateEnemyStatsDisplay: () => {},
      addToCombatLog: () => {},
      playEnemySupportAbilityEffect: () => {},
      showEnemyAbilityFloatingText: () => {},
      playEnemySelfAbilityEffect: () => {}
    }
  ));

  assert.equal(result.repaired, true);
  assert.equal(result.healthAfterRepair, 58);
  assert.equal(result.cleansed, true);
  assert.equal(result.debuffsAfterCleanse, 0);
  assert.equal(result.shieldAfterChannel, 22);
  assert.equal(result.commandedStats.attackSpeed, 1.1);
  assert.equal(result.commandedStats.precision, 10);
  assert.ok(Math.abs(result.commandedStats.damageTypes.kinetic - 115) < 1e-9);
  assert.equal(result.berserkerStacks, 1);
});

test('multi-enemy encounter rewards share the original encounter budget', () => {
  const combat = readCombatRuntime();
  assert.match(combat, /const rewardScale = runRewardScale \/ entries\.length/);
  const xpAllocations = JSON.parse(evaluateClassic(
    'combatController.js',
    `JSON.stringify((() => {
      const group = Array.from({ length: 6 }, () => ({ experienceValue: 10, _rewardScale: 1 / 6 }));
      assignEncounterExperienceRewards(group);
      return group.map(enemy => enemy._experienceReward);
    })())`
  ));
  assert.equal(xpAllocations.reduce((sum, value) => sum + value, 0), 10);
  assert.match(combat, /Number\.isFinite\(target\._experienceReward\)/);
  assert.match(read('lootHandler.js'), /dropChance \*= Math\.max\(0, Number\(enemy\._rewardScale \?\? 1\)\)/);
  assert.match(read('delveRewards.js'), /dropRate \* rewardScale/);
  assert.match(read('resourceSystem.js'), /Number\(enemy\?\._rewardScale \?\? 1\)/);
});

test('weapon propagation profiles enforce coefficients, geometry, uniqueness, and Chain revisits', () => {
  const rawResult = evaluateClassic(
    'propagation.js',
    `(() => {
      const makeEnemies = () => Array.from({ length: 6 }, (_, slot) => ({
        name: 'E' + slot,
        id: 'e' + slot,
        _combatId: 'e' + slot,
        _slotIndex: slot,
        currentHealth: 100,
        currentShield: 0,
        totalStats: { defenseTypes: {} }
      }));
      const packet = {
        metadata: { unmitigatedDamage: { kinetic: 100 } },
        damage: { kinetic: 100 },
        total: 100,
        isCritical: true,
        damageRoll: 0.73,
        tags: ['hit']
      };
      const resolveFamily = (family, primarySlot, sourcePacket = packet) => {
        encounterEnemies = makeEnemies();
        const attacker = {
          isPlayer: true,
          name: 'Player',
          equipment: { mainHand: { weaponFamily: family } },
          totalStats: { propagationTargets: 4, armorPenetration: 0 },
          effects: []
        };
        let presentation = null;
        queuePropagationPresentation = sequence => { presentation = sequence; };
        window.coreboundPropagation.resolve(attacker, encounterEnemies[primarySlot], sourcePacket, { hitCount: 1, procOnHit: 'all', procOnCritical: 'all' }, 0, () => 0);
        return presentation;
      };
      return {
        profiles: window.coreboundPropagation.profiles,
        cap: window.coreboundPropagation.targetCap,
        trigger: window.coreboundPropagation.triggerCoefficient,
        cleave: resolveFamily('blades', 0).events.map(event => event.targetId),
        splash: resolveFamily('impact', 1).events.map(event => event.targetId),
        barrage: resolveFamily('sidearms', 0).events.map(event => event.targetId),
        chain: resolveFamily('rifles', 1).events.map(event => event.targetId),
        nova: resolveFamily('conduits', 0).events.map(event => event.targetId),
        dominant: resolveFamily('blades', 0, {
          ...packet,
          metadata: { unmitigatedDamage: { radiation: 80, kinetic: 20 } },
          damage: { radiation: 1, kinetic: 99 }
        }).dominantDamageType
      };
    })()`,
    {
      encounterEnemies: [],
      queuePropagationPresentation: () => {},
      capturePropagationFormationSnapshot: () => ({ anchors: {} }),
      mitigateDamageMapForTarget: (_attacker, _target, damage) => ({
        damage,
        total: Math.round(Object.values(damage).reduce((sum, amount) => sum + amount, 0))
      }),
      createDamagePacket: input => ({ ...input }),
      applyDamage: packet => ({
        appliedDamage: packet.total,
        shieldDamage: 0,
        healthDamage: packet.total,
        targetDefeated: false
      }),
      runIncomingHitDebuffs: () => {},
      runSkillHitProcs: () => {},
      addToCombatLog: () => {},
      window: {
        coreboundWeaponTaxonomy: { resolveWeapon: weapon => ({ family: weapon.weaponFamily }) }
      }
    }
  );
  const result = JSON.parse(JSON.stringify(rawResult));

  assert.equal(result.cap, 5);
  assert.equal(result.trigger, 0.3);
  assert.deepEqual(Object.fromEntries(Object.entries(result.profiles).map(([family, profile]) => [family, [profile.id, profile.damageCoefficient]])), {
    blades: ['cleave', 0.55],
    impact: ['splash', 0.55],
    sidearms: ['barrage', 0.45],
    rifles: ['chain', 0.35],
    projectors: ['barrage', 0.45],
    ordnance: ['detonation', 0.35],
    conduits: ['nova', 0.35]
  });
  assert.deepEqual(result.cleave, ['e1', 'e2', 'e3', 'e4', 'e5']);
  assert.equal(new Set(result.splash).size, 5);
  assert.equal(new Set(result.barrage).size, 5);
  assert.equal(new Set(result.nova).size, 5);
  assert.deepEqual(result.chain, ['e0', 'e1', 'e0', 'e1', 'e0']);
  assert.equal(result.dominant, 'radiation');
  assert.match(read('debuffs.js'), /debuffChance \* triggerCoefficient/);
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

test('Patrol visibility is level-gated while generated Operation progress is persistent', () => {
  const combat = readCombatRuntime();
  const global = read('global.js');

  assert.match(combat, /function getVisibleDelveLocations/);
  assert.match(combat, /recommendedLevel \|\| 1\) <= playerLevel \+ 2/);
  assert.match(combat, /return playerLevel >= 48/);
  assert.match(combat, /completeGeneratedOperation\(currentDelveLocation\)/);
  assert.match(combat, /currentDelveLocation\?\.generatedOperation/);
  assert.match(combat, /ensureOperationBoard\(\)\.offers/);
  assert.match(combat, /Guaranteed on success:/);
  assert.match(global, /completedDelveLocations:/);
  assert.match(global, /completedDelveLocations = gameState\.completedDelveLocations/);
  assert.match(global, /completedDelveLocations = \{\}/);
  assert.match(global, /operationBoard:/);
  assert.match(global, /completedOperationSeeds:/);
  assert.match(global, /completedOperationCount:/);
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
  assert.match(read('global.js'), /const STARTING_FEED = 1000/);
  assert.match(read('fabrication.js'), /playerFeed < fabricationRecipe\.feedCost/);
  assert.match(read('fabrication.js'), /Object\.keys\(ongoingFabrications\)\.length > 0/);
  assert.match(combat, /instance\.isEmpowered = true/);
  assert.match(combat, /getEmpoweredRewardProfile\(defeatedEnemy/);
  assert.match(combat, /Starting a new Operation destroyed/);
  assert.match(combat, /autoPatrolRedeploy/);
  assert.doesNotMatch(combat, /autoRedeploy/);
  assert.match(combat, /reason === 'playerDefeated'/);
  assert.match(combat, /setTimeout\(\(\) => startPatrol\(finishedRunLocation\), 500\)/);
  assert.match(read('global.js'), /delveClaimCache/);
  assert.match(combat, /function preparePlayerForCombat/);
  assert.doesNotMatch(combat, /player\.baseStats = JSON\.parse\(JSON\.stringify\(playerBaseStats\)\)/);
  assert.match(read('buffs.js'), /damageTypes:\s*\{\s*kinetic: 5/);
});

test('delve completion auto-claims rewards and preserves atomic overflow batches', () => {
  const result = JSON.parse(evaluateClassic(
    'delveRewards.js',
    `JSON.stringify((() => {
      function runScenario({ autoClaim, usedSlots, maxSlots, items, feed }) {
        const storedMaterials = [];
        const popupWarnings = [];
        const messages = [];
        window.inventory = Array.from({ length: usedSlots }, (_, index) => ({ name: 'Owned ' + index }));
        globalThis.player = { maxInventorySlots: maxSlots };
        globalThis.playerFeed = 10;
        globalThis.delveBag = { items: items.map(item => ({ ...item })), feed };
        globalThis.delveClaimCache = { items: [], feed: 0 };
        globalThis.isDelveInProgress = true;
        globalThis.localStorage = {
          getItem: key => key === 'autoClaimAllItems' && autoClaim ? 'true' : 'false'
        };
        globalThis.isMaterialItem = item => item?.type === 'Material';
        globalThis.getUsedInventorySlots = () => window.inventory.length;
        globalThis.addItemToInventory = item => {
          if (isMaterialItem(item)) {
            storedMaterials.push({ name: item.name, quantity: item.quantity || 1 });
            return true;
          }
          const copies = item.type === 'Chip' ? Math.max(1, Number(item.quantity) || 1) : 1;
          for (let index = 0; index < copies; index++) window.inventory.push({ ...item, quantity: 1 });
          return true;
        };
        globalThis.clearBuffs = () => {};
        globalThis.updateDelveBagUI = () => {};
        globalThis.logMessage = message => messages.push(message);
        globalThis.showDelveClaimCachePopup = warning => popupWarnings.push(warning);
        globalThis.setTimeout = callback => { callback(); return 0; };

        finalizeDelveLoot();
        return {
          storedMaterials,
          popupWarnings,
          messages,
          inventoryCount: window.inventory.length,
          cacheNames: delveClaimCache.items.map(item => item.name),
          cacheFeed: delveClaimCache.feed,
          playerFeed
        };
      }

      return {
        materialsOnly: runScenario({
          autoClaim: false, usedSlots: 30, maxSlots: 30, feed: 7,
          items: [{ name: 'Scrap Metal', type: 'Material', quantity: 4, stackable: true }]
        }),
        autoFits: runScenario({
          autoClaim: true, usedSlots: 28, maxSlots: 30, feed: 5,
          items: [
            { name: 'Copper Ore', type: 'Material', quantity: 2, stackable: true },
            { name: 'Test Sword', type: 'Weapon' },
            { name: 'Test Armor', type: 'Armor' }
          ]
        }),
        autoOverflows: runScenario({
          autoClaim: true, usedSlots: 29, maxSlots: 30, feed: 3,
          items: [
            { name: 'Iron Ore', type: 'Material', quantity: 3, stackable: true },
            { name: 'First Item', type: 'Weapon' },
            { name: 'Second Item', type: 'Armor' }
          ]
        }),
        manualClaim: runScenario({
          autoClaim: false, usedSlots: 0, maxSlots: 30, feed: 0,
          items: [{ name: 'Saved Item', type: 'Weapon' }]
        })
      };
    })())`
  ));

  assert.deepEqual(result.materialsOnly.storedMaterials, [{ name: 'Scrap Metal', quantity: 4 }]);
  assert.equal(result.materialsOnly.inventoryCount, 30, 'materials consumed an ordinary inventory slot');
  assert.deepEqual(result.materialsOnly.cacheNames, []);
  assert.deepEqual(result.materialsOnly.popupWarnings, []);
  assert.equal(result.materialsOnly.playerFeed, 17, 'Operation Feed was not collected automatically');

  assert.equal(result.autoFits.inventoryCount, 30);
  assert.deepEqual(result.autoFits.cacheNames, []);
  assert.deepEqual(result.autoFits.popupWarnings, []);

  assert.equal(result.autoOverflows.inventoryCount, 29, 'an overflowing auto-claim partially moved ordinary items');
  assert.deepEqual(result.autoOverflows.cacheNames, ['First Item', 'Second Item']);
  assert.deepEqual(result.autoOverflows.popupWarnings, ['Your inventory is full.']);
  assert.equal(result.autoOverflows.playerFeed, 13);
  assert.deepEqual(result.autoOverflows.storedMaterials, [{ name: 'Iron Ore', quantity: 3 }]);

  assert.equal(result.manualClaim.inventoryCount, 1);
  assert.deepEqual(result.manualClaim.cacheNames, []);
  assert.deepEqual(result.manualClaim.popupWarnings, []);

  const uiSource = read('delveUI.js');
  assert.doesNotMatch(uiSource, /Auto-claim all items/);
  assert.doesNotMatch(uiSource, /localStorage\.setItem\('autoClaimAllItems'/);
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
    ['combatSchema.js', 'stats.js'],
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

test('Armor Penetration reduces the matching resistance in live damage math', () => {
  const result = evaluateClassic(
    ['combatSchema.js', 'stats.js'],
    `(() => {
      const attacker = {
        name: 'Attacker', activeDebuffs: [],
        totalStats: {
          damageTypes: { kinetic: 100 }, damageTypeModifiers: { kinetic: 1 },
          damageGroupModifiers: { physical: 1, elemental: 1, chemical: 1 },
          damageMultipliers: {}, precision: 0, criticalChance: 0, criticalMultiplier: 1.5,
          armorPenetration: 15
        }
      };
      const defender = {
        name: 'Defender', activeDebuffs: [],
        totalStats: {
          damageTypes: {}, defenseTypes: { physicalResistance: 40, elementalResistance: 0, chemicalResistance: 0 },
          deflection: 0
        }
      };
      return calculateDamage(attacker, defender, { forceMaxDamageRoll: true });
    })()`,
    { player: {}, logMessage: () => {} }
  );
  assert.equal(result.total, 75);
});

test('empowered enemies roll the approved unique modifier pool and additive rewards', () => {
  const result = evaluateClassic(
    'empoweredModifiers.js',
    `(() => {
      const sequence = values => {
        let index = 0;
        return () => values[index++] ?? 0;
      };
      const normalDouble = rollEmpoweredModifierIds({ random: sequence([0.05, 0, 0]) });
      const normalSingle = rollEmpoweredModifierIds({ random: sequence([0.14, 0]) });
      const deepDouble = rollEmpoweredModifierIds({ deepSector: true, random: sequence([0.14, 0, 0]) });
      const enemy = {
        name: 'Test Enemy', level: 40, health: 100, energyShield: 20,
        damageTypes: { kinetic: 10 },
        defenseTypes: { physicalResistance: 10, elementalResistance: 10, chemicalResistance: 10 }
      };
      applyEmpoweredBaseModifiers(enemy, { modifierIds: ['giant', 'quick'] });
      const reward = getEmpoweredRewardProfile(enemy, { playerLevel: 40 });
      const hasteOne = { currentHealth: 10, empoweredModifierIds: ['hasteAura'] };
      const hasteTwo = { currentHealth: 10, empoweredModifierIds: ['hasteAura'] };
      const war = { currentHealth: 10, empoweredModifierIds: ['warAura'] };
      const ally = { currentHealth: 10, level: 20, empoweredModifierIds: [] };
      globalThis.getLivingEnemies = () => [hasteOne, hasteTwo, war, ally];
      const auraStats = {
        health: 100, energyShield: 0, attackSpeed: 1, criticalChance: 0,
        precision: 0, damageTypes: { kinetic: 10 },
        defenseTypes: { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 }
      };
      applyEmpoweredModifierStatModifiers(ally, auraStats);
      return JSON.parse(JSON.stringify({
        definitionCount: Object.keys(window.empoweredModifierDefinitions).length,
        auraCount: Object.values(window.empoweredModifierDefinitions).filter(entry => entry.aura).length,
        infusionCount: Object.values(window.empoweredModifierDefinitions).filter(entry => entry.infusionType).length,
        normalDouble, normalSingle, deepDouble,
        health: enemy.health,
        shield: enemy.energyShield,
        damage: enemy.damageTypes.kinetic,
        ids: enemy.empoweredModifierIds,
        reward,
        auraAttackSpeed: auraStats.attackSpeed,
        auraDamage: auraStats.damageTypes.kinetic
      }));
    })()`,
    { player: { level: 40 } }
  );

  assert.equal(result.definitionCount, 32);
  assert.equal(result.auraCount, 10);
  assert.equal(result.infusionCount, 7);
  assert.equal(result.normalDouble.length, 2);
  assert.equal(new Set(result.normalDouble).size, 2, 'double modifiers duplicated');
  assert.equal(result.normalSingle.length, 1);
  assert.equal(result.deepDouble.length, 2);
  assert.deepEqual([...result.ids], ['giant', 'quick']);
  assert.equal(result.health, 220, 'additive base and Giant health bonuses drifted');
  assert.equal(result.shield, 36);
  assert.equal(result.damage, 18);
  assert.equal(result.auraAttackSpeed, 1.2, 'duplicate Haste Auras stacked');
  assert.equal(result.auraDamage, 12, 'different squad auras did not coexist');
  assert.deepEqual({ ...result.reward }, {
    modifierCount: 2,
    experienceMultiplier: 1.8,
    feedMultiplier: 1.8,
    materialChanceMultiplier: 1.6,
    materialPromotionChance: 0.24
  });
});

test('equipment resource changes preserve percentages and newly composed squads start full', () => {
  const resources = evaluateClassic(
    'stats.js',
    `(() => {
      const full = { currentHealth: 100, currentShield: 0, totalStats: { health: 100, energyShield: 0 } };
      const fullRatios = captureCombatResourceRatios(full);
      full.totalStats = { health: 250, energyShield: 80 };
      restoreCombatResourceRatios(full, fullRatios);
      const wounded = { currentHealth: 30, currentShield: 20, totalStats: { health: 100, energyShield: 40 } };
      const woundedRatios = captureCombatResourceRatios(wounded);
      wounded.totalStats = { health: 200, energyShield: 100 };
      restoreCombatResourceRatios(wounded, woundedRatios);
      return { full, wounded };
    })()`,
    { player: {} }
  );
  assert.equal(resources.full.currentHealth, 250);
  assert.equal(resources.full.currentShield, 80);
  assert.equal(resources.full.totalStats.health, 250);
  assert.equal(resources.full.totalStats.energyShield, 80);
  assert.equal(resources.wounded.currentHealth, 60);
  assert.equal(resources.wounded.currentShield, 50);

  const squad = evaluateClassic(
    'combatController.js',
    `(() => {
      const group = [
        { health: 100, currentHealth: 100, currentShield: 20, totalStats: { health: 140, energyShield: 75 } },
        { health: 80, currentHealth: 80, currentShield: 0, totalStats: { health: 112, energyShield: 30 } }
      ];
      fillEncounterResourcesAfterSquadModifiers(group);
      return group;
    })()`,
    { encounterEnemies: [] }
  );
  assert.equal(JSON.stringify(squad.map(enemy => [enemy.currentHealth, enemy.currentShield])), JSON.stringify([[140, 75], [112, 30]]));
  assert.match(read('combatController.js'), /refreshEnemyAbilityDerivedStats\(\);\s*fillEncounterResourcesAfterSquadModifiers\(encounterEnemies\)/);
});

test('random squads enforce the approved support budget without banning duplicate support roles', () => {
  const result = evaluateClassic(
    ['enemyAbilities.js', 'combatController.js'],
    `(() => {
      const location = {
        enemies: [
          { name: 'Repair Bot', spawnRate: 100 },
          { name: 'Assault Bot', spawnRate: 100 }
        ]
      };
      const small = selectWeightedEncounterEnemies(location, 4, () => 0);
      const large = selectWeightedEncounterEnemies(location, 6, () => 0);
      const authored = selectWeightedEncounterEnemies({ ...location, allowSupportOverflow: true }, 6, () => 0);
      return {
        small: small.map(entry => entry.name),
        large: large.map(entry => entry.name),
        authored: authored.map(entry => entry.name)
      };
    })()`,
    {
      window: {
        enemies: [
          { name: 'Repair Bot', enemyAbilityIds: ['repair'] },
          { name: 'Assault Bot', enemyAbilityIds: [] }
        ]
      },
      encounterEnemies: []
    }
  );
  assert.equal(result.small.filter(name => name === 'Repair Bot').length, 1);
  assert.equal(result.large.filter(name => name === 'Repair Bot').length, 2);
  assert.equal(result.large.length, 6);
  assert.equal(result.authored.filter(name => name === 'Repair Bot').length, 6);
});

test('Operations save large unique rosters and only Deep Sectors draw from the full scalable catalog', () => {
  const result = evaluateClassic(
    ['resourceSystem.js', 'enemyAbilities.js', 'operationSystem.js'],
    `(() => {
      const standard = generateOperationOffer('standard-roster', 28, window.enemies, 'current');
      const deep = Array.from({ length: 20 }, (_, index) =>
        generateOperationOffer('deep-roster-' + index, 50, window.enemies, 'deep', { deepSectorLevel: 70 })
      );
      const nativeLevel = name => window.enemies.find(enemy => enemy.name === name)?.level || 0;
      return {
        standardSize: standard.enemies.length,
        standardUnique: new Set(standard.enemies.map(entry => entry.name)).size,
        standardLevels: standard.enemies.map(entry => nativeLevel(entry.name)),
        deepSizes: deep.map(offer => offer.enemies.length),
        deepUnique: deep.map(offer => new Set(offer.enemies.map(entry => entry.name)).size),
        deepNativeLevels: deep.flatMap(offer => offer.enemies.map(entry => nativeLevel(entry.name))),
        deepSupportCounts: deep.map(offer => offer.enemies.filter(entry => isEnemySupport(window.enemies.find(enemy => enemy.name === entry.name))).length)
      };
    })()`,
    {
      window: {
        coreInventory: {}, cacheInventory: {}, materials, enemies,
        player: { level: 50 }, registerCoreboundInitializer: () => {}
      },
      document: { getElementById: () => null },
      operationState: null,
      currentRunMode: null,
      currentMonsterIndex: 0,
      currentDelveLocation: null,
      completedOperationSeeds: [],
      completedOperationCount: 0,
      logMessage: () => {}
    }
  );
  assert.ok(result.standardSize >= 10 && result.standardSize <= 12);
  assert.equal(result.standardUnique, result.standardSize);
  assert.ok(result.standardLevels.every(level => Math.abs(level - 28) <= 5));
  assert.equal(result.deepSizes.every(size => size >= 10 && size <= 12), true);
  assert.deepEqual([...result.deepUnique], [...result.deepSizes]);
  assert.ok(Math.min(...result.deepNativeLevels) <= 10, 'Deep Sector rosters never reached the early catalog');
  assert.ok(Math.max(...result.deepNativeLevels) >= 60, 'Deep Sector rosters never reached the late catalog');
  assert.equal(result.deepSupportCounts.every(count => count <= 3), true);
});

test('Deep Sector normalization rebuilds old enemies at the target level before empowerment', () => {
  const native = enemies.find(enemy => enemy.id === 'cb_scrapmite_drone');
  const scaled = createScaledCoreboundEnemy(native.id, 70);
  assert.equal(native.level, 1);
  assert.equal(scaled.level, 70);
  assert.equal(scaled.zone, 14);
  assert.ok(scaled.health > native.health * 10);
  assert.ok(Object.values(scaled.damageTypes)[0] > Object.values(native.damageTypes)[0] * 5);
  assert.ok(scaled.precision >= 440);
  assert.ok(scaled.deflection >= 40);
  assert.equal(scaled.scalableProgressionEnemy, true);
});

test('Deep Sector damage and Precision normalize by target level rather than native enemy level', () => {
  const deepLevels = Array.from({ length: 10 }, (_, index) => 55 + index * 5);
  const scaledByLevel = deepLevels.map(level => ({
    level,
    earlyBalanced: createScaledCoreboundEnemy('cb_bent_service_crawler', level),
    lateBalanced: createScaledCoreboundEnemy('cb_crownfall_skirmisher', level),
    earlySwarm: createScaledCoreboundEnemy('cb_scrapmite_drone', level),
    laterSwarm: createScaledCoreboundEnemy('cb_sovereign_blade_assembly', level)
  }));

  for (const sample of scaledByLevel) {
    assert.equal(Object.values(sample.earlyBalanced.damageTypes)[0], Object.values(sample.lateBalanced.damageTypes)[0]);
    assert.equal(Object.values(sample.earlySwarm.damageTypes)[0], Object.values(sample.laterSwarm.damageTypes)[0]);
    assert.equal(sample.earlySwarm.precision, sample.level * 6 + (sample.level - 50) * 2);
  }
  for (let index = 1; index < scaledByLevel.length; index++) {
    assert.ok(
      Object.values(scaledByLevel[index].earlySwarm.damageTypes)[0]
        > Object.values(scaledByLevel[index - 1].earlySwarm.damageTypes)[0],
      `Deep Sector damage did not increase from level ${scaledByLevel[index - 1].level} to ${scaledByLevel[index].level}`
    );
  }

  const earlySwarm = scaledByLevel[0].earlySwarm;
  assert.equal(earlySwarm.precision, 340);

  const representativeDeflection = 305;
  const rollFloor = Math.min(0.85, Math.max(0.1, 0.35 + (earlySwarm.precision - representativeDeflection) * 0.015));
  const minimumHitAtResistanceCap = Object.values(earlySwarm.damageTypes)[0] * rollFloor * 0.20;
  assert.ok(minimumHitAtResistanceCap >= 9, 'a normalized level-55 enemy can still collapse to trivial capped-resistance damage');
});

test('support enemies exclude personal offensive Empowered modifiers while retaining auras', () => {
  const result = evaluateClassic(
    ['enemyAbilities.js', 'empoweredModifiers.js'],
    `(() => {
      const eligible = getEligibleEmpoweredModifierIds({ support: true });
      const support = {
        level: 50,
        health: 100,
        energyShield: 50,
        damageTypes: { kinetic: 10 },
        defenseTypes: {},
        enemyAbilityIds: ['repair']
      };
      applyEmpoweredBaseModifiers(support, { modifierIds: ['slashingInfused', 'barrierAura'] });
      return { eligible, rolled: support.empoweredModifierIds };
    })()`
  );
  const excluded = ['brutal', 'quick', 'precise', 'overcharged', 'vampiric', 'frenzied',
    'kineticInfused', 'slashingInfused', 'pyroInfused', 'cryoInfused', 'electricInfused', 'corrosiveInfused', 'radiationInfused'];
  assert.equal(excluded.some(id => result.eligible.includes(id)), false);
  assert.equal(result.eligible.includes('barrierAura'), true);
  assert.deepEqual([...result.rolled], ['barrierAura']);
});
