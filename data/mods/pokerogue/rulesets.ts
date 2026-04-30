export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',

		onBegin() {
			// Apply shields to the AI side at battle start (covers lead Pokémon)
			const aiSide = this.sides[1];
			if (!aiSide) return;

			// Scenario A: Wild Boss Fight (AI has exactly 1 Pokémon)
			if (aiSide.pokemon.length === 1) {
				const boss = aiSide.pokemon[0];
				if (boss.level >= 100) {
					boss.m.maxShields = 4;
				} else if (boss.level >= 50) {
					boss.m.maxShields = 3;
				} else {
					boss.m.maxShields = 2;
				}
				boss.addVolatile('bossshield');
			}

			// Scenario B: Trainer Battle — shield the ace (last slot) if it leads
			else {
				const ace = aiSide.pokemon[aiSide.pokemon.length - 1];
				if (ace && aiSide.active[0] === ace) {
					ace.m.maxShields = 1;
					ace.addVolatile('bossshield');
				}
			}
		},

		onSwitchIn(pokemon) {
			if (pokemon.side.id !== 'p2') return;

			// Scenario A: Wild Boss Fight — already handled in onBegin, skip
			if (pokemon.side.pokemon.length === 1) return;

			// Scenario B: Trainer Battle — apply shield when ace switches in mid-battle
			const ace = pokemon.side.pokemon[pokemon.side.pokemon.length - 1];
			if (pokemon === ace && !pokemon.volatiles['bossshield']) {
				pokemon.m.maxShields = 1;
				pokemon.addVolatile('bossshield');
			}
		},
	},
};
