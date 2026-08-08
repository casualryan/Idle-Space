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
  'combatSchema.js',
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
        jewels: passives.filter(node => node.type === 'jewel').length,
        before, blockedOuter, blockedRefund, leafRefund
      };
    })()`
  );
  assert.equal(result.validation.valid, true, result.validation.errors.join('; '));
  assert.equal(result.nodeCount, 1478);
  assert.equal(result.edgeCount, 1806);
  assert.equal(result.clusterCount, 147);
  assert.equal(result.notableCount, 210);
  assert.equal(result.keystones, 35);
  assert.equal(result.jewels, 0);
  assert.equal(result.sectorCounts.every(count => count === 193), true);
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
  const overviewTypes = new Set(['origin', 'gateway', 'travel', 'bridge', 'notable', 'keystone']);
  const overviewNodeCount = passiveDefinitions.filter(node => overviewTypes.has(node.type)).length;

  assert.equal(overviewNodeCount, 484, 'overview detail unexpectedly includes the full minor-node population');
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
      const home = getPassiveTreeHomeView();
      const origin = getPassiveNode(PASSIVE_TREE_ORIGIN_ID);
      const rect = { left: 0, top: 0, width: 800, height: 600 };
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
      return { hitNodeId, canvasWidth: canvas.width, canvasHeight: canvas.height, calls };
    })()`,
    {
      player: {
        passiveTreeVersion: 3, passiveAllocations: {}, passivePoints: 2, gearPassiveBonuses: {}, level: 1,
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
  assert.ok(result.calls.arcs > 1478, 'canvas did not paint nodes and cluster rings');
  assert.ok(result.calls.lines > 0, 'canvas did not paint graph connections');
  assert.ok(result.calls.transforms >= 2, 'canvas transform was not reset and reapplied');
});

