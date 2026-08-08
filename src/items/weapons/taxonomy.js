// Canonical weapon taxonomy. `weaponType` remains the flavorful display noun;
// family and tags are the stable mechanical vocabulary used by passives.

export const WEAPON_FAMILY_DEFINITIONS = Object.freeze({
  blades: Object.freeze({ label: 'Blades', description: 'Edged and flexible contact weapons.' }),
  impact: Object.freeze({ label: 'Impact', description: 'Blunt weapons that deliver concentrated force.' }),
  sidearms: Object.freeze({ label: 'Sidearms', description: 'Compact ranged weapons built for speed and precision.' }),
  rifles: Object.freeze({ label: 'Rifles', description: 'Shouldered ranged weapons built for deliberate fire.' }),
  projectors: Object.freeze({ label: 'Projectors', description: 'Weapons that emit beams, streams, and persistent energy.' }),
  ordnance: Object.freeze({ label: 'Ordnance', description: 'Launchers and cannons built around oversized payloads.' }),
  conduits: Object.freeze({ label: 'Conduits', description: 'Rods, wands, and staves that channel synthetic forces.' })
});

export const WEAPON_TAG_DEFINITIONS = Object.freeze({
  melee: Object.freeze({ label: 'Melee' }),
  ranged: Object.freeze({ label: 'Ranged' }),
  oneHanded: Object.freeze({ label: 'One-Handed' }),
  twoHanded: Object.freeze({ label: 'Two-Handed' }),
  contact: Object.freeze({ label: 'Contact' }),
  projectile: Object.freeze({ label: 'Projectile' }),
  beam: Object.freeze({ label: 'Beam' }),
  stream: Object.freeze({ label: 'Stream' }),
  area: Object.freeze({ label: 'Area' }),
  rapid: Object.freeze({ label: 'Rapid' }),
  deliberate: Object.freeze({ label: 'Deliberate' })
});

const TYPE_TO_ARCHETYPE = Object.freeze({
  Sword: ['blades', 'melee', 'oneHanded', 'contact'],
  Dagger: ['blades', 'melee', 'oneHanded', 'contact'],
  Blade: ['blades', 'melee', 'oneHanded', 'contact'],
  Cutter: ['blades', 'melee', 'oneHanded', 'contact'],
  Knife: ['blades', 'melee', 'oneHanded', 'contact'],
  Saber: ['blades', 'melee', 'oneHanded', 'contact'],
  Cleaver: ['blades', 'melee', 'twoHanded', 'contact'],
  'Execution Blade': ['blades', 'melee', 'twoHanded', 'contact'],
  Shiv: ['blades', 'melee', 'oneHanded', 'contact'],
  Claws: ['blades', 'melee', 'oneHanded', 'contact'],
  Whip: ['blades', 'melee', 'oneHanded', 'contact'],

  Mace: ['impact', 'melee', 'twoHanded', 'contact'],
  Maul: ['impact', 'melee', 'twoHanded', 'contact'],
  'Piston Maul': ['impact', 'melee', 'twoHanded', 'contact'],
  Hammer: ['impact', 'melee', 'twoHanded', 'contact'],
  Crusher: ['impact', 'melee', 'twoHanded', 'contact'],
  Club: ['impact', 'melee', 'twoHanded', 'contact'],
  Baton: ['impact', 'melee', 'oneHanded', 'contact'],

  Pistol: ['sidearms', 'ranged', 'oneHanded', 'projectile'],

  Rifle: ['rifles', 'ranged', 'twoHanded', 'projectile'],
  Carbine: ['rifles', 'ranged', 'twoHanded', 'projectile'],
  Repeater: ['rifles', 'ranged', 'twoHanded', 'projectile'],
  Shotgun: ['rifles', 'ranged', 'twoHanded', 'projectile'],
  Crossbow: ['rifles', 'ranged', 'twoHanded', 'projectile'],

  Projector: ['projectors', 'ranged', 'twoHanded', 'beam'],
  Sprayer: ['projectors', 'ranged', 'twoHanded', 'stream'],
  Spitter: ['projectors', 'ranged', 'twoHanded', 'stream'],
  Incinerator: ['projectors', 'ranged', 'twoHanded', 'stream'],
  Emitter: ['projectors', 'ranged', 'twoHanded', 'beam'],
  Irradiator: ['projectors', 'ranged', 'twoHanded', 'beam'],
  Lance: ['projectors', 'ranged', 'twoHanded', 'beam'],

  Launcher: ['ordnance', 'ranged', 'twoHanded', 'projectile', 'area'],
  Cannon: ['ordnance', 'ranged', 'twoHanded', 'projectile', 'area'],
  'Energy Cannon': ['ordnance', 'ranged', 'twoHanded', 'beam', 'area'],

  Staff: ['conduits', 'ranged', 'twoHanded', 'beam'],
  Wand: ['conduits', 'ranged', 'oneHanded', 'beam'],
  Conductor: ['conduits', 'ranged', 'twoHanded', 'beam'],
  Rod: ['conduits', 'ranged', 'oneHanded', 'beam']
});

