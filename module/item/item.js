import { HM3 } from "../config.js";
import * as utility from "../utility.js";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class HarnMasterItem extends Item {
    /**
     * Augment the basic Item data model with additional dynamic data.
     */
    prepareData() {
        super.prepareData();

        // Get the Item's data
        const itemData = this.system;

        let img = null;

        // Handle marking gear as equipped or carried
        if (this.type.endsWith("gear")) {
            // If you aren't carrying the gear, it can't be equipped
            if (!itemData.isCarried) {
                itemData.isEquipped = false;
            }

            // Check if the item is in a container
            if (itemData.container && itemData.container !== "on-person") {
                // Anything in a container is unequipped automatically
                itemData.isEquipped = false;
            }
        }

        if (this.type === "armorlocation") {
            this._prepareArmorLocationData(itemData);
        }

        if (img && img != this.img) {
            this.img = img;
        }

        Hooks.call("hm3.onItemPrepareData", this);
    }

    postProcessItems() {
        const itemData = this.system;

        let pctUnivPen = HarnMasterItem.calcPenaltyPct(this.actor?.system?.universalPenalty);
        let pctPhysPen = HarnMasterItem.calcPenaltyPct(this.actor?.system?.physicalPenalty);

        if (this.type === "skill") {
            if (!itemData.masteryLevel || itemData.masteryLevel < 0) itemData.masteryLevel = 0;

            utility.calcSkillBase(this);

            // Handle using Condition Skill for Endurance if it is present
            if (this.name.toLowerCase() === "condition" && this.actor) {
                this.actor.system.hasCondition = true;
                this.actor.system.endurance = Math.floor(itemData.masteryLevel / 5) || 1;
            }

            // We modify the EML by 5 times the difference between the SB based on base
            // abilities and the SB based on AE-modified abilities
            const sbModifier = Math.round(itemData.skillBase.delta * 5);

            // Set EML for skills based on UP/PP
            switch (itemData.type) {
                case "Combat":
                case "Physical":
                    itemData.effectiveMasteryLevel =
                        itemData.masteryLevel - pctPhysPen + sbModifier;
                    break;

                default:
                    itemData.effectiveMasteryLevel =
                        itemData.masteryLevel - pctUnivPen + sbModifier;
                    break;
            }

            // Set some actor properties from skills
            const lcSkillName = this.name.toLowerCase();
            if (lcSkillName === "initiative") {
                if (this.actor?.system)
                    this.actor.system.initiative = itemData.effectiveMasteryLevel;
            } else if (lcSkillName === "dodge") {
                if (this.actor?.system) this.actor.system.dodge = itemData.effectiveMasteryLevel;
            }
        } else if (this.type === "psionic") {
            if (!itemData.masteryLevel || itemData.masteryLevel < 0) itemData.masteryLevel = 0;
            utility.calcSkillBase(this);
            itemData.effectiveMasteryLevel = itemData.masteryLevel - pctUnivPen;
        } else if (this.type === "injury") {
            // Just make sure if injuryLevel is negative, we set it to zero
            itemData.injuryLevel = Math.max(itemData.injuryLevel || 0, 0);
            HarnMasterItem.calcInjurySeverity(this);
        }
    }

    _prepareArmorLocationData(itemData) {
        // If impactType isn't custom, then set all properties from the selected impactType
        if (itemData.impactType != "custom") {
            Object.keys(HM3.injuryLocations).forEach((key) => {
                if (HM3.injuryLocations[key].impactType === itemData.impactType) {
                    foundry.utils.mergeObject(itemData, HM3.injuryLocations[key]);
                }
            });
        }

        itemData.probWeight.low = itemData.probWeight?.low || 0;
        itemData.probWeight.mid = itemData.probWeight?.mid || 0;
        itemData.probWeight.high = itemData.probWeight?.high || 0;
        itemData.armorQuality = itemData.armorQuality || 0;
        itemData.blunt = itemData.blunt || 0;
        itemData.edged = itemData.edged || 0;
        itemData.piercing = itemData.piercing || 0;
        itemData.fire = itemData.fire || 0;
    }

    /** @override */
    async _preCreate(data, options, user) {
        super._preCreate(data, options, user);
        const itemData = this.system;

        const updateData = {};
        if (data.img) updateData.img = data.img;

        // If this item is associated with a specific actor, then we can determine
        // some values directly from the actor.
        if (this.actor) {
            // If a weapon or a missile, get the associated skill
            if (
                (this.type === "weapongear" || this.type === "missilegear") &&
                !itemData.assocSkill
            ) {
                updateData["system.assocSkill"] = utility.getAssocSkill(
                    this.name,
                    this.actor.itemTypes.skill,
                    "None",
                );
                itemData.assocSkill = updateData["system.assocSkill"];
            }

            // If it is a spell, initialize the convocation to the
            // first magic skill found; it is really unimportant what the
            // value is, so long as it is a valid skill for this character
            if (this.type === "spell" && !itemData.convocation) {
                // Most spellcasters have two convocations: Neutral and another,
                // maybe several others.  Most spells are going to be of the
                // non-Neutral variety.  So, we want to prefer using the non-Neutral
                // skill by default; if no non-Neutral skills exist, but Neutral does
                // exist, then use that.

                // In the case where the actor is adding a spell but they have no magic
                // convocations, give up and don't make any changes.
                let hasNeutral = false;
                for (let skill of this.actor.itemTypes.skill.values()) {
                    if (skill.system.type === "Magic") {
                        if (skill.name === "Neutral") {
                            hasNeutral = true;
                            continue;
                        }
                        updateData["system.convocation"] = skill.name;
                        itemData.convocation = skill.name;
                        break;
                    }
                }
                if (!updateData["system.convocation"] && hasNeutral) {
                    updateData["system.convocation"] = "Neutral";
                    itemData.convocation = "Neutral";
                }
            }

            // If it is a invocation, initialize the diety to the
            // first ritual skill found; it is really unimportant what the
            // value is, so long as it is a valid skill for this character
            if (itemData.type === "invocation" && !itemData.diety) {
                for (let skill of this.actor.itemTypes.skill.values()) {
                    if (skill.system.type === "Ritual") {
                        updateData["system.diety"] = skill.name;
                        itemData.diety = skill.name;
                        break;
                    }
                }
            }
        }

        // If the image was not specified (or is default),
        // then set it based on the item name
        if (!updateData.img || updateData.img === Item.DEFAULT_ICON)
            updateData.img = utility.getImagePath(itemData.name);

        // Setup Image Icon only if it is currently the default icon
        if (!updateData.img) {
            switch (itemData.type) {
                case "skill":
                    if (itemData.system.type === "Ritual") {
                        updateData.img = utility.getImagePath(HM3.defaultRitualIconName);
                    } else if (itemData.system.type === "Magic") {
                        updateData.img = utility.getImagePath(HM3.defaultMagicIconName);
                    }
                    break;

                case "psionic":
                    updateData.img = utility.getImagePath(HM3.defaultPsionicsIconName);
                    break;

                case "spell":
                    // Base image on convocation name
                    updateData.img = utility.getImagePath(itemData.system.convocation);
                    if (!updateData.img) {
                        // If convocation image wasn't found, use default
                        updateData.img = utility.getImagePath(HM3.defaultMagicIconName);
                    }
                    break;

                case "invocation":
                    // Base image on diety name
                    updateData.img = utility.getImagePath(itemData.system.diety);
                    if (!updateData.img) {
                        // If diety name wasn't found, use default
                        updateData.img = utility.getImagePath(HM3.defaultRitualIconName);
                    }
                    break;

                case "miscgear":
                    updateData.img = utility.getImagePath(HM3.defaultMiscItemIconName);
                    break;

                case "containergear":
                    updateData.img = utility.getImagePath(HM3.defaultContainerIconName);
                    break;

                case "armorgear":
                    updateData.img = utility.getImagePath(HM3.defaultArmorGearIconName);
                    break;

                case "weapongear":
                case "missilegear":
                    updateData.img = utility.getImagePath(itemData.system.assocSkill);
                    break;
            }

            if (!updateData.img) delete updateData.img;
        }

        await this.updateSource(updateData);
    }

    /**
     * Run a custom macro assigned to this item.
     *
     * Returns an object with the following fields:
     *
     * type: Type of roll
     * title: Chat label for Roll,
     * origTarget: Unmodified target value,
     * modifier: Modifier added to origTarget value,
     * modifiedTarget: Final modified target value,
     * rollValue: roll number,
     * isSuccess: is roll successful,
     * isCritical: is roll critical,
     * result: 'MS', 'CS', 'MF', 'CF',
     * description: textual description of roll success or failure,
     * notes: rendered notes,
     */
    async runCustomMacro(rollInput) {
        if (!rollInput) return null;

        if (!this.parent) return null;

        const actor = this.parent;

        const rollResult = {
            type: rollInput.type,
            title: rollInput.title,
            origTarget: rollInput.origTarget,
            modifier: (rollInput.plusMinus === "-" ? -1 : 1) * rollInput.modifier,
            modifiedTarget: rollInput.modifiedTarget,
            rollValue: rollInput.rollValue,
            isSuccess: rollInput.isSuccess,
            isCritical: rollInput.isCritical,
            result:
                rollInput.isSuccess ?
                    rollInput.isCritical ?
                        "CS"
                    :   "MS"
                : rollInput.isCritical ? "CF"
                : "MF",
            description: rollInput.description,
            notes: rollInput.notes,
        };

        if (!this.system.macros.command) return null;

        const macro = await Macro.create(
            {
                name: `${this.name} ${this.type} macro`,
                type: this.system.macros.type,
                scope: "global",
                command: this.system.macros.command,
            },
            { temporary: true },
        );
        if (!macro) {
            console.error(
                `HM3 | Failure initializing macro '${this.name} ${this.type} macro', type=${this.system.macros.type}, command='${this.system.macros.command}'`,
            );
            return null;
        }

        const token = actor.isToken ? actor.token : null;

        return utility.executeMacroScript(macro, {
            actor: actor,
            token: token,
            rollResult: rollResult,
            item: this,
        });
    }

    static calcInjurySeverity(injury) {
        const data = injury.system;

        if (data.injuryLevel === 0) {
            data.severity = "";
        } else if (data.injuryLevel == 1) {
            data.severity = "M1";
        } else if (data.injuryLevel <= 3) {
            data.severity = `S${data.injuryLevel}`;
        } else {
            data.severity = `G${data.injuryLevel}`;
        }
    }

    /**
     * In HM3, PP and UP are low integer values, so we must multiply them by 5 in order to use them for
     * EML calculations.  This function does that.
     *
     * @param {*} value
     * @returns
     */
    static calcPenaltyPct(value) {
        return (value || 0) * 5;
    }
}
