const passives = [
    // TIER 1 PASSIVES
    {
        name: "Swift Strikes",
        description: "Increases your attack speed.",
        icon: "icons/swift_strikes.png",
        statChanges: {
            attackSpeed: [0, 5, 12, 20, 30, 45, 75, 120]  // Percentage increases
        },
        passiveTier: 1
    },
    {
        name: "Kinetic Focus",
        description: "Increases your kinetic damage.",
        icon: "icons/kinetic_focus.png",
        statChanges: {
            damageTypes: {
                kinetic: [0, 15, 35, 65, 100, 140, 210, 300]  // Percentage increases
            }
        },
        passiveTier: 1
    },
    {
        name: "Blade Master",
        description: "Increases your slashing damage.",
        icon: "icons/mental_prowess.png", // Reusing icon for now
        statChanges: {
            damageTypes: {
                slashing: [0, 15, 35, 65, 100, 140, 210, 300]  // Percentage increases
            }
        },
        passiveTier: 1
    },
    {
        name: "Pyro Mastery",
        description: "Increases your pyro damage.",
        icon: "icons/pyromancer.png",
        statChanges: {
            damageTypes: {
                pyro: [0, 15, 35, 65, 100, 140, 210, 300]  // Percentage increases
            }
        },
        passiveTier: 1
    },
    {
        name: "Corrosive Specialist",
        description: "Increases your corrosive damage.",
        icon: "icons/toxicologist.png", // Reusing icon for now
        statChanges: {
            damageTypes: {
                corrosive: [0, 15, 35, 65, 100, 140, 210, 300]  // Percentage increases
            }
        },
        passiveTier: 1
    },
    {
        name: "Electrician",
        description: "Increases your electric damage.",
        icon: "icons/electrician.png", // Need new icon
        statChanges: {
            damageTypes: {
                electric: [0, 15, 35, 65, 100, 140, 210, 300]  // Percentage increases
            }
        },
        passiveTier: 1
    },
    {
        name: "Cryomancer",
        description: "Increases your cryo damage.",
        icon: "icons/cryomancer.png", // Need new icon
        statChanges: {
            damageTypes: {
                cryo: [0, 15, 35, 65, 100, 140, 210, 300]  // Percentage increases
            }
        },
        passiveTier: 1
    },
    {
        name: "Radiation Expert",
        description: "Increases your radiation damage.",
        icon: "icons/radiation.png", // Need new icon
        statChanges: {
            damageTypes: {
                radiation: [0, 15, 35, 65, 100, 140, 210, 300]  // Percentage increases
            }
        },
        passiveTier: 1
    },
    

    // TIER 2 PASSIVES
    {
        name: "Critical Precision",
        description: "Increases your critical strike chance.",
        icon: "icons/critical_precision.png",
        statChanges: {
            criticalChance: [0, 5, 10, 15, 20, 25, 30]  // Percentage points (not percent increase)
        },
        passiveTier: 2
    },
    {
        name: "Devastating Precision",
        description: "Increases your critical strike multiplier.",
        icon: "icons/devastating_blows.png",
        statChanges: {
            criticalMultiplier: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]  // Flat increases to multiplier
        },
        passiveTier: 2
    },    
    {
        name: "Impenetrable Fortification",
        description: "Increases your maximum health.",
        icon: "icons/fortification.png",
        statChanges: {
            healthPercent: [0, 5, 10, 15, 20, 25, 30],  // Percentage increases
            flatHealth: [0, 10, 20, 30, 40, 50, 60]  // Flat increases
        },
        passiveTier: 2
    },
    {
        name: "Sustained Vitality",
        description: "Increases your health regeneration.",
        icon: "icons/vitality.png",
        statChanges: {
            healthRegen: [0, 0.5, 1.0, 2, 2.5, 3.5, 5]  // Flat increases
        },
        passiveTier: 2
    },
    {
        name: "Toughened Hide",
        description: "Increases your physical defense.",
        icon: "icons/toughened_hide.png",
        statChanges: {
            defenseTypes: {
                physicalResistance: [0, 5, 10, 15, 20, 25, 30]  // Flat increases
            }
        },
        passiveTier: 2
    },
    {
        name: "Mental Fortitude",
        description: "Increases your elemental defense.",
        icon: "icons/mental_fortitude.png",
        statChanges: {
            defenseTypes: {
                elementalResistance: [0, 5, 10, 15, 20, 25, 30]  // Flat increases
            }
        },
        passiveTier: 2
    },
    {
        name: "Heat Shield",
        description: "Increases your chemical defense.",
        icon: "icons/heat_shield.png",
        statChanges: {
            defenseTypes: {
                chemicalResistance: [0, 5, 10, 15, 20, 25, 30]  // Flat increases
            }
        },
        passiveTier: 2
    },
    {
        name: "Immunology",
        description: "Increases all your defenses.",
        icon: "icons/immunology.png",
        statChanges: {
            defenseTypes: {
                physicalResistance: [0, 3, 6, 9, 12, 15, 18],  // Flat increases
                elementalResistance: [0, 3, 6, 9, 12, 15, 18],   // Flat increases
                chemicalResistance: [0, 3, 6, 9, 12, 15, 18]    // Flat increases
            }
        },
        passiveTier: 2
    },
    {
        name: "Anti-Magnetic Field",
        description: "Increases your elemental defense significantly.",
        icon: "icons/anti_magnetic_field.png",
        statChanges: {
            defenseTypes: {
                elementalResistance: [0, 10, 20, 30, 40, 50, 60]  // Flat increases
            }
        },
        passiveTier: 2
    },

    // TIER 3 PASSIVES
    {
        name: "Energy Barrier",
        description: "Increases your maximum energy shield.",
        icon: "icons/energy_barrier.png",
        statChanges: {
            energyShieldPercent: [0, 5, 10, 15, 20, 25, 30]  // Percentage increases
        },
        passiveTier: 3
    },
    {
        name: "Toughness",
        description: "Increases your physical resistance.",
        icon: "icons/toughness.png",
        statChanges: {
            defenseTypes: {
                physicalResistance: [0, 5, 10, 15, 20, 25, 30]  // Flat increases
            }
        },
        passiveTier: 3
    },
    {
        name: "Thermal Regulation",
        description: "Increases your elemental defense.",
        icon: "icons/thermal_regulation.png",
        statChanges: {
            defenseTypes: {
                elementalResistance: [0, 5, 10, 15, 20, 25, 30]  // Flat increases
            }
        },
        passiveTier: 3
    },
    {
        name: "Faraday Protection",
        description: "Increases your elemental defense.",
        icon: "icons/faraday_protection.png",
        statChanges: {
            defenseTypes: {
                elementalResistance: [0, 5, 10, 15, 20, 25, 30]  // Flat increases
            }
        },
        passiveTier: 3
    },
    
    // TIER 4 PASSIVES
    {
        name: "Raw Power",
        description: "Adds flat kinetic damage to your attacks.",
        icon: "icons/raw_power.png",
        statChanges: {
            flatDamageTypes: {
                kinetic: [0, 3, 6, 9, 12, 15, 18]  // Flat increases
            }
        },
        passiveTier: 4
    },
    {
        name: "Mind Blast",
        description: "Adds flat mental damage to your attacks.",
        icon: "icons/mind_blast.png",
        statChanges: {
            flatDamageTypes: {
                slashing: [0, 3, 6, 9, 12, 15, 18]  // Flat increases
            }
        },
        passiveTier: 4
    },
    {
        name: "Firestarter",
        description: "Adds flat pyro damage to your attacks.",
        icon: "icons/firestarter.png",
        statChanges: {
            flatDamageTypes: {
                pyro: [0, 3, 6, 9, 12, 15, 18]  // Flat increases
            }
        },
        passiveTier: 4
    },
    {
        name: "Toxin Expert",
        description: "Adds flat chemical damage to your attacks.",
        icon: "icons/toxin_expert.png",
        statChanges: {
            flatDamageTypes: {
                corrosive: [0, 3, 6, 9, 12, 15, 18]  // Flat increases
            }
        },
        passiveTier: 4
    },
    {
        name: "Field Generator",
        description: "Adds flat electric damage to your attacks.",
        icon: "icons/field_generator.png",
        statChanges: {
            flatDamageTypes: {
                electric: [0, 3, 6, 9, 12, 15, 18]  // Flat increases
            }
        },
        passiveTier: 4
    },
    {
        name: "Vitality Core",
        description: "Increases your maximum health with flat values.",
        icon: "icons/vitality_core.png",
        statChanges: {
            flatHealth: [0, 10, 20, 30, 40, 50, 60]  // Flat increases
        },
        passiveTier: 4
    },
    {
        name: "Shield Generator",
        description: "Increases your maximum energy shield with flat values.",
        icon: "icons/shield_generator.png",
        statChanges: {
            flatEnergyShield: [0, 5, 10, 15, 20, 25, 30]  // Flat increases
        },
        passiveTier: 4
    },
    {
        name: "Precision System", 
        description: "Increases your precision.",
        icon: "icons/precision_system.png",
        statChanges: {
            precision: [0, 3, 6, 9, 12, 15, 18]  // Flat increases
        },
        passiveTier: 4
    },
    {
        name: "Deflection Field",
        description: "Increases your deflection.",
        icon: "icons/deflection_field.png",
        statChanges: {
            deflection: [0, 3, 6, 9, 12, 15, 18]  // Flat increases
        },
        passiveTier: 4
    },
    // Add group damage passives as tier 3
    {
        name: "Physical Mastery",
        description: "Increases all physical damage (kinetic and slashing).",
        icon: "icons/physical_mastery.png", // Replace with appropriate icon
        statChanges: {
            damageGroups: {
                physical: [0, 10, 20, 30, 50, 70, 100]  // Percentage increases for the physical group
            }
        },
        passiveTier: 3
    },
    {
        name: "Elemental Mastery",
        description: "Increases all elemental damage (pyro, cryo, electric).",
        icon: "icons/elemental_mastery.png", // Replace with appropriate icon
        statChanges: {
            damageGroups: {
                elemental: [0, 10, 20, 30, 50, 70, 100]  // Percentage increases for the elemental group
            }
        },
        passiveTier: 3
    },
    {
        name: "Chemical Mastery",
        description: "Increases all chemical damage (corrosive and radiation).",
        icon: "icons/chemical_mastery.png", // Replace with appropriate icon
        statChanges: {
            damageGroups: {
                chemical: [0, 10, 20, 30, 50, 70, 100]  // Percentage increases for the chemical group
            }
        },
        passiveTier: 3
    }
];