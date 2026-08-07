const recipes = [
    {
        name: "Makeshift Laser Sword",
        category: "Weapons",
        levelRequirement: 1,
        ingredients: {
            "Crystalized Light": 1,
            "Scrap Metal": 5,
            "Minor Electronic Circuit": 2,
            "Partical Fuser": 1
        }
    },
    {
        name: "Metal Carapace",
        category: "Armor",
        ingredients: {
            "Scrap Metal": 15,
            "Partical Fuser": 1
        }
    },
    {
        name: "Partical Fuser",
        category: "Material",
        ingredients: {
            "Scrap Metal": 20,
            "Unstable Photon": 4
        }
    },
    {
        name: "Reaction Enhancer",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 10,
            "Partical Fuser": 1
        },
        craftingTime: 5
    },
    {
        name: "Health Exchanger",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 10,
            "Partical Fuser": 1
        },
        craftingTime: 5
    },
    {
        name: "Kinetic Booster",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3
        }
    },
    {
        name: "Heavy Metal Boots",
        category: "Boots",
        ingredients: {
            "Scrap Metal": 5,
            "Partical Fuser": 1
        }
    },
    {
        name: "Scorpion Sword",
        category: "Weapons",
        ingredients: {
            "Metal Scorpion Fang": 1,
            "Scrap Metal": 5,
            "Minor Electronic Circuit": 2,
            "Partical Fuser": 1
        }
    },
    {
        name: "Fire Spewer Mk1",
        category: "Weapons",
        ingredients: {
            "Flame Shell": 2,
            "Pyro Core": 1,
            "Partical Fuser": 1,
            "Scrap Metal": 5
        }
    },
    {
        name: "Scrap Metal Boots",
        category: "Scrap Armor",
        ingredients: {
            "Scrap Metal": 4
        }
    },
    {
        name: "Scrap Metal Helmet",
        category: "Scrap Armor",
        ingredients: {
            "Scrap Metal": 8
        }
    },
    {
        name: "Scrap Metal Trousers",
        category: "Scrap Armor",
        ingredients: {
            "Scrap Metal": 8
        }
    },
    {
        name: "Scrap Chest Plate",
        category: "Scrap Armor",
        ingredients: {
            "Scrap Metal": 10
        }
    },
    {
        name: "Cryo Booster",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3,
            "Partical Fuser": 1
        }
    },
    {
        name: "Electric Booster",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3,
            "Partical Fuser": 1
        }
    },
    {
        name: "Slashing Booster",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3,
            "Partical Fuser": 1
        }
    },
    {
        name: "Chemical Booster",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3,
            "Partical Fuser": 1
        }
    },
    {
        name: "Radiation Booster",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3,
            "Partical Fuser": 1
        }
    },
    {
        name: "Health Module",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3,
            "Partical Fuser": 1
        }
    },
    {
        name: "Pyro Booster",
        category: "Bionics",
        ingredients: {
            "Scrap Metal": 3,
            "Partical Fuser": 1
        }
    }
];

