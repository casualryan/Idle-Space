// src/items/chips/redTestChip.js
export default {
  name: 'Red Test Chip',
  levelRequirement: 1,
  developerOnly: true,
  type: 'Chip',
  icon: 'icons/minor_electronic_circuit.png',
  stackable: true,
  slot: 'chip',
  color: 'red',
  // Effects to apply when slotted into a wire on equipped item
  statModifiers: {
    damageTypes: { kinetic: 5 },
    precision: 2
  },
  isDisassembleable: true,
  disassembleResults: [ { name: 'Scrap Metal', quantity: 1 } ],
  description: 'A prototype red chip that increases kinetic damage and precision when slotted.'
};
