/*
 * Copyright (c) 2024-2026 Tom Rodriguez ("Toasty") — <toasty@heroiclands.org>
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { attribution } from "./attribution.mjs";

const file = process.argv[2];
const lines = readFileSync(file, "utf8").split(/\r?\n/);
let rejected = false;
for (const [index, line] of lines.entries()) {
    // Git's verbose diff starts at the scissors comment; other comments are inert.
    if (/^#.*>8/.test(line)) break;
    if (line.startsWith("#")) continue;
    const finding = attribution(line);
    if (!finding) continue;
    console.error(
        `${relative(process.cwd(), file)}:${index + 1}:${finding.column}: error: ${finding.kind}; attribution is not allowed in commit messages.`,
    );
    rejected = true;
}
if (rejected) {
    console.error("Remove the assistant credit and commit again.");
    process.exitCode = 1;
}