const baselineArmorItems = [
    { name: "Patchwork Combat Vest", level: 3, category: "Armor" },
    { name: "Light Combat Vest", level: 5, category: "Armor" },
    { name: "Riveted Chest Plate", level: 8, category: "Armor" },
    { name: "Capacitor Harness", level: 10, category: "Armor" },
    { name: "Thermal Lined Chestpiece", level: 13, category: "Armor" },
    { name: "Steel Carapace", level: 16, category: "Armor" },
    { name: "Photon Guard Chestpiece", level: 18, category: "Armor" },
    { name: "Faraday Combat Harness", level: 21, category: "Armor" },
    { name: "Corrosion Guard Plate", level: 23, category: "Armor" },
    { name: "Reinforced Alloy Chest", level: 26, category: "Armor" },
    { name: "Barrier Reactor Plate", level: 28, category: "Armor" },
    { name: "Servo-Lined Chestpiece", level: 30, category: "Armor" },
    { name: "Biohazard Combat Shell", level: 33, category: "Armor" },
    { name: "Kinetic Plated Harness", level: 36, category: "Armor" },
    { name: "Phase Shield Harness", level: 38, category: "Armor" },
    { name: "Calibrated Reflex Armor", level: 40, category: "Armor" },
    { name: "Radiation Lock Harness", level: 43, category: "Armor" },
    { name: "Titan Carapace", level: 46, category: "Armor" },
    { name: "Aegis Reactor Shell", level: 48, category: "Armor" },
    { name: "Containment Carapace", level: 50, category: "Armor" },
    { name: "Stormproof Reactor Vest", level: 50, category: "Armor" },
    { name: "Patchwork Leg Guards", level: 4, category: "Armor" },
    { name: "Light Combat Leggings", level: 6, category: "Armor" },
    { name: "Riveted Shin Guards", level: 9, category: "Armor" },
    { name: "Capacitor Leg Harness", level: 11, category: "Armor" },
    { name: "Insulated Leg Wraps", level: 14, category: "Armor" },
    { name: "Steel Leg Carapace", level: 17, category: "Armor" },
    { name: "Photon Stride Guards", level: 19, category: "Armor" },
    { name: "Grounded Faraday Leggings", level: 22, category: "Armor" },
    { name: "Corrosion Guard Legplates", level: 24, category: "Armor" },
    { name: "Alloy Battle Greaves", level: 27, category: "Armor" },
    { name: "Barrier Strider Plates", level: 29, category: "Armor" },
    { name: "Servo-Assisted Legguards", level: 31, category: "Armor" },
    { name: "Biohazard Leg Shells", level: 34, category: "Armor" },
    { name: "Kinetic Stabilizer Greaves", level: 37, category: "Armor" },
    { name: "Phase-Step Leg Harness", level: 39, category: "Armor" },
    { name: "Reflex Servo Greaves", level: 41, category: "Armor" },
    { name: "Radiation Lock Legguards", level: 44, category: "Armor" },
    { name: "Titan Leg Carapace", level: 47, category: "Armor" },
    { name: "Aegis Strider Shells", level: 49, category: "Armor" },
    { name: "Containment Leg Carapace", level: 50, category: "Armor" },
    { name: "Stormground Reactor Greaves", level: 50, category: "Armor" },
    { name: "Patchwork Work Boots", level: 3, category: "Boots" },
    { name: "Light Combat Boots", level: 5, category: "Boots" },
    { name: "Riveted Iron Boots", level: 7, category: "Boots" },
    { name: "Grounding Boots", level: 10, category: "Boots" },
    { name: "Capacitor Soles", level: 12, category: "Boots" },
    { name: "Chem-Sealed Boots", level: 15, category: "Boots" },
    { name: "Steel-Toed Greaves", level: 17, category: "Boots" },
    { name: "Photon-Tread Boots", level: 19, category: "Boots" },
    { name: "Faraday Striders", level: 22, category: "Boots" },
    { name: "Corrosion Guard Boots", level: 24, category: "Boots" },
    { name: "Alloy Plated Boots", level: 26, category: "Boots" },
    { name: "Servo-Step Boots", level: 29, category: "Boots" },
    { name: "Barrier-Tread Boots", level: 31, category: "Boots" },
    { name: "Biohazard Tread Boots", level: 34, category: "Boots" },
    { name: "Kinetic Anchor Boots", level: 36, category: "Boots" },
    { name: "Phase-Step Boots", level: 39, category: "Boots" },
    { name: "Reflex Drive Boots", level: 41, category: "Boots" },
    { name: "Radiation Lock Boots", level: 44, category: "Boots" },
    { name: "Titan-Stomp Boots", level: 46, category: "Boots" },
    { name: "Aegis-Tread Boots", level: 48, category: "Boots" },
    { name: "Containment Lock Boots", level: 50, category: "Boots" },
    { name: "Stormstep Reactor Boots", level: 50, category: "Boots" },
    { name: "Cracked Visor Helm", level: 3, category: "Helmets" },
    { name: "Patchwork Combat Helm", level: 5, category: "Helmets" },
    { name: "Riveted Iron Helmet", level: 8, category: "Helmets" },
    { name: "Filtered Work Helm", level: 10, category: "Helmets" },
    { name: "Capacitor Crown", level: 12, category: "Helmets" },
    { name: "Thermal Visor Helm", level: 15, category: "Helmets" },
    { name: "Steel Sensor Helm", level: 17, category: "Helmets" },
    { name: "Photon Guard Visor", level: 19, category: "Helmets" },
    { name: "Faraday Command Helm", level: 22, category: "Helmets" },
    { name: "Corrosion Filter Mask", level: 24, category: "Helmets" },
    { name: "Alloy Battle Helm", level: 27, category: "Helmets" },
    { name: "Targeting Array Helm", level: 29, category: "Helmets" },
    { name: "Barrier Visor Helm", level: 31, category: "Helmets" },
    { name: "Biohazard Rebreather Helm", level: 34, category: "Helmets" },
    { name: "Kinetic Bulwark Helm", level: 36, category: "Helmets" },
    { name: "Phase-Sight Helmet", level: 39, category: "Helmets" },
    { name: "Neural Targeting Crown", level: 41, category: "Helmets" },
    { name: "Radiation Lock Mask", level: 44, category: "Helmets" },
    { name: "Titan War Helm", level: 46, category: "Helmets" },
    { name: "Aegis Command Visor", level: 48, category: "Helmets" },
    { name: "Containment Rebreather Helm", level: 50, category: "Helmets" },
    { name: "Stormsight Reactor Helm", level: 50, category: "Helmets" },
    { name: "Scrap Metal Gloves", level: 1, category: "Gloves" },
    { name: "Patchwork Work Gloves", level: 3, category: "Gloves" },
    { name: "Light Combat Gloves", level: 5, category: "Gloves" },
    { name: "Riveted Iron Gauntlets", level: 7, category: "Gloves" },
    { name: "Grounding Grips", level: 10, category: "Gloves" },
    { name: "Capacitor Handwraps", level: 12, category: "Gloves" },
    { name: "Chem-Sealed Gloves", level: 15, category: "Gloves" },
    { name: "Steel Knuckle Plates", level: 17, category: "Gloves" },
    { name: "Photon Strike Gloves", level: 19, category: "Gloves" },
    { name: "Faraday Grip Gauntlets", level: 22, category: "Gloves" },
    { name: "Corrosion Guard Gloves", level: 24, category: "Gloves" },
    { name: "Alloy Plated Gauntlets", level: 26, category: "Gloves" },
    { name: "Servo-Assist Gloves", level: 29, category: "Gloves" },
    { name: "Barrier Grip Gauntlets", level: 31, category: "Gloves" },
    { name: "Biohazard Hand Shells", level: 34, category: "Gloves" },
    { name: "Kinetic Anchor Gloves", level: 36, category: "Gloves" },
    { name: "Phase-Step Gloves", level: 39, category: "Gloves" },
    { name: "Reflex Drive Gauntlets", level: 41, category: "Gloves" },
    { name: "Radiation Lock Gloves", level: 44, category: "Gloves" },
    { name: "Titan Grip Gauntlets", level: 46, category: "Gloves" },
    { name: "Aegis Hand Plates", level: 48, category: "Gloves" },
    { name: "Containment Lock Gloves", level: 50, category: "Gloves" },
    { name: "Stormstep Reactor Gloves", level: 50, category: "Gloves" }
];

