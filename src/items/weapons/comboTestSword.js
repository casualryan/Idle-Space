// src/items/weapons/comboTestSword.js
export default {
    name: "Combo Test Sword",
    developerOnly: true,
    levelRequirement: 10,
    type: "Weapon",
    weaponType: "Sword",
    icon: "icons/ironsword.png",
    bAttackSpeed: 1.2,
    damageTypes: {
        kinetic: { min: 15, max: 25 },
        slashing: { min: 10, max: 18 }
    },
    statModifiers: {
        damageTypes: {
            kinetic: { min: 15, max: 25 },
            slashing: { min: 10, max: 20 }
        }
    },
    attackSpeedModifierRange: { min: 10, max: 20 },
    criticalChanceModifierRange: { min: 15, max: 25 },
    precision: { min: 3, max: 8 },
    // Combo attack stats for testing
    comboAttack: { min: 15, max: 25 }, // 15-25% chance for combo
    comboEffectiveness: { min: 50, max: 100 }, // +50-100% combo damage (making base 20% into 70-120%)
    additionalComboAttacks: { min: 1, max: 2 }, // 1-2 additional combo hits
    // Efficiency for testing weapon procs
    weaponEfficiency: { min: 25, max: 40 }, // +25-40% proc chance
    effects: [
        {
            trigger: 'onHit',
            chance: 30,
            action: 'dealDamage',
            parameters: {
                damageType: 'kinetic',
                amount: 15,
                ignoreDefense: false
            }
        }
    ],
    slot: 'mainHand',
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'A specialized sword designed for testing combo attack mechanics. Features high combo chance and effectiveness.'
};
