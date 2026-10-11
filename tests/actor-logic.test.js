import { describe, it, expect } from "vitest";
import {
    calcEffectiveAbilities,
    calcEffectiveMove,
    calcEncumbrance,
    calcGearWeightTotals,
    calcEndurance,
    calcInvocationEml,
    calcMissileAml,
    calcPenaltyPct,
    calcPsionicEml,
    calcSkillEml,
    calcSpellEml,
    calcWeaponAml,
    calcWeaponDml,
    clampMasteryLevel,
    injurySeverity,
    calcPhysicalPenalty,
    calcShockIndex,
    calcTotalGearWeight,
    calcUniversalPenalty,
    normProb,
    normalcdf,
    roundWeight,
} from "../module/actor/actor-logic.js";

describe("calcEndurance", () => {
    it("averages Strength, Stamina and Will", () => {
        expect(calcEndurance(12, 14, 10)).toBe(12);
    });

    it("rounds to the nearest whole number", () => {
        expect(calcEndurance(13, 14, 10)).toBe(12); // 12.33
        expect(calcEndurance(13, 14, 11)).toBe(13); // 12.67
        expect(calcEndurance(10, 10, 11)).toBe(10); // 10.33
        expect(calcEndurance(10, 11, 11)).toBe(11); // 10.67
    });

    it("is at least 1", () => {
        expect(calcEndurance(0, 0, 0)).toBe(1);
        expect(calcEndurance(1, 0, 0)).toBe(1);
    });

    it("takes a fifth of the Condition mastery level when the skill exists", () => {
        expect(calcEndurance(12, 14, 10, 60)).toBe(12);
        expect(calcEndurance(12, 14, 10, 62)).toBe(12);
        expect(calcEndurance(12, 14, 10, 73)).toBe(15);
        expect(calcEndurance(99, 99, 99, 50)).toBe(10);
    });

    it("ignores the abilities once a Condition skill is present", () => {
        expect(calcEndurance(1, 1, 1, 100)).toBe(20);
    });

    it("treats a Condition skill with no mastery level as 0, so endurance is 1", () => {
        expect(calcEndurance(15, 15, 15, 0)).toBe(1);
        expect(calcEndurance(15, 15, 15, null)).toBe(1);
        expect(calcEndurance(15, 15, 15, 3)).toBe(1);
    });
});

describe("calcEncumbrance", () => {
    it("counts weight above the load rating", () => {
        expect(calcEncumbrance(30, 10, 12)).toEqual({ effectiveWeight: 20, encumbrance: 1 });
    });

    it("counts all weight when there is no load rating", () => {
        expect(calcEncumbrance(30, 0, 10)).toEqual({ effectiveWeight: 30, encumbrance: 3 });
        expect(calcEncumbrance(30, undefined, 10)).toEqual({ effectiveWeight: 30, encumbrance: 3 });
    });

    it("never counts negative weight when under the load rating", () => {
        expect(calcEncumbrance(5, 10, 12)).toEqual({ effectiveWeight: 0, encumbrance: 0 });
    });

    it("rounds encumbrance down", () => {
        expect(calcEncumbrance(23, 0, 12).encumbrance).toBe(1);
        expect(calcEncumbrance(24, 0, 12).encumbrance).toBe(2);
        expect(calcEncumbrance(11.9, 0, 12).encumbrance).toBe(0);
    });
});

describe("normalcdf", () => {
    it("is one half at zero", () => {
        expect(normalcdf(0)).toBeCloseTo(0.5, 3);
    });

    it("matches the standard normal at one and two deviations", () => {
        expect(normalcdf(1)).toBeCloseTo(0.8413, 3);
        expect(normalcdf(-1)).toBeCloseTo(0.1587, 3);
        expect(normalcdf(2)).toBeCloseTo(0.9772, 3);
    });

    it("is symmetric about zero", () => {
        expect(normalcdf(1.5) + normalcdf(-1.5)).toBeCloseTo(1, 6);
    });

    it("approaches 0 and 1 in the tails", () => {
        expect(normalcdf(-4)).toBeLessThan(0.001);
        expect(normalcdf(4)).toBeGreaterThan(0.999);
    });
});

describe("normProb", () => {
    it("is 50 at the mean and about 84 and 16 a deviation either side", () => {
        expect(normProb(50, 50, 10)).toBe(50);
        expect(normProb(60, 50, 10)).toBe(84);
        expect(normProb(40, 50, 10)).toBe(16);
    });

    it("is a step at the mean when there is no spread", () => {
        expect(normProb(5, 10, 0)).toBe(0);
        expect(normProb(10, 10, 0)).toBe(100);
        expect(normProb(15, 10, 0)).toBe(100);
    });
});

