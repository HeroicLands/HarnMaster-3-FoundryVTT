---
"hm3": patch
---

Lint this repository's content frontmatter, and gate pull requests on it.

**What was missing**

There was no `lint` and no `format` script, and no `content-build lint`
anywhere. The lint-shaped scripts were `lint:lang`, `lint:packs` and
`lint:roundtrip`, none of which reads `assets/content/`, so no frontmatter
finding of any kind reached this repository — not the schema check, not the
retired `package:` / `draft:` fields, not a duplicate address, not the
address-bearing fields a `type: homepage` note refuses.

Six scripts now call the installed toolchain under the names the sibling
repositories already use: `lint:format`, `lint:markdown`, `lint:markdown:fix`,
`lint:addresses`, `lint:content-links`, and `format` for the write half of
`lint:format`. `lint` chains every check that needs no build output —
those four plus the existing `lint:lang` and `lint:packs`. `lint:roundtrip`
stays out of the chain and stays in `build:noci`, because it reads what
`build:compiledb` has just written.

**The toolchain bump is what makes the linter usable here**

`@heroiclands/package-build` moves from `^5.0.0` to `^6.0.0`. On 5.0.0
`content-build lint` fails this tree outright — _"assets/content: holds no
keyed content, so every rule here is vacuous"_ — because its guard tested
`byKey.size === 0`, and a tree carrying notes but no _keyed_ content read as an
absent tree. This repository compiles its compendium from committed JSON rather
than from Markdown, so `assets/content/` holds exactly one note, the package
homepage, and it tripped every time. That was a fact about the guard rather
than about this tree (HeroicLands/package-build#77); #80 changed it to
`notes.length === 0`, and 6.0.0 ships it. A caret does not cross a major, so
Dependabot would never have offered it.

The compiled output is unchanged, and that was measured rather than assumed: a
full `build:noci` on each version emits 528 identical staged non-pack files, an
identical `system.json`, and 1,597 compiled compendium documents with identical
content when extracted.

**`assets/packs/` is excluded from Prettier, and that is not a style call**

`extractPack` writes the committed compendium source as 2-space JSON; the
shared configuration is 4-space. Formatting it rewrites all 1,597 documents
(+70,110 / −70,589 lines, every line an indent), and `lint:roundtrip` — which
compares those bytes against what extracting the built packs produces, inside
`build:noci`, which is what a release is built from — then fails on all 1,597.
Prettier and the round-trip property cannot both own those files, so a
`.prettierignore` gives them to the round trip.

**What is gated, and what is not**

The pull-request gate runs `lint:addresses` and `lint:content-links`, both
clean. `lint:format` and `lint:markdown` are not gated: they arrive with a
backlog nobody in the pull request being blocked put there — 110 unformatted
files of 145 once the compendium source is excluded, 12 of which are HTML
templates Prettier cannot parse, and 26 markdownlint findings. Those are
recorded as #434 and #435 rather than repaired here, and the reason is written
into the workflow so it travels with the file.

Closes #432
