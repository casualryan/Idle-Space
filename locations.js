const allLocations = [
    {
        name: "Testing Grounds",
        recommendedLevel: 10,
        enemies: [
            { name: "Big Bertha", spawnRate: 1, empoweredChance: 0 }
        ],
        numFights: 1,
        description: "A testing ground for new weapons and equipment.",
        locationCategory: "industrial",
        developerOnly: true
    },
    {
        name: "Scrap Intake Yard",
        recommendedLevel: 1,
        enemies: [
            { name: "Scrapmite Drone", spawnRate: 214, empoweredChance: 0 },
            { name: "Bent Service Crawler", spawnRate: 143, empoweredChance: 0 },
            { name: "Sparking Loader Pup", spawnRate: 142, empoweredChance: 0 },
            { name: "Junkyard Compactor", spawnRate: 1, empoweredChance: 0 }
        ],
        numFights: 4,
        description: "Broken machinery and scavenger pests provide starter salvage for early fabrication.",
        locationCategory: "industrial"
    },
    {
        name: "Rustbelt Service Tunnels",
        recommendedLevel: 6,
        enemies: [
            { name: "Rusted Maintenance Bot", spawnRate: 3, empoweredChance: 0.05 },
            { name: "Copperline Skitter", spawnRate: 3, empoweredChance: 0.05 },
            { name: "Utility Saw Drone", spawnRate: 2, empoweredChance: 0.05 },
            { name: "Leaking Filter Crawler", spawnRate: 2, empoweredChance: 0.05 },
            { name: "Tunnel Control Node", spawnRate: 1, empoweredChance: 0.05 }
        ],
        numFights: 5,
        description: "Corroded utility tunnels where iron and copper feeds become the first upgrade bottleneck.",
        locationCategory: "industrial"
    },
    {
        name: "Alloy Processing Floor",
        recommendedLevel: 11,
        enemies: [
            { name: "Alloy Worker Frame", spawnRate: 3, empoweredChance: 0.05 },
            { name: "Thermal Rivet Drone", spawnRate: 2, empoweredChance: 0.05 },
            { name: "Stabilizer Turret", spawnRate: 2, empoweredChance: 0.05 },
            { name: "Capacitor Wasp", spawnRate: 2, empoweredChance: 0.05 },
            { name: "Processing Floor Overseer", spawnRate: 1, empoweredChance: 0.05 }
        ],
        numFights: 5,
        description: "Active line machinery introduces titanium parts, power cells, and early elemental specialist drops.",
        locationCategory: "industrial"
    },
    {
        name: "Contaminated Fabrication Wing",
        recommendedLevel: 16,
        enemies: [
            { name: "Coolant Leak Sprayer", spawnRate: 2, empoweredChance: 0.08 },
            { name: "Acid Vat Crawler", spawnRate: 3, empoweredChance: 0.08 },
            { name: "Irradiated Sensor Husk", spawnRate: 2, empoweredChance: 0.08 },
            { name: "Flame Vent Drone", spawnRate: 2, empoweredChance: 0.08 },
            { name: "Containment Failure Unit", spawnRate: 1, empoweredChance: 0.08 }
        ],
        numFights: 5,
        description: "Leaking fab wings test chemical and elemental defenses while unlocking contamination materials.",
        locationCategory: "dangerous"
    },
    {
        name: "Blackened Transit Grid",
        recommendedLevel: 21,
        enemies: [
            { name: "Rail Spike Turret", spawnRate: 2, empoweredChance: 0.1 },
            { name: "Transit Saw Runner", spawnRate: 3, empoweredChance: 0.1 },
            { name: "Arc Rail Drone", spawnRate: 2, empoweredChance: 0.1 },
            { name: "Signal Jammer Node", spawnRate: 2, empoweredChance: 0.1 },
            { name: "Armored Transit Engine", spawnRate: 1, empoweredChance: 0.1 }
        ],
        numFights: 6,
        description: "Damaged rail lines filled with high-velocity drones and armored transit machinery.",
        locationCategory: "industrial"
    },
    {
        name: "Bio-Corrosion Research Block",
        recommendedLevel: 26,
        enemies: [
            { name: "Bio-Acid Spitter", spawnRate: 3, empoweredChance: 0.1 },
            { name: "Synthetic Marrow Crawler", spawnRate: 2, empoweredChance: 0.1 },
            { name: "Radium Needle Drone", spawnRate: 2, empoweredChance: 0.1 },
            { name: "Lab Defense Reclaimer", spawnRate: 2, empoweredChance: 0.1 },
            { name: "Bio-Corrosion Mass", spawnRate: 1, empoweredChance: 0.1 }
        ],
        numFights: 6,
        description: "Sealed labs with corrosive biochemistry and radiation waste shaping midgame material farms.",
        locationCategory: "dangerous"
    },
    {
        name: "Phase Assembly Spire",
        recommendedLevel: 31,
        enemies: [
            { name: "Phase Cutter Drone", spawnRate: 3, empoweredChance: 0.12 },
            { name: "Shielded Assembly Frame", spawnRate: 2, empoweredChance: 0.12 },
            { name: "Quantum Lens Turret", spawnRate: 2, empoweredChance: 0.12 },
            { name: "Neural Calibration Node", spawnRate: 2, empoweredChance: 0.12 },
            { name: "Phase Assembly Warden", spawnRate: 1, empoweredChance: 0.12 }
        ],
        numFights: 6,
        description: "Advanced phase machinery and precision systems push toward high-tech shielding and targeting gear.",
        locationCategory: "industrial"
    },
    {
        name: "Storm Furnace Complex",
        recommendedLevel: 36,
        enemies: [
            { name: "Furnace Spitter", spawnRate: 3, empoweredChance: 0.15 },
            { name: "Arcstorm Harvester", spawnRate: 3, empoweredChance: 0.15 },
            { name: "Overheated Servo Giant", spawnRate: 2, empoweredChance: 0.15 },
            { name: "Flux Burner Node", spawnRate: 2, empoweredChance: 0.15 },
            { name: "Storm Furnace Core", spawnRate: 1, empoweredChance: 0.15 }
        ],
        numFights: 7,
        description: "Overheated reactor corridors of pyro and electric threats with advanced power component drops.",
        locationCategory: "dangerous"
    },
    {
        name: "Isotope Waste Cathedral",
        recommendedLevel: 41,
        enemies: [
            { name: "Isotope Pilgrim Husk", spawnRate: 3, empoweredChance: 0.15 },
            { name: "Waste Choir Drone", spawnRate: 2, empoweredChance: 0.15 },
            { name: "Nanite Scavenger Cloud", spawnRate: 2, empoweredChance: 0.15 },
            { name: "Temporal Leak Sentinel", spawnRate: 2, empoweredChance: 0.15 },
            { name: "Cathedral Reactor Saint", spawnRate: 1, empoweredChance: 0.15 }
        ],
        numFights: 7,
        description: "A corrupted isotope cathedral where radiation and chemical hazards dominate late-game farming.",
        locationCategory: "dangerous"
    },
    {
        name: "Titan Foundry Depths",
        recommendedLevel: 46,
        enemies: [
            { name: "Titan Plate Bearer", spawnRate: 2, empoweredChance: 0.2 },
            { name: "Mass Driver Sentinel", spawnRate: 2, empoweredChance: 0.2 },
            { name: "Foundry Phase Guillotine", spawnRate: 2, empoweredChance: 0.2 },
            { name: "Flux-Forged Storm Engine", spawnRate: 2, empoweredChance: 0.2 },
            { name: "Containment Titan", spawnRate: 1, empoweredChance: 0.2 },
            { name: "Titan Foundry Heart", spawnRate: 1, empoweredChance: 0.2 }
        ],
        numFights: 8,
        description: "Apex baseline war-factory depths where titan-grade enemies drop final L46-50 progression materials.",
        locationCategory: "dangerous"
    }
];

const locations = allLocations.filter(location =>
    window.coreboundConfig?.developerMode || !location.developerOnly
);

// Example for adding more areas/enemies:
/*
{
    name: "Crystal Caverns",
    enemies: [
        { name: "Ice Elemental", spawnRate: 2, empoweredChance: 0.05 },
        { name: "Pyro Beetle", spawnRate: 1, empoweredChance: 0.02 }
    ],
    numFights: 6,
    description: "A cavern filled with rare minerals and dangerous elementals.",
    locationCategory: "wilderness"
}
*/
