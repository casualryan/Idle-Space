const locations = [
    {
        name: "Metal Forest",
        enemies: [
            { name: "Spiderbot", spawnRate: 80},
            { name: "Roachbot", spawnRate: 19},
            { name: "Electro Wasp", spawnRate: 1},
        ],
        description: "Spiderbot (80%), Roachbot (19%), and Electro Wasp (1%). Mostly Kinetic damage."
    },
    {
        name: "Arid Scrapland",
        enemies: [
            { name: "Scorpionbot", spawnRate: 0.5},
            { name: "Cactibot", spawnRate: 0.3}, 
            { name: "Pyro Beetle", spawnRate: 0.2},
        ],
        description: "Scorpionbot, Cactibot, and Pyro Beetle."
    },
    {
        name: "Iron Mountains",
        enemies: [
            { name: "Steel Golem", spawnRate: 0.8},
        ],
        description: "Towering mountains rich in minerals and home to formidable foes."
    },
    {
        name: "Blackwood Haven",
        enemies: [
            { name: "Knight O'Hare", spawnRate: 0.5},
        ],
        description: "The Steel City, known for nothing but despair."
    },
    // Add more locations up to 20 as needed
];