describe("penalties", () => {
    it("universal penalty is injury levels plus fatigue", () => {
        expect(calcUniversalPenalty(3, 2)).toBe(5);
        expect(calcUniversalPenalty(0, 0)).toBe(0);
    });

    it("physical penalty is universal penalty plus encumbrance", () => {
        expect(calcPhysicalPenalty(5, 3)).toBe(8);
        expect(calcPhysicalPenalty(0, 0)).toBe(0);
    });
});

describe("calcShockIndex", () => {
    it("is 100 with no penalty", () => {
        expect(calcShockIndex(12, 0)).toBe(100);
        expect(calcShockIndex(1, 0)).toBe(100);
    });

    it("is 0 when the penalty is far beyond endurance", () => {
        expect(calcShockIndex(5, 10)).toBe(0);
    });

    it("is 50 when endurance equals the mean of 3.5 per penalty point", () => {
        expect(calcShockIndex(7, 2)).toBe(50);
    });

    it("rises with endurance", () => {
        expect(calcShockIndex(20, 5)).toBeGreaterThan(calcShockIndex(5, 5));
    });

    it("stays within 0 to 100", () => {
        for (const [e, up] of [
            [12, 3],
            [1, 8],
            [30, 1],
            [12, 0.5],
        ]) {
            const v = calcShockIndex(e, up);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
        }
    });
});

describe("calcEffectiveAbilities", () => {
    const modified = {
        strength: 12,
        stamina: 13,
        agility: 14,
        dexterity: 11,
        intelligence: 15,
        aura: 10,
        will: 16,
        eyesight: 9,
        hearing: 8,
        smell: 7,
        voice: 12,
        comeliness: 13,
        morality: 6,
    };

    it("applies the physical penalty to the physical abilities", () => {
        const r = calcEffectiveAbilities(modified, 3, 1);
        expect(r).toMatchObject({ strength: 9, stamina: 10, agility: 11, dexterity: 8 });
    });

    it("applies the universal penalty to the mental and sensory abilities", () => {
        const r = calcEffectiveAbilities(modified, 3, 1);
        expect(r).toMatchObject({
            intelligence: 14,
            aura: 9,
            will: 15,
            eyesight: 8,
            hearing: 7,
            smell: 6,
            voice: 11,
        });
    });

    it("applies no penalty to comeliness and morality", () => {
        const r = calcEffectiveAbilities(modified, 9, 9);
        expect(r).toMatchObject({ comeliness: 13, morality: 6 });
    });

    it("reports every ability and no others", () => {
        expect(Object.keys(calcEffectiveAbilities(modified, 0, 0)).sort()).toEqual(
            Object.keys(modified).sort(),
        );
    });

    it("never goes below 0", () => {
        const r = calcEffectiveAbilities(modified, 50, 50);
        expect(r.strength).toBe(0);
        expect(r.will).toBe(0);
        expect(calcEffectiveAbilities({ ...modified, morality: -4 }, 0, 0).morality).toBe(0);
    });

    it("rounds a fractional modified value to the nearest whole number first", () => {
        const r = calcEffectiveAbilities(
            { ...modified, strength: 12.5, stamina: 12.4, will: 9.6 },
            2,
            1,
        );
        expect(r.strength).toBe(11);
        expect(r.stamina).toBe(10);
        expect(r.will).toBe(9);
    });
});

describe("roundWeight", () => {
    it("rounds to two decimal places", () => {
        expect(roundWeight(1.005)).toBe(1.01);
        expect(roundWeight(2.555)).toBe(2.56);
        expect(roundWeight(1.234)).toBe(1.23);
    });

    it("leaves a clean value alone", () => {
        expect(roundWeight(5)).toBe(5);
        expect(roundWeight(3.5)).toBe(3.5);
    });

    it("absorbs floating-point drift", () => {
        expect(roundWeight(0.1 + 0.2)).toBe(0.3);
    });
});

