import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Where the system and its content name the art it ships. */
const SCANNED = ["module", "templates", "lang", "assets/packs", "scss", "cypress/fixtures"];

/** The table itself and the migration that reads it name the old paths on purpose. */
const EXEMPT = new Set(["module/art-paths.js", "module/migrations.js"]);

function filesUnder(dir) {
    const out = [];
    const walk = (rel) => {
        for (const entry of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
            const child = `${rel}/${entry.name}`;
            if (entry.isDirectory()) walk(child);
            else if (entry.isFile()) out.push(child);
        }
    };
    walk(dir);
    return out;
}

describe("references to the system's art", () => {
    it("name the flat icons/ and images/ files, never the legacy images/ subdirectories", () => {
        const offenders = [];
        for (const dir of SCANNED) {
            for (const file of filesUnder(dir)) {
                if (EXEMPT.has(file)) continue;
                const text = fs.readFileSync(path.join(ROOT, file), "utf8");
                const count = (text.match(/systems\/hm3\/images\/[^/"'\s)]+\//g) ?? []).length;
                if (count) offenders.push(`${file}: ${count}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it("leave no stylesheet pointing at a file the flat images/ lacks", () => {
        const offenders = [];
        for (const file of filesUnder("scss")) {
            const text = fs.readFileSync(path.join(ROOT, file), "utf8");
            for (const [, name] of text.matchAll(/url\(\s*["']?\.\.\/images\/([^"')\s]+)/g)) {
                if (!fs.existsSync(path.join(ROOT, "assets/images", name)))
                    offenders.push(`${file}: ${name}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it("name a file that exists", () => {
        const missing = [];
        const pattern = /systems\/hm3\/((?:icons|images)\/[A-Za-z0-9_.-]+)(?=["'\s)]|$)/g;
        for (const dir of SCANNED) {
            for (const file of filesUnder(dir)) {
                const text = fs.readFileSync(path.join(ROOT, file), "utf8");
                for (const [, rel] of text.matchAll(pattern)) {
                    if (!fs.existsSync(path.join(ROOT, "assets", rel)))
                        missing.push(`${file}: ${rel}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });
});
