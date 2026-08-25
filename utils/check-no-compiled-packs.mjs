/**
 * Fail if any compiled compendium artifact is tracked in git.
 *
 * The compendium source of truth is per-document JSON under
 * `assets/packs/<name>/`. The LevelDB a Foundry world actually loads is a
 * build output: `npm run build:compiledb` writes it into `build/stage/packs/`,
 * which is not tracked. None of it belongs in the repository.
 *
 * `packs/.gitignore` has listed these patterns since long before this check
 * existed, and it was not enough — .gitignore is advice to `git add`, and a
 * contributor who needs loadable packs and cannot see how to build them will
 * reasonably comment the rule out and commit the binaries (#398 did exactly
 * that, with a note explaining why). The honest fix is the build step, which
 * now exists; this is the guard that makes the rule enforceable rather than
 * advisory, because it reads what is *tracked* and ignores .gitignore entirely.
 */
import { execFileSync } from "node:child_process";

// LevelDB's own file inventory. `*.log` is included because LevelDB writes its
// write-ahead log beside the tables; nothing else in this repository is a .log.
const FORBIDDEN = [
    /(^|\/)[^/]+\.ldb$/,
    /(^|\/)[^/]+\.sst$/,
    /(^|\/)[^/]+\.log$/,
    /(^|\/)CURRENT$/,
    /(^|\/)LOCK$/,
    /(^|\/)LOG(\.old)?$/,
    /(^|\/)MANIFEST-\d+$/,
];

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);

const offenders = tracked.filter((f) => FORBIDDEN.some((re) => re.test(f)));

if (offenders.length) {
    console.error(
        `Compiled compendium artifacts are tracked in git (${offenders.length}):\n` +
            offenders.map((f) => `    ${f}`).join("\n") +
            `\n\nThese are build output. The compendium source is the JSON under\n` +
            `assets/packs/<name>/; run \`npm run build:compiledb\` to produce the\n` +
            `LevelDB into build/stage/packs/, which is not tracked. To take changes\n` +
            `you made inside Foundry back into the source, run\n` +
            `\`npm run build:unpackdb\` and commit the JSON diff.\n`,
    );
    process.exit(1);
}

console.log(`No compiled compendium artifacts tracked (${tracked.length} files checked).`);
