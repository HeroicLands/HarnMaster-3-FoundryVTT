# hm3

## 2.0.0

### Major Changes

- 475b4ce: Support Foundry VTT v14, and drop support for v12 and v13.

  The system did not load on v14 at all. Its `init` hook read `CONFIG.TinyMCE`,
  which v14 removed along with the editor itself, so the hook threw on that line
  and nothing after it ran — no document classes, no sheets, no settings.

  **You must be on Foundry v14 (verified against 14.367) to use this release.**
  The previous release did not work on v13 either, so nothing that was working is
  being dropped.

  What changed that you will notice:

  - **Rich text is ProseMirror.** The "Highlight" block is still there, now under
    the editor's Custom insert menu. The Hârnic fonts — Lakise, Runic and
    Lankorian Blackhand — are still in the editor's font list.
  - **Sheets are rebuilt on Foundry's current application framework.** They look
    and behave as before, but they now sit in v14's window chrome.
  - **Chat cards work again.** Their action buttons had lost their click handlers
    in v13, when the chat log stopped passing jQuery. Roll messages had also been
    posting with the roll detached: nothing to expand, and nothing for Dice So
    Nice to animate.
  - **Active effects can be created again.** The fields Foundry stores an effect's
    name and image in were renamed, and creating one with the old names failed
    validation outright.
  - **The active effect sheet offers HârnMaster's list of effect keys again.** It
    had quietly fallen back to Foundry's own sheet, leaving keys to be typed by
    hand.
  - **The Theatre of the Mind checkbox is back in scene configuration.** It
    anchored itself to a field that was renamed, so it had stopped appearing.
  - **Messages you post on someone else's behalf keep their attribution.** The
    field Foundry stores it in was renamed and the old one was being discarded
    silently.
  - **Moving a container between actors works**, as does deleting a container with
    its contents — the warning that its contents would go with it was not true.
  - **The missile damage dialog preselects the right range**, the armour sheet's
    Add Location button adds the location you actually picked rather than the one
    before it, and the missile macro dialog's Attack and Damage buttons no longer
    fail outright.
  - **Dropdowns across every sheet and dialog** were rebuilt on the helper that
    replaced the one v14 removed.

  Under the hood, `template.json` is replaced by data models. Foundry deprecates
  that file in v14 and removes it in v16. Actor and Item data is now validated
  against a schema, so fields outside it are dropped on load and values are
  coerced to their declared type. Every type was checked to produce defaults
  identical to the ones `template.json` declared, and the shipped compendium
  content was checked against the schemas: 27 documents carried leftover fields
  (deprecated missile range bands, a `ritual` block on psionics) that were all
  zero-valued and are now removed at source.

### Minor Changes

- 23d8888: Added: the 24 standard armor locations as compendium items.

  The `items` pack held every other kind of item a being needs — skills, armor,
  weapons, gear, invocations — but no `armorlocation` documents. They existed only
  as items already embedded on pre-built actors, so there was nothing to drag onto
  a new actor and no way to repair a being whose locations had been deleted short
  of copying them off another one.

  A new top-level `Armor Locations` folder now carries Skull, Face, Neck and the
  paired shoulders through feet. Their data is lifted from a set already in play
  rather than authored afresh, so the impact types, effective-impact ladders and
  probability weights are the ones actors have been using, not new numbers.

- 35fd72f: Add Halea's rituals, and Ritual skills for seven more faiths.

  - **Halea now has a full ritual set.** The compendium carried a Halea _skill_ but
    no invocations for her, so a Halea cleric had nothing to draw on. There is now
    an `Esoteric/Rituals/Halea` folder holding 32 invocations: the 20 common to
    every faith — Baptism, Blessing, Commune, Liturgy, Marriage, Passage of the
    Soul, Awe, Endure, Tongues, Truthsense, Curse, Divination, Revelation,
    Summoning, Truesight, Command, Consecration, Excommunication, Exorcism and
    Transcendence — plus 12 of Halea's own: Sardura's Vision, Dulcia's Song,
    Ecstacy, Silver Tongue, Cure Disease, Enhance Sense, Tania's Pleasure, Kilna's
    Whip, Thalia's Luck, Elomia's Tongue, Halea's Apple and Sadura's Rash.
  - **Seven more Ritual skills** — Christian, Eder, K'orr, Nalma, Sha, Urklam and
    Yavanna — join the ten already in `Skills/Religion`, for characters who follow
    faiths outside the ten the compendium covered.

  The 12 Halea-specific invocations and the seven new skills ship with empty
  descriptions; the rules text for them is not included.

