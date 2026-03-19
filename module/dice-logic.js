/**
 * Pure business logic for HarnMaster dice/combat calculations.
 *
 * These functions have no dependency on Foundry VTT globals and can be
 * unit tested without a running Foundry instance.
 *
 * @module dice-logic
 */

/* ----------------------------------------- */
/*  Roll Result Interpretation               */
/* ----------------------------------------- */

/**
 * Interpret a d100 roll result against a target number.
 *
 * @param {number} rollTotal - The die roll total (1-100).
 * @param {number} rawTarget - Raw target number before clamping.
 * @param {number} [modifier=0] - Modifier applied to target.
 * @returns {{ targetNum: number, isCapped: boolean, isCritical: boolean, isSuccess: boolean, description: string }}
 */
export function interpretD100Roll(rollTotal, rawTarget, modifier = 0) {
    const baseTarget = rawTarget + modifier;
    // Always 5% chance of success/failure
    const targetNum = Math.max(Math.min(baseTarget, 95), 5);
    const isCritical = (rollTotal % 5) === 0;
    const isSuccess = rollTotal <= targetNum;
    const levelDesc = isCritical ? "Critical" : "Marginal";
    const description = `${levelDesc} ${isSuccess ? "Success" : "Failure"}`;

    return {
        targetNum,
        isCapped: baseTarget !== targetNum,
        isCritical,
        isSuccess,
        description,
    };
}

/**
 * Interpret a d6 roll result against a target number.
 *
 * @param {number} rollTotal - The die roll total.
 * @param {number} targetNum - Target number to roll at or under.
 * @returns {{ isSuccess: boolean, description: string }}
 */
export function interpretD6Roll(rollTotal, targetNum) {
    const isSuccess = rollTotal <= targetNum;
    return {
        isSuccess,
        isCritical: false,
        description: isSuccess ? "Success" : "Failure",
    };
}

/* ----------------------------------------- */
/*  Injury Calculation                       */
/* ----------------------------------------- */

/**
 * Get armor value for a given aspect from an armor location.
 *
 * @param {object} armorLocationData - The armor location's system data.
 * @param {string} aspect - "Blunt", "Edged", "Piercing", or "Fire".
 * @returns {number} Armor protection value.
 */
export function getArmorValue(armorLocationData, aspect) {
    switch (aspect) {
        case "Blunt":
            return armorLocationData.blunt;
        case "Edged":
            return armorLocationData.edged;
        case "Piercing":
            return armorLocationData.piercing;
        default:
            return armorLocationData.fire;
    }
}

/**
 * Determine the injury level text from effective impact and armor location data.
 *
 * @param {number} effectiveImpact
 * @param {object} eiTable - The effectiveImpact table from armor location data
 *                          (with keys ei1, ei5, ei9, ei13, ei17).
 * @returns {string} Injury level text: "NA", "M1", "S2", "S3", "G4", "K4", "G5", or "K5".
 */
export function determineInjuryLevelText(effectiveImpact, eiTable) {
    if (effectiveImpact === 0) return "NA";
    if (effectiveImpact >= 17) return eiTable.ei17;
    if (effectiveImpact >= 13) return eiTable.ei13;
    if (effectiveImpact >= 9) return eiTable.ei9;
    if (effectiveImpact >= 5) return eiTable.ei5;
    return eiTable.ei1;
}

/**
 * Parse an injury level text code into numeric level and flags.
 *
 * @param {string} levelText - e.g., "NA", "M1", "S2", "S3", "G4", "K4", "G5", "K5"
 * @param {object} options
 * @param {boolean} options.enableAmputate - Whether amputation rules are enabled.
 * @param {boolean} options.isAmputatable - Whether this location can be amputated.
 * @param {string} options.aspect - Weapon aspect (only "Edged" can amputate).
 * @returns {{ injuryLevel: number, isKillShot: boolean, isAmputate: boolean }}
 */
export function parseInjuryLevel(levelText, { enableAmputate = false, isAmputatable = false, aspect = "" } = {}) {
    const canAmputate = enableAmputate && isAmputatable && aspect === "Edged";
    switch (levelText) {
        case "M1":
            return { injuryLevel: 1, isKillShot: false, isAmputate: false };
        case "S2":
            return { injuryLevel: 2, isKillShot: false, isAmputate: false };
        case "S3":
            return { injuryLevel: 3, isKillShot: false, isAmputate: false };
        case "G4":
            return { injuryLevel: 4, isKillShot: false, isAmputate: canAmputate };
        case "K4":
            return { injuryLevel: 4, isKillShot: true, isAmputate: canAmputate };
        case "G5":
            return { injuryLevel: 5, isKillShot: false, isAmputate: canAmputate };
        case "K5":
            return { injuryLevel: 5, isKillShot: true, isAmputate: canAmputate };
        default:
            return { injuryLevel: 0, isKillShot: false, isAmputate: false };
    }
}

