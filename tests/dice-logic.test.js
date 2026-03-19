import { describe, it, expect } from "vitest";
import {
    interpretD100Roll,
    interpretD6Roll,
    getArmorValue,
    determineInjuryLevelText,
    parseInjuryLevel,
    determineInjuryEffects,
    selectHitLocation,
    calcWeaponAspect,
} from "../module/dice-logic.js";

/* ----------------------------------------- */
/*  Roll Interpretation                      */
/* ----------------------------------------- */

describe("interpretD100Roll", () => {
    it("critical success when roll <= target and divisible by 5", () => {
        const r = interpretD100Roll(25, 60);
        expect(r.isSuccess).toBe(true);
        expect(r.isCritical).toBe(true);
        expect(r.description).toBe("Critical Success");
    });

    it("marginal success when roll <= target and not divisible by 5", () => {
        const r = interpretD100Roll(23, 60);
        expect(r.isSuccess).toBe(true);
        expect(r.isCritical).toBe(false);
        expect(r.description).toBe("Marginal Success");
    });

    it("critical failure when roll > target and divisible by 5", () => {
        const r = interpretD100Roll(75, 60);
        expect(r.isSuccess).toBe(false);
        expect(r.isCritical).toBe(true);
        expect(r.description).toBe("Critical Failure");
    });

    it("marginal failure when roll > target and not divisible by 5", () => {
        const r = interpretD100Roll(73, 60);
        expect(r.isSuccess).toBe(false);
        expect(r.isCritical).toBe(false);
        expect(r.description).toBe("Marginal Failure");
    });

    it("clamps target to minimum 5 (always 5% chance of success)", () => {
        const r = interpretD100Roll(3, 2);
        expect(r.targetNum).toBe(5);
        expect(r.isCapped).toBe(true);
    });

    it("clamps target to maximum 95 (always 5% chance of failure)", () => {
        const r = interpretD100Roll(96, 99);
        expect(r.targetNum).toBe(95);
        expect(r.isCapped).toBe(true);
        expect(r.isSuccess).toBe(false);
    });

    it("applies modifier to target", () => {
        const r = interpretD100Roll(50, 40, 15);
        expect(r.targetNum).toBe(55);
        expect(r.isSuccess).toBe(true);
    });

    it("negative modifier reduces target", () => {
        const r = interpretD100Roll(50, 60, -15);
        expect(r.targetNum).toBe(45);
        expect(r.isSuccess).toBe(false);
    });

    it("exact roll on target is success", () => {
        const r = interpretD100Roll(60, 60);
        expect(r.isSuccess).toBe(true);
    });
});

describe("interpretD6Roll", () => {
    it("success when roll <= target", () => {
        const r = interpretD6Roll(8, 12);
        expect(r.isSuccess).toBe(true);
        expect(r.isCritical).toBe(false);
        expect(r.description).toBe("Success");
    });

    it("failure when roll > target", () => {
        const r = interpretD6Roll(14, 12);
        expect(r.isSuccess).toBe(false);
        expect(r.description).toBe("Failure");
    });

    it("exact roll on target is success", () => {
        const r = interpretD6Roll(12, 12);
        expect(r.isSuccess).toBe(true);
    });

    it("never reports critical", () => {
        const r = interpretD6Roll(5, 10);
        expect(r.isCritical).toBe(false);
    });
});

/* ----------------------------------------- */
/*  Armor & Injury                           */
/* ----------------------------------------- */

describe("getArmorValue", () => {
    const armorData = { blunt: 3, edged: 5, piercing: 2, fire: 1 };

    it("returns blunt value", () => {
        expect(getArmorValue(armorData, "Blunt")).toBe(3);
    });

    it("returns edged value", () => {
        expect(getArmorValue(armorData, "Edged")).toBe(5);
    });

    it("returns piercing value", () => {
        expect(getArmorValue(armorData, "Piercing")).toBe(2);
    });

    it("returns fire value for unknown aspects", () => {
        expect(getArmorValue(armorData, "Fire")).toBe(1);
        expect(getArmorValue(armorData, "Other")).toBe(1);
    });
});

