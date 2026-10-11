/**
 * Pure combat calculations. Nothing here touches Foundry globals, so every
 * function can be unit tested without a running Foundry instance. Chat cards,
 * dialogs, tokens and hooks stay in combat.js.
 *
 * @module combat-logic
 */

import { HM3 } from "./config.js";

/**
 * An EML halved against a missile: half, rounded to the nearest whole number
 * and never below 5. Applies to a dodge against a high-velocity missile and to
 * a block with a non-shield weapon.
 *
 * @param {number} eml
 * @returns {number}
 */
export function missileHalvedEml(eml) {
    return Math.max(Math.round(eml / 2), 5);
}

/**
 * Whether a missile weapon is high-velocity, judged by its name.
 *
 * @param {string} weaponName Name of the attacker's missile weapon
 * @returns {boolean}
 */
export function isHighVelocityMissile(weaponName) {
    return /\bbow\b|shortbow|longbow|crossbow|\bsling\b|\barrow\b|\bbolt\b|\bbullet\b/i.test(
        weaponName,
    );
}

/**
 * The EML a defender dodges at. Dodging a high-velocity missile uses half the
 * dodge EML, rounded to the nearest whole number and never below 5, as for a
 * missile blocked with a non-shield weapon.
 *
 * @param {number} dodgeEml The defender's full dodge EML
 * @param {string} type Type of attack: "melee" or "missile"
 * @param {string} weaponName Name of the attacker's weapon
 * @returns {number}
 */
export function dodgeTargetEml(dodgeEml, type, weaponName) {
    if (type === "missile" && isHighVelocityMissile(weaponName)) {
        return missileHalvedEml(dodgeEml);
    }
    return dodgeEml;
}

/**
 * The dodge EML after the defender's additional modifier, before the roll
 * clamps it to the 5 to 95 range every test uses.
 *
 * @param {number} dodgeEml The defender's full dodge EML
 * @param {string} type Type of attack: "melee" or "missile"
 * @param {string} weaponName Name of the attacker's weapon
 * @param {number} addlModifier Additional modifier from the defence dialog
 * @returns {number}
 */
export function dodgeModifiedEml(dodgeEml, type, weaponName, addlModifier) {
    return dodgeTargetEml(dodgeEml, type, weaponName) + addlModifier;
}

/**
 * The dice formula for an impact roll: `<n>d6`, with any additional impact
 * appended as a signed modifier. Zero or fewer dice is "no".
 *
 * @param {number} numDice Number of 6-sided dice to include in the formula
 * @param {number} addlImpact Any additional impact to include in the formula
 * @returns {string}
 */
export function diceFormula(numDice, addlImpact) {
    if (numDice <= 0) {
        return "no";
    }
    if (addlImpact) {
        return `${numDice}d6${addlImpact < 0 ? "-" : "+"}${Math.abs(addlImpact)}`;
    } else {
        return `${numDice}d6`;
    }
}

/**
 * Select the outcome for a combat result from a combat table. "ignore" is
 * indexed by the attack result alone; every other defence by
 * `<attack>:<defence>`.
 *
 * @param {Object} table - `HM3.meleeCombatTable` or `HM3.missileCombatTable`.
 * @param {string} atkResult - "cs", "cf", "ms" or "mf".
 * @param {string} defResult - "cs", "cf", "ms" or "mf".
 * @param {string} defense - "ignore", "block", "counterstrike" or "dodge".
 * @returns {Object|null} The outcome, or null when the defence or the pairing
 *   has none.
 */
export function combatOutcome(table, atkResult, defResult, defense) {
    const defenseTable = table[defense];
    if (!defenseTable) return null;
    const index = defense === "ignore" ? atkResult : `${atkResult}:${defResult}`;
    return defenseTable[index] ?? null;
}

/**
 * The result of melee combat: the table outcome and its description.
 *
 * @param {String} atkResult The result from the attack, comprised of "cs", "cf", "ms", or "mf"
 * @param {String} defResult The result from the defense, comprised of "cs", "cf", "ms", or "mf"
 * @param {String} defense The type of defense: "ignore", "block", "counterstrike", or "dodge"
 * @param {Number} atkAddlImpact Additional impact for the attacker
 * @param {Number} defAddlImpact If counterstrike defense, the additional impact for the defender (counterstriker)
 */
