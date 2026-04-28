export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',
		
		onBegin() {
			// A dictionary to translate our shortcodes back into full Showdown item IDs
			const berryMap: {[k: string]: string} = {
				'sit': 'sitrusberry',
				'lum': 'lumberry',
				'eni': 'enigmaberry',
				'ora': 'oranberry',
				'lep': 'leppaberry',
				'che': 'chestoberry',
				'pea': 'pechaberry'
			};

			for (const pokemon of this.getAllPokemon()) {
				// Search for the shortcode tag (e.g., [B:sit,lum])
				const berryMatch = pokemon.name.match(/\[B:(.+?)\]/i);
				
				if (berryMatch) {
					// Extract the shortcodes, map them to real berries (fallback to sitrus if typo'd)
					const codes = berryMatch[1].split(',');
					pokemon.m.shieldBerries = codes.map(c => berryMap[c.trim().toLowerCase()] || 'sitrusberry');
					
					// CRITICAL FIX: Erase the tag entirely and restore the proper Species Name!
					pokemon.name = pokemon.species.name;
					// Showdown requires fullname to be updated too (e.g., "p2: Eternatus")
					pokemon.fullname = `${pokemon.side.id}: ${pokemon.species.name}`;
				}
			}
		},

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
