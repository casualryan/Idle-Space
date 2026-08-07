export default {
    name: 'Health Module',
    type: 'Bionic',
    icon: 'icons/healthModule.png',
    healthBonusPercentRange: { min: 6, max: 9 },
    slot: 'bionic',
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Max Health.'
}; 