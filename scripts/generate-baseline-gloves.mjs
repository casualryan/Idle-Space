import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const armorDir = path.join(__dirname, '..', 'src', 'items', 'armor');

const GLOVES = [
    { name: 'Scrap Metal Gloves', level: 1, file: 'scrapMetalGloves' },
    { name: 'Patchwork Work Gloves', level: 3, file: 'patchworkWorkGloves' },
    { name: 'Light Combat Gloves', level: 5, file: 'lightCombatGloves' },
    { name: 'Riveted Iron Gauntlets', level: 7, file: 'rivetedIronGauntlets' },
    { name: 'Grounding Grips', level: 10, file: 'groundingGrips' },
    { name: 'Capacitor Handwraps', level: 12, file: 'capacitorHandwraps' },
    { name: 'Chem-Sealed Gloves', level: 15, file: 'chemSealedGloves' },
    { name: 'Steel Knuckle Plates', level: 17, file: 'steelKnucklePlates' },
    { name: 'Photon Strike Gloves', level: 19, file: 'photonStrikeGloves' },
    { name: 'Faraday Grip Gauntlets', level: 22, file: 'faradayGripGauntlets' },
    { name: 'Corrosion Guard Gloves', level: 24, file: 'corrosionGuardGloves' },
    { name: 'Alloy Plated Gauntlets', level: 26, file: 'alloyPlatedGauntlets' },
    { name: 'Servo-Assist Gloves', level: 29, file: 'servoAssistGloves' },
    { name: 'Barrier Grip Gauntlets', level: 31, file: 'barrierGripGauntlets' },
    { name: 'Biohazard Hand Shells', level: 34, file: 'biohazardHandShells' },
    { name: 'Kinetic Anchor Gloves', level: 36, file: 'kineticAnchorGloves' },
    { name: 'Phase-Step Gloves', level: 39, file: 'phaseStepGloves' },
    { name: 'Reflex Drive Gauntlets', level: 41, file: 'reflexDriveGauntlets' },
    { name: 'Radiation Lock Gloves', level: 44, file: 'radiationLockGloves' },
    { name: 'Titan Grip Gauntlets', level: 46, file: 'titanGripGauntlets' },
    { name: 'Aegis Hand Plates', level: 48, file: 'aegisHandPlates' },
    { name: 'Containment Lock Gloves', level: 50, file: 'containmentLockGloves' },
    { name: 'Stormstep Reactor Gloves', level: 50, file: 'stormstepReactorGloves' }
];

function inferTheme(name) {
    const lower = name.toLowerCase();
    if (/(rad|radiation|isotope|gamma|containment)/.test(lower)) return 'radiation';
    if (/(chem|acid|toxin|corrosion|biohazard|bio)/.test(lower)) return 'chemical';
    if (/(cryo|frost|coolant)/.test(lower)) return 'cryo';
    if (/(arc|shock|electric|lightning|faraday|storm|capacitor|ground|photon)/.test(lower)) return 'electric';
    if (/(phase|monowire|slashing|strike)/.test(lower)) return 'slashing';
    return 'physical';
}

function defenseKey(theme) {
    if (theme === 'electric' || theme === 'cryo' || theme === 'radiation') return 'elementalResistance';
    if (theme === 'chemical') return 'chemicalResistance';
    return 'physicalResistance';
}

function buildStats(level, name) {
    const theme = inferTheme(name);
    const stats = {
        healthBonus: {
            min: Math.round(8 + level * 3.2),
            max: Math.round(14 + level * 3.8)
        }
    };

    const resMin = level < 12 ? 1 : level < 28 ? 2 : 5;
    const resMax = level < 12 ? 3 : level < 28 ? 5 : 10;
    stats.defenseTypes = {
        [defenseKey(theme)]: { min: resMin, max: resMax }
    };

    if (level >= 5) {
        stats.precision = { min: Math.max(1, Math.floor(level / 6)), max: Math.max(2, Math.floor(level / 4)) };
    }
    if (level >= 10) {
        stats.attackSpeedModifier = { min: 1, max: Math.min(5, Math.floor(level / 12) + 2) };
    }
    if (level >= 15 && (theme === 'physical' || theme === 'slashing')) {
        stats.damageTypes = {
            kinetic: { min: Math.max(2, Math.floor(level / 10)), max: Math.max(4, Math.floor(level / 6)) }
        };
    }
    if (level >= 20 && theme === 'electric') {
        stats.damageTypes = {
            electric: { min: Math.floor(level / 12), max: Math.floor(level / 8) }
        };
    }
    if (level >= 35) {
        stats.energyShieldBonus = { min: Math.round(level * 4), max: Math.round(level * 6) };
    }
    if (level >= 40) {
        stats.deflection = { min: Math.floor(level / 12), max: Math.floor(level / 8) };
    }

    return stats;
}

function buildDisassemble(level) {
    if (level <= 3) return [{ name: 'Scrap Metal', quantity: 2 }];
    if (level <= 8) return [{ name: 'Scrap Metal', quantity: 3 }, { name: 'Wire Bundle', quantity: 1 }];
    if (level <= 15) {
        return [
            { name: 'Scrap Metal', quantity: 4 },
            { name: 'Wire Bundle', quantity: 1 },
            { name: 'Minor Electronic Circuit', quantity: 1 }
        ];
    }
    if (level <= 30) {
        return [
            { name: 'Titanium', quantity: 2 },
            { name: 'Titanium Plating', quantity: 1 },
            { name: 'Advanced Servo', quantity: 1 }
        ];
    }
    return [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ];
}

function describe(name) {
    return `${name} — salvaged hand protection tuned for combat grip and control.`;
}

function formatObject(obj, indent = '    ') {
    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            lines.push(`${indent}${key}: {`);
            lines.push(formatObject(value, indent + '    '));
            lines.push(`${indent}},`);
        } else {
            lines.push(`${indent}${key}: ${JSON.stringify(value)},`);
        }
    }
    return lines.join('\n');
}

for (const glove of GLOVES) {
    const stats = buildStats(glove.level, glove.name);
    const disassemble = buildDisassemble(glove.level);
    const statLines = [];

    for (const [key, value] of Object.entries(stats)) {
        if (key === 'defenseTypes' || key === 'damageTypes') {
            statLines.push(`    ${key}: {`);
            for (const [subKey, subVal] of Object.entries(value)) {
                statLines.push(`        ${subKey}: { min: ${subVal.min}, max: ${subVal.max} },`);
            }
            statLines.push('    },');
        } else {
            statLines.push(`    ${key}: { min: ${value.min}, max: ${value.max} },`);
        }
    }

    const disLines = disassemble
        .map((row) => `        { name: '${row.name}', quantity: ${row.quantity} }`)
        .join(',\n');

    const content = `export default {
    name: '${glove.name}',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: ${glove.level}, max: ${glove.level} },
${statLines.join('\n')}
    isDisassembleable: true,
    disassembleResults: [
${disLines}
    ],
    description: '${describe(glove.name)}'
};
`;

    fs.writeFileSync(path.join(armorDir, `${glove.file}.js`), content, 'utf8');
    console.log('Wrote', glove.file);
}

console.log('Done:', GLOVES.length, 'glove files');
