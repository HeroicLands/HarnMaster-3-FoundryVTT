import { HarnMasterActor } from "./actor.js";
//import { ImportArmorGear } from "../import-armor.js";
//import { ImportFFF } from "../import-char.js";
import * as utility from '../utility.js';
import * as macros from '../macros.js';
import { onManageActiveEffect } from '../effect.js';

const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ActorSheetV2} = foundry.applications.sheets;

/**
 * Extend the basic ActorSheetV2 with some common capabilities.
 *
 * Concrete sheets (character, creature, container) supply their own
 * `DEFAULT_OPTIONS` and `TEMPLATES`; everything else lives here.
 * @extends {ActorSheetV2}
 */
export class HarnMasterBaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    /**
     * ApplicationV2 merges `DEFAULT_OPTIONS` up the prototype chain, so a
     * subclass contributes only what it adds.
     *
     * `submitOnChange` / `closeOnSubmit` reproduce the AppV1 sheet defaults —
     * fields save as they are edited rather than on an explicit submit.
     */
    static DEFAULT_OPTIONS = {
        classes: ["hm3", "sheet", "actor"],
        window: {resizable: true},
        form: {submitOnChange: true, closeOnSubmit: false}
    };

    /**
     * The tab strip shared by every actor sheet. AppV2 owns tab state: the nav
     * anchors carry `data-action="tab"`, and `_prepareContext` hands the
     * prepared descriptors to the template as `tabs`.
     */
    static TABS = {
        primary: {
            initial: "facade",
            tabs: [
                {id: "facade", label: "Fa\u00e7ade"},
                {id: "profile", label: "Profile"},
                {id: "skills", label: "Skills"},
                {id: "combat", label: "Combat"},
                {id: "esoteric", label: "Esoterics"},
                {id: "inventory", label: "Gear"},
                {id: "macro", label: "Macro"},
                {id: "effects", label: "Effects"}
            ]
        }
    };

    /**
     * The full and limited templates for this sheet, supplied by the subclass.
     * @type {{full: string, limited: string}}
     */
    static TEMPLATES = {full: "", limited: ""};

    /**
     * Choose the template at render time. AppV1 did this with a `get template()`
     * that swapped in the limited view; `PARTS` is static, so the equivalent
     * hook is this one.
     * @override
     */
    _configureRenderParts(options) {
        const templates = this.constructor.TEMPLATES;
        const limited = !game.user.isGM && this.document.limited;
        return {sheet: {template: limited ? templates.limited : templates.full, root: true}};
    }

    /**
     * A drag source of `.item-list .item`, which is what the AppV1 ActorSheet
     * used and what these templates are marked up for. ActorSheetV2 defaults to
     * `.draggable`, which appears nowhere in them, so without this override
     * nothing on the sheet can be dragged.
     * @override
     */
    get _dragDrop() {
        return this.#dragDrop ??= new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".item-list .item",
            permissions: {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this)
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this)
            }
        });
    }

    #dragDrop = null;

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const isOwner = this.document.isOwner;
        const data = Object.assign(context, {
            owner: isOwner,
            limited: this.document.limited,
            options: this.options,
            editable: this.isEditable,
            cssClass: isOwner ? "editable" : "locked",
            isCharacter: this.document.type === "character",
            isCreature: this.document.type === "creature",
            isContainer: this.document.type === "container",
            config: CONFIG.HM3
        });

        data.customSunSign = game.settings.get('hm3', 'customSunSign');
        data.actor = foundry.utils.deepClone(this.actor);
        data.items = this.actor.items.map(i => {
            //i.data.labels = i.labels;
            return i;
        });
        data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        data.adata = data.actor.system;
        data.labels = this.actor.labels || {};
        data.filters = this._filters;
        
        data.macroTypes = foundry.utils.deepClone(game.documentTypes.Macro);
    
        data.dtypes = ["String", "Number", "Boolean"];
        let capacityMax = 0;
        let capacityVal = 0;
        if (this.actor.type === 'character') {
            capacityMax = data.adata.endurance * 10;
            if (data.adata.eph) {
                capacityVal = data.adata.eph.totalGearWeight;
            }
        } else if (this.actor.type === 'creature') {
            capacityMax = data.adata.loadRating + (data.adata.endurance * 10);
            if (data.adata.eph) {
                capacityVal = data.adata.eph.totalGearWeight;
            }
        } else if (this.actor.type === 'container') {
            capacityMax = data.adata.capacity.max;
            capacityVal = data.adata.capacity.value;
        }

        // Setup the fake container entry for "On Person" container
        data.containers = {
            'on-person': {
                "name": "On Person",
                "type": "containergear",
                "system": {
                    "container": "on-person",
                    "capacity": {
                        "max": capacityMax,
                        "value": capacityVal
                    }
                }
            }
        };

        this.actor.items.forEach(it => {
            if (it.type === 'containergear') {
                data.containers[it.id] = it;
            }
        });

        data.gearTypes = {
            'armorgear': 'Armor',
            'weapongear': 'Melee Wpn',
            'missilegear': 'Missile Wpn',
            'miscgear': 'Misc. Gear',
            'containergear': 'Container'
        };

        // get active effects.
        data.effects = {};
        this.actor.effects.forEach(effect => {
            effect._getSourceName().then(() => {
                data.effects[effect.id] = {
                    'id': effect.id,
                    'label': effect.name,
                    'sourceName': effect.sourceName,
                    'duration': utility.aeDuration(effect),
                    'source': effect,
                    'changes': utility.aeChanges(effect)
                }
                data.effects[effect.id].disabled = effect.disabled;
            });
        });

        return data;
    }

    /**
     * @override
     * AppV2 hands over the resolved Item document; AppV1 passed its data object.
     */
    _onSortItem(event, item) {

        // TODO - for now, don't allow sorting for Synthetic Actors
        if (this.actor.isToken) return;

        if (!item.type.endsWith('gear')) return super._onSortItem(event, item);

        // Get the drag source and its siblings
        const source = this.actor.items.get(item.id);
        const siblings = this.actor.items.filter(i => {
            return (i.type.endsWith('gear') && 
                (i.id !== source.id));
        });

        // Get the drop target
        const dropTarget = event.target.closest(".item");
        const targetId = dropTarget ? dropTarget.dataset.itemId : null;
        const target = siblings.find(s => s.id === targetId);

        // Ensure we are only sorting like-types
        if (target && !target.type.endsWith('gear')) return;

        // Perform the sort
        const sortUpdates = foundry.utils.performIntegerSort(source, { target: target, siblings });
        const updateData = sortUpdates.map(u => {
            const update = u.update;
            update._id = u.target._id;
            return update;
        });

        // Perform the update
        return this.actor.updateEmbeddedDocuments("Item", updateData);
    }

    /**
     * @override
     * AppV2 resolves the drop for us and hands over the Item document, where
     * AppV1 passed raw drop data for the sheet to resolve itself.
     */
    async _onDropItem(event, droppedItem) {
        if (!this.actor.isOwner) return false;

        // Check if coming from a compendium pack
        if (droppedItem.pack) {
            return super._onDropItem(event, droppedItem)
        }

        // Skills, spells, etc. (non-gear)
        if (!droppedItem.type.endsWith("gear")) {
            return this._onDropItemCreate(droppedItem.toObject());
        }

        // Gear coming from world items list
        if (!droppedItem.parent) {
            return super._onDropItem(event, droppedItem);
        }

        // At this point we know the item is some sort of gear, and coming from an actor

        // Destination containerid: set to 'on-person' if a containerid can't be found
        const closestContainer = event.target.closest('[data-container-id]');
        const destContainer = closestContainer?.dataset.containerId ? closestContainer.dataset.containerId : 'on-person';

        // Dropping an item into the same actor (Token or Linked)
        if ((droppedItem.parent.isToken && this.actor.token?.id === droppedItem.parent.token.id) ||
            (!droppedItem.parent.isToken && !this.actor.isToken && droppedItem.parent.id === this.actor.id)) {
            // If the item is some type of gear (other than containergear), then
            // make sure we set the container to the same as the dropped location
            // (this allows people to move items into containers easily)
            if (droppedItem.type.endsWith('gear') && droppedItem.type !== 'containergear') {
                if (droppedItem.system.container !== destContainer) {
                    await droppedItem.update({'system.container': destContainer });
                }
            }

            return super._onDropItem(event, droppedItem);
        }

        // At this point we know this dropped item is Gear coming from an actor,

        // Containers are a special case, and they need to be processed specially
        if (droppedItem.type === 'containergear') return await this._moveContainer(event, droppedItem);

        // Set the destination container to the closest drop containerid
        droppedItem.system.container = destContainer;

        const quantity = droppedItem.system.quantity;

        // Source quantity really should never be 0 or negative; if so, just decline
        // the drop request.
        if (quantity <= 0) return false;

        if (quantity > 1) {
            // Ask how many to move
            return await this._moveQtyDialog(event, droppedItem);
        } else {
            return await this._moveItems(droppedItem, 1);
        }
    }

    async _moveContainer(event, item) {
        // create new container

        if (!item.parent) {
            ui.notifications.warn(`Error accessing actor where container is coming from, move aborted`);
            throw Error(`Error accessing actor where container is coming from, move aborted`);
        }

        let itData = item.toObject();
        delete itData._id;
        const containerResult = await Item.create(itData, {parent: this.actor});
        if (!containerResult) {
            ui.notifications.warn(`Error while moving container, move aborted`);
            return null;
        }

        // move all items into new container
        let failure = false;
        for (let it of item.parent.items.values()) {
            if (!failure && it.system.container === item.id) {
                itData = it.toObject();
                delete itData._id;
                itData.system.container = containerResult.id;
                const result = await Item.create(itData, {parent: this.actor});
                if (result) {
                    await Item.deleteDocuments([it.id], {parent: item.parent});
                } else {
                    failure = true;
                }
            }
        }

        if (failure) {
            ui.notifications.error(`Error duing move of items from source to destination, container has been only partially moved!`);
            return null;
        }

        // delete old container
        await Item.deleteDocuments([item.id], {parent: item.parent});
        return containerResult;
    }

    async _moveQtyDialog(event, item) {
        // Get source actor
        if (!item.parent) {
            ui.notifications.warn(`Error accessing actor where container is coming from, move aborted`);
            throw Error(`Error accessing actor where container is coming from, move aborted`);
        }

        // Render modal dialog
        let dlgTemplate = "systems/hm3/templates/dialog/item-qty.html";
        let dialogData = {
            itemName: item.name,
            sourceName: item.parent.name,
            targetName: this.actor.name,
            maxItems: item.system.quantity,
        };

        const dlghtml = await foundry.applications.handlebars.renderTemplate(dlgTemplate, dialogData);

        // Create the dialog window
        return foundry.applications.api.DialogV2.prompt({
            window: {title: "Move Items"},
            content: dlghtml,
            ok: {
                label: "OK",
                callback: async (event, button) => {
                    const formdata = new FormDataExtended(button.form).object;
                    const formQtyToMove = parseInt(formdata.itemstomove);

                    if (formQtyToMove <= 0) {
                        return false;
                    } else {
                        return await this._moveItems(item, formQtyToMove);
                    }
                }
            }
        });
    }

    async _moveItems(item, moveQuantity) {
        const sourceName = item.name;
        const sourceType = item.type;
        const sourceQuantity = item.system.quantity;

        if (!item.parent) {
            ui.notifications.warn(`Error accessing actor where container is coming from, move aborted`);
            return null;
        }

        // Look for a similar item locally
        let result = this.actor.items.find(it => it.type === sourceType && it.name === sourceName);

        if (result) {
            // update quantity
            const newTargetQuantity = result.system.quantity + moveQuantity;
            await result.update({ 'system.quantity': newTargetQuantity });
        } else {
            // Create an item
            const itData = item.toObject();
            delete itData._id;

            itData.system.quantity = moveQuantity;
            itData.system.container = 'on-person';
            result = await Item.create(itData, {parent: this.actor});
        }

        if (result) {
            if (moveQuantity >= sourceQuantity) {
                await Item.deleteDocuments([item.id], {parent: item.parent});
            } else {
                const newSourceQuantity = sourceQuantity - moveQuantity;
                await item.update({ 'system.quantity': newSourceQuantity });
            }
        }
        return result;
    }

    /**
     * Create a non-gear item dropped onto this actor, merging it into an
     * existing item of the same type and name where there is one.
     *
     * AppV1 called this from its own `_onDropItem`; AppV2 has no such hook, so
     * `_onDropItem` above calls it directly.
     */
    async _onDropItemCreate(itemData) {
        const actor = this.actor;
        if (!actor.isOwner) return false;

        if (!itemData.type.endsWith("gear")) {
            if (actor.type === 'container') {
                ui.notifications.warn(`You may only place physical objects in a container; drop of ${itemData.name} refused.`);
                return false;
            }

            actor.items.forEach(it => {
                // Generally, if the items have the same type and name,
                // then merge the dropped item onto the existing item.
                if (it.type === itemData.type && it.name === itemData.name) {
                    this.mergeItem(it, itemData);

                    // Don't actually allow the new item
                    // to be created.
                    return false;
                }
            });

            return Item.create(itemData, {parent: this.actor});
        }

        return Item.create(itemData, {parent: this.actor});
    }


    /**
     * Controls in these templates are identified by CSS class, not by
     * `data-action` — that attribute already carries HM3's own meaning on the
     * effect controls. So rather than rewrite 281 elements across 13 templates,
     * the sheet delegates from its root and dispatches through this table.
     *
     * Each handler is called with `(event, target)`, where `target` is the
     * matched control — the delegated listener's `currentTarget` is the sheet
     * root, so handlers cannot read it themselves.
     *
     * @returns {Record<string, (event: PointerEvent, target: HTMLElement) => any>}
     * @protected
     */
    _clickHandlers() {
        const actor = this.actor;
        const itemOf = target => actor.items.get(target.closest(".item")?.dataset.itemId);
        const fastForward = ev => ev.shiftKey || ev.altKey || ev.ctrlKey;

        /**
         * Resolve the token to attack from. A synthetic actor has one; a linked
         * actor needs exactly one token on the canvas to be unambiguous.
         */
        const attackToken = () => {
            let token = actor.token;
            if (token) return token;
            const tokens = actor.getActiveTokens(true);
            if (tokens.length === 0) {
                ui.notifications.warn(`There are no tokens linked to this actor on the canvas, double-click on a specific token on the canvas.`);
                return null;
            } else if (tokens.length > 1) {
                ui.notifications.warn(`There are ${tokens.length} tokens linked to this actor on the canvas, so the attacking token can't be identified.`);
                return null;
            }
            return tokens[0];
        };

        return {
            ".item-create": (ev, target) => this._onItemCreate(ev, target),
            ".item-edit": (ev, target) => itemOf(target)?.sheet.render(true),
            ".item-delete": (ev, target) => this._onItemDelete(ev, target),
            ".item-dumpdesc": (ev, target) => this._onDumpEsotericDescription(ev, target),
            ".effect-control": (ev, target) => onManageActiveEffect(ev, this.document, target),

            ".skill-roll": (ev, target) => macros.skillRoll(itemOf(target)?.uuid, fastForward(ev), actor),
            ".spell-roll": (ev, target) => macros.castSpellRoll(itemOf(target)?.uuid, fastForward(ev), actor),
            ".invocation-roll": (ev, target) => macros.invokeRitualRoll(itemOf(target)?.uuid, fastForward(ev), actor),
            ".psionic-roll": (ev, target) => macros.usePsionicRoll(itemOf(target)?.uuid, fastForward(ev), actor),

            ".ability-d6-roll": (ev, target) => macros.testAbilityD6Roll(target.dataset.ability, fastForward(ev), actor),
            ".ability-d100-roll": (ev, target) => macros.testAbilityD100Roll(target.dataset.ability, fastForward(ev), actor),

            ".weapon-damage-roll": (ev, target) => macros.weaponDamageRoll(itemOf(target)?.uuid, target.dataset.aspect, actor),
            ".missile-damage-roll": (ev, target) => macros.missileDamageRoll(itemOf(target)?.uuid, target.dataset.range, actor),

            ".melee-weapon-attack": (ev, target) => {
                const token = attackToken();
                if (token) macros.weaponAttack(itemOf(target)?.uuid, false, token);
            },
            ".missile-weapon-attack": (ev, target) => {
                const token = attackToken();
                if (token) macros.missileAttack(itemOf(target)?.uuid, false, token);
            },

            ".weapon-attack-roll": (ev, target) => macros.weaponAttackRoll(itemOf(target)?.uuid, fastForward(ev), actor),
            ".weapon-defend-roll": (ev, target) => macros.weaponDefendRoll(itemOf(target)?.uuid, fastForward(ev), actor),
            ".missile-attack-roll": (ev, target) => macros.missileAttackRoll(itemOf(target)?.uuid, actor),

            ".injury-roll": () => macros.injuryRoll(actor),
            ".healing-roll": (ev, target) => macros.healingRoll(itemOf(target)?.uuid, fastForward(ev), actor),
            ".dodge-roll": ev => macros.dodgeRoll(fastForward(ev), actor),
            ".shock-roll": ev => macros.shockRoll(fastForward(ev), actor),
            ".stumble-roll": ev => macros.stumbleRoll(fastForward(ev), actor),
            ".fumble-roll": ev => macros.fumbleRoll(fastForward(ev), actor),
            ".damage-roll": () => macros.genericDamageRoll(actor),

            ".item-carry": (ev, target) => this._onToggleCarry(ev, target),
            ".item-equip": (ev, target) => this._onToggleEquip(ev, target),
            ".item-improve": (ev, target) => this._onToggleImprove(ev, target),
            ".more-info": (ev, target) => this._onMoreInfo(ev, target)
        };
    }

    /**
     * The name filters, keyed by the class of the input that drives them: the
     * rows to filter, and the attribute holding each row's name.
     * @type {Record<string, {rows: string, attr: string}>}
     */
    static FILTERS = {
        ".skill-name-filter": {rows: ".skill-item", attr: "data-item-name"},
        ".gear-name-filter": {rows: ".gear-item", attr: "data-item-name"},
        ".effects-name-filter": {rows: ".effect", attr: "data-effect-name"}
    };

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);

        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) return;

        // Hold one bound reference per instance. _onRender runs on every render
        // and `this.element` persists, so a fresh `.bind()` each time would
        // stack handlers rather than replace them.
        this.#onClick ??= this.#dispatchClick.bind(this);
        this.#onKeyup ??= this.#dispatchKeyup.bind(this);
        this.element.addEventListener("click", this.#onClick);
        this.element.addEventListener("keyup", this.#onKeyup);
    }

    #onClick = null;
    #onKeyup = null;

    /**
     * Route a click to the first handler whose selector matches an ancestor of
     * the clicked node.
     * @param {PointerEvent} event
     */
    #dispatchClick(event) {
        // Select the whole value when entering a text field, as before.
        const text = event.target.closest("input[type='text']");
        if (text) text.select();

        const handlers = this._clickHandlers();
        for (const [selector, handler] of Object.entries(handlers)) {
            const target = event.target.closest(selector);
            if (!target) continue;
            event.preventDefault();
            return handler(event, target);
        }
        return null;
    }

    /**
     * Apply a name filter as it is typed.
     * @param {KeyboardEvent} event
     */
    #dispatchKeyup(event) {
        for (const [selector, {rows, attr}] of Object.entries(this.constructor.FILTERS)) {
            const input = event.target.closest(selector);
            if (!input) continue;
            const filter = (input.value || "").toLowerCase();
            for (const row of this.element.querySelectorAll(rows)) {
                const name = (row.getAttribute(attr) || "").toLowerCase();
                row.style.display = !filter || name.includes(filter) ? "" : "none";
            }
            return;
        }
    }

    /* -------------------------------------------- */

    async _onItemDelete(event, target) {
        event.preventDefault();
        const data = foundry.utils.deepClone(target.dataset);
        const itemId = target.closest(".item")?.dataset.itemId;
        if (itemId) {
            const item = this.actor.items.get(itemId);
            if (!item) {
                console.error(`HM3 | Delete aborted, item ${itemId} in actor ${this.actor.name} was not found.`);
                return;
            }

            let title = `Delete ${data.label}`;
            let content;
            if (item.type === 'containergear') {
                title = 'Delete Container';
                content = '<p>WARNING: All items in this container will be deleted as well!</p><p>Are you sure?</p>';
            } else {
                content = '<p>Are you sure?</p>';
            }

            // Create the dialog window
            const agree = await foundry.applications.api.DialogV2.confirm({
                window: {title},
                content: content
            });

            if (agree) {
                const deleteItems = [];

                // Add all items in the container to the delete list
                if (item.type === 'containergear') {
                    this.actor.items.forEach(it => {
                        if (it.type.endsWith('gear') && it.system.container === itemId) deleteItems.push(it.id);
                    });
                }

                deleteItems.push(itemId);  // ensure we delete the container last

                await Item.deleteDocuments(deleteItems, {parent: this.actor});
                this.render(false);
            }
        }
    }

    async mergeItem(item, other) {
        if (item.type != other.type) {
            return;
        }

        const data = item.system;
        const otherData = other.system;
        const updateData = {};

        if (!data.notes) updateData['system.notes'] = otherData.notes;
        if (!data.source) updateData['system.source'] = otherData.source;
        if (!data.description) updateData['system.description'] = otherData.description;
        if (!data.macros.type || data.macros.type !== otherData.macros.type) updateData['system.macros.type'] = otherData.macros.type;
        if (!data.macros.command) updateData['system.macros.command'] = otherData.macros.command;
        updateData['img'] = other.img;

        switch (item.type) {
            case 'skill':
                // If the skill types don't match, return without change
                if (data.type != otherData.type) {
                    return;
                }

                // NOTE: We never copy over the skillbase value or
                // the Piety value, those must always be set in the
                // actor's sheet.

                // If the skillbase is blank, copy it over from dropped item
                if (!data.skillBase.formula) {
                    updateData['system.skillBase.formula'] = otherData.skillBase.formula;
                    updateData['system.skillBase.isFormulaValid'] = otherData.skillBase.isFormulaValid;
                }
                break;

            case 'spell':
                updateData['system.convocation'] = otherData.convocation;
                updateData['system.level'] = otherData.level;
                break;

            case 'invocation':
                updateData['system.diety'] = otherData.diety;
                updateData['system.circle'] = otherData.circle;
                break;

            case 'psionic':
                // If the skillbase is blank, copy it over from dropped item
                if (!data.skillBase.formula) {
                    updateData['system.skillBase.formula'] = otherData.skillBase.formula;
                    updateData['system.skillBase.isFormulaValid'] = otherData.skillBase.isFormulaValid;
                }
                updateData['system.fatigue'] = otherData.fatigue;
                break;
        }

        await item.update(updateData);

        return;
    }

    async _onItemCreate(event, target) {
        event.preventDefault();
        // Grab any data associated with this control.
        const dataset = foundry.utils.deepClone(target.dataset);

        let extraList = [];
        let extraLabel = null;

        let name;

        // Ask type
        // Initialize a default name.
        if (dataset.type === 'skill' && dataset.skilltype) {
            name = utility.createUniqueName(`New ${dataset.skilltype} Skill`, this.actor.itemTypes.skill);
        } else if (dataset.type == 'trait' && dataset.traittype) {
            name = utility.createUniqueName(`New ${dataset.traittype} Trait`, this.actor.itemTypes.trait);
        } else if (dataset.type.endsWith('gear')) {
            name = "New Gear";
            extraList = ['Misc. Gear', 'Armor', 'Melee Weapon', 'Missile Weapon', 'Container'];
            extraLabel = 'Gear Type';
        } else {
            switch (dataset.type) {
                case "armorlocation":
                    name = utility.createUniqueName('New Location', this.actor.itemTypes.armorlocation);
                    break;

                case "injury":
                    name = utility.createUniqueName('New Injury', this.actor.itemTypes.injury);
                    break;

                case "spell":
                    name = utility.createUniqueName('New Spell', this.actor.itemTypes.spell);
                    break;

                case "invocation":
                    name = utility.createUniqueName('New Invocation', this.actor.itemTypes.invocation);
                    break;

                case "psionic":
                    name = utility.createUniqueName('New Psionic', this.actor.itemTypes.psionic);
                    break;

                default:
                    console.error(`HM3 | Can't create item: unknown item type '${dataset.type}'`);
                    return null;
            }

        }

        // Render modal dialog
        let dlgTemplate = "systems/hm3/templates/dialog/create-item.html";
        let dialogData = {
            type: dataset.type,
            title: name,
            placeholder: name,
            extraList: extraList,
            extraLabel: extraLabel,
        };

        const dlghtml = await foundry.applications.handlebars.renderTemplate(dlgTemplate, dialogData);

        // Create the dialog window
        return foundry.applications.api.DialogV2.prompt({
            window: {title: dialogData.title},
            content: dlghtml,
            ok: {
            label: "Create",
            callback: async (event, button) => {
                const formdata = new FormDataExtended(button.form).object;
                let itemName = formdata.name;
                let extraValue = formdata.extra_value;

                const updateData = {name: itemName, type: dataset.type};
                if (dataset.type === 'gear') {
                    if (extraValue === 'Container') updateData.type = 'containergear';
                    else if (extraValue === 'Armor') updateData.type = 'armorgear';
                    else if (extraValue === 'Melee Weapon') updateData.type = 'weapongear';
                    else if (extraValue === 'Missile Weapon') updateData.type = 'missilegear';
                    else updateData.type = 'miscgear';
                }

                // Item Data
                if (dataset.type === 'skill') updateData['system.type'] = dataset.skilltype;
                else if (dataset.type === 'trait') updateData['system.type'] = dataset.traittype;
                else if (dataset.type.endsWith('gear')) updateData['system.container'] = dataset.containerId;
                else if (dataset.type === 'spell') updateData['system.convocation'] = extraValue;
                else if (dataset.type === 'invocation') updateData['system.diety'] = extraValue;

                // Finally, create the item!
                const result = await Item.create(updateData, {parent: this.actor });

                if (!result) {
                    throw new Error(`Error creating item '${updateData.name}' of type '${updateData.type}' on character '${this.actor.name}'`);
                }

                // Bring up edit dialog to complete creating item
                const item = this.actor.items.get(result.id);
                item.sheet.render(true);

                return result;
            }
            }
        });
    }

    /**
     * Handle toggling the carry state of an Owned Item within the Actor
     * @param {Event} event   The triggering click event
     * @private
     */
    _onToggleCarry(event, target) {
        event.preventDefault();
        const itemId = target.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);

        // Only process inventory ("gear") items, otherwise ignore
        if (item.type.endsWith('gear')) {
            const attr = "system.isCarried";
            return item.update({ [attr]: !foundry.utils.getProperty(item, attr) });
        }

        return null;
    }

    /**
     * Handle toggling the carry state of an Owned Item within the Actor
     * @param {Event} event   The triggering click event
     * @private
     */
    _onToggleEquip(event, target) {
        event.preventDefault();
        const itemId = target.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);

        // Only process inventory ("gear") items, otherwise ignore
        if (item.type.endsWith('gear')) {
            const attr = "system.isEquipped";
            return item.update({ [attr]: !foundry.utils.getProperty(item, attr) });
        }

        return null;
    }

    /**
     * Handle toggling the improve state of an Owned Item within the Actor
     * @param {Event} event   The triggering click event
     * @private
     */
    _onToggleImprove(event, target) {
        event.preventDefault();
        const itemId = target.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);

        // Only process skills and psionics, otherwise ignore
        if (item.type === 'skill' || item.type === 'psionic') {
            if (!item.system.improveFlag) {
                return item.update({ "system.improveFlag": true });
            } else {
                return this._improveToggleDialog(item);
            }
        }

        return null;
    }

    async _onMoreInfo(event, target) {
        event.preventDefault();
        const journalEntry = target.dataset.journalEntry;

        const helpJournal = await game.packs.find(p => p.collection === `hm3.system-help`).getDocuments();
        const article = helpJournal.find(i => i.name === journalEntry);
        //const article = game.journal.getName(journalEntry);
        if (!article) {
            console.error(`HM3 | Can't find journal entry with name "${journalEntry}".`);
            return null;
        }
        article.sheet.render({force: true});
        return null;
    }

    _improveToggleDialog(item) {
        const dlghtml = '<p>Do you want to perform a Skill Development Roll (SDR), or just disable the flag?</p>'

        // Create the dialog window. DialogV2.wait resolves to the pressed
        // button's callback value, or null if the dialog was dismissed.
        return foundry.applications.api.DialogV2.wait({
            window: {title: 'Skill Development Toggle'},
            content: dlghtml.trim(),
            buttons: [
                {
                    action: "performSDR",
                    label: "Perform SDR",
                    default: true,
                    callback: async () => HarnMasterActor.skillDevRoll(item)
                },
                {
                    action: "disableFlag",
                    label: "Disable Flag",
                    callback: async () => item.update({ "system.improveFlag": false })
                }
            ]
        });
    }

    async _onDumpEsotericDescription(event, target) {
        event.preventDefault();
        const itemId = target.closest(".item")?.dataset.itemId;

        if (itemId) {
            const item = this.actor.items.get(itemId);
            if (!item) {
                return;
            }

            const itemData = item.system;

            if (['spell', 'invocation', 'psionic'].includes(item.type)) {
                const chatData = {
                    name: item.name,
                    desc: itemData.description,
                    notes: itemData.notes || null,
                    fatigue: item.type === 'psionic' ? itemData.fatigue : null
                };

                if (item.type === 'spell') {
                    chatData.level = utility.romanize(itemData.level);
                    chatData.title = `${itemData.convocation} Spell`;
                } else if (item.type === 'invocation') {
                    chatData.level = utility.romanize(itemData.circle);
                    chatData.title = `${itemData.diety} Invocation`;
                } else if (item.type === 'psionic') {
                    chatData.level = `F${itemData.fatigue}`;
                    chatData.title = `Psionic Talent`;
                }

                const chatTemplate = 'systems/hm3/templates/chat/esoteric-desc-card.html';

                const html = await foundry.applications.handlebars.renderTemplate(chatTemplate, chatData);

                const messageData = {
                    author: game.user.id,
                    speaker: ChatMessage.getSpeaker(),
                    content: html.trim(),
                    style: CONST.CHAT_MESSAGE_STYLES.OTHER
                };

                // Create a chat message
                return ChatMessage.create(messageData);
            }
        }
    }
}
