import { HarnMasterBaseActorSheet } from "./base-actor-sheet.js";

/**
 * Extend the base HarnMasterBaseActorSheet with some very simple modifications
 * @extends {HarnMasterBaseActorSheet}
 */
export class HarnMasterCreatureSheet extends HarnMasterBaseActorSheet {

    /**
     * ApplicationV2 merges DEFAULT_OPTIONS up the prototype chain, so this only
     * contributes what it adds to the base sheet's.
     * @override
     */
    static DEFAULT_OPTIONS = {
        classes: ["creature"],
        position: { width: 780, height: 640 }
    };

    /**
     * The base sheet's `_configureRenderParts` chooses between these according
     * to whether the viewer only has limited permission.
     * @override
     */
    static TEMPLATES = {
        full: "systems/hm3/templates/actor/creature-sheet.html",
        limited: "systems/hm3/templates/actor/creature-limited.html"
    };
}