const baselineWeaponItems = [
    { name: "Bent Impact Rod", level: 1, family: "kinetic" },
    { name: "Scrap Maul", level: 5, family: "kinetic" },
    { name: "Pneumatic Hammer", level: 11, family: "kinetic" },
    { name: "Rail Spike Launcher", level: 18, family: "kinetic" },
    { name: "Hydraulic Crusher", level: 27, family: "kinetic" },
    { name: "Mass Driver Club", level: 36, family: "kinetic" },
    { name: "Gravity Piston Maul", level: 48, family: "kinetic" },
    { name: "Jagged Scrap Blade", level: 1, family: "slashing" },
    { name: "Utility Cutter", level: 4, family: "slashing" },
    { name: "Serrated Combat Knife", level: 9, family: "slashing" },
    { name: "Phase Edge Sword", level: 16, family: "slashing" },
    { name: "Monowire Saber", level: 25, family: "slashing" },
    { name: "Vibrocleaver", level: 34, family: "slashing" },
    { name: "Nanofiber Execution Blade", level: 47, family: "slashing" },
    { name: "Cracked Heat Pistol", level: 2, family: "pyro" },
    { name: "Spark Spitter", level: 6, family: "pyro" },
    { name: "Thermal Carbine", level: 12, family: "pyro" },
    { name: "Flame Projector Mk1", level: 20, family: "pyro" },
    { name: "Combustion Rifle", level: 29, family: "pyro" },
    { name: "Furnace Lance", level: 38, family: "pyro" },
    { name: "Starfire Incinerator", level: 49, family: "pyro" },
    { name: "Leaking Coolant Sprayer", level: 3, family: "cryo" },
    { name: "Frostbite Wand", level: 7, family: "cryo" },
    { name: "Cryo Pistol", level: 13, family: "cryo" },
    { name: "Refrigerant Cannon", level: 21, family: "cryo" },
    { name: "Glacier Beam Rifle", level: 30, family: "cryo" },
    { name: "Absolute-Zero Projector", level: 39, family: "cryo" },
    { name: "Entropy Freeze Cannon", level: 50, family: "cryo" },
    { name: "Faulty Shock Baton", level: 2, family: "electric" },
    { name: "Arc Pistol", level: 6, family: "electric" },
    { name: "Static Coil Rod", level: 12, family: "electric" },
    { name: "Ion Repeater", level: 19, family: "electric" },
    { name: "Lightning Carbine", level: 28, family: "electric" },
    { name: "Storm Capacitor Rifle", level: 37, family: "electric" },
    { name: "Arcstorm Conductor", level: 49, family: "electric" },
    { name: "Rusted Acid Shiv", level: 3, family: "chemical" },
    { name: "Leaking Chem Pistol", level: 8, family: "chemical" },
    { name: "Toxin Injector Blade", level: 14, family: "chemical" },
    { name: "Acid Sprayer", level: 22, family: "chemical" },
    { name: "Dissolver Carbine", level: 31, family: "chemical" },
    { name: "Caustic Lance", level: 40, family: "chemical" },
    { name: "Molecular Dissolution Rifle", level: 50, family: "chemical" },
    { name: "Cracked Isotope Rod", level: 5, family: "radiation" },
    { name: "Irradiated Needle Pistol", level: 10, family: "radiation" },
    { name: "Gamma Emitter", level: 17, family: "radiation" },
    { name: "Radium Carbine", level: 24, family: "radiation" },
    { name: "Isotope Beam Staff", level: 32, family: "radiation" },
    { name: "Reactor Leak Cannon", level: 42, family: "radiation" },
    { name: "Singularity Irradiator", level: 50, family: "radiation" }
];

