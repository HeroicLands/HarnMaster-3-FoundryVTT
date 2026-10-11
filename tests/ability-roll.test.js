import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const d6Roll = vi.fn();

vi.mock("../module/dice-hm3.js", () => ({
    DiceHM3: { d6Roll, d100StdRoll: vi.fn() },
}));
vi.mock("../module/combat.js", () => ({}));
vi.mock("../module/utility.js", () => ({}));
vi.mock("../module/config.js", () => ({ HM3: {} }));

describe("testAbilityD6Roll", () => {
    let actor;

    beforeEach(() => {
        actor = {
            id: "actor1",
            name: "Test",
            isToken: false,
            isOwner: true,
            system: { abilities: { strength: { effective: 12 } } },
            runCustomMacro: vi.fn(),
        };
        globalThis.Actor = class {};
        Object.setPrototypeOf(actor, globalThis.Actor.prototype);
        globalThis.ui = { notifications: { warn: vi.fn() } };
        globalThis.ChatMessage = { getSpeaker: vi.fn(() => ({ alias: "Test" })) };
        globalThis.Hooks = { call: vi.fn(() => true), callAll: vi.fn() };
        globalThis.game = { hm3: {}, macros: { getName: vi.fn(() => null) } };
    });

    afterEach(() => {
        for (const k of ["Actor", "ui", "ChatMessage", "Hooks", "game"]) delete globalThis[k];
        vi.clearAllMocks();
    });

    it("runs the actor's custom macro with the roll result", async () => {
        const result = { type: "strength-d6", isSuccess: true, isCritical: false, modifier: 0 };
        d6Roll.mockResolvedValue(result);
        const { testAbilityD6Roll } = await import("../module/macros.js");

        const returned = await testAbilityD6Roll("strength", true, actor);

        expect(returned).toBe(result);
        expect(actor.runCustomMacro).toHaveBeenCalledWith(result);
        expect(globalThis.Hooks.call).toHaveBeenCalledWith(
            "hm3.onAbilityRollD6",
            actor,
            expect.objectContaining({ type: "strength-d6" }),
            expect.any(Object),
        );
    });
});
