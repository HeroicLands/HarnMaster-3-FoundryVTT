import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
    migrationStepsFor,
    migrateWorld,
    migrateCompendium,
    migrateSceneData,
} from "../module/migrations.js";

const clone = (o) => JSON.parse(JSON.stringify(o));

// The slice of Foundry's utilities the migration code calls. `isObjectEmpty`
// is deliberately absent: Foundry v14 does not ship it.
const utils = {
    isEmpty: (v) => v == null || (typeof v === "object" && Object.keys(v).length === 0),
    duplicate: clone,
    mergeObject: (a, b) => Object.assign(a, b),
    flattenObject: () => ({}),
    expandObject: (o) => o,
};

const ABILITIES = [
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
    "morality",
];

const legacyActor = (type = "character") => ({
    type,
    system: {
        abilities: Object.fromEntries(
            ABILITIES.map((a) => [a, a === "strength" ? { effective: 12 } : {}]),
        ),
        move: {},
        macros: { type: "script" },
    },
    items: [],
    effects: [],
});

function makeDoc(documentName, data) {
    const doc = {
        name: data.name ?? "doc",
        documentName,
        toObject: () => clone(data),
        update: vi.fn(async () => {}),
    };
    return doc;
}

function makePack(documentName, docs) {
    return {
        documentName,
        collection: `world.${documentName.toLowerCase()}s`,
        metadata: { package: "world", label: "Pack" },
        locked: true,
        configure: vi.fn(async () => {}),
        migrate: vi.fn(async () => {}),
        getDocuments: vi.fn(async () => docs),
    };
}