describe("calcTotalGearWeight", () => {
    const gear = (type, id, weight, quantity, isCarried, container = "on-person") => ({
        type,
        id,
        system: { weight, quantity, isCarried, container },
    });

    it("is 0 with no items", () => {
        expect(calcTotalGearWeight([])).toBe(0);
    });

    it("sums carried gear on the person", () => {
        expect(
            calcTotalGearWeight([
                gear("weapongear", "w1", 3, 1, true),
                gear("armorgear", "a1", 5, 1, true),
            ]),
        ).toBe(8);
    });

    it("leaves out gear that is not carried", () => {
        expect(calcTotalGearWeight([gear("weapongear", "w1", 3, 1, false)])).toBe(0);
    });

    it("multiplies by quantity", () => {
        expect(calcTotalGearWeight([gear("miscgear", "m1", 0.5, 10, true)])).toBe(5);
    });

    it("counts gear in a carried container along with the container", () => {
        expect(
            calcTotalGearWeight([
                gear("containergear", "c1", 1, 1, true),
                gear("miscgear", "m1", 2, 3, false, "c1"),
            ]),
        ).toBe(7);
    });

    it("leaves out gear in a container that is not carried, whatever its own flag says", () => {
        expect(
            calcTotalGearWeight([
                gear("containergear", "c1", 1, 1, false),
                gear("miscgear", "m1", 2, 3, true, "c1"),
            ]),
        ).toBe(0);
    });

    it("leaves out gear whose container is not among the items", () => {
        expect(calcTotalGearWeight([gear("miscgear", "m1", 2, 1, true, "gone")])).toBe(0);
    });

    it("ignores items that are not gear", () => {
        expect(
            calcTotalGearWeight([
                { type: "skill", id: "s1", system: { weight: 9, quantity: 1 } },
                { type: "injury", id: "i1", system: { weight: 9, quantity: 1 } },
            ]),
        ).toBe(0);
    });

    it("rounds the total to two decimal places", () => {
        expect(
            calcTotalGearWeight([
                gear("miscgear", "m1", 0.1, 1, true),
                gear("miscgear", "m2", 0.2, 1, true),
            ]),
        ).toBe(0.3);
    });

    it("accepts a collection that offers only forEach", () => {
        const map = new Map([["w1", gear("weapongear", "w1", 3, 2, true)]]);
        expect(calcTotalGearWeight(map)).toBe(6);
    });
});

describe("calcPenaltyPct", () => {
    it("costs 5 per penalty point", () => {
        expect(calcPenaltyPct(3)).toBe(15);
        expect(calcPenaltyPct(0)).toBe(0);
    });

    it("counts a missing penalty as 0", () => {
        expect(calcPenaltyPct(undefined)).toBe(0);
        expect(calcPenaltyPct(null)).toBe(0);
    });
});

describe("skill and psionic effective mastery level", () => {
    it("subtracts the penalty and adds the skill-base adjustment", () => {
        expect(calcSkillEml(60, 10, 0)).toBe(50);
        expect(calcSkillEml(60, 10, 5)).toBe(55);
        expect(calcSkillEml(60, 0, -10)).toBe(50);
    });

    it("can fall below zero before any floor is applied", () => {
        expect(calcSkillEml(10, 30, 0)).toBe(-20);
    });

    it("subtracts only the penalty for a psionic talent", () => {
        expect(calcPsionicEml(40, 15)).toBe(25);
    });
});

describe("spell and invocation effective mastery level", () => {
    it("subtracts 5 per spell level", () => {
        expect(calcSpellEml(60, 1)).toBe(55);
        expect(calcSpellEml(60, 3)).toBe(45);
        expect(calcSpellEml(60, 6)).toBe(30);
        expect(calcSpellEml(10, 5)).toBe(-15);
    });

    it("subtracts 5 per invocation circle", () => {
        expect(calcInvocationEml(70, 2)).toBe(60);
        expect(calcInvocationEml(70, 5)).toBe(45);
    });
});

describe("weapon mastery levels", () => {
    it("melee attack sums skill, bonus, modifier and effect modifier", () => {
        expect(calcWeaponAml(60, 2, 3)).toBe(65);
        expect(calcWeaponAml(60, 2, 3, 4)).toBe(69);
        expect(calcWeaponAml(60, 2, 3, -10)).toBe(55);
    });

    it("melee attack counts missing terms as 0", () => {
        expect(calcWeaponAml(null, null, null)).toBe(0);
        expect(calcWeaponAml(undefined, undefined, undefined)).toBe(0);
        expect(calcWeaponAml(60)).toBe(60);
    });

    it("melee defense sums skill, bonus and effect modifier", () => {
        expect(calcWeaponDml(60, -5)).toBe(55);
        expect(calcWeaponDml(60, -5, 7)).toBe(62);
        expect(calcWeaponDml(null, 3)).toBe(3);
    });

    it("missile attack sums skill, modifier and effect modifier", () => {
        expect(calcMissileAml(55, 5)).toBe(60);
        expect(calcMissileAml(55, 5, -3)).toBe(57);
        expect(calcMissileAml(undefined, undefined)).toBe(0);
    });
});

describe("clampMasteryLevel", () => {
    it("leaves 5 and above alone", () => {
        expect(clampMasteryLevel(60)).toBe(60);
        expect(clampMasteryLevel(5)).toBe(5);
    });

    it("raises anything below 5 to 5", () => {
        expect(clampMasteryLevel(4)).toBe(5);
        expect(clampMasteryLevel(-10)).toBe(5);
    });
});

