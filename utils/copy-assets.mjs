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

import { copyFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";

function copyFolder(src, dest) {
    mkdirSync(dest, { recursive: true });
    for (const file of readdirSync(src)) {
        const srcPath = join(src, file);
        const destPath = join(dest, file);
        if (statSync(srcPath).isDirectory()) copyFolder(srcPath, destPath);
        else {
            mkdirSync(dirname(destPath), { recursive: true });
            copyFileSync(srcPath, destPath);
        }
    }
}

function copyFile(src, dest) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
}

copyFolder("templates", "build/stage/templates");
copyFolder("images", "build/stage/images");
copyFolder("fonts", "build/stage/fonts");
copyFolder("audio", "build/stage/audio");
copyFolder("lang", "build/stage/lang");
copyFolder("ui", "build/stage/ui");
copyFile("template.json", "build/stage/template.json");
copyFile("LICENSE", "build/stage/LICENSE");
copyFile("README.md", "build/stage/README.md");

console.log("✅ Static assets copied.");
