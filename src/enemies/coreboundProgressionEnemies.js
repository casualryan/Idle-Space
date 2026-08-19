const THEME_ADVANCED_MIN_ZONE = Object.freeze({
    kinetic: 3,
    slashing: 3,
    electric: 3,
    corrosive: 4,
    pyro: 3,
    cryo: 4,
    radiation: 4
});

// Area-level pacing correction after simulating both entry-level and
// end-of-band crafted loadouts through complete delves. These multipliers
// smooth abrupt gear breakpoints without flattening enemy archetypes.
const ZONE_COMBAT_TUNING = {
    1: { health: 0.48, damage: 0.55 },
    2: { health: 1, damage: 1 },
    3: { health: 1, damage: 1 },
    4: { health: 0.85, damage: 0.85 },
    5: { health: 1, damage: 1.15 },
    6: { health: 1, damage: 1.05 },
    7: { health: 1, damage: 1.25 },
    8: { health: 0.7, damage: 0.85 },
    9: { health: 0.8, damage: 1.35 },
    10: { health: 0.65, damage: 0.85 },
    11: { health: 1, damage: 1.25 },
    12: { health: 1, damage: 1.2 },
    13: { health: 1, damage: 1.25 },
    14: { health: 0.8, damage: 1.15 }
};

const BLUEPRINTS = [
    { id: 'cb_scrapmite_drone', name: 'Scrapmite Drone', level: 1, zone: 1, damageType: 'kinetic', archetype: 'swarm' },
    { id: 'cb_bent_service_crawler', name: 'Bent Service Crawler', level: 2, zone: 1, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_sparking_loader_pup', name: 'Sparking Loader Pup', level: 3, zone: 1, damageType: 'electric', lootFamilies: ['electric', 'pyro'], archetype: 'swarm' },
    { id: 'cb_junkyard_compactor', name: 'Junkyard Compactor', level: 5, zone: 1, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_rusted_maintenance_bot', name: 'Rusted Maintenance Bot', level: 6, zone: 2, damageType: 'kinetic', archetype: 'balanced', abilityId: 'repair' },
    { id: 'cb_copperline_skitter', name: 'Copperline Skitter', level: 7, zone: 2, damageType: 'electric', archetype: 'swarm' },
    { id: 'cb_utility_saw_drone', name: 'Utility Saw Drone', level: 8, zone: 2, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_leaking_filter_crawler', name: 'Leaking Filter Crawler', level: 9, zone: 2, damageType: 'corrosive', archetype: 'balanced' },
    { id: 'cb_tunnel_control_node', name: 'Tunnel Control Node', level: 10, zone: 2, damageType: 'electric', archetype: 'shield', abilityId: 'shieldProjector' },
    { id: 'cb_alloy_worker_frame', name: 'Alloy Worker Frame', level: 11, zone: 3, damageType: 'kinetic', archetype: 'balanced' },
    { id: 'cb_thermal_rivet_drone', name: 'Thermal Rivet Drone', level: 12, zone: 3, damageType: 'pyro', archetype: 'balanced' },
    { id: 'cb_stabilizer_turret', name: 'Stabilizer Turret', level: 13, zone: 3, damageType: 'kinetic', archetype: 'sniper' },
    { id: 'cb_capacitor_wasp', name: 'Capacitor Wasp', level: 14, zone: 3, damageType: 'electric', archetype: 'swarm' },
    { id: 'cb_processing_floor_overseer', name: 'Processing Floor Overseer', level: 15, zone: 3, damageType: 'slashing', archetype: 'heavy', abilityId: 'commander' },
    { id: 'cb_coolant_leak_sprayer', name: 'Coolant Leak Sprayer', level: 16, zone: 4, damageType: 'cryo', archetype: 'balanced' },
    { id: 'cb_acid_vat_crawler', name: 'Acid Vat Crawler', level: 17, zone: 4, damageType: 'corrosive', archetype: 'balanced' },
    { id: 'cb_irradiated_sensor_husk', name: 'Irradiated Sensor Husk', level: 18, zone: 4, damageType: 'radiation', archetype: 'sniper' },
    { id: 'cb_flame_vent_drone', name: 'Flame Vent Drone', level: 19, zone: 4, damageType: 'pyro', archetype: 'swarm' },
    { id: 'cb_containment_failure_unit', name: 'Containment Failure Unit', level: 20, zone: 4, damageType: 'corrosive', archetype: 'shield', abilityId: 'cleanser' },
    { id: 'cb_rail_spike_turret', name: 'Rail Spike Turret', level: 21, zone: 5, damageType: 'kinetic', archetype: 'sniper' },
    { id: 'cb_transit_saw_runner', name: 'Transit Saw Runner', level: 22, zone: 5, damageType: 'slashing', archetype: 'swarm' },
    { id: 'cb_arc_rail_drone', name: 'Arc Rail Drone', level: 23, zone: 5, damageType: 'electric', archetype: 'balanced' },
    { id: 'cb_signal_jammer_node', name: 'Signal Jammer Node', level: 24, zone: 5, damageType: 'electric', archetype: 'shield' },
    { id: 'cb_armored_transit_engine', name: 'Armored Transit Engine', level: 25, zone: 5, damageType: 'kinetic', archetype: 'heavy', abilityId: 'berserker' },
    { id: 'cb_bio_acid_spitter', name: 'Bio-Acid Spitter', level: 26, zone: 6, damageType: 'corrosive', archetype: 'balanced' },
    { id: 'cb_synthetic_marrow_crawler', name: 'Synthetic Marrow Crawler', level: 27, zone: 6, damageType: 'corrosive', archetype: 'heavy' },
    { id: 'cb_radium_needle_drone', name: 'Radium Needle Drone', level: 28, zone: 6, damageType: 'radiation', archetype: 'sniper' },
    { id: 'cb_lab_defense_reclaimer', name: 'Lab Defense Reclaimer', level: 29, zone: 6, damageType: 'slashing', archetype: 'balanced', abilityId: 'repair' },
    { id: 'cb_bio_corrosion_mass', name: 'Bio-Corrosion Mass', level: 30, zone: 6, damageType: 'corrosive', archetype: 'heavy' },
    { id: 'cb_phase_cutter_drone', name: 'Phase Cutter Drone', level: 31, zone: 7, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_shielded_assembly_frame', name: 'Shielded Assembly Frame', level: 32, zone: 7, damageType: 'kinetic', archetype: 'shield' },
    { id: 'cb_quantum_lens_turret', name: 'Quantum Lens Turret', level: 33, zone: 7, damageType: 'electric', archetype: 'sniper' },
    { id: 'cb_neural_calibration_node', name: 'Neural Calibration Node', level: 34, zone: 7, damageType: 'radiation', archetype: 'shield', abilityId: 'shieldProjector' },
    { id: 'cb_phase_assembly_warden', name: 'Phase Assembly Warden', level: 35, zone: 7, damageType: 'slashing', archetype: 'heavy', abilityId: 'commander' },
    { id: 'cb_furnace_spitter', name: 'Furnace Spitter', level: 36, zone: 8, damageType: 'pyro', archetype: 'balanced' },
    { id: 'cb_arcstorm_harvester', name: 'Arcstorm Harvester', level: 37, zone: 8, damageType: 'electric', archetype: 'balanced' },
    { id: 'cb_overheated_servo_giant', name: 'Overheated Servo Giant', level: 38, zone: 8, damageType: 'kinetic', archetype: 'heavy', abilityId: 'berserker' },
    { id: 'cb_flux_burner_node', name: 'Flux Burner Node', level: 39, zone: 8, damageType: 'pyro', archetype: 'shield' },
    { id: 'cb_storm_furnace_core', name: 'Storm Furnace Core', level: 40, zone: 8, damageType: 'electric', archetype: 'heavy' },
    { id: 'cb_isotope_pilgrim_husk', name: 'Isotope Pilgrim Husk', level: 41, zone: 9, damageType: 'radiation', archetype: 'balanced' },
    { id: 'cb_waste_choir_drone', name: 'Waste Choir Drone', level: 42, zone: 9, damageType: 'radiation', archetype: 'swarm' },
    { id: 'cb_nanite_scavenger_cloud', name: 'Nanite Scavenger Cloud', level: 43, zone: 9, damageType: 'corrosive', archetype: 'swarm', abilityId: 'repair' },
    { id: 'cb_temporal_leak_sentinel', name: 'Temporal Leak Sentinel', level: 44, zone: 9, damageType: 'cryo', archetype: 'shield', abilityId: 'cleanser' },
    { id: 'cb_cathedral_reactor_saint', name: 'Cathedral Reactor Saint', level: 45, zone: 9, damageType: 'radiation', archetype: 'heavy', abilityId: 'commander' },
    { id: 'cb_titan_plate_bearer', name: 'Titan Plate Bearer', level: 46, zone: 10, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_mass_driver_sentinel', name: 'Mass Driver Sentinel', level: 47, zone: 10, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_foundry_phase_guillotine', name: 'Foundry Phase Guillotine', level: 48, zone: 10, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_flux_forged_storm_engine', name: 'Flux-Forged Storm Engine', level: 49, zone: 10, damageType: 'electric', archetype: 'shield' },
    { id: 'cb_containment_titan', name: 'Containment Titan', level: 50, zone: 10, damageType: 'corrosive', archetype: 'heavy' },
    { id: 'cb_titan_foundry_heart', name: 'Titan Foundry Heart', level: 50, zone: 10, damageType: 'pyro', archetype: 'heavyShield', abilityId: 'berserker' },
    { id: 'cb_crownfall_skirmisher', name: 'Crownfall Skirmisher', level: 51, zone: 11, damageType: 'kinetic', archetype: 'balanced' },
    { id: 'cb_ashglass_stalker', name: 'Ashglass Stalker', level: 51, zone: 11, damageType: 'slashing', archetype: 'swarm' },
    { id: 'cb_voltage_suppressor', name: 'Voltage Suppressor', level: 52, zone: 11, damageType: 'electric', archetype: 'shield' },
    { id: 'cb_phase_marked_gunner', name: 'Phase-Marked Gunner', level: 52, zone: 11, damageType: 'radiation', archetype: 'sniper' },
    { id: 'cb_perimeter_siege_frame', name: 'Perimeter Siege Frame', level: 53, zone: 11, damageType: 'kinetic', archetype: 'heavy' },
    { id: 'cb_nullwire_reaper', name: 'Nullwire Reaper', level: 54, zone: 12, damageType: 'slashing', archetype: 'balanced' },
    { id: 'cb_blackout_array', name: 'Blackout Array', level: 54, zone: 12, damageType: 'electric', archetype: 'shield', abilityId: 'shieldProjector' },
    { id: 'cb_cryogenic_interdictor', name: 'Cryogenic Interdictor', level: 55, zone: 12, damageType: 'cryo', archetype: 'sniper' },
    { id: 'cb_caustic_signal_eater', name: 'Caustic Signal Eater', level: 55, zone: 12, damageType: 'corrosive', archetype: 'heavy' },
    { id: 'cb_bastion_silence_engine', name: 'Bastion Silence Engine', level: 56, zone: 12, damageType: 'radiation', archetype: 'heavyShield', abilityId: 'cleanser' },
    { id: 'cb_sovereign_blade_assembly', name: 'Sovereign Blade Assembly', level: 57, zone: 13, damageType: 'slashing', archetype: 'swarm' },
    { id: 'cb_crown_mass_driver', name: 'Crown Mass Driver', level: 58, zone: 13, damageType: 'kinetic', archetype: 'sniper' },
    { id: 'cb_furnace_judgment_engine', name: 'Furnace Judgment Engine', level: 58, zone: 13, damageType: 'pyro', archetype: 'heavy' },
    { id: 'cb_stormwall_custodian', name: 'Stormwall Custodian', level: 59, zone: 13, damageType: 'electric', archetype: 'shield', abilityId: 'shieldProjector' },
    { id: 'cb_war_foundry_exarch', name: 'War Foundry Exarch', level: 60, zone: 13, damageType: 'corrosive', archetype: 'heavyShield', abilityId: 'commander' },
    { id: 'cb_terminus_nullblade', name: 'Terminus Nullblade', level: 61, zone: 14, damageType: 'slashing', archetype: 'balanced', abilityId: 'berserker' },
    { id: 'cb_corebound_disassembler', name: 'Corebound Disassembler', level: 62, zone: 14, damageType: 'kinetic', archetype: 'heavy', abilityId: 'repair' },
    { id: 'cb_eventide_arc_vessel', name: 'Eventide Arc Vessel', level: 63, zone: 14, damageType: 'electric', archetype: 'sniper' },
    { id: 'cb_entropy_containment_choir', name: 'Entropy Containment Choir', level: 64, zone: 14, damageType: 'radiation', archetype: 'shield', abilityId: 'shieldProjector' },
    { id: 'cb_dominion_finalizer', name: 'Dominion Finalizer', level: 65, zone: 14, damageType: 'pyro', archetype: 'heavyShield', abilityId: 'cleanser' }
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

function getThemePoolName(damageType, stage) {
    return `theme${damageType[0].toUpperCase()}${damageType.slice(1)}${stage}`;
}

function getLootConfig(zone, archetype, damageTypeOrFamilies) {
    const progressionZone = Math.min(10, Math.max(1, zone));
    const baseDropChance = Math.min(0.7 + progressionZone * 0.025, 0.95);
    const isHeavy = archetype === 'heavy' || archetype === 'heavyShield';
    const damageTypes = Array.isArray(damageTypeOrFamilies) ? damageTypeOrFamilies : [damageTypeOrFamilies];
    const commonThemePools = damageTypes.map(damageType => getThemePoolName(damageType, 'Common'));
    const advancedThemePools = damageTypes
        .filter(damageType => progressionZone >= THEME_ADVANCED_MIN_ZONE[damageType])
        .map(damageType => getThemePoolName(damageType, 'Advanced'));
    const apexThemePools = progressionZone >= 7
        ? damageTypes.map(damageType => getThemePoolName(damageType, 'Apex'))
        : [];
    const identityPools = [...commonThemePools, ...advancedThemePools, ...apexThemePools];
    if (progressionZone >= 5 && archetype === 'sniper') identityPools.push('exceptionalPrecision');
    if (progressionZone >= 6 && ['shield', 'heavy', 'heavyShield'].includes(archetype)) identityPools.push('exceptionalTech');
    if (progressionZone >= 9 && archetype === 'heavyShield') identityPools.push('exceptionalApex');
    const poolsByTier = {
        1: [`foundationZ${progressionZone}`],
        2: identityPools,
        3: [
            ...advancedThemePools,
            ...(progressionZone >= 5 && archetype === 'sniper' ? ['exceptionalPrecision'] : []),
            ...(progressionZone >= 6 && ['shield', 'heavy', 'heavyShield'].includes(archetype) ? ['exceptionalTech'] : [])
        ],
        4: [`legacyThemesZ${progressionZone}`, ...(progressionZone >= 5 ? ['exceptionalPrecision'] : [])],
        5: progressionZone >= 6
            ? [...apexThemePools, ...(['shield', 'heavy', 'heavyShield'].includes(archetype) ? ['exceptionalTech'] : [])]
            : [],
        6: progressionZone >= 9 && ['heavy', 'heavyShield'].includes(archetype) ? ['exceptionalApex'] : []
    };

    return {
        baseDropChance,
        minItems: zone >= 11 ? 3 : (progressionZone >= 4 ? 2 : 1),
        maxItems: zone >= 11
            ? (isHeavy ? 6 : 5)
            : (isHeavy ? (progressionZone >= 7 ? 5 : 4) : (progressionZone >= 7 ? 4 : 3)),
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
    return Math.round((perEnemyByZone[zone] || perEnemyByZone[10]) * archetypeMultiplier);
}

const ARCHETYPE_DESCRIPTIONS = {
    swarm: 'A rapid pressure unit with low durability and an aggressive attack cycle.',
    balanced: 'A general-purpose combat frame with no obvious statistical weakness.',
    shield: 'A shield-heavy defender built to absorb opening damage and prolong the encounter.',
    sniper: 'A fragile precision attacker whose slower strikes carry elevated critical threat.',
    heavy: 'A slow assault platform with reinforced integrity and punishing individual hits.',
    heavyShield: 'A siege-class target combining reinforced integrity, dense shielding, and heavy damage.'
};

const DAMAGE_DESCRIPTIONS = {
    kinetic: 'Its kinetic weaponry is checked by Physical Resistance.',
    slashing: 'Its cutting attacks are checked by Physical Resistance.',
    pyro: 'Its thermal attacks are checked by Elemental Resistance.',
    cryo: 'Its cryogenic attacks are checked by Elemental Resistance.',
    electric: 'Its electrical attacks are checked by Elemental Resistance.',
    corrosive: 'Its corrosive attacks are checked by Chemical Resistance.',
    radiation: 'Its radiation attacks are checked by Chemical Resistance.'
};

const TAUNT_ABILITIES = Object.freeze({
    shield: Object.freeze({ initialDelay: 3.5, duration: 3, cooldown: 11 }),
    heavy: Object.freeze({ initialDelay: 5, duration: 2.5, cooldown: 14 }),
    heavyShield: Object.freeze({ initialDelay: 2.5, duration: 4, cooldown: 9 })
});

function getEnemyPortraitPath(blueprint) {
    const slug = String(blueprint.id || blueprint.name || 'enemy')
        .replace(/^cb_/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `images/enemies/${slug}.png`;
}

function toEnemy(blueprint, levelOverride = null, options = {}) {
    const effectiveLevel = levelOverride == null
        ? blueprint.level
        : Math.max(1, Math.min(100, Math.floor(Number(levelOverride) || blueprint.level)));
    const effectiveZone = levelOverride == null
        ? blueprint.zone
        : Math.max(1, Math.min(20, Math.ceil(effectiveLevel / 5)));
    const baseHealth = getBaseHealth(effectiveLevel);
    const baseShield = getBaseShield(effectiveLevel);
    const baseDamage = getBaseDamage(effectiveLevel);
    const tunedStats = applyArchetypeStats(
        effectiveLevel,
        blueprint.archetype,
        baseHealth,
        baseShield,
        baseDamage
    );
    const zoneTuning = options.neutralZoneTuning
        ? { health: 1, damage: 1 }
        : (ZONE_COMBAT_TUNING[effectiveZone] || { health: 1, damage: 1 });

    return {
        id: blueprint.id,
        name: blueprint.name,
        level: effectiveLevel,
        zone: effectiveZone,
        scalableProgressionEnemy: true,
        archetype: blueprint.archetype,
        portrait: getEnemyPortraitPath(blueprint),
        enemyAbilityIds: blueprint.abilityId ? [blueprint.abilityId] : [],
        tauntAbility: !blueprint.abilityId && TAUNT_ABILITIES[blueprint.archetype]
            ? { ...TAUNT_ABILITIES[blueprint.archetype] }
            : null,
        health: Math.round(tunedStats.health * zoneTuning.health),
        energyShield: Math.round(tunedStats.energyShield * zoneTuning.health),
        attackSpeed: tunedStats.attackSpeed,
        criticalChance: blueprint.archetype === 'sniper' ? 0.14 : 0.08,
        criticalMultiplier: blueprint.archetype === 'sniper' ? 2.1 : 1.8,
        damageTypes: {
            [blueprint.damageType]: Math.max(1, Math.round(tunedStats.damage * zoneTuning.damage))
        },
        defenseTypes: getDefenses(effectiveLevel, blueprint.damageType),
        lootConfig: getLootConfig(effectiveZone, blueprint.archetype, blueprint.lootFamilies || blueprint.damageType),
        currencyDrop: getCurrencyDrop(effectiveZone, effectiveLevel),
        experienceValue: getExperienceValue(effectiveZone, blueprint.archetype),
        statusEffects: [],
        description: `${ARCHETYPE_DESCRIPTIONS[blueprint.archetype] || ARCHETYPE_DESCRIPTIONS.balanced} ${DAMAGE_DESCRIPTIONS[blueprint.damageType] || ''}`.trim()
    };
}

export function createScaledCoreboundEnemy(templateId, level) {
    const blueprint = BLUEPRINTS.find(candidate => candidate.id === templateId);
    if (!blueprint) return null;
    const targetLevel = Math.max(1, Math.min(100, Math.floor(Number(level) || blueprint.level)));
    if (targetLevel <= 50) return toEnemy(blueprint, targetLevel);

    // Deep Sectors use the neutral target-level curve rather than inheriting
    // the deliberately softened tuning of any authored Patrol zone. This is
    // what makes an early-game identity a real level-55+ combatant instead of
    // a low-level template wearing only an above-50 multiplier.
    const enemy = toEnemy(blueprint, targetLevel, { neutralZoneTuning: true });
    const excessLevels = targetLevel - 50;
    const targetZone = Math.max(11, Math.min(20, Math.ceil(targetLevel / 5)));
    const durabilityMultiplier = 1 + excessLevels * 0.07;
    const damageMultiplier = 1 + excessLevels * 0.04;
    enemy.level = targetLevel;
    enemy.zone = targetZone;
    enemy.health = Math.max(1, Math.round(enemy.health * durabilityMultiplier));
    enemy.energyShield = Math.max(0, Math.round(enemy.energyShield * durabilityMultiplier));
    enemy.damageTypes = Object.fromEntries(Object.entries(enemy.damageTypes).map(([type, amount]) => [
        type,
        Math.max(1, Math.round(Number(amount || 0) * damageMultiplier))
    ]));
    // Player Deflection is fully developed by level 50. Deep Sector enemies
    // need a target-level Precision baseline or their hits collapse to the
    // global 10% damage-roll floor regardless of their scaled weapon damage.
    enemy.precision = Math.max(Number(enemy.precision || 0), targetLevel * 6 + excessLevels * 2);
    enemy.deflection = Number(enemy.deflection || 0) + excessLevels * 2;
    enemy.lootConfig = getLootConfig(targetZone, blueprint.archetype, blueprint.lootFamilies || blueprint.damageType);
    enemy.currencyDrop = getCurrencyDrop(targetZone, targetLevel);
    enemy.currencyDrop.min = Math.max(1, Math.round(enemy.currencyDrop.min * (1 + excessLevels * 0.03)));
    enemy.currencyDrop.max = Math.max(enemy.currencyDrop.min, Math.round(enemy.currencyDrop.max * (1 + excessLevels * 0.03)));
    return enemy;
}

export default BLUEPRINTS.map(blueprint => toEnemy(blueprint));
