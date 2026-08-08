// Combat Styles prototype data.
// NOTE: This replaces the legacy six-skill + mod-card model.

const DEFAULT_COMBAT_STYLE_PROFILE = {
    attackTimeMultiplier: 1,
    damageMultiplier: 1,
    hitCount: 1,
    procOnHit: 'allHits',
    procOnCritical: 'allHits',
    comboAfterSkill: true,
    comboProcStrength: 0,
    critChanceMultiplier: 1,
    critChanceBonus: 0,
    debuffApplyBonus: 0,
};

const STYLE_POINT_THRESHOLDS = [6, 11, 16, 21, 26, 31, 36, 41, 46, 51];
const DEFAULT_COMBAT_STYLE_ID = 'balancedStyle';
const LEGACY_SKILL_IDS = [
    'standardStrike',
    'doubleStrike',
    'heavyBlow',
    'flurry',
    'channelBeam',
    'riposteStance',
];

const balancedStyleNodes = [
    { id: 'steadyHand', name: 'Steady Hand', type: 'minor', x: 2, y: 1, maxPoints: 1, cost: 1, icon: 'precision', description: '+15 Precision.', requires: [] },
    { id: 'guardedPosture', name: 'Guarded Posture', type: 'minor', x: 4, y: 1, maxPoints: 1, cost: 1, icon: 'shield', description: '+3% to all resistances.', requires: [] },
    { id: 'comboThread', name: 'Combo Thread', type: 'minor', x: 6, y: 1, maxPoints: 1, cost: 1, icon: 'chain', description: '+8% combo chance.', requires: [] },
    { id: 'cleanStrike', name: 'Clean Strike', type: 'minor', x: 8, y: 1, maxPoints: 1, cost: 1, icon: 'blade', description: '+6% damage.', requires: [] },

    { id: 'cleanHit', name: 'Clean Hit', type: 'minor', x: 2, y: 3, maxPoints: 1, cost: 1, icon: 'target', description: 'Damage rolls cannot fall below 35% of potential damage.', requires: ['steadyHand'] },
    { id: 'measuredGuard', name: 'Measured Guard', type: 'minor', x: 4, y: 3, maxPoints: 1, cost: 1, icon: 'barrier', description: 'After attacking, gain a small temporary energy shield.', requires: ['guardedPosture'] },
    { id: 'followThrough', name: 'Follow-Through', type: 'minor', x: 6, y: 3, maxPoints: 1, cost: 1, icon: 'impact', description: 'Combo hits may trigger on-hit effects at reduced strength.', requires: ['comboThread'] },
    { id: 'pressurePoint', name: 'Pressure Point', type: 'minor', x: 8, y: 3, maxPoints: 1, cost: 1, icon: 'weakspot', description: '+6% debuff apply chance.', requires: ['cleanStrike'] },

    { id: 'splitRhythm', name: 'Split Rhythm', type: 'major', x: 1, y: 5, maxPoints: 1, cost: 1, icon: 'split', description: 'Attacks hit twice for reduced damage per hit.', requires: ['cleanHit'], mutuallyExclusiveWith: ['singleIntent'] },
    { id: 'singleIntent', name: 'Single Intent', type: 'major', x: 3, y: 5, maxPoints: 1, cost: 1, icon: 'focus', description: 'Attacks deal more damage and gain critical multiplier, but cannot trigger combos.', requires: ['cleanHit'], mutuallyExclusiveWith: ['splitRhythm'] },
    { id: 'defensiveForm', name: 'Defensive Form', type: 'major', x: 5, y: 5, maxPoints: 1, cost: 1, icon: 'fortress', description: 'Deal less damage, but gain protection after each attack.', requires: ['measuredGuard'], mutuallyExclusiveWith: ['relentlessForm'] },
    { id: 'relentlessForm', name: 'Relentless Form', type: 'major', x: 7, y: 5, maxPoints: 1, cost: 1, icon: 'speed', description: 'Attack faster, but take slightly more damage.', requires: ['followThrough'], mutuallyExclusiveWith: ['defensiveForm'] },

    { id: 'adaptiveTempo', name: 'Adaptive Tempo', type: 'connector', x: 2, y: 7, maxPoints: 1, cost: 1, icon: 'cycle', description: 'If no combo triggers, gain precision and combo chance on the next attack.', requires: ['splitRhythm', 'followThrough'] },
    { id: 'controlledViolence', name: 'Controlled Violence', type: 'connector', x: 4, y: 7, maxPoints: 1, cost: 1, icon: 'crit', description: 'If an attack does not critically hit, gain critical chance for the next attack.', requires: ['singleIntent', 'pressurePoint'] },
    { id: 'exploitRhythm', name: 'Exploit Rhythm', type: 'connector', x: 6, y: 7, maxPoints: 1, cost: 1, icon: 'debuff', description: 'Deal more damage to debuffed enemies.', requires: ['pressurePoint'] },
    { id: 'combatBreathing', name: 'Combat Breathing', type: 'connector', x: 8, y: 7, maxPoints: 1, cost: 1, icon: 'pulse', description: 'Recover a small amount of health on attack.', requires: ['defensiveForm'] },

    { id: 'technicalForm', name: 'Technical Form', type: 'major', x: 1, y: 9, maxPoints: 1, cost: 1, icon: 'analysis', description: 'Gain precision and debuff chance, but deal less damage.', requires: ['adaptiveTempo'] },
    { id: 'sustainedAssault', name: 'Sustained Assault', type: 'major', x: 3, y: 9, maxPoints: 1, cost: 1, icon: 'momentum', description: 'Repeated attacks against the same enemy build damage.', requires: ['controlledViolence'] },
    { id: 'stableChain', name: 'Stable Chain', type: 'major', x: 5, y: 9, maxPoints: 1, cost: 1, icon: 'chainplus', description: 'Combo attacks deal more damage and gain critical chance.', requires: ['exploitRhythm'] },
    { id: 'ironRhythm', name: 'Iron Rhythm', type: 'major', x: 7, y: 9, maxPoints: 1, cost: 1, icon: 'armor', description: 'Every third hit taken is reduced.', requires: ['combatBreathing'] },

    { id: 'perfectForm', name: 'Perfect Form', type: 'keystone', x: 2, y: 11, maxPoints: 1, cost: 1, icon: 'star', description: 'Every third attack is perfected: maximum damage roll, critical chance, and debuff chance.', requires: ['technicalForm', 'sustainedAssault'] },
    { id: 'equilibriumEngine', name: 'Equilibrium Engine', type: 'keystone', x: 4, y: 11, maxPoints: 1, cost: 1, icon: 'balance', description: 'Gain offense or defense depending on whether health or shield is lower.', requires: ['sustainedAssault', 'stableChain'] },
    { id: 'noWastedMotion', name: 'No Wasted Motion', type: 'keystone', x: 6, y: 11, maxPoints: 1, cost: 1, icon: 'motion', description: 'Precision increases damage up to a cap.', requires: ['stableChain', 'ironRhythm'] },
    { id: 'combatThesis', name: 'Combat Thesis', type: 'keystone', x: 8, y: 11, maxPoints: 1, cost: 1, icon: 'core', description: 'Gain a broad mix of damage, speed, resistance, and debuff chance.', requires: ['ironRhythm'] },
];

