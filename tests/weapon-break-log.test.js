import { describe, it, expect, vi, afterEach } from "vitest";
import { logWeaponBreakRoll } from "../module/combat.js";

const fakeRoll = (values) => ({
    formula: "3d6",
    total: values.reduce((a, b) => a + b, 0),
    dice: [{ values }],
});

describe("logWeaponBreakRoll", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("logs one debug line naming the rule state, formula, dice, quality and outcome", () => {
        const debug = vi.spyOn(console, "debug").mockImplementation(() => {});

        logWeaponBreakRoll(true, "Long Sword", fakeRoll([2, 5, 4]), 12, false);

        expect(debug).toHaveBeenCalledTimes(1);
        expect(debug).toHaveBeenCalledWith(
            "HM3 | Weapon Damage rule enabled: true; Long Sword: formula 3d6, dice 2 + 5 + 4 = 11 against quality 12, weapon broke: false",
        );
    });

    it("reports a broken weapon", () => {
        const debug = vi.spyOn(console, "debug").mockImplementation(() => {});

        logWeaponBreakRoll(true, "Dagger", fakeRoll([6, 6, 5]), 8, true);

        expect(debug.mock.calls[0][0]).toContain("= 17 against quality 8, weapon broke: true");
    });
});
