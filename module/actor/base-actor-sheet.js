import { HarnMasterActor } from "./actor.js";
//import { ImportArmorGear } from "../import-armor.js";
//import { ImportFFF } from "../import-char.js";
import * as utility from '../utility.js';
import * as macros from '../macros.js';
import { onManageActiveEffect } from '../effect.js';

/**
 * Extend the basic ActorSheet with some common capabilities
 * @extends {ActorSheet}
 */
export class HarnMasterBaseActorSheet extends ActorSheet {

    /** @override */
    getData() {
        let isOwner = this.document.isOwner;
        const data = {
            owner: isOwner,
            limited: this.document.limited,
            options: this.options,
            editable: this.isEditable,
            cssClass: isOwner ? "editable" : "locked",
            isCharacter: this.document.type === "character",
            isCreature: this.document.type === "creature",
            isContainer: this.document.type === "container",
            config: CONFIG.HM3
        }

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
        
        data.macroTypes = foundry.utils.deepClone(game.system.documentTypes.Macro);
    
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
                    'label': effect.label,
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

    /** @override */
    _onSortItem(event, itemData) {

        // TODO - for now, don't allow sorting for Synthetic Actors
        if (this.actor.isToken) return;

        if (!itemData.type.endsWith('gear')) return super._onSortItem(event, itemData);

        // Get the drag source and its siblings
        const source = this.actor.items.get(itemData._id);
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
        const sortUpdates = SortingHelpers.performIntegerSort(source, { target: target, siblings });
        const updateData = sortUpdates.map(u => {
            const update = u.update;
            update._id = u.target._id;
            return update;
        });

        // Perform the update
        return this.actor.updateEmbeddedDocuments("Item", updateData);
    }

    /** @override */
    async _onDropItem(event, data) {
        if (!this.actor.isOwner) return false;

        const droppedItem = await Item.fromDropData(data);

        // Check if coming from a compendium pack
        if (droppedItem.pack) {
            return super._onDropItem(event, data)
        }

        // Skills, spells, etc. (non-gear)
        if (!droppedItem.type.endsWith("gear")) {
            return super._onDropItem(event, data);
        }

        // Gear coming from world items list
        if (!droppedItem.parent) {
            return super._onDropItem(event, data);
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

            return super._onDropItem(event, data);
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

        let itData = item.toObject;
        delete itData._id;
        const containerResult = await Item.create(itData, {parent: this.actor});
        if (!containerResult) {
            ui.notifications.warn(`Error while moving container, move aborted`);
            return null;
        }

        // move all items into new container
        let failure = false;
        for (let it of item.parent.items.values()) {
            if (!failure && it.system.container === data.id) {
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
        await Item.deleteDocuments([data._id], {parent: item.parent});
        return containerResult;
    }

    async _moveQtyDialog(event, item) {
        // Get source actor
        if (!item.parent) {
            ui.notifications.warn(`Error accessing actor where container is coming from, move aborted`);
            throw Error(`Error accessing actor where container is coming from, move aborted`);
        }

        // Render modal dialog
        let dlgTemplate = "systems/hmk/templates/dialog/item-qty.html";
        let dialogData = {
            itemName: item.name,
            sourceName: item.parent.name,
            targetName: this.actor.name,
            maxItems: item.system.quantity,
        };

        const dlghtml = await renderTemplate(dlgTemplate, dialogData);

        // Create the dialog window
        return Dialog.prompt({
            title: "Move Items",
            content: dlghtml,
            label: "OK",
            callback: async (html) => {
                const form = html.querySelector('#items-to-move');
                const fd = new FormDataExtended(form);
                const formdata = fd.toObject();
                let formQtyToMove = parseInt(formdata.itemstomove);

                if (formQtyToMove <= 0) {
                    return false;
                } else {
                    return await this._moveItems(item, formQtyToMove);
                }
            },
            options: { jQuery: false }
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

    /** @override */
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

        return super._onDropItemCreate(itemData);
    }


    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Add Inventory Item
        html.find('.item-create').click(this._onItemCreate.bind(this));

        // Update Inventory Item
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            item.sheet.render(true);
        });

        // Delete Inventory Item
        html.find('.item-delete').click(this._onItemDelete.bind(this));

        // Dump Esoteric Description to Chat
        html.find('.item-dumpdesc').click(this._onDumpEsotericDescription.bind(this));

        // Active Effect management
        html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.document));

        // Ensure all text is selected when entering text input field
        html.on("click", "input[type='text']", ev => {
            ev.currentTarget.select();
        });

        // Filter on name for Skills
        html.on("keyup", ".skill-name-filter", ev => {
            this.skillNameFilter = $(ev.currentTarget).val();
            const lcSkillNameFilter = this.skillNameFilter.toLowerCase();
            let skills = html.find('.skill-item');
            for (let skill of skills) {
                const skillName = skill.getAttribute('data-item-name');
                if (lcSkillNameFilter) {
                    if (skillName.toLowerCase().includes(lcSkillNameFilter)) {
                        $(skill).show()
                    } else {
                        $(skill).hide()
                    }
                } else {
                    $(skill).show();
                }
            }
        });

        // Filter on name for gear
        html.on("keyup", ".gear-name-filter", ev => {
            this.gearNameFilter = $(ev.currentTarget).val();
            const lcGearNameFilter = this.gearNameFilter.toLowerCase();
            let gearItems = html.find('.gear-item');
            for (let gear of gearItems) {
                const gearName = gear.getAttribute('data-item-name');
                if (lcGearNameFilter) {
                    if (gearName.toLowerCase().includes(lcGearNameFilter)) {
                        $(gear).show()
                    } else {
                        $(gear).hide()
                    }
                } else {
                    $(gear).show();
                }
            }
        });

        // Filter on name for effects
        html.on("keyup", ".effects-name-filter", ev => {
            this.effectsNameFilter = $(ev.currentTarget).val();
            const lcEffectsNameFilter = this.effectsNameFilter.toLowerCase();
            let effectItems = html.find('.effect');
            for (let effect of effectItems) {
                const effectName = effect.getAttribute('data-effect-name');
                if (lcEffectsNameFilter) {
                    if (effectName.toLowerCase().includes(lcEffectsNameFilter)) {
                        $(effect).show()
                    } else {
                        $(effect).hide()
                    }
                } else {
                    $(effect).show();
                }
            }
        });

        // Standard 1d100 Skill Roll
        html.find('.skill-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            const item = this.actor.items.get(li.data("itemId"));
            macros.skillRoll(item?.uuid, fastforward, this.actor);
        });

        // Standard 1d100 Spell Casting Roll
        html.find('.spell-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            const item = this.actor.items.get(li.data("itemId"));
            macros.castSpellRoll(item?.uuid, fastforward, this.actor);
        });

