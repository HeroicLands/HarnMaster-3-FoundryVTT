import { describe, it, expect } from "vitest";
import { dodgeModifiedEml, dodgeTargetEml, isHighVelocityMissile } from "../module/combat.js";

describe("isHighVelocityMissile", () => {
    it("recognises bows, slings and their ammunition", () => {
        for (const name of ["Longbow", "Short Bow", "Heavy Crossbow", "Sling", "Arrow", "Bolt"]) {
            expect(isHighVelocityMissile(name), name).toBe(true);
        }
    });

    it("does not match thrown weapons", () => {
        for (const name of ["Javelin", "Dagger", "Throwing Axe"]) {
            expect(isHighVelocityMissile(name), name).toBe(false);
        }
    });
});

describe("dodgeTargetEml", () => {
    it("halves the dodge EML against a high-velocity missile", () => {
        expect(dodgeTargetEml(60, "missile", "Longbow")).toBe(30);
    });

    it("rounds a halved odd value to the nearest whole number", () => {
        expect(dodgeTargetEml(61, "missile", "Longbow")).toBe(31);
    });

    it("never drops below the floor used for other halved defences", () => {
        expect(dodgeTargetEml(6, "missile", "Longbow")).toBe(5);
    });

    it("uses the full dodge EML against a low-velocity missile", () => {
        expect(dodgeTargetEml(60, "missile", "Javelin")).toBe(60);
    });

    it("uses the full dodge EML against a melee attack", () => {
        expect(dodgeTargetEml(60, "melee", "Longbow")).toBe(60);
    });
});

describe("dodgeModifiedEml", () => {
    it("adds the additional modifier to the dodge EML", () => {
        expect(dodgeModifiedEml(60, "melee", "Broadsword", 10)).toBe(70);
        expect(dodgeModifiedEml(60, "melee", "Broadsword", -20)).toBe(40);
    });

    it("leaves the dodge EML unchanged with no modifier", () => {
        expect(dodgeModifiedEml(60, "melee", "Broadsword", 0)).toBe(60);
    });

    it("applies the modifier after halving against a high-velocity missile", () => {
        expect(dodgeModifiedEml(60, "missile", "Longbow", 10)).toBe(40);
        expect(dodgeModifiedEml(6, "missile", "Longbow", -3)).toBe(2);
    });
});
