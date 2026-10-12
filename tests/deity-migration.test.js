import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// item-models.js reads `foundry.*` at import time. The minimum Foundry
// surface it needs is a TypeDataModel with a pass-through migrateData and
// field constructors that record nothing.
class TypeDataModel {
    static migrateData(source) {
        return source;
    }
}
const field = class {};
function flattenObject(obj, prefix = "") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
            Object.assign(out, flattenObject(v, `${prefix}${k}.`));
        } else {
            out[`${prefix}${k}`] = v;
        }
    }
    return out;
}
vi.stubGlobal("foundry", {
    abstract: { TypeDataModel },
    utils: { flattenObject },
    data: {
        fields: new Proxy({}, { get: () => field }),
    },
});

let InvocationModel;
let migrateItemData;

beforeAll(async () => {
    ({ InvocationModel } = await import("../module/data/item-models.js"));
    ({ migrateItemData } = await import("../module/migrations.js"));
});

describe("InvocationModel.migrateData", () => {
    it("copies diety to deity when deity is absent", () => {
        const out = InvocationModel.migrateData({ diety: "Larani" });
        expect(out.deity).toBe("Larani");
    });

    it("copies diety to deity when deity is blank", () => {
        const out = InvocationModel.migrateData({ diety: "Larani", deity: "" });
        expect(out.deity).toBe("Larani");
    });

    it("never overwrites an existing deity", () => {
        const out = InvocationModel.migrateData({ diety: "Larani", deity: "Save-K'nor" });
        expect(out.deity).toBe("Save-K'nor");
    });

    it("does not invent a deity from a blank diety", () => {
        const out = InvocationModel.migrateData({ diety: "" });
        expect(out.deity).toBeUndefined();
    });
});

describe("migrateItemData for invocations", () => {
    it("moves diety to deity and unsets diety", () => {
        const update = migrateItemData({
            type: "invocation",
            system: { diety: "Agrik", macros: { type: "script" } },
        });
        expect(update["system.deity"]).toBe("Agrik");
        expect(update).toHaveProperty("system.-=diety", null);
    });

    it("keeps an existing deity and still unsets diety", () => {
        const update = migrateItemData({
            type: "invocation",
            system: { diety: "Agrik", deity: "Siem", macros: { type: "script" } },
        });
        expect(update["system.deity"]).toBeUndefined();
        expect(update).toHaveProperty("system.-=diety", null);
    });

    it("leaves a clean invocation alone", () => {
        const update = migrateItemData({
            type: "invocation",
            system: { deity: "Agrik", macros: { type: "script" } },
        });
        expect(update).toEqual({});
    });
});

describe("committed packs", () => {
    const root = path.resolve(import.meta.dirname, "../assets/packs");
    const files = fs
        .readdirSync(root, { recursive: true })
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(root, f));

    it("find pack documents", () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it("carry no non-empty system.diety", () => {
        const offenders = files.filter((f) => {
            const doc = JSON.parse(fs.readFileSync(f, "utf8"));
            return Boolean(doc?.system && "diety" in doc.system && doc.system.diety);
        });
        expect(offenders).toEqual([]);
    });
});
