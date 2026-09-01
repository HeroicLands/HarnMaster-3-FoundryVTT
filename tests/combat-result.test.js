import { describe, it, expect } from "vitest";
import { meleeCombatResult, missileCombatResult } from "../module/combat.js";
import { HM3 } from "../module/config.js";

describe("meleeCombatResult", () => {
    describe("table lookup", () => {
        it("returns null for invalid defense type", () => {
            expect(meleeCombatResult("cs", "cs", "invalid")).toBeNull();
        });

        it("returns a result for all valid melee defense types", () => {
            for (const defense of ["block", "counterstrike", "dodge", "ignore"]) {
                const result = meleeCombatResult("cs", "cs", defense);
                expect(result, `defense=${defense}`).not.toBeNull();
                expect(result).toHaveProperty("outcome");
                expect(result).toHaveProperty("desc");
            }
        });

        it("handles ignore defense (single index, not paired)", () => {
            const result = meleeCombatResult("cs", null, "ignore");
            expect(result).not.toBeNull();
            expect(result.outcome).toBeDefined();
        });
    });

    describe("block defense results", () => {
        it("cs vs cs: attack blocked", () => {
            const result = meleeCombatResult("cs", "cs", "block");
            expect(result.outcome.block).toBe(true);
            expect(result.desc).toContain("blocked");
        });

        it("cs vs mf: attacker strikes", () => {
            const result = meleeCombatResult("cs", "mf", "block");
            expect(result.outcome.atkDice).toBeGreaterThan(0);
            expect(result.desc).toContain("impact");
        });
    });

    describe("counterstrike defense results", () => {
        it("returns both desc and csDesc", () => {
            const result = meleeCombatResult("cs", "cs", "counterstrike");
            expect(result).toHaveProperty("desc");
            expect(result).toHaveProperty("csDesc");
        });

        it("cs vs mf: attacker strikes, counterstriker described", () => {
            const result = meleeCombatResult("cs", "mf", "counterstrike");
            expect(result.outcome.atkDice).toBeGreaterThan(0);
            expect(result.desc).toContain("impact");
        });

        it("mf vs cs: counterstriker strikes", () => {
            const result = meleeCombatResult("mf", "cs", "counterstrike");
            expect(result.outcome.defDice).toBeGreaterThan(0);
            expect(result.csDesc).toContain("impact");
        });
    });

    describe("dodge defense results", () => {
        it("mf vs cs: defender gains tactical advantage", () => {
            const result = meleeCombatResult("mf", "cs", "dodge");
            expect(result.outcome.dta).toBe(true);
            expect(result.desc).toContain("Tactical Advantage");
        });
    });

    describe("additional impact", () => {
        it("includes additional impact in description", () => {
            const result = meleeCombatResult("cs", "mf", "block", 3);
            expect(result.desc).toMatch(/\d+d6\+3/);
        });

        it("includes negative additional impact", () => {
            const result = meleeCombatResult("cs", "mf", "block", -2);
            expect(result.desc).toMatch(/\d+d6-2/);
        });

        it("no modifier shown when additional impact is 0", () => {
            const result = meleeCombatResult("cs", "mf", "block", 0);
            expect(result.desc).toMatch(/\d+d6 impact/);
        });
    });

    describe("table completeness", () => {
        const rollResults = ["cs", "ms", "mf", "cf"];

        it("melee combat table has all defense types", () => {
            expect(HM3.meleeCombatTable).toHaveProperty("block");
            expect(HM3.meleeCombatTable).toHaveProperty("counterstrike");
            expect(HM3.meleeCombatTable).toHaveProperty("dodge");
            expect(HM3.meleeCombatTable).toHaveProperty("ignore");
        });

        it("paired defenses have all 16 roll combinations", () => {
            for (const defense of ["block", "counterstrike", "dodge"]) {
                for (const atk of rollResults) {
                    for (const def of rollResults) {
                        const key = `${atk}:${def}`;
                        expect(
                            HM3.meleeCombatTable[defense],
                            `${defense} missing ${key}`,
                        ).toHaveProperty(key);
                    }
                }
            }
        });

        it("ignore defense has all 4 attack results", () => {
            for (const atk of rollResults) {
                expect(HM3.meleeCombatTable["ignore"], `ignore missing ${atk}`).toHaveProperty(atk);
            }
        });
    });
});

describe("missileCombatResult", () => {
    it("returns null for invalid defense type", () => {
        expect(missileCombatResult("cs", "cs", "invalid")).toBeNull();
    });

    it("returns a result for valid defense types", () => {
        for (const defense of ["block", "dodge", "ignore"]) {
            const result = missileCombatResult("cs", "cs", defense);
            expect(result, `defense=${defense}`).not.toBeNull();
            expect(result).toHaveProperty("outcome");
            expect(result).toHaveProperty("desc");
        }
    });

    it("ignore defense uses single index", () => {
        const result = missileCombatResult("cs", null, "ignore");
        expect(result).not.toBeNull();
    });

    it("includes additional impact in description", () => {
        const result = missileCombatResult("cs", "mf", "dodge", 4);
        if (result.outcome.atkDice) {
            expect(result.desc).toMatch(/\d+d6\+4/);
        }
    });

    describe("table completeness", () => {
        const rollResults = ["cs", "ms", "mf", "cf"];

        it("missile combat table has expected defense types", () => {
            expect(HM3.missileCombatTable).toHaveProperty("block");
            expect(HM3.missileCombatTable).toHaveProperty("dodge");
            expect(HM3.missileCombatTable).toHaveProperty("ignore");
        });

        it("paired defenses have all 16 roll combinations", () => {
            for (const defense of ["block", "dodge"]) {
                for (const atk of rollResults) {
                    for (const def of rollResults) {
                        const key = `${atk}:${def}`;
                        expect(
                            HM3.missileCombatTable[defense],
                            `${defense} missing ${key}`,
                        ).toHaveProperty(key);
                    }
                }
            }
        });

        it("ignore defense has all 4 attack results", () => {
            for (const atk of rollResults) {
                expect(HM3.missileCombatTable["ignore"], `ignore missing ${atk}`).toHaveProperty(
                    atk,
                );
            }
        });
    });
});
