import { describe, it, expect } from "vitest";
import {
    calcInjury,
    calcWeaponAspect,
    clampTarget,
    getArmorValue,
    injuryEffects,
    injuryLevelText,
    interpretRoll,
    parseInjuryLevel,
    selectArmorLocation,
    weaponAspects,
} from "../module/dice-logic.js";

describe("clampTarget", () => {
    it("keeps a value inside 5..95 unchanged", () => {
        expect(clampTarget(5)).toBe(5);
        expect(clampTarget(50)).toBe(50);
        expect(clampTarget(95)).toBe(95);
    });

    it("raises a low value to 5 and lowers a high one to 95", () => {
        expect(clampTarget(-20)).toBe(5);
        expect(clampTarget(4)).toBe(5);
        expect(clampTarget(96)).toBe(95);
        expect(clampTarget(140)).toBe(95);
    });
});

describe("interpretRoll d100", () => {
    it("is a critical success at or under the target on a multiple of 5", () => {
        const r = interpretRoll("d100", 25, 60);
        expect(r).toMatchObject({
            isSuccess: true,
            isCritical: true,
            description: "Critical Success",
        });
    });

    it("is a marginal success at or under the target off a multiple of 5", () => {
        const r = interpretRoll("d100", 23, 60);
        expect(r).toMatchObject({
            isSuccess: true,
            isCritical: false,
            description: "Marginal Success",
        });
    });

    it("is a critical failure over the target on a multiple of 5", () => {
        const r = interpretRoll("d100", 75, 60);
        expect(r).toMatchObject({
            isSuccess: false,
            isCritical: true,
            description: "Critical Failure",
        });
    });

    it("is a marginal failure over the target off a multiple of 5", () => {
        const r = interpretRoll("d100", 73, 60);
        expect(r).toMatchObject({
            isSuccess: false,
            isCritical: false,
            description: "Marginal Failure",
        });
    });

    it("treats a roll equal to the target as a success", () => {
        expect(interpretRoll("d100", 60, 60).isSuccess).toBe(true);
        expect(interpretRoll("d100", 61, 60).isSuccess).toBe(false);
    });

    it("treats a roll of 100 as a critical", () => {
        expect(interpretRoll("d100", 100, 95)).toMatchObject({
            isCritical: true,
            isSuccess: false,
        });
    });

    it("clamps a low target to 5 and reports it capped", () => {
        const r = interpretRoll("d100", 3, 2);
        expect(r).toMatchObject({ targetNum: 5, isCapped: true, isSuccess: true });
    });

    it("clamps a high target to 95 and reports it capped", () => {
        const r = interpretRoll("d100", 96, 99);
        expect(r).toMatchObject({ targetNum: 95, isCapped: true, isSuccess: false });
    });

    it("does not report a target capped when it is exactly at a bound", () => {
        expect(interpretRoll("d100", 50, 95).isCapped).toBe(false);
        expect(interpretRoll("d100", 50, 5).isCapped).toBe(false);
    });

    it("applies the modifier to the target, not the roll", () => {
        expect(interpretRoll("d100", 50, 40, 15)).toMatchObject({ targetNum: 55, isSuccess: true });
        expect(interpretRoll("d100", 50, 60, -15)).toMatchObject({
            targetNum: 45,
            isSuccess: false,
        });
    });

    it("defaults the modifier to zero", () => {
        expect(interpretRoll("d100", 50, 60).targetNum).toBe(60);
    });
});

describe("interpretRoll d6", () => {
    it("succeeds at or under the target and fails over it", () => {
        expect(interpretRoll("d6", 8, 12)).toMatchObject({
            isSuccess: true,
            description: "Success",
        });
        expect(interpretRoll("d6", 12, 12).isSuccess).toBe(true);
        expect(interpretRoll("d6", 14, 12)).toMatchObject({
            isSuccess: false,
            description: "Failure",
        });
    });

    it("is never critical, even on a multiple of 5", () => {
        expect(interpretRoll("d6", 10, 12).isCritical).toBe(false);
        expect(interpretRoll("d6", 15, 12).isCritical).toBe(false);
    });

    it("applies the modifier to the target", () => {
        expect(interpretRoll("d6", 10, 8, 3)).toMatchObject({ targetNum: 11, isSuccess: true });
    });

    // The d6 path shares the 5..95 clamp with the d100 path.
    it("clamps the target to 5..95 like a d100 roll", () => {
        expect(interpretRoll("d6", 5, 2)).toMatchObject({
            targetNum: 5,
            isCapped: true,
            isSuccess: true,
        });
        expect(interpretRoll("d6", 6, 2).isSuccess).toBe(false);
        expect(interpretRoll("d6", 90, 120)).toMatchObject({ targetNum: 95, isCapped: true });
    });
});

