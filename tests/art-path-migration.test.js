import { describe, it, expect } from "vitest";

import {
    rewriteSystemArtPath,
    migrateActorArt,
    migrateItemArt,
    migrateSceneArt,
    migrateJournalArt,
    migrateMacroArt,
    migrateRollTableArt,
    artMigrationFor,
} from "../module/migrations.js";

const OLD_ICON = "systems/hm3/images/icons/svg/tied-scroll.svg";
const NEW_ICON = "systems/hm3/icons/tiedscroll.svg";
const OLD_PNG = "systems/hm3/images/icons/png/ilvir.png";
const NEW_PNG = "systems/hm3/icons/ilvir.png";
const OLD_KNIGHT = "systems/hm3/images/svg/knight-silhouette.svg";
const NEW_KNIGHT = "systems/hm3/images/knightsilhouette.svg";
const OLD_HELP = "systems/hm3/images/help/combat-tab.jpg";
const NEW_HELP = "systems/hm3/images/combattab.jpg";
const FOREIGN = "icons/svg/mystery-man.svg";

describe("rewriteSystemArtPath", () => {
    it("rewrites an old path to its new one", () => {
        expect(rewriteSystemArtPath(OLD_ICON)).toBe(NEW_ICON);
        expect(rewriteSystemArtPath(OLD_PNG)).toBe(NEW_PNG);
        expect(rewriteSystemArtPath(OLD_KNIGHT)).toBe(NEW_KNIGHT);
    });

    it("changes nothing on a second run", () => {
        const once = rewriteSystemArtPath(OLD_ICON);
        expect(rewriteSystemArtPath(once)).toBe(once);
        const html = rewriteSystemArtPath(`<img src="${OLD_HELP}">`);
        expect(rewriteSystemArtPath(html)).toBe(html);
    });

    it("leaves a foreign path alone", () => {
        for (const path of [
            FOREIGN,
            "worlds/mine/portraits/hero.webp",
            "modules/somemodule/systems/hm3/images/icons/svg/tied-scroll.svg",
            "https://example.com/systems/hm3/images/icons/svg/tied-scroll.svg",
            `${OLD_ICON}x`,
            "systems/hm3/images/icons/svg/not-a-file-we-ship.svg",
        ]) {
            expect(rewriteSystemArtPath(path)).toBe(path);
        }
    });

    it("rewrites a path inside HTML", () => {
        const html = `<p>See <img src="${OLD_HELP}" alt="x"> and <img src='${OLD_ICON}'></p>`;
        expect(rewriteSystemArtPath(html)).toBe(
            `<p>See <img src="${NEW_HELP}" alt="x"> and <img src='${NEW_ICON}'></p>`,
        );
    });

    it("rewrites a path in markdown image syntax", () => {
        expect(rewriteSystemArtPath(`![tab](${OLD_HELP}) text`)).toBe(`![tab](${NEW_HELP}) text`);
    });

    it("keeps a leading slash and a query string", () => {
        expect(rewriteSystemArtPath(`/${OLD_ICON}`)).toBe(`/${NEW_ICON}`);
        expect(rewriteSystemArtPath(`${OLD_ICON}?v=2`)).toBe(`${NEW_ICON}?v=2`);
    });

    it("returns a value that is not a string unchanged", () => {
        for (const value of [undefined, null, 3, true]) {
            expect(rewriteSystemArtPath(value)).toBe(value);
        }
        const obj = { a: OLD_ICON };
        expect(rewriteSystemArtPath(obj)).toBe(obj);
    });
});

const effect = (_id, img) => ({ _id, name: "Effect", img, changes: [] });

describe("migrateItemArt", () => {
    it("rewrites the image and the images of its effects", () => {
        const item = {
            _id: "item1",
            img: OLD_ICON,
            effects: [effect("e1", OLD_PNG), effect("e2", FOREIGN)],
        };
        expect(migrateItemArt(item)).toEqual({
            img: NEW_ICON,
            effects: [{ _id: "e1", img: NEW_PNG }],
        });
    });

    it("is empty for an item with nothing to rewrite, and on a second run", () => {
        expect(migrateItemArt({ _id: "i", img: FOREIGN, effects: [] })).toEqual({});
        expect(migrateItemArt({ _id: "i", img: NEW_ICON })).toEqual({});
    });
});

