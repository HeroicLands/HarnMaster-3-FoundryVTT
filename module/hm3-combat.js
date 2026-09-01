export class HarnMasterCombat extends Combat {
    /**
     * HarnMaster requires that we re-determine initiative each round, since penalties affecting
     * initiative may change during the course of combat.
     *
     * @override
     */
    async nextRound() {
        const combatantIds = this.combatants.map((c) => c.id);
        await this.rollInitiative(combatantIds);
        return super.nextRound();
    }
}