export function meleeCombatResult(
    atkResult,
    defResult,
    defense,
    atkAddlImpact = 0,
    defAddlImpact = 0,
) {
    const outcome = combatOutcome(HM3.meleeCombatTable, atkResult, defResult, defense);
    if (!outcome) return null;

    const result = { outcome: outcome, desc: "Attack misses.", csDesc: "Counterstrike misses." };

    if (defense !== "counterstrike") {
        if (outcome.atkDice) {
            result.desc = `Attacker strikes for ${diceFormula(outcome.atkDice, atkAddlImpact)} impact.`;
        } else if (outcome.atkFumble && outcome.defFumble) {
            result.desc = "Both Attacker and Defender Fumble";
        } else if (outcome.atkFumble) {
            result.desc = `Attacker fumbles.`;
        } else if (outcome.defFumble) {
            result.desc = `Defender fumbles.`;
        } else if (outcome.defStumble && outcome.atkStumble) {
            result.desc = `Both attacker and defender stumble.`;
        } else if (outcome.atkStumble) {
            result.desc = `Attacker stumbles.`;
        } else if (outcome.defStumble) {
            result.desc = `Defender stumbles.`;
        } else if (outcome.block) {
            result.desc = `Attack blocked.`;
        } else if (outcome.dta) {
            result.desc = `Defender gains Tactical Advantage.`;
        }
    } else {
        if (outcome.atkDice) {
            result.desc = `Attacker strikes for ${diceFormula(outcome.atkDice, atkAddlImpact)} impact.`;
        } else if (outcome.atkFumble) {
            result.desc = `Attacker fumbles.`;
        } else if (outcome.atkStumble) {
            result.desc = `Attacker stumbles.`;
        }

        if (outcome.defDice) {
            result.csDesc = `Counterstriker strikes for ${diceFormula(outcome.defDice, defAddlImpact)} impact.`;
        } else if (outcome.defFumble) {
            result.csDesc = "Counterstriker fumbles.";
        } else if (outcome.defStumble) {
            result.csDesc = "Counterstriker stumbles.";
        } else if (outcome.block) {
            result.desc = "Attacker blocked.";
            result.csDesc = `Counterstriker blocked.`;
        } else if (outcome.dta) {
            result.csDesc = `Counterstriker achieves Tactical Advantage!`;
        } else if (outcome.miss) {
            result.csDesc = `Counterstrike misses.`;
        }
    }

    return result;
}

/**
 * The result of missile combat: the table outcome and its description.
 *
 * @param {String} atkResult The result from the attack, comprised of "cs", "cf", "ms", or "mf"
 * @param {String} defResult The result from the defense, comprised of "cs", "cf", "ms", or "mf"
 * @param {String} defense The type of defense: "ignore", "block", "counterstrike", or "dodge"
 * @param {Number} atkAddlImpact Any additional impact
 */
export function missileCombatResult(atkResult, defResult, defense, atkAddlImpact = 0) {
    const outcome = combatOutcome(HM3.missileCombatTable, atkResult, defResult, defense);
    if (!outcome) return null;

    const result = { outcome: outcome, desc: "No result" };

    if (outcome.atkDice && !outcome.defDice) {
        result.desc = `Missile strikes for ${diceFormula(outcome.atkDice, atkAddlImpact)} impact.`;
    } else if (outcome.wild) {
        result.desc = `Missile goes wild; effects at GM discretion.`;
    } else if (outcome.block) {
        result.desc = `Defender blocks missile!`;
    } else if (outcome.miss) {
        result.desc = `Missile missed.`;
    }

    return result;
}

/**
 * The two-letter code for a test roll, as the combat tables index it: "c" or
 * "m" for critical or marginal, then "s" or "f" for success or failure.
 *
 * @param {{isCritical: boolean, isSuccess: boolean}} roll
 * @returns {"cs"|"cf"|"ms"|"mf"}
 */
export function rollResultCode(roll) {
    return `${roll.isCritical ? "c" : "m"}${roll.isSuccess ? "s" : "f"}`;
}

/**
 * The defence modifier for being outnumbered: 10 off for each whole attacker
 * beyond the first. An outnumbered count of 1 or less costs nothing.
 *
 * @param {number|undefined} outnumbered - The actor's outnumbered count.
 * @returns {number} Zero or a negative multiple of 10.
 */
export function outnumberedModifier(outnumbered) {
    if (!(outnumbered > 1)) return 0;
    return Math.floor(outnumbered - 1) * -10 + 0;
}

/**
 * The weapon with the greatest impact in any aspect. The first of equals wins,
 * and a weapon whose impacts are all below 0 never wins.
 *
 * @param {Array<{system: {blunt: number, edged: number, piercing: number}}>} weapons
 * @returns {Object|null} The weapon, or null when there are none.
 */
export function highestImpactWeapon(weapons) {
    let best = null;
    let maxImpact = -1;
    weapons.forEach((w) => {
        const data = w.system;
        const impactMax = Math.max(data.blunt, data.edged, data.piercing);
        if (impactMax > maxImpact) {
            maxImpact = impactMax;
            best = w;
        }
    });
    return best;
}

/**
 * The range band a distance falls in for a missile weapon. A distance beyond
 * the extreme range is still the extreme band, flagged as exceeding it.
 *
 * @param {number} distance - Distance to the target.
 * @param {{short: number, medium: number, long: number, extreme: number}} range
 *   The greatest distance of each band.
 * @returns {{band: "short"|"medium"|"long"|"extreme", exceedsExtreme: boolean}}
 */
export function missileRangeBand(distance, range) {
    if (distance <= range.short) return { band: "short", exceedsExtreme: false };
    if (distance <= range.medium) return { band: "medium", exceedsExtreme: false };
    if (distance <= range.long) return { band: "long", exceedsExtreme: false };
    return { band: "extreme", exceedsExtreme: distance > range.extreme };
}

/**
 * The attack modifier for a missile range band, given a dialog range label
 * that begins with the band name ("Short (10)", "Medium (20)", ...). Short is
 * 0, medium -20, long -40; anything else is extreme, -80.
 *
 * @param {string} rangeLabel
 * @returns {{range: "Short"|"Medium"|"Long"|"Extreme", rangeMod: number}}
 */
export function missileRangeModifier(rangeLabel) {
    if (rangeLabel.startsWith("Short")) return { range: "Short", rangeMod: 0 };
    if (rangeLabel.startsWith("Medium")) return { range: "Medium", rangeMod: -20 };
    if (rangeLabel.startsWith("Long")) return { range: "Long", rangeMod: -40 };
    return { range: "Extreme", rangeMod: -80 };
}
