import { onManageActiveEffect } from "../effect.js";
import * as utility from "../utility.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Extend the basic ItemSheetV2 with some very simple modifications
 * @extends {ItemSheetV2}
 */
export class HarnMasterItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    /**
     * `submitOnChange` / `closeOnSubmit` reproduce the AppV1 sheet defaults —
     * fields save as they are edited rather than on an explicit submit.
     */
    static DEFAULT_OPTIONS = {
        classes: ["hm3", "sheet", "item"],
        position: { width: 560, height: 550 },
        window: { resizable: true },
        form: { submitOnChange: true, closeOnSubmit: false },
    };

    /**
     * The union of the tabs the twelve item templates carry. A type whose
     * template omits one renders no element for it, which `changeTab` tolerates
     * because it only queries the elements that are there.
     */
    static TABS = {
        primary: {
            initial: "properties",
            tabs: [
                { id: "properties", label: "Properties" },
                { id: "description", label: "Description" },
                { id: "macro", label: "Macro" },
                { id: "effects", label: "Effects" },
            ],
        },
    };

    /**
     * One class serves every item type, so the template is resolved per render.
     * This is the AppV2 hook that replaces AppV1's `get template()`.
     * @override
     */
    _configureRenderParts(options) {
        return {
            sheet: {
                template: `systems/hm3/templates/item/${this.item.type}-sheet.html`,
                root: true,
            },
        };
    }

    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        const data = await super._prepareContext(options);

        // Re-define the template data references (backwards compatible)
        data.item = this.item;
        data.idata = this.item.system;
        data.config = CONFIG.HM3;
        data.itemType = this.item.type;
        data.hasActor = this.actor && true;
        data.hasCombatSkills = false;
        data.hasRitualSkills = false;
        data.hasMagicSkills = false;

        data.macroTypes = foundry.utils.deepClone(game.documentTypes.Macro);

        data.containers = { "On Person": "on-person" };
        // Containers are not allowed in other containers.  So if this item is a container,
        // don't show any other containers.

        if (this.actor && this.item.type !== "containergear") {
            this.actor.items.forEach((it) => {
                if (it.type === "containergear") {
                    data.containers[it.name] = it.id;
                }
            });
        }

        // Fill appropriate lists for individual item sheets
        if (this.item.type === "spell") {
            // Spells need a list of convocations
            data.convocations = [];
            if (this.actor) {
                this.actor.itemTypes.skill.forEach((it) => {
                    if (it.system.type === "Magic") {
                        data.convocations.push(it.name);
                        data.hasMagicSkills = true;
                    }
                });
            }
        } else if (this.item.type === "invocation") {
            // Invocations need a list of dieties
            data.dieties = [];
            if (this.actor) {
                this.actor.itemTypes.skill.forEach((it) => {
                    if (it.system.type === "Ritual") {
                        data.dieties.push(it.name);
                        data.hasRitualSkills = true;
                    }
                });
            }
        } else if (this.item.type === "weapongear" || this.item.type === "missilegear") {
            // Weapons need a list of combat skills
            data.combatSkills = [];

            if (this.actor) {
                if (this.item.type === "weapongear") {
                    // For weapons, we add a "None" item to the front of the list
                    // as a default (in case no other combat skill applies)
                    data.combatSkills.push("None");
                } else {
                    // For missiles, we add the "Throwing" skill to the front
                    // of the list as a default (in case no other combat
                    // skill applies)
                    data.combatSkills.push("Throwing");
                }

                this.actor.itemTypes.skill.forEach((it) => {
                    if (it.system.type === "Combat") {
                        const lcName = it.name.toLowerCase();
                        // Ignore the 'Dodge' and 'Initiative' skills,
                        // since you never want a weapon based on those skills.
                        if (!(lcName === "initiative" || lcName === "dodge")) {
                            data.combatSkills.push(it.name);
                            data.hasCombatSkills = true;
                        }
                    }
                });
            }
        }

        data.effects = {};
        this.item.effects.forEach((effect) => {
            effect._getSourceName().then(() => {
                data.effects[effect.id] = {
                    source: effect.sourceName,
                    duration: utility.aeDuration(effect),
                    data: effect,
                    changes: utility.aeChanges(effect),
                };
            });
        });

        return data;
    }

    /* -------------------------------------------- */

    /**
     * Bind the sheet's controls. They are identified by CSS class rather than by
     * `data-action`, so one delegated listener dispatches them all — see the
     * actor sheet for why the templates were left as they are.
     * @override
     */
    async _onRender(context, options) {
        await super._onRender(context, options);

        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) return;

        // Held per instance: _onRender runs on every render and `this.element`
        // persists, so a fresh `.bind()` would stack handlers rather than replace.
        this.#onClick ??= this.#dispatchClick.bind(this);
        this.#onKeypress ??= this.#dispatchKeypress.bind(this);
        this.element.addEventListener("click", this.#onClick);
        this.element.addEventListener("keypress", this.#onKeypress);
    }

    #onClick = null;
    #onKeypress = null;

    /** @param {PointerEvent} event */
    #dispatchClick(event) {
        // Select the whole value when entering a text field, as before.
        const text = event.target.closest("input[type='text']");
        if (text) text.select();

        const effectControl = event.target.closest(".effect-control");
        if (effectControl) {
            event.preventDefault();
            if (this.item.isOwned) {
                return ui.notifications.warn(
                    "You cannot change an Item's Effects after it is associated with an Actor. To modify this Effect, go to the Actor's Effects tab.",
                );
            }
            return onManageActiveEffect(event, this.item, effectControl);
        }

        const add = event.target.closest(".armorgear-location-add");
        if (add) {
            event.preventDefault();
            return this._armorgearLocationAdd(event, add);
        }

        const del = event.target.closest(".armorgear-location-delete");
        if (del) {
            event.preventDefault();
            return this._armorgearLocationDelete(event, del);
        }

        return null;
    }

    /** Enter closes the sheet from the properties tab, as it always has. */
    #dispatchKeypress(event) {
        if (event.key !== "Enter") return;
        if (!event.target.closest(".properties")) return;
        this.close();
    }

    async _armorgearLocationAdd(event, target) {
        const itemData = this.item.system;

        // Read the picker directly. It is transient UI state, not stored on the
        // item, and reading it now rather than from the last render is also what
        // makes the first click add the location actually selected.
        const location = target
            .closest(".armorgear-location")
            ?.querySelector(".armorgear-target-location")?.value;
        if (!location) return null;

        await this.submit(); // Submit any unsaved changes

        // Clone the existing locations list if it exists, otherwise set to empty array
        let locations = [];
        if (typeof itemData.locations != "undefined") {
            locations = [...itemData.locations];
        }

        // Only add location to list if it is unique
        if (locations.indexOf(location) === -1) {
            locations.push(location);
        }

        // Update the list on the server
        return this.item.update({ "system.locations": locations });
    }

    async _armorgearLocationDelete(event, target) {
        const dataset = target.dataset;
        const itemData = this.item.system;

        await this.submit(); // Submit any unsaved changes

        // Clone the location list (we don't want to touch the actual list)
        let locations = [...itemData.locations];

        // find the index of the item to remove, and if found remove it from list
        let removeIndex = locations.indexOf(dataset.location);
        if (removeIndex >= 0) {
            locations.splice(removeIndex, 1);
        }

        // Update the list on the server
        return this.item.update({ "system.locations": locations });
    }
}
