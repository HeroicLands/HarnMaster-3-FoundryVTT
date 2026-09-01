# HarnMaster Foundry VTT System Character Sheet Walkthrough

### Clickable Fields

Many parts of the character sheet consist of clickable fields that will perform a dice roll. Normally when a field is clicked a dialog will appear that asks for more information (e.g., modifiers). If you hold down either SHIFT, CTRL, or ALT when clicking, the roll will attempt to use defaults if possible; but if more information is needed, a dialog will still appear.

All rolls appear in the chat window. See the "Dice Rolls" section below for more details.

## Header

The header of the character sheet is always displayed. This contains overall information, including name, current physical and universal penalties, Endurance (with a bar indicating how current endurance relates to maximum endurance), and move (base and effective).

## Profile Tab

![Profile Tab](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Profile.jpg)

The Profile tab contains general information about your character. This includes the character stats as well as the public information that others can observe from your demeanor.

Each ability stat contains the base ability (in small numbers) and the effective ability (in large numbers, representing the ability after penalties have been applied). There are also two clickable dice icons: one for a d6 roll, and the other for a d100 roll.

## Skills Tab

![Skills Tab](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Skills.jpg)

The skills tab displays all of the skills for the character, separated by skill type, including skill base, mastery level, and effective mastery level (after physical penalty and universal penalty have been applied). Skill rolls can be performed by clicking the icon to the left of the skill name.

### Magic Skills Section

![Magic Skills Section](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Magic_Skills.jpg)

At the bottom of the skills tab is the section for Magic and Ritual skills. Magic skills are based on convocation, and here you provide your Convocational ML.

Ritual skills are available per diety worshipped. Note that this is where piety scores are recorded, since each diety has a separate piety score.

### Skills Detail Dialog

![Skills Tab](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Skill_Detail.jpg)

The skills detail page provides a mechanism for specifying the skill base and mastery level for a skill.

For each skill, you may optionally provide a formula to calculate the skill base. If a valid formula is provided, the skill base input will become read-only in favor of being calculated via the formula.

The format of the formula is:

```
@<ability>, @<ability>, @<ability> [, sunsign, ...] [, modifier]
```

For example, the following is a valid formula:

```
@str, @dex, @agl, Ulandus:2, Aralius, 3
```

This formula indicates:

- Take average of Strength, Dexterity, and Agility
- If character has "Ulandus" sunsign, add 2
- If character has "Aralius" sunsign, add 1
- Add 3

Valid ability identifiers are: `@str`, `@sta`, `@dex`, `@agl`, `@int`, `@aur`, `@wil`, `@eye`, `@hrg`, `@sml`, `@voi`, `@cml`, and `@mor`.

## Combat Tab

![Skills Tab](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Combat.jpg)

At the top of the combat tab are a set of combat statistics, as well as clickable items that allow for common die rolls. _Note: Damage roll here is a generic roll, not specific to any weapon; use the weapon-specific damage in preference to this._

**Injury Note: An Injury Roll should always be performed by the character receiving the injury, not by the attacker.**

### Meele and Missile Weapons

The next section is for melee weapons, with clickable fields for attack, defense, and damage. Note that any weight indicated here will count against the total load.

Following the melee weapons section is the section for missile weapons, which includes thrown weapons, arrows, bolts, sling bullets, etc.

Bows and other missile weapons generally have two aspects: melee and ranged. A bow can be used either as a ranged weapon with arrows, or as a meele weapon (a sort of staff). The bow would show up in melee weapons with its statistics for use as a melee weapon. The statistics for the arrows would be shown under missile weapons.

Weight for spears, javelins, and similar thrown weapons must be handled specially. These should be recorded both as a melee weapon and a missile weapon, but given a "zero" weight under melee weapons, and the weight recorded under the missile category.

### Injuries

The injuries section records character injuries, which are tracked separately. This section is particularly important, since injuries affect universal penalty, physical penalty, and shock rolls.

Blood loss, if used, is tracked as a single separate "injury".

Note that the heal rate is clickable, and will perform a heal roll.

For convenience, the Injury Roll will automatically record any injuries that occur, so they do not need to be manually performed.

As stated earlier, the Injury Roll is performed by the character receiving the injury, not by the attacker. This allows the correct hit probabilities and armor to be determined, and allows for the injury to be recorded correctly.

### Armor Locations

The armor locations section indicates the various hit locations for the character and what armor is covering each location. There are two options here: manual and automatic.

If a piece of armor is entered into the Gear tab, and marked as "equipped", areas covered by that armor will be automatically entered into the appropriate armor locations. For instance, a helm covering the skull will have its armor values added into the "Skull" location. Any location that is automatically filled in this way cannot be modified manually.

For any locations where no "automatic" armor is covering, those areas may be modified manually. Therefore, to specify the Skull area manually, you must ensure that there is no equipped armor in the Gear section that is set to cover the Skull area.

## Esoterics Tab

![Skills Tab](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Esoterics.jpg)

While the skills tab records the convocational and ritual skills for the character, this tab records the spells and/or ritual invocations usable by the character. The icon to the right of the spell and/or invocation name is clickable to perform a casting roll.

The EML here takes into account spell level or invocation circle, as well as the universal penalty.

Psionics are also tracked on this page.

## Gear Tab

![Skills Tab](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Gear.jpg)

This tab records all of the carried items on the character with the exception of weapons (which are recorded on the combat tab). Most importatly here is the armor section. The armor section lists all of the armor and other clothing worn by the character. For details, see the next section.

Each piece of armor (and misc. items) have two extra toggles: equipped and carried. The equipped toggle indicates whether the armor is being worn (vs. carried in a sack or backpack). The carried toggle indicates whether the item is being physically carried by the character (vs. on a horse, on the ground, in a cart, etc.). The carried toggle will affect load calculations and therefore penalties.

Obviously, if an item is not carried it cannot be equipped, so items are automatically unequipped if they are not carried.

### Armor Gear Dialog

![Skills Tab](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_Skills.jpg)

The Armor Gear dialog provides details of a specific piece of armor. You may specify the protective value of the armor, and the locations where that armor is protecting/covering.

Any equipped armor will provide its protective values automatically to all locations where it is covering.

## Dice Rolls

There are a number of rolls performed by this system. Most rolls are self-explanatory, usually a d100 roll which can end in Critical Success, Moderate Success, Moderate Failure, or Critical Failure. d6 rolls are normally only Success or Failure (no criticals).

### Attack/Defense Rolls

![Attack-Defense Chat](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_AtkDef_Rolls.jpg)

When an attack roll is made, a entry is posted to the chat window specifying the weapon, any modifiers, and the result.

The defender then performs a defense roll, specifying the type of defense and any modifiers, which then shows the result.

The players will have to consult the H&acirc;rnMaster combat tables for the results of success or failure.

### Damage/Injury Rolls

![Damage-Injury Chat](https://casualinsight.com/wp-content/uploads/2020/11/FVTT_HM3_DmgInjury_Rolls.jpg)

Once the HarnMaster combat tables indicate that an attack succeeds, the attacker performs a damage roll. This will request the number of dice, the damage aspect (blunt, edged, piercing, or fire), and any additional modifiers. The result will then be displayed.

Finally, the defender performs an Injury roll. This automatically calculates the injury location (or one can be manually specified) based on the location weightings, subtracts any armor at that location, and if injury results calculates the Injury Level and Severity, as well as other effects.
