import { describe, it, expect } from "vitest";
import { descriptionPageUuid } from "../module/description-page.js";

const PAGE = "Compendium.hm3.journals.JournalEntry.abc123.JournalEntryPage.def456";

describe("descriptionPageUuid", () => {
    it("returns the page UUID of a bare pointer", () => {
        expect(descriptionPageUuid(`@UUID[${PAGE}]`)).toBe(PAGE);
    });

    it("accepts a pointer wrapped in a paragraph and whitespace", () => {
        expect(descriptionPageUuid(`  <p>@UUID[${PAGE}]</p>\n`)).toBe(PAGE);
    });

    it("accepts a pointer with a label", () => {
        expect(descriptionPageUuid(`@UUID[${PAGE}]{Acrobatics}`)).toBe(PAGE);
    });

    it("rejects prose that merely contains a link", () => {
        expect(descriptionPageUuid(`See @UUID[${PAGE}]{Acrobatics} for more.`)).toBeUndefined();
        expect(descriptionPageUuid(`<p>@UUID[${PAGE}]</p><p>More.</p>`)).toBeUndefined();
    });

    it("rejects a link to something other than a journal page", () => {
        expect(descriptionPageUuid("@UUID[Actor.abc123]{Bob}")).toBeUndefined();
    });

    it("returns undefined for empty input", () => {
        expect(descriptionPageUuid("")).toBeUndefined();
        expect(descriptionPageUuid(undefined)).toBeUndefined();
        expect(descriptionPageUuid(null)).toBeUndefined();
    });
});
