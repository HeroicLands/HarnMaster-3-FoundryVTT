import * as utility from './utility.js';

export class DiceHM3 {
    /*--------------------------------------------------------------------------------*/
    /*        STANDARD D100 ROLL PROCESSING
    /*--------------------------------------------------------------------------------*/

    /**
     * Performs a standard d100 "skill" roll, optionally presenting a dialog
     * to collect a modifier (although can be used for any straignt d100 roll
     * that takes an optional modifier and rolls against a target value).
     * 
     * Note that the modifier affects the target value, not the die roll.
     * The die roll is always a strait "1d100" roll without modifiers.
     * 
     * rollData is expected to contain the following values:
     *  target: Target value to check against
     *  modifier: Modifier to target value
     *  label: The label associated with the 'target' value
     *  fastForward: If true, assume no modifier and don't present Dialog
     *  speaker: the Speaker to use in Chat
     *  rollMode: the rollMode to use
     *  actorData: actor data
     * 
     * @param {Object} rollData 
     */
    static async d100StdRoll (rollData) {
        const speaker = rollData.speaker || ChatMessage.getSpeaker();

        const dialogOptions = {
            type: rollData.type,
            target: rollData.target,
            label: rollData.label,
            modifier: rollData.modifier || 0
        };

        // Create the Roll instance
        const roll = rollData.fastforward ? await DiceHM3.rollTest({
            type: rollData.type,
            diceSides: 100,
            diceNum: 1,
            modifier: rollData.modifier || 0,
            target: rollData.target
        }) : await DiceHM3.d100StdDialog(dialogOptions);

        // If user cancelled the roll, then return immediately
        if (!roll) return null;

        // Prepare for Chat Message
        const chatTemplate = 'systems/hm3/templates/chat/standard-test-card.html';

        const notesData = foundry.utils.mergeObject(rollData.notesData, {
            actor: speaker.alias,
            target: rollData.target,
            modifier: rollData.modifier,
            roll: roll.rollObj.total,
            rollText: roll.description,
            isSuccess: roll.isSuccess,
            isCritical: roll.isCritical,
            isCS: roll.isSuccess && roll.isCritical,
            isMS: roll.isSuccess && !roll.isCritical,
            isMF: !roll.isSuccess && !roll.isCritical,
            isCF: !roll.isSuccess && roll.isCritical
        });
        const renderedNotes = rollData.notes ? utility.stringReplacer(rollData.notes, notesData) : "";

        const chatTemplateData = {
            type: roll.type,
            title: rollData.label,
            origTarget: rollData.target,
            modifier: Math.abs(roll.modifier),
            plusMinus: roll.modifier < 0 ? '-' : '+',
            modifiedTarget: roll.target,
            isSuccess: roll.isSuccess,
            isCritical: roll.isCritical,
            rollValue: roll.rollObj.total,
            rollResult: roll.rollObj.total,
            showResult: false,
            description: roll.description,
            notes: renderedNotes,
            roll: roll
        };

        const html = await renderTemplate(chatTemplate, chatTemplateData);

        const messageData = {
            user: game.user.id,
            speaker: speaker,
            content: html.trim(),
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: CONFIG.sounds.dice,
            roll: roll.rollObj
        };

        const messageOptions = {
            rollMode: game.settings.get("core", "rollMode")
        };

        // Create a chat message
        await ChatMessage.create(messageData, messageOptions)
    
        return chatTemplateData;
    }
    
    
    /**
     * Renders a dialog to get the modifier for a d100 skill roll, and then
     * perform a d100 dice roll to determine results.  Returns Roll object
     * representing outcome of die roll, or null if user cancelled dialog.
     * 
     * @param {*} dialogOptions 
     */
    static async d100StdDialog(dialogOptions) {
    
        // Render modal dialog
        let dlgTemplate = dialogOptions.template || "systems/hm3/templates/dialog/standard-test-dialog.html";
        let dialogData = {
            target: dialogOptions.target,
            modifier: dialogOptions.modifier
        };
        const html = await renderTemplate(dlgTemplate, dialogData);
        
        // Create the dialog window
        return Dialog.prompt({
            title: dialogOptions.label,
            content: html.trim(),
            label: "Roll",
            callback: html => {
                const formModifier = html[0].querySelector("form").modifier.value;
                return DiceHM3.rollTest({
                    type: dialogOptions.type,
                    target: dialogOptions.target,
                    data: null,
                    diceSides: 100,
                    diceNum: 1,
                    modifier: formModifier
                });
            }
        });
    }
    
    /*--------------------------------------------------------------------------------*/
    /*        STANDARD D6 ROLL PROCESSING
    /*--------------------------------------------------------------------------------*/