describe("getArmorValue", () => {
    const armor = { blunt: 3, edged: 5, piercing: 2, fire: 1 };

    it("returns the value for the aspect", () => {
        expect(getArmorValue(armor, "Blunt")).toBe(3);
        expect(getArmorValue(armor, "Edged")).toBe(5);
        expect(getArmorValue(armor, "Piercing")).toBe(2);
        expect(getArmorValue(armor, "Fire")).toBe(1);
    });

    it("treats any other aspect as Fire", () => {
        expect(getArmorValue(armor, "Other")).toBe(1);
    });
});

describe("injuryLevelText", () => {
    const table = { ei1: "M1", ei5: "S2", ei9: "S3", ei13: "G4", ei17: "K5" };

    it("returns NA for no effective impact", () => {
        expect(injuryLevelText(0, table)).toBe("NA");
    });

    it("selects the table band containing the effective impact", () => {
        const expected = [
            [1, "M1"],
            [4, "M1"],
            [5, "S2"],
            [8, "S2"],
            [9, "S3"],
            [12, "S3"],
            [13, "G4"],
            [16, "G4"],
            [17, "K5"],
            [30, "K5"],
        ];
        for (const [ei, text] of expected) {
            expect(injuryLevelText(ei, table), `ei ${ei}`).toBe(text);
        }
    });
});

describe("parseInjuryLevel", () => {
    const all = { enableAmputate: true, isAmputatable: true, aspect: "Edged" };

    it("maps each code to its level and kill-shot flag", () => {
        expect(parseInjuryLevel("NA")).toEqual({
            injuryLevel: 0,
            isKillShot: false,
            isAmputate: false,
        });
        expect(parseInjuryLevel("M1")).toEqual({
            injuryLevel: 1,
            isKillShot: false,
            isAmputate: false,
        });
        expect(parseInjuryLevel("S2").injuryLevel).toBe(2);
        expect(parseInjuryLevel("S3").injuryLevel).toBe(3);
        expect(parseInjuryLevel("G4")).toMatchObject({ injuryLevel: 4, isKillShot: false });
        expect(parseInjuryLevel("K4")).toMatchObject({ injuryLevel: 4, isKillShot: true });
        expect(parseInjuryLevel("G5")).toMatchObject({ injuryLevel: 5, isKillShot: false });
        expect(parseInjuryLevel("K5")).toMatchObject({ injuryLevel: 5, isKillShot: true });
    });

    it("yields level 0 for an unrecognised code", () => {
        expect(parseInjuryLevel("X9")).toEqual({
            injuryLevel: 0,
            isKillShot: false,
            isAmputate: false,
        });
        expect(parseInjuryLevel(undefined).injuryLevel).toBe(0);
    });

    it("amputates only at level 4 and 5 and only when every condition holds", () => {
        for (const code of ["G4", "K4", "G5", "K5"]) {
            expect(parseInjuryLevel(code, all).isAmputate, code).toBe(true);
        }
        expect(parseInjuryLevel("G4", { ...all, enableAmputate: false }).isAmputate).toBe(false);
        expect(parseInjuryLevel("G4", { ...all, isAmputatable: false }).isAmputate).toBe(false);
        expect(parseInjuryLevel("G4", { ...all, aspect: "Blunt" }).isAmputate).toBe(false);
        expect(parseInjuryLevel("G4").isAmputate).toBe(false);
    });

    it("never amputates below level 4", () => {
        for (const code of ["NA", "M1", "S2", "S3"]) {
            expect(parseInjuryLevel(code, all).isAmputate, code).toBe(false);
        }
    });
});

