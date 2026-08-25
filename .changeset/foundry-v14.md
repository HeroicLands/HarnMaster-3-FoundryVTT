---
"hm3": major
---

Support Foundry VTT v14, and drop support for v12 and v13.

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
- **Chat cards work again.** Their action buttons had lost their click handlers
  in v13, when the chat log stopped passing jQuery. Roll messages had also been
  posting with the roll detached: nothing to expand, and nothing for Dice So
  Nice to animate.
- **Messages you post on someone else's behalf keep their attribution.** The
  field Foundry stores it in was renamed and the old one was being discarded
  silently.
- **The missile damage dialog preselects the right range**, and the armour
  sheet's Add Location button adds the location you actually picked rather than
  the one before it.
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
