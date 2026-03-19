/*
 * HarnMaster 3 (HM3) compendium build script for Foundry VTT.
 * Copyright (c) 2020-2026 Tom Rodriguez ("Toasty")
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from "fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import log from "loglevel";
import prefix from "loglevel-plugin-prefix";
import path from "path";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";

/**
 * Base folder for the source data files.
 * @type {string}
 */
const DATA_BASE = path.resolve("./assets/packs");
const PACK_DEST = path.resolve("./build/tmp/packs");
const STAGE_DEST = path.resolve("./build/stage/packs");

fs.mkdirSync(PACK_DEST, { recursive: true });

// Load system template to get pack definitions.
const system = JSON.parse(
    fs.readFileSync("./assets/templates/system.template.json", {
        encoding: "utf8",
    }),
);

// Configure loglevel
log.setLevel("info");

prefix.reg(log);
prefix.apply(log, {
    format(level, _name, timestamp) {
        return `[${timestamp}] [${level.toUpperCase()}]:`;
    },
    timestampFormatter(date) {
        return date.toISOString();
    },
});

// --- Parse CLI arguments ---
const args = process.argv.slice(2);
const command = args[0]; // "package"
const action = args[1]; // "compile" | "pack" | "unpack" | "clean"
const packName = args[2]; // optional pack name filter
const entryName = args[3]; // optional entry name filter

switch (action) {
    case "compile":
        await compilePackSources(packName);
        break;
    case "clean":
        await cleanPacks(packName, entryName);
        break;
    case "pack":
        await packPacks(packName);
        break;
    case "unpack":
        await extractPacks(packName, entryName);
        break;
    default:
        console.error(
            `Usage: node build-compendiums.mjs package <compile|pack|unpack|clean> [pack] [entry]`,
        );
        process.exit(1);
}

/* ----------------------------------------- */
/*  Compile (copy source JSON to tmp)        */
/* ----------------------------------------- */

/**
 * Copies pack source JSON files from assets/packs/<name>/unique/
 * to build/tmp/packs/<name>/ for subsequent packing.
 * @param {string} [filterPack]  Optional pack name to filter.
 */
