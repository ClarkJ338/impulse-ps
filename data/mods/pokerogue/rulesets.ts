// Define specific shield counts for specific species here!
// Key: species ID. Value: Number of shields.
// This overrides the normal level-based scaling (e.g. giving Eternatus 5 shields).
const SPECIES_SHIELDS: { [k: string]: number } = {
	'eternatus': 5,
	'rayquaza': 4,
	'kyogre': 4,
	'groudon': 4,
};

// Define your hand-crafted boss triggers here!
// Key: species ID (lowercase, no spaces). Value: Array of shield triggers.
const SPECIES_TRIGGERS: { [k: string]: (string | string[])[] } = {
	'eternatus': ['toxicSpikes', 'defBoost2', 'spaBoost2, toxic', 'heal50', 'recoil50'], // 5 triggers for 5 shields
	'rayquaza': ['sun', 'atkBoost2', 'speBoost4', 'healFull'],
	'kyogre': ['rain', 'spaBoost2', 'healFull, paralyze'],
	'groudon': ['sandstorm', 'atkBoost2', 'healFull, burn'],
	'charizard': ['sun', 'spaBoost2, burn', 'heal50'],
	'slaking': ['abilityChange:hugepower', 'atkBoost2', 'healFull'],
	'shedinja': ['abilityChange:wonderguard', 'healFull'],
	// Add as many specific bosses as you want!
};

export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',
		
		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p2') { 
				// Grab the current floor from the battle title (e.g., "PokéRogue Battle - Floor 10: ...")
				const isBossFloor = this.room.title && this.room.title.includes('BOSS');

				// Scenario A: Wild Boss Fight (Only apply if it's actually a Boss floor)
				if (pokemon.side.pokemon.length === 1 && isBossFloor) {
					
					// 1. PRIORITY: Check for custom species shield counts
					if (SPECIES_SHIELDS[pokemon.species.id]) {
						pokemon.m.maxShields = SPECIES_SHIELDS[pokemon.species.id];
					} 
					// 2. FALLBACK: Level-based scaling
					else if (pokemon.level >= 100) {
						pokemon.m.maxShields = 4; // Late game boss gets 4 shields
					} else if (pokemon.level >= 50) {
						pokemon.m.maxShields = 3; // Mid game boss gets 3 shields
					} else {
						pokemon.m.maxShields = 2; // Early game boss gets 2 shields
					}
					
					pokemon.addVolatile('bossshield');
				} 
				
				// Scenario B: Trainer Battle (Shield the Ace)
				else if (pokemon === pokemon.side.pokemon[pokemon.side.pokemon.length - 1] && isBossFloor) {
					// 1. PRIORITY: Custom shield count (so a trainer using Eternatus still gets 5 shields)
					if (SPECIES_SHIELDS[pokemon.species.id]) {
						pokemon.m.maxShields = SPECIES_SHIELDS[pokemon.species.id];
					} 
					// 2. FALLBACK: Trainer Aces get 1 shield normally
					else {
						pokemon.m.maxShields = 1; 
					}
					
					pokemon.addVolatile('bossshield');
				}

				// --- SHIELD TRIGGERS LOGIC ---
				if (pokemon.m.maxShields) {
					let triggers: (string | string[])[] = [];
					
					// 1. PRIORITY: Check if we have hand-crafted triggers for this specific species
					if (SPECIES_TRIGGERS[pokemon.species.id]) {
						triggers = [...SPECIES_TRIGGERS[pokemon.species.id]];
					} 
					// 2. FALLBACK: Dynamic triggers based on typing
					else {
						if (pokemon.hasType('Fire')) triggers.push('sun, burn');
						if (pokemon.hasType('Water')) triggers.push('rain');
						if (pokemon.hasType('Grass')) triggers.push('grassyTerrain');
						if (pokemon.hasType('Electric')) triggers.push('electricTerrain, paralyze');
						if (pokemon.hasType('Poison')) triggers.push('toxicSpikes, toxic');
						if (pokemon.hasType('Ice')) triggers.push('hail, freeze');
						if (pokemon.hasType('Rock') || pokemon.hasType('Ground')) triggers.push('sandstorm, stealthRock');
						if (pokemon.hasType('Psychic')) triggers.push('psychicTerrain, wonderRoom');
						if (pokemon.hasType('Fairy')) triggers.push('mistyTerrain');
						
						// Pad the array with stat boosts if the Pokémon doesn't have enough types
						while (triggers.length < pokemon.m.maxShields - 1) {
							const boosts = ['atkBoost1', 'spaBoost1', 'speBoost1', 'defBoost1', 'spdBoost1'];
							triggers.push(boosts[Math.floor(Math.random() * boosts.length)]);
						}
						
						// Add a universal heal to the final shield break
						triggers.push('heal25');
					}

					// Safety check: Ensure the array length matches the number of shields.
					// If a custom species array was too short, pad the remaining shields with a heal.
					while (triggers.length < pokemon.m.maxShields) {
						triggers.push('heal25'); 
					}

					pokemon.m.shieldTriggers = triggers.slice(0, pokemon.m.maxShields);
				}
			}
		},
	},
};