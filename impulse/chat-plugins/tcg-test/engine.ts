export interface TCGCard {
    id: string;
    name: string;
    supertype: 'Pokémon' | 'Trainer' | 'Energy';
    subtypes?: string[];
    hp?: string;
    types?: string[];
    images: { small: string, large: string };
    attacks?: { name: string, cost: string[], damage: string, text: string }[];
}

export interface InGameCard extends TCGCard {
    uid: number; // Unique ID for this specific instance in the match
    currentDamage: number;
    attachedEnergy: TCGCard[];
}

export class TCGPlayer {
    userid: string;
    deck: InGameCard[] = [];
    hand: InGameCard[] = [];
    active: InGameCard | null = null;
    bench: InGameCard[] = [];
    prizes: InGameCard[] = [];
    discard: InGameCard[] = [];

    constructor(userid: string) {
        this.userid = userid;
    }

    draw(amount = 1) {
        for (let i = 0; i < amount; i++) {
            const card = this.deck.shift();
            if (card) this.hand.push(card);
        }
    }
}

export class TCGMatch {
    player: TCGPlayer;
    ai: TCGPlayer;
    turn: 'player' | 'ai' = 'player';
    logs: string[] = [];
    private cardUidCounter = 0;

    constructor(userid: string, baseSetData: TCGCard[]) {
        this.player = new TCGPlayer(userid);
        this.ai = new TCGPlayer('AI');
        
        // Setup dummy decks (For testing: 60 random cards from base set)
        this.player.deck = this.generateDummyDeck(baseSetData);
        this.ai.deck = this.generateDummyDeck(baseSetData);

        // Initial Draw
        this.player.draw(7);
        this.ai.draw(7);
        
        // Setup 6 Prizes
        for (let i = 0; i < 6; i++) {
            this.player.prizes.push(this.player.deck.shift()!);
            this.ai.prizes.push(this.ai.deck.shift()!);
        }
        
        this.addLog(`Match started. Player drew 7 cards and set prizes.`);
    }

    private generateDummyDeck(pool: TCGCard[]): InGameCard[] {
        const deck: InGameCard[] = [];
        for (let i = 0; i < 60; i++) {
            const randomCard = pool[Math.floor(Math.random() * pool.length)];
            deck.push({ ...randomCard, uid: this.cardUidCounter++, currentDamage: 0, attachedEnergy: [] });
        }
        return deck;
    }

    addLog(msg: string) {
        this.logs.unshift(msg); // Newest at the top
        if (this.logs.length > 20) this.logs.pop(); // Retention policy
    }

    playBasicPokemon(isPlayer: boolean, uid: number) {
        const activePlayer = isPlayer ? this.player : this.ai;
        
        // Find the card by its unique ID instead of array index
        const handIndex = activePlayer.hand.findIndex(c => c.uid === uid);
        if (handIndex === -1) return false; 
        
        const card = activePlayer.hand[handIndex];

        if (!card || card.supertype !== 'Pokémon' || !card.subtypes?.includes('Basic')) return false;

        if (!activePlayer.active) {
            activePlayer.active = card;
            activePlayer.hand.splice(handIndex, 1);
            this.addLog(`${isPlayer ? 'Player' : 'AI'} set ${card.name} as Active Pokémon.`);
            return true;
        } else if (activePlayer.bench.length < 5) {
            activePlayer.bench.push(card);
            activePlayer.hand.splice(handIndex, 1);
            this.addLog(`${isPlayer ? 'Player' : 'AI'} benched ${card.name}.`);
            return true;
        }
        return false;
    }

    attachEnergy(isPlayer: boolean, uid: number, targetIsActive: boolean, benchIndex?: number) {
        const activePlayer = isPlayer ? this.player : this.ai;
        
        const handIndex = activePlayer.hand.findIndex(c => c.uid === uid);
        if (handIndex === -1) return false;

        const card = activePlayer.hand[handIndex];
        if (!card || card.supertype !== 'Energy') return false;

        const target = targetIsActive ? activePlayer.active : activePlayer.bench[benchIndex!];
        if (!target) return false;

        target.attachedEnergy.push(card);
        activePlayer.hand.splice(handIndex, 1);
        this.addLog(`${isPlayer ? 'Player' : 'AI'} attached ${card.name} to ${target.name}.`);
        return true;
    }

    private processKnockout(isPlayerKnockedOut: boolean) {
        const victim = isPlayerKnockedOut ? this.player : this.ai;
        const attacker = isPlayerKnockedOut ? this.ai : this.player;

        if (victim.active) {
            this.addLog(`${victim.active.name} was Knocked Out!`);
            victim.discard.push(victim.active, ...victim.active.attachedEnergy);
            victim.active = null;

            // Attacker takes a prize
            if (attacker.prizes.length > 0) {
                attacker.hand.push(attacker.prizes.shift()!);
                this.addLog(`${attacker.userid === 'AI' ? 'AI' : 'Player'} took a Prize Card.`);
            }
        }
    }

    attack(isPlayer: boolean, attackIndex: number) {
        const attacker = isPlayer ? this.player : this.ai;
        const defender = isPlayer ? this.ai : this.player;

        if (!attacker.active || !defender.active) return false;
        
        const attackUse = attacker.active.attacks?.[attackIndex];
        if (!attackUse) return false;

        // Extract raw damage number
        const damageRaw = parseInt(attackUse.damage.replace(/[^0-9]/g, ''));
        const damage = isNaN(damageRaw) ? 0 : damageRaw;

        this.addLog(`${attacker.active.name} used ${attackUse.name}!`);

        if (damage > 0) {
            defender.active.currentDamage += damage;
            this.addLog(`It dealt ${damage} damage to ${defender.active.name}.`);

            const hpRaw = parseInt(defender.active.hp || '0');
            if (defender.active.currentDamage >= hpRaw) {
                this.processKnockout(!isPlayer); // If player attacks, AI is knocked out
            }
        }

        // Attacking automatically ends the turn
        this.turn = isPlayer ? 'ai' : 'player';
        if (this.turn === 'ai') this.executeAITurn();
        return true;
    }

    executeAITurn() {
        this.addLog("AI is taking its turn...");
        this.ai.draw(1);

        // 1. Try to play an active pokemon if missing
        if (!this.ai.active) {
            const basic = this.ai.hand.find(c => c.supertype === 'Pokémon' && c.subtypes?.includes('Basic'));
            if (basic) this.playBasicPokemon(false, basic.uid);
        }

        // 2. Try to bench pokemon (Shallow copy to prevent array shifting issues)
        for (const card of [...this.ai.hand]) {
            if (this.ai.bench.length < 5 && card.supertype === 'Pokémon' && card.subtypes?.includes('Basic')) {
                this.playBasicPokemon(false, card.uid);
            }
        }

        // 3. Try to attack
        let attacked = false;
        if (this.ai.active && this.ai.active.attacks && this.ai.active.attacks.length > 0) {
            attacked = this.attack(false, 0); 
        }

        // 4. Failsafe: If the AI couldn't attack, manually pass turn
        if (!attacked) {
            this.addLog("AI ends turn without attacking.");
            this.turn = 'player';
        }

        // 5. Setup the player's turn
        if (this.turn === 'player') {
            this.player.draw(1);
            this.addLog("Player draws a card for turn.");
        }
    }
}
