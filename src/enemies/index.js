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

const enemies = [
    bigBertha,
    scorpionbot,
    cactibot,
    steelGolem,
    awakenedSteelGolem,
    pyroBeetle,
    knightOHare,
    screechingDrone,
    superScreechingDrone,
    combatRobot,
    pyroBot,
    acidSpitter,
    iceElemental,
    ...coreboundProgressionEnemies
];

export default enemies;


