import { describe, it, expect } from "vitest";
import {
    normalcdf,
    normProb,
    calcUniversalPenalty,
    calcPhysicalPenalty,
    calcShockIndex,
    calcEndurance,
    calcEncumbrance,
    calcCapacityPct,
    roundWeight,
    calcTotalGearWeight,
    calcEffectiveAbilities,
    calcSpellEml,
    calcInvocationEml,
    calcWeaponAml,
    calcWeaponDml,
    calcMissileAml,
    clampMasteryLevel,
} from "../module/actor/actor-logic.js";

/* ----------------------------------------- */
/*  Statistical Functions                    */
/* ----------------------------------------- */

describe("normalcdf", () => {
    it("returns ~0.5 at x=0", () => {
        expect(normalcdf(0)).toBeCloseTo(0.5, 2);
    });

    it("returns ~0.8413 at x=1", () => {
        expect(normalcdf(1)).toBeCloseTo(0.8413, 2);
    });

    it("returns ~0.1587 at x=-1", () => {
        expect(normalcdf(-1)).toBeCloseTo(0.1587, 2);
    });

    it("returns ~0.9772 at x=2", () => {
        expect(normalcdf(2)).toBeCloseTo(0.9772, 2);
    });

    it("approaches 0 for very negative x", () => {
        expect(normalcdf(-4)).toBeLessThan(0.001);
    });

    it("approaches 1 for very positive x", () => {
        expect(normalcdf(4)).toBeGreaterThan(0.999);
    });
});

describe("normProb", () => {
    it("returns 50 at the mean", () => {
        expect(normProb(50, 50, 10)).toBe(50);
    });

    it("returns ~84 at one SD above mean", () => {
        expect(normProb(60, 50, 10)).toBe(84);
    });

    it("returns ~16 at one SD below mean", () => {
        expect(normProb(40, 50, 10)).toBe(16);
    });

    it("handles sd=0: returns 0 when z < mean", () => {
        expect(normProb(5, 10, 0)).toBe(0);
    });

    it("handles sd=0: returns 100 when z >= mean", () => {
        expect(normProb(10, 10, 0)).toBe(100);
        expect(normProb(15, 10, 0)).toBe(100);
    });
});

/* ----------------------------------------- */
/*  Penalty Calculations                     */
/* ----------------------------------------- */

describe("calcUniversalPenalty", () => {
    it("sums injury levels and fatigue", () => {
        expect(calcUniversalPenalty(3, 2)).toBe(5);
    });

    it("returns 0 when both are 0", () => {
        expect(calcUniversalPenalty(0, 0)).toBe(0);
    });

    it("handles high values", () => {
        expect(calcUniversalPenalty(10, 5)).toBe(15);
    });
});

describe("calcPhysicalPenalty", () => {
    it("adds universal penalty and encumbrance", () => {
        expect(calcPhysicalPenalty(5, 3)).toBe(8);
    });

    it("returns 0 when both are 0", () => {
        expect(calcPhysicalPenalty(0, 0)).toBe(0);
    });
});

describe("calcShockIndex", () => {
    it("returns 100 when no penalty (sd=0, endurance >= mean)", () => {
        // universalPenalty=0 → sd=0, mean=0, endurance>=0 → 100
        expect(calcShockIndex(12, 0)).toBe(100);
    });

    it("returns low value when heavily penalized", () => {
        // High penalty relative to endurance → low shock index
        expect(calcShockIndex(5, 10)).toBeLessThan(20);
    });

    it("returns higher value with better endurance", () => {
        const low = calcShockIndex(5, 5);
        const high = calcShockIndex(20, 5);
        expect(high).toBeGreaterThan(low);
    });

    it("returns value in valid range", () => {
        const result = calcShockIndex(12, 3);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
    });
});

/* ----------------------------------------- */
/*  Endurance & Encumbrance                  */
/* ----------------------------------------- */

describe("calcEndurance", () => {
    it("averages three abilities and rounds", () => {
        expect(calcEndurance(12, 14, 10)).toBe(12); // (12+14+10)/3 = 12
    });

    it("rounds to nearest integer", () => {
        expect(calcEndurance(13, 14, 10)).toBe(12); // (13+14+10)/3 = 12.33 → 12
        expect(calcEndurance(13, 14, 11)).toBe(13); // (13+14+11)/3 = 12.67 → 13
    });

    it("returns minimum of 1", () => {
        expect(calcEndurance(0, 0, 0)).toBe(1);
    });
});

