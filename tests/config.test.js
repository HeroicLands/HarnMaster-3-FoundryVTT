import { describe, it, expect } from "vitest";
import { HM3 } from "../module/config.js";

describe("HM3.meleeCombatTable", () => {
    const rollResults = ["cs", "ms", "mf", "cf"];
    const pairedDefenses = ["block", "counterstrike", "dodge"];

    it("has all four defense types", () => {
        expect(HM3.meleeCombatTable).toHaveProperty("block");
        expect(HM3.meleeCombatTable).toHaveProperty("counterstrike");
        expect(HM3.meleeCombatTable).toHaveProperty("dodge");
        expect(HM3.meleeCombatTable).toHaveProperty("ignore");
    });

    for (const defense of pairedDefenses) {
        describe(`${defense} defense`, () => {
            for (const atk of rollResults) {
                for (const def of rollResults) {
                    const key = `${atk}:${def}`;
                    it(`has entry for ${key}`, () => {
                        const entry = HM3.meleeCombatTable[defense][key];
                        expect(entry).toBeDefined();
                        expect(entry).toHaveProperty("atkDice");
                        expect(typeof entry.atkDice).toBe("number");
                    });
                }
            }
        });
    }

    describe("ignore defense", () => {
        for (const atk of rollResults) {
            it(`has entry for ${atk}`, () => {
                const entry = HM3.meleeCombatTable["ignore"][atk];
                expect(entry).toBeDefined();
                expect(entry).toHaveProperty("atkDice");
            });
        }
    });
});

describe("HM3.missileCombatTable", () => {
    const rollResults = ["cs", "ms", "mf", "cf"];

    it("has expected defense types", () => {
        expect(HM3.missileCombatTable).toHaveProperty("block");
        expect(HM3.missileCombatTable).toHaveProperty("dodge");
        expect(HM3.missileCombatTable).toHaveProperty("ignore");
    });

    for (const defense of ["block", "dodge"]) {
        describe(`${defense} defense`, () => {
            for (const atk of rollResults) {
                for (const def of rollResults) {
                    const key = `${atk}:${def}`;
                    it(`has entry for ${key}`, () => {
                        const entry = HM3.missileCombatTable[defense][key];
                        expect(entry).toBeDefined();
                    });
                }
            }
        });
    }

    describe("ignore defense", () => {
        for (const atk of rollResults) {
            it(`has entry for ${atk}`, () => {
                const entry = HM3.missileCombatTable["ignore"][atk];
                expect(entry).toBeDefined();
            });
        }
    });
});

describe("HM3.injuryLocations", () => {
    it("has injury location data", () => {
        expect(HM3.injuryLocations).toBeDefined();
        expect(Object.keys(HM3.injuryLocations).length).toBeGreaterThan(0);
    });

    it("each location has impactType", () => {
        for (const [key, loc] of Object.entries(HM3.injuryLocations)) {
            expect(loc, `${key} missing impactType`).toHaveProperty("impactType");
        }
    });
});

describe("HM3.sunsigns", () => {
    it("has entries", () => {
        expect(HM3.sunsigns).toBeDefined();
        expect(HM3.sunsigns.length).toBeGreaterThan(0);
    });

    it("each sunsign is a non-empty string", () => {
        for (const ss of HM3.sunsigns) {
            expect(typeof ss).toBe("string");
            expect(ss.length).toBeGreaterThan(0);
        }
    });
});

describe("HM3.stdSkills", () => {
    it("has skill definitions", () => {
        expect(HM3.stdSkills).toBeDefined();
        expect(Object.keys(HM3.stdSkills).length).toBeGreaterThan(0);
    });

    it("each skill has type and base formula", () => {
        for (const [name, skill] of Object.entries(HM3.stdSkills)) {
            expect(skill, `${name} missing type`).toHaveProperty("type");
            expect(skill, `${name} missing skillBase`).toHaveProperty("skillBase");
            expect(skill.skillBase, `${name} missing formula`).toHaveProperty("formula");
        }
    });
});
