export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',

		onStart(pokemon) {
			if (pokemon.side.id === 'p2') { 
				const sidePokemon = pokemon.side.pokemon;
				const lastIndex = sidePokemon.length - 1;
        
				// Check if this is a lone boss or the last mon in a party
				const isLoneBoss = sidePokemon.length === 1;
				const isLastMon = pokemon.side.pokemon.indexOf(pokemon) === lastIndex;

				if (isLoneBoss || isLastMon) {
					// Apply shield scaling based on level
					if (pokemon.level >= 100) {
						pokemon.m.maxShields = 4; 
					} else if (pokemon.level >= 50) {
						pokemon.m.maxShields = 3; 
					} else {
						pokemon.m.maxShields = 2; 
					}
            

					// If it's just a trainer's ace (and not a lone boss), give fewer shields
					if (isLastMon && !isLoneBoss) {
						pokemon.m.maxShields = 1;
					}

					pokemon.addVolatile('bossshield');
				}
			}
		},
	},
};