- 35fd72f: Merge the compendium into a single `items` pack, and add the Cities/Price List
  trade goods.

  **Your existing links to compendium items will need updating.** The `character`,
  `possessions` and `esoteric` packs are now one pack named `items`, so every
  reference changes from `Compendium.hm3.<character|possessions|esoteric>.Item.<id>`
  to `Compendium.hm3.items.Item.<id>`. The document ids themselves are unchanged,
  so only the pack segment differs.

  What changed that you will notice:

  - **832 new items.** Armour and clothing, containers, and the full spread of
    trade goods — food, tools, tack, containers, lighting, scribe supplies,
    instruments, spirits, raw materials and the rest. The pack goes from 625 items
    to 1457.
  - **One browsable tree.** Everything now sits under three top-level folders —
    `Esoteric`, `Possessions` and `Skills`. Nothing is loose at the root, and the
    old `Armor`, `Melee Weapons` and `Missile Weapons` top-level folders are gone;
    their contents moved into `Possessions/Armor/Armor` and `Possessions/Weapons`.
  - **A `Tools` folder** under `Misc_Gear`, holding the craft tools and portable
    trade kits.
  - **Consistent shortcodes on weapons and armour.** These were name-derived
    (`ringshorthauberk`, `bastardsword`); they now follow the same abbreviated
    CamelCase scheme used across Song of Heroic Lands (`RShHbk`, `BstdSwd`), taken
    from the matching SoHL item wherever one exists. `sohl.shortcode` remains
    unique per document type.

  Under the hood, `package-build.config.yaml` declares the one pack, and the
  default-skill lookup that seeded new actors from `hm3.character` now reads
  `hm3.items`.

- 10926b4: Build and release the system with `@heroiclands/package-build`, on the same
  rails as every other HeroicLands Foundry package.

  `system.json` is now generated rather than hand-maintained, which repoints the
  manifest, download, url and bugs addresses from `toastygm/` to `HeroicLands/` —
  the repository moved and they had not. Per-pack `ownership` is no longer
  declared, so Foundry's defaults apply.

  The compendium packs are unchanged: 674 documents across the same four packs,
  still authored as JSON under `assets/packs/<name>/`, now compiled into the
  build stage instead of in place.

  Internally: the 2019 gulp/node-sass build is replaced by Dart Sass (it could no
  longer install at all on any current Node), pull requests are gated by CI for
  the first time, and releases are cut by changesets rather than by hand.