describe("determineInjuryLevelText", () => {
    const eiTable = { ei1: "M1", ei5: "S2", ei9: "S3", ei13: "G4", ei17: "K5" };

    it("returns NA for zero impact", () => {
        expect(determineInjuryLevelText(0, eiTable)).toBe("NA");
    });

    it("returns ei1 for impact 1-4", () => {
        expect(determineInjuryLevelText(1, eiTable)).toBe("M1");
        expect(determineInjuryLevelText(4, eiTable)).toBe("M1");
    });

    it("returns ei5 for impact 5-8", () => {
        expect(determineInjuryLevelText(5, eiTable)).toBe("S2");
        expect(determineInjuryLevelText(8, eiTable)).toBe("S2");
    });

    it("returns ei9 for impact 9-12", () => {
        expect(determineInjuryLevelText(9, eiTable)).toBe("S3");
        expect(determineInjuryLevelText(12, eiTable)).toBe("S3");
    });

    it("returns ei13 for impact 13-16", () => {
        expect(determineInjuryLevelText(13, eiTable)).toBe("G4");
        expect(determineInjuryLevelText(16, eiTable)).toBe("G4");
    });

    it("returns ei17 for impact 17+", () => {
        expect(determineInjuryLevelText(17, eiTable)).toBe("K5");
        expect(determineInjuryLevelText(25, eiTable)).toBe("K5");
    });
});

describe("parseInjuryLevel", () => {
    it("parses NA", () => {
        expect(parseInjuryLevel("NA")).toEqual({ injuryLevel: 0, isKillShot: false, isAmputate: false });
    });

    it("parses M1", () => {
        expect(parseInjuryLevel("M1")).toEqual({ injuryLevel: 1, isKillShot: false, isAmputate: false });
    });

    it("parses S2 and S3", () => {
        expect(parseInjuryLevel("S2").injuryLevel).toBe(2);
        expect(parseInjuryLevel("S3").injuryLevel).toBe(3);
    });

    it("parses G4 without kill shot", () => {
        const r = parseInjuryLevel("G4");
        expect(r.injuryLevel).toBe(4);
        expect(r.isKillShot).toBe(false);
    });

    it("parses K4 with kill shot", () => {
        const r = parseInjuryLevel("K4");
        expect(r.injuryLevel).toBe(4);
        expect(r.isKillShot).toBe(true);
    });

    it("G5 and K5 have level 5", () => {
        expect(parseInjuryLevel("G5").injuryLevel).toBe(5);
        expect(parseInjuryLevel("K5").injuryLevel).toBe(5);
        expect(parseInjuryLevel("K5").isKillShot).toBe(true);
    });

    it("amputation requires all three conditions", () => {
        // All enabled: amputate
        expect(parseInjuryLevel("G4", { enableAmputate: true, isAmputatable: true, aspect: "Edged" }).isAmputate).toBe(true);
        // Missing enableAmputate
        expect(parseInjuryLevel("G4", { enableAmputate: false, isAmputatable: true, aspect: "Edged" }).isAmputate).toBe(false);
        // Not amputatable location
        expect(parseInjuryLevel("G4", { enableAmputate: true, isAmputatable: false, aspect: "Edged" }).isAmputate).toBe(false);
        // Wrong aspect
        expect(parseInjuryLevel("G4", { enableAmputate: true, isAmputatable: true, aspect: "Blunt" }).isAmputate).toBe(false);
    });

    it("no amputation for low injury levels", () => {
        expect(parseInjuryLevel("M1", { enableAmputate: true, isAmputatable: true, aspect: "Edged" }).isAmputate).toBe(false);
        expect(parseInjuryLevel("S3", { enableAmputate: true, isAmputatable: true, aspect: "Edged" }).isAmputate).toBe(false);
    });
});

describe("determineInjuryEffects", () => {
    it("no effects for non-injured", () => {
        const r = determineInjuryEffects(0, "Edged", { isFumble: true, isStumble: true }, { enableBloodloss: true, enableLimbInjuries: true });
        expect(r.isBleeder).toBe(false);
        expect(r.isFumble).toBe(false);
        expect(r.isStumble).toBe(false);
    });

    it("bloodloss at level 4+ when enabled and not Fire", () => {
        expect(determineInjuryEffects(4, "Edged", {}, { enableBloodloss: true }).isBleeder).toBe(true);
        expect(determineInjuryEffects(3, "Edged", {}, { enableBloodloss: true }).isBleeder).toBe(false);
        expect(determineInjuryEffects(4, "Fire", {}, { enableBloodloss: true }).isBleeder).toBe(false);
        expect(determineInjuryEffects(4, "Edged", {}, { enableBloodloss: false }).isBleeder).toBe(false);
    });

    it("fumble at level 4+ with limb injuries and fumble location", () => {
        const r = determineInjuryEffects(4, "Edged", { isFumble: true, isStumble: false }, { enableLimbInjuries: true });
        expect(r.isFumble).toBe(true);
        expect(r.isFumbleRoll).toBe(true);
    });

    it("fumble roll at level 2+ without full limb injuries", () => {
        const r = determineInjuryEffects(2, "Edged", { isFumble: true, isStumble: false }, { enableLimbInjuries: false });
        expect(r.isFumble).toBe(false);
        expect(r.isFumbleRoll).toBe(true);
    });

    it("no fumble if location is not a fumble location", () => {
        const r = determineInjuryEffects(5, "Edged", { isFumble: false, isStumble: false }, { enableLimbInjuries: true });
        expect(r.isFumble).toBe(false);
        expect(r.isFumbleRoll).toBe(false);
    });

    it("stumble at level 4+ with limb injuries and stumble location", () => {
        const r = determineInjuryEffects(4, "Edged", { isFumble: false, isStumble: true }, { enableLimbInjuries: true });
        expect(r.isStumble).toBe(true);
        expect(r.isStumbleRoll).toBe(true);
    });
});