        // Standard 1d100 Ritual Invocation Roll
        html.find('.invocation-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            const item = this.actor.items.get(li.data("itemId"));
            macros.invokeRitualRoll(item?.uuid, fastforward, this.actor);
        });

        // Standard 1d100 Psionic Talent Roll
        html.find('.psionic-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            const item = this.actor.items.get(li.data("itemId"));
            macros.usePsionicRoll(item?.uuid, fastforward, this.actor);
        });

        // d6 Ability Score Roll
        html.find('.ability-d6-roll').click(ev => {
            const ability = ev.currentTarget.dataset.ability;
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            macros.testAbilityD6Roll(ability, fastforward, this.actor)
        });

        // d100 Ability Score Roll
        html.find('.ability-d100-roll').click(ev => {
            const ability = ev.currentTarget.dataset.ability;
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            macros.testAbilityD100Roll(ability, fastforward, this.actor)
        });

        // Weapon Damage Roll
        html.find('.weapon-damage-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const aspect = ev.currentTarget.dataset.aspect;
            const item = this.actor.items.get(li.data("itemId"));
            macros.weaponDamageRoll(item?.uuid, aspect, this.actor);
        });

        // Missile Damage Roll
        html.find('.missile-damage-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const range = ev.currentTarget.dataset.range;
            const item = this.actor.items.get(li.data("itemId"));
            macros.missileDamageRoll(item?.uuid, range, this.actor);
        });

        // Melee Weapon Attack
        html.find('.melee-weapon-attack').click(ev => {
            // If we are a synthetic actor, token will be set
            let token = this.actor.token;
            if (!token) {
                // We are not a synthetic actor, so see if there is exactly one linked actor on the canvas
                const tokens = this.actor.getActiveTokens(true);
                if (tokens.length == 0) {
                    ui.notifications.warn(`There are no tokens linked to this actor on the canvas, double-click on a specific token on the canvas.`);
                    return null;
                } else if (tokens.length > 1) {
                    ui.notifications.warn(`There are ${tokens.length} tokens linked to this actor on the canvas, so the attacking token can't be identified.`);
                    return null;
                }
                token = tokens[0];
            }

            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            macros.weaponAttack(item?.uuid, false, token);
        });

        // Missile Weapon Attack
        html.find('.missile-weapon-attack').click(ev => {
            // If we are a synthetic actor, token will be set
            let token = this.actor.token;
            if (!token) {
                // We are not a synthetic actor, so see if there is exactly one linked actor on the canvas
                const tokens = this.actor.getActiveTokens(true);
                if (tokens.length == 0) {
                    ui.notifications.warn(`There are no tokens linked to this actor on the canvas, double-click on a specific token on the canvas.`);
                    return null;
                } else if (tokens.length > 1) {
                    ui.notifications.warn(`There are ${tokens.length} tokens linked to this actor on the canvas, so the attacking token can't be identified.`);
                    return null;
                }
                token = tokens[0];
            }

            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            macros.missileAttack(item?.uuid, false, token);
        });

        // Weapon Attack Roll
        html.find('.weapon-attack-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            const item = this.actor.items.get(li.data("itemId"));
            macros.weaponAttackRoll(item?.uuid, fastforward, this.actor);
        });

        // Weapon Defend Roll
        html.find('.weapon-defend-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            const item = this.actor.items.get(li.data("itemId"));
            macros.weaponDefendRoll(item?.uuid, fastforward, this.actor);
        });

        // Missile Attack Roll
        html.find('.missile-attack-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            macros.missileAttackRoll(item?.uuid, this.actor);
        });

        // Injury Roll
        html.find('.injury-roll').click(ev => macros.injuryRoll(this.actor));

        // Healing Roll
        html.find('.healing-roll').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const fastforward = ev.shiftKey || ev.altKey || ev.ctrlKey;
            const item = this.actor.items.get(li.data("itemId"));
            macros.healingRoll(item?.uuid, fastforward, this.actor);
            //const ifff = new ImportFFF();
            //ifff.importFromJSON('test.json');
        });

        // Dodge Roll
        html.find('.dodge-roll').click(ev => macros.dodgeRoll(ev.shiftKey || ev.altKey || ev.ctrlKey, this.actor));

        // Shock Roll
        html.find('.shock-roll').click(ev => macros.shockRoll(ev.shiftKey || ev.altKey || ev.ctrlKey, this.actor));

        // Stumble Roll
        html.find('.stumble-roll').click(ev => macros.stumbleRoll(ev.shiftKey || ev.altKey || ev.ctrlKey, this.actor));

        // Fumble Roll
        html.find('.fumble-roll').click(ev => macros.fumbleRoll(ev.shiftKey || ev.altKey || ev.ctrlKey, this.actor));

        // Generic Damage Roll
        html.find('.damage-roll').click(ev => macros.genericDamageRoll(this.actor));

        // Toggle carry state
        html.find('.item-carry').click(this._onToggleCarry.bind(this));

        // Toggle equip state
        html.find('.item-equip').click(this._onToggleEquip.bind(this));

        // Toggle improve state
        html.find('.item-improve').click(this._onToggleImprove.bind(this));

        // More Info
        html.find('.more-info').click(this._onMoreInfo.bind(this));
    }

    /* -------------------------------------------- */

    async _onItemDelete(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const data = foundry.utils.deepClone(header.dataset);
        const li = $(header).parents(".item");
        const itemId = li.data("itemId");
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
            let agree = false;
            await Dialog.confirm({
                title: title,
                content: content,
                yes: () => agree = true
            });

            if (agree) {
                const deleteItems = [];

                // Add all items in the container to the delete list
                if (item.type === 'containeritem') {
                    this.actor.items.forEach(it => {
                        if (item.type.endsWith('gear') && it.systemn.container === itemId) deleteItems.push(it.id);
                    });
                }

                deleteItems.push(itemId);  // ensure we delete the container last

                for (let it of deleteItems) {
                    await Item.deleteDocuments([it], {parent: this.actor});
                    li.slideUp(200, () => this.render(false));
                }
            }
        }
    }

    async mergeItem(item, other) {
        if (item.type != other.type) {
            return;
        }

        const data = item.data;
        const otherData = other.data;
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

    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        // Grab any data associated with this control.
        const dataset = foundry.utils.deepClone(header.dataset);

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

        const dlghtml = await renderTemplate(dlgTemplate, dialogData);

        // Create the dialog window
        return Dialog.prompt({
            title: dialogData.title,
            content: dlghtml,
            label: "Create",
            callback: async (html) => {
                const form = html.querySelector('#create-item');
                const fd = new FormDataExtended(form);
                const formdata = fd.object;
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
            },
            options: { jQuery: false }
        });
    }

    /**
     * Handle toggling the carry state of an Owned Item within the Actor
     * @param {Event} event   The triggering click event
     * @private
     */
    _onToggleCarry(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);

        // Only process inventory ("gear") items, otherwise ignore
        if (item.type.endsWith('gear')) {
            const attr = "system.isCarried";
            return item.update({ [attr]: !getProperty(item, attr) });
        }

        return null;
    }

    /**
     * Handle toggling the carry state of an Owned Item within the Actor
     * @param {Event} event   The triggering click event
     * @private
     */
    _onToggleEquip(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);

        // Only process inventory ("gear") items, otherwise ignore
        if (item.type.endsWith('gear')) {
            const attr = "system.isEquipped";
            return item.update({ [attr]: !getProperty(item, attr) });
        }

        return null;
    }

    /**
     * Handle toggling the improve state of an Owned Item within the Actor
     * @param {Event} event   The triggering click event
     * @private
     */
    _onToggleImprove(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
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

    async _onMoreInfo(event) {
        event.preventDefault();
        const journalEntry = event.currentTarget.dataset.journalEntry;

        const helpJournal = await game.packs.find(p => p.collection === `hm3.system-help`).getDocuments();
        const article = helpJournal.find(i => i.name === journalEntry);
        //const article = game.journal.getName(journalEntry);
        if (!article) {
            console.error(`HM3 | Can't find journal entry with name "${journalEntry}".`);
            return null;
        }
        article.sheet.render(true, {editable: false});
        return null;
    }

    _improveToggleDialog(item) {
        const dlghtml = '<p>Do you want to perform a Skill Development Roll (SDR), or just disable the flag?</p>'

        // Create the dialog window
        return new Promise(resolve => {
            new Dialog({
                title: 'Skill Development Toggle',
                content: dlghtml.trim(),
                buttons: {
                    performSDR: {
                        label: "Perform SDR",
                        callback: async (html) => {
                            return await HarnMasterActor.skillDevRoll(item);
                        }
                    },
                    disableFlag: {
                        label: "Disable Flag",
                        callback: async (html) => {
                            return item.update({ "system.improveFlag": false });
                        }
                    }
                },
                default: "performSDR",
                close: () => resolve(false)
            }).render(true)
        });

    }

    async _onDumpEsotericDescription(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const li = $(header).parents(".item");
        const itemId = li.data("itemId");

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

                const html = await renderTemplate(chatTemplate, chatData);

                const messageData = {
                    user: game.user.id,
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
