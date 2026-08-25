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

### Patch Changes

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

## 1.6.3

Releases up to and including this one were cut by hand, and their notes live on
the [GitHub releases
page](https://github.com/HeroicLands/HarnMaster-3-FoundryVTT/releases). This
file records every release from the next one onwards, written from the
changesets each pull request declares.