/* ----------------------------------------- */
/*  Hit Location                             */
/* ----------------------------------------- */

describe("selectHitLocation", () => {
    const items = [
        { type: "armorlocation", name: "Skull", system: { probWeight: { high: 10, mid: 5, low: 1 } } },
        { type: "armorlocation", name: "Chest", system: { probWeight: { high: 5, mid: 15, low: 5 } } },
        { type: "armorlocation", name: "Thigh", system: { probWeight: { high: 1, mid: 5, low: 15 } } },
        { type: "skill", name: "Sword", system: {} },
    ];

    it("returns exact match by name", () => {
        expect(selectHitLocation("Chest", "Mid", items).name).toBe("Chest");
    });

    it("returns null for unknown location name", () => {
        expect(selectHitLocation("Kidney", "Mid", items)).toBeNull();
    });

    it("returns null for empty items", () => {
        expect(selectHitLocation("Random", "Mid", [])).toBeNull();
    });

    it("selects randomly based on weight with low random value", () => {
        // randomValue=0 → rollWeight=1 → first location (Skull has high weight for "high" aim)
        const loc = selectHitLocation("Random", "High", items, 0);
        expect(loc.name).toBe("Skull");
    });

    it("selects randomly based on weight with high random value", () => {
        // High aim weights: Skull=10, Chest=5, Thigh=1, total=16
        // randomValue=0.99 → rollWeight=floor(0.99*16)+1=16 → exhausts Skull(10-10=6), Chest(6-5=1), Thigh(1-1=0) → Thigh
        const loc = selectHitLocation("Random", "High", items, 0.99);
        expect(loc.name).toBe("Thigh");
    });

    it("respects aim when selecting random", () => {
        // Low aim weights: Skull=1, Chest=5, Thigh=15, total=21
        // randomValue=0.5 → rollWeight=floor(0.5*21)+1=11 → Skull(11-1=10), Chest(10-5=5), Thigh(5-15=-10) → Thigh
        const loc = selectHitLocation("Random", "Low", items, 0.5);
        expect(loc.name).toBe("Thigh");
    });

    it("ignores non-armorlocation items", () => {
        const loc = selectHitLocation("Sword", "Mid", items);
        expect(loc).toBeNull();
    });
});

/* ----------------------------------------- */
/*  Weapon Aspect                            */
/* ----------------------------------------- */

describe("calcWeaponAspect", () => {
    const items = [
        { type: "weapongear", name: "Broadsword", system: { blunt: 3, edged: 5, piercing: 2 } },
        { type: "weapongear", name: "Mace", system: { blunt: 6, edged: 0, piercing: 1 } },
        { type: "skill", name: "Sword", system: {} },
    ];

    it("returns correct default aspect for Broadsword (edged is highest)", () => {
        const r = calcWeaponAspect("Broadsword", items);
        expect(r.defaultAspect).toBe("Edged");
        expect(r.aspects.Edged).toBe(5);
        expect(r.aspects.Blunt).toBe(3);
        expect(r.aspects.Piercing).toBe(2);
    });

    it("returns correct default aspect for Mace (blunt is highest)", () => {
        const r = calcWeaponAspect("Mace", items);
        expect(r.defaultAspect).toBe("Blunt");
        expect(r.aspects.Blunt).toBe(6);
    });

    it("returns Other for unknown weapon", () => {
        const r = calcWeaponAspect("Dagger", items);
        expect(r.defaultAspect).toBe("Other");
    });

    it("ignores non-weapongear items", () => {
        const r = calcWeaponAspect("Sword", items);
        expect(r.defaultAspect).toBe("Other");
    });
});
