// src/enemies/index.js - Aggregates individual enemy files

import bigBertha from './bigBertha.js';
import scorpionbot from './scorpionbot.js';
import cactibot from './cactibot.js';
import steelGolem from './steelGolem.js';
import awakenedSteelGolem from './awakenedSteelGolem.js';
import pyroBeetle from './pyroBeetle.js';
import knightOHare from './knightOHare.js';
import screechingDrone from './screechingDrone.js';
import superScreechingDrone from './superScreechingDrone.js';
import combatRobot from './combatRobot.js';
import pyroBot from './pyroBot.js';
import acidSpitter from './acidSpitter.js';
import iceElemental from './iceElemental.js';
import coreboundProgressionEnemies from './coreboundProgressionEnemies.js';

const quarantinedLegacyEnemies = [
    bigBertha,
    scorpionbot,
    cactibot,
    steelGolem,
    awakenedSteelGolem,
    pyroBeetle,
    screechingDrone,
    superScreechingDrone,
    combatRobot,
    pyroBot,
    acidSpitter,
    iceElemental
];

function normalizeLegacyDefenses(defenseTypes = {}) {
    if (
        defenseTypes.physicalResistance !== undefined ||
        defenseTypes.elementalResistance !== undefined ||
        defenseTypes.chemicalResistance !== undefined
    ) return { ...defenseTypes };

    return {
        physicalResistance: Number(defenseTypes.toughness || 0) + Number(defenseTypes.fortitude || 0) / 2,
        elementalResistance: Number(defenseTypes.heatResistance || 0) + Number(defenseTypes.antimagnet || 0),
        chemicalResistance: Number(defenseTypes.immunity || 0)
    };
}

function getEnemyPortraitPath(template) {
    const slug = String(template.id || template.name || 'enemy')
        .replace(/^cb_/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `images/enemies/${slug}.png`;
}

function normalizeEnemy(template, options = {}) {
    const enemy = {
        ...template,
        isEnemy: true,
        level: Number(template.level || 1),
        portrait: template.portrait || getEnemyPortraitPath(template),
        defenseTypes: normalizeLegacyDefenses(template.defenseTypes)
    };
    // The weighted-pool system is authoritative; legacy direct drops are inert.
    delete enemy.lootTable;
    delete enemy.statusEffects;
    if (options.developerOnly) enemy.developerOnly = true;
    if (!enemy.lootConfig) {
        enemy.lootConfig = {
            baseDropChance: enemy.isTrainingDummy ? 0 : 0.5,
            minItems: enemy.isTrainingDummy ? 0 : 1,
            maxItems: enemy.isTrainingDummy ? 0 : 1,
            poolsByTier: {
                1: enemy.isTrainingDummy ? [] : ['genericCommon'],
                2: ['genericUncommon'],
                3: ['genericRare'],
                4: ['advancedComponents'],
                5: ['epicTech'],
                6: ['legendaryComponents']
            }
        };
    }
    return enemy;
}

const enemies = [
    normalizeEnemy(knightOHare),
    ...quarantinedLegacyEnemies.map(enemy => normalizeEnemy(enemy, { developerOnly: true })),
    ...coreboundProgressionEnemies.map(enemy => normalizeEnemy(enemy))
];

export default enemies;
