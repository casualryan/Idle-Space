// src/items/weapons/neurotoxinNeedler.js
export default {
        name: "Neurotoxin Needler",
        type: "Weapon",
        weaponType: "Crossbow",
        icon: "icons/needler.png",
        level: 10,
        bAttackSpeed: 3.0,
        damageTypes: {
            kinetic: { min: 8, max: 12 },
            corrosive: { min: 12, max: 18 }
        },
        statModifiers: {
            damageTypes: {
                corrosive: { min: 35, max: 45 },
                kinetic: { min: 15, max: 25 }
            },
            damageGroups: {
                chemical: { min: 15, max: 25 }
            }
        },
        attackSpeedModifierRange: { min: 15, max: 25 },
        criticalChanceModifierRange: { min: 20, max: 30 },
        defenseTypes: {},
        slot: 'mainHand',
        isDisassembleable: true,
        disassembleResults: [
            { name: 'Toxic Residue', quantity: 2 },
            { name: 'Precision Mechanism', quantity: 1 }
        ],
        description: 'A rapid-fire needler that combines kinetic and corrosive damage.'
    };
