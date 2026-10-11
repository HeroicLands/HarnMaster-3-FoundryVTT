/**
 * Pure actor calculations. These work on plain numbers and objects and touch no
 * Foundry globals, so they can be unit tested without a running Foundry
 * instance.
 *
 * @module actor-logic
 */

/**
 * An actor's endurance. Without a Condition skill it is the average of
 * Strength, Stamina and Will, rounded; with one it is a fifth of the skill's
 * mastery level, rounded. Either way it is at least 1, because encumbrance
 * divides by it.
 *
 * @param {number} strength - Base Strength.
 * @param {number} stamina - Base Stamina.
 * @param {number} will - Base Will.
 * @param {number} [conditionMasteryLevel] - Mastery level of the Condition
 *   skill; leave undefined when the actor has none. A skill with no mastery
 *   level counts as 0.
 * @returns {number}
 */
export function calcEndurance(strength, stamina, will, conditionMasteryLevel = undefined) {
    const endurance =
        conditionMasteryLevel === undefined ?
            Math.round((strength + stamina + will) / 3)
        :   Math.round((conditionMasteryLevel || 0) / 5);
    return Math.max(endurance, 1);
}

/**
 * The weight that counts toward encumbrance, and the encumbrance it yields.
 * A load rating is weight carried without penalty; an actor without one
 * counts all of it.
 *
 * @param {number} totalWeight - Total carried weight.
 * @param {number} loadRating - Weight carried free of penalty; 0 means none.
 * @param {number} endurance - Divisor, at least 1.
 * @returns {{ effectiveWeight: number, encumbrance: number }}
 */
export function calcEncumbrance(totalWeight, loadRating, endurance) {
    const effectiveWeight = loadRating ? Math.max(totalWeight - loadRating, 0) : totalWeight;
    return { effectiveWeight, encumbrance: Math.floor(effectiveWeight / endurance) };
}

/**
 * Approximation of the standard normal cumulative distribution function.
 *
 * @param {number} x
 * @returns {number} Probability between 0 and 1.
 */
export function normalcdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    let prob =
        d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) {
        prob = 1 - prob;
    }
    return prob;
}

/**
 * The percentage chance, as a whole number, that a value from a normal
 * distribution falls at or below `z`. A distribution with no spread is 0 below
 * the mean and 100 at or above it.
 *
 * @param {number} z
 * @param {number} mean
 * @param {number} sd - Standard deviation.
 * @returns {number} 0 to 100.
 */
export function normProb(z, mean, sd) {
    if (sd == 0) {
        return z < mean ? 0 : 100;
    }
    return Math.round(normalcdf((z - mean) / sd) * 100);
}

/**
 * The penalty every ability and skill takes: injury levels plus fatigue.
 *
 * @param {number} totalInjuryLevels
 * @param {number} fatigue
 * @returns {number}
 */
export function calcUniversalPenalty(totalInjuryLevels, fatigue) {
    return totalInjuryLevels + fatigue;
}

/**
 * The penalty physical abilities and skills take: the universal penalty plus
 * encumbrance.
 *
 * @param {number} universalPenalty
 * @param {number} encumbrance
 * @returns {number}
 */
export function calcPhysicalPenalty(universalPenalty, encumbrance) {
    return universalPenalty + encumbrance;
}

/**
 * The shock index: the percentage chance an actor's endurance beats a shock
 * roll, modelled as a normal distribution with mean 3.5 and deviation 1 per
 * point of universal penalty.
 *
 * @param {number} endurance
 * @param {number} universalPenalty
 * @returns {number} 0 to 100.
 */
export function calcShockIndex(endurance, universalPenalty) {
    return normProb(endurance, universalPenalty * 3.5, universalPenalty);
}

/** Abilities reduced by the physical penalty. */
const PHYSICAL_ABILITIES = ["strength", "stamina", "agility", "dexterity"];

/** Abilities reduced by the universal penalty. */
const UNIVERSAL_ABILITIES = [
    "intelligence",
    "aura",
    "will",
    "eyesight",
    "hearing",
    "smell",
    "voice",
];

/** Abilities no penalty reduces. */
const UNPENALIZED_ABILITIES = ["comeliness", "morality"];

/**
 * The effective value of each ability: its modified value rounded to a whole
 * number, less the penalty that applies to it, never below 0. Strength,
 * Stamina, Agility and Dexterity take the physical penalty; Intelligence, Aura,
 * Will, Eyesight, Hearing, Smell and Voice take the universal penalty;
 * Comeliness and Morality take none.
 *
 * @param {Object<string, number>} modified - Modified value of each ability, by name.
 * @param {number} physicalPenalty
 * @param {number} universalPenalty
 * @returns {Object<string, number>} Effective value of each ability, by name.
 */
