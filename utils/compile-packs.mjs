/**
 * Compile this system's committed compendium JSON into the LevelDB packs
 * Foundry loads.
 *
 * HM3 keeps its compendium content as per-document JSON under
 * `assets/packs/<name>/`, hand-edited or round-tripped out of Foundry. It is
 * deliberately not `packs/`: that is where Foundry itself writes the LevelDB it
 * reads, so source and build output sharing one directory is what led a
 * contributor to commit four `.ldb` files (#398). Nothing writes into the
 * source tree now, and `packs/` does not exist in the repository at all. The
 * shared toolchain's `compilePacks()` cannot be reused for that: it always
 * regenerates its JSON from a Markdown content tree first, and this system has
 * no such tree. So this calls the same Foundry CLI primitive that function
 * calls, and nothing else.
 *
 * The pack list comes from `package-build.config.yaml`, so a pack is declared
 * in exactly one place — the same list the generated `system.json` derives its
 * `packs[]` block from.
 */
import fs from "node:fs";
import path from "node:path";

import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { loadPackConfig } from "@heroiclands/package-build/engine/pack-config";

const SOURCE_ROOT = "assets/packs";

const config = loadPackConfig();
let total = 0;

for (const pack of config.packs) {
    const source = path.join(SOURCE_ROOT, pack.name);
    if (!fs.existsSync(source)) {
        throw new Error(
            `Pack ${pack.name}: no committed JSON at ${source}. Every pack ` +
                `declared in package-build.config.yaml must have a source ` +
                `directory under assets/packs/.`,
        );
    }

    const dest = path.join(config.paths.stage, pack.name);

    // Removed rather than written over. LevelDB is a key-value store, not a
    // directory of files: recompiling into an existing pack leaves the keys of
    // documents that have since been deleted, which then ship as content
    // nobody authored and nobody can find in the source tree.
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });

    const count = fs
        .readdirSync(source)
        .filter((entry) => entry.endsWith(".json")).length;

    await compilePack(source, dest, { recursive: true, log: false });

    console.log(`Pack ${pack.name}: ${count} documents -> ${dest}`);
    total += count;
}

console.log(`Compiled ${config.packs.length} packs, ${total} documents.`);