const baselineOffHandItems = [
    { name: "Bent Scrap Buckler", level: 1 },
    { name: "Braced Wrist Plate", level: 4 },
    { name: "Riveted Guard Plate", level: 8 },
    { name: "Kinetic Counterweight", level: 13 },
    { name: "Impact Stabilizer", level: 19 },
    { name: "Alloy Guard Shield", level: 26 },
    { name: "Mass-Balance Core", level: 35 },
    { name: "Titan Brace Shield", level: 46 },
    { name: "Scrap Parrying Hook", level: 3 },
    { name: "Utility Edge Guard", level: 7 },
    { name: "Serrated Offhand Guard", level: 12 },
    { name: "Phase Parry Plate", level: 21 },
    { name: "Monowire Control Bracer", level: 31 },
    { name: "Nanofiber Parry Frame", level: 43 },
    { name: "Charred Heat Sink", level: 2 },
    { name: "Thermal Regulator Plate", level: 6 },
    { name: "Ember Control Core", level: 11 },
    { name: "Flame Baffle Shield", level: 18 },
    { name: "Combustion Stabilizer", level: 28 },
    { name: "Furnace Guard Core", level: 38 },
    { name: "Starfire Heat Sink", level: 49 },
    { name: "Coolant Wrist Canister", level: 3 },
    { name: "Frost-Lined Guard", level: 9 },
    { name: "Cryo Regulator Core", level: 15 },
    { name: "Refrigerant Shield Plate", level: 24 },
    { name: "Glacier Control Frame", level: 34 },
    { name: "Entropy Sink Shield", level: 47 },
    { name: "Faulty Grounding Coil", level: 2 },
    { name: "Static Guard Plate", level: 6 },
    { name: "Arc Control Bracer", level: 12 },
    { name: "Ion Shield Node", level: 20 },
    { name: "Lightning Stabilizer", level: 29 },
    { name: "Storm Capacitor Shield", level: 39 },
    { name: "Arcstorm Command Core", level: 50 },
    { name: "Leaking Chem Guard", level: 4 },
    { name: "Acid-Sealed Plate", level: 10 },
    { name: "Toxin Regulator Bracer", level: 16 },
    { name: "Corrosion Baffle Shield", level: 23 },
    { name: "Dissolver Control Core", level: 33 },
    { name: "Caustic Guard Frame", level: 42 },
    { name: "Molecular Sealant Shield", level: 50 },
    { name: "Cracked Isotope Plate", level: 5 },
    { name: "Rad-Sealed Buckler", level: 11 },
    { name: "Gamma Control Bracer", level: 18 },
    { name: "Irradiation Dampener", level: 25 },
    { name: "Isotope Stabilizer Core", level: 32 },
    { name: "Reactor Leak Shield", level: 41 },
    { name: "Singularity Dampening Frame", level: 50 },
    { name: "Patchwork Guard Frame", level: 5 },
    { name: "Composite Utility Shield", level: 14 },
    { name: "Adaptive Guard Core", level: 27 },
    { name: "Layered Combat Focus", level: 37 },
    { name: "Omni-Resonant Shield Frame", level: 48 }
];

