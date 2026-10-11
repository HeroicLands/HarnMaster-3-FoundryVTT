import { describe, it, expect } from "vitest";
import { weaponEffectNamesItem, actorAMLModifier, actorDMLModifier } from "../module/utility.js";

describe("weaponEffectNamesItem", () => {
    const items = [
        { name: "Pointy McSwordface", type: "weapongear" },
        { name: "Longbow", type: "missilegear" },
        { name: "Backpack", type: "miscgear" },
    ];
    const weaponTypes = ["weapongear", "missilegear"];

    it("matches a weapon named in the effect value", () => {
        const chg = { key: "system.eph.itemAMLMod", value: "Pointy McSwordface:10" };
        expect(weaponEffectNamesItem(chg, items, weaponTypes)).toBe(true);
    });

    it("matches a missile weapon", () => {
        const chg = { key: "system.eph.itemAMLMod", value: "Longbow:5" };
        expect(weaponEffectNamesItem(chg, items, weaponTypes)).toBe(true);
    });

    it("rejects an item of the wrong type", () => {
        const chg = { key: "system.eph.itemAMLMod", value: "Backpack:5" };
        expect(weaponEffectNamesItem(chg, items, weaponTypes)).toBe(false);
    });

    it("rejects an unknown item, a missing magnitude and a non-numeric magnitude", () => {
        expect(weaponEffectNamesItem({ value: "Nothing:5" }, items, weaponTypes)).toBe(false);
        expect(weaponEffectNamesItem({ value: "Longbow" }, items, weaponTypes)).toBe(false);
        expect(weaponEffectNamesItem({ value: "Longbow:abc" }, items, weaponTypes)).toBe(false);
    });
});

describe("actorAMLModifier", () => {
    it("uses the melee modifier for a melee weapon", () => {
        const eph = { meleeAMLMod: 7, missileAMLMod: 3 };
        expect(actorAMLModifier(eph, "weapongear")).toBe(7);
    });

    it("uses the missile modifier for a missile weapon", () => {
        const eph = { meleeAMLMod: 7, missileAMLMod: 3 };
        expect(actorAMLModifier(eph, "missilegear")).toBe(3);
    });

    it("treats a missing or non-numeric modifier as zero", () => {
        expect(actorAMLModifier({}, "weapongear")).toBe(0);
        expect(actorAMLModifier({ meleeAMLMod: NaN }, "weapongear")).toBe(0);
    });
});

describe("actorDMLModifier", () => {
    it("uses the Melee Defenses modifier", () => {
        expect(actorDMLModifier({ meleeDMLMod: 4, meleeAMLMod: 9 })).toBe(4);
        expect(actorDMLModifier({ meleeDMLMod: -3 })).toBe(-3);
    });

    it("is zero without the effect or with a non-numeric value", () => {
        expect(actorDMLModifier({})).toBe(0);
        expect(actorDMLModifier({ meleeDMLMod: 0 })).toBe(0);
        expect(actorDMLModifier({ meleeDMLMod: NaN })).toBe(0);
    });
});
