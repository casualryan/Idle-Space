// src/items/weapons/index.js
import brokenPhaseSword from './brokenPhaseSword.js';
import elementalStaff from './elementalStaff.js';
import toxicBlade from './toxicBlade.js';
import scorpionSword from './scorpionSword.js';
import laserSword from './laserSword.js';
import fireSpewerMk1 from './fireSpewerMk1.js';
import oHaresDementia from './oHaresDementia.js';
import brokenPoisonPistol from './brokenPoisonPistol.js';
import phaseReaver from './phaseReaver.js';
import frostCannon from './frostCannon.js';
import neurotoxinNeedler from './neurotoxinNeedler.js';
import pyroBlaster from './pyroBlaster.js';
import acidicRipper from './acidicRipper.js';
import orrDevastatingCarbine from './orrDevastatingCarbine.js';
import comboTestSword from './comboTestSword.js';
import nanonicPhaseSword from './nanonicPhaseSword.js';
import modPoolTestBlade from './modPoolTestBlade.js';
import dualPoolTestStaff from './dualPoolTestStaff.js';
import wiredTestDagger from './wiredTestDagger.js';
import bigBruteBasher from './bigBruteBasher.js';
import ionizingWhip from './ionizingWhip.js';
// Corebound baseline main-hand weapons (Synthetic Dominion)
import bentImpactRod from './bentImpactRod.js';
import scrapMaul from './scrapMaul.js';
import pneumaticHammer from './pneumaticHammer.js';
import railSpikeLauncher from './railSpikeLauncher.js';
import hydraulicCrusher from './hydraulicCrusher.js';
import massDriverClub from './massDriverClub.js';
import gravityPistonMaul from './gravityPistonMaul.js';
import jaggedScrapBlade from './jaggedScrapBlade.js';
import utilityCutter from './utilityCutter.js';
import serratedCombatKnife from './serratedCombatKnife.js';
import phaseEdgeSword from './phaseEdgeSword.js';
import monowireSaber from './monowireSaber.js';
import vibrocleaver from './vibrocleaver.js';
import nanofiberExecutionBlade from './nanofiberExecutionBlade.js';
import crackedHeatPistol from './crackedHeatPistol.js';
import sparkSpitter from './sparkSpitter.js';
import thermalCarbine from './thermalCarbine.js';
import flameProjectorMk1 from './flameProjectorMk1.js';
import combustionRifle from './combustionRifle.js';
import furnaceLance from './furnaceLance.js';
import starfireIncinerator from './starfireIncinerator.js';
import leakingCoolantSprayer from './leakingCoolantSprayer.js';
import frostbiteWand from './frostbiteWand.js';
import cryoPistol from './cryoPistol.js';
import refrigerantCannon from './refrigerantCannon.js';
import glacierBeamRifle from './glacierBeamRifle.js';
import absoluteZeroProjector from './absoluteZeroProjector.js';
import entropyFreezeCannon from './entropyFreezeCannon.js';
import faultyShockBaton from './faultyShockBaton.js';
import arcPistol from './arcPistol.js';
import staticCoilRod from './staticCoilRod.js';
import ionRepeater from './ionRepeater.js';
import lightningCarbine from './lightningCarbine.js';
import stormCapacitorRifle from './stormCapacitorRifle.js';
import arcstormConductor from './arcstormConductor.js';
import rustedAcidShiv from './rustedAcidShiv.js';
import leakingChemPistol from './leakingChemPistol.js';
import toxinInjectorBlade from './toxinInjectorBlade.js';
import acidSprayer from './acidSprayer.js';
import dissolverCarbine from './dissolverCarbine.js';
import causticLance from './causticLance.js';
import molecularDissolutionRifle from './molecularDissolutionRifle.js';
import crackedIsotopeRod from './crackedIsotopeRod.js';
import irradiatedNeedlePistol from './irradiatedNeedlePistol.js';
import gammaEmitter from './gammaEmitter.js';
import radiumCarbine from './radiumCarbine.js';
import isotopeBeamStaff from './isotopeBeamStaff.js';
import reactorLeakCannon from './reactorLeakCannon.js';
import singularityIrradiator from './singularityIrradiator.js';
import {
  normalizeWeaponTaxonomy,
  validateWeaponTaxonomy
} from './taxonomy.js';