describe("migrateActorArt", () => {
    const actor = () => ({
        _id: "actor1",
        img: OLD_KNIGHT,
        prototypeToken: { texture: { src: OLD_KNIGHT }, ring: { subject: { texture: OLD_PNG } } },
        system: { bioImage: OLD_KNIGHT, description: "<p>unchanged</p>" },
        items: [
            { _id: "i1", img: OLD_ICON, effects: [effect("ie1", OLD_PNG)] },
            { _id: "i2", img: FOREIGN, effects: [effect("ie2", FOREIGN)] },
            { _id: "i3", img: FOREIGN, effects: [effect("ie3", OLD_ICON)] },
        ],
        effects: [effect("e1", OLD_ICON), effect("e2", FOREIGN)],
    });

    it("rewrites the image, token, façade, embedded items and their effects, and effects", () => {
        expect(migrateActorArt(actor())).toEqual({
            img: NEW_KNIGHT,
            prototypeToken: {
                texture: { src: NEW_KNIGHT },
                ring: { subject: { texture: NEW_PNG } },
            },
            system: { bioImage: NEW_KNIGHT },
            items: [
                { _id: "i1", img: NEW_ICON, effects: [{ _id: "ie1", img: NEW_PNG }] },
                { _id: "i3", effects: [{ _id: "ie3", img: NEW_ICON }] },
            ],
            effects: [{ _id: "e1", img: NEW_ICON }],
        });
    });

    it("is empty once applied", () => {
        const a = actor();
        a.img = NEW_KNIGHT;
        a.prototypeToken = { texture: { src: NEW_KNIGHT }, ring: { subject: { texture: null } } };
        a.system.bioImage = NEW_KNIGHT;
        a.items = [{ _id: "i1", img: NEW_ICON, effects: [effect("ie1", NEW_PNG)] }];
        a.effects = [effect("e1", NEW_ICON)];
        expect(migrateActorArt(a)).toEqual({});
    });

    it("tolerates an actor with no prototype token, system, items or effects", () => {
        expect(migrateActorArt({ _id: "a", img: OLD_ICON })).toEqual({ img: NEW_ICON });
    });
});

describe("migrateSceneArt", () => {
    const scene = () => ({
        _id: "scene1",
        tokens: [
            {
                _id: "t1",
                actorLink: true,
                texture: { src: OLD_KNIGHT },
                ring: { subject: { texture: null } },
                delta: null,
            },
            {
                _id: "t2",
                actorLink: false,
                texture: { src: FOREIGN },
                delta: {
                    img: OLD_ICON,
                    system: { bioImage: OLD_KNIGHT },
                    items: [{ _id: "di1", img: OLD_PNG, effects: [] }],
                    effects: [effect("de1", OLD_ICON)],
                },
            },
            { _id: "t3", texture: { src: FOREIGN }, delta: { img: null, system: null } },
        ],
        tiles: [
            { _id: "tile1", texture: { src: OLD_HELP } },
            { _id: "tile2", texture: { src: FOREIGN } },
        ],
        notes: [{ _id: "n1", texture: { src: OLD_ICON } }],
        levels: [
            {
                _id: "l1",
                background: { src: OLD_HELP },
                foreground: { src: null },
                fog: { src: OLD_PNG },
            },
            { _id: "l2", background: { src: FOREIGN }, foreground: { src: null } },
        ],
    });

    it("rewrites tokens, unlinked token deltas, tiles, notes and level backgrounds", () => {
        expect(migrateSceneArt(scene())).toEqual({
            tokens: [
                { _id: "t1", texture: { src: NEW_KNIGHT } },
                {
                    _id: "t2",
                    delta: {
                        img: NEW_ICON,
                        system: { bioImage: NEW_KNIGHT },
                        items: [{ _id: "di1", img: NEW_PNG }],
                        effects: [{ _id: "de1", img: NEW_ICON }],
                    },
                },
            ],
            tiles: [{ _id: "tile1", texture: { src: NEW_HELP } }],
            notes: [{ _id: "n1", texture: { src: NEW_ICON } }],
            levels: [{ _id: "l1", background: { src: NEW_HELP }, fog: { src: NEW_PNG } }],
        });
    });

    it("rewrites the delta of a token that carries actorData instead", () => {
        const s = {
            _id: "s",
            tokens: [{ _id: "t", texture: { src: FOREIGN }, actorData: { img: OLD_ICON } }],
        };
        expect(migrateSceneArt(s)).toEqual({
            tokens: [{ _id: "t", actorData: { img: NEW_ICON } }],
        });
    });

    it("is empty for a scene with nothing to rewrite", () => {
        expect(migrateSceneArt({ _id: "s", tokens: [], tiles: [], notes: [], levels: [] })).toEqual(
            {},
        );
        expect(migrateSceneArt({ _id: "s" })).toEqual({});
    });
});

