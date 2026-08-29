---
"hm3": patch
---

Publish the package homepage at `https://www.heroiclands.org/hm3/`.

`package-build` 5.0.0 gave this repository an authored homepage note and a
`build:site` that compiled it to Markdown. Nothing rendered that Markdown and
nothing published it, so the page existed and had no address. Four things close
the gap, and three of them are one file each.

**`@heroiclands/hugo-theme` 0.2.0** carries the landing layout every package
homepage renders through — hero band, lead, install block, notices — so six
package landings look like siblings instead of six hand-built pages. It also
carries the "page not found" template. It arrives through `npm ci`, not a
submodule.

**`site/hugo.toml`** roots the site at `site/` and publishes into
`build/site/hm3/`. The deployed tree therefore carries its own path prefix
physically, which is what lets the router proxy `/hm3/…` straight through
without rewriting it, and lets the same deployment behave identically at the
hosting project's own address. `disableKinds` turns off the section, taxonomy,
term, RSS and sitemap kinds: this package publishes one page, and Hugo would
otherwise add a taxonomy root and a feed to a site with no terms and nothing to
syndicate.

**`build:site` renders as well as compiles** — `build:site-content`
(`content-build site`) then `build:site-html` (Hugo). It stays out of
`build:noci`, deliberately: the homepage is not part of what Foundry loads, and
the packaging build must keep producing exactly what it produced before. It
does — `build/stage` still holds 540 files, 538 of them byte-identical to the
previous build, the two that differ being the LevelDB `LOG` files, which carry
wall-clock timestamps and differ between two runs of the _same_ tree.
`system.json` is byte-identical and the packs compile the same 1,577 items and
20 system-help journals.

**`.github/workflows/deploy-site.yml` calls the shared workflow** rather than
carrying a copy of it. `HeroicLands/.github` owns the runner, the completeness
guard, the hosting project, the custom domain and the upload — identical for
every package that publishes a subtree of one site, and exactly the parts that
must not drift. This repository states its hosting project and passes its two
secrets by name. It passes no page bounds: `publish.site: homepage` fixes the
count at exactly one, and the shared guard refuses a caller that tries to move
it.