function getLevelBand(level) {
    if (level <= 5) return 1;
    if (level <= 10) return 2;
    if (level <= 20) return 3;
    if (level <= 30) return 4;
    if (level <= 40) return 5;
    return 6;
}

function addIngredient(ingredients, name, quantity) {
    if (quantity <= 0) return;
    ingredients[name] = (ingredients[name] || 0) + quantity;
}

function inferTheme(name) {
    const lower = name.toLowerCase();
    if (/(rad|radiation|isotope|gamma|irradiat|reactor leak|containment|singularity)/.test(lower)) return "radiation";
    if (/(chem|acid|toxin|corrosion|biohazard|dissolver|molecular|sealant|caustic)/.test(lower)) return "chemical";
    if (/(cryo|frost|coolant|refrigerant|glacier|entropy)/.test(lower)) return "cryo";
    if (/(arc|shock|electric|lightning|faraday|storm|ion|static|grounding|capacitor)/.test(lower)) return "electric";
    if (/(pyro|heat|thermal|flame|furnace|starfire|ember|photon)/.test(lower)) return "pyro";
    if (/(phase|monowire|nanofiber|serrated|slashing|blade|parry)/.test(lower)) return "slashing";
    if (/(target|sensor|visor|neural|reflex|adaptive|omni|composite|focus)/.test(lower)) return "utility";
    return "physical";
}