describe("injurySeverity", () => {
    it("names each injury level", () => {
        expect(injurySeverity(0)).toBe("");
        expect(injurySeverity(1)).toBe("M1");
        expect(injurySeverity(2)).toBe("S2");
        expect(injurySeverity(3)).toBe("S3");
        expect(injurySeverity(4)).toBe("G4");
        expect(injurySeverity(5)).toBe("G5");
    });

    it("accepts the level as a string", () => {
        expect(injurySeverity("1")).toBe("M1");
        expect(injurySeverity("3")).toBe("S3");
    });
});

describe("calcEffectiveMove", () => {
    it("subtracts the penalty in hexes when the base move is under 25", () => {
        expect(calcEffectiveMove(10, 10, 3)).toBe(7);
        expect(calcEffectiveMove(24, 24, 2)).toBe(22);
    });

    it("subtracts five per penalty point when the base move is 25 or more", () => {
        expect(calcEffectiveMove(30, 25, 2)).toBe(20);
    });

    it("never goes below zero", () => {
        expect(calcEffectiveMove(4, 10, 9)).toBe(0);
        expect(calcEffectiveMove(10, 30, 5)).toBe(0);
    });

    it("is unchanged with no penalty", () => {
        expect(calcEffectiveMove(12, 12, 0)).toBe(12);
    });
});

describe("calcGearWeightTotals", () => {
    const gear = (id, type, o = {}) => ({
        id,
        type,
        system: { weight: 1, quantity: 1, isCarried: true, container: "on-person", ...o },
    });

    it("totals carried gear by category", () => {
        const r = calcGearWeightTotals([
            gear("a", "weapongear", { weight: 3 }),
            gear("b", "missilegear", { weight: 0.5, quantity: 4 }),
            gear("c", "armorgear", { weight: 10 }),
            gear("d", "miscgear", { weight: 2, quantity: 2 }),
        ]);
        expect(r).toMatchObject({ weapon: 3, missile: 2, armor: 10, misc: 4, total: 19 });
    });

    it("leaves uncarried gear out of the totals", () => {
        const r = calcGearWeightTotals([gear("a", "armorgear", { weight: 10, isCarried: false })]);
        expect(r.armor).toBe(0);
        expect(r.total).toBe(0);
    });

    it("counts a container's own weight as miscellaneous gear", () => {
        const r = calcGearWeightTotals([
            gear("c", "containergear", { weight: 2 }),
            gear("m", "miscgear", { weight: 1, container: "c" }),
        ]);
        expect(r.misc).toBe(3);
        expect(r.capacities).toEqual({ c: 1 });
    });

    it("gives contained gear its container's carried flag", () => {
        const r = calcGearWeightTotals([
            gear("c", "containergear", { weight: 2, isCarried: false }),
            gear("w", "weapongear", { weight: 5, container: "c" }),
        ]);
        expect(r.weapon).toBe(0);
        expect(r.carried).toEqual({ w: false });
        expect(r.capacities).toEqual({ c: 5 });
    });

    it("counts contained gear toward capacity whether or not it is carried", () => {
        const r = calcGearWeightTotals([
            gear("c", "containergear", { weight: 0 }),
            gear("a", "miscgear", { weight: 1.1, container: "c" }),
            gear("b", "miscgear", { weight: 2.2, container: "c" }),
        ]);
        expect(r.capacities.c).toBe(3.3);
    });

    it("floors negative weights at zero", () => {
        const r = calcGearWeightTotals([gear("a", "miscgear", { weight: -4 })]);
        expect(r.misc).toBe(0);
    });

    it("reports gear whose container is missing", () => {
        const r = calcGearWeightTotals([gear("a", "miscgear", { container: "gone" })]);
        expect(r.orphans).toEqual(["a"]);
        expect(r.carried).toEqual({});
        expect(r.misc).toBe(1);
    });

    it("sets every container's capacity, empty ones to zero", () => {
        const r = calcGearWeightTotals([gear("c", "containergear")]);
        expect(r.capacities).toEqual({ c: 0 });
    });

    it("rounds away floating-point drift", () => {
        const r = calcGearWeightTotals([
            gear("a", "miscgear", { weight: 0.1 }),
            gear("b", "miscgear", { weight: 0.2 }),
        ]);
        expect(r.misc).toBe(0.3);
        expect(r.total).toBe(0.3);
    });

    it("accepts a collection with only forEach", () => {
        const list = [gear("a", "miscgear", { weight: 2 })];
        expect(calcGearWeightTotals({ forEach: (f) => list.forEach(f) }).total).toBe(2);
    });
});
