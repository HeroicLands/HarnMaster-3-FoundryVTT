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
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);

dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "HeroicLands";
const REPO_NAME = "Song-of-Heroic-Lands-FoundryVTT";

if (!GITHUB_TOKEN) {
    console.error(
        "GITHUB_TOKEN is not set. Add it to .env.local or set it in your environment.",
    );
    process.exit(1);
}

const systemJsonPath = path.join(repoRoot, "build", "stage", "system.json");
if (!fs.existsSync(systemJsonPath)) {
    console.error(
        "Missing build/stage/system.json. Run 'npm run build' first.",
    );
    process.exit(1);
}

const system = JSON.parse(fs.readFileSync(systemJsonPath, "utf8"));
const version = system.version;
const tag = `v${version}`;

const zipPath = path.join(repoRoot, "build", `system-${version}.zip`);
const jsonPath = systemJsonPath;

if (!fs.existsSync(zipPath)) {
    console.error(
        `Missing build/system-${version}.zip. Run 'npm run build:pack-release' first.`,
    );
    process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function createRelease() {
    console.log(`Creating GitHub release ${tag}...`);

    // createRelease automatically creates the tag on the target commit
    // if it doesn't already exist — no local git needed.
    const release = await octokit.repos.createRelease({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        tag_name: tag,
        name: `Song of Heroic Lands v${version}`,
        target_commitish: "main",
        body: `Release v${version}`,
        draft: false,
        prerelease: false,
    });

    const releaseId = release.data.id;
    console.log(`Created release: ${release.data.html_url}`);

    // Upload release assets
    async function uploadAsset(filePath, name, contentType) {
        const content = fs.readFileSync(filePath);
        await octokit.repos.uploadReleaseAsset({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            release_id: releaseId,
            name,
            data: content,
            headers: {
                "content-type": contentType,
                "content-length": content.length,
            },
        });
        console.log(`Uploaded ${name}`);
    }

    await uploadAsset(zipPath, `sohl-${version}.zip`, "application/zip");
    await uploadAsset(jsonPath, "system.json", "application/json");

    console.log("Release complete!");
}

createRelease().catch((err) => {
    console.error("Release failed:", err.message ?? err);
    process.exit(1);
});