function addBandCore(ingredients, band, domain) {
    if (band === 1) {
        addIngredient(ingredients, "Scrap Metal", domain === "armor" ? 3 : 2);
        addIngredient(ingredients, "Metal Fasteners", 1);
        if (domain !== "armor") addIngredient(ingredients, "Wire Bundle", 1);
        return;
    }

    if (band === 2) {
        addIngredient(ingredients, "Scrap Metal", domain === "armor" ? 5 : 4);
        addIngredient(ingredients, "Iron Ore", 2);
        addIngredient(ingredients, "Copper Ore", 1);
        addIngredient(ingredients, "Metal Fasteners", 1);
        addIngredient(ingredients, "Basic Servo", 1);
        return;
    }

    if (band === 3) {
        addIngredient(ingredients, "Iron Ore", domain === "armor" ? 4 : 3);
        addIngredient(ingredients, "Copper Ore", 3);
        addIngredient(ingredients, "Titanium", domain === "armor" ? 3 : 2);
        addIngredient(ingredients, "Minor Electronic Circuit", 2);
        addIngredient(ingredients, "Small Power Cell", 1);
        addIngredient(ingredients, "Copper Coil", 1);
        addIngredient(ingredients, "Stabilizer", 1);
        return;
    }

    if (band === 4) {
        addIngredient(ingredients, "Titanium", 6);
        addIngredient(ingredients, "Titanium Plating", 3);
        addIngredient(ingredients, "Advanced Servo", domain === "armor" ? 2 : 3);
        addIngredient(ingredients, "Targeting Module", 1);
        addIngredient(ingredients, "Power Converter", 2);
        addIngredient(ingredients, "Neural Processor", 1);
        return;
    }

    if (band === 5) {
        addIngredient(ingredients, "Quantum Capacitor", 3);
        addIngredient(ingredients, "High-Density Power Cell", 3);
        addIngredient(ingredients, "Neural Network Module", 2);
        addIngredient(ingredients, "Phase Converter", 2);
        addIngredient(ingredients, "Advanced Servo", 3);
        addIngredient(ingredients, "Power Converter", 2);
        if (domain !== "armor") addIngredient(ingredients, "AI Core Fragment", 1);
        return;
    }

    addIngredient(ingredients, "Quantum Core", 3);
    addIngredient(ingredients, "Temporal Stabilizer", 2);
    addIngredient(ingredients, "Nanite Cluster", 3);
    addIngredient(ingredients, "Flux Crystal", 3);
    addIngredient(ingredients, "Phase Converter", 3);
    addIngredient(ingredients, "AI Core Fragment", 2);
    addIngredient(ingredients, "Synthetic Biofluid", 2);
    addIngredient(ingredients, "Neural Network Module", 3);
    addIngredient(ingredients, "High-Density Power Cell", 3);
    addIngredient(ingredients, "Quantum Capacitor", 3);
}