// Add all weapons to this array
const rawWeapons = [
  brokenPhaseSword,
  elementalStaff,
  toxicBlade,
  scorpionSword,
  laserSword,
  fireSpewerMk1,
  oHaresDementia,
  brokenPoisonPistol,
  phaseReaver,
  frostCannon,
  neurotoxinNeedler,
  pyroBlaster,
  acidicRipper,
  orrDevastatingCarbine,
  comboTestSword,
  nanonicPhaseSword,
  modPoolTestBlade,
  dualPoolTestStaff,
  wiredTestDagger,
  bigBruteBasher,
  ionizingWhip,
  bentImpactRod,
  scrapMaul,
  pneumaticHammer,
  railSpikeLauncher,
  hydraulicCrusher,
  massDriverClub,
  gravityPistonMaul,
  jaggedScrapBlade,
  utilityCutter,
  serratedCombatKnife,
  phaseEdgeSword,
  monowireSaber,
  vibrocleaver,
  nanofiberExecutionBlade,
  crackedHeatPistol,
  sparkSpitter,
  thermalCarbine,
  flameProjectorMk1,
  combustionRifle,
  furnaceLance,
  starfireIncinerator,
  leakingCoolantSprayer,
  frostbiteWand,
  cryoPistol,
  refrigerantCannon,
  glacierBeamRifle,
  absoluteZeroProjector,
  entropyFreezeCannon,
  faultyShockBaton,
  arcPistol,
  staticCoilRod,
  ionRepeater,
  lightningCarbine,
  stormCapacitorRifle,
  arcstormConductor,
  rustedAcidShiv,
  leakingChemPistol,
  toxinInjectorBlade,
  acidSprayer,
  dissolverCarbine,
  causticLance,
  molecularDissolutionRifle,
  crackedIsotopeRod,
  irradiatedNeedlePistol,
  gammaEmitter,
  radiumCarbine,
  isotopeBeamStaff,
  reactorLeakCannon,
  singularityIrradiator
];

const LEGACY_WEAPON_DAMAGE_KEY_MAP = {
  mental: 'slashing',
  magnetic: 'electric',
  chemical: 'corrosive'
};

function normalizeWeaponDamageTypes(source) {
  const normalized = {};
  if (!source || typeof source !== 'object') return normalized;
  Object.keys(source).forEach((rawType) => {
    const type = LEGACY_WEAPON_DAMAGE_KEY_MAP[rawType] || rawType;
    normalized[type] = source[rawType];
  });
  return normalized;
}

const weapons = rawWeapons.map((weapon) => {
  if (!weapon || typeof weapon !== 'object') return weapon;
  const migrated = { ...weapon };
  if (migrated.levelRequirement == null) {
    migrated.levelRequirement = Number(migrated.level || 1);
  }
  delete migrated.level;
  if (!migrated.weaponBaseDamage && migrated.damageTypes) {
    migrated.weaponBaseDamage = normalizeWeaponDamageTypes(migrated.damageTypes);
    delete migrated.damageTypes;
  } else if (migrated.weaponBaseDamage && migrated.damageTypes) {
    // Keep canonical local base and discard legacy duplicate field.
    delete migrated.damageTypes;
  }
  return normalizeWeaponTaxonomy(migrated, { strict: true });
});

const taxonomyValidation = validateWeaponTaxonomy(weapons);
if (!taxonomyValidation.valid) {
  throw new TypeError(`Invalid weapon taxonomy: ${taxonomyValidation.errors.join('; ')}`);
}

export default weapons;