beforeEach(() => {
    vi.stubGlobal("foundry", { utils });
    vi.stubGlobal("game", {
        actors: {
            has: (id) => id === "known",
            get: (id) => (id === "known" ? { type: "character" } : undefined),
            contents: [],
        },
        items: { contents: [] },
        scenes: { contents: [] },
        journal: { contents: [] },
        macros: { contents: [] },
        tables: { contents: [] },
        packs: [],
        system: { version: "1.6.6" },
        settings: { get: () => "", set: vi.fn() },
    });
    vi.stubGlobal("ui", { notifications: { info: vi.fn() } });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("migrateSceneData", () => {
    it("handles tokens held as plain objects", () => {
        const scene = {
            tokens: [
                { _id: "a", actorId: null, actorLink: false },
                { _id: "b", actorId: "gone", actorLink: false },
                { _id: "c", actorId: "known", actorLink: true },
            ],
        };
        const { tokens } = migrateSceneData(scene);
        expect(tokens.map((t) => [t._id, t.actorId])).toEqual([
            ["a", null],
            ["b", null],
            ["c", "known"],
        ]);
    });

    it("migrates the actor data of an unlinked token", () => {
        const scene = {
            tokens: [{ _id: "d", actorId: "known", actorLink: false, actorData: legacyActor() }],
        };
        const { tokens } = migrateSceneData(scene);
        expect(tokens[0].actorData["system.abilities.strength.-=effective"]).toBeNull();
    });
});

describe("migrateSceneData on a v14 token", () => {
    it("leaves an unlinked token that carries a delta instead of actorData", () => {
        const delta = { _id: "d", system: {}, items: [], effects: [] };
        const scene = {
            tokens: [{ _id: "e", actorId: "known", actorLink: false, delta }],
        };
        const { tokens } = migrateSceneData(scene);
        expect(tokens[0].actorId).toBe("known");
        expect(tokens[0].delta).toEqual(delta);
    });
});

describe("migrateWorld scene step", () => {
    it("updates a scene without throwing", async () => {
        const scene = makeDoc("Scene", {
            name: "S",
            tokens: [{ _id: "a", actorId: null, actorLink: false }],
        });
        game.scenes.contents = [scene];
        await migrateWorld();
        expect(console.error).not.toHaveBeenCalled();
        expect(scene.update).toHaveBeenCalledTimes(1);
        expect(game.settings.set).toHaveBeenCalledWith("hm3", "systemMigrationVersion", "1.6.6");
    });

    it("updates a world actor and item without throwing", async () => {
        const actor = makeDoc("Actor", { name: "A", ...legacyActor() });
        game.actors.contents = [actor];
        await migrateWorld();
        expect(console.error).not.toHaveBeenCalled();
        expect(actor.update).toHaveBeenCalledTimes(1);
    });
});

describe("migrateCompendium", () => {
    it("migrates an Actor pack", async () => {
        const doc = makeDoc("Actor", { name: "A", ...legacyActor() });
        const pack = makePack("Actor", [doc]);
        await migrateCompendium(pack);
        expect(console.error).not.toHaveBeenCalled();
        expect(doc.update).toHaveBeenCalledTimes(1);
        expect(doc.update.mock.calls[0][0]["system.abilities.strength.-=effective"]).toBeNull();
        expect(pack.configure).toHaveBeenLastCalledWith({ locked: true });
    });

    it("migrates an Item pack", async () => {
        const doc = makeDoc("Item", { name: "I", type: "weapongear", system: {} });
        const pack = makePack("Item", [doc]);
        await migrateCompendium(pack);
        expect(console.error).not.toHaveBeenCalled();
        expect(doc.update).toHaveBeenCalledTimes(1);
    });

    it("migrates a Scene pack", async () => {
        const doc = makeDoc("Scene", {
            name: "S",
            tokens: [{ _id: "a", actorId: null, actorLink: false }],
        });
        const pack = makePack("Scene", [doc]);
        await migrateCompendium(pack);
        expect(console.error).not.toHaveBeenCalled();
        expect(doc.update).toHaveBeenCalledTimes(1);
    });
});

describe("migrationStepsFor", () => {
    it("runs the legacy steps and the art pass for a world below both thresholds", () => {
        expect(migrationStepsFor("1.0.0")).toEqual({ legacy: true, art: true, deity: true });
    });

    it("runs only the art pass for a world past the legacy threshold", () => {
        expect(migrationStepsFor("1.5.0")).toEqual({ legacy: false, art: true, deity: true });
        expect(migrationStepsFor("1.2.19")).toEqual({ legacy: false, art: true, deity: true });
    });

    it("runs nothing for a current world", () => {
        expect(migrationStepsFor("1.6.6")).toEqual({ legacy: false, art: false, deity: false });
        expect(migrationStepsFor("1.10.0")).toEqual({ legacy: false, art: false, deity: false });
    });

    it("runs only the art pass for a world with no stored version", () => {
        for (const v of [0, "0", "", undefined, null]) {
            expect(migrationStepsFor(v)).toEqual({ legacy: false, art: true, deity: false });
        }
    });
});

describe("migrateWorld steps", () => {
    it("skips the legacy steps when only the art pass is asked for", async () => {
        const actor = makeDoc("Actor", { name: "A", ...legacyActor() });
        game.actors.contents = [actor];
        await migrateWorld({ legacy: false, art: true, deity: true });
        expect(actor.update).not.toHaveBeenCalled();
        expect(game.settings.set).toHaveBeenCalledWith("hm3", "systemMigrationVersion", "1.6.6");
    });
});

describe("modern deity migration is independent of legacy schema migration", () => {
    it("upgrades a 1.6.5 world without deleting modern actor fields", async () => {
        const actor = makeDoc("Actor", {
            ...legacyActor(),
            items: [{ _id: "spell", type: "invocation", system: { diety: "Larani" } }],
        });
        const invocation = makeDoc("Item", {
            type: "invocation",
            system: { diety: "Agrik", deity: "Siem" },
        });
        game.actors.contents = [actor];
        game.items.contents = [invocation];
        const steps = migrationStepsFor("1.6.5");
        expect(steps).toEqual({ legacy: false, art: true, deity: true });
        await migrateWorld(steps);
        expect(actor.update).toHaveBeenCalledExactlyOnceWith(
            { items: [{ _id: "spell", "system.deity": "Larani", "system.-=diety": null }] },
            { enforceTypes: false },
        );
        expect(invocation.update).toHaveBeenCalledExactlyOnceWith(
            { "system.-=diety": null },
            { enforceTypes: false },
        );
    });
    it("migrates locked world compendiums and restores their lock", async () => {
        const item = makeDoc("Item", { type: "invocation", system: { diety: "Larani" } });
        const pack = makePack("Item", [item]);
        game.packs = [pack];
        await migrateWorld({ legacy: false, art: false, deity: true });
        expect(item.update).toHaveBeenCalledWith(
            { "system.deity": "Larani", "system.-=diety": null },
            { enforceTypes: false },
        );
        expect(pack.migrate).not.toHaveBeenCalled();
        expect(pack.configure).toHaveBeenLastCalledWith({ locked: true });
    });
    it("migrates unlinked token overrides without changing linked tokens", async () => {
        const items = [{ _id: "spell", type: "invocation", system: { diety: "Larani" } }];
        const scene = makeDoc("Scene", {
            tokens: [
                { _id: "unlinked", actorLink: false, delta: { items } },
                { _id: "old", actorLink: false, actorData: { items } },
                { _id: "linked", actorLink: true, delta: { items } },
            ],
        });
        game.scenes.contents = [scene];
        await migrateWorld({ legacy: false, art: false, deity: true });
        const patch = [{ _id: "spell", "system.deity": "Larani", "system.-=diety": null }];
        expect(scene.update).toHaveBeenCalledExactlyOnceWith(
            {
                tokens: [
                    { _id: "unlinked", delta: { items: patch } },
                    { _id: "old", actorData: { items: patch } },
                ],
            },
            { enforceTypes: false },
        );
    });
});
