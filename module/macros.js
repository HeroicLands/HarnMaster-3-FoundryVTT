import { DiceHM3 } from './dice-hm3.js';
import * as combat from './combat.js';
import * as utility from './utility.js';
import { HM3 } from './config.js';

/**
 * Create a script macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export function createHM3Macro(data, slot) {
    if (data.type !== "Item") return true;  // Continue normal processing for non-Item documents
    handleItemMacro(data, slot);
    return false;
}

async function handleItemMacro(data, slot) {
    const item = await fromUuid(data.uuid);
    if (!item?.system) {
        ui.notifications.warn("No macro exists for that type of object.");
        return null;
    }

    let title = item.name;
    if (item.actor) {
        title = `${item.actor.name}'s ${item.name}`;
    }

    let cmdSuffix;
    switch (item.type) {
        case 'skill':
            cmdSuffix = `skillRoll("${item.uuid}");`;
            break;

        case 'psionic':
            cmdSuffix = `usePsionicRoll("${item.uuid}");`;
            break;

        case 'spell':
            cmdSuffix = `castSpellRoll("${item.uuid}");`;
            break;

        case 'invocation':
            cmdSuffix = `invokeRitualRoll("${item.uuid}");`;
            break;

        case 'weapongear':
            return await askWeaponMacro(item.uuid, slot, item.img);

        case 'missilegear':
            return await askMissileMacro(item.uuid, slot, item.img);

        case 'injury':
            cmdSuffix = `healingRoll("${item.name}");`;
            break;

        default:
            return null;  // Unhandled item, so ignore
    }

    return await applyMacro(title, `await game.hm3.macros.${cmdSuffix}`, slot, item.img, {"hm3.itemMacro": false});
}

async function applyMacro(name, command, slot, img, flags) {
    let macro = [game.macros.values()].find(m => (m.name === name) && (m.command === command));
    if (!macro) {
        macro = await Macro.create({
            name: name,
            type: "script",
            img: img,
            command: command,
            flags: flags
        });
    }
    game.user.assignHotbarMacro(macro, slot);
    return null;
}

function askWeaponMacro(weaponUuid, slot, img) {
    const item = fromUuidSync(weaponUuid);
    if (!item) {
        ui.notifications.warn(`No weapon with Uuid ${weaponUuid}`);
    }

    const dlghtml = '<p>Select the type of weapon macro to create:</p>';

    let actorName = "";
    if (item.actor) {
        actorName = `${item.actor.name}'s `;
    }

    // Create the dialog window
    return foundry.applications.api.DialogV2.wait({
        window: {title: 'Select Weapon Macro'},
        content: dlghtml.trim(),
        buttons: [
            {
                action: "enhAttackButton",
                label: "Automated Combat",
                default: true,
                callback: async () => applyMacro(`${item.name} Automated Combat`, `await game.hm3.macros.weaponAttack("${weaponUuid}");`, slot, img, {"hm3.itemMacro": false})
            },
            {
                action: "attackButton",
                label: "Attack",
                callback: async () => applyMacro(`${actorName}${item.name} Attack Roll`, `await game.hm3.macros.weaponAttackRoll("${weaponUuid}");`, slot, img, {"hm3.itemMacro": false})
            },
            {
                action: "defendButton",
                label: "Defend",
                callback: async () => applyMacro(`${actorName}${item.name} Defend Roll`, `await game.hm3.macros.weaponDefendRoll("${weaponUuid}");`, slot, img, {"hm3.itemMacro": false})
            },
            {
                action: "damageButton",
                label: "Damage",
                callback: async () => applyMacro(`${actorName}${item.name} Damage Roll`, `await game.hm3.macros.weaponDamageRoll("${weaponUuid}");`, slot, img, {"hm3.itemMacro": false})
            }
        ]
    });
}

function askMissileMacro(name, slot, img, actorSuffix = "", actorName = "") {
    const dlghtml = '<p>Select the type of missile macro to create:</p>'

    // Create the dialog window
    return foundry.applications.api.DialogV2.wait({
        window: {title: 'Select Missile Macro'},
        content: dlghtml.trim(),
        buttons: [
            {
                action: "enhAttackButton",
                label: "Automated Combat",
                default: true,
                callback: async () => applyMacro(`${name} Automated Combat`, `game.hm3.macros.missileAttack("${name}");`, slot, img, {"hm3.itemMacro": false})
            },
            {
                action: "attackButton",
                label: "Attack",
                callback: async () => applyMacro(`${actorName}${name} Attack Roll`, `game.hm3.macros.missileAttackRoll("${name}"${actorSuffix});`, slot, img, {"hm3.itemMacro": false})
            },
            {
                action: "damageButton",
                label: "Damage",
                callback: async () => applyMacro(`${actorName}${name} Damage Roll`, `game.hm3.macros.missileDamageRoll("${name}"${actorSuffix});`, slot, img, {"hm3.itemMacro": false})
            }
        ]
    });
}

async function getItemAndActor(itemName, myActor, type) {
    let result = {actor: myActor, item: null, speaker: ChatMessage.getSpeaker()};
    if (itemName) {
        result.item = await combat.getItem(itemName, type, myActor);
        myActor = result.item.actor || myActor;
    
        if (result.item?.type !== type) {
            if (result.item) {
                ui.notifications.warn(`Ignoring ${HM3.ITEM_TYPE_LABEL[type].singular} test because ${result.item.name} is not a ${HM3.ITEM_TYPE_LABEL[type].singular}`);
            } else {
                ui.notifications.warn(`Ignoring ${HM3.ITEM_TYPE_LABEL[type].singular} test because no ${HM3.ITEM_TYPE_LABEL[type].singular} found for '${itemName}'`);
            }
            return null;
        }
    }
    
    result = getActor(result);
    if (!result) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    return result;
}

export async function skillRoll(itemName, noDialog = false, myActor=null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'skill');

    const stdRollData = {
        type: `skill-${item.name}`,
        label: `${item.name} Skill Test`,
        target: item.system.effectiveMasteryLevel,
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            eml: item.system.effectiveMasteryLevel,
            ml: item.system.masteryLevel,
            sb: item.system.skillBase.value,
            si: item.system.skillIndex    
        },
        speaker: speaker,
        fastforward: noDialog,
        notes: item.system.notes
    };
    if (actor.isToken) {
        stdRollData.token = actor.token.id;
    } else {
        stdRollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preSkillRoll", stdRollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            item.runCustomMacro(result);
            callOnHooks("hm3.onSkillRoll", actor, result, stdRollData, item);    
        }
        return result;
    }
    return null;
}

export async function castSpellRoll(itemName, noDialog = false, myActor=null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'spell');

    const stdRollData = {
        type: `spell-${item.name}`,
        label: `Casting ${item.name}`,
        target: item.system.effectiveMasteryLevel,
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            eml: item.system.effectiveMasteryLevel,
            ml: item.system.masteryLevel,
            sb: item.system.skillBase,
            si: item.system.skillIndex,
            spellName: item.name,
            convocation: item.system.convocation,
            level: item.system.level    
        },
        speaker: speaker,
        fastforward: noDialog,
        notes: item.system.notes
    };
    if (actor.isToken) {
        stdRollData.token = actor.token.id;
    } else {
        stdRollData.actor = actor.id;
    }

    const hooksOk = Hooks.call("hm3.preSpellRoll", stdRollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            item.runCustomMacro(result);
            callOnHooks("hm3.onSpellRoll", actor, result, stdRollData, item);
        }
        return result;
    }
    return null;
}

export async function invokeRitualRoll(itemName, noDialog = false, myActor = null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'invocation');

    const stdRollData = {
        type: `invocation-${item.name}`,
        label: `Invoking ${item.name} Ritual`,
        target: item.system.effectiveMasteryLevel,
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            eml: item.system.effectiveMasteryLevel,
            ml: item.system.masteryLevel,
            sb: item.system.skillBase,
            si: item.system.skillIndex,
            invocationName: item.name,
            diety: item.system.diety,
            circle: item.system.circle    
        },
        speaker: speaker,
        fastforward: noDialog,
        notes: item.system.notes
    };
    if (actor.isToken) {
        stdRollData.token = actor.token.id;
    } else {
        stdRollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preInvocationRoll", stdRollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            item.runCustomMacro(result);
            callOnHooks("hm3.onInvocationRoll", actor, result, stdRollData, item);    
        }
        return result;
    }
    return null;
}

export async function usePsionicRoll(itemName, noDialog = false, myActor=null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'psionic');

    const stdRollData = {
        type: `psionic-${item.name}`,
        label: `Using ${item.name} Talent`,
        target: item.system.effectiveMasteryLevel,
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            eml: item.system.effectiveMasteryLevel,
            ml: item.system.masteryLevel,
            sb: item.system.skillBase.value,
            si: item.system.skillIndex,
            psionicName: item.name,
            fatigueCost: item.system.fatigue  
        },
        speaker: speaker,
        fastforward: noDialog,
        notes: item.system.notes
    };
    if (actor.isToken) {
        stdRollData.token = actor.token.id;
    } else {
        stdRollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.prePsionicsRoll", stdRollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            item.runCustomMacro(result);
            callOnHooks("hm3.onPsionicsRoll", actor, result, stdRollData, item);    
        }
        return result;
    }
    return null;
}

export async function testAbilityD6Roll(ability, noDialog = false, myActor=null) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    // Read the ability names off the actor itself. They used to come from
    // `game.model`, the template.json registry, which is empty now that the
    // system declares data models instead.
    if (!actorInfo.actor.system.abilities) {
        ui.notifications.warn(`${actorInfo.name} does not have ability scores.`);
        return null;
    }
    const abilities = Object.keys(actorInfo.actor.system.abilities);
    if (!ability || !abilities.includes(ability)) return null;


    const stdRollData = {
        type: `${ability}-d6`,
        label: `d6 ${ability[0].toUpperCase()}${ability.slice(1)} Roll`,
        target: actorInfo.actor.system.abilities[ability].effective,
        numdice: 3,
        notesData: {},
        speaker: actorInfo.speaker,
        fastforward: noDialog,
        notes: ''
    };
    if (actorInfo.actor.isToken) {
        stdRollData.token = actorInfo.actor.token.id;
    } else {
        stdRollData.actor = actorInfo.actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preAbilityRollD6", stdRollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.d6Roll(stdRollData);
        if (result) {
            result.runCustomMacro(result);
            callOnHooks("hm3.onAbilityRollD6", result, result, stdRollData);    
        }
        return result;
    }
    return null;
}

export async function testAbilityD100Roll(ability, noDialog = false, myActor = null, multiplier=5) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    // Read the ability names off the actor itself. They used to come from
    // `game.model`, the template.json registry, which is empty now that the
    // system declares data models instead.
    if (!actorInfo.actor.system.abilities) {
        ui.notifications.warn(`${actorInfo.actor.name} does not have ability scores.`);
        return null;
    }
    const abilities = Object.keys(actorInfo.actor.system.abilities);
    if (!ability || !abilities.includes(ability)) return null;

    const stdRollData = {
        type: `${ability}-d100`,
        label: `d100 ${ability[0].toUpperCase()}${ability.slice(1)} Roll`,
        target: Math.max(5, actorInfo.actor.system.abilities[ability].effective * multiplier),
        notesData: {},
        speaker: actorInfo.speaker,
        fastforward: noDialog,
        notes: ''
    };
    if (actorInfo.actor.isToken) {
        stdRollData.token = actorInfo.actor.token.id;
    } else {
        stdRollData.actor = actorInfo.actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preAbilityRollD100", stdRollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            actorInfo.actor.runCustomMacro(result);
            callOnHooks("hm3.onAbilityRollD100", actorInfo.actor, result, stdRollData);    
        }
        return result;
    }
    return null;
}

export async function weaponDamageRoll(itemName, aspect=null, myActor = null) {
    if (aspect) {
        if (!HM3.allowedAspects.includes(aspect)) {
            ui.notifications.warn(`Invalid aspect requested on damage roll: ${aspect}`);
            return null;
        }
    }

    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'weapongear');

    const rollData = {
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            weaponName: item.name 
        },
        weapon: item.name,
        data: actor,
        speaker: speaker,
        aspect: aspect ? aspect : null,
        notes: item.system.notes
    };
    if (actor.isToken) {
        rollData.token = actor.token.id;
    } else {
        rollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preDamageRoll", rollData, actor);
    if (hooksOk) {
        const result = await DiceHM3.damageRoll(rollData);
        if (result) {
            callOnHooks("hm3.onDamageRoll", actor, result, rollData);
        }
        return result;
    }
    return null;
}

export async function missileDamageRoll(itemName, range=null, myActor = null) {
    myActor &&= myActor instanceof Actor ? myActor : await fromUuid(myActor);
    if (range) {
        if (!HM3.allowedRanges.includes(range)) {
            ui.notifications.warn(`Invalid range requested on damage roll: ${range}`);
            return null;
        }
    }

    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'missilegear');

    const rollData = {
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            missileName: item.name,
            aspect: item.system.weaponAspect
        },
        name: item.name,
        aspect: item.system.weaponAspect,
        defaultRange: range,
        impactShort: item.system.impact.short,
        impactMedium: item.system.impact.medium,
        impactLong: item.system.impact.long,
        impactExtreme: item.system.impact.extreme,
        data: actor,
        speaker: speaker,
        notes: item.system.notes
    };
    if (actor.isToken) {
        rollData.token = actor.token.id;
    } else {
        rollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preMissileDamageRoll", rollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.missileDamageRoll(rollData);
        if (result) {
            callOnHooks("hm3.onMissileDamageRoll", actor, result, rollData);
        }
        return result;
    }
    return null;
}

export async function weaponAttackRoll(itemName, noDialog = false, myActor = null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'weapongear');

    const stdRollData = {
        label: `${item.name} Attack`,
        target: item.system.attackMasteryLevel,
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            ml: item.system.masteryLevel,
            sb: item.system.skillBase,
            si: item.system.skillIndex,
            weaponName: item.name,
            attack: item.system.attack,
            atkMod: item.system.attackModifier,
            aml: item.system.attackMasteryLevel  
        },
        speaker: speaker,
        fastforward: noDialog,
        notes: item.system.notes
    };
    if (actor.isToken) {
        stdRollData.token = actor.token.id;
    } else {
        stdRollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preWeaponAttackRoll", stdRollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            callOnHooks("hm3.onWeaponAttackRoll", actor, result, stdRollData, item);
        }
        return result;
    }
    return null;
}

export async function weaponDefendRoll(itemName, noDialog = false, myActor = null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'weapongear');

    let outnumberedMod = 0;
    if (actor.system?.eph?.outnumbered > 1) {
        outnumberedMod = Math.floor(actor.system.eph.outnumbered - 1) * -10;
    }

    const stdRollData = {
        label: `${item.name} Defense`,
        target: item.system.defenseMasteryLevel,
        modifier: outnumberedMod,
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            ml: item.system.masteryLevel,
            sb: item.system.skillBase,
            si: item.system.skillIndex,
            weaponName: item.name,
            defense: item.system.defense,
            dml: item.system.defenseMasteryLevel  
        },
        speaker: speaker,
        fastforward: noDialog,
        notes: item.system.notes
    };
    if (actor.isToken) {
        stdRollData.token = actor.token.id;
    } else {
        stdRollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preWeaponDefendRoll", stdRollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            callOnHooks("hm3.onWeaponDefendRoll", actor, result, stdRollData, item);
        }
        return result;
    }
    return null;
}

export async function missileAttackRoll(itemName, myActor = null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'missilegear');

    const rollData = {
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            missileName: item.name
        },
        name: item.name,
        target: item.system.attackMasteryLevel,
        aspect: item.system.weaponAspect,
        rangeShort: item.system.range.short,
        rangeMedium: item.system.range.medium,
        rangeLong: item.system.range.long,
        rangeExtreme: item.system.range.extreme,
        data: item,
        speaker: speaker,
        notes: item.system.notes
    }
    if (actor.isToken) {
        rollData.token = actor.token.id;
    } else {
        rollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preMissileAttackRoll", rollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.missileAttackRoll(rollData);
        if (result) {
            callOnHooks("hm3.onMissileAttackRoll", actor, result, rollData, item);
        }
        return result;
    }
    return null;
}

export async function injuryRoll(myActor = null, rollData = {}) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    rollData.notesData = {};
    rollData.actor = actorInfo.actor;
    rollData.speaker = actorInfo.speaker;
    rollData.name = actorInfo.actor.token ? actorInfo.actor.token.name : actorInfo.actor.name;
    rollData.notes = '';

    const hooksOk = Hooks.call("hm3.preInjuryRoll", rollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.injuryRoll(rollData);
        if (result) {
            callOnHooks("hm3.onInjuryRoll", actorInfo.actor, result, rollData);
        }
        return result;
    }
    return null;
}

export async function healingRoll(itemName, noDialog = false, myActor = null) {
    const {actor, item, speaker} = await getItemAndActor(itemName, myActor, 'injury');

    const stdRollData = {
        type: 'healing',
        label: `${item.name} Healing Roll`,
        target: item.system.healRate*actor.system.endurance,
        notesData: {
            up: actor.system.universalPenalty,
            pp: actor.system.physicalPenalty,
            il: actor.system.eph.totalInjuryLevels || 0,
            fatigue: actor.system.eph.fatigue,
            endurance: actor.system.endurance,
            injuryName: item.name,
            healRate: item.system.healRate  
        },
        speaker: speaker,
        fastforward: noDialog,
        notes: item.system.notes
    };
    if (actor.isToken) {
        stdRollData.token = actor.token.id;
    } else {
        stdRollData.actor = actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preHealingRoll", stdRollData, actor, item);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        item.runCustomMacro(result);
        if (result) {
            callOnHooks("hm3.onHealingRoll", actor, result, stdRollData, item);
        }
        return result;
    }
    return null;
}

export async function dodgeRoll(noDialog = false, myActor = null) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    const stdRollData = {
        type: 'dodge',
        label: `Dodge Roll`,
        target: actorInfo.actor.system.dodge,
        notesData: {},
        speaker: actorInfo.speaker,
        fastforward: noDialog,
        notes: ''
    };
    if (actorInfo.actor.isToken) {
        stdRollData.token = actorInfo.actor.token.id;
    } else {
        stdRollData.actor = actorInfo.actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preDodgeRoll", stdRollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.d100StdRoll(stdRollData);
        if (result) {
            callOnHooks("hm3.onDodgeRoll", actorInfo.actor, result, stdRollData);
        }
        return result;
    }
    return null;
}

export async function shockRoll(noDialog = false, myActor = null) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    let hooksOk = false;
    let stdRollData = null;
    stdRollData = {
        type: 'shock',
        label: `Shock Roll`,
        target: actorInfo.actor.system.endurance,
        numdice: actorInfo.actor.system.universalPenalty,
        notesData: {},
        speaker: actorInfo.speaker,
        fastforward: noDialog,
        notes: ''
    };
    if (actorInfo.actor.isToken) {
        stdRollData.token = actorInfo.actor.token.id;
    } else {
        stdRollData.actor = actorInfo.actor.id;
    }
    
    hooksOk = Hooks.call("hm3.preShockRoll", stdRollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.d6Roll(stdRollData);
        actorInfo.actor.runCustomMacro(result);
        if (result) {
            callOnHooks("hm3.onShockRoll", actorInfo.actor, result, stdRollData);
        }
        return result;
    }
    return null;
}

export async function stumbleRoll(noDialog = false, myActor = null) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    const stdRollData = {
        type: 'stumble',
        label: `${actorInfo.actor.isToken ? actorInfo.actor.token.name : actorInfo.actor.name} Stumble Roll`,
        target: actorInfo.actor.system.eph.stumbleTarget,
        numdice: 3,
        notesData: {},
        speaker: actorInfo.speaker,
        fastforward: noDialog,
        notes: ''
    };
    if (actorInfo.actor.isToken) {
        stdRollData.token = actorInfo.actor.token.id;
    } else {
        stdRollData.actor = actorInfo.actor.id;
    }

    const hooksOk = Hooks.call("hm3.preStumbleRoll", stdRollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.d6Roll(stdRollData);
        if (result) {
            actorInfo.actor.runCustomMacro(result);
            callOnHooks("hm3.onStumbleRoll", actorInfo.actor, result, stdRollData);    
        }
        return result;
    }
    return null;
}

export async function fumbleRoll(noDialog = false, myActor = null) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    const stdRollData = {
        type: 'fumble',
        label: `${actorInfo.actor.isToken ? actorInfo.actor.token.name : actorInfo.actor.name} Fumble Roll`,
        target: actorInfo.actor.system.eph.fumbleTarget,
        numdice: 3,
        notesData: {},
        speaker: actorInfo.speaker,
        fastforward: noDialog,
        notes: ''
    };
    if (actorInfo.actor.isToken) {
        stdRollData.token = actorInfo.actor.token.id;
    } else {
        stdRollData.actor = actorInfo.actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preFumbleRoll", stdRollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.d6Roll(stdRollData);
        if (result) {
            actorInfo.actor.runCustomMacro(result);
            callOnHooks("hm3.onFumbleRoll", actorInfo.actor, result, stdRollData);    
        }
        return result;
    }
    return null;
}

export async function genericDamageRoll(myActor = null) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    const rollData = {
        weapon: '',
        data: actorInfo.actor,
        speaker: actorInfo.speaker,
        notesData: {},
        notes: ''
    };
    if (actorInfo.actor.isToken) {
        rollData.token = actorInfo.actor.token.id;
    } else {
        rollData.actor = actorInfo.actor.id;
    }
    
    const hooksOk = Hooks.call("hm3.preDamageRoll", rollData, actorInfo.actor);
    if (hooksOk) {
        const result = await DiceHM3.damageRoll(rollData);
        if (result) {
            callOnHooks("hm3.onDamageRoll", actorInfo.actor, result, rollData);
        }
        return result;
    }
    return null;
}

export async function changeFatigue(newValue, myActor = null) {
    const actorInfo = getActor({actor: myActor, item: null, speaker: ChatMessage.getSpeaker()});
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    const updateData = {};
    if (/^\s*[+-]/.test(newValue)) {
        // relative change
        const changeValue = parseInt(newValue, 10);
        if (!isNaN(changeValue)) updateData['system.fatigue'] = Math.max(actorInfo.actor.system.fatigue + changeValue, 0);
    } else {
        const value = parseInt(newValue, 10);
        if (!isNaN(value)) updateData['system.fatigue'] = value;
    }
    if (typeof updateData['system.fatigue'] !== 'undefined') {
        await actorInfo.actor.update(updateData);
    }

    return true;
}

export async function changeMissileQuanity(missileName, newValue, myActor = null) {
    myActor &&= myActor instanceof Actor ? myActor : await fromUuid(myActor);
    const missile = await combat.getItem(missileName, 'missilegear', myActor);
    const actorParam = {actor: myActor, item: null, speaker: ChatMessage.getSpeaker()};

    if (missile?.type === 'missilegear') {

        if (missile.parent) {
            actorParam.actor = missile.parent;
            actorParam.speaker = ChatMessage.getSpeaker({actor: missile.parent});
        }
    }

    const actorInfo = getActor(result, myActor);
    if (!actorInfo) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }

    if (!missile) {
        ui.notifications.warn(`${missileName} could not be found in the list of missiles for ${actorInfo.actor.name}.`);
        return null;
    }

    const updateData = {};
    if (/^\s*[+-]/.test(newValue)) {
        // relative change
        const changeValue = parseInt(newValue, 10);
        if (!isNaN(changeValue)) updateData['system.quantity'] = Math.max(missile.system.quantity + changeValue, 0);
    } else {
        const value = parseInt(newValue, 10);
        if (!isNaN(value)) updateData['system.quantity'] = value;
    }

    if (typeof updateData['system.quantity'] !== 'undefined') {
        const item = actorInfo.actor.items.get(missile.id);
        await item.update(updateData);
    }
    return true;
}

export async function setSkillDevelopmentFlag(skillName, myActor = null) {
    myActor &&= myActor instanceof Actor ? myActor : await fromUuid(myActor);
    const skill = await combat.getItem(skillName, 'skill', myActor);
    let speaker = myActor instanceof Actor ? ChatMessage.getSpeaker({actor: myActor}) : ChatMessage.getSpeaker();

    if (skill?.type === 'skill') {
        if (skill.parent) {
            speaker = ChatMessage.getSpeaker({actor: skill.parent});
        }
    }

    const actor = getActor(result, myActor);
    if (!actor) {
        ui.notifications.warn(`No actor for this action could be determined.`);
        return null;
    }
    
    if (!skill) {
        ui.notifications.warn(`${skillName} could not be found in the list of skills for ${actor.name}.`);
        return null;
    }

    if (!actor.isOwner) {
        ui.notifications.warn(`You are not an owner of ${actor.name}, so you may not set the skill development flag.`);
        return null;
    }

    if (!skill.system.improveFlag) {
        const updateData = { 'system.improveFlag': true };
        await skill.update(updateData);
    }

    return true;
}

/*--------------------------------------------------------------*/
/*        AUTOMATED COMBAT                                      */
/*--------------------------------------------------------------*/

