const POINTER =
    /^(?:\s|<\/?p>)*@UUID\[([^\]\s]+\.JournalEntryPage\.[^\]\s.]+)\](?:\{[^}]*\})?(?:\s|<\/?p>)*$/i;

/**
 * The UUID of the journal page an item description points to.
 *
 * A description that consists of one `@UUID[...JournalEntryPage...]` link and
 * nothing else, apart from whitespace and paragraph tags, is a pointer to the
 * page that holds the prose. Any other text, including prose containing such a
 * link, is an ordinary description.
 *
 * @param {string | null | undefined} description - The `system.description` value.
 * @returns {string | undefined} The page UUID, or `undefined` for an ordinary description.
 */
export function descriptionPageUuid(description) {
    if (typeof description !== "string") return undefined;
    return POINTER.exec(description)?.[1];
}
