---
"hm3": minor
---

Merge the compendium into a single `items` pack, and add the Cities/Price List
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
