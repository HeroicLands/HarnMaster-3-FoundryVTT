---
"hm3": minor
---

Added: the 24 standard armor locations as compendium items.

The `items` pack held every other kind of item a being needs — skills, armor,
weapons, gear, invocations — but no `armorlocation` documents. They existed only
as items already embedded on pre-built actors, so there was nothing to drag onto
a new actor and no way to repair a being whose locations had been deleted short
of copying them off another one.

A new top-level `Armor Locations` folder now carries Skull, Face, Neck and the
paired shoulders through feet. Their data is lifted from a set already in play
rather than authored afresh, so the impact types, effective-impact ladders and
probability weights are the ones actors have been using, not new numbers.
