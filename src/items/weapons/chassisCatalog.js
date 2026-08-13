import {
  WEAPON_FAMILY_DEFINITIONS,
  normalizeWeaponTaxonomy
} from './taxonomy.js';

export const WEAPON_CHASSIS_GRADES = Object.freeze([
  Object.freeze({ id: 'improvised', label: 'Improvised', level: 1, dps: Object.freeze({ min: 7, max: 11 }) }),
  Object.freeze({ id: 'field', label: 'Field', level: 10, dps: Object.freeze({ min: 140, max: 210 }) }),
  Object.freeze({ id: 'industrial', label: 'Industrial', level: 20, dps: Object.freeze({ min: 300, max: 450 }) }),
  Object.freeze({ id: 'advanced', label: 'Advanced', level: 30, dps: Object.freeze({ min: 380, max: 520 }) }),
  Object.freeze({ id: 'dominion', label: 'Dominion', level: 40, dps: Object.freeze({ min: 520, max: 700 }) }),
  Object.freeze({ id: 'apex', label: 'Apex', level: 50, dps: Object.freeze({ min: 790, max: 950 }) })
]);

export const WEAPON_DAMAGE_CORE_DEFINITIONS = Object.freeze({
  kinetic: Object.freeze({ label: 'Kinetic', coreLabel: 'Kinetic Assembly', materialFamily: 'kinetic' }),
  slashing: Object.freeze({ label: 'Slashing', coreLabel: 'Edge Matrix', materialFamily: 'slashing' }),
  pyro: Object.freeze({ label: 'Pyro', coreLabel: 'Pyro Core', materialFamily: 'pyro' }),
  cryo: Object.freeze({ label: 'Cryogenic', coreLabel: 'Cryo Cell', materialFamily: 'cryo' }),
  electric: Object.freeze({ label: 'Electric', coreLabel: 'Arc Coil', materialFamily: 'electric' }),
  corrosive: Object.freeze({ label: 'Corrosive', coreLabel: 'Corrosive Chamber', materialFamily: 'chemical' }),
  radiation: Object.freeze({ label: 'Radiation', coreLabel: 'Isotope Cell', materialFamily: 'radiation' })
});

const WEAPON_CHASSIS_FAMILY_PROFILES = Object.freeze({
  blades: Object.freeze({
    variants: Object.freeze([
      Object.freeze({ id: 'light', noun: 'Blade', weaponType: 'Blade', speed: Object.freeze({ min: 1.35, max: 1.55 }), tags: Object.freeze(['melee', 'oneHanded', 'contact']) }),
      Object.freeze({ id: 'heavy', noun: 'Cleaver', weaponType: 'Cleaver', speed: Object.freeze({ min: 0.82, max: 0.98 }), tags: Object.freeze(['melee', 'twoHanded', 'contact']) })
    ])
  }),
  impact: Object.freeze({
    variants: Object.freeze([
      Object.freeze({ id: 'light', noun: 'Baton', weaponType: 'Baton', speed: Object.freeze({ min: 1.05, max: 1.25 }), tags: Object.freeze(['melee', 'oneHanded', 'contact']) }),
      Object.freeze({ id: 'heavy', noun: 'Maul', weaponType: 'Maul', speed: Object.freeze({ min: 0.62, max: 0.78 }), tags: Object.freeze(['melee', 'twoHanded', 'contact']) })
    ])
  }),
  sidearms: Object.freeze({
    variants: Object.freeze([
      Object.freeze({ id: 'standard', noun: 'Sidearm', weaponType: 'Pistol', speed: Object.freeze({ min: 1.3, max: 1.5 }), tags: Object.freeze(['ranged', 'oneHanded', 'projectile']) })
    ])
  }),
  rifles: Object.freeze({
    variants: Object.freeze([
      Object.freeze({ id: 'standard', noun: 'Rifle', weaponType: 'Rifle', speed: Object.freeze({ min: 0.9, max: 1.1 }), tags: Object.freeze(['ranged', 'twoHanded', 'projectile']) })
    ])
  }),
  projectors: Object.freeze({
    variants: Object.freeze([
      Object.freeze({ id: 'standard', noun: 'Projector', weaponType: 'Projector', speed: Object.freeze({ min: 0.82, max: 0.98 }), tags: Object.freeze(['ranged', 'twoHanded', 'beam']) })
    ])
  }),
  ordnance: Object.freeze({
    variants: Object.freeze([
      Object.freeze({ id: 'standard', noun: 'Cannon', weaponType: 'Cannon', speed: Object.freeze({ min: 0.62, max: 0.78 }), tags: Object.freeze(['ranged', 'twoHanded', 'projectile', 'area']) })
    ])
  }),
  conduits: Object.freeze({
    variants: Object.freeze([
      Object.freeze({ id: 'light', noun: 'Rod', weaponType: 'Rod', speed: Object.freeze({ min: 1.1, max: 1.3 }), tags: Object.freeze(['ranged', 'oneHanded', 'beam']) }),
      Object.freeze({ id: 'heavy', noun: 'Staff', weaponType: 'Staff', speed: Object.freeze({ min: 0.85, max: 1.0 }), tags: Object.freeze(['ranged', 'twoHanded', 'beam']) })
    ])
  })
});

