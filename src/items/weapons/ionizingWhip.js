// src/items/weapons/ionizingWhip.js
export default {
    name: "Ionizing Whip",
    levelRequirement: 45,
    type: "Weapon",
    weaponType: "Whip",
    icon: "icons/default-icon.png",
    bAttackSpeed: 1.0,
    damageTypes: {
        electric: { min: 400, max: 450 }
    },
    effects: [
        {
            trigger: 'onHit',
            chance: 100,
            action: 'dealDamage',
            parameters: {
                damageType: 'pyro',
                amount: 100
            }
        }
    ],
    comboAttack: { min: 50, max: 50 },
    additionalComboAttacks: { min: 1, max: 1 },
    comboEffectiveness: { min: 100, max: 100 },
    passiveBonuses: {
        "Pyro Mastery": 1
    },
    slot: 'mainHand',
    wires: {
        totalSlots: "0-0",
        blackSlotsMax: 0,
        colors: { red: "0-0", green: "0-0", blue: "0-0", black: "0-0" }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 }
    ]
};