describe("calcEncumbrance", () => {
    it("calculates effective weight and encumbrance", () => {
        const result = calcEncumbrance(30, 10, 12);
        expect(result.effectiveWeight).toBe(20);
        expect(result.encumbrance).toBe(1); // floor(20/12)
    });

    it("uses full weight when no load rating", () => {
        const result = calcEncumbrance(30, 0, 10);
        expect(result.effectiveWeight).toBe(30);
        expect(result.encumbrance).toBe(3);
    });

    it("clamps effective weight to 0", () => {
        const result = calcEncumbrance(5, 10, 12);
        expect(result.effectiveWeight).toBe(0);
        expect(result.encumbrance).toBe(0);
    });
});

describe("calcCapacityPct", () => {
    it("returns 100 when empty", () => {
        expect(calcCapacityPct(0, 50)).toBe(100);
    });

    it("returns 50 when half full", () => {
        expect(calcCapacityPct(25, 50)).toBe(50);
    });

    it("returns 0 when full", () => {
        expect(calcCapacityPct(50, 50)).toBe(0);
    });

    it("clamps to 0 when overfull", () => {
        expect(calcCapacityPct(60, 50)).toBe(0);
    });

    it("handles zero max capacity", () => {
        expect(calcCapacityPct(0, 0)).toBe(0);
    });
});

/* ----------------------------------------- */
/*  Weight Calculations                      */
/* ----------------------------------------- */

describe("roundWeight", () => {
    it("rounds to two decimal places", () => {
        expect(roundWeight(1.005)).toBe(1.01);
        expect(roundWeight(2.555)).toBe(2.56);
    });

    it("handles clean values", () => {
        expect(roundWeight(5)).toBe(5);
        expect(roundWeight(3.5)).toBe(3.5);
    });

    it("handles floating point drift", () => {
        // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
        expect(roundWeight(0.1 + 0.2)).toBe(0.3);
    });
});

describe("calcTotalGearWeight", () => {
    it("returns 0 for empty items", () => {
        expect(calcTotalGearWeight([])).toBe(0);
    });

    it("sums carried on-person gear", () => {
        const items = [
            {
                type: "weapongear",
                id: "w1",
                system: {
                    weight: 3,
                    quantity: 1,
                    isCarried: true,
                    container: "on-person",
                },
            },
            {
                type: "armorgear",
                id: "a1",
                system: {
                    weight: 5,
                    quantity: 1,
                    isCarried: true,
                    container: "on-person",
                },
            },
        ];
        expect(calcTotalGearWeight(items)).toBe(8);
    });

    it("excludes non-carried gear", () => {
        const items = [
            {
                type: "weapongear",
                id: "w1",
                system: {
                    weight: 3,
                    quantity: 1,
                    isCarried: false,
                    container: "on-person",
                },
            },
        ];
        expect(calcTotalGearWeight(items)).toBe(0);
    });

    it("includes gear in carried containers", () => {
        const items = [
            {
                type: "containergear",
                id: "c1",
                system: { isCarried: true, weight: 1, quantity: 1, container: "on-person" },
            },
            {
                type: "miscgear",
                id: "m1",
                system: { weight: 2, quantity: 3, isCarried: true, container: "c1" },
            },
        ];
        // Container weight (1) + contents (2*3=6) = 7
        expect(calcTotalGearWeight(items)).toBe(7);
    });

    it("excludes gear in non-carried containers", () => {
        const items = [
            {
                type: "containergear",
                id: "c1",
                system: { isCarried: false, weight: 1, quantity: 1, container: "on-person" },
            },
            {
                type: "miscgear",
                id: "m1",
                system: { weight: 2, quantity: 3, isCarried: true, container: "c1" },
            },
        ];
        expect(calcTotalGearWeight(items)).toBe(0);
    });

    it("multiplies weight by quantity", () => {
        const items = [
            {
                type: "miscgear",
                id: "m1",
                system: {
                    weight: 0.5,
                    quantity: 10,
                    isCarried: true,
                    container: "on-person",
                },
            },
        ];
        expect(calcTotalGearWeight(items)).toBe(5);
    });

    it("ignores non-gear items", () => {
        const items = [
            { type: "skill", id: "s1", system: { weight: 0, quantity: 1 } },
            { type: "spell", id: "sp1", system: { weight: 0, quantity: 1 } },
        ];
        expect(calcTotalGearWeight(items)).toBe(0);
    });
});

