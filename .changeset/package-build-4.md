---
"hm3": patch
---

Take `@heroiclands/package-build` 4.0.0, four releases on from the 3.0.1 this
repository was pinned to.

Nothing this system ships changes. The build stages the same 540 files, and 538
of them are byte-identical to what 3.0.1 produced — the two that differ are the
LevelDB `LOG` files, which carry wall-clock timestamps and differ between two
runs of the *same* version. `system.json` is byte-identical, packs and all, and
the compiled packs round-trip back to the committed JSON exactly as before.

That is the expected result rather than a lucky one. HM3 uses only the packaging
half of the toolchain, and every release in the range is a content-pass change:
4.0.0 retires the `package:` and `draft:` frontmatter fields, 3.4.0 and 3.3.0
change what the Markdown compilers emit. This repository has no `assets/content`
tree, declares no `itemBuilders`, and wires none of the `content-build` commands
into a script, so none of that code runs here. `manifest.mjs` and `stage.mjs`
import nothing from the content engine, and the modules behind `assets`,
`deploy` and the whole end-to-end harness are byte-identical between the two
versions.

The one packaging change that does reach us is 3.1.0's per-pack `system` key:
the manifest now omits it where nothing declares one, instead of always writing
the package-wide value. HM3 declares `stats.systemId: hm3`, so both packs are
still stamped `"system": "hm3"`.

3.1.0 also added two capabilities this repository is now able to consider and
does not yet use — `packageBuild.container.name`, which would let HM3 share one
Foundry container and so one signed licence with the other HeroicLands packages,
and `packs[].prebuilt`, a first-class route for a package whose pack JSON is
already built, which is exactly this repository's shape.
