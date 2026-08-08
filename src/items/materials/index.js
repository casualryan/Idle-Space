// Import all material files
import scrapMetal from './scrapMetal.js';
import titanium from './titanium.js';
import minorElectronicCircuit from './minorElectronicCircuit.js';
import unstablePhoton from './unstablePhoton.js';
import syntheticPoisonGland from './syntheticPoisonGland.js';
import crystalizedLight from './crystalizedLight.js';
import particalFuser from './particalFuser.js';
import titaniumThorn from './titaniumThorn.js';
import metalScorpionFang from './metalScorpionFang.js';
import flameShell from './flameShell.js';
import pyroCore from './pyroCore.js';
import wireBundle from './wireBundle.js';
import spiderLegSegment from './spiderLegSegment.js';
import opticSensor from './opticSensor.js';
import metalFasteners from './metalFasteners.js';
import basicServo from './basicServo.js';
import smallPowerCell from './smallPowerCell.js';
import copperCoil from './copperCoil.js';
import memoryChip from './memoryChip.js';
import stabilizer from './stabilizer.js';
import basicSensorArray from './basicSensorArray.js';
import advancedServo from './advancedServo.js';
import targetingModule from './targetingModule.js';
import powerConverter from './powerConverter.js';
import titaniumPlating from './titaniumPlating.js';
import neuralProcessor from './neuralProcessor.js';
import quantumCapacitor from './quantumCapacitor.js';
import highDensityPowerCell from './highDensityPowerCell.js';
import neuralNetworkModule from './neuralNetworkModule.js';
import phaseConverter from './phaseConverter.js';
import aiCoreFragment from './aiCoreFragment.js';
import syntheticBiofluid from './syntheticBiofluid.js';
import quantumCore from './quantumCore.js';
import temporalStabilizer from './temporalStabilizer.js';
import naniteCluster from './naniteCluster.js';
import fluxCrystal from './fluxCrystal.js';
import ironOre from './ironOre.js';
import copperOre from './copperOre.js';
import pristineMetalPlate from './pristineMetalPlate.js';
import pureIronNugget from './pureIronNugget.js';
import copperVeinSample from './copperVeinSample.js';
import titaniumAlloyFragment from './titaniumAlloyFragment.js';
import toxicResidue from './toxicResidue.js';
import unstablePhaseCore from './unstablePhaseCore.js';
import advancedAlloy from './advancedAlloy.js';
import cryoCell from './cryoCell.js';
import advancedBarrel from './advancedBarrel.js';
import precisionMechanism from './precisionMechanism.js';
import corrosiveFluid from './corrosiveFluid.js';
import enhancedCuttingEdge from './enhancedCuttingEdge.js';
import advancedElectronicCircuit from './advancedElectronicCircuit.js';

// Export all materials as an array
const materials = [
    // Gathering Items
    scrapMetal,
    titanium,
    ironOre,
    copperOre,

    // Crafting items
    minorElectronicCircuit,
    unstablePhoton,
    syntheticPoisonGland,
    crystalizedLight,
    particalFuser,
    titaniumThorn,
    metalScorpionFang,
    flameShell,
    pyroCore,

    // Common Items (Tier 1)
    wireBundle,
    spiderLegSegment,
    opticSensor,
    metalFasteners,
    basicServo,

    // Uncommon Items (Tier 2)
    smallPowerCell,
    copperCoil,
    memoryChip,
    stabilizer,
    basicSensorArray,

    // Rare Items (Tier 3)
    advancedServo,
    targetingModule,
    powerConverter,
    titaniumPlating,
    neuralProcessor,

    // Very Rare Items (Tier 4)
    quantumCapacitor,
    highDensityPowerCell,
    neuralNetworkModule,

    // Epic Items (Tier 5)
    phaseConverter,
    aiCoreFragment,
    syntheticBiofluid,

    // Legendary Items (Tier 6)
    quantumCore,
    temporalStabilizer,
    naniteCluster,
    fluxCrystal,

    // Rare Finds
    pristineMetalPlate,
    pureIronNugget,
    copperVeinSample,
    titaniumAlloyFragment,

    // Specialized disassembly materials
    toxicResidue,
    unstablePhaseCore,
    advancedAlloy,
    cryoCell,
    advancedBarrel,
    precisionMechanism,
    corrosiveFluid,
    enhancedCuttingEdge,
    advancedElectronicCircuit
];

// Make materials available globally (only in browser environment)
if (typeof window !== 'undefined') {
    window.materials = materials;
}

export default materials;