/* ----------------------------------------- */
/*  Effective Abilities                      */
/* ----------------------------------------- */

describe("calcEffectiveAbilities", () => {
    const baseEph = {
        strength: 14,
        stamina: 12,
        agility: 10,
        dexterity: 11,
        intelligence: 13,
        aura: 9,
        will: 15,
        eyesight: 12,
        hearing: 10,
        smell: 8,
        voice: 11,
        comeliness: 14,
        morality: 10,
    };

    it("applies physical penalty to physical abilities", () => {
        const result = calcEffectiveAbilities(baseEph, 3, 1);
        expect(result.strength).toBe(11); // 14 - 3
        expect(result.stamina).toBe(9); // 12 - 3
        expect(result.agility).toBe(7); // 10 - 3
        expect(result.dexterity).toBe(8); // 11 - 3
    });

    it("applies universal penalty to mental/sensory abilities", () => {
        const result = calcEffectiveAbilities(baseEph, 3, 1);
        expect(result.intelligence).toBe(12); // 13 - 1
        expect(result.aura).toBe(8); // 9 - 1
        expect(result.will).toBe(14); // 15 - 1
    });

    it("does not penalize comeliness or morality", () => {
        const result = calcEffectiveAbilities(baseEph, 5, 3);
        expect(result.comeliness).toBe(14);
        expect(result.morality).toBe(10);
    });

    it("clamps to minimum of 0", () => {
        const result = calcEffectiveAbilities(baseEph, 20, 20);
        expect(result.strength).toBe(0);
        expect(result.intelligence).toBe(0);
    });

    it("handles zero penalties", () => {
        const result = calcEffectiveAbilities(baseEph, 0, 0);
        expect(result.strength).toBe(14);
        expect(result.intelligence).toBe(13);
        expect(result.comeliness).toBe(14);
    });
});

/* ----------------------------------------- */
/*  Skill & Spell Calculations               */
/* ----------------------------------------- */

describe("calcSpellEml", () => {
    it("subtracts level * 5 from skill EML", () => {
        expect(calcSpellEml(60, 1)).toBe(55);
        expect(calcSpellEml(60, 3)).toBe(45);
        expect(calcSpellEml(60, 6)).toBe(30);
    });

    it("can go negative", () => {
        expect(calcSpellEml(10, 5)).toBe(-15);
    });
});

describe("calcInvocationEml", () => {
    it("subtracts circle * 5 from skill EML", () => {
        expect(calcInvocationEml(70, 2)).toBe(60);
        expect(calcInvocationEml(70, 5)).toBe(45);
    });
});

describe("calcWeaponAml", () => {
    it("sums EML, attack bonus, and modifier", () => {
        expect(calcWeaponAml(60, 2, 3)).toBe(65);
    });

    it("handles null/undefined inputs as 0", () => {
        expect(calcWeaponAml(null, null, null)).toBe(0);
        expect(calcWeaponAml(60, 0, 0)).toBe(60);
    });
});

describe("calcWeaponDml", () => {
    it("sums EML and defense bonus", () => {
        expect(calcWeaponDml(60, -5)).toBe(55);
    });

    it("handles null EML", () => {
        expect(calcWeaponDml(null, 3)).toBe(3);
    });
});

describe("calcMissileAml", () => {
    it("sums EML and modifier", () => {
        expect(calcMissileAml(55, 5)).toBe(60);
    });
});

describe("clampMasteryLevel", () => {
    it("returns value when >= 5", () => {
        expect(clampMasteryLevel(60)).toBe(60);
        expect(clampMasteryLevel(5)).toBe(5);
    });

    it("clamps to 5 when below", () => {
        expect(clampMasteryLevel(3)).toBe(5);
        expect(clampMasteryLevel(-10)).toBe(5);
    });
});