function addThemeIngredients(ingredients, band, theme, domain, family, level) {
    if (family === "kinetic") {
        if (level >= 10) {
            addIngredient(ingredients, band <= 2 ? "Pristine Metal Plate" : "Titanium Plating", band <= 3 ? 1 : 2);
            addIngredient(ingredients, "Advanced Servo", band >= 4 ? 2 : 1);
        } else if (band > 2) {
            addIngredient(ingredients, "Titanium Plating", band <= 3 ? 1 : 2);
        }
        if (band >= 6) addIngredient(ingredients, "Quantum Core", 2);
        return;
    }

    if (family === "slashing") {
        addIngredient(ingredients, "Titanium Thorn", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Metal Scorpion Fang", band >= 3 ? 1 : 0);
        addIngredient(ingredients, "Phase Converter", band >= 4 ? 2 : 1);
        if (band >= 6) addIngredient(ingredients, "Nanite Cluster", 2);
        return;
    }

    if (family === "pyro") {
        addIngredient(ingredients, "Flame Shell", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Pyro Core", band >= 3 ? 1 : 0);
        addIngredient(ingredients, "High-Density Power Cell", band >= 5 ? 2 : 1);
        if (band >= 6) addIngredient(ingredients, "Flux Crystal", 2);
        return;
    }

    if (family === "cryo") {
        addIngredient(ingredients, "Stabilizer", band <= 3 ? 2 : 3);
        addIngredient(ingredients, "Power Converter", band >= 3 ? 2 : 1);
        addIngredient(ingredients, "Quantum Capacitor", band >= 5 ? 2 : 1);
        if (band >= 6) addIngredient(ingredients, "Temporal Stabilizer", 2);
        return;
    }

    if (family === "electric") {
        addIngredient(ingredients, "Copper Coil", band <= 3 ? 2 : 3);
        addIngredient(ingredients, band <= 3 ? "Small Power Cell" : "High-Density Power Cell", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Power Converter", band >= 3 ? 2 : 1);
        addIngredient(ingredients, "Quantum Capacitor", band >= 5 ? 2 : 1);
        return;
    }

    if (family === "chemical") {
        addIngredient(ingredients, "Synthetic Poison Gland", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Synthetic Biofluid", band >= 4 ? 2 : 1);
        addIngredient(ingredients, "Power Converter", band >= 3 ? 2 : 1);
        if (band >= 6) addIngredient(ingredients, "Nanite Cluster", 2);
        return;
    }

    if (family === "radiation") {
        addIngredient(ingredients, "Unstable Photon", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Crystalized Light", band >= 3 ? 1 : 2);
        addIngredient(ingredients, "AI Core Fragment", band >= 4 ? 2 : 1);
        if (band >= 6) {
            addIngredient(ingredients, "Quantum Core", 2);
            addIngredient(ingredients, "Temporal Stabilizer", 2);
        }
        return;
    }

    if (theme === "radiation") {
        addIngredient(ingredients, "Unstable Photon", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Crystalized Light", band >= 3 ? 1 : 2);
        addIngredient(ingredients, "AI Core Fragment", band >= 4 ? 1 : 0);
        if (band >= 5) addIngredient(ingredients, "Neural Network Module", 1);
        return;
    }

    if (theme === "chemical") {
        addIngredient(ingredients, "Synthetic Poison Gland", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Synthetic Biofluid", band >= 4 ? 1 : 2);
        if (band >= 5) addIngredient(ingredients, "Nanite Cluster", 1);
        return;
    }

    if (theme === "cryo") {
        addIngredient(ingredients, "Stabilizer", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Power Converter", band >= 3 ? 1 : 2);
        if (band >= 6) addIngredient(ingredients, "Temporal Stabilizer", 1);
        return;
    }

    if (theme === "electric") {
        addIngredient(ingredients, "Copper Coil", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Power Converter", band >= 3 ? 1 : 2);
        if (band >= 5) addIngredient(ingredients, "Quantum Capacitor", 1);
        return;
    }

    if (theme === "pyro") {
        addIngredient(ingredients, "Flame Shell", band <= 3 ? 1 : 2);
        if (band >= 3) addIngredient(ingredients, "Pyro Core", 1);
        if (band >= 6) addIngredient(ingredients, "Flux Crystal", 1);
        return;
    }

    if (theme === "slashing") {
        addIngredient(ingredients, "Titanium Thorn", band <= 3 ? 1 : 2);
        if (band >= 4) addIngredient(ingredients, "Phase Converter", 1);
        return;
    }

    if (theme === "utility") {
        addIngredient(ingredients, "Basic Sensor Array", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Targeting Module", band >= 4 ? 2 : 1);
        if (band >= 5) addIngredient(ingredients, "Neural Network Module", 1);
        return;
    }

    if (level >= 10) {
        addIngredient(ingredients, "Pristine Metal Plate", band <= 3 ? 1 : 2);
    }
    if (band >= 4) addIngredient(ingredients, "Titanium Plating", 1);
}

function addSlotIngredients(ingredients, band, category, level) {
    if (category === "Boots") {
        addIngredient(ingredients, "Basic Servo", band <= 3 ? 1 : 0);
        addIngredient(ingredients, "Advanced Servo", level >= 10 && band >= 4 ? 1 : 0);
        addIngredient(ingredients, "Stabilizer", band >= 3 ? 1 : 0);
    } else if (category === "Helmets") {
        addIngredient(ingredients, "Basic Sensor Array", band <= 3 ? 1 : 0);
        addIngredient(ingredients, "Targeting Module", band >= 4 ? 1 : 0);
        addIngredient(ingredients, "Neural Processor", band >= 4 ? 1 : 0);
    } else if (category === "Gloves") {
        addIngredient(ingredients, "Wire Bundle", 1);
        addIngredient(ingredients, "Metal Fasteners", band <= 4 ? 1 : 0);
        addIngredient(ingredients, "Basic Servo", band >= 2 && band <= 4 ? 1 : 0);
        addIngredient(ingredients, "Advanced Servo", level >= 10 && band >= 5 ? 1 : 0);
    } else if (category === "Shields") {
        addIngredient(ingredients, band <= 3 ? "Small Power Cell" : "High-Density Power Cell", band <= 3 ? 1 : 2);
        addIngredient(ingredients, "Power Converter", band >= 3 ? 1 : 2);
        addIngredient(ingredients, "Stabilizer", 1);
    } else {
        addIngredient(ingredients, "Titanium Plating", band >= 3 ? 1 : 0);
    }
}

function createProgressionRecipe({ name, level, category, family }) {
    const band = getLevelBand(level);
    const theme = inferTheme(name);
    const domain = category === "Weapons" ? "weapon" : "armor";
    const ingredients = {};

    addBandCore(ingredients, band, domain);
    addSlotIngredients(ingredients, band, category, level);
    addThemeIngredients(ingredients, band, theme, domain, family, level);

    return {
        name,
        category,
        ingredients,
        damageFocus: family ? family : undefined
    };
}

const baselineRecipes = [
    ...baselineArmorItems.map(item => createProgressionRecipe(item)),
    ...baselineWeaponItems.map(item => createProgressionRecipe({ ...item, category: "Weapons" })),
    ...baselineOffHandItems.map(item => createProgressionRecipe({ ...item, category: "Shields" }))
];

const LEGACY_RECIPE_DAMAGE_FOCUS = {
    "Makeshift Laser Sword": "radiation",
    "Scorpion Sword": "slashing",
    "Fire Spewer Mk1": "pyro"
};

function normalizeDamageFocus(rawFocus) {
    if (!rawFocus) return null;
    const normalized = rawFocus.toLowerCase();
    if (normalized === "corrosive") return "chemical";
    if (normalized === "utility" || normalized === "physical") return "kinetic";

    const allowed = [
        "kinetic",
        "slashing",
        "pyro",
        "cryo",
        "electric",
        "chemical",
        "radiation"
    ];
    return allowed.includes(normalized) ? normalized : null;
}

function inferDamageFocusByName(name) {
    const inferred = inferTheme(name);
    return normalizeDamageFocus(inferred) || "kinetic";
}

const recipeByName = new Map();
for (const recipe of [...recipes, ...baselineRecipes]) {
    const mergedRecipe = { ...recipe };
    if (mergedRecipe.category === "Weapons" || mergedRecipe.category === "Shields") {
        const legacyFocus = LEGACY_RECIPE_DAMAGE_FOCUS[mergedRecipe.name];
        mergedRecipe.damageFocus = normalizeDamageFocus(mergedRecipe.damageFocus)
            || normalizeDamageFocus(legacyFocus)
            || inferDamageFocusByName(mergedRecipe.name);
    }
    recipeByName.set(mergedRecipe.name, mergedRecipe);
}

window.recipes = Array.from(recipeByName.values());

