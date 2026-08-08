// src/items/bionics/index.js
import healthModule from './healthModule.js';
import reactiveBarbs from './reactiveBarbs.js';
import reactionEnhancer from './reactionEnhancer.js';
import healthExchanger from './healthExchanger.js';
import kineticBooster from './kineticBooster.js';
import CritTestBionic from './CritTestBionic.js';
import pyroBooster from './pyroBooster.js';
import cryoBooster from './cryoBooster.js';
import electricBooster from './electricBooster.js';
import slashingBooster from './slashingBooster.js';
import radiationBooster from './radiationBooster.js';
import chemicalBooster from './chemicalBooster.js';

// Add all bionics to this array
const bionics = [
    healthModule,
    reactiveBarbs,
    reactionEnhancer,
    healthExchanger,
    kineticBooster,
    CritTestBionic,
    pyroBooster,
    cryoBooster,
    electricBooster,
    slashingBooster,
    radiationBooster,
    chemicalBooster
];

export default bionics;