describe("injuryEffects", () => {
    const none = { isFumble: false, isStumble: false };
    const off = { enableBloodloss: false, enableLimbInjuries: false };

    it("bleeds at level 4 and up when bloodloss is on, except from Fire", () => {
        const on = { ...off, enableBloodloss: true };
        expect(injuryEffects(4, "Edged", none, on).isBleeder).toBe(true);
        expect(injuryEffects(5, "Blunt", none, on).isBleeder).toBe(true);
        expect(injuryEffects(3, "Edged", none, on).isBleeder).toBe(false);
        expect(injuryEffects(4, "Fire", none, on).isBleeder).toBe(false);
        expect(injuryEffects(4, "Edged", none, off).isBleeder).toBe(false);
    });

    it("fumbles at level 4 and up under limb injuries at a fumble location", () => {
        const limbs = { ...off, enableLimbInjuries: true };
        const fumble = { isFumble: true, isStumble: false };
        expect(injuryEffects(4, "Edged", fumble, limbs)).toMatchObject({
            isFumble: true,
            isFumbleRoll: true,
        });
        expect(injuryEffects(3, "Edged", fumble, limbs)).toMatchObject({
            isFumble: false,
            isFumbleRoll: true,
        });
    });

    it("rolls for a fumble from level 2 without limb injuries, but never fumbles outright", () => {
        const fumble = { isFumble: true, isStumble: false };
        expect(injuryEffects(2, "Edged", fumble, off)).toMatchObject({
            isFumble: false,
            isFumbleRoll: true,
        });
        expect(injuryEffects(1, "Edged", fumble, off)).toMatchObject({
            isFumble: false,
            isFumbleRoll: false,
        });
        expect(injuryEffects(5, "Edged", fumble, off)).toMatchObject({
            isFumble: false,
            isFumbleRoll: true,
        });
    });

    it("stumbles the same way at a stumble location", () => {
        const limbs = { ...off, enableLimbInjuries: true };
        const stumble = { isFumble: false, isStumble: true };
        expect(injuryEffects(4, "Edged", stumble, limbs)).toMatchObject({
            isStumble: true,
            isStumbleRoll: true,
        });
        expect(injuryEffects(2, "Edged", stumble, off)).toMatchObject({
            isStumble: false,
            isStumbleRoll: true,
        });
        expect(injuryEffects(4, "Edged", stumble, limbs)).toMatchObject({
            isFumble: false,
            isFumbleRoll: false,
        });
    });

    it("has no fumble or stumble outside such a location", () => {
        const limbs = { ...off, enableLimbInjuries: true };
        expect(injuryEffects(5, "Edged", none, limbs)).toMatchObject({
            isFumble: false,
            isFumbleRoll: false,
            isStumble: false,
            isStumbleRoll: false,
        });
    });
});

describe("calcInjury", () => {
    const location = (extra = {}) => ({
        blunt: 2,
        edged: 4,
        piercing: 1,
        fire: 0,
        isAmputate: true,
        isFumble: false,
        isStumble: false,
        effectiveImpact: { ei1: "M1", ei5: "S2", ei9: "S3", ei13: "G4", ei17: "K5" },
        ...extra,
    });
    const rules = { enableAmputate: true, enableBloodloss: true, enableLimbInjuries: false };

    it("is uninjured when armor absorbs the whole blow", () => {
        expect(calcInjury(4, "Edged", location(), rules)).toEqual({
            armorValue: 4,
            effectiveImpact: 0,
            injuryLevelText: "NA",
            injuryLevel: 0,
            isKillShot: false,
            isAmputate: false,
            isInjured: false,
        });
    });

    it("subtracts the armor for the aspect and reads the table", () => {
        const r = calcInjury(10, "Blunt", location(), rules);
        expect(r).toMatchObject({
            armorValue: 2,
            effectiveImpact: 8,
            injuryLevelText: "S2",
            injuryLevel: 2,
            isInjured: true,
            isBleeder: false,
        });
    });

    it("accepts the impact as a numeric string, as a dialog supplies it", () => {
        expect(calcInjury("10", "Blunt", location(), rules).effectiveImpact).toBe(8);
    });

    it("reports a severe edged wound as an amputation that bleeds", () => {
        const r = calcInjury(25, "Edged", location(), rules);
        expect(r).toMatchObject({
            effectiveImpact: 21,
            injuryLevelText: "K5",
            injuryLevel: 5,
            isKillShot: true,
            isAmputate: true,
            isBleeder: true,
        });
    });

    it("does not amputate a location that cannot be amputated or from a blunt blow", () => {
        expect(calcInjury(25, "Edged", location({ isAmputate: false }), rules).isAmputate).toBe(
            false,
        );
        expect(calcInjury(25, "Blunt", location(), rules).isAmputate).toBe(false);
    });

    it("applies limb-injury effects at a fumble location", () => {
        const r = calcInjury(15, "Blunt", location({ isFumble: true }), {
            ...rules,
            enableLimbInjuries: true,
        });
        expect(r).toMatchObject({ injuryLevel: 4, isFumble: true, isFumbleRoll: true });
    });

    it("adds no effect fields when uninjured", () => {
        expect(calcInjury(0, "Edged", location(), rules)).not.toHaveProperty("isBleeder");
    });
});