export async function weaponAttack(itemName = null, noDialog = false, myToken = null, forceAllow=false) {
    const combatant = getTokenInCombat(myToken, forceAllow);
    if (!combatant) return null;

    const targetToken = getUserTargetedToken(combatant);
    if (!targetToken) return null;

    let weapon = null;
    if (itemName) {
        weapon = await combat.getItem(itemName, 'weapongear', combatant.actor);
    }

    const hooksOk = Hooks.call("hm3.preMeleeAttack", combatant, targetToken, weapon);
    if (hooksOk) {
        const result = await combat.meleeAttack(combatant.token, targetToken, weapon);
        Hooks.call("hm3.onMeleeAttack", result, combatant, targetToken, weapon);
        return result;
    }
    return null;
}

export async function missileAttack(itemName = null, noDialog = false, myToken = null, forceAllow=false) {
    const combatant = getTokenInCombat(myToken, forceAllow);
    if (!combatant) return null;
    
    const targetToken = getUserTargetedToken(combatant);
    if (!targetToken) return null;

    let missile = null;
    if (itemName) {
        missile = await combat.getItem(itemName, 'missilegear', combatant.actor);
    }

    const hooksOk = Hooks.call("hm3.preMissileAttack", combatant, targetToken, missile);
    if (hooksOk) {
        const result = await combat.missileAttack(combatant.token, targetToken, missile);
        Hooks.call("hm3.onMissileAttack", result, combatant, targetToken, missile);
        return result;
    }
    return null;
}

