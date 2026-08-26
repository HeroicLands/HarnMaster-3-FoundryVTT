// Loaded before every spec.
import "./commands.js";

/**
 * Ignore async exceptions thrown by Foundry's own canvas rendering in the
 * headless browser, which has no real viewport.
 *
 * Kept to an explicit allowlist of message fragments so that any *other*
 * uncaught error still fails the spec — the point of this suite is to catch
 * errors the v14 work might have introduced, and a blanket
 * `return false` would hide exactly those.
 *
 * @type {string[]}
 */
const IGNORED = [
    // The token layer and its render flags are absent without a viewport;
    // placing or moving a token throws out of a PIXI ticker callback.
    "Cannot read properties of undefined (reading 'OBJECTS')",
    "Cannot read properties of null (reading 'addChild')",
];

Cypress.on("uncaught:exception", (err) => {
    if (IGNORED.some((fragment) => err.message.includes(fragment))) return false;
    return true;
});