function averageRange(range) {
  return (Number(range.min) + Number(range.max)) / 2;
}

function getDisassemblyResults(level) {
  if (level >= 50) return [{ name: 'Advanced Alloy', quantity: 3 }, { name: 'Neural Network Module', quantity: 1 }];
  if (level >= 40) return [{ name: 'Advanced Alloy', quantity: 2 }, { name: 'Advanced Electronic Circuit', quantity: 1 }];
  if (level >= 30) return [{ name: 'Titanium Plating', quantity: 2 }, { name: 'Advanced Electronic Circuit', quantity: 1 }];
  if (level >= 20) return [{ name: 'Titanium', quantity: 2 }, { name: 'Wire Bundle', quantity: 2 }];
  if (level >= 10) return [{ name: 'Iron Ore', quantity: 2 }, { name: 'Wire Bundle', quantity: 2 }];
  return [{ name: 'Scrap Metal', quantity: 2 }, { name: 'Wire Bundle', quantity: 1 }];
}

function getTemplateDamage(grade, variant) {
  const cadence = averageRange(variant.speed);
  return {
    min: Math.max(1, Math.round(grade.dps.min / cadence)),
    max: Math.max(1, Math.round(grade.dps.max / cadence))
  };
}

function createChassisTemplate(grade, family, profile) {
  const previewVariant = profile.variants[0];
  const familyLabel = WEAPON_FAMILY_DEFINITIONS[family].label;
  const randomizedHandling = profile.variants.length > 1;
  return {
    name: `${grade.label} ${familyLabel} Chassis`,
    type: 'Weapon',
    weaponType: previewVariant.weaponType,
    weaponFamily: family,
    weaponFamilyLabel: familyLabel,
    weaponTags: [...previewVariant.tags],
    icon: 'icons/default-icon.png',
    slot: 'mainHand',
    levelRequirement: grade.level,
    bAttackSpeed: { ...previewVariant.speed },
    weaponBaseDamage: { kinetic: getTemplateDamage(grade, previewVariant) },
    isDisassembleable: true,
    disassembleResults: getDisassemblyResults(grade.level),
    description: randomizedHandling
      ? `A ${grade.label.toLowerCase()} ${familyLabel.toLowerCase()} frame. Select a damage core; handling is randomized between one- and two-handed when fabrication completes.`
      : `A ${grade.label.toLowerCase()} ${familyLabel.toLowerCase()} frame. Select a damage core before fabrication.`
  };
}

export const WEAPON_CHASSIS_DEFINITIONS = Object.freeze(Object.fromEntries(
  WEAPON_CHASSIS_GRADES.flatMap(grade => Object.entries(WEAPON_CHASSIS_FAMILY_PROFILES).map(([family, profile]) => {
    const name = `${grade.label} ${WEAPON_FAMILY_DEFINITIONS[family].label} Chassis`;
    return [name, Object.freeze({
      name,
      grade,
      family,
      familyLabel: WEAPON_FAMILY_DEFINITIONS[family].label,
      variants: profile.variants
    })];
  }))
));

export const weaponChassisTemplates = Object.freeze(
  Object.values(WEAPON_CHASSIS_DEFINITIONS).map(definition =>
    createChassisTemplate(definition.grade, definition.family, definition)
  )
);

export function resolveWeaponChassisTemplate(template, damageType = 'kinetic', random = Math.random) {
  const definition = WEAPON_CHASSIS_DEFINITIONS[template?.name];
  if (!definition) throw new TypeError(`Unknown weapon chassis: ${template?.name || '(missing)'}`);
  const damageCore = WEAPON_DAMAGE_CORE_DEFINITIONS[damageType];
  if (!damageCore) throw new TypeError(`Unknown weapon damage core: ${damageType}`);

  const rawRoll = Number(typeof random === 'function' ? random() : random);
  const normalizedRoll = Number.isFinite(rawRoll) ? Math.min(0.999999, Math.max(0, rawRoll)) : 0;
  const variantIndex = Math.floor(normalizedRoll * definition.variants.length);
  const variant = definition.variants[variantIndex];
  const damage = getTemplateDamage(definition.grade, variant);

  return normalizeWeaponTaxonomy({
    ...template,
    name: `${definition.grade.label} ${damageCore.label} ${variant.noun}`,
    chassisTemplateName: template.name,
    weaponType: variant.weaponType,
    weaponFamily: definition.family,
    weaponFamilyLabel: definition.familyLabel,
    weaponTags: [...variant.tags],
    bAttackSpeed: { ...variant.speed },
    weaponBaseDamage: { [damageType]: damage },
    description: `${definition.grade.label} ${definition.familyLabel.toLowerCase()} chassis fitted with a ${damageCore.coreLabel}.`
  }, { strict: true });
}
