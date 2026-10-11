/**
 * Decides the roll mode a roll's chat message uses, so that listed rolls made as
 * Public Rolls are made blind.
 */

const PUBLIC = "publicroll";
const BLIND = "blindroll";
const NAMED_TYPE = /^(?:skill|spell|invocation|psionic)-/;

/**
 * Extracts the name a GM lists from a roll's `type` value: the item name for
 * skill, spell, invocation and psionic rolls, and the type itself otherwise
 * (such as `shock` or `dodge`).
 *
 * @param {string} [type]
 * @returns {string}
 */
export function rollName(type) {
    return String(type ?? "").replace(NAMED_TYPE, "");
}

/**
 * Returns the roll mode to use. Only a Public Roll for a listed name becomes
 * blind; every other mode is returned unchanged.
 *
 * @param {string} requestedMode The roll mode chosen in chat
 * @param {string} [name] The roll's name
 * @param {boolean} enabled Whether automatic blind rolls are on
 * @param {string} [list] Comma-separated roll names, compared case-insensitively
 * @returns {string}
 */
export function effectiveRollMode(requestedMode, name, enabled, list) {
    if (!enabled || requestedMode !== PUBLIC) return requestedMode;
    const wanted = String(name ?? "")
        .trim()
        .toLowerCase();
    if (!wanted) return requestedMode;
    const listed = String(list ?? "")
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    return listed.includes(wanted) ? BLIND : requestedMode;
}

/**
 * Applies the world settings to a roll's type, returning the roll mode for its
 * chat message.
 *
 * @param {string} [type] The roll's `type` value
 * @returns {string}
 */
export function chatRollMode(type) {
    return effectiveRollMode(
        game.settings.get("core", "rollMode"),
        rollName(type),
        game.settings.get("hm3", "autoBlindRolls"),
        game.settings.get("hm3", "autoBlindRollNames"),
    );
}
