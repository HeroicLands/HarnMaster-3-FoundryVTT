/**
 * Extract the built LevelDB packs back into `packs/<name>/_source/`.
 *
 * The inverse of `compile-packs.mjs`, and what makes the committed JSON
 * maintainable: edit a compendium inside Foundry, unpack, and commit the diff.
 * Round-tripping without editing must produce no diff at all — that property is
 * what the build verifies.
 */
import fs from "node:fs";
import path from "node:path";

import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { loadPackConfig } from "@heroiclands/package-build/engine/pack-config";

const SOURCE_ROOT = "packs";

const config = loadPackConfig();

for (const pack of config.packs) {
    const source = path.join(config.paths.stage, pack.name);
    if (!fs.existsSync(source)) {
        throw new Error(
            `Pack ${pack.name}: nothing built at ${source}. Run ` +
                `\`npm run build:compiledb\` first.`,
        );
    }

    const dest = path.join(SOURCE_ROOT, pack.name, "_source");
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });

    await extractPack(source, dest, { log: false });
    console.log(`Pack ${pack.name}: ${source} -> ${dest}`);
}
