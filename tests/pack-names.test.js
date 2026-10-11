// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SPECIALTY_PATTERN } from "../module/utility.js";

const ITEMS = path.resolve(import.meta.dirname, "../assets/packs/items");

describe("standard items pack", () => {
    it("has no psionic talent whose name reads as a skill specialty", () => {
        const offenders = [];
        for (const file of fs.readdirSync(ITEMS)) {
            if (!file.endsWith(".json")) continue;
            const doc = JSON.parse(fs.readFileSync(path.join(ITEMS, file), "utf8"));
            if (doc.type === "psionic" && SPECIALTY_PATTERN.test(doc.name)) {
                offenders.push(doc.name);
            }
        }
        expect(offenders).toEqual([]);
    });
});
