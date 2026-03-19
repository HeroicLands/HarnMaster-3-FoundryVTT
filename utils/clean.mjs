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
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);

const dirs = ["build", ".vite", ".vitepress", ".rollup.cache"];

// If "distclean" is passed as an argument, also remove node_modules
if (process.argv.includes("--distclean")) {
    dirs.push("node_modules");
}

for (const dir of dirs) {
    const target = path.join(repoRoot, dir);
    try {
        fs.rmSync(target, { recursive: true, force: true });
        console.log(`Removed ${dir}`);
    } catch {
        // Already gone — nothing to do
    }
}
