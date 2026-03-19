/*
 * This file is part of the Song of Heroic Lands (SoHL) system for Foundry VTT.
 * Copyright (c) 2024-2026 Tom Rodriguez ("Toasty") — <toasty@heroiclands.com>
 *
 * This work is licensed under the GNU General Public License v3.0 (GPLv3).
 * You may copy, modify, and distribute it under the terms of that license.
 *
 * For full terms, see the LICENSE.md file in the project root or visit:
 * https://www.gnu.org/licenses/gpl-3.0.html
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from "fs";
import fsp from "fs/promises";
import archiver from "archiver";
import { mkdirSync } from "fs";
import { join, relative, resolve } from "path";

export async function packStage() {
    const STAGE_DIR = resolve("./build/stage");
    const RELEASE_DIR = resolve("./build/dist");
    mkdirSync(RELEASE_DIR, { recursive: true });

    const system = JSON.parse(
        await fsp.readFile(join(STAGE_DIR, "system.json"), "utf8"),
    );
    const version = system.version;
    const zipPath = join(RELEASE_DIR, "system.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(STAGE_DIR, false);
    await archive.finalize();

    await fsp.copyFile(
        join(STAGE_DIR, "system.json"),
        join(RELEASE_DIR, "system.json"),
    );

    console.log("✅ Packaging for release complete:", relative(".", zipPath));
}

// CLI support
if (process.argv[1] === resolve("./utils/pack-release.mjs")) {
    packStage().catch((err) => {
        console.error("❌ Packaging for release failed:", err);
        process.exit(1);
    });
}
