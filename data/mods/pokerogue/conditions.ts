// Shield break trigger options.
// Each key is a trigger name you can assign to a shield slot via pokemon.m.shieldTriggers.
// You can pass arguments to triggers using a colon, e.g., 'abilityChange:speedboost'
// You can combine multiple triggers in a single string using commas, e.g., 'heal25, sun, atkBoost2'
//
// Usage in rulesets:
//   pokemon.m.shieldTriggers = [
//     'heal25',                                // first shield break: heal
//     'atkBoost2, sun',                        // second shield break: boost + set sun
//     'abilityChange:hugepower, speBoost2',    // third shield break: change ability + boost speed
//     null,                                    // fourth shield break: nothing
//   ];

export const ShieldTriggers: {[k: string]: (this: Battle, target: Pokemon, source: Pokemon | null, arg?: string) => void} = {

	// -------------------------
	// Healing
	// -------------------------

	heal25(target, source) {
		this.heal(Math.floor(target.maxhp * 0.25), target);
		this.add('-message', `${target.name} recovered some HP after the shield broke!`);
	},

	heal50(target, source) {
		this.heal(Math.floor(target.maxhp * 0.5), target);
		this.add('-message', `${target.name} recovered a lot of HP after the shield broke!`);
	},

	healFull(target, source) {
		this.heal(target.maxhp, target);
		this.add('-message', `${target.name} fully restored its HP after the shield broke!`);
	},

	berry(target, source) {
		if (target.item) {
			const item = target.getItem();
			if (item.isBerry) target.eatItem(true);
		}
	},

	// -------------------------
	// Boss stat boosts
	// -------------------------

	atkBoost1(target) { this.boost({ atk: 1 }, target); this.add('-message', `${target.name}'s Attack rose after the shield broke!`); },
	atkBoost2(target) { this.boost({ atk: 2 }, target); this.add('-message', `${target.name}'s Attack sharply rose after the shield broke!`); },
	atkBoost4(target) { this.boost({ atk: 4 }, target); this.add('-message', `${target.name}'s Attack drastically rose after the shield broke!`); },

	defBoost1(target) { this.boost({ def: 1 }, target); this.add('-message', `${target.name}'s Defense rose after the shield broke!`); },
	defBoost2(target) { this.boost({ def: 2 }, target); this.add('-message', `${target.name}'s Defense sharply rose after the shield broke!`); },
	defBoost4(target) { this.boost({ def: 4 }, target); this.add('-message', `${target.name}'s Defense drastically rose after the shield broke!`); },

	spaBoost1(target) { this.boost({ spa: 1 }, target); this.add('-message', `${target.name}'s Sp. Atk rose after the shield broke!`); },
	spaBoost2(target) { this.boost({ spa: 2 }, target); this.add('-message', `${target.name}'s Sp. Atk sharply rose after the shield broke!`); },
	spaBoost4(target) { this.boost({ spa: 4 }, target); this.add('-message', `${target.name}'s Sp. Atk drastically rose after the shield broke!`); },

	spdBoost1(target) { this.boost({ spd: 1 }, target); this.add('-message', `${target.name}'s Sp. Def rose after the shield broke!`); },
	spdBoost2(target) { this.boost({ spd: 2 }, target); this.add('-message', `${target.name}'s Sp. Def sharply rose after the shield broke!`); },
	spdBoost4(target) { this.boost({ spd: 4 }, target); this.add('-message', `${target.name}'s Sp. Def drastically rose after the shield broke!`); },

	speBoost1(target) { this.boost({ spe: 1 }, target); this.add('-message', `${target.name}'s Speed rose after the shield broke!`); },
	speBoost2(target) { this.boost({ spe: 2 }, target); this.add('-message', `${target.name}'s Speed sharply rose after the shield broke!`); },
	speBoost4(target) { this.boost({ spe: 4 }, target); this.add('-message', `${target.name}'s Speed drastically rose after the shield broke!`); },

	accBoost1(target) { this.boost({ accuracy: 1 }, target); this.add('-message', `${target.name}'s Accuracy rose after the shield broke!`); },
	accBoost2(target) { this.boost({ accuracy: 2 }, target); this.add('-message', `${target.name}'s Accuracy sharply rose after the shield broke!`); },

	evaBoost1(target) { this.boost({ evasion: 1 }, target); this.add('-message', `${target.name}'s Evasion rose after the shield broke!`); },
	evaBoost2(target) { this.boost({ evasion: 2 }, target); this.add('-message', `${target.name}'s Evasion sharply rose after the shield broke!`); },

	// -------------------------
	// Attacker stat drops
	// -------------------------

	atkDrop1(target, source) { if (source) { this.boost({ atk: -1 }, source); this.add('-message', `${source.name}'s Attack fell after breaking the shield!`); } },
	atkDrop2(target, source) { if (source) { this.boost({ atk: -2 }, source); this.add('-message', `${source.name}'s Attack sharply fell after breaking the shield!`); } },
	defDrop1(target, source) { if (source) { this.boost({ def: -1 }, source); this.add('-message', `${source.name}'s Defense fell after breaking the shield!`); } },
	defDrop2(target, source) { if (source) { this.boost({ def: -2 }, source); this.add('-message', `${source.name}'s Defense sharply fell after breaking the shield!`); } },
	spaDrop1(target, source) { if (source) { this.boost({ spa: -1 }, source); this.add('-message', `${source.name}'s Sp. Atk fell after breaking the shield!`); } },
	spaDrop2(target, source) { if (source) { this.boost({ spa: -2 }, source); this.add('-message', `${source.name}'s Sp. Atk sharply fell after breaking the shield!`); } },
	speDrop1(target, source) { if (source) { this.boost({ spe: -1 }, source); this.add('-message', `${source.name}'s Speed fell after breaking the shield!`); } },
	speDrop2(target, source) { if (source) { this.boost({ spe: -2 }, source); this.add('-message', `${source.name}'s Speed sharply fell after breaking the shield!`); } },

	// -------------------------
	// Status on attacker
	// -------------------------

	burn(target, source) {
		if (source && !source.status) {
			source.setStatus('brn');
			this.add('-message', `${target.name} radiated heat as its shield broke, burning ${source.name}!`);
		}
	},

	paralyze(target, source) {
		if (source && !source.status) {
			source.setStatus('par');
			this.add('-message', `${target.name} released a static charge as its shield broke, paralyzing ${source.name}!`);
		}
	},

	poison(target, source) {
		if (source && !source.status) {
			source.setStatus('psn');
			this.add('-message', `${target.name} released toxins as its shield broke, poisoning ${source.name}!`);
		}
	},

	toxic(target, source) {
		if (source && !source.status) {
			source.setStatus('tox');
			this.add('-message', `${target.name} released toxins as its shield broke, badly poisoning ${source.name}!`);
		}
	},

	sleep(target, source) {
		if (source && !source.status) {
			source.setStatus('slp');
			this.add('-message', `${target.name} released spores as its shield broke, putting ${source.name} to sleep!`);
		}
	},

	freeze(target, source) {
		if (source && !source.status) {
			source.setStatus('frz');
			this.add('-message', `${target.name} released a freezing cold as its shield broke, freezing ${source.name}!`);
		}
	},

	// -------------------------
	// Volatile status on attacker
	// -------------------------

	confuse(target, source) {
		if (source) {
			source.addVolatile('confusion');
			this.add('-message', `${source.name} became confused after breaking the shield!`);
		}
	},

	taunt(target, source) {
		if (source) {
			source.addVolatile('taunt');
			this.add('-message', `${target.name} taunted ${source.name} after the shield broke!`);
		}
	},

	encore(target, source) {
		if (source) {
			source.addVolatile('encore');
			this.add('-message', `${target.name} forced ${source.name} to keep using the same move!`);
		}
	},

	// -------------------------
	// Direct damage to attacker
	// -------------------------

	recoil12(target, source) {
		if (source) {
			this.damage(Math.floor(source.maxhp * 0.125), source);
			this.add('-message', `${source.name} was hurt by breaking the shield!`);
		}
	},

	recoil25(target, source) {
		if (source) {
			this.damage(Math.floor(source.maxhp * 0.25), source);
			this.add('-message', `${source.name} was badly hurt by breaking the shield!`);
		}
	},

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
	// Dynamic Ability Change
	// -------------------------

	abilityChange(target, source, arg) {
		if (!arg) return;
		const ability = this.dex.abilities.get(arg);
		if (ability.exists) {
			target.setAbility(ability.id);
			this.add('-message', `${target.name}'s ability changed to ${ability.name} after the shield broke!`);
		}
	},

	// -------------------------
	// Item removal from attacker
	// -------------------------

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
			// Safely check for undefined so 0 doesn't accidentally become 4
			if (pokemon.m.maxShields === undefined) {
				pokemon.m.maxShields = 4;
			}

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

			// Splits by comma first, then by colon to support arguments!
			for (const triggerStrRaw of triggers) {
				if (!triggerStrRaw) continue;
				
				// Support comma-separated strings like 'heal25, sun, abilityChange:hugepower'
				const subTriggers = triggerStrRaw.split(',');
				
				for (let triggerStr of subTriggers) {
					triggerStr = triggerStr.trim();
					if (!triggerStr) continue;
					
					const parts = triggerStr.split(':');
					const triggerKey = parts[0].trim();
					const arg = parts.slice(1).join(':').trim(); 
					
					const triggerFn = ShieldTriggers[triggerKey];
					if (triggerFn) {
						triggerFn.call(this, target, breakSource, arg);
					}
				}
			}
		},
	},
};
