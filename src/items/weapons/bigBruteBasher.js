// src/items/weapons/bigBruteBasher.js
export default {
    name: "Big Brute Basher",
    levelRequirement: 50,
    type: "Weapon",
    weaponType: "Mace",
    icon: "icons/default-icon.png",
    bAttackSpeed: 0.7,
    damageTypes: {
        kinetic: { min: 750, max: 800 }
    },
    statModifiers: {
        damageTypes: {
            kinetic: 100 // +100% kinetic damage
        }
    },
    slot: 'mainHand',
    wires: {
        totalSlots: "3-3",
        blackSlotsMax: 0,
        colors: { red: "3-3", green: "0-0", blue: "0-0", black: "0-0" }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 }
    ]
};