const WEAPON_NAME_OVERRIDES = Object.freeze({
  'Bent Impact Rod': ['impact', 'melee', 'oneHanded', 'contact'],
  'Broken Phase Sword': ['blades', 'melee', 'twoHanded', 'contact'],
  'Phase Reaver': ['blades', 'melee', 'twoHanded', 'contact'],
  'Nanonic Phase Sword of Incision': ['blades', 'melee', 'twoHanded', 'contact'],
  'Scorpion Sword': ['blades', 'melee', 'twoHanded', 'contact'],
  'Radium Carbine': ['sidearms', 'ranged', 'oneHanded', 'projectile'],
  'Lightning Carbine': ['sidearms', 'ranged', 'oneHanded', 'projectile'],
  'Dissolver Carbine': ['sidearms', 'ranged', 'oneHanded', 'projectile'],
  'Orr, Devastating Carbine': ['sidearms', 'ranged', 'oneHanded', 'projectile']
});

function averageAttackSpeed(specification) {
  if (Number.isFinite(Number(specification))) return Number(specification);
  if (typeof specification === 'string') {
    const values = specification.split('-').map(Number).filter(Number.isFinite);
    if (values.length === 1) return values[0];
    if (values.length === 2) return (values[0] + values[1]) / 2;
  }
  if (specification && typeof specification === 'object') {
    const min = Number(specification.min);
    const max = Number(specification.max);
    if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
  }
  return null;
}

export function resolveWeaponTaxonomy(weapon, options = {}) {
  if (!weapon || typeof weapon !== 'object') return null;
  const explicitFamily = String(weapon.weaponFamily || '');
  const explicitTags = Array.isArray(weapon.weaponTags) ? weapon.weaponTags : [];
  const archetype = WEAPON_NAME_OVERRIDES[weapon.name] || TYPE_TO_ARCHETYPE[weapon.weaponType];
  const family = explicitFamily || archetype?.[0] || '';
  const tags = new Set(explicitTags.length > 0 ? explicitTags : (archetype || []).slice(1));

  if (!WEAPON_FAMILY_DEFINITIONS[family]) {
    if (options.strict) throw new TypeError(`Weapon ${weapon.name || '(unnamed)'} has no canonical family.`);
    return null;
  }
  for (const tag of tags) {
    if (!WEAPON_TAG_DEFINITIONS[tag]) {
      if (options.strict) throw new TypeError(`Weapon ${weapon.name || '(unnamed)'} has unknown tag: ${tag}`);
      tags.delete(tag);
    }
  }

  const cadence = averageAttackSpeed(weapon.bAttackSpeed);
  if (cadence !== null && cadence >= 1.4) tags.add('rapid');
  if (cadence !== null && cadence <= 0.95) tags.add('deliberate');

  return Object.freeze({
    family,
    familyLabel: WEAPON_FAMILY_DEFINITIONS[family].label,
    tags: Object.freeze([...tags]),
    tagLabels: Object.freeze([...tags].map(tag => WEAPON_TAG_DEFINITIONS[tag].label))
  });
}

export function normalizeWeaponTaxonomy(weapon, options = {}) {
  const taxonomy = resolveWeaponTaxonomy(weapon, options);
  if (!taxonomy) return weapon;
  return {
    ...weapon,
    weaponFamily: taxonomy.family,
    weaponFamilyLabel: taxonomy.familyLabel,
    weaponTags: [...taxonomy.tags]
  };
}

export function validateWeaponTaxonomy(weapons) {
  const errors = [];
  const familyCounts = Object.fromEntries(Object.keys(WEAPON_FAMILY_DEFINITIONS).map(id => [id, 0]));
  for (const weapon of weapons || []) {
    try {
      const taxonomy = resolveWeaponTaxonomy(weapon, { strict: true });
      familyCounts[taxonomy.family]++;
      if (!taxonomy.tags.some(tag => tag === 'melee' || tag === 'ranged')) {
        errors.push(`${weapon.name} is missing a melee/ranged tag.`);
      }
      if (!taxonomy.tags.some(tag => tag === 'oneHanded' || tag === 'twoHanded')) {
        errors.push(`${weapon.name} is missing a handling tag.`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  for (const [family, count] of Object.entries(familyCounts)) {
    if (count === 0) errors.push(`Weapon family ${family} has no registered weapons.`);
  }
  return { valid: errors.length === 0, errors, familyCounts };
}
