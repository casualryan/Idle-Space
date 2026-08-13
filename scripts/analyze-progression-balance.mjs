import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import enemies from '../src/enemies/index.js';
import armor from '../src/items/armor/index.js';
import bionics from '../src/items/bionics/index.js';
import weapons from '../src/items/weapons/index.js';
import {
  WEAPON_CHASSIS_DEFINITIONS,
  WEAPON_DAMAGE_CORE_DEFINITIONS,
  weaponChassisTemplates
} from '../src/items/weapons/chassisCatalog.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const DAMAGE_GROUP = {
  kinetic: 'physicalResistance',
  slashing: 'physicalResistance',
  pyro: 'elementalResistance',
  cryo: 'elementalResistance',
  electric: 'elementalResistance',
  corrosive: 'chemicalResistance',
  radiation: 'chemicalResistance'
};

function evaluateClassic(file, expression) {
  const sandbox = {
    window: {
      coreboundConfig: { developerMode: false },
      bionics,
      chips: [],
      weaponChassisDefinitions: WEAPON_CHASSIS_DEFINITIONS,
      weaponDamageCoreDefinitions: WEAPON_DAMAGE_CORE_DEFINITIONS,
      weaponChassisTemplates
    },
    console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${fs.readFileSync(path.join(root, file), 'utf8')}\n;globalThis.result=(${expression});`, sandbox);
  return sandbox.result;
}

const locations = evaluateClassic('locations.js', 'locations');
const recipes = evaluateClassic('recipes.js', 'window.recipes');
const craftable = new Set(recipes.map(recipe => recipe.name));
const progressionEnemies = new Map(enemies.map(enemy => [enemy.name, enemy]));
// Use the canonical kinetic chassis preview for the progression curve. The
// resolver's all-core and mixed-handling behavior is covered separately; letting
// this audit counter-pick every area's weakest resistance would model seven
// optimized loadouts rather than one representative character.
const simulatedWeapons = weapons;

function valueAt(value, quality = 0.5, fallback = 0) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (!value || typeof value !== 'object') return fallback;
  const min = Number(value.min);
  const max = Number(value.max);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    return low + (high - low) * Math.max(0, Math.min(1, quality));
  }
  if (Number.isFinite(min)) return min;
  if (Number.isFinite(max)) return max;
  return fallback;
}

function midpoint(value, fallback = 0) {
  return valueAt(value, 0.5, fallback);
}

function levelOf(item) {
  return Math.max(1, Math.round(midpoint(item.levelRequirement ?? item.level, 1)));
}

function itemValue(item, direct, range, quality = 0.5, fallback = 0) {
  if (item[direct] !== undefined) return valueAt(item[direct], quality, fallback);
  return valueAt(item[range], quality, fallback);
}

function itemDefense(item, key, quality = 0.5) {
  return valueAt(item.defenseTypes?.[key], quality, 0);
}

function weaponDamage(item, quality = 0.5) {
  const source = item.weaponBaseDamage || item.baseDamageTypes || item.damageTypes || {};
  return Object.fromEntries(Object.entries(source).map(([type, value]) => [type, valueAt(value, quality, 0)]));
}

function weaponSpeed(item, quality = 0.5) {
  const base = valueAt(item.bAttackSpeed, quality, 1);
  const local = 1 + valueAt(item.weaponLocalAttackSpeedPercent, quality, 0) / 100;
  return Math.max(0.1, base * local);
}

function expectedWeaponDps(item, areaEnemies, quality = 0.5) {
  const damage = weaponDamage(item, quality);
  const speed = weaponSpeed(item, quality);
  const avgHit = areaEnemies.reduce((enemySum, enemy) => {
    const hit = Object.entries(damage).reduce((sum, [type, amount]) => {
      const defense = enemy.defenseTypes?.[DAMAGE_GROUP[type]] || 0;
      return sum + amount * (1 - Math.min(80, defense) / 100);
    }, 0);
    return enemySum + hit;
  }, 0) / areaEnemies.length;
  return avgHit * 0.55 * speed;
}

function defenseScore(item, damageWeights, quality = 0.5) {
  const flatHealth = itemValue(item, 'healthBonus', 'healthBonusRange', quality);
  const healthPercent = itemValue(item, 'healthBonusPercent', 'healthBonusPercentRange', quality);
  const flatShield = itemValue(item, 'energyShieldBonus', 'energyShieldBonusRange', quality);
  const shieldPercent = itemValue(item, 'energyShieldBonusPercent', 'energyShieldBonusPercentRange', quality);
  const deflection = itemValue(item, 'deflection', 'deflectionRange', quality);
  const healthRegen = itemValue(item, 'healthRegen', 'healthRegenRange', quality);
  const weightedResistance = Object.entries(damageWeights).reduce(
    (sum, [key, weight]) => sum + itemDefense(item, key, quality) * weight,
    0
  );
  // Regeneration matters more in a delve than a single duel because current
  // health carries through every encounter in the area.
  return flatHealth + healthPercent * 2 + flatShield + shieldPercent + deflection * 2 + healthRegen * 8 + weightedResistance * 4;
}

function eligible(items, gearLevel) {
  return items.filter(item =>
    !item.developerOnly &&
    levelOf(item) <= gearLevel &&
    (craftable.has(item.name) || craftable.has(item.chassisTemplateName) || item.name === 'Broken Phase Sword')
  );
}

function buildProfile(location, gearLevel, quality = 0.5) {
  const areaEnemies = location.enemies.map(entry => progressionEnemies.get(entry.name)).filter(Boolean);
  const damageCounts = { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 };
  for (const enemy of areaEnemies) {
    const type = Object.keys(enemy.damageTypes || {})[0];
    damageCounts[DAMAGE_GROUP[type]]++;
  }
  const totalDamageTypes = Object.values(damageCounts).reduce((sum, count) => sum + count, 0) || 1;
  const damageWeights = Object.fromEntries(
    Object.entries(damageCounts).map(([key, count]) => [key, count / totalDamageTypes])
  );

  const weapon = eligible(simulatedWeapons, gearLevel)
    .sort((a, b) => expectedWeaponDps(b, areaEnemies, quality) - expectedWeaponDps(a, areaEnemies, quality))[0];
  const equipped = [];
  for (const slot of ['offHand', 'head', 'chest', 'legs', 'feet', 'gloves']) {
    const best = eligible(armor, gearLevel)
      .filter(item => item.slot === slot)
      .sort((a, b) => defenseScore(b, damageWeights, quality) - defenseScore(a, damageWeights, quality))[0];
    if (best) equipped.push(best);
  }
  const selectedBionics = eligible(bionics, gearLevel)
    .sort((a, b) => defenseScore(b, damageWeights, quality) - defenseScore(a, damageWeights, quality))
    .slice(0, 4);
  equipped.push(...selectedBionics);

  let flatHealth = 0;
  let healthPercent = 0;
  let flatShield = 0;
  let shieldPercent = 0;
  let healthRegen = 0;
  let attackSpeedPercent = 0;
  let criticalChance = 0;
  let criticalMultiplier = 1;
  let precision = 0;
  let deflection = 0;
  const defense = { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 };
  const damageModifiers = {};

  for (const item of [weapon, ...equipped].filter(Boolean)) {
    flatHealth += itemValue(item, 'healthBonus', 'healthBonusRange', quality);
    healthPercent += itemValue(item, 'healthBonusPercent', 'healthBonusPercentRange', quality);
    flatShield += itemValue(item, 'energyShieldBonus', 'energyShieldBonusRange', quality);
    shieldPercent += itemValue(item, 'energyShieldBonusPercent', 'energyShieldBonusPercentRange', quality);
    healthRegen += itemValue(item, 'healthRegen', 'healthRegenRange', quality);
    attackSpeedPercent += itemValue(item, 'attackSpeedModifier', 'attackSpeedModifierRange', quality);
    criticalChance += itemValue(item, 'criticalChanceModifier', 'criticalChanceModifierRange', quality);
    criticalMultiplier += itemValue(item, 'criticalMultiplierModifier', 'criticalMultiplierModifierRange', quality);
    precision += itemValue(item, 'precision', 'precisionRange', quality);
    deflection += itemValue(item, 'deflection', 'deflectionRange', quality);
    for (const key of Object.keys(defense)) defense[key] += itemDefense(item, key, quality);
    for (const [type, value] of Object.entries(item.statModifiers?.damageTypes || {})) {
      damageModifiers[type] = (damageModifiers[type] || 0) + valueAt(value, quality, 0);
    }
  }

  const damage = weaponDamage(weapon, quality);
  for (const type of Object.keys(damage)) damage[type] *= 1 + (damageModifiers[type] || 0) / 100;
  return {
    level: gearLevel,
    rollQuality: quality,
    weapon: weapon?.name || 'Unarmed',
    gear: equipped.map(item => item.name),
    health: Math.max(1, Math.round((100 + flatHealth) * (1 + healthPercent / 100))),
    shield: Math.max(0, Math.round(flatShield * (1 + shieldPercent / 100))),
    healthRegen: Math.max(0, healthRegen),
    attackSpeed: Math.max(0.1, Math.min(10, weaponSpeed(weapon, quality) * (1 + attackSpeedPercent / 100))),
    criticalChance: Math.max(0, Math.min(1, criticalChance / 100)),
    criticalMultiplier: Math.max(1, criticalMultiplier),
    precision,
    deflection,
    defense,
    damage
  };
}

function buildStarterProfile() {
  const weapon = weapons.find(item => item.name === 'Broken Phase Sword');
  return {
    level: 1,
    rollQuality: 0.5,
    weapon: weapon.name,
    gear: [],
    health: 100,
    shield: 0,
    healthRegen: 0,
    attackSpeed: weaponSpeed(weapon),
    criticalChance: 0,
    criticalMultiplier: 1,
    precision: 0,
    deflection: 0,
    defense: { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 },
    damage: weaponDamage(weapon)
  };
}

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function weightedChoice(entries, random) {
  const total = entries.reduce((sum, entry) => sum + (entry.spawnRate || 1), 0);
  let roll = random() * total;
  for (const entry of entries) {
    roll -= entry.spawnRate || 1;
    if (roll <= 0) return entry;
  }
  return entries.at(-1);
}

function rolledHit(damage, attacker, defenderDefense, random, defenderDeflection = 0) {
  const rollFloor = Math.min(0.85, Math.max(0.1,
    0.35 + ((attacker.precision || 0) - (defenderDeflection || 0)) * 0.015
  ));
  const roll = rollFloor + random() * (1 - rollFloor);
  let total = Object.entries(damage).reduce((sum, [type, amount]) => {
    const resistance = Math.min(80, defenderDefense[DAMAGE_GROUP[type]] || 0);
    return sum + amount * roll * (1 - resistance / 100);
  }, 0);
  if (random() < attacker.criticalChance) total *= attacker.criticalMultiplier;
  return Math.max(0, total);
}

function runDelve(location, profile, random) {
  let hp = profile.health;
  let shield = profile.shield;
  let duration = 0;

  for (let fight = 0; fight < location.numFights; fight++) {
    const spawn = weightedChoice(location.enemies, random);
    const baseEnemy = progressionEnemies.get(spawn.name);
    const empowered = random() < (spawn.empoweredChance || 0);
    let enemyHp = (baseEnemy.health + (baseEnemy.energyShield || 0)) * (empowered ? 1.5 : 1);
    const enemyDamage = Object.fromEntries(Object.entries(baseEnemy.damageTypes).map(
      ([type, amount]) => [type, amount * (empowered ? 1.5 : 1)]
    ));
    const enemyAttacker = {
      precision: 0,
      criticalChance: baseEnemy.criticalChance,
      criticalMultiplier: baseEnemy.criticalMultiplier
    };
    let playerClock = 1 / profile.attackSpeed;
    let enemyClock = 1 / baseEnemy.attackSpeed;

    while (hp > 0 && enemyHp > 0 && duration < 600) {
      if (playerClock <= enemyClock) {
        hp = Math.min(profile.health, hp + profile.healthRegen * playerClock);
        duration += playerClock;
        enemyClock -= playerClock;
        playerClock = 1 / profile.attackSpeed;
        enemyHp -= rolledHit(profile.damage, profile, baseEnemy.defenseTypes, random, baseEnemy.deflection || 0);
      } else {
        hp = Math.min(profile.health, hp + profile.healthRegen * enemyClock);
        duration += enemyClock;
        playerClock -= enemyClock;
        enemyClock = 1 / baseEnemy.attackSpeed;
        let incoming = rolledHit(enemyDamage, enemyAttacker, profile.defense, random, profile.deflection || 0);
        const shieldDamage = Math.min(shield, incoming);
        shield -= shieldDamage;
        incoming -= shieldDamage;
        hp -= incoming;
      }
    }
    if (hp <= 0) return { won: false, hp: 0, duration };

    // The live delve waits three seconds before the next enemy. Normal health
    // regeneration continues during that pause, but health and shields are not
    // otherwise restored.
    if (fight < location.numFights - 1) {
      duration += 3;
      hp = Math.min(profile.health, hp + profile.healthRegen * 3);
    }
  }

  return { won: true, hp: Math.max(0, hp), duration };
}

function simulate(location, profile, iterations = 3000) {
  const random = mulberry32(0xC0BE0000 + profile.level * 101 + location.recommendedLevel);
  let wins = 0;
  let remainingHealth = 0;
  let duration = 0;
  for (let index = 0; index < iterations; index++) {
    const result = runDelve(location, profile, random);
    wins += Number(result.won);
    if (result.won) remainingHealth += result.hp;
    duration += result.duration;
  }
  return {
    winRate: wins / iterations,
    avgRemainingHealthOnWin: wins ? remainingHealth / wins : 0,
    avgDuration: duration / iterations
  };
}

const report = locations.map(location => {
  if (location.recommendedLevel >= 50) {
    const baseline = buildProfile(location, 50, 0.5);
    const fineTuned = buildProfile(location, 50, 0.9);
    return {
      area: location.name,
      contentBand: 'max-level',
      baseline: { profile: baseline, result: simulate(location, baseline) },
      fineTuned: { profile: fineTuned, result: simulate(location, fineTuned) }
    };
  }

  const entry = buildProfile(location, location.recommendedLevel, 0.5);
  const mastered = buildProfile(location, Math.min(50, location.recommendedLevel + 4), 0.5);
  const areaReport = {
    area: location.name,
    contentBand: 'leveling',
    entry: { profile: entry, result: simulate(location, entry) },
    mastered: { profile: mastered, result: simulate(location, mastered) }
  };
  if (location.recommendedLevel === 1) {
    const starter = buildStarterProfile();
    areaReport.starter = { profile: starter, result: simulate(location, starter) };
  }
  return areaReport;
});

console.log(JSON.stringify(report, null, 2));
