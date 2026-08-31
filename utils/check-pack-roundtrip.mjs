/**
 * Fail if extracting the built packs would not reproduce the committed source.
 *
 * CONTRIBUTING.md tells a contributor that "round-tripping without editing
 * produces no diff, so anything `git diff` shows is a change you made". That is
 * the whole basis of the edit-in-Foundry loop: it is what lets someone trust a
 * diff instead of reading 1,597 JSON files. Nothing checked that it was true,
 * and it silently stopped being true — 56 of those files were committed under
 * names `extractPack` does not emit, so a round trip with no edit at all showed
 * 112 changed paths and buried the signal the workflow depends on (#419).
 *
 * The check is the property itself rather than a restatement of it. It compiles
 * nothing and reimplements no naming rule: it extracts the packs
 * `build:compiledb` has just written into a scratch directory and compares that
 * tree, byte for byte, with `assets/packs/`. Reimplementing `extractPack`'s
 * filename convention here would only move the disagreement — the convention is
 * the CLI's, it is not exported, and a copy of it would drift the first time the
 * CLI changed. Asking the real tool cannot drift.
 *
 * Three kinds of drift are therefore all one failure: a file under a name the
 * extractor would not choose, a file whose bytes differ (formatting, key order,
 * a missing trailing newline), and a document present on one side only.
 *
 * Runs inside `build:noci`, immediately after `build:compiledb`, because that is
 * where the input exists. The fix for a failure is almost always to run
 * `npm run build:unpackdb` and commit the result.
 */
import fs from "node:fs";
import path from "node:path";

import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { loadPackConfig } from "@heroiclands/package-build/engine/pack-config";

const SOURCE_ROOT = "assets/packs";

/** Every file under `dir`, as paths relative to it, sorted. */
function fileList(dir) {
    const out = [];
    const walk = (sub) => {
        for (const entry of fs.readdirSync(path.join(dir, sub), {
            withFileTypes: true,
        })) {
            const rel = path.join(sub, entry.name);
            if (entry.isDirectory()) walk(rel);
            else out.push(rel);
        }
    };
    walk("");
    return out.sort();
}

const config = loadPackConfig();
const problems = [];

for (const pack of config.packs) {
    const built = path.join(config.paths.stage, pack.name);
    if (!fs.existsSync(built)) {
        throw new Error(
            `Pack ${pack.name}: nothing built at ${built}. This check reads ` +
                `what \`npm run build:compiledb\` produces, so it must run ` +
                `after it.`,
        );
    }

    // Scratch, under build/ — never the source tree. An extraction that wrote
    // into assets/packs/ would "fix" the drift by overwriting the very thing it
    // is meant to be comparing against.
    const scratch = path.join(config.paths.unpack, pack.name);
    fs.rmSync(scratch, { recursive: true, force: true });
    fs.mkdirSync(scratch, { recursive: true });
    await extractPack(built, scratch, { log: false });

    const source = path.join(SOURCE_ROOT, pack.name);
    const committed = new Set(fileList(source));
    const extracted = new Set(fileList(scratch));

    for (const rel of extracted) {
        if (!committed.has(rel)) {
            problems.push(
                `${path.join(source, rel)}: extracting writes this file, but ` +
                    `no such file is committed`,
            );
            continue;
        }
        const a = fs.readFileSync(path.join(source, rel));
        const b = fs.readFileSync(path.join(scratch, rel));
        if (!a.equals(b)) {
            problems.push(
                `${path.join(source, rel)}: committed bytes differ from what ` +
                    `extracting writes`,
            );
        }
    }

    for (const rel of committed) {
        if (!extracted.has(rel)) {
            problems.push(
                `${path.join(source, rel)}: committed, but extracting writes ` + `no such file`,
            );
        }
    }
}

if (problems.length) {
    console.error(
        `The compendium source does not round trip (${problems.length} ` +
            `problems):\n` +
            problems.map((p) => `    ${p}`).join("\n") +
            `\n\nCONTRIBUTING.md promises that extracting the built packs ` +
            `reproduces\nassets/packs/ exactly, so that a git diff shows only ` +
            `your own edits. Run\n\`npm run build:unpackdb\` and commit the ` +
            `result to restore that.\n`,
    );
    process.exit(1);
}

console.log(`Compendium source round trips (${config.packs.length} packs checked).`);
