import { describe, it, expect } from "vitest";
import {
    combatOutcome,
    diceFormula,
    highestImpactWeapon,
    missileHalvedEml,
    missileRangeBand,
    missileRangeModifier,
    outnumberedModifier,
    rollResultCode,
} from "../module/combat-logic.js";
import { HM3 } from "../module/config.js";

describe("diceFormula", () => {
    it("is the bare dice with no additional impact", () => {
        expect(diceFormula(2, 0)).toBe("2d6");
        expect(diceFormula(3)).toBe("3d6");
    });

    it("appends a positive additional impact", () => {
        expect(diceFormula(2, 3)).toBe("2d6+3");
    });

    it("appends a negative additional impact", () => {
        expect(diceFormula(2, -4)).toBe("2d6-4");
    });

    it('is "no" for zero or fewer dice', () => {
        expect(diceFormula(0, 5)).toBe("no");
        expect(diceFormula(-1, 0)).toBe("no");
    });
});

describe("combatOutcome", () => {
    it("indexes ignore by the attack result alone", () => {
        expect(combatOutcome(HM3.meleeCombatTable, "cs", null, "ignore")).toBe(
            HM3.meleeCombatTable.ignore.cs,
        );
    });

    it("indexes other defences by attack and defence results", () => {
        expect(combatOutcome(HM3.meleeCombatTable, "ms", "mf", "dodge")).toBe(
            HM3.meleeCombatTable.dodge["ms:mf"],
        );
        expect(combatOutcome(HM3.missileCombatTable, "cs", "cs", "block")).toBe(
            HM3.missileCombatTable.block["cs:cs"],
        );
    });

    it("is null for an unknown defence or pairing", () => {
        expect(combatOutcome(HM3.meleeCombatTable, "cs", "cs", "nonsense")).toBeNull();
        expect(combatOutcome(HM3.meleeCombatTable, "xx", "yy", "block")).toBeNull();
    });
});

describe("rollResultCode", () => {
    it("names each of the four results", () => {
        expect(rollResultCode({ isCritical: true, isSuccess: true })).toBe("cs");
        expect(rollResultCode({ isCritical: true, isSuccess: false })).toBe("cf");
        expect(rollResultCode({ isCritical: false, isSuccess: true })).toBe("ms");
        expect(rollResultCode({ isCritical: false, isSuccess: false })).toBe("mf");
    });
});

describe("outnumberedModifier", () => {
    it("costs nothing at one attacker or fewer, or when unset", () => {
        expect(outnumberedModifier(0)).toBe(0);
        expect(outnumberedModifier(1)).toBe(0);
        expect(outnumberedModifier(undefined)).toBe(0);
    });

    it("costs 10 for each attacker beyond the first", () => {
        expect(outnumberedModifier(2)).toBe(-10);
        expect(outnumberedModifier(3)).toBe(-20);
        expect(outnumberedModifier(5)).toBe(-40);
    });

    it("counts only whole attackers beyond the first", () => {
        expect(outnumberedModifier(1.5)).toBe(0);
        expect(outnumberedModifier(2.9)).toBe(-10);
    });
});

describe("missileHalvedEml", () => {
    it("halves and rounds to the nearest whole number", () => {
        expect(missileHalvedEml(60)).toBe(30);
        expect(missileHalvedEml(61)).toBe(31);
    });

    it("never drops below 5", () => {
        expect(missileHalvedEml(6)).toBe(5);
        expect(missileHalvedEml(0)).toBe(5);
    });
});

describe("highestImpactWeapon", () => {
    const weapon = (name, blunt, edged, piercing) => ({
        name,
        system: { blunt, edged, piercing },
    });

    it("picks the weapon with the greatest impact in any aspect", () => {
        const a = weapon("a", 3, 4, 0);
        const b = weapon("b", 0, 2, 6);
        const c = weapon("c", 5, 5, 5);
        expect(highestImpactWeapon([a, b, c])).toBe(b);
    });

    it("prefers the first of equals", () => {
        const a = weapon("a", 4, 0, 0);
        const b = weapon("b", 0, 4, 0);
        expect(highestImpactWeapon([a, b])).toBe(a);
    });

    it("is null with no weapons, or none with impact at 0 or more", () => {
        expect(highestImpactWeapon([])).toBeNull();
        expect(highestImpactWeapon([weapon("x", -2, -3, -1)])).toBeNull();
    });
});

describe("missileRangeBand", () => {
    const range = { short: 10, medium: 20, long: 40, extreme: 80 };

    it("finds the band whose limit the distance does not exceed", () => {
        expect(missileRangeBand(10, range)).toEqual({ band: "short", exceedsExtreme: false });
        expect(missileRangeBand(11, range)).toEqual({ band: "medium", exceedsExtreme: false });
        expect(missileRangeBand(40, range)).toEqual({ band: "long", exceedsExtreme: false });
        expect(missileRangeBand(80, range)).toEqual({ band: "extreme", exceedsExtreme: false });
    });

    it("flags a distance beyond the extreme range", () => {
        expect(missileRangeBand(81, range)).toEqual({ band: "extreme", exceedsExtreme: true });
    });
});

describe("missileRangeModifier", () => {
    it("maps each range label to its band and modifier", () => {
        expect(missileRangeModifier("Short (10)")).toEqual({ range: "Short", rangeMod: 0 });
        expect(missileRangeModifier("Medium (20)")).toEqual({ range: "Medium", rangeMod: -20 });
        expect(missileRangeModifier("Long (40)")).toEqual({ range: "Long", rangeMod: -40 });
        expect(missileRangeModifier("Extreme (80)")).toEqual({ range: "Extreme", rangeMod: -80 });
    });
});
