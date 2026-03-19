/**
 * Pure business logic for HarnMaster actor calculations.
 *
 * These functions operate on plain data objects and have no dependency
 * on Foundry VTT globals. They can be unit tested without a running
 * Foundry instance.
 *
 * @module actor-logic
 */

/* ----------------------------------------- */
/*  Statistical Functions                    */
/* ----------------------------------------- */

/**
 * Normal cumulative distribution function approximation.
 * @param {number} x
 * @returns {number} Probability between 0 and 1.
 */
export function normalcdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    let prob =
        d *
        t *
        (0.3193815 +
            t *
                (-0.3565638 +
                    t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) {
        prob = 1 - prob;
    }
    return prob;
}

/**
 * Calculate the probability (0-100) from a normal distribution.
 * @param {number} z - The value to evaluate.
 * @param {number} mean - Distribution mean.
 * @param {number} sd - Standard deviation.
 * @returns {number} Integer probability 0-100.
 */
export function normProb(z, mean, sd) {
    if (sd == 0) {
        return z < mean ? 0 : 100;
    }
    return Math.round(normalcdf((z - mean) / sd) * 100);
}

/* ----------------------------------------- */
/*  Penalty Calculations                     */
/* ----------------------------------------- */

/**
 * Calculate universal penalty (injury + fatigue).
 * @param {number} totalInjuryLevels
 * @param {number} fatigue
 * @returns {number}
 */
export function calcUniversalPenalty(totalInjuryLevels, fatigue) {
    return totalInjuryLevels + fatigue;
}

/**
 * Calculate physical penalty (universal penalty + encumbrance).
 * @param {number} universalPenalty
 * @param {number} encumbrance
 * @returns {number}
 */
export function calcPhysicalPenalty(universalPenalty, encumbrance) {
    return universalPenalty + encumbrance;
}

/**
 * Calculate shock index from endurance and universal penalty.
 * @param {number} endurance
 * @param {number} universalPenalty
 * @returns {number} Shock index 0-100.
 */
export function calcShockIndex(endurance, universalPenalty) {
    return normProb(
        endurance,
        universalPenalty * 3.5,
        universalPenalty,
    );
}

/* ----------------------------------------- */
/*  Endurance & Encumbrance                  */
/* ----------------------------------------- */

/**
 * Calculate endurance from base abilities.
 * @param {number} strength
 * @param {number} stamina
 * @param {number} will
 * @returns {number} Endurance value (minimum 1).
 */
export function calcEndurance(strength, stamina, will) {
    return Math.max(Math.round((strength + stamina + will) / 3), 1);
}

/**
 * Calculate encumbrance from effective weight and endurance.
 * @param {number} totalWeight - Total carried weight.
 * @param {number} loadRating - Actor's load rating (0 means no load rating).
 * @param {number} endurance
 * @returns {{ effectiveWeight: number, encumbrance: number }}
 */
export function calcEncumbrance(totalWeight, loadRating, endurance) {
    const effectiveWeight = loadRating
        ? Math.max(totalWeight - loadRating, 0)
        : totalWeight;
    const encumbrance = Math.floor(effectiveWeight / endurance);
    return { effectiveWeight, encumbrance };
}

/**
 * Calculate container capacity percentage.
 * @param {number} currentWeight
 * @param {number} maxCapacity
 * @returns {number} Percentage 0-100.
 */
export function calcCapacityPct(currentWeight, maxCapacity) {
    const pct = Math.round(
        ((maxCapacity - currentWeight) / (maxCapacity || 1)) * 100,
    );
    return Math.max(Math.min(pct, 100), 0);
}

/* ----------------------------------------- */
/*  Weight Calculations                      */
/* ----------------------------------------- */

/**
 * Round a weight value to two decimal places, handling floating point drift.
 * @param {number} weight
 * @returns {number}
 */
