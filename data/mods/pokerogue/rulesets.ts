// Define specific shield counts for specific species here!
// Key: species ID. Value: Number of shields.
// This overrides the normal floor-based scaling (e.g. giving Eternatus 5 shields).
// Setting a value to 0 will completely disable shields for that species.
const SPECIES_SHIELDS: { [k: string]: number } = {
	'eternatus': 2,
	'rayquaza': 2,
	'kyogre': 2,
	'groudon': 2,
	'magikarp': 0, // Example of explicitly disabling shields
};

// Define your hand-crafted boss triggers here!
// Key: species ID (lowercase, no spaces). Value: Array of shield triggers.
const SPECIES_TRIGGERS: { [k: string]: (string | string[])[] } = {
	'shedinja': ['abilityChange:wonderguard, spaBoost1', 'healFull'],
};

export const Rulesets: {[k: string]: FormatData} = {
	pokeroguerules: {
		effectType: 'Rule',
		name: 'PokeRogue Rules',
		desc: 'Applies Boss Shields to designated Pokémon and handles custom scaling.',
		
		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p2') { 
				// 1. Check if it's a boss floor
				const isBossFloor = this.room.title && this.room.title.includes('BOSS');
				
				// 2. Extract the Floor Number from the room title!
				let floorNumber = 0;
				if (this.room.title) {
					const match = this.room.title.match(/Floor (\d+)/);
					if (match) floorNumber = parseInt(match[1], 10);
				}

				// Scenario A: Wild Boss Fight
				if (pokemon.side.pokemon.length === 1 && isBossFloor) {
					
					// 1. PRIORITY: Check for custom species shield counts
					if (SPECIES_SHIELDS[pokemon.species.id] !== undefined) {
						pokemon.m.maxShields = SPECIES_SHIELDS[pokemon.species.id];
					} 
					// 2. FALLBACK: Floor-based scaling!
					else if (floorNumber >= 300) {
						pokemon.m.maxShields = 4; // Floor 300+ gets 4 shields
					}
					else if (floorNumber >= 160) {
						pokemon.m.maxShields = 3; // Floor 160+ gets 3 shields
					} else if (floorNumber >= 100) {
						pokemon.m.maxShields = 3; // Floor 100+ gets 2 shields
					} else {
						pokemon.m.maxShields = 1; // Early floors get 1 shields
					}
					
					// Only add the condition if they actually have shields
					if (pokemon.m.maxShields > 0) {
						pokemon.addVolatile('bossshield');
					}
				} 
				
				// Scenario B: Trainer Battle (Shield the Ace)
				else if (pokemon === pokemon.side.pokemon[pokemon.side.pokemon.length - 1] && isBossFloor) {
					// 1. PRIORITY: Custom shield count 
					if (SPECIES_SHIELDS[pokemon.species.id] !== undefined) {
						pokemon.m.maxShields = SPECIES_SHIELDS[pokemon.species.id];
					} 
					// 2. FALLBACK: Floor-based scaling for Trainer Aces!
					else if (floorNumber >= 300) {
						pokemon.m.maxShields = 4; // Floor 300+, Ace gets 4 shields
					else if (floorNumber >= 160) {
						pokemon.m.maxShields = 3; // Floor 160+ Ace gets 3 shields
					} else if (floorNumber >= 100) {
						pokemon.m.maxShields = 2; // Floor 100+ Ace gets 2 shields
					} else {
						pokemon.m.maxShields = 1; // Early floor Ace gets 1 shields
					}
					
					if (pokemon.m.maxShields > 0) {
						pokemon.addVolatile('bossshield');
					}
				}

				// --- SHIELD TRIGGERS LOGIC ---
				if (pokemon.m.maxShields && pokemon.m.maxShields > 0) {
					let triggers: (string | string[])[] = [];
					
					// 1. PRIORITY: Check if we have hand-crafted triggers
					if (SPECIES_TRIGGERS[pokemon.species.id]) {
						triggers = [...SPECIES_TRIGGERS[pokemon.species.id]];
					} 
					// 2. FALLBACK: Dynamic triggers based on typing
					else {
						if (pokemon.hasType('Fire')) triggers.push('spaBoost1');
						if (pokemon.hasType('Water')) triggers.push('defBoost1'); 
						if (pokemon.hasType('Grass')) triggers.push('spdBoost1');
						if (pokemon.hasType('Electric')) triggers.push('speBoost1');
						if (pokemon.hasType('Poison')) triggers.push('atkBoost1'); 
						if (pokemon.hasType('Ice')) triggers.push('spaBoost1'); 
						if (pokemon.hasType('Rock') || pokemon.hasType('Ground')) triggers.push('defBoost1');
						if (pokemon.hasType('Psychic')) triggers.push('spaBoost1'); 
						if (pokemon.hasType('Fairy')) triggers.push('spdBoost1'); 
						if (pokemon.hasType('Fighting')) triggers.push('atkBoost1'); 
						if (pokemon.hasType('Flying')) triggers.push('speBoost1'); 
						if (pokemon.hasType('Ghost') || pokemon.hasType('Dark')) triggers.push('atkDrop1, spaDrop1'); 
						if (pokemon.hasType('Bug')) triggers.push('speBoost1');
						
						// Create a pool of stat boosts
						let availableBoosts = ['atkBoost1', 'spaBoost1', 'speBoost1', 'defBoost1', 'spdBoost1'];
						
						// Filter out any boosts that were already assigned by the typing above
						availableBoosts = availableBoosts.filter(boost => !triggers.some(t => t.includes(boost)));

						// Pad the array with UNIQUE stat boosts if the Pokémon doesn't have enough types
						while (triggers.length < pokemon.m.maxShields - 1) {
							if (availableBoosts.length > 0) {
								// Pick a random boost from the remaining pool
								const randomIndex = Math.floor(Math.random() * availableBoosts.length);
								triggers.push(availableBoosts[randomIndex]);
								// Remove it from the pool so it doesn't get picked again
								availableBoosts.splice(randomIndex, 1);
							} else {
								// Safe fallback just in case we somehow run out of unique stats
								triggers.push('heal25');
							}
						}
						
						// Add a universal heal to the final shield break
						triggers.push('heal25');
					}

					// Safety check: Ensure the array length matches the number of shields.
					while (triggers.length < pokemon.m.maxShields) {
						triggers.push('heal25'); 
					}

					pokemon.m.shieldTriggers = triggers.slice(0, pokemon.m.maxShields);
				}
			}
		},
	},
};