export function calcEffectiveAbilities(modified, physicalPenalty, universalPenalty) {
    const effective = (ability, penalty) =>
        Math.max(Math.round(modified[ability] + Number.EPSILON) - penalty, 0);
    const result = {};
    for (const ability of PHYSICAL_ABILITIES) {
        result[ability] = effective(ability, physicalPenalty);
    }
    for (const ability of UNIVERSAL_ABILITIES) {
        result[ability] = effective(ability, universalPenalty);
    }
    for (const ability of UNPENALIZED_ABILITIES) {
        result[ability] = effective(ability, 0);
    }
    return result;
}

/**
 * Round a weight to two decimal places, absorbing floating-point drift.
 *
 * @param {number} weight
 * @returns {number}
 */
export function roundWeight(weight) {
    return Math.round((weight + Number.EPSILON) * 100) / 100;
}

/**
 * The total weight of the gear an actor carries. Gear on the person counts
 * when it is carried; gear in a container counts when that container is a
 * carried container item. Weight is multiplied by quantity, and the total is
 * rounded to two decimal places.
 *
 * Only `forEach` is used on the items, so an array or a Foundry collection both
 * work.
 *
 * @param {{forEach: Function}} items - Items with `type`, `id` and `system`.
 * @returns {number}
 */
export function calcTotalGearWeight(items) {
    const containerCarried = {};
    items.forEach((it) => {
        if (it.type === "containergear") {
            containerCarried[it.id] = it.system.isCarried;
        }
    });

    let totalWeight = 0;
    items.forEach((it) => {
        const itemData = it.system;
        if (it.type.endsWith("gear")) {
            // On-person gear carries its own flag; contained gear takes its
            // container's.
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
    });

    return roundWeight(totalWeight);
}

/**
 * Per-category carried gear weights and container capacities, computed without
 * touching the items. Items are visited in order. Gear inside a container
 * takes the container's carried flag as it stands at that point; a container
 * that is itself inside another container may therefore still hold its own
 * stored flag when its contents are visited. Weight is `weight * quantity`,
 * floored at 0, and counts toward a category only when the gear is carried.
 * A container's capacity is the sum of the weights of everything inside it,
 * carried or not. Gear naming a container that does not exist is reported in
 * `orphans`.
 *
 * Only `forEach` is used on the items, so an array or a Foundry collection both
 * work.
 *
 * @param {{forEach: Function}} items - Items with `type`, `id` and `system`.
 * @returns {{
 *   weapon: number, missile: number, armor: number, misc: number, total: number,
 *   carried: Object<string, boolean>,
 *   capacities: Object<string, number>,
 *   orphans: string[]
 * }} `carried` maps the id of each gear item held in an existing container to
 * the carried flag it inherits; `capacities` maps each container id to its
 * capacity; `orphans` lists the ids of gear to move back on-person.
 */
export function calcGearWeightTotals(items) {
    const byId = new Map();
    const carriedNow = new Map();
    const capacities = {};
    items.forEach((it) => {
        byId.set(it.id, it);
        carriedNow.set(it.id, it.system.isCarried);
        if (it.type === "containergear") capacities[it.id] = 0;
    });

    let weapon = 0;
    let missile = 0;
    let armor = 0;
    let misc = 0;
    const carried = {};
    const orphans = [];

    items.forEach((it) => {
        const itemData = it.system;
        const isGear = it.type.endsWith("gear");
        const cid = itemData.container;
        const inContainer = isGear && cid && cid !== "on-person";

        if (inContainer) {
            const container = byId.get(cid);
            if (container) {
                carriedNow.set(it.id, carriedNow.get(cid));
                carried[it.id] = carriedNow.get(cid);
            }
        }

        let weight = 0;
        switch (it.type) {
            case "weapongear":
            case "missilegear":
            case "armorgear":
            case "miscgear":
            case "containergear":
                weight = Math.max(itemData.weight * itemData.quantity, 0);
                if (carriedNow.get(it.id)) {
                    if (it.type === "weapongear") weapon += weight;
                    else if (it.type === "missilegear") missile += weight;
                    else if (it.type === "armorgear") armor += weight;
                    else misc += weight;
                }
                break;
        }

        if (inContainer) {
            if (byId.has(cid)) {
                capacities[cid] = roundWeight(capacities[cid] + weight);
            } else {
                orphans.push(it.id);
            }
        }
    });

    weapon = roundWeight(weapon);
    missile = roundWeight(missile);
    armor = roundWeight(armor);
    misc = roundWeight(misc);

    return {
        weapon,
        missile,
        armor,
        misc,
        total: roundWeight(weapon + missile + armor + misc),
        carried,
        capacities,
        orphans,
    };
}

/**
 * The current Move speed. A base move under 25 is taken to be specified in
 * hexes, so the physical penalty applies one for one; a base of 25 or more is
 * in feet, so each penalty point costs 5. Move cannot go below 0.
 *
 * @param {number} move - Move after modifiers.
 * @param {number} baseMove - The unmodified base move, which fixes the unit.
 * @param {number} physicalPenalty
 * @returns {number}
 */
export function calcEffectiveMove(move, baseMove, physicalPenalty) {
    return Math.max(move - (baseMove < 25 ? physicalPenalty : physicalPenalty * 5), 0);
}

/**
 * The effect of a universal or physical penalty on a mastery level. Penalties
 * are low whole numbers and a mastery level is a percentage scale, so each
 * penalty point costs 5.
 *
 * @param {number|undefined} penalty
 * @returns {number}
 */
export function calcPenaltyPct(penalty) {
    return (penalty || 0) * 5;
}

/**
 * The effective mastery level of a skill: its mastery level less the penalty
 * that applies to its type, plus the adjustment for any Active Effect that
 * changed the abilities its skill base derives from.
 *
 * @param {number} masteryLevel
 * @param {number} penaltyPct - From `calcPenaltyPct`.
 * @param {number} sbModifier - 5 times the change in the skill base.
 * @returns {number}
 */
export function calcSkillEml(masteryLevel, penaltyPct, sbModifier) {
    return masteryLevel - penaltyPct + sbModifier;
}

/**
 * The effective mastery level of a psionic talent: its mastery level less the
 * penalty.
 *
 * @param {number} masteryLevel
 * @param {number} penaltyPct - From `calcPenaltyPct`.
 * @returns {number}
 */
export function calcPsionicEml(masteryLevel, penaltyPct) {
    return masteryLevel - penaltyPct;
}

/**
 * The effective mastery level of a spell: its convocation skill's, less 5 for
 * each level of the spell.
 *
 * @param {number} skillEml
 * @param {number} spellLevel
 * @returns {number}
 */
export function calcSpellEml(skillEml, spellLevel) {
    return skillEml - spellLevel * 5;
}

/**
 * The effective mastery level of an invocation: its ritual skill's, less 5 for
 * each circle of the invocation.
 *
 * @param {number} skillEml
 * @param {number} circle
 * @returns {number}
 */
export function calcInvocationEml(skillEml, circle) {
    return skillEml - circle * 5;
}

/**
 * A melee weapon's attack mastery level: its skill's effective mastery level,
 * the weapon's attack bonus and modifier, and the actor-wide modifier from
 * Active Effects. A missing skill level or bonus counts as 0.
 *
 * @param {number} [skillEml]
 * @param {number} [attackBonus]
 * @param {number} [attackModifier]
 * @param {number} [effectModifier] - From `actorAMLModifier`.
 * @returns {number}
 */
export function calcWeaponAml(skillEml, attackBonus, attackModifier, effectModifier = 0) {
    return (skillEml || 0) + (attackBonus || 0) + (attackModifier || 0) + effectModifier;
}

/**
 * A melee weapon's defense mastery level: its skill's effective mastery level,
 * the weapon's defense bonus, and the actor-wide modifier from Active Effects.
 * A missing skill level or bonus counts as 0.
 *
 * @param {number} [skillEml]
 * @param {number} [defenseBonus]
 * @param {number} [effectModifier] - From `actorDMLModifier`.
 * @returns {number}
 */
export function calcWeaponDml(skillEml, defenseBonus, effectModifier = 0) {
    return (skillEml || 0) + (defenseBonus || 0) + effectModifier;
}

/**
 * A missile weapon's attack mastery level: its skill's effective mastery
 * level, the weapon's attack modifier, and the actor-wide modifier from Active
 * Effects. A missing skill level or modifier counts as 0.
 *
 * @param {number} [skillEml]
 * @param {number} [attackModifier]
 * @param {number} [effectModifier] - From `actorAMLModifier`.
 * @returns {number}
 */
export function calcMissileAml(skillEml, attackModifier, effectModifier = 0) {
    return (skillEml || 0) + (attackModifier || 0) + effectModifier;
}

/**
 * A mastery level is never below 5.
 *
 * @param {number} masteryLevel
 * @returns {number}
 */
export function clampMasteryLevel(masteryLevel) {
    return Math.max(masteryLevel, 5);
}

/**
 * The severity code shown for an injury level: "" for none, "M1" for minor,
 * "S2" and "S3" for serious, "G4" and above for grievous.
 *
 * @param {number} injuryLevel
 * @returns {string}
 */
export function injurySeverity(injuryLevel) {
    if (injuryLevel === 0) return "";
    if (injuryLevel == 1) return "M1";
    if (injuryLevel <= 3) return `S${injuryLevel}`;
    return `G${injuryLevel}`;
}
