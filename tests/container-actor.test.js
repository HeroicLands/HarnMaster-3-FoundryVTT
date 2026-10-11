import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * Derived-data preparation by actor type. A container has no abilities, so
 * preparing one must not read them; a character must still derive its
 * strength-based values.
 */
describe("HarnMasterActor data preparation by actor type", () => {
    let HarnMasterActor;

    beforeAll(async () => {
        globalThis.Actor = class {
            prepareBaseData() {}
            prepareDerivedData() {}
        };
        globalThis.foundry = {
            utils: {
                mergeObject: (a, b) => Object.assign(a, b),
                expandObject: (o) => o,
            },
        };
        globalThis.Hooks = { call: vi.fn(), on: vi.fn(), once: vi.fn() };
        ({ HarnMasterActor } = await import("../module/actor/actor.js"));
    });

    function build(type, system) {
        const actor = Object.create(HarnMasterActor.prototype);
        Object.defineProperties(actor, {
            type: { value: type },
            system: { value: system },
            items: { value: [] },
            effects: { value: [] },
            overrides: { value: {} },
            itemTypes: { value: new Proxy({}, { get: () => [] }) },
            isOwner: { value: true },
        });
        return actor;
    }

    function characterSystem() {
        const abilities = {};
        for (const name of [
            "strength",
            "stamina",
            "dexterity",
            "agility",
            "intelligence",
            "aura",
            "will",
            "eyesight",
            "hearing",
            "smell",
            "voice",
            "comeliness",
            "morality",
        ]) {
            abilities[name] = { base: 12 };
        }
        return { abilities, move: { base: 5 }, fatigue: 0 };
    }

    it("prepares a container, which has no abilities, without throwing", () => {
        const actor = build("container", { capacity: { max: 100 } });
        expect(() => {
            actor.prepareBaseData();
            actor.prepareDerivedData();
        }).not.toThrow();
        expect(actor.system.capacity.pct).toBe(100);
    });

    it("prepares a character and derives its strength-based values", () => {
        const actor = build("character", characterSystem());
        actor.prepareBaseData();
        expect(actor.system.eph.strength).toBe(12);
        expect(actor.system.endurance).toBe(12);
        actor.prepareDerivedData();
        expect(actor.system.abilities.strength.modified).toBe(12);
    });
});
