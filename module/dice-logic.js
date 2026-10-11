/**
 * Pure dice and combat calculations. Nothing here touches Foundry globals, so
 * every function can be unit tested without a running Foundry instance.
 *
 * @module dice-logic
 */

/**
 * Clamp a target number to 5..95, so a roll always has a 5% chance of success
 * and a 5% chance of failure.
 *
 * @param {number} baseTarget - Target number with any modifier already applied.
 * @returns {number}
 */
export function clampTarget(baseTarget) {
    return Math.max(Math.min(baseTarget, 95), 5);
}

/**
 * Interpret a die roll against a target number.
 *
 * The modifier applies to the target, not to the roll. A d100 roll is critical
 * when the total is a multiple of 5; a d6 roll is never critical. The clamp to
 * 5..95 applies to both die types.
 *
 * @param {"d6"|"d100"} diceType
 * @param {number} rollTotal - The die roll total.
 * @param {number} target - Target number before the modifier.
 * @param {number} [modifier=0] - Modifier applied to the target.
 * @returns {{ targetNum: number, isCapped: boolean, isCritical: boolean, isSuccess: boolean, description: string }}
 */
export function interpretRoll(diceType, rollTotal, target, modifier = 0) {
    const baseTargetNum = target + modifier;
    const targetNum = clampTarget(baseTargetNum);
    const isCapped = baseTargetNum !== targetNum;

    if (diceType === "d100") {
        const isCritical = rollTotal % 5 === 0;
        const isSuccess = rollTotal <= targetNum;
        const levelDesc = isCritical ? "Critical" : "Marginal";
        return {
            targetNum,
            isCapped,
            isCritical,
            isSuccess,
            description: `${levelDesc} ${isSuccess ? "Success" : "Failure"}`,
        };
    }

    const isSuccess = rollTotal <= targetNum;
    return {
        targetNum,
        isCapped,
        isCritical: false,
        isSuccess,
        description: isSuccess ? "Success" : "Failure",
    };
}

/**
 * The armor value protecting against an aspect. Any aspect other than Blunt,
 * Edged or Piercing is treated as Fire.
 *
 * @param {object} armorLocationData - An armor location's system data.
 * @param {string} aspect - "Blunt", "Edged", "Piercing" or "Fire".
 * @returns {number}
 */
export function getArmorValue(armorLocationData, aspect) {
    if (aspect === "Blunt") {
        return armorLocationData.blunt;
    } else if (aspect === "Edged") {
        return armorLocationData.edged;
    } else if (aspect === "Piercing") {
        return armorLocationData.piercing;
    }
    return armorLocationData.fire;
}

/**
 * The injury level code an effective impact produces at a location.
 *
 * @param {number} effectiveImpact - Impact after armor, zero or more.
 * @param {{ei1: string, ei5: string, ei9: string, ei13: string, ei17: string}} eiTable -
 *   The location's effective-impact table.
 * @returns {string} "NA" for no effect, else the table's code ("M1", "S2", "S3",
 *   "G4", "K4", "G5" or "K5").
 */
export function injuryLevelText(effectiveImpact, eiTable) {
    if (effectiveImpact === 0) return "NA";
    if (effectiveImpact >= 17) return eiTable.ei17;
    if (effectiveImpact >= 13) return eiTable.ei13;
    if (effectiveImpact >= 9) return eiTable.ei9;
    if (effectiveImpact >= 5) return eiTable.ei5;
    return eiTable.ei1;
}

/**
 * Turn an injury level code into its numeric level and flags. A code that is
 * not recognised yields level 0.
 *
 * @param {string} levelText
 * @param {object} [options]
 * @param {boolean} [options.enableAmputate] - The amputation rule is on.
 * @param {boolean} [options.isAmputatable] - The location can be amputated.
 * @param {string} [options.aspect] - Only "Edged" amputates.
 * @returns {{ injuryLevel: number, isKillShot: boolean, isAmputate: boolean }}
 */