    /**
     * Performs a standard d6 roll, optionally presenting a dialog
     * to collect a modifier (although can be used for any straignt d6 roll
     * that takes an optional modifier and rolls against a target value).
     * 
     * Note that the modifier affects the target value, not the die roll.
     * The die roll is always a strait "1d100" roll without modifiers.
     * 
     * rollData is expected to contain the following values:
     *  target: Target value to check against
     *  modifier: Modifier to target value
     *  numdice: Number of d6 to roll
     *  label: The label associated with the 'target' value
     *  fastForward: If true, assume no modifier and don't present Dialog
     *  speaker: the Speaker to use in Chat
     *  rollMode: the rollMode to use
     *  actorData: actor data
     * 
     * @param {Object} rollData 
     */
    static async d6Roll (rollData) {
        const speaker = rollData.speaker || ChatMessage.getSpeaker();
        
        const dialogOptions = {
            type: rollData.type,
            target: Number(rollData.target),
            label: rollData.label,
            modifier: rollData.modifier || 0,
            numdice: Number(rollData.numdice),
            items: rollData.items
        };

        // Create the Roll instance
        const roll = rollData.fastforward ? await DiceHM3.rollTest({
            type: rollData.type,
            diceSides: 6,
            diceNum: Number(rollData.numdice),
            modifier: rollData.modifier || 0,
            target: rollData.target
        }) : await DiceHM3.d6Dialog(dialogOptions);

        // If user cancelled the roll, then return immediately
        if (!roll) return null;

        // Prepare for Chat Message
        const chatTemplate = 'systems/hm3/templates/chat/standard-test-card.html';

        const notesData = foundry.utils.mergeObject(rollData.notesData, {
            actor: speaker.alias,
            target: rollData.target,
            roll: roll.rollObj.total,
            rollText: roll.description,
            isSuccess: roll.isSuccess
        });
        const renderedNotes = rollData.notes ? utility.stringReplacer(rollData.notes, notesData) : "";

        const chatTemplateData = {
            type: roll.type,
            type: rollData.type,
            title: rollData.label,
            origTarget: rollData.target,
            modifier: roll.modifier,
            modifiedTarget: roll.target,
            isSuccess: roll.isSuccess,
            rollValue: roll.rollObj.total,
            rollResult: roll.rollObj.dice[0].values.join(" + "),
            showResult: roll.rollObj.dice[0].values.length > 1,
            description: roll.description,
            notes: renderedNotes,
            roll: roll
        };

        const html = await renderTemplate(chatTemplate, chatTemplateData);

        const messageData = {
            user: game.user.id,
            speaker: speaker,
            content: html.trim(),
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: CONFIG.sounds.dice,
            roll: roll.rollObj
        };

        const messageOptions = {
            rollMode: game.settings.get("core", "rollMode")
        };

        // Create a chat message
        await ChatMessage.create(messageData, messageOptions)
    
        return chatTemplateData;
    }
    
    
    /**
     * Renders a dialog to get the modifier for a d6 roll, and then
     * perform a d6 dice roll to determine results.  Returns Roll object
     * representing outcome of die roll, or null if user cancelled dialog.
     * 
     * @param {*} dialogOptions 
     */
    static async d6Dialog(dialogOptions) {
    
        // Render modal dialog
        let dlgTemplate = dialogOptions.template || "systems/hm3/templates/dialog/standard-test-dialog.html";
        let dialogData = {
            target: dialogOptions.target,
            modifier: dialogOptions.modifier
        };
        const html = await renderTemplate(dlgTemplate, dialogData);
        
        // Create the dialog window
        return Dialog.prompt({
            title: dialogOptions.label,
            content: html.trim(),
            label: "Roll",
            callback: html => {
                const formModifier = html[0].querySelector("form").modifier.value;
                return DiceHM3.rollTest({
                    type: dialogOptions.type,
                    target: dialogOptions.target,
                    data: null,
                    diceSides: 6,
                    diceNum: dialogOptions.numdice,
                    modifier: formModifier
                });
            }
        });
    }

    /*--------------------------------------------------------------------------------*/
    /*        SKILL DEVELOPMENT ROLL PROCESSING
    /*--------------------------------------------------------------------------------*/

    static async sdrRoll(item) {
        const speaker = ChatMessage.getSpeaker();

        let roll = await (new Roll(`1d100 + @sb`, {sb: item.system.skillBase.value})).evaluate({async: true});

        const isSuccess = roll.total > item.system.masteryLevel;

        const re = RegExp('\(([^\)]+)\)');
        const specMatch = item.name.match(/\(([^\)]+)\)/);
        const chatTemplate = 'systems/hm3/templates/chat/standard-test-card.html';

        const chatTemplateData = {
            title: `${item.name} Skill Development Roll`,
            origTarget: item.system.masteryLevel,
            modifier: 0,
            modifiedTarget: item.system.masteryLevel,
            isSuccess: isSuccess,
            rollValue: roll.total,
            rollResult: roll.result,
            showResult: true,
            description: isSuccess ? "Success" : "Failure",
            notes: '',
            sdrIncr: isSuccess ? (specMatch ? 2 : 1 ) : 0
        };

        if (specMatch && isSuccess) {
            chatTemplateData.notes = `Since this is a specialized skill of ${specMatch[1]}, ML will be increased by 2`
        }

        const html = await renderTemplate(chatTemplate, chatTemplateData);

        const messageData = {
            speaker: speaker,
            content: html.trim(),
            user: game.user.id,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: CONFIG.sounds.dice,
            roll: roll
        };