- 5aba622: Publish this system's `system` field sets as `schema.json`.

  Foundry discards an unknown `system` key when a document is constructed, and
  says nothing: the value is absent at load while the build that wrote it reported
  success. A content build cannot check for that on its own, because a DataModel's
  schema is only introspectable inside Foundry — `defineSchema()` returns field
  classes that do not exist in Node. So the system publishes the field sets as
  data and builds read them, the same shape a link manifest already uses for
  addresses rather than one repository reaching into another's checkout.

  `package-build schema` reads `module/data/item-models.js` and
  `module/data/actor-models.js` as an AST, following the registry that says which
  subtypes exist rather than walking filenames. Twelve Item and three Actor
  subtypes, with each subtype's own fields recorded apart from those it inherits:
  a builder must not emit a field nothing declares anywhere, but it is not
  expected to fill this system's own inherited machinery.

  **Shipped in the archive, not merely committed.** A module that depends on this
  system reads the copy `content-build deps fetch` caches from the release it
  pins, so the comparison happens against the version that module targets rather
  than whatever this repository's `main` holds today.

  **Checked in CI.** `lint:schema` fails when the committed artifact disagrees
  with what the data models would produce now. A generated file nothing checks
  drifts from its generator silently, and this one is read by other repositories —
  so the drift would surface there rather than here.

  This is what makes the first finding possible: `harn-ensemble`'s 2,512 character
  notes each authored fourteen ability keys against a model that defines thirteen,
  and the fourteenth corresponded to no field at all
  (HeroicLands/harn-ensemble#25).

  **Bump**

  _Minor._ One new file in the archive and a new check. Nothing about the system's
  behaviour, data, or manifest changes.

- e474d8c: Added: every compendium document now carries a `sohl.shortcode` flag — a stable,
  readable identifier derived from its name, unique within its document type.

### Patch Changes

- 1308f85: Adopt package-build 7.0.0.

  `stats.systemId` was removed from this repository's configuration because
  7.0.0 derives it (HeroicLands/package-build#48) — but the pin was still
  `^6.1.0`, where the key is merely _optional_. Under 6 the deletion resolves
  to `systemId: null` beside a real `systemVersion`: a version stamped with no
  id, silently, which is the "plausible lie" the upstream change exists to
  prevent.

  ```text
  under ^6.1.0, systemId deleted: { "systemId": null, "systemVersion": "0.8.2" }
  ```

  Bumping the pin closes the window. Verified: every pack stamps exactly the
  `systemId` and `systemVersion` it stamped before the deletion.

- 5815c08: Adopt `@heroiclands/package-build` 9.0.0 and format the tree.

  The shared `printWidth` moves from 80 to 100. This repository had never been
  formatted at all — issue #434 recorded the backlog as "110 unformatted files of
  145", and the CI comment explains why `lint:format` was left out of the build:
  a gate that cannot go green teaches everyone to merge past a red check.

  It can go green now. **103 files formatted**, and `content-build format` and a
  raw `prettier --check` both report the tree clean.

  **Two things had to be fixed for that to be true.**

  **A Prettier config file.** There wasn't one. `content-build format` applies the
  shared options directly, so the lint chain was correct — but Prettier's editor
  integrations and a bare `npx prettier` resolve a config _file_, and fall back to
  Prettier's own defaults when they find none. That meant format-on-save was
  quietly rewriting this repository at `printWidth: 80` and `tabWidth: 2` against a
  project that uses 100 and 4. `prettier.config.js` now re-exports the shared
  configuration, so every route resolves the same options.

  **Nine templates Prettier cannot parse.** They put a Handlebars block helper in
  attribute position:

  ```html
  <input type="text" … {{#if idata.skillBase.formula}}readonly{{/if}} />
  ```

  Prettier's HTML parser reports `Opening tag "input" not terminated` and formats
  nothing. The markup is correct Handlebars and Foundry renders it — this is a
  parser limitation, not a defect. Those nine are listed in `.prettierignore` with
  the exact criterion recorded, deliberately _not_ as `templates/`: every other
  template parses, and excluding the directory would stop checking forty files
  that are fine. The note there also says what the fix is never to be — removing a
  conditional attribute to please the formatter.

  **Verification.** 138 tests pass; `content-build format` reports clean over 145
  files; `prettier --check .` reports clean.

  **Bump**

  _Patch._ Whitespace, one config file, and nine ignore entries. No behaviour, no
  emitted document, no manifest change.

- f23a2b0: Fixed: a weapon's associated skill could not be looked up.

  `getAssocSkill` read each skill's name through `item.data.name`. Foundry removed
  `Document#data` in v11, so that read has been `undefined` ever since and the
  lookup threw rather than returning a skill. It now reads `item.name`.

  Alongside it, the system has unit tests for the first time, and they run on
  every pull request: 138 of them, covering the melee and missile combat result
  tables, the utility helpers behind skill-base formulas and name generation, and
  the integrity of the `CONFIG.HM3` tables the rest of the system reads.

  The combat tables are the point. They are the game's actual rules — a pair of
  lookups that decide every attack outcome — and until now nothing would have
  noticed a wrong cell.

- d352ccc: Stop authoring `stats.systemId`; it is derived.

  package-build 7.0.0 refuses `stats.systemId` and `stats.systemVersion`:
  authoring a derived value is an error rather than an override, because a
  transcribed copy is free to drift from what it copied — which is how
  `stats.systemVersion` came to sit at `0.6.0` for four releases
  (HeroicLands/package-build#48).

  Here a system package is its own system, so `hm3` is derived from `foundryPackage`, so deleting the line changes nothing:

  ```diff
   stats:
  -    systemId: hm3
       lastModifiedBy: …
  ```

  **Verified.** Every pack in this package stamps exactly the `systemId` and
  `systemVersion` it stamped before — resolved with the configuration loader
  and compared pack by pack.

- d10b76f: Fixed two regressions from the Foundry v14 release that only showed up once the
  system was driven in a real browser.

  **Ability rolls threw.** Both the d6 and d100 ability tests read the list of
  abilities from `game.model`, Foundry's registry of `template.json` defaults.
  Replacing `template.json` with data models left that registry empty, so the
  lookup threw and no ability roll worked at all. The ability names now come from
  the actor.

  **Dropdowns forgot their value, and wrote back a number.** Twenty-three
  dropdowns — skill and trait type, weapon aspect, convocation, deity, sunsign,
  armour effective-impact, macro type, and others — render from a plain list of
  strings. Foundry's `selectOptions` helper numbers such a list, producing
  `<option value="0">Craft</option>`, so the stored value never matched and
  nothing appeared selected. Worse, saving the sheet would have written the
  option's _index_ into the field. They now render the value they display, as they
  did before v14.

- 95d691e: Lint this repository's content frontmatter, and gate pull requests on it.

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

- 1bf58d1: Write the data model schemas out as literals, so they can be read as data.

  `package-build schema` publishes a system's `system` field sets by reading
  `defineSchema()` from source — a DataModel's schema is only introspectable
  inside Foundry, so a content build that wants to know what a document will
  actually receive has to read the declaration rather than run it. Foundry
  discards an unknown `system` key at construction and says nothing about it, and
  that check is what catches it.

  The reader follows declarations, not calls. Two places here were built by a
  function instead of written out, and each read back as less than it is:

  - **`skillBase: skillBaseField()`** recorded `skillBase` with no keys beneath
    it, while authored content writes `skillBase.value` on 54,744 embedded skills
    and `skillBase.formula` on psionics. Those correctly authored fields would
    have been reported as undeclared.
  - **`abilities: new SchemaField(Object.fromEntries(ABILITIES.map(…)))`**
    recorded `abilities` alone. That is enough to stop `abilities.strength.base`
    being called undeclared — a declared ancestor covers what lies under it — but
    it means the schema never described the ability set at all, so a _misspelt_
    ability could not be caught. Written out, all 27 ability paths are declared,
    and a name that is not one of the thirteen is a finding rather than a silent
    discard.

  Nothing about the model changes: the same thirteen abilities under the same
  names, and the same three `skillBase` fields. This is what the declaration
  always meant, spelled so that something other than Foundry can read it.

  **Why not teach the reader to follow a factory.** It was tried, and it recovers
  the `skillBase` case but not the `abilities` one — no reader recovers keys that
  are computed at runtime. So the schema would still have been silent about the
  ability set, which is the half that matters here: 2,512 notes author fourteen
  ability keys each, and one of them (`end`) corresponds to no field in this
  model at all. Writing the abilities out is what makes that visible.

  **Bump**

  _Patch._ A refactor with no change to the emitted schema, the stored data, or
  any behaviour. Only the way the declaration is spelled.

- 07ef705: Fixed: the compendium source round trips again, and a check now says so.

  `CONTRIBUTING.md` tells a contributor that extracting the built packs back to
  `assets/packs/` produces no diff, "so anything `git diff` shows is a change you
  made". That is what makes the edit-in-Foundry loop usable at all — it is the
  difference between reviewing your own edit and reading 1,597 JSON files. It had
  stopped being true: a round trip with no edit whatsoever rewrote 56 documents
  under different names, 112 changed paths in `git status`, and any real edit was
  buried in the noise.

  Two separate mistakes, both filenames only. **55 folder documents** were
  committed with a `folder_` prefix — `folder_Agrik_jOppWJPOPMwgDYFG.json` — which
  is `@heroiclands/package-build`'s convention for the folder JSON it generates
  from a Markdown content tree. This system has no such tree and does not use that
  pipeline; it extracts with `extractPack` from `@foundryvtt/foundryvtt-cli`, which
  names every document `<name>_<id>.json` whatever its type and has never emitted
  that prefix. The names came in with the pack consolidation and disagreed with the
  extractor from that day on. **One item document** was worse than misnamed:
  `Pence` was committed as `Pence_TV3IMHs8SLZ1L1vv.json`, and
  `TV3IMHs8SLZ1L1vv` is not its id — it is the id of the `Cash` folder the item
  sits in. Its own id is `sR0MNABSDrVxUQMf`. Both are now named the way the
  extractor names them, and 26 of the folder files also regained the trailing
  newline it writes.

  **Nothing that ships changed.** The renames are of source files only; the
  compiled LevelDB is byte-identical, document for document. Every `_id` is
  untouched, so every `Compendium.hm3.items.Item.<id>` UUID still resolves, and the
  packs still compile the same 1,577 items and 20 system-help journals. No code in
  this repository ever read the `folder_` prefix.

  `npm run lint:roundtrip` now checks the property rather than restating it. It
  extracts what `build:compiledb` has just written into a scratch directory under
  `build/` and compares that tree byte for byte with `assets/packs/`, so a file
  under an unexpected name, a file whose bytes differ, and a document present on
  only one side are all one failure with one remedy — run `npm run build:unpackdb`
  and commit the result. It reimplements none of the extractor's naming rules,
  deliberately: the convention belongs to the CLI, is not exported, and a copy of
  it here would drift the first time the CLI changed. It runs inside `build:noci`,
  right after `build:compiledb`, which is where its input exists.

- b65c54c: Take `@heroiclands/package-build` 4.0.0, four releases on from the 3.0.1 this
  repository was pinned to.

  Nothing this system ships changes. The build stages the same 540 files, and 538
  of them are byte-identical to what 3.0.1 produced — the two that differ are the
  LevelDB `LOG` files, which carry wall-clock timestamps and differ between two
  runs of the _same_ version. `system.json` is byte-identical, packs and all, and
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

- 510fefb: Take `@heroiclands/package-build` 5.0.0, and author the package homepage it
  introduces.

  **Nothing this system ships changes.** The build stages the same 540 files, and
  538 of them are byte-identical to what 4.0.0 produced — the two that differ are
  the LevelDB `LOG` files, which carry wall-clock timestamps and differ between
  two runs of the _same_ version. `system.json` is byte-identical, and the packs
  compile the same 1,577 items and 20 system-help journals.

  **`publish.site` is a mode now, not a boolean** — `homepage` or `content`, with
  both booleans refused at config load rather than mapped onto the nearest one.
  This repository declared no `publish:` section, so nothing was refused here and
  the new default, `homepage`, already applied. It is now written out, because a
  mode inherited by omission reads to the next person as a question nobody asked.

  **The homepage is a page, authored rather than assembled.** 5.0.0 adds a
  `type: homepage` note that compiles to a page instead of to a compendium
  document, published at `/hm3/`. It says what the system is, the manifest URL to
  paste into Foundry, that Foundry 14 or later is needed, that you still need your
  own copy of the HârnMaster rules, and where the source and the licence are.
  Everything on it is drawn from `README.md`, `WALKTHROUGH.md` and the manifest;
  only the title is derived, and here it is authored so the page can greet a
  reader as HârnMaster rather than as the manifest's `HarnMaster 3`.

  Two pieces of plumbing came with it, both new to this repository:

  - `assets/content/` now exists, with the homepage note as its only file. HM3
    uses only the packaging half of the toolchain — its compendium content is
    committed JSON under `assets/packs/` — so this is not a content tree and the
    site build walks it for exactly one thing.
  - `npm run build:site` wires `content-build site`, which nothing here invoked
    before. It emits one file, `site/content/_index.md`, and that tree is a build
    artifact and gitignored. `site.out` is required rather than defaulted: the
    output directory is wiped on every run, and an unset value would resolve to
    the repository root, so the build refuses it.

- 8c4ddd5: Fixed: the compendium folder now names the packs the system actually ships.

  `packFolders` in `package-build.config.yaml` still described the pack layout
  from before the compendium was consolidated. It listed `character`,
  `possessions`, `esoteric` and `system-help` — and of those four, three have not
  existed since the items pack was created. The one pack it left out was `items`,
  which carries 1,577 of the system's 1,597 documents.

  What a user saw in Foundry's compendium browser was therefore a
  `HârnMaster 3 System` folder holding one journal pack, with the entire item
  compendium sitting loose beside it, and three names in the manifest that
  resolved to nothing at all. The folder now names `items` and `system-help`, so
  every pack it lists resolves and no pack is left outside it.

  Nothing reported this. `packFolders` is emitted into `system.json` exactly as
  declared, and the manifest generator never compares it against the `packs[]`
  array it derives from the same file — so the two could disagree indefinitely and
  the build stayed green. The declaration now carries a comment saying that, and
  saying that adding or removing a pack means editing the folder by hand.

  `system.json` is otherwise unchanged: the generated manifest differs from the
  previous build in `packFolders` and in nothing else, key order included, and the
  packs still compile the same 1,577 items and 20 system-help journals.

  Four places in the repository's own prose said this system ships "four
  compendium packs" — `CONTRIBUTING.md`, `.github/ISSUE_REPORTING.md`, and a
  comment apiece in the build and release workflows. They now say "the compendium
  packs", which stays true whatever the count becomes.

- d24c64e: Publish the package homepage at `https://www.heroiclands.org/hm3/`.

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

- a04da90: Fixed: the README addresses this repository by its current name, and its two
  broken links work again.

  `README.md` is staged into the system by `packageBuild.assets` and ships inside
  the released `system.zip` — it is installed alongside the code, not merely
  displayed on a GitHub page. So the addresses it carries are ones players read
  after installing, and the manifest's `readme: README.md` names it.

  **What was stale.** Six references still said `toastygm/…`, the owner this
  repository had before it moved; `package.json`, the generated `system.json` and
  every release address have said `HeroicLands/…` since the build was modernised.
  GitHub redirects a renamed owner, so most of them still resolved — which is
  precisely why nobody noticed. They are repointed anyway. The redirect survives
  only until someone claims the vacated name, and three of the six are live
  queries: a release badge, an issue-count badge, and a downloads badge, each of
  which would then begin reporting a different repository's numbers without
  anything here failing.

  **What was broken.** Two were not merely stale.

  The _Downloads@latest_ badge rendered the text `query not supported`, for either
  owner. It was a `shields.io/badge/dynamic/json` badge whose JSONPath filter
  expression — `assets[?(@.name.includes('zip'))].download_count` — shields.io no
  longer accepts. It is now the built-in
  `shields.io/github/downloads/<owner>/<repo>/latest/total` endpoint, which
  renders the count and drops the hand-rolled `api.github.com` request that badge
  was making.

  The link offered as the "official documentation" pointed at
  `toastygm.github.io/HarnMaster-3-FoundryVTT`, a GitHub Pages site that no longer
  exists and returns 404 — there is no equivalent under the new owner either. It
  now points at `https://www.heroiclands.org/hm3/`, the homepage this repository
  publishes, and the section that held it is headed _Documentation_ rather than
  _Pages Site_.

  The two wiki links and the release badge simply changed owner; both wiki pages
  exist under the new one. Nothing else in the repository named the old owner,
  and the single remaining mention — in the `modernise-the-build` changeset,
  recording that the manifest addresses were repointed — is a true statement about
  the past and is left alone.

  Closes #423.

- 2633e73: Read the changesets output that `changesets/action@v2` actually sets, so the
  release gate can evaluate.

  `release.yml` pins `changesets/action@v2` but gated on
  `steps.changesets.outputs.hasChangesets` — a **v1** output name. v2 renamed
  every output to kebab-case (`hasChangesets` → `has-changesets`,
  `pullRequestNumber` → `pr-number`, `publishedPackages` → `published-packages`),
  and a v1 name read against a v2 action resolves to the empty string. The gate
  was therefore `'' == 'false'`, which is false on every run: _Decide whether to
  release_ and every step below it were skipped unconditionally, so no release
  could ever be cut — while the job reported green.

  **Nothing this system ships changes.** The correction is one expression in one
  workflow, now `steps.changesets.outputs['has-changesets'] == 'false'`, matching
  the four sibling HeroicLands release workflows that already read the v2 name.
  The audit behind it is the whole file: this was the only reference in the
  repository to an output of a third-party action, and the only stale spelling.
  Every other `steps.<id>.outputs.*` reference resolves to `decide`'s own
  `release` and `tag`, written by the inline script one step above.

  The tag-existence half of the gate — which is what keeps an ordinary push, or a
  re-run, from cutting the same release twice, and what makes the hand-cut tags up
  to `v1.6.3` safe to inherit — is unchanged and needs no correction. It is
  byte-identical to the guard that has already run in a sibling repository under
  the v1 name, taking both of its branches: cutting three releases, and reporting
  _"Tag v0.8.2 already exists — nothing to release"_ on four subsequent pushes.

  Closes #427.

- 1d23ba0: Fix three markup defects in the sheet and chat-card templates, and diagnose the
  rest of #434's twelve unparseable files.

  **The three defects**

  `templates/chat/standard-test-card.html` and
  `templates/chat/missile-attack-card.html` each carried a stray `</footer>` as
  their second-to-last line. Both files already close a `<footer>` inside every
  branch of the `{{#if isSuccess}}` / `{{#if isCritical}}` nest above it, so the
  trailing one closes nothing. `templates/item/armorgear-sheet.html` closed a
  `<legend>` with `</Legend>`.

  Neither changes what a browser builds. An end tag with no matching element in
  scope is a parse error the HTML5 tree-construction rules discard, and tag names
  are ASCII case-insensitive, so Foundry has been rendering the intended DOM all
  along. They are wrong in the source, not in the window — but they are exactly
  the class of error that stops being harmless the moment markup moves, and they
  were invisible because no tool in this repository had ever parsed these files.

  Verified by rendering each template before and after through Handlebars across
  every branch of its conditionals: the two cards emit one surplus standalone
  `</footer>` before the change and none after, with every other byte identical,
  and the armour sheet differs only in the case of that one closing tag. Nothing
  in `module/`, `scss/`, or `cypress/` selects on `footer` or `legend`, so no
  handler or rule binds to what moved. The unit suite (138 tests) and
  `build:noci` — including `lint:roundtrip` — are green.

  **The other nine are Prettier, not the markup**

  The remaining nine files Prettier refuses all fail on the same construct: a
  `{{#if}}…{{/if}}` block in **attribute position**, conditionally emitting a
  bare boolean attribute.

  ```hbs
  <option value="{{key}}" {{#if (eq key ../defaultRange)}}selected{{/if}}>
  ```

  That is valid Handlebars and correct HTML in either branch. Prettier's `html`
  parser reads the tag before Handlebars has run, sees `{{#if` where an attribute
  name belongs, and reports the opening tag as unterminated; its `glimmer` parser
  rejects the same source differently (_"A block may only be used inside an HTML
  element or another block"_). A block helper straddling a tag boundary has no
  parser in Prettier that accepts it. Confirmed minimally: the same conditional
  **inside** a quoted attribute value (`class="tab {{#if a}}active{{/if}}"`)
  formats without complaint, as does a bare `{{mustache}}` in attribute position.

  So the diagnosis is that the nine are not defects, and the choice they present
  is a real one rather than a formatting preference. Emitting the attribute from
  a helper (`{{selectedIf …}}`) would make them parse, but it moves markup into
  JavaScript and needs verification in a running Foundry; rewriting the
  conditional into the attribute value would be wrong, since `selected=""` is
  still selected. Neither belongs in a markup-fix change, so the files are left
  as they are and the decision stays on #434 with the evidence attached.

  The whole-tree reformat #434 also asks for is deliberately not here: ninety-odd
  files of whitespace churn would bury a three-line markup fix.

  Refs #434

## 1.6.3

Releases up to and including this one were cut by hand, and their notes live on
the [GitHub releases
page](https://github.com/HeroicLands/HarnMaster-3-FoundryVTT/releases). This
file records every release from the next one onwards, written from the
changesets each pull request declares.