/**
 * Resume the attack with the defender performing the "Counterstrike" defense.
 * Note that this defense is only applicable to melee attacks.
 * 
 * @param {*} atkTokenId Token representing the attacker
 * @param {*} defTokenId Token representing the defender/counterstriker
 * @param {*} atkWeaponName Name of the weapon the attacker is using
 * @param {*} atkEffAML The effective AML (Attack Mastery Level) of the attacker after modifiers applied
 * @param {*} atkAim Attack aim ("High", "Mid", "Low")
 * @param {*} atkAspect Weapon aspect ("Blunt", "Edged", "Piercing")
 * @param {*} atkImpactMod Additional modifier to impact
 */
export async function meleeCounterstrikeResume(atkTokenId, defTokenId, atkWeaponName, atkEffAML, atkAim, atkAspect, atkImpactMod) {
    const atkToken = canvas.tokens.get(atkTokenId);
    if (!atkToken) {
        ui.notifications.warn(`Attacker ${atkToken.name} could not be found on canvas.`);
        return null;
    }

    const defToken = canvas.tokens.get(defTokenId);
    if (!defToken) {
        ui.notifications.warn(`Defender ${defToken.name} could not be found on canvas.`);
        return null;
    }

    const hooksOk = Hooks.call("hm3.preMeleeCounterstrikeResume", atkToken, defToken, atkWeaponName, atkEffAML, atkAim, atkAspect, atkImpactMod);
    if (hooksOk) {
        const result = await combat.meleeCounterstrikeResume(atkToken, defToken, atkWeaponName, atkEffAML, atkAim, atkAspect, atkImpactMod);
        Hooks.call("hm3.onMeleeCounterstrikeResume", result, atkToken, defToken, atkWeaponName, atkEffAML, atkAim, atkAspect, atkImpactMod);
        return result;
    }
    return null;
}

