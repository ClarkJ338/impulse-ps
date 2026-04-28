export const Conditions: {[k: string]: ConditionData} = {
	bossshield: {
		name: 'Boss Shield',
		noCopy: true,
		
		onStart(pokemon) {
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

		onAfterMoveSecondarySelf(source, target, move) {
			if (target && target.m.shieldJustBroken) {
				target.m.shieldJustBroken = false;
				
				// Step 1: If their primary held item is a berry, eat it first
				if (target.item) {
					const item = target.getItem();
					if (item.isBerry) {
						target.eatItem(true);
					}
				}

				// Step 2: Check their hidden "shieldBerries" bag for backups
				if (target.m.shieldBerries && target.m.shieldBerries.length > 0) {
					const nextBerryId = target.m.shieldBerries.shift(); 
					const originalItem = target.item; 
					
					// Temporarily equip the reserve berry and force them to eat it
					target.setItem(nextBerryId);
					this.add('-message', `${target.name} pulled a ${target.getItem().name} from its reserves!`);
					target.eatItem(true);
					
					// Give them their original item back
					if (originalItem) {
						target.setItem(originalItem);
					}
				}
			}
		},
	},
};
