const ZONE_POOL_CONFIG = {
    1: { primary: 'z1Salvage', secondary: 'z1Circuits', maxTier: 3 },
    2: { primary: 'z2Ore', secondary: 'z2Utility', maxTier: 3 },
    3: { primary: 'z3Alloy', secondary: 'z3Energy', maxTier: 4 },
    4: { primary: 'z4Contamination', secondary: 'z4Hazard', maxTier: 4 },
    5: { primary: 'z5Transit', secondary: 'z5Targeting', maxTier: 5 },
    6: { primary: 'z6BioCorrosion', secondary: 'z6Research', maxTier: 5 },
    7: { primary: 'z7Phase', secondary: 'z7Spire', maxTier: 6 },
    8: { primary: 'z8Storm', secondary: 'z8Furnace', maxTier: 6 },
    9: { primary: 'z9Isotope', secondary: 'z9Cathedral', maxTier: 6 },
    10: { primary: 'z10Titan', secondary: 'z10Core', maxTier: 6 }
};

// Area-level pacing correction after simulating both entry-level and
// end-of-band crafted loadouts through complete delves. These multipliers
// smooth abrupt gear breakpoints without flattening enemy archetypes.
const ZONE_COMBAT_TUNING = {
    1: { health: 1, damage: 1 },
    2: { health: 1, damage: 1 },
    3: { health: 1, damage: 1 },
    4: { health: 0.85, damage: 0.85 },
    5: { health: 1, damage: 1.15 },
    6: { health: 1, damage: 1.05 },
    7: { health: 1, damage: 1.25 },
    8: { health: 0.7, damage: 0.85 },
    9: { health: 0.8, damage: 1.35 },
    10: { health: 0.65, damage: 0.85 }
};