/**
 * Resume the attack with the defender performing the "Dodge" defense.
 * 
 * @param {*} atkTokenId Token representing the attacker
 * @param {*} defTokenId Token representing the defender
 * @param {*} type Type of attack: "melee" or "missile"
 * @param {*} weaponName Name of the weapon the attacker is using
 * @param {*} effAML The effective AML (Attack Mastery Level) of the attacker after modifiers applied
 * @param {*} aim Attack aim ("High", "Mid", "Low")
 * @param {*} aspect Weapon aspect ("Blunt", "Edged", "Piercing")
 * @param {*} impactMod Additional modifier to impact
 */
export async function dodgeResume(atkTokenId, defTokenId, type, weaponName, effAML, aim, aspect, impactMod) {
    const atkToken = canvas.tokens.get(atkTokenId);
    if (!atkToken) {
        ui.notifications.warn(`Attacker ${atkToken.name} could not be found on canvas.`);
        return null;
    }

    const defToken = canvas.tokens.get(defTokenId);
    if (!defToken) {
        ui.notifications.warn(`Defender ${defToken.name} could not be found on canvas.`);
        return null;
    }

    const hooksOk = Hooks.call("hm3.preDodgeResume", atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
    if (hooksOk) {
        const result = await combat.dodgeResume(atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
        Hooks.call("hm3.onDodgeResume", result, atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
        return result;
    }
    return null;
}

/**
 * Resume the attack with the defender performing the "Block" defense.
 * 
 * @param {*} atkTokenId Token representing the attacker
 * @param {*} defTokenId Token representing the defender
 * @param {*} type Type of attack: "melee" or "missile"
 * @param {*} weaponName Name of the weapon the attacker is using
 * @param {*} effAML The effective AML (Attack Mastery Level) of the attacker after modifiers applied
 * @param {*} aim Attack aim ("High", "Mid", "Low")
 * @param {*} aspect Weapon aspect ("Blunt", "Edged", "Piercing")
 * @param {*} impactMod Additional modifier to impact
 */
export async function blockResume(atkTokenId, defTokenId, type, weaponName, effAML, aim, aspect, impactMod) {
    const atkToken = canvas.tokens.get(atkTokenId);
    if (!atkToken) {
        ui.notifications.warn(`Attacker ${atkToken.name} could not be found on canvas.`);
        return null;
    }

    const defToken = canvas.tokens.get(defTokenId);
    if (!defToken) {
        ui.notifications.warn(`Defender ${defToken.name} could not be found on canvas.`);
        return null;
    }

    const hooksOk = Hooks.call("hm3.preBlockResume", atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
    if (hooksOk) {
        const result = await combat.blockResume(atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod)
        Hooks.call("hm3.onBlockResume", result, atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
        return result;
    }
    return null;
}

/**
 * Resume the attack with the defender performing the "Ignore" defense.
 * 
 * @param {*} atkTokenId Token representing the attacker
 * @param {*} defTokenId Token representing the defender
 * @param {*} type Type of attack: "melee" or "missile"
 * @param {*} weaponName Name of the weapon the attacker is using
 * @param {*} effAML The effective AML (Attack Mastery Level) of the attacker after modifiers applied
 * @param {*} aim Attack aim ("High", "Mid", "Low")
 * @param {*} aspect Weapon aspect ("Blunt", "Edged", "Piercing")
 * @param {*} impactMod Additional modifier to impact
 */
export async function ignoreResume(atkTokenId, defTokenId, type, weaponName, effAML, aim, aspect, impactMod) {
    const atkToken = canvas.tokens.get(atkTokenId);
    if (!atkToken) {
        ui.notifications.warn(`Attacker ${atkToken.name} could not be found on canvas.`);
        return null;
    }

    const defToken = canvas.tokens.get(defTokenId);
    if (!defToken) {
        ui.notifications.warn(`Defender ${defToken.name} could not be found on canvas.`);
        return null;
    }

    const hooksOk = Hooks.call("hm3.preIgnoreResume", atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
    if (hooksOk) {
        const result = await combat.ignoreResume(atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
        Hooks.call("hm3.onIgnoreResume", result, atkToken, defToken, type, weaponName, effAML, aim, aspect, impactMod);
        return result;
    }
    return null;
}

/*--------------------------------------------------------------*/
/*        UTILITY FUNCTIONS                                     */
/*--------------------------------------------------------------*/

/**
 * Determines the identity of the current token/actor that is in combat. If token
 * is specified, tries to use token (and will allow it regardless if user is GM.),
 * otherwise returned token will be the combatant whose turn it currently is.
 *   
 * @param {Token} token 
 */
function getTokenInCombat(token=null, forceAllow=false) {
    if (token && (game.user.isGM || forceAllow)) {
        const result = {token: token, actor: token.actor };
        return result;
    }
    
    if (!game.combat || game.combat.combatants.length === 0) {
        ui.notifications.warn(`No active combatant.`);
        return null;
    }

    const combatant = game.combat.combatant;

    if (token && (token.id !== combatant.token.id)) {
        ui.notifications.warn(`${token.name} cannot perform that action at this time.`);
        return null;
    }

    if (!combatant.actor.isOwner) {
        ui.notifications.warn(`You do not have permissions to control ${combatant.token.name}.`);
        return null;
    }

    token = canvas.tokens.get(combatant.token.id);
    return { token: token, actor: combatant.actor};
}

function getSingleSelectedToken() {
    const numTargets = canvas.tokens?.controlled?.length;
    if (!numTargets) {
        ui.notifications.warn(`No selected tokens on the canvas.`);
        return null;
    }

    if (numTargets > 1) {
        ui.notifications.warn(`There are ${numTargets} selected tokens on the canvas, please select only one`);
        return null;
    }

    return canvas.tokens.controlled[0];
}

function getUserTargetedToken(combatant) {
    const targets = game.user.targets;
    if (!targets?.size) {
        ui.notifications.warn(`No targets selected, you must select exactly one target, combat aborted.`);
        return null;
    } else if (targets.size > 1) {
        ui.notifications.warn(`${targets} targets selected, you must select exactly one target, combat aborted.`);
    }

    const targetToken = Array.from(game.user.targets)[0];

    if (combatant?.token && targetToken.id === combatant.token.id) {
        ui.notifications.warn(`You have targetted the combatant, they cannot attack themself, combat aborted.`);
        return null;
    }

    return targetToken;
}

function getActor({item, actor, speaker}={}) {
    const result = {item, actor, speaker};
    if (item?.actor) {
        result.actor = item.actor;
        result.speaker = ChatMessage.getSpeaker({actor: result.actor});
    } else {
        // If actor is an Actor, just return it
        if (result.actor instanceof Actor) {
            result.speaker ||= ChatMessage.getSpeaker({actor: result.actor});
        } else {
            if (!result.actor) {
                // If actor was null, lets try to figure it out from the Speaker
                result.speaker = ChatMessage.getSpeaker();
                if (result.speaker?.token) {
                    const token = canvas.tokens.get(result.speaker.token)
                    result.actor = token.actor;
                } else {
                    result.actor = result.speaker?.actor;
                }
                if (!result.actor) {
                    ui.notifications.warn(`No actor selected, roll ignored.`);
                    return null;
                }
            } else {
                result.actor = fromUuidSync(result.actor)
                result.speaker = ChatMessage.getSpeaker({actor: result.actor});
            }
        
            if (!result.actor) {
                ui.notifications.warn(`No actor selected, roll ignored.`);
                return null;
            }    
        }
    }

    if (!result.actor.isOwner) {
        ui.notifications.warn(`You do not have permissions to control ${result.actor.name}.`);
        return null;
    }

    return result;
}

export function callOnHooks(hook, actor, result, rollData, item=null) {
    const rollResult = {
        type: result.type,
        title: result.title,
        origTarget: result.origTarget,
        modifier: (result.plusMinus === '-' ? -1 : 1) * result.modifier,
        modifiedTarget: result.modifiedTarget,
        rollValue: result.rollValue,
        isSuccess: result.isSuccess,
        isCritical: result.isCritical,
        result: result.isSuccess ? (result.isCritical ? 'CS' : 'MS') : (result.isCritical ? 'CF' : 'MF'),
        description: result.description,
        notes: result.notes
    };

    const foundMacro = game.macros.getName(hook);

    if (foundMacro && !foundMacro.hasPlayerOwner) {
        const token = actor?.isToken ? actor.token: null;

        utility.executeMacroScript(foundMacro, {actor: actor, token: token, rollResult: rollResult, rollData: rollData, item: item});
    }

    if (item) {
        return Hooks.call(hook, actor, rollResult, rollData, item);
    } else {
        return Hooks.call(hook, actor, rollResult, rollData);
    }
}
