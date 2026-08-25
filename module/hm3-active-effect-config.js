import { HM3 } from './config.js';

/**
 * Core's ActiveEffectConfig, offering HM3's curated list of effect keys instead
 * of a free-text field.
 *
 * This class had been extending an ApplicationV2 while defining ApplicationV1
 * methods: core's config was converted in v13, so `defaultOptions` and
 * `getData` were never called and the system's own template never rendered.
 * The custom sheet has silently been core's since then, with the key list
 * unavailable and keys typed by hand.
 *
 * Rather than carry a copy of core's change-row template — which is where the
 * old override had drifted furthest, still referencing the removed
 * `colorPicker` helper and the pre-v11 `icon` field — the key list is supplied
 * by giving the schema field its `choices`. `formInput` renders a StringField
 * with choices as a select, so core's own template produces the dropdown.
 *
 * @extends {foundry.applications.sheets.ActiveEffectConfig}
 */
export class HM3ActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["hm3"]
    };

    /**
     * Swap in a `key` field carrying HM3's choices before core renders the row.
     * @override
     */
    async _renderChange(context) {
        const key = context.fields?.key;
        if (key) {
            context.fields = {
                ...context.fields,
                key: new foundry.data.fields.StringField({
                    ...key.options,
                    choices: HM3.activeEffectKey
                })
            };
        }
        return super._renderChange(context);
    }
}
