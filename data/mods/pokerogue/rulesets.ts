export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',
		
		// Run before the battle starts to clean nicknames and load custom data
		onBegin() {
			for (const pokemon of this.getAllPokemon()) {
				// Search for our custom berry tag: e.g., [B:sitrusberry,enigmaberry]
				const berryMatch = pokemon.name.match(/\[B:(.+?)\]/i);
				
				if (berryMatch) {
					// Extract the berries, clean the strings, and store them in the hidden inventory
					pokemon.m.shieldBerries = berryMatch[1].split(',').map(b => b.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
					
					// Erase the tag from the Pokémon's name so it doesn't show up in the battle UI
					pokemon.name = pokemon.name.replace(/\s?\[B:.+?\]/i, '');
					pokemon.fullname = `${pokemon.side.id}: ${pokemon.name}`;
				}
			}
		},

		// Apply the visual shield effect when they actually enter the field
		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p2') { 
				
				// Scenario A: Wild Boss Fight (AI has exactly 1 Pokémon)
				if (pokemon.side.pokemon.length === 1) {
					if (pokemon.level >= 100) {
						pokemon.m.maxShields = 4;
						if (!pokemon.m.shieldBerries) pokemon.m.shieldBerries = ['sitrusberry', 'enigmaberry', 'lumberry'];
					} else if (pokemon.level >= 50) {
						pokemon.m.maxShields = 3; 
						if (!pokemon.m.shieldBerries) pokemon.m.shieldBerries = ['sitrusberry', 'sitrusberry'];
					} else {
						pokemon.m.maxShields = 2; 
						if (!pokemon.m.shieldBerries) pokemon.m.shieldBerries = ['oranberry'];
					}
					
					pokemon.addVolatile('bossshield');
				} 
				
				// Scenario B: Trainer Battle (Shield the Ace)
				else if (pokemon === pokemon.side.pokemon[pokemon.side.pokemon.length - 1]) {
					pokemon.m.maxShields = 1; 
					if (!pokemon.m.shieldBerries) pokemon.m.shieldBerries = []; 
					pokemon.addVolatile('bossshield');
				}
			}
		},
	},
};
