export const Conditions: {[k: string]: ConditionData} = {
	bossshield: {
		name: 'Boss Shield',
		noCopy: true,

		onStart(pokemon) {
			// If a specific shield count wasn't set by rulesets, default to 4
			if (!pokemon.m.maxShields) {
				pokemon.m.maxShields = 4;
			}

			this.add('-start', pokemon, 'Boss Shield', '[silent]');
			this.add('-message', `${pokemon.name} is protected by ${pokemon.m.maxShields} health shields!`);
		},

		onDamage(damage, target, source, effect) {
			if (effect && effect.effectType !== 'Move') return damage;
			if (!target.m.maxShields) return damage;

			const segmentHP = Math.floor(target.maxhp / target.m.maxShields);
			const currentShieldIndex = Math.ceil(target.hp / segmentHP);
			const shieldThreshold = (currentShieldIndex - 1) * segmentHP;

			if (target.hp - damage < shieldThreshold) {
				const cappedDamage = target.hp - shieldThreshold;
				target.m.shieldJustBroken = true;

				this.add('-message', `A shield broke! The damage was mitigated!`);

				return cappedDamage;
			}

			return damage;
		},

		// onAfterMoveSecondarySelf fires on the attacker (source), not the defender.
		// onAfterMoveSecondary fires on the Pokémon that has the condition (the boss/defender).
		onAfterMoveSecondary(target, source, move) {
			if (target.m.shieldJustBroken) {
				target.m.shieldJustBroken = false;

				if (target.item) {
					const item = target.getItem();
					if (item.isBerry) {
						target.eatItem(true);
					}
				}
			}
		},
	},
};