describe("selectArmorLocation", () => {
    const loc = (name, high, mid, low) => ({
        type: "armorlocation",
        name,
        system: { probWeight: { high, mid, low } },
    });
    const items = [
        loc("Skull", 10, 5, 1),
        loc("Chest", 5, 15, 5),
        loc("Thigh", 1, 5, 15),
        { type: "skill", name: "Sword", system: {} },
    ];

    it("finds a named location", () => {
        expect(selectArmorLocation("Chest", "Mid", items).name).toBe("Chest");
    });

    it("returns null for an unknown name or a name that is not an armor location", () => {
        expect(selectArmorLocation("Kidney", "Mid", items)).toBeNull();
        expect(selectArmorLocation("Sword", "Mid", items)).toBeNull();
    });

    it("returns null for a random pick when there are no armor locations", () => {
        expect(selectArmorLocation("Random", "Mid", [])).toBeNull();
        expect(selectArmorLocation("random", "Mid", [items[3]])).toBeNull();
    });

    it("picks by cumulative weight for the aim", () => {
        // High weights 10, 5, 1: total 16.
        expect(selectArmorLocation("Random", "High", items, () => 0).name).toBe("Skull");
        expect(selectArmorLocation("Random", "High", items, () => 9 / 16).name).toBe("Skull");
        expect(selectArmorLocation("Random", "High", items, () => 10 / 16).name).toBe("Chest");
        expect(selectArmorLocation("Random", "High", items, () => 15 / 16).name).toBe("Thigh");
        expect(selectArmorLocation("Random", "High", items, () => 0.99).name).toBe("Thigh");
    });

    it("uses the weights of the aim given, in any case", () => {
        // Low weights 1, 5, 15: total 21; 0.5 gives 11.
        expect(selectArmorLocation("RANDOM", "LOW", items, () => 0.5).name).toBe("Thigh");
        expect(selectArmorLocation("Random", "low", items, () => 0).name).toBe("Skull");
    });

    it("chooses the first location without consulting the random source when all weights are zero", () => {
        const zero = [loc("A", 0, 0, 0), loc("B", 0, 0, 0)];
        const random = () => {
            throw new Error("random source consulted");
        };
        expect(selectArmorLocation("Random", "Mid", zero, random).name).toBe("A");
    });

    it("skips a zero-weight location", () => {
        const some = [loc("A", 0, 0, 0), loc("B", 4, 4, 4)];
        expect(selectArmorLocation("Random", "Mid", some, () => 0).name).toBe("B");
    });

    it("accepts a Map-like collection that offers only forEach", () => {
        const map = new Map(items.map((it, i) => [String(i), it]));
        expect(selectArmorLocation("Thigh", "Mid", map).name).toBe("Thigh");
        expect(selectArmorLocation("Random", "High", map, () => 0.99).name).toBe("Thigh");
    });
});

