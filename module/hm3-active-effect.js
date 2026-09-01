import { HM3ActiveEffectConfig } from "./hm3-active-effect-config.js";

export class HM3ActiveEffect extends ActiveEffect {
    constructor(...args) {
        super(...args);
    }

    static create(...args) {
        return new HM3ActiveEffect(...args);
    }
}