function makeStyle(id, name, description, preview, profile, nodes) {
    return {
        id,
        name,
        icon: 'icons/passives-icon.png',
        description,
        attackPreview: preview,
        base: { ...DEFAULT_COMBAT_STYLE_PROFILE, ...profile },
        tree: {
            id,
            name,
            description,
            nodes,
        },
    };
}

const combatStyles = [
    makeStyle(
        'balancedStyle',
        'Balanced Style',
        'A reliable combat rhythm with flexible offense, defense, and consistency paths.',
        '1.00x speed · 1 hit · 100% damage',
        { attackTimeMultiplier: 1, damageMultiplier: 1, hitCount: 1 },
        balancedStyleNodes
    ),
];

window.combatStyles = combatStyles;
window.combatSkills = combatStyles; // Backward alias for legacy call-sites.
window.DEFAULT_SKILL_PROFILE = DEFAULT_COMBAT_STYLE_PROFILE; // Backward alias.
window.DEFAULT_COMBAT_STYLE_PROFILE = DEFAULT_COMBAT_STYLE_PROFILE;
window.DEFAULT_COMBAT_STYLE_ID = DEFAULT_COMBAT_STYLE_ID;
window.STYLE_POINT_THRESHOLDS = STYLE_POINT_THRESHOLDS;
window.LEGACY_SKILL_IDS = LEGACY_SKILL_IDS;