/**
 * Determine bloodloss, fumble, and stumble effects from an injury.
 *
 * @param {number} injuryLevel
 * @param {string} aspect - Weapon aspect.
 * @param {object} locationFlags - { isFumble, isStumble } from armor location data.
 * @param {object} settings - { enableBloodloss, enableLimbInjuries }
 * @returns {{ isBleeder: boolean, isFumble: boolean, isFumbleRoll: boolean, isStumble: boolean, isStumbleRoll: boolean }}
 */
export function determineInjuryEffects(injuryLevel, aspect, locationFlags, settings) {
    const { enableBloodloss = false, enableLimbInjuries = false } = settings;
    const result = {
        isBleeder: false,
        isFumble: false,
        isFumbleRoll: false,
        isStumble: false,
        isStumbleRoll: false,
    };

    if (injuryLevel <= 0) return result;

    // Bloodloss (Combat 14)
    result.isBleeder = enableBloodloss && injuryLevel >= 4 && aspect !== "Fire";

    // Limb Injuries - Fumble (Combat 14)
    if (locationFlags.isFumble) {
        result.isFumble = enableLimbInjuries && injuryLevel >= 4;
        result.isFumbleRoll = enableLimbInjuries || (!result.isFumble && injuryLevel >= 2);
    }

    // Limb Injuries - Stumble (Combat 14)
    if (locationFlags.isStumble) {
        result.isStumble = enableLimbInjuries && injuryLevel >= 4;
        result.isStumbleRoll = enableLimbInjuries || (!result.isStumble && injuryLevel >= 2);
    }

    return result;
}

/* ----------------------------------------- */
/*  Hit Location                             */
/* ----------------------------------------- */

/**
 * Select a hit location from armor location items by name or weighted random.
 *
 * @param {string} location - Location name, or "Random" for weighted random selection.
 * @param {string} aim - "High", "Mid", or "Low".
 * @param {Array} items - Array of item objects with type and system data.
 * @param {number} [randomValue] - Random value 0-1 (for testability). If omitted, uses Math.random().
 * @returns {object|null} The selected armor location item, or null if not found.
 */
export function selectHitLocation(location, aim, items, randomValue = undefined) {
    const lcAim = aim.toLowerCase();
    const armorLocations = items.filter(it => it.type === "armorlocation");

    if (armorLocations.length === 0) return null;

    if (location.toLowerCase() !== "random") {
        return armorLocations.find(it => it.name === location) || null;
    }

    // Weighted random selection
    let totalWeight = 0;
    for (const it of armorLocations) {
        totalWeight += it.system.probWeight[lcAim];
    }

    let rollWeight = 0;
    if (totalWeight > 0) {
        const rand = randomValue !== undefined ? randomValue : Math.random();
        rollWeight = Math.floor(rand * totalWeight) + 1;
    }

    for (const it of armorLocations) {
        rollWeight -= it.system.probWeight[lcAim];
        if (rollWeight <= 0) return it;
    }

    return armorLocations[0]; // Fallback if all weights are zero
}

/* ----------------------------------------- */
/*  Weapon Aspect                            */
/* ----------------------------------------- */

/**
 * Determine the default aspect and impact values for a weapon.
 *
 * @param {string} weaponName - Name of the weapon to find.
 * @param {Array} items - Array of item objects.
 * @returns {{ defaultAspect: string, aspects: object }}
 */
export function calcWeaponAspect(weaponName, items) {
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

    const weapon = items.find(
        (it) => it.type === "weapongear" && it.name === weaponName,
    );
    if (!weapon) return result;

    const data = weapon.system;
    const maxImpact = Math.max(data.blunt, data.piercing, data.edged, 0);
    result.aspects.Blunt = data.blunt;
    result.aspects.Edged = data.edged;
    result.aspects.Piercing = data.piercing;

    if (maxImpact === data.piercing) {
        result.defaultAspect = "Piercing";
    } else if (maxImpact === data.edged) {
        result.defaultAspect = "Edged";
    } else if (maxImpact === data.blunt) {
        result.defaultAspect = "Blunt";
    }

    return result;
}
