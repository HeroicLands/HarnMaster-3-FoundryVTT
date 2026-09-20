# hm3

## 1.6.5

### Patch Changes

- fe4ea86: **Compendiums** — A module that pins this release resolves the system's items by shortcode; nothing changes for a player or referee.

## 1.6.4

### Patch Changes

Requires Foundry VTT 14. The system does not load on v12 or v13.

**Compendiums**

- The `character`, `possessions` and `esoteric` packs are one pack named
  `items`. A world, macro or journal that links to a compendium item must
  change `Compendium.hm3.<character|possessions|esoteric>.Item.<id>` to
  `Compendium.hm3.items.Item.<id>`; the ids themselves are unchanged.
- 832 new items: armour and clothing, containers, craft tools and trade kits,
  and the trade goods of the Cities price list — food, tack, lighting, scribe
  supplies, instruments, spirits, raw materials and the rest.
- The 24 standard armour locations, Skull through the feet, are compendium
  items that drag onto a character or restore one whose locations were deleted.
- Halea has a full set of 32 rituals, and Ritual skills for Christian, Eder,
  K'orr, Nalma, Sha, Urklam and Yavanna join the ten already there. The
  Halea-specific rituals and the seven skills ship with empty descriptions.
- Everything sits under three top-level folders — Esoteric, Possessions and
  Skills — and Foundry's compendium browser shows both packs inside the
  HârnMaster 3 System folder.
- Weapon and armour shortcodes follow the abbreviated scheme Song of Heroic
  Lands uses (`BstdSwd`, `RShHbk`), and every compendium document carries a
  shortcode unique within its type.

**Characters and sheets**

- Rich text is edited in ProseMirror; the Highlight block is under the editor's
  Custom insert menu, and the Hârnic fonts are still in its font list.
- Every sheet and dialog sits in Foundry's current window chrome and looks and
  behaves as before.

**Fixes**

- A weapon finds its associated skill, ability rolls work, and dropdowns on
  every sheet and dialog show the value they hold and save it rather than a
  number.
- Chat-card buttons respond, roll messages arrive with their roll attached, and
  active effects can be created and offer HârnMaster's list of effect keys.
- The Theatre of the Mind checkbox is back in scene configuration, and a message
  posted on another player's behalf keeps its attribution.
- A container moves between actors and deleting one takes its contents with it,
  the missile damage dialog preselects the right range, the missile macro's
  Attack and Damage buttons work, and the armour sheet's Add Location button
  adds the location you picked.
- The links in the installed README resolve, and its documentation link lands on
  the system's page.

**Website**

- The system's page is at www.heroiclands.org/hm3/ — what it is, the manifest
  URL to paste into Foundry, and what you need alongside it.

## 1.6.3

Releases up to and including this one were cut by hand, and their notes live on
the [GitHub releases
page](https://github.com/HeroicLands/HarnMaster-3-FoundryVTT/releases). This
file records every release from the next one onwards, written from the
changesets each pull request declares.