export function parseInjuryLevel(levelText, options = {}) {
    const { enableAmputate = false, isAmputatable = false, aspect = "" } = options;
    const amputate = enableAmputate && isAmputatable && aspect === "Edged";
    switch (levelText) {
        case "M1":
            return { injuryLevel: 1, isKillShot: false, isAmputate: false };
        case "S2":
            return { injuryLevel: 2, isKillShot: false, isAmputate: false };
        case "S3":
            return { injuryLevel: 3, isKillShot: false, isAmputate: false };
        case "G4":
            return { injuryLevel: 4, isKillShot: false, isAmputate: amputate };
        case "K4":
            return { injuryLevel: 4, isKillShot: true, isAmputate: amputate };
        case "G5":
            return { injuryLevel: 5, isKillShot: false, isAmputate: amputate };
        case "K5":
            return { injuryLevel: 5, isKillShot: true, isAmputate: amputate };
        default:
            return { injuryLevel: 0, isKillShot: false, isAmputate: false };
    }
}

/**
 * Bloodloss, fumble and stumble consequences of an injury (the optional
 * Bloodloss and Limb Injuries rules).
 *
 * @param {number} injuryLevel
 * @param {string} aspect
 * @param {{isFumble: boolean, isStumble: boolean}} locationFlags - From the armor location.
 * @param {{enableBloodloss: boolean, enableLimbInjuries: boolean}} settings
 * @returns {{ isBleeder: boolean, isFumble: boolean, isFumbleRoll: boolean, isStumble: boolean, isStumbleRoll: boolean }}
 */
export function injuryEffects(injuryLevel, aspect, locationFlags, settings) {
    const { enableBloodloss, enableLimbInjuries } = settings;
    const result = {
        isBleeder: enableBloodloss && injuryLevel >= 4 && aspect != "Fire",
        isFumble: false,
        isFumbleRoll: false,
        isStumble: false,
        isStumbleRoll: false,
    };

    if (locationFlags.isFumble) {
        result.isFumble = enableLimbInjuries && injuryLevel >= 4;
        result.isFumbleRoll = enableLimbInjuries || (!result.isFumble && injuryLevel >= 2);
    }

    if (locationFlags.isStumble) {
        result.isStumble = enableLimbInjuries && injuryLevel >= 4;
        result.isStumbleRoll = enableLimbInjuries || (!result.isStumble && injuryLevel >= 2);
    }

    return result;
}

/**
 * The injury a blow causes at an armor location, from impact through armor to
 * level and consequences.
 *
 * @param {number|string} impact - Impact before armor.
 * @param {string} aspect
 * @param {object} armorLocationData - The armor location's system data.
 * @param {{enableAmputate: boolean, enableBloodloss: boolean, enableLimbInjuries: boolean}} settings
 * @returns {object} armorValue, effectiveImpact, injuryLevelText, injuryLevel,
 *   isKillShot, isAmputate, isInjured, and, when injured, the injuryEffects fields.
 */
export function calcInjury(impact, aspect, armorLocationData, settings) {
    const armorValue = getArmorValue(armorLocationData, aspect);
    const effectiveImpact = Math.max(impact - armorValue, 0);
    const levelText = injuryLevelText(effectiveImpact, armorLocationData.effectiveImpact);
    const { injuryLevel, isKillShot, isAmputate } = parseInjuryLevel(levelText, {
        enableAmputate: settings.enableAmputate,
        isAmputatable: armorLocationData.isAmputate,
        aspect,
    });

    const result = {
        armorValue,
        effectiveImpact,
        injuryLevelText: levelText,
        injuryLevel,
        isKillShot,
        isAmputate,
        isInjured: injuryLevel > 0,
    };
    if (injuryLevel > 0) {
        Object.assign(result, injuryEffects(injuryLevel, aspect, armorLocationData, settings));
    }
    return result;
}

/**
 * Choose the armor location a blow lands on: the one named, or, for "Random",
 * a weighted pick using the aim's probability weights.
 *
 * Only `forEach` is used on the items, so an array or a Foundry collection both
 * work. When every weight is zero the first armor location is chosen, and the
 * random source is not consulted.
 *
 * @param {string} location - A location name, or "Random" in any case.
 * @param {string} aim - "High", "Mid" or "Low" in any case.
 * @param {{forEach: Function}} items - Items holding the armor locations.
 * @param {() => number} [random] - Returns a number in [0, 1).
 * @returns {object|null} The armor location item, or null when there is none to pick.
 */
