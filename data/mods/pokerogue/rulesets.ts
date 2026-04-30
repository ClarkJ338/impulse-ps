export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',

		onStart(pokemon) {
    if (pokemon.side.id === 'p2') { 
        // 1. Check for specific Boss identifiers
        const isBossSpecies = ['Eternatus', 'Eternatus-Eternamax'].includes(pokemon.baseSpecies.name);
        const isLoneBoss = pokemon.side.pokemon.length === 1;
        
        // 2. Identify if this is the "Ace" (last mon)
        // We use pokemon.side.totalPokemon for a more accurate count in custom battles
        const isLastMon = pokemon.side.pokemon.indexOf(pokemon) === (pokemon.side.totalPokemon - 1);

        if (isBossSpecies || isLoneBoss || isLastMon) {
            // Apply shield scaling based on level
            if (pokemon.level >= 100) {
                pokemon.m.maxShields = 4; 
            } else if (pokemon.level >= 50) {
                pokemon.m.maxShields = 3; 
            } else {
                pokemon.m.maxShields = 2; 
            }
            
            // Adjust count specifically for Trainer Aces that aren't 'Bosses'
            if (isLastMon && !isBossSpecies && !isLoneBoss) {
                pokemon.m.maxShields = 1;
            }

            pokemon.addVolatile('bossshield');
        }
    }
},
	},
};
