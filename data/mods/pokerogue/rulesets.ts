export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',
		
		// Changed from onBegin() to onSwitchIn(pokemon)
		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p2') { 
				
				// Scenario A: Wild Boss Fight (AI has exactly 1 Pokémon)
				if (pokemon.side.pokemon.length === 1) {
					if (pokemon.level >= 100) {
						pokemon.m.maxShields = 4; // Late game boss gets 4 shields
					} else if (pokemon.level >= 50) {
						pokemon.m.maxShields = 3; // Mid game boss gets 3 shields
					} else {
						pokemon.m.maxShields = 2; // Early game boss gets 2 shields
					}
					
					pokemon.addVolatile('bossshield');
				} 
				
				// Scenario B: Trainer Battle (Shield the Ace)
				else if (pokemon === pokemon.side.pokemon[pokemon.side.pokemon.length - 1]) {
					// Trainer Aces get fewer shields to maintain balance
					pokemon.m.maxShields = 1; 
					pokemon.addVolatile('bossshield');
				}
			}
		},
	},
};
