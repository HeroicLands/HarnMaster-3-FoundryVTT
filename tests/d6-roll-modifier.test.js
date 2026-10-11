import { describe, it, expect, vi, beforeEach } from "vitest";

const rendered = [];

beforeEach(() => {
    rendered.length = 0;
    globalThis.foundry = {
        utils: { mergeObject: (a, b) => ({ ...a, ...b }) },
        applications: {
            handlebars: {
                renderTemplate: vi.fn(async (_tpl, data) => {
                    rendered.push(data);
                    return "<div></div>";
                }),
            },
        },
    };
    globalThis.Roll = class {
        constructor() {
            this.total = 3;
            this.dice = [{ values: [3] }];
        }
        async evaluate() {
            return this;
        }
    };
    globalThis.ChatMessage = {
        getSpeaker: () => ({ alias: "Tester" }),
        create: vi.fn(async () => {}),
    };
    globalThis.game = { user: { id: "u" }, settings: { get: () => "publicroll" } };
    globalThis.CONST = { CHAT_MESSAGE_STYLES: { ROLL: 5 } };
    globalThis.CONFIG = { sounds: { dice: "" } };
});

async function rollWith(fn, modifier) {
    const { DiceHM3 } = await import("../module/dice-hm3.js");
    return DiceHM3[fn]({
        type: "t",
        label: "Test",
        target: 10,
        modifier,
        numdice: 3,
        fastforward: true,
    });
}

describe("attribute roll modifier sign", () => {
    it("d100 shows a positive modifier with a plus", async () => {
        const data = await rollWith("d100StdRoll", 5);
        expect(data.plusMinus).toBe("+");
        expect(data.modifier).toBe(5);
    });

    it("d6 shows a positive modifier with a plus", async () => {
        const data = await rollWith("d6Roll", 2);
        expect(data.plusMinus).toBe("+");
        expect(data.modifier).toBe(2);
    });

    it("d6 shows a negative modifier as a magnitude with a minus", async () => {
        const data = await rollWith("d6Roll", -2);
        expect(data.plusMinus).toBe("-");
        expect(data.modifier).toBe(2);
    });
});