const BLUEPRINTS = [
    { id: 'cb_scrapmite_drone', name: 'Scrapmite Drone', level: 1, zone: 1, damageType: 'kinetic', archetype: 'swarm' },
    { id: 'cb_bent_service_crawler', name: 'Bent Service Crawler', level: 2, zone: 1, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_sparking_loader_pup', name: 'Sparking Loader Pup', level: 3, zone: 1, damageType: 'electric', archetype: 'swarm' },
    { id: 'cb_junkyard_compactor', name: 'Junkyard Compactor', level: 5, zone: 1, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_rusted_maintenance_bot', name: 'Rusted Maintenance Bot', level: 6, zone: 2, damageType: 'kinetic', archetype: 'balanced' },
    { id: 'cb_copperline_skitter', name: 'Copperline Skitter', level: 7, zone: 2, damageType: 'electric', archetype: 'swarm' },
    { id: 'cb_utility_saw_drone', name: 'Utility Saw Drone', level: 8, zone: 2, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_leaking_filter_crawler', name: 'Leaking Filter Crawler', level: 9, zone: 2, damageType: 'corrosive', archetype: 'balanced' },
    { id: 'cb_tunnel_control_node', name: 'Tunnel Control Node', level: 10, zone: 2, damageType: 'electric', archetype: 'shield' },
    { id: 'cb_alloy_worker_frame', name: 'Alloy Worker Frame', level: 11, zone: 3, damageType: 'kinetic', archetype: 'balanced' },
    { id: 'cb_thermal_rivet_drone', name: 'Thermal Rivet Drone', level: 12, zone: 3, damageType: 'pyro', archetype: 'balanced' },
    { id: 'cb_stabilizer_turret', name: 'Stabilizer Turret', level: 13, zone: 3, damageType: 'kinetic', archetype: 'sniper' },
    { id: 'cb_capacitor_wasp', name: 'Capacitor Wasp', level: 14, zone: 3, damageType: 'electric', archetype: 'swarm' },
    { id: 'cb_processing_floor_overseer', name: 'Processing Floor Overseer', level: 15, zone: 3, damageType: 'slashing', archetype: 'heavy' },
    { id: 'cb_coolant_leak_sprayer', name: 'Coolant Leak Sprayer', level: 16, zone: 4, damageType: 'cryo', archetype: 'balanced' },
    { id: 'cb_acid_vat_crawler', name: 'Acid Vat Crawler', level: 17, zone: 4, damageType: 'corrosive', archetype: 'balanced' },
    { id: 'cb_irradiated_sensor_husk', name: 'Irradiated Sensor Husk', level: 18, zone: 4, damageType: 'radiation', archetype: 'sniper' },
    { id: 'cb_flame_vent_drone', name: 'Flame Vent Drone', level: 19, zone: 4, damageType: 'pyro', archetype: 'swarm' },
    { id: 'cb_containment_failure_unit', name: 'Containment Failure Unit', level: 20, zone: 4, damageType: 'corrosive', archetype: 'shield' },
    { id: 'cb_rail_spike_turret', name: 'Rail Spike Turret', level: 21, zone: 5, damageType: 'kinetic', archetype: 'sniper' },
    { id: 'cb_transit_saw_runner', name: 'Transit Saw Runner', level: 22, zone: 5, damageType: 'slashing', archetype: 'swarm' },
    { id: 'cb_arc_rail_drone', name: 'Arc Rail Drone', level: 23, zone: 5, damageType: 'electric', archetype: 'balanced' },
    { id: 'cb_signal_jammer_node', name: 'Signal Jammer Node', level: 24, zone: 5, damageType: 'electric', archetype: 'shield' },
    { id: 'cb_armored_transit_engine', name: 'Armored Transit Engine', level: 25, zone: 5, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_bio_acid_spitter', name: 'Bio-Acid Spitter', level: 26, zone: 6, damageType: 'corrosive', archetype: 'balanced' },
    { id: 'cb_synthetic_marrow_crawler', name: 'Synthetic Marrow Crawler', level: 27, zone: 6, damageType: 'corrosive', archetype: 'heavy' },
    { id: 'cb_radium_needle_drone', name: 'Radium Needle Drone', level: 28, zone: 6, damageType: 'radiation', archetype: 'sniper' },
    { id: 'cb_lab_defense_reclaimer', name: 'Lab Defense Reclaimer', level: 29, zone: 6, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_bio_corrosion_mass', name: 'Bio-Corrosion Mass', level: 30, zone: 6, damageType: 'corrosive', archetype: 'heavy' },
    { id: 'cb_phase_cutter_drone', name: 'Phase Cutter Drone', level: 31, zone: 7, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_shielded_assembly_frame', name: 'Shielded Assembly Frame', level: 32, zone: 7, damageType: 'kinetic', archetype: 'shield' },
    { id: 'cb_quantum_lens_turret', name: 'Quantum Lens Turret', level: 33, zone: 7, damageType: 'electric', archetype: 'sniper' },
    { id: 'cb_neural_calibration_node', name: 'Neural Calibration Node', level: 34, zone: 7, damageType: 'radiation', archetype: 'shield' },
    { id: 'cb_phase_assembly_warden', name: 'Phase Assembly Warden', level: 35, zone: 7, damageType: 'slashing', archetype: 'heavy' },
    { id: 'cb_furnace_spitter', name: 'Furnace Spitter', level: 36, zone: 8, damageType: 'pyro', archetype: 'balanced' },
    { id: 'cb_arcstorm_harvester', name: 'Arcstorm Harvester', level: 37, zone: 8, damageType: 'electric', archetype: 'balanced' },
    { id: 'cb_overheated_servo_giant', name: 'Overheated Servo Giant', level: 38, zone: 8, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_flux_burner_node', name: 'Flux Burner Node', level: 39, zone: 8, damageType: 'pyro', archetype: 'shield' },
    { id: 'cb_storm_furnace_core', name: 'Storm Furnace Core', level: 40, zone: 8, damageType: 'electric', archetype: 'heavy' },
    { id: 'cb_isotope_pilgrim_husk', name: 'Isotope Pilgrim Husk', level: 41, zone: 9, damageType: 'radiation', archetype: 'balanced' },
    { id: 'cb_waste_choir_drone', name: 'Waste Choir Drone', level: 42, zone: 9, damageType: 'radiation', archetype: 'swarm' },
    { id: 'cb_nanite_scavenger_cloud', name: 'Nanite Scavenger Cloud', level: 43, zone: 9, damageType: 'corrosive', archetype: 'swarm' },
    { id: 'cb_temporal_leak_sentinel', name: 'Temporal Leak Sentinel', level: 44, zone: 9, damageType: 'cryo', archetype: 'shield' },
    { id: 'cb_cathedral_reactor_saint', name: 'Cathedral Reactor Saint', level: 45, zone: 9, damageType: 'radiation', archetype: 'heavy' },
    { id: 'cb_titan_plate_bearer', name: 'Titan Plate Bearer', level: 46, zone: 10, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_mass_driver_sentinel', name: 'Mass Driver Sentinel', level: 47, zone: 10, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_foundry_phase_guillotine', name: 'Foundry Phase Guillotine', level: 48, zone: 10, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_flux_forged_storm_engine', name: 'Flux-Forged Storm Engine', level: 49, zone: 10, damageType: 'electric', archetype: 'shield' },
    { id: 'cb_containment_titan', name: 'Containment Titan', level: 50, zone: 10, damageType: 'corrosive', archetype: 'heavy' },
    { id: 'cb_titan_foundry_heart', name: 'Titan Foundry Heart', level: 50, zone: 10, damageType: 'pyro', archetype: 'heavyShield' }
];

function getBaseHealth(level) {
    if (level <= 5) return 40 + (level - 1) * 30;
    if (level <= 10) return 190 + (level - 6) * 52;
    if (level <= 20) return 460 + (level - 11) * 82;
    if (level <= 30) return 1000 + (level - 21) * 115;
    if (level <= 40) return 2200 + (level - 31) * 145;
    return 3800 + (level - 41) * 190;
}

function getBaseShield(level) {
    if (level <= 5) return Math.max(0, (level - 2) * 8);
    if (level <= 10) return 28 + (level - 6) * 13;
    if (level <= 20) return 90 + (level - 11) * 18;
    if (level <= 30) return 220 + (level - 21) * 25;
    if (level <= 40) return 480 + (level - 31) * 35;
    return 850 + (level - 41) * 60;
}

function getBaseDamage(level) {
    if (level <= 5) return 4 + level * 2;
    if (level <= 10) return 15 + (level - 6) * 1;
    if (level <= 20) return 20 + (level - 11) * 1.1;
    if (level <= 30) return 25 + (level - 21) * 0.8;
    if (level <= 40) return 34 + (level - 31) * 1.2;
    return 47 + (level - 41) * 1.45;
}

function getResistanceBand(level) {
    if (level <= 5) return { low: 0, mid: 3, high: 5 };
    if (level <= 10) return { low: 3, mid: 7, high: 10 };
    if (level <= 20) return { low: 6, mid: 12, high: 18 };
    if (level <= 30) return { low: 10, mid: 19, high: 28 };
    if (level <= 40) return { low: 15, mid: 28, high: 40 };
    return { low: 21, mid: 36, high: 55 };
}

function getDamageBucket(type) {
    if (type === 'kinetic' || type === 'slashing') return 'physical';
    if (type === 'pyro' || type === 'cryo' || type === 'electric') return 'elemental';
    return 'chemical';
}

function getDefenses(level, damageType) {
    const band = getResistanceBand(level);
    const bucket = getDamageBucket(damageType);
    if (bucket === 'physical') {
        return {
            physicalResistance: band.high,
            elementalResistance: band.mid,
            chemicalResistance: band.low
        };
    }
    if (bucket === 'elemental') {
        return {
            physicalResistance: band.mid,
            elementalResistance: band.high,
            chemicalResistance: band.low
        };
    }
    return {
        physicalResistance: band.low,
        elementalResistance: band.mid,
        chemicalResistance: band.high
    };
}

function applyArchetypeStats(level, archetype, baseHealth, baseShield, baseDamage) {
    const modifiers = {
        swarm: { hp: 0.72, shield: 0.65, damage: 0.7, speed: 1.45 },
        balanced: { hp: 1, shield: 1, damage: 1, speed: 1 },
        shield: { hp: 0.85, shield: 2.2, damage: 0.9, speed: 0.95 },
        sniper: { hp: 0.78, shield: 0.85, damage: 1.45, speed: 0.72 },
        heavy: { hp: 1.55, shield: 1.15, damage: 1.55, speed: 0.62 },
        heavyShield: { hp: 1.35, shield: 2.5, damage: 1.4, speed: 0.58 }
    };

    const selected = modifiers[archetype] || modifiers.balanced;
    return {
        health: Math.round(baseHealth * selected.hp),
        energyShield: Math.round(baseShield * selected.shield),
        damage: Math.round(baseDamage * selected.damage),
        attackSpeed: Number((0.95 + (level / 100) * selected.speed).toFixed(2))
    };
}

function getLootConfig(zone, archetype) {
    const pools = ZONE_POOL_CONFIG[zone];
    const baseDropChance = Math.min(0.68 + zone * 0.03, 0.95);
    const isHeavy = archetype === 'heavy' || archetype === 'heavyShield';

    const poolsByTier = {
        1: [pools.primary],
        2: [pools.secondary, 'basicComponents'],
        3: ['midRobotParts'],
        4: ['advancedComponents'],
        5: ['epicTech'],
        6: ['legendaryComponents']
    };

    for (let tier = pools.maxTier + 1; tier <= 6; tier++) {
        poolsByTier[tier] = [];
    }

    if (zone >= 8) {
        poolsByTier[5] = [pools.secondary, 'epicTech'];
    }

    if (zone >= 9) {
        poolsByTier[6] = [pools.secondary, 'legendaryComponents'];
    }

    return {
        baseDropChance,
        minItems: zone >= 6 ? 2 : 1,
        maxItems: isHeavy ? 3 : (zone >= 8 ? 3 : 2),
        poolsByTier
    };
}

function getCurrencyDrop(zone, level) {
    const min = Math.max(3, zone * 2 + Math.floor(level * 0.5));
    const max = min + Math.max(5, zone * 3);
    return {
        min,
        max,
        dropRate: 1
    };
}

function getExperienceValue(zone, archetype) {
    // Roughly ten successful delves advance a character through each
    // five-level area band under the live compounded XP requirement curve.
    const perEnemyByZone = [0, 22, 50, 110, 230, 390, 790, 1600, 2750, 5550, 7250];
    const archetypeMultiplier = {
        swarm: 0.9,
        balanced: 1,
        shield: 1.1,
        sniper: 1.1,
        heavy: 1.25,
        heavyShield: 1.35
    }[archetype] || 1;
    return Math.round(perEnemyByZone[zone] * archetypeMultiplier);
}

function toEnemy(blueprint) {
    const baseHealth = getBaseHealth(blueprint.level);
    const baseShield = getBaseShield(blueprint.level);
    const baseDamage = getBaseDamage(blueprint.level);
    const tunedStats = applyArchetypeStats(
        blueprint.level,
        blueprint.archetype,
        baseHealth,
        baseShield,
        baseDamage
    );
    const zoneTuning = ZONE_COMBAT_TUNING[blueprint.zone] || { health: 1, damage: 1 };

    return {
        id: blueprint.id,
        name: blueprint.name,
        level: blueprint.level,
        health: Math.round(tunedStats.health * zoneTuning.health),
        energyShield: Math.round(tunedStats.energyShield * zoneTuning.health),
        attackSpeed: tunedStats.attackSpeed,
        criticalChance: blueprint.archetype === 'sniper' ? 0.14 : 0.08,
        criticalMultiplier: blueprint.archetype === 'sniper' ? 2.1 : 1.8,
        damageTypes: {
            [blueprint.damageType]: Math.max(1, Math.round(tunedStats.damage * zoneTuning.damage))
        },
        defenseTypes: getDefenses(blueprint.level, blueprint.damageType),
        lootConfig: getLootConfig(blueprint.zone, blueprint.archetype),
        currencyDrop: getCurrencyDrop(blueprint.zone, blueprint.level),
        experienceValue: getExperienceValue(blueprint.zone, blueprint.archetype),
        statusEffects: [],
        description: `Corebound progression enemy for zone ${blueprint.zone}, focused on ${blueprint.damageType} damage.`
    };
}

export default BLUEPRINTS.map(toEnemy);
