// src/items/weapons/phaseReaver.js
export default {
        name: "Phase Reaver",
        type: "Weapon",
        weaponType: "Sword",
        icon: "icons/phase_reaver.png",
        level: 10,
        bAttackSpeed: 2.5,
        damageTypes: {
            kinetic: { min: 18, max: 25 },
            slashing: { min: 8, max: 12 }
        },
        statModifiers: {
            damageTypes: {
                slashing: { min: 25, max: 40 },
            },
            damageGroups: {
                physical: { min: 15, max: 20 }
            }
        },
        attackSpeedModifierRange: { min: 10, max: 20 },
        criticalChanceModifierRange: { min: 15, max: 25 },
        criticalMultiplierModifierRange: { min: 30, max: 40 },
        deflection: { min: 10, max: 15 },
        defenseTypes: {},
        slot: 'mainHand',
        isDisassembleable: true,
        disassembleResults: [
            { name: 'Unstable Phase Core', quantity: 1 },
            { name: 'Advanced Alloy', quantity: 2 }
        ],
        description: 'A fast-striking phase blade tuned for physical damage and critical hits.'
    };
