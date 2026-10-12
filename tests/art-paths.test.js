import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { ART_PATHS } from "../module/art-paths.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const PREFIX = "systems/hm3/";

/** Every file under a repository directory, as repository-relative paths. */
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
    return out.sort();
}

const repoPath = (foundryPath) => {
    expect(foundryPath.startsWith(PREFIX)).toBe(true);
    return foundryPath.slice(PREFIX.length);
};

describe("ART_PATHS", () => {
    it("names a file under images/ in every key", () => {
        for (const key of ART_PATHS.keys()) {
            const rel = repoPath(key);
            expect(rel.startsWith("images/"), key).toBe(true);
            expect(fs.existsSync(path.join(ROOT, rel)), key).toBe(true);
        }
    });

    it("names a file under assets/icons/ or assets/images/ in every value", () => {
        for (const value of ART_PATHS.values()) {
            const rel = repoPath(value);
            expect(/^assets\/(icons|images)\/[a-z0-9]+\.[a-z]+$/.test(rel), value).toBe(true);
            expect(fs.existsSync(path.join(ROOT, rel)), value).toBe(true);
        }
    });

    it("covers every file under images/ and every file under the asset roots, once", () => {
        const keys = [...ART_PATHS.keys()].map(repoPath).sort();
        const values = [...ART_PATHS.values()].map(repoPath).sort();
        expect(keys).toEqual(filesUnder("images"));
        expect(values).toEqual([...filesUnder("assets/icons"), ...filesUnder("assets/images")]);
        expect(new Set(values).size).toBe(values.length);
    });

    it("files each icon under assets/icons/ and every other image under assets/images/", () => {
        for (const [key, value] of ART_PATHS) {
            const root = repoPath(key).startsWith("images/icons/") ? "icons" : "images";
            expect(repoPath(value).startsWith(`assets/${root}/`), key).toBe(true);
        }
    });

    it("names each file by its shortcode, keeping its extension", () => {
        for (const [key, value] of ART_PATHS) {
            const ext = path.extname(key);
            const shortcode = path
                .basename(key, ext)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
            expect(path.basename(value), key).toBe(`${shortcode}${ext.toLowerCase()}`);
        }
    });

    it("moves each file without changing its bytes", () => {
        for (const [key, value] of ART_PATHS) {
            const before = fs.readFileSync(path.join(ROOT, repoPath(key)));
            const after = fs.readFileSync(path.join(ROOT, repoPath(value)));
            expect(after.equals(before), key).toBe(true);
        }
    });

    it("cannot be changed", () => {
        expect(() => ART_PATHS.set("a", "b")).toThrow(TypeError);
        expect(() => ART_PATHS.delete([...ART_PATHS.keys()][0])).toThrow(TypeError);
        expect(() => ART_PATHS.clear()).toThrow(TypeError);
        expect(ART_PATHS.size).toBeGreaterThan(0);
    });
});
