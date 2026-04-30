export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',

		onStart(pokemon) {
    if (pokemon.side.id === 'p2') { 
        // 1. Identify Bosses by Species (Works regardless of team size)
        const bossSpecies = ['Eternatus', 'Eternatus-Eternamax'];
        const isBoss = bossSpecies.includes(pokemon.baseSpecies.name);

        // 2. Identify Trainer Aces using total team size
        // side.pokemon.length grows as mons switch in, but side.totalPokemon is the full team size
        const isAce = pokemon.side.pokemon.length === pokemon.side.totalPokemon;

        if (isBoss || isAce) {
            // Assign shield count based on Level
            if (pokemon.level >= 100) {
                pokemon.m.maxShields = 4;
            } else if (pokemon.level >= 50) {
                pokemon.m.maxShields = 3;
            } else {
                pokemon.m.maxShields = 2;
            }

            // Reduce shield count for non-boss Trainer Aces
            if (isAce && !isBoss) {
                pokemon.m.maxShields = 1;
            }

            pokemon.addVolatile('bossshield');
        }
    }
},
	},
};