describe("calcWeaponAspect", () => {
    const weapon = (name, blunt, edged, piercing) => ({
        type: "weapongear",
        name,
        system: { blunt, edged, piercing },
    });
    const items = [
        weapon("Broadsword", 3, 5, 2),
        weapon("Mace", 6, 0, 1),
        weapon("Spear", 1, 2, 7),
        weapon("Club", 4, 0, 0),
        { type: "skill", name: "Sword", system: {} },
    ];

    it("defaults to the aspect with the greatest impact", () => {
        const sword = calcWeaponAspect("Broadsword", items);
        expect(sword.defaultAspect).toBe("Edged");
        expect(sword.aspects).toMatchObject({ Blunt: 3, Edged: 5, Piercing: 2 });
        expect(calcWeaponAspect("Mace", items).defaultAspect).toBe("Blunt");
        expect(calcWeaponAspect("Spear", items).defaultAspect).toBe("Piercing");
    });

    it("always offers Fire and Other at an impact of 0", () => {
        expect(calcWeaponAspect("Mace", items).aspects).toMatchObject({ Fire: 0, Other: 0 });
    });

    it("prefers Piercing, then Edged, then Blunt on a tie", () => {
        expect(calcWeaponAspect("T1", [weapon("T1", 4, 4, 4)]).defaultAspect).toBe("Piercing");
        expect(calcWeaponAspect("T2", [weapon("T2", 4, 4, 1)]).defaultAspect).toBe("Edged");
        expect(calcWeaponAspect("T3", [weapon("T3", 4, 1, 1)]).defaultAspect).toBe("Blunt");
    });

    it("defaults to Other for an unknown weapon or a non-weapon item", () => {
        expect(calcWeaponAspect("Dagger", items)).toMatchObject({ defaultAspect: "Other" });
        expect(calcWeaponAspect("Sword", items).defaultAspect).toBe("Other");
    });

    it("defaults to Other when every impact is negative", () => {
        const r = calcWeaponAspect("Odd", [weapon("Odd", -1, -1, -1)]);
        expect(r.defaultAspect).toBe("Other");
    });

    it("uses the first weapon when several share a name and no id is given", () => {
        const r = calcWeaponAspect("Pair", [weapon("Pair", 9, 0, 0), weapon("Pair", 0, 8, 0)]);
        expect(r.defaultAspect).toBe("Blunt");
        expect(r.aspects).toMatchObject({ Blunt: 9, Edged: 0 });
    });

    it("uses the weapon with the given id when several share a name", () => {
        const pair = [
            { ...weapon("Pair", 9, 0, 0), id: "a" },
            { ...weapon("Pair", 0, 8, 0), id: "b" },
        ];
        const second = calcWeaponAspect("Pair", pair, "b");
        expect(second.defaultAspect).toBe("Edged");
        expect(second.aspects).toMatchObject({ Blunt: 0, Edged: 8 });
        const first = calcWeaponAspect("Pair", pair, "a");
        expect(first.defaultAspect).toBe("Blunt");
        expect(first.aspects).toMatchObject({ Blunt: 9, Edged: 0 });
    });

    it("does not reset the default when a later weapon shares the name", () => {
        const pair = [
            { ...weapon("Pair", 0, 8, 0), id: "a" },
            { ...weapon("Pair", -1, -1, -1), id: "b" },
        ];
        expect(calcWeaponAspect("Pair", pair, "a").defaultAspect).toBe("Edged");
        expect(calcWeaponAspect("Pair", pair).defaultAspect).toBe("Edged");
    });

    it("defaults to Other when the id matches no weapon", () => {
        const r = calcWeaponAspect("Pair", [{ ...weapon("Pair", 9, 0, 0), id: "a" }], "zzz");
        expect(r.defaultAspect).toBe("Other");
    });
});

describe("weaponAspects", () => {
    it("lists only the aspects with an impact of zero or more", () => {
        const r = weaponAspects({ blunt: 6, edged: -1, piercing: 0 });
        expect(r.aspects).toEqual({ Blunt: 6, Piercing: 0 });
        expect(r.defaultAspect).toBe("Blunt");
    });

    it("prefers Piercing, then Edged, then Blunt on a tie", () => {
        expect(weaponAspects({ blunt: 3, edged: 3, piercing: 3 }).defaultAspect).toBe("Piercing");
        expect(weaponAspects({ blunt: 3, edged: 3, piercing: 1 }).defaultAspect).toBe("Edged");
        expect(weaponAspects({ blunt: 3, edged: 1, piercing: 1 }).defaultAspect).toBe("Blunt");
    });

    it("has no default and no aspects when every impact is negative", () => {
        expect(weaponAspects({ blunt: -1, edged: -1, piercing: -1 })).toEqual({
            defaultAspect: null,
            aspects: {},
        });
    });
});
