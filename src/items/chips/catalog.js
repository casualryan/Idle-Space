const chipIcon = 'icons/minor_electronic_circuit.png';

function chip(definition) {
  return {
    type: 'Chip',
    slot: 'chip',
    icon: chipIcon,
    stackable: true,
    isDisassembleable: true,
    disassembleResults: [{ name: 'Advanced Electronic Circuit', quantity: 1 }],
    ...definition
  };
}

function flatDamageChip(name, levelRequirement, damageType, min, max, descriptionPrefix = '') {
  return chip({
    name,
    levelRequirement,
    color: 'red',
    damageTypes: { [damageType]: { min, max } },
    description: `${descriptionPrefix}Adds ${min}-${max} flat ${damageType.charAt(0).toUpperCase()}${damageType.slice(1)} damage.`
  });
}

const chips = [
  // Red: offense. Flat damage is the backbone so stacked percentage increases
  // still need a meaningful base to amplify.
  flatDamageChip('Kinetic Driver Chip', 30, 'kinetic', 8, 12),
  flatDamageChip('Slashing Edge Chip', 30, 'slashing', 8, 12),
  flatDamageChip('Pyro Injector Chip', 30, 'pyro', 8, 12),
  flatDamageChip('Cryo Injector Chip', 30, 'cryo', 8, 12),
  flatDamageChip('Electric Injector Chip', 30, 'electric', 8, 12),
  flatDamageChip('Corrosive Injector Chip', 30, 'corrosive', 8, 12),
  flatDamageChip('Radiation Injector Chip', 30, 'radiation', 8, 12),
  chip({
    name: 'Targeting Logic Chip', levelRequirement: 30, color: 'red',
    precision: { min: 18, max: 28 },
    description: 'Adds 18-28 Precision.'
  }),
  chip({
    name: 'Cycle Accelerator Chip', levelRequirement: 32, color: 'red',
    attackSpeedModifier: { min: 3, max: 5 },
    description: 'Increases Attack Speed by 3-5%.'
  }),
  chip({
    name: 'Critical Finder Chip', levelRequirement: 34, color: 'red',
    criticalChanceModifier: { min: 2, max: 3 },
    description: 'Adds 2-3% Critical Chance.'
  }),
  chip({
    name: 'Critical Amplifier Chip', levelRequirement: 34, color: 'red',
    criticalMultiplierModifier: { min: 10, max: 16 },
    description: 'Adds 10-16% Critical Multiplier.'
  }),
  chip({
    name: 'Penetration Logic Chip', levelRequirement: 36, color: 'red',
    armorPenetration: { min: 4, max: 6 },
    description: 'Adds 4-6% Armor Penetration.'
  }),
  chip({
    name: 'Status Injector Chip', levelRequirement: 36, color: 'red',
    statModifiers: { debuffChanceBonus: { min: 0.03, max: 0.05 } },
    description: 'Adds 3-5% status application chance.'
  }),
  flatDamageChip('Kinetic Driver Chip II', 44, 'kinetic', 14, 20, 'Advanced. '),
  flatDamageChip('Slashing Edge Chip II', 44, 'slashing', 14, 20, 'Advanced. '),
  flatDamageChip('Pyro Injector Chip II', 44, 'pyro', 14, 20, 'Advanced. '),
  flatDamageChip('Cryo Injector Chip II', 44, 'cryo', 14, 20, 'Advanced. '),
  flatDamageChip('Electric Injector Chip II', 44, 'electric', 14, 20, 'Advanced. '),
  flatDamageChip('Corrosive Injector Chip II', 44, 'corrosive', 14, 20, 'Advanced. '),
  flatDamageChip('Radiation Injector Chip II', 44, 'radiation', 14, 20, 'Advanced. '),

  // Blue: defense.
  chip({
    name: 'Integrity Buffer Chip', levelRequirement: 30, color: 'blue',
    healthBonus: { min: 120, max: 180 },
    description: 'Adds 120-180 maximum Health.'
  }),
  chip({
    name: 'Shield Buffer Chip', levelRequirement: 30, color: 'blue',
    energyShieldBonus: { min: 90, max: 140 },
    description: 'Adds 90-140 maximum Energy Shield.'
  }),
  chip({
    name: 'Repair Routine Chip', levelRequirement: 32, color: 'blue',
    healthRegen: { min: 3, max: 5 },
    description: 'Restores 3-5 Health per second.'
  }),
  chip({
    name: 'Evasion Solver Chip', levelRequirement: 32, color: 'blue',
    deflection: { min: 26, max: 40 },
    description: 'Adds 26-40 Deflection.'
  }),
  chip({
    name: 'Physical Ward Chip', levelRequirement: 34, color: 'blue',
    defenseTypes: { physicalResistance: { min: 8, max: 12 } },
    description: 'Adds 8-12% Physical Resistance.'
  }),
  chip({
    name: 'Elemental Ward Chip', levelRequirement: 34, color: 'blue',
    defenseTypes: { elementalResistance: { min: 8, max: 12 } },
    description: 'Adds 8-12% Elemental Resistance.'
  }),
  chip({
    name: 'Chemical Ward Chip', levelRequirement: 34, color: 'blue',
    defenseTypes: { chemicalResistance: { min: 8, max: 12 } },
    description: 'Adds 8-12% Chemical Resistance.'
  }),
  chip({
    name: 'Status Firewall Chip', levelRequirement: 36, color: 'blue',
    statModifiers: { statusResistance: { min: 8, max: 12 } },
    description: 'Adds 8-12% Status Resistance.'
  }),
  chip({
    name: 'Status Purge Chip', levelRequirement: 36, color: 'blue',
    statModifiers: { statusDurationReduction: { min: 10, max: 15 } },
    description: 'Reduces hostile status duration by 10-15%.'
  }),
  chip({
    name: 'Integrity Buffer Chip II', levelRequirement: 44, color: 'blue',
    healthBonus: { min: 240, max: 340 },
    description: 'Adds 240-340 maximum Health.'
  }),
  chip({
    name: 'Shield Buffer Chip II', levelRequirement: 44, color: 'blue',
    energyShieldBonus: { min: 190, max: 270 },
    description: 'Adds 190-270 maximum Energy Shield.'
  }),
  chip({
    name: 'Omni-Ward Chip', levelRequirement: 46, color: 'blue',
    defenseTypes: {
      physicalResistance: { min: 5, max: 7 },
      elementalResistance: { min: 5, max: 7 },
      chemicalResistance: { min: 5, max: 7 }
    },
    description: 'Adds 5-7% to every resistance.'
  }),

  // Green: utility and system stats.
  chip({
    name: 'Weapon Efficiency Chip', levelRequirement: 30, color: 'green',
    weaponEfficiency: { min: 10, max: 15 },
    description: 'Improves the activation chance of weapon effects.'
  }),
  chip({
    name: 'Armor Efficiency Chip', levelRequirement: 30, color: 'green',
    armorEfficiency: { min: 10, max: 15 },
    description: 'Improves the activation chance of defensive armor effects.'
  }),
  chip({
    name: 'Bionic Efficiency Chip', levelRequirement: 30, color: 'green',
    bionicEfficiency: { min: 10, max: 15 },
    description: 'Improves the activation chance of bionic effects.'
  }),
  chip({
    name: 'Bionic Sync Chip', levelRequirement: 32, color: 'green',
    bionicSync: { min: 8, max: 12 },
    description: 'Amplifies static stats from equipped bionics.'
  }),
  chip({
    name: 'Combo Initiator Chip', levelRequirement: 34, color: 'green',
    comboAttack: { min: 5, max: 8 },
    description: 'Adds 5-8% Combo Attack chance.'
  }),
  chip({
    name: 'Combo Amplifier Chip', levelRequirement: 34, color: 'green',
    comboEffectiveness: { min: 8, max: 12 },
    description: 'Adds 8-12% Combo Effectiveness.'
  }),
  chip({
    name: 'Damage Floor Solver Chip', levelRequirement: 36, color: 'green',
    statModifiers: { damageRollFloorBonus: { min: 0.04, max: 0.06 } },
    description: 'Raises the minimum result of damage rolls by 4-6%.'
  }),
  chip({
    name: 'Status Persistence Chip', levelRequirement: 36, color: 'green',
    statModifiers: { debuffDurationBonus: { min: 0.12, max: 0.18 } },
    description: 'Extends statuses you apply by 12-18%.'
  }),
  chip({
    name: 'Debuff Hunter Chip', levelRequirement: 40, color: 'green',
    statModifiers: { damageVsDebuffed: { min: 0.06, max: 0.09 } },
    description: 'Deals 6-9% more damage to debuffed targets.'
  }),
  chip({
    name: 'Emergency Recovery Chip', levelRequirement: 42, color: 'green',
    effects: [{ trigger: 'whenHit', chance: 8, action: 'heal', parameters: { amount: 60 } }],
    description: 'When hit, has an 8% chance to restore 60 Health.'
  }),

  // Black: build-shaping kernels. A loadout may operate exactly one at a time.
  chip({
    name: 'Redline Kernel', levelRequirement: 45, color: 'black',
    attackSpeedModifier: 20,
    healthBonusPercent: -15,
    description: 'Increases Attack Speed by 20%, but reduces maximum Health by 15%.'
  }),
  chip({
    name: 'Bastion Kernel', levelRequirement: 45, color: 'black',
    statModifiers: { damageTakenReduction: 0.12 },
    attackSpeedModifier: -15,
    description: 'Reduces damage taken by 12%, but reduces Attack Speed by 15%.'
  }),
  chip({
    name: 'Recursive Strike Kernel', levelRequirement: 47, color: 'black',
    additionalComboAttacks: 1,
    comboEffectiveness: -35,
    description: 'Adds one Combo Attack, but reduces Combo Effectiveness by 35%.'
  }),
  chip({
    name: 'Predator Kernel', levelRequirement: 47, color: 'black',
    statModifiers: { damageVsDebuffed: 0.3 },
    statusResistance: -20,
    description: 'Deals 30% more damage to debuffed targets, but reduces Status Resistance by 20%.'
  }),
  chip({
    name: 'Harmonic Bionic Kernel', levelRequirement: 49, color: 'black',
    bionicSync: 35,
    bionicEfficiency: -20,
    description: 'Adds 35% Bionic Sync, but reduces Bionic Efficiency by 20%.'
  }),
  chip({
    name: 'Critical Singularity Kernel', levelRequirement: 50, color: 'black',
    criticalChanceModifier: 12,
    criticalMultiplierModifier: 60,
    statModifiers: { directDamageMultiplier: -0.15 },
    description: 'Greatly improves critical performance, but reduces all direct damage by 15%.'
  }),
  chip({
    name: 'Reprisal Kernel', levelRequirement: 50, color: 'black',
    effects: [{
      trigger: 'whenHit', chance: 50, action: 'dealDamage',
      parameters: { damageType: 'electric', amount: 220, ignoreDefense: false }
    }],
    damageTakenReduction: -0.08,
    description: 'When hit, has a 50% chance to retaliate for 220 Electric damage, but causes 8% more damage taken.'
  })
];

export default chips;
