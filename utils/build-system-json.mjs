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

import { mkdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";

const STAGE_DIR = resolve("build/stage");
const systemTemplatePath = resolve("assets/templates/system.template.json");
const systemJsonPath = resolve(STAGE_DIR, "system.json");
const packageJsonPath = resolve("package.json");

await mkdir(STAGE_DIR, { recursive: true });

// --- Load files ---
const [templateRaw, packageRaw] = await Promise.all([
    readFile(systemTemplatePath, "utf-8"),
    readFile(packageJsonPath, "utf-8"),
]);

const template = JSON.parse(templateRaw);
const pkg = JSON.parse(packageRaw);

// --- Modify fields ---
template.version = pkg.version;
template.url = "https://github.com/toastygm/HarnMaster-3-FoundryVTT";
template.bugs = "https://github.com/toastygm/HarnMaster-3-FoundryVTT/issues";
template.manifest =
    "https://github.com/toastygm/HarnMaster-3-FoundryVTT/releases/latest/download/system.json";
template.download = `https://github.com/toastygm/HarnMaster-3-FoundryVTT/releases/download/v${pkg.version}/system.zip`;

// --- Write final system.json ---
await writeFile(systemJsonPath, JSON.stringify(template, null, 2), "utf-8");

console.log(`✅ Wrote ${systemJsonPath}`);
