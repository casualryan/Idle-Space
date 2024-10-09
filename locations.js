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
            { name: "Scorpionbot", spawnRate: 50},
            { name: "Cactibot", spawnRate: 30}, 
            { name: "Pyro Beetle", spawnRate: 20},
        ],
        description: "Scorpionbot (50%), Cactibot (30%), and Pyro Beetle (20%)."
    },
    {
        name: "Iron Mountains",
        enemies: [
            { name: "Steel Golem", spawnRate: 80},
        ],
        description: "Steel Golem (80%)."
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