export function roundWeight(weight) {
    return Math.round((weight + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate total carried gear weight from a list of items.
 *
 * @param {Array<{type: string, id: string, system: object}>} items
 * @returns {number} Total weight rounded to two decimal places.
 */
export function calcTotalGearWeight(items) {
    // Find all containers and whether they are carried
    const containerCarried = {};
    for (const it of items) {
        if (it.type === "containergear") {
            containerCarried[it.id] = it.system.isCarried;
        }
    }

    let totalWeight = 0;
    for (const it of items) {
        const itemData = it.system;
        if (it.type.endsWith("gear")) {
            if (itemData.container === "on-person") {
                if (itemData.isCarried) {
                    totalWeight += itemData.weight * itemData.quantity;
                }
            } else {
                if (containerCarried[itemData.container]) {
                    totalWeight += itemData.weight * itemData.quantity;
                }
            }
        }
    }

    return roundWeight(totalWeight);
}

/* ----------------------------------------- */
/*  Effective Abilities                      */
/* ----------------------------------------- */

/** Abilities affected by physical penalty. */
const PHYSICAL_ABILITIES = ["strength", "stamina", "agility", "dexterity"];

/** Abilities affected by universal penalty. */
const UNIVERSAL_ABILITIES = [
    "intelligence",
    "aura",
    "will",
    "eyesight",
    "hearing",
    "smell",
    "voice",
];

/** Abilities not affected by any penalty. */
const UNPENALIZED_ABILITIES = ["comeliness", "morality"];

/**
 * Calculate effective ability values by applying penalties to modified base values.
 *
 * @param {Object} eph - Ephemeral data with modified ability values.
 * @param {number} physicalPenalty
 * @param {number} universalPenalty
 * @returns {Object} Map of ability name to effective value.
 */
export function calcEffectiveAbilities(eph, physicalPenalty, universalPenalty) {
    const result = {};

    for (const ability of PHYSICAL_ABILITIES) {
        result[ability] = Math.max(
            Math.round(eph[ability] + Number.EPSILON) - physicalPenalty,
            0,
        );
    }

    for (const ability of UNIVERSAL_ABILITIES) {
        result[ability] = Math.max(
            Math.round(eph[ability] + Number.EPSILON) - universalPenalty,
            0,
        );
    }

    for (const ability of UNPENALIZED_ABILITIES) {
        result[ability] = Math.max(
            Math.round(eph[ability] + Number.EPSILON),
            0,
        );
    }

    return result;
}

/* ----------------------------------------- */
/*  Skill & Spell Calculations               */
/* ----------------------------------------- */

/**
 * Calculate spell effective mastery level.
 * @param {number} skillEml - The convocation skill's EML.
 * @param {number} spellLevel - The spell's level (1-6).
 * @returns {number}
 */
export function calcSpellEml(skillEml, spellLevel) {
    return skillEml - spellLevel * 5;
}

/**
 * Calculate invocation effective mastery level.
 * @param {number} skillEml - The ritual skill's EML.
 * @param {number} circle - The invocation's circle (1-6).
 * @returns {number}
 */
export function calcInvocationEml(skillEml, circle) {
    return skillEml - circle * 5;
}

/**
 * Calculate weapon attack mastery level.
 * @param {number} skillEml - Associated skill's EML.
 * @param {number} attackBonus - Weapon's attack bonus.
 * @param {number} attackModifier - Additional attack modifier.
 * @returns {number}
 */
export function calcWeaponAml(skillEml, attackBonus, attackModifier) {
    return (skillEml || 0) + (attackBonus || 0) + (attackModifier || 0);
}

/**
 * Calculate weapon defense mastery level.
 * @param {number} skillEml - Associated skill's EML.
 * @param {number} defenseBonus - Weapon's defense bonus.
 * @returns {number}
 */
export function calcWeaponDml(skillEml, defenseBonus) {
    return (skillEml || 0) + (defenseBonus || 0);
}

/**
 * Calculate missile attack mastery level.
 * @param {number} skillEml - Associated skill's EML.
 * @param {number} attackModifier - Additional attack modifier.
 * @returns {number}
 */
export function calcMissileAml(skillEml, attackModifier) {
    return (skillEml || 0) + (attackModifier || 0);
}

/**
 * Ensure a mastery level is at least 5 (the minimum).
 * @param {number} ml
 * @returns {number}
 */
export function clampMasteryLevel(ml) {
    return Math.max(ml, 5);
}
