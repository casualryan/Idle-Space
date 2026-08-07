// Gathering Activities Data
const gatheringActivities = [
    // Mining Activities
    {
        name: "Collect Scrap Metal",
        skillType: "Mining",
        time: 5,
        item: {
            name: "Scrap Metal",
            quantity: 1
        },
        experience: 5,
        requiredLevel: 1,
        rareFind: {
            name: "Pristine Metal Plate",
            quantity: 1
        }
    },
    {
        name: "Mine Iron Ore",
        skillType: "Mining",
        time: 8,
        item: {
            name: "Iron Ore",
            quantity: 1
        },
        experience: 8,
        requiredLevel: 3,
        rareFind: {
            name: "Pure Iron Nugget",
            quantity: 1
        }
    },
    {
        name: "Mine Copper Ore",
        skillType: "Mining",
        time: 10,
        item: {
            name: "Copper Ore",
            quantity: 1
        },
        experience: 10,
        requiredLevel: 5,
        rareFind: {
            name: "Copper Vein Sample",
            quantity: 1
        }
    },
    {
        name: "Extract Titanium",
        skillType: "Mining",
        time: 15,
        item: {
            name: "Titanium",
            quantity: 1
        },
        experience: 15,
        requiredLevel: 10,
        rareFind: {
            name: "Titanium Alloy Fragment",
            quantity: 1
        }
    },
    {
        name: "Salvage Wire Bundles",
        skillType: "Mining",
        time: 6,
        item: {
            name: "Wire Bundle",
            quantity: 1
        },
        experience: 6,
        requiredLevel: 2
    },
    {
        name: "Break Down Fastener Plates",
        skillType: "Mining",
        time: 7,
        item: {
            name: "Metal Fasteners",
            quantity: 1
        },
        experience: 7,
        requiredLevel: 4
    },
    {
        name: "Extract Stabilizer Ore",
        skillType: "Mining",
        time: 10,
        item: {
            name: "Stabilizer",
            quantity: 1
        },
        experience: 10,
        requiredLevel: 8
    },
    {
        name: "Harvest Titanium Plating",
        skillType: "Mining",
        time: 14,
        item: {
            name: "Titanium Plating",
            quantity: 1
        },
        experience: 14,
        requiredLevel: 16
    },
    {
        name: "Extract Quantum Fragments",
        skillType: "Mining",
        time: 18,
        item: {
            name: "Quantum Capacitor",
            quantity: 1
        },
        experience: 18,
        requiredLevel: 24
    },
    
    // Foraging Activities - for future implementation
    {
        name: "Gather Plants",
        skillType: "Foraging",
        time: 6,
        item: {
            name: "Medicinal Plants",
            quantity: 1
        },
        experience: 6,
        requiredLevel: 1,
        rareFind: {
            name: "Rare Herb",
            quantity: 1
        }
    },
    
    // Salvaging Activities - for future implementation
    {
        name: "Salvage Electronics",
        skillType: "Salvaging",
        time: 7,
        item: {
            name: "Electronic Parts",
            quantity: 1
        },
        experience: 7,
        requiredLevel: 1,
        rareFind: {
            name: "Quantum Processor",
            quantity: 1
        }
    }
]; 