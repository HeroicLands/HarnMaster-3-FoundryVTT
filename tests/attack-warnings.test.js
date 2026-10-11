// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { meleeAttack } from "../module/combat.js";

const token = (name, weapons = []) => ({
    id: name,
    name,
    isOwner: true,
    document: {},
    actor: { type: "character", itemTypes: { weapongear: weapons } },
});

describe("meleeAttack warns instead of throwing", () => {
    const warn = vi.fn();

    beforeEach(() => {
        warn.mockClear();
        globalThis.ui = { notifications: { warn, error: vi.fn() } };
        // Theatre of the Mind scenes report range 0, so no canvas geometry is needed.
        globalThis.canvas = { scene: { grid: {}, getFlag: () => true } };
        globalThis.ChatMessage = { getSpeaker: () => ({}) };
        globalThis.foundry = {
            applications: {
                handlebars: { renderTemplate: async () => "" },
                api: { DialogV2: { prompt: async () => null } },
            },
        };
    });

    afterEach(() => {
        for (const k of ["ui", "canvas", "ChatMessage", "foundry"]) delete globalThis[k];
    });

    it("says a chosen weapon is not equipped", async () => {
        const sword = { name: "Sword", system: { isEquipped: false } };
        const result = await meleeAttack(token("Attacker"), token("Defender"), sword);
        expect(result).toBeNull();
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toContain("Sword is not equipped");
    });

    it("names the attacker when the weapon dialog is dismissed", async () => {
        const sword = {
            name: "Sword",
            system: { isEquipped: true, blunt: 1, edged: 2, piercing: 1 },
        };
        const result = await meleeAttack(token("Attacker", [sword]), token("Defender"));
        expect(result).toBeNull();
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toContain("Attacker has no equipped weapons");
    });
});
