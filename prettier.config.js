/**
 * This repository's Prettier configuration — the shared one it already uses.
 *
 * `content-build format` applies the shared options directly, so the lint chain
 * was already correct without this file. Nothing else was. Prettier's editor
 * integrations, and a bare `npx prettier` run, resolve a *config file* and
 * silently fall back to Prettier's own defaults when they find none — which
 * here would mean `printWidth: 80` against a project that formats at 100.
 *
 * That gap is not theoretical: in a sibling content repository, running
 * `npx prettier --write .` with no config file present exploded 293 item
 * entries out of the one-line flow form they are authored in, because every
 * entry between 81 and 100 columns overflowed a width the project does not use.
 * The lint chain would then have put them back, and the two tools would have
 * taken turns rewriting the same lines forever.
 *
 * So this file exists to make every route to Prettier — the toolchain, the
 * editor, the command line — resolve the same options.
 *
 * @type {import("prettier").Config}
 */
export { default } from "@heroiclands/package-build/prettier";
