import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import enemies from '../src/enemies/index.js';
import armor from '../src/items/armor/index.js';
import bionics from '../src/items/bionics/index.js';
import weapons from '../src/items/weapons/index.js';

const root = path.resolve(import.meta.dirname, '..');
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
  const sandbox = { window: { coreboundConfig: { developerMode: false } }, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${fs.readFileSync(path.join(root, file), 'utf8')}\n;globalThis.result=(${expression});`, sandbox);
  return sandbox.result;
}

const locations = evaluateClassic('locations.js', 'locations');
const recipes = evaluateClassic('recipes.js', 'window.recipes');
const craftable = new Set(recipes.map(recipe => recipe.name));
const progressionEnemies = new Map(enemies.map(enemy => [enemy.name, enemy]));

function midpoint(value, fallback = 0) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (!value || typeof value !== 'object') return fallback;
  const min = Number(value.min);
  const max = Number(value.max);
  if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
  if (Number.isFinite(min)) return min;
  if (Number.isFinite(max)) return max;
  return fallback;
}

function levelOf(item) {
  return Math.max(1, Math.round(midpoint(item.levelRequirement ?? item.level, 1)));
}

function itemValue(item, direct, range, fallback = 0) {
  if (item[direct] !== undefined) return midpoint(item[direct], fallback);
  return midpoint(item[range], fallback);
}

function itemDefense(item, key) {
  return midpoint(item.defenseTypes?.[key], 0);
}

function weaponDamage(item) {
  const source = item.weaponBaseDamage || item.baseDamageTypes || item.damageTypes || {};
  return Object.fromEntries(Object.entries(source).map(([type, value]) => [type, midpoint(value, 0)]));
}

function weaponSpeed(item) {
  const base = midpoint(item.bAttackSpeed, 1);
  const local = 1 + midpoint(item.weaponLocalAttackSpeedPercent, 0) / 100;
  return Math.max(0.1, base * local);
}

function expectedWeaponDps(item, areaEnemies) {
  const damage = weaponDamage(item);
  const speed = weaponSpeed(item);
  const avgHit = areaEnemies.reduce((enemySum, enemy) => {
    const hit = Object.entries(damage).reduce((sum, [type, amount]) => {
      const defense = enemy.defenseTypes?.[DAMAGE_GROUP[type]] || 0;
      return sum + amount * (1 - Math.min(80, defense) / 100);
    }, 0);
    return enemySum + hit;
  }, 0) / areaEnemies.length;
  return avgHit * 0.55 * speed;
}

function defenseScore(item, damageWeights) {
  const flatHealth = itemValue(item, 'healthBonus', 'healthBonusRange');
  const healthPercent = itemValue(item, 'healthBonusPercent', 'healthBonusPercentRange');
  const flatShield = itemValue(item, 'energyShieldBonus', 'energyShieldBonusRange');
  const shieldPercent = itemValue(item, 'energyShieldBonusPercent', 'energyShieldBonusPercentRange');
  const deflection = itemValue(item, 'deflection', 'deflectionRange');
  const weightedResistance = Object.entries(damageWeights).reduce(
    (sum, [key, weight]) => sum + itemDefense(item, key) * weight,
    0
  );
  return flatHealth + healthPercent * 2 + flatShield + shieldPercent + deflection * 2 + weightedResistance * 4;
}

function eligible(items, gearLevel) {
  return items.filter(item =>
    !item.developerOnly &&
    levelOf(item) <= gearLevel &&
    (craftable.has(item.name) || item.name === 'Broken Phase Sword')
  );
}

function buildProfile(location, gearLevel) {
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

  const weapon = eligible(weapons, gearLevel)
    .sort((a, b) => expectedWeaponDps(b, areaEnemies) - expectedWeaponDps(a, areaEnemies))[0];
  const equipped = [];
  for (const slot of ['offHand', 'head', 'chest', 'legs', 'feet', 'gloves']) {
    const best = eligible(armor, gearLevel)
      .filter(item => item.slot === slot)
      .sort((a, b) => defenseScore(b, damageWeights) - defenseScore(a, damageWeights))[0];
    if (best) equipped.push(best);
  }
  const selectedBionics = eligible(bionics, gearLevel)
    .sort((a, b) => defenseScore(b, damageWeights) - defenseScore(a, damageWeights))
    .slice(0, 4);
  equipped.push(...selectedBionics);

  let flatHealth = 0;
  let healthPercent = 0;
  let flatShield = 0;
  let shieldPercent = 0;
  let attackSpeedPercent = 0;
  let criticalChance = 0;
  let criticalMultiplier = 1;
  let precision = 0;
  const defense = { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 };
  const damageModifiers = {};

  for (const item of [weapon, ...equipped].filter(Boolean)) {
    flatHealth += itemValue(item, 'healthBonus', 'healthBonusRange');
    healthPercent += itemValue(item, 'healthBonusPercent', 'healthBonusPercentRange');
    flatShield += itemValue(item, 'energyShieldBonus', 'energyShieldBonusRange');
    shieldPercent += itemValue(item, 'energyShieldBonusPercent', 'energyShieldBonusPercentRange');
    attackSpeedPercent += itemValue(item, 'attackSpeedModifier', 'attackSpeedModifierRange');
    criticalChance += itemValue(item, 'criticalChanceModifier', 'criticalChanceModifierRange');
    criticalMultiplier += itemValue(item, 'criticalMultiplierModifier', 'criticalMultiplierModifierRange');
    precision += itemValue(item, 'precision', 'precisionRange');
    for (const key of Object.keys(defense)) defense[key] += itemDefense(item, key);
    for (const [type, value] of Object.entries(item.statModifiers?.damageTypes || {})) {
      damageModifiers[type] = (damageModifiers[type] || 0) + midpoint(value, 0);
    }
  }

  const damage = weaponDamage(weapon);
  for (const type of Object.keys(damage)) damage[type] *= 1 + (damageModifiers[type] || 0) / 100;
  return {
    level: gearLevel,
    weapon: weapon?.name || 'Unarmed',
    gear: equipped.map(item => item.name),
    health: Math.max(1, Math.round((100 + flatHealth) * (1 + healthPercent / 100))),
    shield: Math.max(0, Math.round(flatShield * (1 + shieldPercent / 100))),
    attackSpeed: Math.max(0.1, Math.min(10, weaponSpeed(weapon) * (1 + attackSpeedPercent / 100))),
    criticalChance: Math.max(0, Math.min(1, criticalChance / 100)),
    criticalMultiplier: Math.max(1, criticalMultiplier),
    precision,
    defense,
    damage
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

function rolledHit(damage, attacker, defenderDefense, random) {
  const precisionSkew = Math.max(0.1, 1 - (attacker.precision || 0) * 0.05);
  const roll = 0.1 + 0.9 * Math.pow(random(), precisionSkew);
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
        duration += playerClock;
        enemyClock -= playerClock;
        playerClock = 1 / profile.attackSpeed;
        enemyHp -= rolledHit(profile.damage, profile, baseEnemy.defenseTypes, random);
      } else {
        duration += enemyClock;
        playerClock -= enemyClock;
        enemyClock = 1 / baseEnemy.attackSpeed;
        let incoming = rolledHit(enemyDamage, enemyAttacker, profile.defense, random);
        const shieldDamage = Math.min(shield, incoming);
        shield -= shieldDamage;
        incoming -= shieldDamage;
        hp -= incoming;
      }
    }
    if (hp <= 0) return { won: false, hp: 0, duration };
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
  const entry = buildProfile(location, location.recommendedLevel);
  const mastered = buildProfile(location, location.recommendedLevel + 4);
  return {
    area: location.name,
    entry: { profile: entry, result: simulate(location, entry) },
    mastered: { profile: mastered, result: simulate(location, mastered) }
  };
});

console.log(JSON.stringify(report, null, 2));