test('level progression awards two passive points and starts level one with two', () => {
  const globalSource = read('global.js');
  const codexSource = read('codex.js');
  assert.match(globalSource, /passivePoints:\s*2/, 'new characters do not begin with two passive points');
  assert.match(globalSource, /passivePoints\s*=\s*\(player\.passivePoints\s*\|\|\s*0\)\s*\+\s*2/, 'level-up does not award two passive points');
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
    level: 51,
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
    'combatSchema.js',
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
  assert.equal(result.migrated.toVersion, 13);
  assert.deepEqual([...result.migrated.appliedVersions], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
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
  assert.equal(result.migrated.state.player.passives.treeVersion, 3);
  assert.equal(result.migrated.state.player.passives.points, 24, 'retired ranks and two-points-per-level catch-up were not applied');
  assert.equal(Object.keys(result.migrated.state.player.passives.allocations).length, 0);
  assert.equal(result.migrated.state.player.combatStyles.version, 2);
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

  assert.deepEqual([...result.appliedVersions], [13]);
  assert.equal(result.state.player.passives.treeVersion, 3);
  assert.deepEqual(Object.keys(result.state.player.passives.allocations), []);
  assert.equal(result.state.player.passives.points, 38);
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
    ['combatSchema.js', 'stats.js', 'recipes.js', 'npcshops.js', 'passives.js', 'skills.js', 'lootPools.js', 'locations.js', 'contentSchema.js'],
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
        bionic: ids({ name: 'Pyro Booster', type: 'Bionic', slot: 'bionic', levelRequirement: 50, statModifiers: { damageTypes: { pyro: 10 } } }),
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
  assert.ok(pools.bionic.includes('globalDamageTypePercent_pyro'));
  assert.ok(pools.bionic.includes('bionicEfficiency'));
  assert.equal(pools.familiesUnique, true);
  assert.equal(pools.generated.every(sample => sample.count >= 3 && sample.count <= 4), true);
  assert.equal(pools.generated.every(sample => sample.unique), true);
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
      return Object.keys(recipe.ingredients || {}).flatMap(ingredient => {
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
    const totalUnits = Object.values(recipe.ingredients || {}).reduce((sum, quantity) => sum + Number(quantity), 0);
    bands[band].push(totalUnits);
    ingredientNames.forEach(name => usedMaterials.add(name));

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
  assert.deepEqual(materials.map(material => material.name).filter(name => !usedMaterials.has(name)), []);
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
  assert.match(read('combatController.js'), /currentMonsterIndex < currentDelveLocation\.numFights/);
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
  assert.equal(result.backupsAfterClear, 0);
});

test('save UI only reports manual success after a confirmed write', () => {
  const source = read('global.js');
  assert.match(source, /const result = saveGame\(false, slot\);\s*if \(result\.ok\)/);
  assert.match(source, /if \(!saveRuntimeReady \|\| !ownsSaveWriterLease\(\)\) return;/);
  assert.match(source, /backupCurrentSave\(targetSlot, previousRaw/);
  assert.match(source, /return \{ ok: false, reason: 'save_error'/);
  assert.match(read('index.html'), /id="save-owner-overlay"/);
  assert.match(read('index.html'), /id="restore-save-backup"/);
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

test('delve completion auto-claims materials and atomically claims optional item batches', () => {
  const result = JSON.parse(evaluateClassic(
    'delveRewards.js',
    `JSON.stringify((() => {
      function runScenario({ autoClaim, usedSlots, maxSlots, items, credits }) {
        const storedMaterials = [];
        const popupWarnings = [];
        const messages = [];
        window.inventory = Array.from({ length: usedSlots }, (_, index) => ({ name: 'Owned ' + index }));
        globalThis.player = { maxInventorySlots: maxSlots };
        globalThis.playerCurrency = 10;
        globalThis.delveBag = { items: items.map(item => ({ ...item })), credits };
        globalThis.delveClaimCache = { items: [], credits: 0 };
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
          cacheCredits: delveClaimCache.credits,
          playerCurrency
        };
      }

      return {
        materialsOnly: runScenario({
          autoClaim: false, usedSlots: 30, maxSlots: 30, credits: 7,
          items: [{ name: 'Scrap Metal', type: 'Material', quantity: 4, stackable: true }]
        }),
        autoFits: runScenario({
          autoClaim: true, usedSlots: 28, maxSlots: 30, credits: 5,
          items: [
            { name: 'Copper Ore', type: 'Material', quantity: 2, stackable: true },
            { name: 'Test Sword', type: 'Weapon' },
            { name: 'Test Armor', type: 'Armor' }
          ]
        }),
        autoOverflows: runScenario({
          autoClaim: true, usedSlots: 29, maxSlots: 30, credits: 3,
          items: [
            { name: 'Iron Ore', type: 'Material', quantity: 3, stackable: true },
            { name: 'First Item', type: 'Weapon' },
            { name: 'Second Item', type: 'Armor' }
          ]
        }),
        manualClaim: runScenario({
          autoClaim: false, usedSlots: 0, maxSlots: 30, credits: 0,
          items: [{ name: 'Saved Item', type: 'Weapon' }]
        })
      };
    })())`
  ));

  assert.deepEqual(result.materialsOnly.storedMaterials, [{ name: 'Scrap Metal', quantity: 4 }]);
  assert.equal(result.materialsOnly.inventoryCount, 30, 'materials consumed an ordinary inventory slot');
  assert.deepEqual(result.materialsOnly.cacheNames, []);
  assert.deepEqual(result.materialsOnly.popupWarnings, []);
  assert.equal(result.materialsOnly.playerCurrency, 17, 'delve credits were not collected automatically');

  assert.equal(result.autoFits.inventoryCount, 30);
  assert.deepEqual(result.autoFits.cacheNames, []);
  assert.deepEqual(result.autoFits.popupWarnings, []);

  assert.equal(result.autoOverflows.inventoryCount, 29, 'an overflowing auto-claim partially moved ordinary items');
  assert.deepEqual(result.autoOverflows.cacheNames, ['First Item', 'Second Item']);
  assert.deepEqual(result.autoOverflows.popupWarnings, ['Your inventory is full.']);
  assert.equal(result.autoOverflows.playerCurrency, 13);
  assert.deepEqual(result.autoOverflows.storedMaterials, [{ name: 'Iron Ore', quantity: 3 }]);

  assert.deepEqual(result.manualClaim.cacheNames, ['Saved Item']);
  assert.deepEqual(result.manualClaim.popupWarnings, ['']);

  const uiSource = read('delveUI.js');
  assert.match(uiSource, /Auto-claim all items/);
  assert.match(uiSource, /localStorage\.setItem\('autoClaimAllItems'/);
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