        const messageOptions = {
            rollMode: game.settings.get("core", "rollMode")
        };

        // Create a chat message
        await ChatMessage.create(messageData, messageOptions);
    
        return chatTemplateData;
    }

    /*--------------------------------------------------------------------------------*/
    /*        INJURY ROLL PROCESSING
    /*--------------------------------------------------------------------------------*/

    /**
     * Performs processing, including a random roll, to determine
     * injury location and effects.
     * 
     * @param {Object} rollData 
     */
    static async injuryRoll (rollData) {
        const speaker = rollData.speaker || ChatMessage.getSpeaker({actor: rollData.actor});

        let result = null;
        if (typeof rollData.impact == 'undefined') {
            let hitLocations = DiceHM3._getHitLocations(rollData.actor.items);

            const dialogOptions = {
                hitLocations: hitLocations,
                data: rollData.actor.system,
                items: rollData.actor.items,
                name: rollData.actor.token ? rollData.actor.token.name : rollData.actor.name
            };
    
            // Create the Roll instance
            result = await DiceHM3.injuryDialog(dialogOptions);
        } else {
            result = DiceHM3._calcInjury('Random', rollData.impact, rollData.aspect,
                game.settings.get('hm3', 'addInjuryToActorSheet') !== 'disable', rollData.aim, rollData);
        }

        // If user cancelled the roll, then return immediately
        if (!result) return null;

        if (result && rollData.tokenId) result.tokenId = rollData.tokenId;

        if (result.addToCharSheet) {
            DiceHM3.createInjury(rollData.actor, result);
        }

        // Prepare for Chat Message
        const chatTemplate = 'systems/hm3/templates/chat/injury-card.html';

        const chatTemplateData = foundry.utils.mergeObject({
            title: `${rollData.actor.token ? rollData.actor.token.name : rollData.actor.name} Injury`,
            visibleActorId: rollData.actor.id
        }, result);

        const html = await renderTemplate(chatTemplate, chatTemplateData);

        const messageData = {
            speaker: speaker,
            content: html.trim(),
            user: game.user.id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            sound: CONFIG.sounds.notify
        };

        const messageOptions = {
            rollMode: game.settings.get("core", "rollMode")
        };

        // Create a chat message
        await ChatMessage.create(messageData, messageOptions);
        if (game.settings.get("hm3", "combatAudio")) {
            foundry.audio.AudioHelper.play({src: "systems/hm3/audio/grunt1.ogg", autoplay: true, loop: false}, true);
        }
        return chatTemplateData;
    }
    
    /**
     * 
     * @param {*} actor 
     * @param {*} result 
     */
    static createInjury(actor, result) {
        const injuryDesc = {
            'Blunt':    { 'M': 'Bruise', 'S': 'Fracture', 'G': 'Crush' },
            'Edged':    { 'M': 'Cut', 'S': 'Slash', 'G': 'Gash' },
            'Piercing': { 'M': 'Poke', 'S': 'Stab', 'G': 'Impale' },
            'Fire':     { 'M': 'Singe', 'S': 'Burn', 'G': 'Scorch' }
        };

        if (result.injuryLevel === 0) return;

        let sev;
        if (result.injuryLevel === 1) {
            sev = 'M';
        } else if (result.injuryLevel <= 3) {
            sev = 'S';
        } else {
            sev = 'G';
        }

        let locationName = result.location;
        if (injuryDesc[result.aspect]) {
            locationName = `${result.location} ${injuryDesc[result.aspect][sev]}`;
        }

        let item = Item.create({
            name: locationName,
            type: "injury",
            system: {
                severity: sev,
                injuryLevel: result.injuryLevel,
                healRate: 0,
                notes: `Aspect: ${result.aspect}`,
            }
        }, {parent: actor});

        return item;
    }

    /**
     * Returns a list of unique hit location names, including a single "Random" entry.
     * Used for filling a dropdown during hit-location calculation.
     * 
     * @param {*} items List of items including armorlocation items
     */
    static _getHitLocations(items) {
        // Initialize list with an indicator for a Random roll
        let hitLocations = ['Random'];

        // get a list of unique hit location names
        items.forEach(it => {
            if (it.type === 'armorlocation') {
                if (hitLocations.indexOf(it.name) === -1) {
                    hitLocations.push(it.name);
                }
            }
        });

        return hitLocations;
    }
    
    /**
     * Render a dialog box for gathering information for use in the Injury roll
     * 
     * @param {*} dialogOptions 
     */
    static async injuryDialog(dialogOptions) {
    
        const recordInjury = game.settings.get("hm3", "addInjuryToActorSheet");

        // Render modal dialog
        let dlgTemplate = dialogOptions.template || "systems/hm3/templates/dialog/injury-dialog.html";
        let dialogData = {
            aim: 'mid',
            location: 'Random',
            impact: 0,
            aspect: 'Blunt',
            askRecordInjury:  recordInjury === 'ask',
            hitLocations: dialogOptions.hitLocations
        };

        const html = await renderTemplate(dlgTemplate, dialogData);

        // Create the dialog window
        return Dialog.prompt({
            title: dialogOptions.label,
            content: html.trim(),
            label: "Determine Injury",
            callback: html => {
                const form = html[0].querySelector("form");
                const formLocation = form.location.value;
                const formImpact = form.impact.value;
                const formAspect = form.aspect.value;
                const formAim = form.aim.value;
                const formAddToCharSheet = dialogData.askRecordInjury ?
                    form.addToCharSheet.checked : recordInjury === 'enable';
                return DiceHM3._calcInjury(formLocation, formImpact, formAspect, 
                    formAddToCharSheet, formAim, dialogOptions);
            }
        });
    }

    /**
     * This method calculates many items related to injuries that are used to populate
     * the chat message with the results of the injury
     * 
     * @param {String} location 
     * @param {Number} impact 
     * @param {String} aspect 
     * @param {Boolean} addToCharSheet
     * @param {String} aim 
     * @param {Object} dialogOptions 
     */
    static _calcInjury(location, impact, aspect, addToCharSheet, aim, dialogOptions) {
        const enableAmputate = game.settings.get('hm3', 'amputation');
        const enableBloodloss = game.settings.get('hm3', 'bloodloss');
        const enableLimbInjuries = game.settings.get('hm3', 'limbInjuries');

        const result = {
            type: 'injury',
            isRandom: location === 'Random',
            name: dialogOptions.name,
            aim: aim,
            aspect: aspect,
            location: location,
            impact: impact,
            armorType: 'None',
            armorValue: 0,
            effectiveImpact: impact,
            isInjured: false,
            injuryLevel: 0,
            injuryLevelText: 'NA',
            isBleeder: false,
            isFumbleRoll: false,
            isFumble: false,
            isStumbleRoll: false,
            isStumble: false,
            isAmputate: false,
            isKillShot: false,
            addToCharSheet: addToCharSheet
        };

        // determine location of injury
        const armorLocationItem = DiceHM3._calcLocation(location, aim, dialogOptions.items);
        if (!armorLocationItem) return;  // this means we couldn't find the location, so no injury

        // Just to make life simpler, get the data element which is what we really care about.
        const armorLocationData = armorLocationItem.system;

        result.location = armorLocationItem.name;
        result.armorType = armorLocationData.layers === '' ? 'None' : armorLocationData.layers;

        // determine effective impact (impact - armor)
        if (aspect === 'Blunt') {
            result.armorValue = armorLocationData.blunt;
        } else if (aspect === 'Edged') {
            result.armorValue = armorLocationData.edged;
        } else if (aspect === 'Piercing') {
            result.armorValue = armorLocationData.piercing;
        } else {
            result.armorValue = armorLocationData.fire;
        }
        result.effectiveImpact = Math.max(impact - result.armorValue, 0);

        // Determine Injury Level
        if (result.effectiveImpact === 0) {
            result.injuryLevelText = 'NA';
        } else if (result.effectiveImpact >= 17) {
            result.injuryLevelText = armorLocationData.effectiveImpact.ei17;
        } else if (result.effectiveImpact >= 13) {
            result.injuryLevelText = armorLocationData.effectiveImpact.ei13;
        } else if (result.effectiveImpact >= 9) {
            result.injuryLevelText = armorLocationData.effectiveImpact.ei9;
        } else if (result.effectiveImpact >= 5) {
            result.injuryLevelText = armorLocationData.effectiveImpact.ei5;
        } else {
            result.injuryLevelText = armorLocationData.effectiveImpact.ei1;
        }

        // Calculate injury level and whether it is a kill shot.
        // Convert all 'K4' and 'K5' to 'G4' and 'G5'
        switch(result.injuryLevelText) {
            case 'M1':
                result.injuryLevel = 1;
                break;

            case 'S2':
                result.injuryLevel = 2;
                break;

            case 'S3':
                result.injuryLevel = 3;
                break;

            case 'G4':
                result.injuryLevel = 4;
                result.isAmputate = enableAmputate && armorLocationData.isAmputate && (aspect === 'Edged');
                break;

            case 'K4':
                result.injuryLevel = 4;
                result.isKillShot = true;
                result.isAmputate = enableAmputate && armorLocationData.isAmputate && (aspect === 'Edged');
                break;

            case 'G5':
                result.injuryLevel = 5;
                result.isAmputate = enableAmputate && armorLocationData.isAmputate && (aspect === 'Edged');
                break;

            case 'K5':
                result.injuryLevel = 5;
                result.isKillShot = true;
                result.isAmputate = enableAmputate && armorLocationData.isAmputate && (aspect === 'Edged');
                break;

            case 'NA':
                result.injuryLevel = 0;
                break;
        }

        // Either mark as injured, or if not injured just immediately return.
        if (result.injuryLevel > 0) {
            result.isInjured = true;
        } else {
            return result;
        }

        // Optional Rule - Bloodloss (Combat 14)
        result.isBleeder = enableBloodloss && result.injuryLevel >= 4 && result.aspect != 'Fire';

        // Optional Rule - Limb Injuries (Combat 14)
        if (armorLocationData.isFumble) {
            result.isFumble = enableLimbInjuries && result.injuryLevel >= 4;
            result.isFumbleRoll = enableLimbInjuries || (!result.isFumble && result.injuryLevel >= 2);
        }

        // Optional Rule - Limb Injuries (Combat 14)
        if (armorLocationData.isStumble) {
            result.isStumble = enableLimbInjuries && result.injuryLevel >= 4;
            result.isStumbleRoll = enableLimbInjuries || (!result.isStumble && result.injuryLevel >= 2);
        }

        return result;
    }

    /**
     * Return either the item specified by location, or if location === 'Random',
     * then randomly chooses a location and returns the item associated with it.
     * 
     * @param {*} location 
     * @param {*} aim 
     * @param {*} items 
     */
    static _calcLocation(location, aim, items) {
        const lcAim = aim.toLowerCase();
        let result = null;
        if (location.toLowerCase() === 'random') {
            // First, get total of all probWeight for a given aim
            let totalWeight = 0;
            let numArmorLocations = 0;
            items.forEach(it => {
                if (it.type === 'armorlocation') {
                    totalWeight += it.system.probWeight[lcAim];
                    numArmorLocations++;
                }
            });

            // if no armorlocations found, then return null
            if (numArmorLocations === 0) {
                return null;
            }

            // At this point, we know we found armorlocations,
            // but it is possible that they all have a weight
            // of zero.  In that case, we will end up just
            // picking the first one.

            // Assuming we have found some weights, we can now
            // roll to get a random number.
            let rollWeight = 0;
            if (totalWeight > 0) {
                rollWeight = Math.floor(MersenneTwister.random()*totalWeight)+1;
            }

            // find the location that meets that number
            let done = false;
            items.forEach(it => {
                if (!done && it.type === 'armorlocation') {
                    rollWeight -= it.system.probWeight[lcAim];
                    if (rollWeight <= 0) {
                        result = it;
                        done = true;
                    }
                }
            });
        } else {
            // Not random, let's just find the designated item
            items.forEach(it => {
                if (result === null && it.type === 'armorlocation' && it.name === location) {
                    result = it;
                }
            });
        }

        return result;
    }

    /*--------------------------------------------------------------------------------*/
    /*        GENERAL DAMAGE ROLL PROCESSING
    /*--------------------------------------------------------------------------------*/

    /**
     * Performs a damage roll, presenting a dialog
     * to collect information about the damage.
     * 
     * rollData is expected to contain the following values:
     *  weapon: Selected weapon (or blank for none)
     *  speaker: the Speaker to use in Chat
     *  rollMode: the rollMode to use
     *  actorData: actor data
     * 
     * @param {Object} rollData 
     */
    static async damageRoll (rollData) {
        const speaker = rollData.speaker || ChatMessage.getSpeaker();

        let weapon = DiceHM3.calcWeaponAspect(rollData.weapon, rollData.data.items);

        const dialogOptions = {
            type: 'damage',
            weapon: rollData.weapon,
            weaponAspect: rollData.aspect ? rollData.aspect : weapon.defaultAspect,
            weaponAspects: weapon.aspects,
            data: rollData.actorData
        };

        // Create the Roll instance
        const roll = await DiceHM3.damageDialog(dialogOptions);

        // If user cancelled the roll, then return immediately
        if (!roll) return null;

        // Prepare for Chat Message
        const chatTemplate = 'systems/hm3/templates/chat/damage-card.html';

        let title = "Other Weapon Damage";
        if (rollData.weapon != "") {
            title = `${rollData.weapon} Damage`; 
        }

        const totalImpact = weapon.aspects[roll.chosenAspect] + roll.addlWeaponImpact + roll.rollObj.total;

        const notesData = foundry.utils.mergeObject(rollData.notesData, {
            actor: speaker.alias,
            aspect: roll.chosenAspect,
            dice: Number(roll.damageDice),
            impact: weapon.aspects[roll.chosenAspect],
            addlImpact: roll.addlWeaponImpact,
            totalImpact: totalImpact,
            roll: roll.rollObj.total
        });
        const renderedNotes = rollData.notes ? utility.stringReplacer(rollData.notes, notesData) : "";

        const chatTemplateData = {
            title: title,
            weaponAspect: roll.chosenAspect,
            damageDice: Number(roll.damageDice),
            weaponImpact: weapon.aspects[roll.chosenAspect],
            addlWeaponImpact: roll.addlWeaponImpact,
            totalImpact: totalImpact,
            impactRoll: roll.rollObj.dice[0].values.join(" + "),
            rollValue: roll.rollObj.total,
            notes: renderedNotes,
            roll: roll
        };
        const html = await renderTemplate(chatTemplate, chatTemplateData);

        const messageData = {
            user: game.user.id,
            speaker: speaker,
            content: html.trim(),
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: CONFIG.sounds.dice,
            roll: roll.rollObj
        };

        const messageOptions = {
            rollMode: game.settings.get("core", "rollMode")
        };

        // Create a chat message
        await ChatMessage.create(messageData, messageOptions)
    
        return chatTemplateData;
    }
    
    /**
     * Returns a structure specifying the default aspect for a weapon, as well as the
     * impact values for all other aspects.  The default aspect is always the aspect
     * with the greatest impact.
     * 
     * @param {*} weapon Name of weapon
     * @param {*} items List of items containing 'weapongear' items.
     */
    static calcWeaponAspect(weapon, items) {
        // Note that although "Fire" is in this list, because it is a
        // type of damage, no normal weapon uses it as its aspect.
        // It is here so that it can be selected (no default impact
        // damage would be specified for that aspect).
        const result = {
            defaultAspect: "Other",
            aspects: {
                "Blunt": 0,
                "Edged": 0,
                "Piercing": 0,
                "Fire": 0,
                "Other": 0
            }
        }

        // Search for the specified weapon, and then choose the aspect with
        // the greatest impact (this will become the default aspect)
        items.forEach(it => {
            const itemData = it.system;
            if (it.type === 'weapongear' && it.name === weapon) {
                let maxImpact = Math.max(itemData.blunt, itemData.piercing, itemData.edged, 0);
                result.aspects["Blunt"] = itemData.blunt;
                result.aspects["Edged"] = itemData.edged;
                result.aspects["Piercing"] = itemData.piercing;
                if (maxImpact === itemData.piercing) {
                    result.defaultAspect = "Piercing";
                } else if (maxImpact === itemData.edged) {
                    result.defaultAspect = "Edged";
                } else if (maxImpact === itemData.blunt) {
                    result.defaultAspect = "Blunt";
                } else {
                    // This shouldn't happen, but if all else fails, choose "Other"
                    result.defaultAspect = "Other"
                }
            }
        });

        return result;
    }
    
    /**
     * Renders a dialog to get the information for a damage roll, and then
     * perform a number of d6 dice rolls to determine results.  Returns Roll object
     * representing outcome of die rolls, or null if user cancelled dialog.
     *            
     * @param {*} dialogOptions 
     */
    static async damageDialog(dialogOptions) {
    
        // Render modal dialog
        let dlgTemplate = dialogOptions.template || "systems/hm3/templates/dialog/damage-dialog.html";
        let dialogData = {
            weapon: dialogOptions.weapon,
            damageDice: 1,
            weaponAspect: dialogOptions.weaponAspect,
            weaponAspects: dialogOptions.weaponAspects,
            addlWeaponImpact: 0
        };
        const html = await renderTemplate(dlgTemplate, dialogData);
        
        // Create the dialog window
        return Dialog.prompt({
            title: dialogOptions.label,
            content: html.trim(),
            label: "Roll",
            callback: async html => {
                const form = html[0].querySelector("form");
                const formAddlWeaponImpact = Number(form.addlWeaponImpact.value);
                const formDamageDice = Number(form.damageDice.value);
                const formWeaponAspect = form.weaponAspect.value;
                let roll = await DiceHM3.rollTest({
                    type: dialogOptions.type,
                    target: 0,
                    data: dialogOptions.data,
                    diceSides: 6,
                    diceNum: formDamageDice,
                    modifier: 0
                });
                let result = {
                    type: roll.type,
                    chosenAspect: formWeaponAspect,
                    damageDice: formDamageDice,
                    addlWeaponImpact: formAddlWeaponImpact,
                    rollObj: roll.rollObj
                }
                return result;
            }
        });
    }

    /*--------------------------------------------------------------------------------*/
    /*        MISSILE ATTACK ROLL PROCESSING
    /*--------------------------------------------------------------------------------*/

    static async missileAttackRoll(rollData) {
        const speaker = rollData.speaker || ChatMessage.getSpeaker();

        // Create the Roll instance
        const roll = await DiceHM3.missileAttackDialog(rollData);

        // If user cancelled the roll, then return immediately
        if (!roll) return null;

        // Prepare for Chat Message
        const chatTemplate = 'systems/hm3/templates/chat/missile-attack-card.html';

        const notesData = foundry.utils.mergeObject(rollData.notesData, {
            actor: speaker.alias,
            aspect: rollData.aspect,
            range: roll.range,
            rangeModifier: roll.rangeModifier,
            addlModifier: roll.addlModifier,
            target: roll.modifiedTarget,
            isSuccess: roll.isSuccess,
            isCritical: roll.isCritical,
            isCS: roll.isSuccess && roll.isCritical,
            isMS: roll.isSuccess && !roll.isCritical,
            isMF: !roll.isSuccess && !roll.isCritical,
            isCF: !roll.isSuccess && roll.isCritical,
            roll: roll.rollObj.total,
        });
        const renderedNotes = rollData.notes ? utility.stringReplacer(rollData.notes, notesData) : "";

        const chatTemplateData = {
            title: `${rollData.name} Attack`,
            aspect: rollData.aspect,
            range: roll.range,
            origTarget: rollData.target,
            rangeModifier: Math.abs(roll.rangeModifier),
            addlModifier: Math.abs(roll.addlModifier),
            amPlusMinus: roll.addlModifier < 0 ? '-' : '+',
            rmPlusMinus: roll.rangeModifier < 0 ? '-' : '+',
            modifiedTarget: roll.modifiedTarget,
            isSuccess: roll.isSuccess,
            isCritical: roll.isCritical,
            rollValue: roll.rollObj.total,
            description: roll.description,
            notes: renderedNotes,
            roll: roll
        };
        const html = await renderTemplate(chatTemplate, chatTemplateData);

        const messageData = {
            user: game.user.id,
            speaker: speaker,
            content: html.trim(),
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: CONFIG.sounds.dice,
            roll: roll.rollObj
        };

        const messageOptions = {
            rollMode: game.settings.get("core", "rollMode")
        };

        // Create a chat message
        await ChatMessage.create(messageData, messageOptions);
    
        return chatTemplateData;
    }

    static async missileAttackDialog(dialogOptions) {
    
        // Render modal dialog
        let dlgTemplate = dialogOptions.template || "systems/hm3/templates/dialog/attack-dialog.html";

        let dialogData = {
            aimLocations: ['High', 'Mid', 'Low'],
            defaultAim: 'Mid',
            target: dialogOptions.target
        };

        const shortDesc = `Short (${dialogOptions.rangeShort})`;
        const mediumDesc = `Medium (${dialogOptions.rangeMedium})`;
        const longDesc = `Long (${dialogOptions.rangeLong})`;
        const extremeDesc = `Extreme (${dialogOptions.rangeExtreme})`;
        dialogData.ranges = {};
        dialogData.ranges[shortDesc] = 'Short';
        dialogData.ranges[mediumDesc] = 'Medium';
        dialogData.ranges[longDesc] = 'Long';
        dialogData.ranges[extremeDesc] = 'Extreme';
        dialogData.rangeExceedsExtreme = false;
        dialogData.defaultRange = extremeDesc;

        const html = await renderTemplate(dlgTemplate, dialogData);
        const title = `${dialogOptions.name} Attack`;

        // Create the dialog window
        return Dialog.prompt({
            title: dialogOptions.label,
            content: html.trim(),
            label: "Roll",
            callback: async html => {
                const form = html[0].querySelector("form");
                const formAddlModifier = Number(form.addlModifier.value);
                let formRange = form.range.value;
                let rangeModifier;
                if (formRange === shortDesc) {
                    rangeModifier = 0;
                    formRange = 'Short';
                } else if (formRange === mediumDesc) {
                    rangeModifier = -20;
                    formRange = 'Medium';
                } else if (formRange === longDesc) {
                    rangeModifier = -40;
                    formRange = 'Long';
                } else {
                    rangeModifier = -80;
                    formRange = 'Extreme';
                }

                let roll = await DiceHM3.rollTest({
                    type: dialogOptions.type,
                    target: dialogOptions.target,
                    data: dialogOptions.data,
                    diceSides: 100,
                    diceNum: 1,
                    modifier: formAddlModifier + rangeModifier
                });

                let result = {
                    type: roll.type,
                    origTarget: dialogOptions.target,
                    range: formRange,
                    rangeModifier: rangeModifier,
                    addlModifier: formAddlModifier,
                    modifiedTarget: Number(dialogOptions.target) + rangeModifier + formAddlModifier,
                    isSuccess: roll.isSuccess,
                    isCritical: roll.isCritical,
                    description: roll.description,
                    rollObj: roll.rollObj
                }
                return result;
            }
        });
    }

    /*--------------------------------------------------------------------------------*/
    /*        MISSILE DAMAGE ROLL PROCESSING
    /*--------------------------------------------------------------------------------*/

    static async missileDamageRoll(rollData) {
        const speaker = rollData.speaker || ChatMessage.getSpeaker();

        const dialogOptions = {
            name: rollData.name,
            ranges: {
                "Short": rollData.impactShort,
                "Medium": rollData.impactMedium,
                "Long": rollData.impactLong,
                "Extreme": rollData.impactExtreme
            },
            defaultRange: rollData.defaultRange ? rollData.defaultRange : "Extreme",
            data: rollData.data
        };

        // Create the Roll instance
        const roll = await DiceHM3.missileDamageDialog(dialogOptions);

        // If user cancelled the roll, then return immediately
        if (!roll) return null;

        // Prepare for Chat Message
        const chatTemplate = 'systems/hm3/templates/chat/missile-damage-card.html';

        let title = "Missile Damage";
        if (rollData.name != "") {
            title = `${rollData.name} Damage`; 
        }

        let rangeImpact = 0;
        if (roll.range === 'Short') {
            rangeImpact = rollData.impactShort;
        } else if (roll.range === 'Medium') {
            rangeImpact = rollData.impactMedium;
        } else if (roll.range === 'Long') {
            rangeImpact = rollData.impactLong;
        } else if (roll.range === 'Extreme') {
            rangeImpact = rollData.impactExtreme;
        }

        const totalImpact = Number(rangeImpact) + Number(roll.addlImpact) + Number(roll.rollObj.total);

        const notesData = foundry.utils.mergeObject(rollData.notesData, {
            actor: speaker.alias,
            aspect: rollData.aspect,
            range: roll.range,
            dice: Number(roll.damageDice),
            impact: rangeImpact,
            addlImpact: roll.addlImpact,
            totalImpact: totalImpact,
            roll: roll.rollObj.total
        });
        const renderedNotes = rollData.notes ? utility.stringReplacer(rollData.notes, notesData) : "";

        const chatTemplateData = {
            title: title,
            aspect: rollData.aspect,
            range: roll.range,
            damageDice: Number(roll.damageDice),
            rangeImpact: rangeImpact,
            addlImpact: roll.addlImpact,
            totalImpact: totalImpact,
            rollValue: roll.rollObj.total,
            notes: renderedNotes,
            roll: roll
        };
        const html = await renderTemplate(chatTemplate, chatTemplateData);

        const messageData = {
            user: game.user.id,
            speaker: speaker,
            content: html.trim(),
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: CONFIG.sounds.dice,
            roll: roll.rollObj
        };

        const messageOptions = {
            rollMode: game.settings.get("core", "rollMode")
        };

        // Create a chat message
        await ChatMessage.create(messageData, messageOptions)
    
        return chatTemplateData;
    }

    static async missileDamageDialog(dialogOptions) {
    
        // Render modal dialog
        let dlgTemplate = dialogOptions.template || "systems/hm3/templates/dialog/missile-damage-dialog.html";
        let dialogData = {
            name: dialogOptions.name,
            ranges: dialogOptions.ranges,
            defaultRange: dialogOptions.defaultRange
        };
        const html = await renderTemplate(dlgTemplate, dialogData);
        
        const title = `${dialogOptions.name} Missile Damage`;

        // Create the dialog window
        return Dialog.prompt({
            title: dialogOptions.label,
            content: html.trim(),
            label: "Roll",
            callback: async html => {
                const form = html[0].querySelector("form");
                const formAddlImpact = Number(form.addlImpact.value);
                const formDamageDice = Number(form.damageDice.value);
                const formRange = form.range.value;
                let roll = await DiceHM3.rollTest({
                    type: dialogOptions.type,
                    target: 0,
                    data: dialogOptions.data,
                    diceSides: 6,
                    diceNum: formDamageDice,
                    modifier: 0
                });
                let result = {
                    type: roll.type,
                    range: formRange,
                    damageDice: formDamageDice,
                    addlImpact: formAddlImpact,
                    rollObj: roll.rollObj
                }
                return result;
            }
        });
    }

    /*--------------------------------------------------------------------------------*/
    /*        GENERIC DICE ROLLING PROCESSING
    /*--------------------------------------------------------------------------------*/

    static async rollTest(testData) {

        const diceType = testData.diceSides === 6 ? "d6" : "d100";
        const numDice = (testData.diceNum > 0) ? testData.diceNum : 1;
        const diceSpec = numDice + diceType;
        const rollObj = new Roll(diceSpec, testData.data);
        const roll = await rollObj.evaluate({async: true});
        if (!roll) {
            console.error(`Roll evaluation failed, diceSpec=${diceSpec}`)
        }
        const modifier = Number(testData.modifier);
        const baseTargetNum = Number(testData.target) + modifier;
        // Ensure target num is between 9 and 95; always a 5% chance of success/failure
        const targetNum = Math.max(Math.min(baseTargetNum, 95), 5);
        let isCrit = (roll.total % 5) === 0;
        const levelDesc = isCrit ? "Critical" : "Marginal";
        let description = "";
        let isSuccess = false;

        if (diceType === 'd100') {
            // ********** Failure ***********
            if (roll.total > targetNum) {
                description = levelDesc + " Failure";
            }
            // ********** Success ***********
            else {
                description = levelDesc + " Success";
                isSuccess = true;
            }
        } else {
            isCrit = false;      // d6 rolls have no criticals associated with them
            isSuccess = roll.total <= targetNum;
            description = isSuccess ? "Success" : "Failure";
        }

        let rollResults = {
            "type": testData.type,
            "target": targetNum,
            "isCapped": baseTargetNum !== targetNum,
            "modifier": modifier,
            "rollObj": roll,
            "isCritical": isCrit,
            "isSuccess": isSuccess,
            "description": description,
            "preData": testData
        }
        return rollResults;
    }

    /*--------------------------------------------------------------------------------*/
    /*        UTILITY FUNCTIONS
    /*--------------------------------------------------------------------------------*/

    /**
     * Calculate and return the name of a random hit location based on weights.
     * 
     * @param {*} items List of items containing hitlocation items
     * @param {*} aim One of 'low', 'mid', or 'high'
     */
    static hitLocation(items, aim) {
        const hlAim = aim === 'high' || aim === 'low' ? aim : 'mid';
        let roll = new Roll("1d100");
        let rollResult = roll.total;
        let result = `Unknown (roll=${rollResult})`;
        let done = false;
        items.forEach(it => {
            // If we finally exhaust rollResult, just return immediately,
            // so we finish this forEach as quickly as possible
            if (rollResult > 0) {
                if (it.type === "hitlocation") {
                    let probWeight = it.system.probWeight[hlAim];
                    // if probWeight is not zero, then there is a possiblity
                    // of a match
                    if (probWeight != 0) {
                        rollResult -= probWeight;
                        if (rollResult <= 0) {
                            // At this point, we have a match! We have
                            // exhausted the rollResult, so we can
                            // set the result equal to this location name
                            result = it.name;
                        }
                    }
                }
            }
        });

        return result;
    }
}