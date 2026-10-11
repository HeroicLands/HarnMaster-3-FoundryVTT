import { describe, it, expect } from "vitest";
import { effectiveRollMode } from "../module/roll-mode.js";

const list = "Climbing, Stealth ,  Awareness";

describe("effectiveRollMode", () => {
    it("leaves the mode alone when the feature is off", () => {
        expect(effectiveRollMode("publicroll", "Stealth", false, list)).toBe("publicroll");
    });

    it("makes a listed public roll blind", () => {
        expect(effectiveRollMode("publicroll", "Stealth", true, list)).toBe("blindroll");
    });

    it.each(["selfroll", "gmroll", "blindroll"])("leaves %s alone", (mode) => {
        expect(effectiveRollMode(mode, "Stealth", true, list)).toBe(mode);
    });

    it("keeps an unlisted skill public", () => {
        expect(effectiveRollMode("publicroll", "Swimming", true, list)).toBe("publicroll");
    });

    it("matches case-insensitively and trims spaces", () => {
        expect(effectiveRollMode("publicroll", "  aWaReNeSs ", true, list)).toBe("blindroll");
        expect(effectiveRollMode("publicroll", "stealth", true, list)).toBe("blindroll");
    });

    it("ignores empty entries and missing names", () => {
        expect(effectiveRollMode("publicroll", "", true, ",,")).toBe("publicroll");
        expect(effectiveRollMode("publicroll", undefined, true, list)).toBe("publicroll");
        expect(effectiveRollMode("publicroll", "Stealth", true, undefined)).toBe("publicroll");
    });
});
