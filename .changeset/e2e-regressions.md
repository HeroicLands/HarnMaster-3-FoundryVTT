---
"hm3": patch
---

Fixed two regressions from the Foundry v14 release that only showed up once the
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
option's *index* into the field. They now render the value they display, as they
did before v14.
