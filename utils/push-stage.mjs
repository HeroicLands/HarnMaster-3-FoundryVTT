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

import path from "path";
import process from "process";
import { spawnSync } from "child_process";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);

dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const SOURCE = "build/stage/";

const STAGE_ENV_MAP = {
    dev: "FOUNDRYVTT_DEV_DATA",
    qa: "FOUNDRYVTT_QA_DATA",
    prod: "FOUNDRYVTT_PROD_DATA",
};

function resolveStage(stageArg) {
    const stage = String(stageArg || "")
        .trim()
        .toLowerCase();
    return stage;
}

function main() {
    const stage = resolveStage(process.argv[2]);
    if (!stage) {
        console.error("Usage: node utils/push-stage.mjs <dev|qa|prod>");
        process.exit(1);
    }

    const envVarName = STAGE_ENV_MAP[stage];
    if (!envVarName) {
        console.error(
            `Invalid stage '${stage}'. Valid stages are: ${Object.keys(STAGE_ENV_MAP).join(", ")}.`,
        );
        process.exit(1);
    }

    const dataRoot = process.env[envVarName]?.trim() ?? "";

    if (!dataRoot) {
        console.error(
            `No destination configured for stage '${stage}'. Set environment variable ${envVarName}.`,
        );
        console.error(
            `Example: ${envVarName}="/path/to/foundryvtt/data"`,
        );
        process.exit(1);
    }

    // Append the system path within the Foundry data directory.
    // For remote rsync targets (host:path), insert after the colon.
    const colonIdx = dataRoot.indexOf(":");
    const isRemote = colonIdx > 0 && !dataRoot.startsWith("/");
    const destination = isRemote
        ? `${dataRoot.slice(0, colonIdx + 1)}${path.posix.join(dataRoot.slice(colonIdx + 1), "Data/systems/hm3/")}`
        : path.join(dataRoot, "Data", "systems", "hm3") + "/";

    // Verify rsync is available for remote targets
    if (isRemote) {
        const check = spawnSync("rsync", ["--version"], { stdio: "ignore" });
        if (check.error) {
            console.error(
                `Remote destination requires rsync, but it is not installed or not in PATH.`,
            );
            process.exit(1);
        }
    }

    const args = ["-avh", "--delete", SOURCE, destination];
    const result = spawnSync("rsync", args, { stdio: "inherit" });

    if (result.error) {
        console.error(`Failed to run rsync: ${result.error.message}`);
        process.exit(1);
    }

    process.exit(result.status ?? 0);
}

main();