async function compilePackSources(filterPack) {
    const packs = system.packs.filter(
        (p) => !filterPack || p.name === filterPack,
    );

    for (const packInfo of packs) {
        const srcDir = path.join(DATA_BASE, packInfo.name, "unique");
        const destDir = path.join(PACK_DEST, packInfo.name);

        if (!fs.existsSync(srcDir)) {
            log.warn(
                `No source directory for pack ${packInfo.name} at ${srcDir}, skipping...`,
            );
            continue;
        }

        fs.mkdirSync(destDir, { recursive: true });
        log.info(`Compiling pack ${packInfo.name}`);

        const files = fs
            .readdirSync(srcDir)
            .filter((f) => f.endsWith(".json"));
        for (const file of files) {
            fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
    }
    log.info("Pack compilation complete.");
}

/* ----------------------------------------- */
/*  Clean Packs                              */
/* ----------------------------------------- */

/**
 * Removes unwanted flags, permissions, and other data from entries.
 * @param {object} data                           Data for a single entry to clean.
 * @param {object} [options={}]
 * @param {boolean} [options.clearSourceId=true]  Should the core sourceId flag be deleted.
 * @param {number} [options.ownership=0]          Value to reset default ownership to.
 */
function cleanPackEntry(data, { clearSourceId = true, ownership = 0 } = {}) {
    if (data.ownership) data.ownership = { default: ownership };
    if (clearSourceId) {
        delete data._stats?.compendiumSource;
        delete data.flags?.core?.sourceId;
    }
    delete data.flags?.importSource;
    delete data.flags?.exportSource;
    if (data._stats?.lastModifiedBy)
        data._stats.lastModifiedBy = "hm3builder000000";

    // Remove empty entries in flags
    if (!data.flags) data.flags = {};
    Object.entries(data.flags).forEach(([key, contents]) => {
        if (Object.keys(contents).length === 0) delete data.flags[key];
    });

    if (data.effects)
        data.effects.forEach((i) =>
            cleanPackEntry(i, { clearSourceId: false }),
        );
    if (data.items)
        data.items.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
    if (data.pages)
        data.pages.forEach((i) => cleanPackEntry(i, { ownership: -1 }));
    if (data.system?.description)
        data.system.description = cleanString(data.system.description);
    if (data.system?.biography)
        data.system.biography = cleanString(data.system.biography);
    if (data.system?.textReference)
        data.system.textReference = cleanString(data.system.textReference);
    if (data.system?.notes) data.system.notes = cleanString(data.system.notes);
    if (data.label) data.label = cleanString(data.label);
    if (data.name) data.name = cleanString(data.name);
}

/**
 * Removes invisible whitespace characters and normalizes quotes.
 * @param {string} str  The string to be cleaned.
 * @returns {string}    The cleaned string.
 */
function cleanString(str) {
    return str
        .replace(/\u2060/gu, "")
        .replace(/[\u2018\u2019]/gu, "'")
        .replace(/[\u201C\u201D]/gu, '"');
}

/**
 * Cleans and formats source JSON files.
 * @param {string} [packName]   Name of pack to clean.
 * @param {string} [entryName]  Name of a specific entry to clean.
 */
async function cleanPacks(packName, entryName) {
    entryName = entryName?.toLowerCase();

    const folders = fs
        .readdirSync(PACK_DEST, { withFileTypes: true })
        .filter(
            (file) =>
                file.isDirectory() && (!packName || packName === file.name),
        );

    async function* _walkDir(directoryPath) {
        const directory = await readdir(directoryPath, { withFileTypes: true });
        for (const entry of directory) {
            const entryPath = path.join(directoryPath, entry.name);
            if (path.extname(entry.name) === ".json") yield entryPath;
        }
    }

    for (const folder of folders) {
        log.info(`Cleaning pack ${folder.name}`);
        for await (const src of _walkDir(path.join(PACK_DEST, folder.name))) {
            const json = JSON.parse(await readFile(src, { encoding: "utf8" }));
            if (entryName && entryName !== json.name.toLowerCase()) continue;
            if (!json._id || !json._key) {
                log.info(
                    `Failed to clean \x1b[31m${src}\x1b[0m, must have _id and _key.`,
                );
                continue;
            }
            cleanPackEntry(json);
            fs.rmSync(src, { force: true });
            writeFile(src, `${JSON.stringify(json, null, 2)}\n`, {
                mode: 0o664,
            });
        }
    }
}

/* ----------------------------------------- */
/*  Pack (compile JSON to LevelDB)           */
/* ----------------------------------------- */

async function packPacks(packName) {
    const packs = system.packs.filter((p) => !packName || p.name === packName);

    for (const packInfo of packs) {
        const src = path.join(PACK_DEST, packInfo.name);
        const dest = path.join(STAGE_DEST, packInfo.name);
        if (!fs.existsSync(src)) {
            log.warn(
                `No source files exist for pack ${packInfo.name}, skipping...`,
            );
            continue;
        }
        log.info(`Packing pack ${packInfo.name}`);
        await compilePack(src, dest, {
            recursive: true,
            log: false,
            transformEntry: cleanPackEntry,
        });
    }
}

/* ----------------------------------------- */
/*  Unpack (extract LevelDB to JSON)         */
/* ----------------------------------------- */

async function extractPacks(packName, entryName) {
    entryName = entryName?.toLowerCase();

    const packs = system.packs.filter((p) => !packName || p.name === packName);

    for (const packInfo of packs) {
        const src = path.join(STAGE_DEST, packInfo.name);
        const dest = path.join(PACK_DEST, packInfo.name);
        log.info(`Extracting pack ${packInfo.name}`);

        const folders = {};
        await extractPack(src, dest, {
            log: false,
            transformEntry: (e) => {
                if (e._key.startsWith("!folders"))
                    folders[e._id] = {
                        name: slugify(e.name),
                        folder: e.folder,
                    };
                return false;
            },
        });
        const buildPath = (collection, entry, parentKey) => {
            let parent = collection[entry[parentKey]];
            entry.path = entry.name;
            while (parent) {
                entry.path = path.join(parent.name, entry.path);
                parent = collection[parent[parentKey]];
            }
        };
        Object.values(folders).forEach((f) => buildPath(folders, f, "folder"));

        await extractPack(src, dest, {
            log: true,
            transformEntry: (entry) => {
                if (entryName && entryName !== entry.name.toLowerCase())
                    return false;
                cleanPackEntry(entry);
            },
            transformName: (entry) => {
                if (entry._id in folders)
                    return path.join(
                        "folder_",
                        folders[entry._id].path,
                        ".json",
                    );
                const outputName = slugify(entry.name);
                const parent = folders[entry.folder];
                return path.join(parent?.path ?? "", `${outputName}.json`);
            },
        });
    }
}

/**
 * Standardize name format.
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
    return name
        .toLowerCase()
        .replace("'", "")
        .replace(/[^a-z0-9]+/gi, " ")
        .trim()
        .replace(/\s+|-{2,}/g, "-");
}
