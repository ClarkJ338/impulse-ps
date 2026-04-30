// Shield break trigger options.
// Each key is a trigger name you can assign to a shield slot via pokemon.m.shieldTriggers.
// Every trigger is optional — assign null (or omit) for no effect on that shield.
// Multiple triggers can be combined per shield via an array: ['heal', 'boost', 'sun']
//
// Usage in rulesets:
//   pokemon.m.shieldTriggers = [
//     'heal',              // first shield break: heal
//     ['boost', 'sun'],    // second shield break: boost + set sun
//     null,                // third shield break: nothing
//     'spdBoost',          // fourth shield break: speed boost
//   ];

export const ShieldTriggers: {[k: string]: (this: Battle, target: Pokemon, source: Pokemon | null) => void} = {

	// -------------------------
	// Healing
	// -------------------------

	// Heals the boss for 25% of its max HP
	heal25(target, source) {
		this.heal(Math.floor(target.maxhp * 0.25), target);
		this.add('-message', `${target.name} recovered some HP after the shield broke!`);
	},

	// Heals the boss for 50% of its max HP
	heal50(target, source) {
		this.heal(Math.floor(target.maxhp * 0.5), target);
		this.add('-message', `${target.name} recovered a lot of HP after the shield broke!`);
	},

	// Fully restores the boss's HP
	healFull(target, source) {
		this.heal(target.maxhp, target);
		this.add('-message', `${target.name} fully restored its HP after the shield broke!`);
	},

	// Eats the boss's held berry if it has one
	berry(target, source) {
		if (target.item) {
			const item = target.getItem();
			if (item.isBerry) target.eatItem(true);
		}
	},

	// -------------------------
	// Boss stat boosts
	// -------------------------

	// +1 Attack
	atkBoost1(target, source) {
		this.boost({ atk: 1 }, target);
		this.add('-message', `${target.name}'s Attack rose after the shield broke!`);
	},

	// +2 Attack
	atkBoost2(target, source) {
		this.boost({ atk: 2 }, target);
		this.add('-message', `${target.name}'s Attack sharply rose after the shield broke!`);
	},

	// +4 Attack
	atkBoost4(target, source) {
		this.boost({ atk: 4 }, target);
		this.add('-message', `${target.name}'s Attack drastically rose after the shield broke!`);
	},

	// +1 Defense
	defBoost1(target, source) {
		this.boost({ def: 1 }, target);
		this.add('-message', `${target.name}'s Defense rose after the shield broke!`);
	},

	// +2 Defense
	defBoost2(target, source) {
		this.boost({ def: 2 }, target);
		this.add('-message', `${target.name}'s Defense sharply rose after the shield broke!`);
	},

	// +4 Defense
	defBoost4(target, source) {
		this.boost({ def: 4 }, target);
		this.add('-message', `${target.name}'s Defense drastically rose after the shield broke!`);
	},

	// +1 Sp. Atk
	spaBoost1(target, source) {
		this.boost({ spa: 1 }, target);
		this.add('-message', `${target.name}'s Sp. Atk rose after the shield broke!`);
	},

	// +2 Sp. Atk
	spaBoost2(target, source) {
		this.boost({ spa: 2 }, target);
		this.add('-message', `${target.name}'s Sp. Atk sharply rose after the shield broke!`);
	},

	// +4 Sp. Atk
	spaBoost4(target, source) {
		this.boost({ spa: 4 }, target);
		this.add('-message', `${target.name}'s Sp. Atk drastically rose after the shield broke!`);
	},

	// +1 Sp. Def
	spdBoost1(target, source) {
		this.boost({ spd: 1 }, target);
		this.add('-message', `${target.name}'s Sp. Def rose after the shield broke!`);
	},

	// +2 Sp. Def
	spdBoost2(target, source) {
		this.boost({ spd: 2 }, target);
		this.add('-message', `${target.name}'s Sp. Def sharply rose after the shield broke!`);
	},

	// +4 Sp. Def
	spdBoost4(target, source) {
		this.boost({ spd: 4 }, target);
		this.add('-message', `${target.name}'s Sp. Def drastically rose after the shield broke!`);
	},

	// +1 Speed
	speBoost1(target, source) {
		this.boost({ spe: 1 }, target);
		this.add('-message', `${target.name}'s Speed rose after the shield broke!`);
	},

	// +2 Speed
	speBoost2(target, source) {
		this.boost({ spe: 2 }, target);
		this.add('-message', `${target.name}'s Speed sharply rose after the shield broke!`);
	},

	// +4 Speed
	speBoost4(target, source) {
		this.boost({ spe: 4 }, target);
		this.add('-message', `${target.name}'s Speed drastically rose after the shield broke!`);
	},

	// +1 Accuracy
	accBoost1(target, source) {
		this.boost({ accuracy: 1 }, target);
		this.add('-message', `${target.name}'s Accuracy rose after the shield broke!`);
	},

	// +2 Accuracy
	accBoost2(target, source) {
		this.boost({ accuracy: 2 }, target);
		this.add('-message', `${target.name}'s Accuracy sharply rose after the shield broke!`);
	},

	// +1 Evasion
	evaBoost1(target, source) {
		this.boost({ evasion: 1 }, target);
		this.add('-message', `${target.name}'s Evasion rose after the shield broke!`);
	},

	// +2 Evasion
	evaBoost2(target, source) {
		this.boost({ evasion: 2 }, target);
		this.add('-message', `${target.name}'s Evasion sharply rose after the shield broke!`);
	},

	// -------------------------
	// Attacker stat drops
	// -------------------------

	// -1 Attack on attacker
	atkDrop1(target, source) {
		if (!source) return;
		this.boost({ atk: -1 }, source);
		this.add('-message', `${source.name}'s Attack fell after breaking the shield!`);
	},

	// -2 Attack on attacker
	atkDrop2(target, source) {
		if (!source) return;
		this.boost({ atk: -2 }, source);
		this.add('-message', `${source.name}'s Attack sharply fell after breaking the shield!`);
	},

	// -1 Defense on attacker
	defDrop1(target, source) {
		if (!source) return;
		this.boost({ def: -1 }, source);
		this.add('-message', `${source.name}'s Defense fell after breaking the shield!`);
	},

	// -2 Defense on attacker
	defDrop2(target, source) {
		if (!source) return;
		this.boost({ def: -2 }, source);
		this.add('-message', `${source.name}'s Defense sharply fell after breaking the shield!`);
	},

	// -1 Sp. Atk on attacker
	spaDrop1(target, source) {
		if (!source) return;
		this.boost({ spa: -1 }, source);
		this.add('-message', `${source.name}'s Sp. Atk fell after breaking the shield!`);
	},

	// -2 Sp. Atk on attacker
	spaDrop2(target, source) {
		if (!source) return;
		this.boost({ spa: -2 }, source);
		this.add('-message', `${source.name}'s Sp. Atk sharply fell after breaking the shield!`);
	},

	// -1 Speed on attacker
	speDrop1(target, source) {
		if (!source) return;
		this.boost({ spe: -1 }, source);
		this.add('-message', `${source.name}'s Speed fell after breaking the shield!`);
	},

	// -2 Speed on attacker
	speDrop2(target, source) {
		if (!source) return;
		this.boost({ spe: -2 }, source);
		this.add('-message', `${source.name}'s Speed sharply fell after breaking the shield!`);
	},

	// -------------------------
	// Status on attacker
	// -------------------------

	// Burns the attacker
	burn(target, source) {
		if (source && !source.status) {
			source.setStatus('brn');
			this.add('-message', `${target.name} radiated heat as its shield broke, burning ${source.name}!`);
		}
	},

	// Paralyzes the attacker
	paralyze(target, source) {
		if (source && !source.status) {
			source.setStatus('par');
			this.add('-message', `${target.name} released a static charge as its shield broke, paralyzing ${source.name}!`);
		}
	},

	// Poisons the attacker
	poison(target, source) {
		if (source && !source.status) {
			source.setStatus('psn');
			this.add('-message', `${target.name} released toxins as its shield broke, poisoning ${source.name}!`);
		}
	},

	// Badly poisons the attacker
	toxic(target, source) {
		if (source && !source.status) {
			source.setStatus('tox');
			this.add('-message', `${target.name} released toxins as its shield broke, badly poisoning ${source.name}!`);
		}
	},

	// Puts the attacker to sleep
	sleep(target, source) {
		if (source && !source.status) {
			source.setStatus('slp');
			this.add('-message', `${target.name} released spores as its shield broke, putting ${source.name} to sleep!`);
		}
	},

	// Freezes the attacker
	freeze(target, source) {
		if (source && !source.status) {
			source.setStatus('frz');
			this.add('-message', `${target.name} released a freezing cold as its shield broke, freezing ${source.name}!`);
		}
	},

	// -------------------------
	// Volatile status on attacker
	// -------------------------

	// Confuses the attacker
	confuse(target, source) {
		if (source) {
			source.addVolatile('confusion');
			this.add('-message', `${source.name} became confused after breaking the shield!`);
		}
	},

	// Taunts the attacker
	taunt(target, source) {
		if (source) {
			source.addVolatile('taunt');
			this.add('-message', `${target.name} taunted ${source.name} after the shield broke!`);
		}
	},

	// Encores the attacker
	encore(target, source) {
		if (source) {
			source.addVolatile('encore');
			this.add('-message', `${target.name} forced ${source.name} to keep using the same move!`);
		}
	},

	// -------------------------
	// Direct damage to attacker
	// -------------------------

	// Deals 12.5% max HP to attacker
	recoil12(target, source) {
		if (source) {
			this.damage(Math.floor(source.maxhp * 0.125), source);
			this.add('-message', `${source.name} was hurt by breaking the shield!`);
		}
	},

	// Deals 25% max HP to attacker
	recoil25(target, source) {
		if (source) {
			this.damage(Math.floor(source.maxhp * 0.25), source);
			this.add('-message', `${source.name} was badly hurt by breaking the shield!`);
		}
	},

	// Deals 50% max HP to attacker
	recoil50(target, source) {
		if (source) {
			this.damage(Math.floor(source.maxhp * 0.5), source);
			this.add('-message', `${source.name} took massive damage from breaking the shield!`);
		}
	},

	// -------------------------
	// Weather
	// -------------------------

	sun(target, source) {
		this.field.setWeather('sunnyday');
		this.add('-message', `The sunlight intensified as ${target.name}'s shield broke!`);
	},

	rain(target, source) {
		this.field.setWeather('raindance');
		this.add('-message', `Rain began to fall as ${target.name}'s shield broke!`);
	},

	sandstorm(target, source) {
		this.field.setWeather('sandstorm');
		this.add('-message', `A sandstorm kicked up as ${target.name}'s shield broke!`);
	},

	hail(target, source) {
		this.field.setWeather('hail');
		this.add('-message', `Hail began to fall as ${target.name}'s shield broke!`);
	},

	// -------------------------
	// Terrain
	// -------------------------

	electricTerrain(target, source) {
		this.field.setTerrain('electricterrain');
		this.add('-message', `Electric terrain spread across the field as ${target.name}'s shield broke!`);
	},

	psychicTerrain(target, source) {
		this.field.setTerrain('psychicterrain');
		this.add('-message', `Psychic terrain spread across the field as ${target.name}'s shield broke!`);
	},

	mistyTerrain(target, source) {
		this.field.setTerrain('mistyterrain');
		this.add('-message', `Misty terrain spread across the field as ${target.name}'s shield broke!`);
	},

	grassyTerrain(target, source) {
		this.field.setTerrain('grassyterrain');
		this.add('-message', `Grassy terrain spread across the field as ${target.name}'s shield broke!`);
	},

	// -------------------------
	// Pseudo-weather
	// -------------------------

	trickRoom(target, source) {
		this.field.addPseudoWeather('trickroom');
		this.add('-message', `The dimensions were twisted as ${target.name}'s shield broke!`);
	},

	gravity(target, source) {
		this.field.addPseudoWeather('gravity');
		this.add('-message', `Gravity intensified as ${target.name}'s shield broke!`);
	},

	wonderRoom(target, source) {
		this.field.addPseudoWeather('wonderroom');
		this.add('-message', `Defense and Sp. Def were swapped as ${target.name}'s shield broke!`);
	},

	// -------------------------
	// Hazards on attacker's side
	// -------------------------

	spikes(target, source) {
		if (source) {
			source.side.addSideCondition('spikes');
			this.add('-message', `${target.name} scattered spikes as its shield broke!`);
		}
	},

	toxicSpikes(target, source) {
		if (source) {
			source.side.addSideCondition('toxicspikes');
			this.add('-message', `${target.name} scattered toxic spikes as its shield broke!`);
		}
	},

	stealthRock(target, source) {
		if (source) {
			source.side.addSideCondition('stealthrock');
			this.add('-message', `${target.name} set up rocks as its shield broke!`);
		}
	},

	stickyWeb(target, source) {
		if (source) {
			source.side.addSideCondition('stickyweb');
			this.add('-message', `${target.name} laid a sticky web as its shield broke!`);
		}
	},

	// -------------------------
	// Screens on boss's side
	// -------------------------

	reflect(target, source) {
		target.side.addSideCondition('reflect');
		this.add('-message', `${target.name} put up a Reflect after the shield broke!`);
	},

	lightScreen(target, source) {
		target.side.addSideCondition('lightscreen');
		this.add('-message', `${target.name} put up a Light Screen after the shield broke!`);
	},

	auroraVeil(target, source) {
		target.side.addSideCondition('auroraveil');
		this.add('-message', `${target.name} put up an Aurora Veil after the shield broke!`);
	},

	// -------------------------
	// Ability change on boss
	// -------------------------

	// Swaps the boss's ability to Speed Boost
	abilitySpeedBoost(target, source) {
		target.setAbility('speedboost');
		this.add('-message', `${target.name}'s ability changed after the shield broke!`);
	},

	// Swaps the boss's ability to Regenerator
	abilityRegenerator(target, source) {
		target.setAbility('regenerator');
		this.add('-message', `${target.name}'s ability changed after the shield broke!`);
	},

	// Swaps the boss's ability to Intimidate
	abilityIntimidate(target, source) {
		target.setAbility('intimidate');
		this.add('-message', `${target.name}'s ability changed after the shield broke!`);
	},

	// -------------------------
	// Item removal from attacker
	// -------------------------

	// Strips the attacker's held item
	stripItem(target, source) {
		if (source && source.item) {
			const itemName = source.getItem().name;
			source.setItem('');
			this.add('-message', `${source.name}'s ${itemName} was destroyed by breaking the shield!`);
		}
	},

	// -------------------------
	// Force switch attacker
	// -------------------------

	// Forces the attacker out after the move (like Roar)
	forceSwitch(target, source) {
		this.forceSwitchFlag = true;
		this.add('-message', `${target.name} repelled ${source?.name ?? 'the attacker'} with the force of the shield breaking!`);
	},
};