export function selectArmorLocation(location, aim, items, random = Math.random) {
    const lcAim = aim.toLowerCase();
    let result = null;
    if (location.toLowerCase() === "random") {
        let totalWeight = 0;
        let numArmorLocations = 0;
        items.forEach((it) => {
            if (it.type === "armorlocation") {
                totalWeight += it.system.probWeight[lcAim];
                numArmorLocations++;
            }
        });

        if (numArmorLocations === 0) {
            return null;
        }

        let rollWeight = 0;
        if (totalWeight > 0) {
            rollWeight = Math.floor(random() * totalWeight) + 1;
        }

        let done = false;
        items.forEach((it) => {
            if (!done && it.type === "armorlocation") {
                rollWeight -= it.system.probWeight[lcAim];
                if (rollWeight <= 0) {
                    result = it;
                    done = true;
                }
            }
        });
    } else {
        items.forEach((it) => {
            if (result === null && it.type === "armorlocation" && it.name === location) {
                result = it;
            }
        });
    }

    return result;
}

/**
 * The impact of each aspect of a named weapon, and the default aspect: the one
 * with the greatest impact, preferring Piercing, then Edged, then Blunt on a
 * tie. Fire and Other are always offered with an impact of 0. This is the
 * damage roll's list: every aspect is offered, including those the attack
 * dialog (`weaponAspects`) leaves out as unavailable, so that a chosen aspect
 * always has an impact to add. The weapon is the one with `weaponId` when it
 * is given; otherwise the first weapon carrying the name.
 *
 * Only `forEach` is used on the items, so an array or a Foundry collection both
 * work.
 *
 * @param {string} weaponName
 * @param {{forEach: Function}} items - Items that include `weapongear` items.
 * @param {string} [weaponId] - Id of the weapon, which tells apart weapons that share a name.
 * @returns {{ defaultAspect: string, aspects: Object<string, number> }}
 */
export function calcWeaponAspect(weaponName, items, weaponId) {
    const result = {
        defaultAspect: "Other",
        aspects: {
            Blunt: 0,
            Edged: 0,
            Piercing: 0,
            Fire: 0,
            Other: 0,
        },
    };

    let found = false;
    items.forEach((it) => {
        if (found || it.type !== "weapongear") return;
        if (weaponId ? it.id === weaponId : it.name === weaponName) {
            found = true;
            const itemData = it.system;
            const maxImpact = Math.max(itemData.blunt, itemData.piercing, itemData.edged, 0);
            result.aspects["Blunt"] = itemData.blunt;
            result.aspects["Edged"] = itemData.edged;
            result.aspects["Piercing"] = itemData.piercing;
            if (maxImpact === itemData.piercing) {
                result.defaultAspect = "Piercing";
            } else if (maxImpact === itemData.edged) {
                result.defaultAspect = "Edged";
            } else if (maxImpact === itemData.blunt) {
                result.defaultAspect = "Blunt";
            } else {
                result.defaultAspect = "Other";
            }
        }
    });

    return result;
}

/**
 * The aspects a weapon offers, from its own impact values. An impact below
 * zero means the aspect is unavailable and is left out. The default aspect is
 * the one with the greatest impact, preferring Piercing, then Edged, then
 * Blunt on a tie; it is null when no aspect is available. This is the attack
 * dialog's list, where a negative impact means the weapon cannot attack that
 * way; the damage roll's list is `calcWeaponAspect`. The tie order is the same.
 *
 * @param {{blunt: number, edged: number, piercing: number}} weaponData - A weapon's system data.
 * @returns {{ defaultAspect: string|null, aspects: Object<string, number> }}
 */
export function weaponAspects(weaponData) {
    const data = weaponData;
    const result = {
        defaultAspect: null,
        aspects: {},
    };

    const maxImpact = Math.max(data.blunt, data.piercing, data.edged);
    if (maxImpact >= 0) {
        if (data.blunt >= 0) result.aspects["Blunt"] = data.blunt;
        if (data.edged >= 0) result.aspects["Edged"] = data.edged;
        if (data.piercing >= 0) result.aspects["Piercing"] = data.piercing;
        if (maxImpact === data.piercing) {
            result.defaultAspect = "Piercing";
        } else if (maxImpact === data.edged) {
            result.defaultAspect = "Edged";
        } else if (maxImpact === data.blunt) {
            result.defaultAspect = "Blunt";
        }
    }

    return result;
}
