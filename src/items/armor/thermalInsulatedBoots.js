export default {
    name: "Thermal Insulated Boots",
    type: "Armor",
    icon: "icons/thermal_boots.png",
    defenseTypes: {
        elementalResistance: { min: 15, max: 25 } // Good against pyro, cryo, electric
    },
    healthBonus: { min: 30, max: 30 },
    healthBonusPercentRange: { min: 10, max: 15 },
    slot: 'feet',
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 2
        },
    ],
    description: 'Defensive boots.'
}; 