export const Conditions: {[k: string]: ConditionData} = {
	bossshield: {
		name: 'Boss Shield',
		noCopy: true,

		onStart(pokemon) {
			if (!pokemon.m.maxShields) {
				pokemon.m.maxShields = 4;
			}

			// Each shield has its own HP pool equal to 100% of the Pokemon's max HP.
			// Each shield slot can have a single trigger key or an array of trigger keys.
			// e.g. pokemon.m.shieldTriggers = ['heal25', ['burn', 'spikes'], null, 'speBoost2']
			// Index 0 = first shield to break, last index = final shield before fainting.
			// Use null or omit an index to have no effect on that shield break.
			pokemon.m.shields = Array.from({ length: pokemon.m.maxShields }, (_, i) => ({
				hp: pokemon.maxhp,
				triggerKeys: pokemon.m.shieldTriggers?.[i]
					? ([] as string[]).concat(pokemon.m.shieldTriggers[i])
					: [],
			}));
			pokemon.m.brokenShieldCount = 0;
			pokemon.m.shieldJustBroken = false;
			pokemon.m.lastShieldBreakSource = null;

			this.add('-start', pokemon, 'Boss Shield', '[silent]');
			this.add('-message', `${pokemon.name} is protected by ${pokemon.m.maxShields} health shields!`);
		},

		onDamage(damage, target, source, effect) {
			if (effect && effect.effectType !== 'Move') return damage;
			if (!target.m.shields || target.m.shields.length === 0) return damage;

			let remainingDamage = damage;

			while (remainingDamage > 0 && target.m.shields.length > 0) {
				const currentShield = target.m.shields[target.m.shields.length - 1];

				if (remainingDamage >= currentShield.hp) {
					remainingDamage -= currentShield.hp;
					const brokenShield = target.m.shields.pop()!;

					target.m.shieldJustBroken = true;
					target.m.lastShieldBreakSource = source ?? null;
					target.m.pendingShieldTriggers = target.m.pendingShieldTriggers ?? [];
					target.m.pendingShieldTriggers.push(...brokenShield.triggerKeys);
					target.m.brokenShieldCount++;

					this.add('-message', `A shield broke! ${target.m.shields.length} shield(s) remaining!`);
				} else {
					currentShield.hp -= remainingDamage;
					remainingDamage = 0;
				}
			}

			if (target.m.shields.length > 0) {
				return 0;
			}

			return Math.min(remainingDamage, target.hp);
		},

		onAfterMoveSecondarySelf(source, target, move) {
			if (!target || !target.m.shieldJustBroken) return;

			target.m.shieldJustBroken = false;
			const triggers: (string | null)[] = target.m.pendingShieldTriggers ?? [];
			target.m.pendingShieldTriggers = [];
			const breakSource = target.m.lastShieldBreakSource ?? null;

			for (const triggerKey of triggers) {
				if (!triggerKey) continue;
				const triggerFn = ShieldTriggers[triggerKey];
				if (triggerFn) {
					triggerFn.call(this, target, breakSource);
				}
			}
		},
	},
};