describe("migrateJournalArt", () => {
    it("rewrites page sources and the images in page text", () => {
        const entry = {
            _id: "j1",
            pages: [
                { _id: "p1", type: "image", src: OLD_HELP, text: { content: null } },
                {
                    _id: "p2",
                    type: "text",
                    src: null,
                    text: {
                        content: `<p><img src="${OLD_HELP}"></p>`,
                        markdown: `![x](${OLD_ICON})`,
                    },
                },
                { _id: "p3", type: "text", src: null, text: { content: "<p>plain</p>" } },
            ],
        };
        expect(migrateJournalArt(entry)).toEqual({
            pages: [
                { _id: "p1", src: NEW_HELP },
                {
                    _id: "p2",
                    text: {
                        content: `<p><img src="${NEW_HELP}"></p>`,
                        markdown: `![x](${NEW_ICON})`,
                    },
                },
            ],
        });
    });

    it("is empty for an entry with nothing to rewrite", () => {
        expect(migrateJournalArt({ _id: "j", pages: [] })).toEqual({});
        expect(migrateJournalArt({ _id: "j" })).toEqual({});
    });
});

describe("migrateMacroArt", () => {
    it("rewrites the image", () => {
        expect(migrateMacroArt({ _id: "m", img: OLD_ICON })).toEqual({ img: NEW_ICON });
    });

    it("is empty for a foreign image", () => {
        expect(migrateMacroArt({ _id: "m", img: FOREIGN })).toEqual({});
    });
});

describe("migrateRollTableArt", () => {
    it("rewrites the image and each result's image", () => {
        const table = {
            _id: "rt",
            img: OLD_ICON,
            results: [
                { _id: "r1", img: OLD_PNG },
                { _id: "r2", img: FOREIGN },
            ],
        };
        expect(migrateRollTableArt(table)).toEqual({
            img: NEW_ICON,
            results: [{ _id: "r1", img: NEW_PNG }],
        });
    });

    it("is empty for a table with nothing to rewrite", () => {
        expect(migrateRollTableArt({ _id: "rt", img: FOREIGN, results: [] })).toEqual({});
    });
});

describe("artMigrationFor", () => {
    it("names the rewrite for each document class the migration visits", () => {
        expect(artMigrationFor("Actor")).toBe(migrateActorArt);
        expect(artMigrationFor("Item")).toBe(migrateItemArt);
        expect(artMigrationFor("Scene")).toBe(migrateSceneArt);
        expect(artMigrationFor("JournalEntry")).toBe(migrateJournalArt);
        expect(artMigrationFor("Macro")).toBe(migrateMacroArt);
        expect(artMigrationFor("RollTable")).toBe(migrateRollTableArt);
        expect(artMigrationFor("Playlist")).toBeUndefined();
    });
});
