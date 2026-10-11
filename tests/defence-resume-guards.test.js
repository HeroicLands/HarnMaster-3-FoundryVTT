// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as combat from "../module/combat.js";

const token = (name, isOwner) => ({ name, isOwner, actor: { type: "character" } });

describe("defence resume functions refuse a defender the user does not own", () => {
    const warn = vi.fn();

    beforeEach(() => {
        warn.mockClear();
        globalThis.ui = { notifications: { warn } };
    });

    afterEach(() => {
        delete globalThis.ui;
    });

    const resumes = {
        dodgeResume: combat.dodgeResume,
        blockResume: combat.blockResume,
        ignoreResume: combat.ignoreResume,
        meleeCounterstrikeResume: combat.meleeCounterstrikeResume,
    };

    for (const [name, resume] of Object.entries(resumes)) {
        it(`${name} warns naming the defender and returns null`, async () => {
            const result = await resume(
                token("Attacker", true),
                token("Defender", false),
                "melee",
                "Sword",
                60,
                "Mid",
                "Edged",
                0,
            );
            expect(result).toBeNull();
            expect(warn).toHaveBeenCalledOnce();
            expect(warn.mock.calls[0][0]).toContain("Defender");
        });
    }
});
