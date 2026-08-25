# HarnMaster-3-FoundryVTT

![GitHub release (latest by date)](https://img.shields.io/github/v/release/toastygm/HarnMaster-3-FoundryVTT)  
![GitHub issues](https://img.shields.io/github/issues-raw/toastygm/HarnMaster-3-FoundryVTT) 
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fhm3)
[![GitHub downloads (latest)](https://img.shields.io/badge/dynamic/json?label=Downloads@latest&query=assets[?(@.name.includes('zip'))].download_count&url=https://api.github.com/repos/toastygm/HarnMaster-3-FoundryVTT/releases/latest&color=green)](https://github.com/toastygm/HarnMaster-3-FoundryVTT/releases/latest)

This is a game system definition of the H&acirc;rnMaster 3 RPG for [Foundry Virtual Tabletop](http://foundryvtt.com/).

# Pages Site
If you are looking for the offical documentation, please see the [HarnMaster 3 FoundryVTT System Site](https://toastygm.github.io/HarnMaster-3-FoundryVTT/).

### H&acirc;rnMaster Copyright Notice

This is an unofficial H&acirc;rnFanon work. It is a derivative work from material created by N. Robin Crossby and is released for free distribution and personal use without the permission or endorsement of N. Robin Crossby or his estate.

H&acirc;rn, H&acirc;rnMaster, and H&acirc;rnWorld are all &copy; 1987-2020 N. Robin Crossby and Columbia Games Inc. Their works are available for sale on the [Columbia Games Ltd website](http://columbiagames.com/harn/).

# Features

The following features are included in this system.

* Characters, Creatures, and Containers sheets
* Tracking of all abilities and functional characteristics
* Separate tracking of Description (publicly apparent information) and Biography (private information and backstory)
* Tracking of all skills, convocations, religion(s), spells, ritual invocations, psionics, etc.
* Support for "limited" permission on characters (so only basic readily-apparent information is viewable)
* Injury tracking and Fatigue tracking
* Automatic calculation of EML based on UP and PP
* Automatic dice rolls (skills, spells, ritual invocations, healing, shock, fumble, stumble, attack/defend, weapon damage, and injury)
* Compatible with "Dice So Nice" module.
* Automated combat system to make running combats much easier
* Effects allowing use of "buffs" and "debuffs" (such as Outnumbered, melee attack modifiers, UP/PP modifiers, etc) for either indefinite or a specified duration, that can be enabled/disabled as desired
* Flexible macro support for extending with your own custom capabilities

# Recommended Modules

There are a number of modules that extend the H&acirc;rnMaster system by providing new functionality or ready-made content for you to use in your campaign.  See the [Modules](https://github.com/toastygm/HarnMaster-3-FoundryVTT/wiki/Modules) page for more information.

# System Walkthrough

See the [Walkthrough](https://github.com/toastygm/HarnMaster-3-FoundryVTT/wiki/FoundryVTT-HarnMaster-Walkthrough) page for a detailed review of the system (with screenshots).

# Usage

Although most parts of this system should be self-explanatory to those familiar with H&acirc;rnMaster 3, there are some peculiarities that will be described here.

## Missing Components of H&acirc;rnMaster Rules

This system requires the user to have a copy of the H&acirc;rnMaster rules in order to play effectively. Skill descriptions and rules descriptions have been intentionally left out.  This system is not intended to be used as a character generator; for that you will need a copy of the H&acirc;rnMaster rules.

## Actors Supported

The following actors are supported:

* __Character:__ A standard humanoid character, such as a Human, Khuzdul, or Sindarin.  This can also be used for other humanoid creatures, such as Gargun.  A character has the following features:
  1. Ability Scores
  2. Public Description (characteristics others can observe about you, your behavior, and your public backstory)
  3. Basic Skills (Physical, Communication, Combat, and Craft)
  4. Esoteric Skills/Talents (Convocations, Rituals, and Psionics)
  5. Combat (Weapons, Injuries, Armor Locations)
  6. Inventory (Armor/Clothing, Misc. Gear)
  7. Biography (your personal/real characteristics, story, motivations, and attributes)

* __Creature:__ Any being not a "character" (e.g., animals, Ivashu, etc.).  A creature has the following features:
  1. Ability Scores (except no Comeliness or Morality)
  2. Basic Skills
  3. Combat (Weapons, Injuries, Armor Locations)
  4. Misc. Gear
  5. Description

* __Container:__ A token (such as a chest, a wagon, or a shop) that can contain items and can be placed separately on the canvas.

Note that when creating a character, you will be prompted whether to install standard skills and standard humanoid armor locations.  When creating a creature, no armor locations will be preloaded, since each creature will have different armor locations (although a few basic combat skills are preloaded).

## Supported Capabilities

The following capabilities are supported in both characters and creatures:

* Automatic Dice Rolls (click on the dice icon next to the item). Holding SHIFT, ALT, or CTRL keys while clicking the icon will use defaults and bypass the dialog (except for damage rolls which always require the dialog).  All of these are available as macros as well.
  * Skill check rolls
  * Spell success rolls (character only)
  * Ritual Invocation success rolls (character only)
  * Psionic Talent success rolls (character only)
  * Shock roll
  * Fumble roll
  * Stumble roll
  * General Damage roll (Non-weapon-specific)
  * Weapon Damage roll (weapon-specific)
  * Weapon Attack roll
  * Weapon Defense roll
  * Injury roll (calculates location and Injury Level)

* Automatic Calculations
  * Automatic Skill Base calculation based on Formula
  * Total Injury Levels
  * Total Gear Weight
  * Encumbrance (characters only)
  * Universal Penalty (UP)
  * Physical Penalty (PP)
  * All skill EMLs (based on ML minus UP or PP)
  * Endurance (based on Condition skill if present, otherwise calculated from abilities)
  * Move rate (characters only)
  * Spell EML and Ritual Invocation EML (accounting for spell level or invocation circle)
  * Weapon Attack ML (AML) and Defense ML (DML)

## Special Considerations

There are a few things to keep in mind as you are filling out your characters.

### Description and Biography

The Description represents readily-apparent information about your character; this information is available to anyone who observes or interacts with your character. Any information you would share with others (even if untrue) can be placed in this area, and anyone with even limited access to your character sheet can observe it.

Your Biography represents your personal characteristics and backstory; those things that are not apparent to others unless you choose to share it. This may contain personal motivations as well as personal characteristics. Your biography will only be available to those will full access to your character, not to those with only limited access.

### Diety and Piety

The assumption is that a character may have one or more religions, and a piety associated with each one.  If a character is initiated into a religion, they are assumed to have a base ML in the religion (presumably opening at SBx1) representing basic understanding of the rituals and requirements of the religion.

Piety is therefore assocated with the religion/diety, and is indicated as part of the ritual skill for that diety.  If you choose to not require characters to have any Ritual skill to get piety, you may simply leave the SB/ML at 0.

### Weapon Associated Skill

A skill in a type of weapon is distinct from the weapon itself.  For example, you might have skill in Dagger, but you actually have a Knife weapon.  For a Knife, you use the Dagger skill.  In the details for each weapon, you will see an input for the Associated Skill.  This should default to the same name as the weapon, but in many cases you will need to change this to refer to the actual skill used (for example, a Staff might use the "Spear" Associated Skill; or, alternatively, you may have a specific Staff skill that should be used instead).

Only combat skills may be chosen as an "Associated Skill" for a weapon.

### Armor Locations Probability Weight (Prob. Weight)

Hit locations play a big part in the H&acirc;rnMaster combat system.  In order to correctly calculate hit location, each armor location is designated with a Probability Weight.  You can think of this as the percentage chance of that location getting hit.  In that case, the total of all armor location probability weights must add up to 100.

There are separate probability weights for High, Mid, and Low aiming points.  For humanoid characters, if you chose to have the armor locations pre-loaded, these will already be setup to default values.  For creatures, no armor locations are available so you will need to enter your own armor locations and the probability weights for those.

# Building

The system is built by npm scripts; nothing is assembled by hand.

```bash
npm install          # first time
npm run build:local  # compile styles, stage assets, build packs, write system.json
```

The result is a complete, loadable system in `build/stage/`. **That, not the
repository root, is what Foundry loads** — `system.json`, the compiled CSS and
the compendium packs are all build output and none of them exist in the
checkout. Install it with `npm run deploy:dev`, or copy `build/stage/` into
`$FOUNDRY_DATA_DIR/systems/hm3`.

## Compendium content

The source of truth is per-document JSON under `assets/packs/<name>/`. The
LevelDB directories Foundry reads are built from it into `build/stage/packs/`
and are **never committed** — `npm run lint:packs` fails the build if any are
tracked, and CI runs it.

To take changes you made inside Foundry back into the source:

```bash
npm run build:unpackdb   # extract build/stage/packs/ back to assets/packs/
git diff                 # review what changed
```

Round-tripping without editing produces no diff, so anything `git diff` shows
is a change you made.

## Releasing

Releases are cut by CI from changesets, not by hand. See
[CONTRIBUTING.md](CONTRIBUTING.md).

# Credits

The following images were taken from [The Noun Project](https://thenounproject.com/) and [Game-Icons](https://game-icons.net/) under the Creative Commons (CC BY 3.0) license:

* Agriculture by Made
* Anvil by Nico Ilk
* Arrow by Kitty_Keks
* Awareness by Max Hancock
* Axe by Deemak Daksina
* Circle by Prime Icons
* Club by Natalia
* Crossbow by Creaticca Creative Agency
* Engineering by ProSymbols
* Fire by Nabilauzwa
* Fishing by Vectors Point
* Flail by Simon Henrotte
* Flameworking by Jasmine Rae Friedrich
* Harp by Marina Pugacheva
* Horse Riding by Adrien Coquet
* Hunting by Gregor Cresnar
* Ink by Justicon
* Law by Denis Shumaylov
* Love by Adrien Coquet
* Masonry by IconMark
* Mining by art shop
* Mummy by Eucalyp
* Muscle by Kieu Thi Kim Cuong
* Pegasus by IconMark
* Pentacle by Kyle Tezak
* Perfume by Binpodo
* Polearm by Hamish
* Round Shield by Hea Poh Lin
* Scroll by stefano corradetti
* Shield by Jamison Wieser
* Ship by jenya
* Ski by Brad Avison
* Spear by sam maulidna
* Stones by Mayur Bhat
* Swimming by Atif Arshad
* Sword by Kamal
* Telepathy by Adrien Coquet
* Throw by Jakob Vogel
* Throw by Jakob Vogel
* Tree by kareemov1000
* Unicorn by corpus delicti
* Viking Ship by Ben Davis
* War Hammer by Kaylen Yul Lee
* Water by Bhuvan
* Water mill by Ben Davis
* Wind by Andi Nur Abdillah
* acting by Flatart
* advice by Adrien Coquet
* alchemy by Matthias Hartmann
* astrology by abderraouf omara
* brewery by Made x Made
* caduceus by Minh Do
* cattle by Gleb Khorunzhiy
* ceramics by Made
* dagger by iconcheese
* dance by Adrien Coquet
* divination by Made x Made
* dodge by Rflor
* drawing by Nibras@design
* heraldry by Joel McKinney
* herb by ProSymbols
* initiative by Maxim Basinski
* jewel by pejyt
* juggler by Orin zuu
* jump by Adrien Coquet
* leather by Amy Schwartz
* longbow by Hamish
* mathematics by annes curnio
* mental by Ragesh PP
* musician by corpus delicti
* net by Made by Made
* ninja by Adrien Coquet
* padlock by thirddesign
* pot boiling by Weltenraser
* punch by Phạm Thanh Lộc
* rune by Miroslava
* singing by Andrejs Kirma
* speaking by Azam Ishaq
* staff by ATOM
* steering by Edit Pongrácz
* survival knife by Ben Davis
* tarot by monkik
* textiles by ArmOkay
* timber by jauhari
* tracking by Adrien Coquet
* weather by Creative Mania
* whip by lastspark
* woodworker by Pham Duy Phuong Hung
* Coins by Vectors Market
* sack by Andrejs Kirma
* Torch by Pixelicatom
* Candle by Martin
* boxes by Sarah
* lance by parkjisun
* Trident by Yohann
* Injury by HAMEL KHALED
* break by ibrandify
* hit by Guilherme Furtado
* armor by Postcat Studio
* Man Fainted by Gan Khoon Lay
* bullseye by Creative Stall
* blowgun by Peter Selinger
* chest by Toli

A number of icons were also produced by:

* delapouite
* lorc
* skol
* willdabeast

Lakise and Runic Fonts are copyright N. Robin Crossby, redistributed under the terms of the [CC BY-NC-SA 3.0 AU](https://creativecommons.org/licenses/by-nc-sa/3.0/au/legalcode) license.

Lankorian Blackhand font is copyright 2020 by Mitch Gore, redistributed under the terms of [CC BY-NC-SA 3.0 AU](https://creativecommons.org/licenses/by-nc-sa/3.0/au/legalcode) license
