const scrapDisassembly = [{ name: 'Scrap Metal', quantity: 1 }];
const circuitDisassembly = [{ name: 'Advanced Electronic Circuit', quantity: 1 }];

function bionic(definition) {
  return {
    type: 'Bionic',
    slot: 'bionic',
    icon: definition.icon || 'icons/bionic_arm.png',
    isDisassembleable: true,
    disassembleResults: definition.levelRequirement >= 26 ? circuitDisassembly : scrapDisassembly,
    ...definition
  };
}

// Bionics intentionally remain freely stackable. Their progression is broad and
// restrained: early modules establish a stat, later modules improve it modestly,
// and authored endgame bionics trade generic affixes for unusual effects.
const bionics = [
  // Level 1-10: foundational stat fillers.
  bionic({
    name: 'Health Module', levelRequirement: 1,
    healthBonusPercent: { min: 6, max: 9 },
    description: 'Increases maximum Health by 6-9%.'
  }),
  bionic({
    name: 'Regeneration Module', levelRequirement: 3,
    healthRegen: { min: 1, max: 2 },
    description: 'Restores 1-2 Health per second.'
  }),
  bionic({
    name: 'Shield Capacitor', levelRequirement: 5,
    energyShieldBonus: { min: 25, max: 40 },
    energyShieldBonusPercent: { min: 5, max: 8 },
    description: 'Adds Energy Shield and modestly improves maximum Energy Shield.'
  }),
  bionic({
    name: 'Physical Booster', levelRequirement: 6, icon: 'icons/kinetic_booster.png',
    statModifiers: { damageGroups: { physical: { min: 10, max: 14 } } },
    description: 'Increases Kinetic and Slashing damage by 10-14%.'
  }),
  bionic({
    name: 'Elemental Booster', levelRequirement: 6, icon: 'icons/power_cell.png',
    statModifiers: { damageGroups: { elemental: { min: 10, max: 14 } } },
    description: 'Increases Pyro, Cryo, and Electric damage by 10-14%.'
  }),
  bionic({
    name: 'Chemical Booster', levelRequirement: 6, icon: 'icons/synthetic_poison_gland.png',
    statModifiers: { damageGroups: { chemical: { min: 10, max: 14 } } },
    description: 'Increases Corrosive and Radiation damage by 10-14%.'
  }),
  bionic({
    name: 'Precision Relay', levelRequirement: 8, icon: 'icons/targeting_module.png',
    precision: { min: 12, max: 18 },
    description: 'Adds 12-18 Precision.'
  }),
  bionic({
    name: 'Deflection Gyro', levelRequirement: 8, icon: 'icons/basic_servo.png',
    deflection: { min: 12, max: 18 },
    description: 'Adds 12-18 Deflection.'
  }),
  bionic({
    name: 'Impact Insulator', levelRequirement: 10,
    defenseTypes: { physicalResistance: { min: 5, max: 8 } },
    description: 'Adds 5-8% Physical Resistance.'
  }),
  bionic({
    name: 'Thermal Insulator', levelRequirement: 10,
    defenseTypes: { elementalResistance: { min: 5, max: 8 } },
    description: 'Adds 5-8% Elemental Resistance.'
  }),
  bionic({
    name: 'Hazard Insulator', levelRequirement: 10,
    defenseTypes: { chemicalResistance: { min: 5, max: 8 } },
    description: 'Adds 5-8% Chemical Resistance.'
  }),

  // Level 11-25: system support.
  bionic({
    name: 'Weapon Efficiency Relay', levelRequirement: 12,
    weaponEfficiency: { min: 8, max: 12 },
    description: 'Improves the activation chance of weapon effects.'
  }),
  bionic({
    name: 'Armor Efficiency Relay', levelRequirement: 14,
    armorEfficiency: { min: 8, max: 12 },
    description: 'Improves the activation chance of defensive armor effects.'
  }),
  bionic({
    name: 'Bionic Efficiency Relay', levelRequirement: 16,
    bionicEfficiency: { min: 8, max: 12 },
    description: 'Improves the activation chance of bionic effects.'
  }),
  bionic({
    name: 'Status Filter', levelRequirement: 18,
    statusResistance: { min: 6, max: 10 },
    statusDurationReduction: { min: 6, max: 10 },
    description: 'Makes hostile statuses less likely and shorter-lived.'
  }),
  bionic({
    name: 'Sync Coupler', levelRequirement: 20,
    bionicSync: { min: 6, max: 10 },
    description: 'Amplifies the static stats of all equipped bionics.'
  }),
  bionic({
    name: 'Combo Relay', levelRequirement: 22,
    comboAttack: { min: 5, max: 8 },
    comboEffectiveness: { min: 5, max: 8 },
    description: 'Adds Combo Attack chance and Combo Effectiveness.'
  }),
  bionic({
    name: 'Critical Co-Processor', levelRequirement: 24, icon: 'icons/precision_mechanism.png',
    criticalChanceModifier: { min: 3, max: 5 },
    criticalMultiplierModifier: { min: 10, max: 15 },
    description: 'Modestly improves critical chance and critical damage.'
  }),

  // Level 26-40: improved modules and hybrids.
  bionic({
    name: 'Reinforced Health Module', levelRequirement: 28,
    healthBonusPercent: { min: 10, max: 13 },
    description: 'Increases maximum Health by 10-13%.'
  }),
  bionic({
    name: 'Reactor Shield Capacitor', levelRequirement: 30,
    energyShieldBonus: { min: 100, max: 150 },
    energyShieldBonusPercent: { min: 9, max: 12 },
    description: 'Adds a substantial Energy Shield reserve.'
  }),
  bionic({
    name: 'Accelerated Regeneration Module', levelRequirement: 32,
    healthRegen: { min: 4, max: 6 },
    description: 'Restores 4-6 Health per second.'
  }),
  bionic({
    name: 'Targeting Co-Processor', levelRequirement: 34, icon: 'icons/targeting_module.png',
    precision: { min: 35, max: 50 },
    armorPenetration: { min: 5, max: 8 },
    description: 'Improves Precision and Armor Penetration.'
  }),
  bionic({
    name: 'Reaction Enhancer', levelRequirement: 36, icon: 'icons/speedenhancer.png',
    attackSpeedModifier: { min: 8, max: 12 },
    description: 'Increases Attack Speed by 8-12%.'
  }),
  bionic({
    name: 'Adaptive Guard Gyro', levelRequirement: 38, icon: 'icons/basic_servo.png',
    deflection: { min: 40, max: 55 },
    defenseTypes: {
      physicalResistance: { min: 4, max: 6 },
      elementalResistance: { min: 4, max: 6 },
      chemicalResistance: { min: 4, max: 6 }
    },
    description: 'Adds Deflection and a small amount of every resistance.'
  }),
  bionic({
    name: 'Health Exchanger', levelRequirement: 40,
    healthBonusPercent: { min: -12, max: -8 },
    energyShieldBonus: { min: 180, max: 260 },
    energyShieldBonusPercent: { min: 18, max: 24 },
    description: 'Trades maximum Health for a much larger Energy Shield reserve.'
  }),

  // Level 41-50: strict upgrades and authored endgame bionics.
  bionic({
    name: 'Amplified Physical Booster', levelRequirement: 42, icon: 'icons/kinetic_booster.png',
    statModifiers: { damageGroups: { physical: { min: 16, max: 20 } } },
    description: 'Increases Kinetic and Slashing damage by 16-20%.'
  }),
  bionic({
    name: 'Amplified Elemental Booster', levelRequirement: 42, icon: 'icons/hd_power_cell.png',
    statModifiers: { damageGroups: { elemental: { min: 16, max: 20 } } },
    description: 'Increases Pyro, Cryo, and Electric damage by 16-20%.'
  }),
  bionic({
    name: 'Amplified Chemical Booster', levelRequirement: 42, icon: 'icons/synthetic_poison_gland.png',
    statModifiers: { damageGroups: { chemical: { min: 16, max: 20 } } },
    description: 'Increases Corrosive and Radiation damage by 16-20%.'
  }),
  bionic({
    name: 'Harmonic Sync Core', levelRequirement: 44,
    bionicSync: { min: 18, max: 24 },
    bionicEfficiency: { min: 10, max: 15 },
    description: 'Strongly synchronizes the installed bionic set.'
  }),
  bionic({
    name: 'Reactive Barbs', levelRequirement: 46, icon: 'icons/titanium_thorn.png',
    effects: [{
      trigger: 'whenHit', chance: 100, action: 'dealDamage',
      parameters: { damageType: 'kinetic', amount: 60, ignoreDefense: false }
    }],
    description: 'When hit, deals 60 Kinetic damage to the attacker.'
  }),
  bionic({
    name: 'Emergency Repair Mesh', levelRequirement: 48,
    effects: [{
      trigger: 'whenHit', chance: 15, action: 'heal', parameters: { amount: 100 }
    }],
    description: 'When hit, has a 15% chance to restore 100 Health.'
  }),
  bionic({
    name: 'Pain Dividend Engine', levelRequirement: 50,
    disableRandomModifiers: true,
    healthBonusPercent: -10,
    effects: [{
      trigger: 'whenHit', chance: 35, action: 'dealDamage',
      parameters: { damageType: 'kinetic', amount: 180, ignoreDefense: false }
    }],
    description: 'Sacrifices 10% maximum Health. When hit, has a 35% chance to retaliate for 180 Kinetic damage.'
  }),
  bionic({
    name: 'Predatory Feedback Organ', levelRequirement: 50,
    disableRandomModifiers: true,
    damageVsDebuffed: 0.18,
    debuffChanceBonus: 0.05,
    statusResistance: -12,
    description: 'Deals 18% more damage to debuffed targets and applies statuses more readily, but reduces Status Resistance.'
  }),
  bionic({
    name: 'Zero-Point Reflex Spine', levelRequirement: 50,
    disableRandomModifiers: true,
    attackSpeedModifier: 12,
    deflection: 70,
    damageTakenReduction: -0.06,
    description: 'Adds 12% Attack Speed and 70 Deflection, but causes 6% more damage taken.'
  })
];

export default bionics;
