export interface TCGCard {
    id: string;
    name: string;
    supertype: string;
    subtypes?: string[];
    hp?: string;
    types?: string[];
    images: { small: string, large: string };
    attacks?: { name: string, cost: string[], damage: string, text: string }[];
}

export interface InGameCard extends TCGCard {
    uid: number; 
    currentDamage: number;
    attachedEnergy: TCGCard[];
}

// Safely identify Basic Pokemon regardless of JSON formatting
export function isBasicPokemon(card: TCGCard): boolean {
    const isPokemon = card.supertype === 'Pokémon' || card.supertype === 'Pokemon';
    if (!isPokemon) return false;
    
    if (card.subtypes) {
        if (card.subtypes.includes('Stage 1') || card.subtypes.includes('Stage 2') || card.subtypes.includes('MEGA') || card.subtypes.includes('VMAX')) {
            return false;
        }
    }
    return true;
}

export class TCGPlayer {
    userid: string;
    deck: InGameCard[] = [];
    hand: InGameCard[] = [];
    active: InGameCard | null = null;
    bench: (InGameCard | null)[] = [null, null, null, null, null]; 
    prizes: InGameCard[] = [];
    discard: InGameCard[] = [];
    
    selectedUid: number | null = null; 

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
        
        this.player.deck = this.generateDummyDeck(baseSetData);
        this.ai.deck = this.generateDummyDeck(baseSetData);

        this.player.draw(7);
        this.ai.draw(7);
        
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
        this.logs.unshift(msg);
        if (this.logs.length > 20) this.logs.pop(); 
    }

    playBasicPokemon(isPlayer: boolean, uid: number, slot: 'active' | number) {
        const activePlayer = isPlayer ? this.player : this.ai;
        
        const handIndex = activePlayer.hand.findIndex(c => c.uid === uid);
        if (handIndex === -1) return false; 
        
        const card = activePlayer.hand[handIndex];
        if (!isBasicPokemon(card)) return false;

        if (slot === 'active') {
            if (activePlayer.active) return false; 
            activePlayer.active = card;
            activePlayer.hand.splice(handIndex, 1);
            this.addLog(`${isPlayer ? 'Player' : 'AI'} set ${card.name} as Active Pokémon.`);
        } else {
            if (activePlayer.bench[slot]) return false; 
            activePlayer.bench[slot] = card;
            activePlayer.hand.splice(handIndex, 1);
            this.addLog(`${isPlayer ? 'Player' : 'AI'} benched ${card.name}.`);
        }

        if (isPlayer) activePlayer.selectedUid = null; 
        return true;
    }

    attachEnergy(isPlayer: boolean, uid: number, slot: 'active' | number) {
        const activePlayer = isPlayer ? this.player : this.ai;
        
        const handIndex = activePlayer.hand.findIndex(c => c.uid === uid);
        if (handIndex === -1) return false;

        const card = activePlayer.hand[handIndex];
        if (!card.supertype?.includes('Energy')) return false;

        const target = slot === 'active' ? activePlayer.active : activePlayer.bench[slot];
        if (!target) return false;

        target.attachedEnergy.push(card);
        activePlayer.hand.splice(handIndex, 1);
        this.addLog(`${isPlayer ? 'Player' : 'AI'} attached ${card.name} to ${target.name}.`);
        
        if (isPlayer) activePlayer.selectedUid = null;
        return true;
    }

    promote(isPlayer: boolean, benchIndex: number) {
        const activePlayer = isPlayer ? this.player : this.ai;
        
        if (activePlayer.active !== null) return false; // Active is not empty
        
        const card = activePlayer.bench[benchIndex];
        if (!card) return false;

        activePlayer.active = card;
        activePlayer.bench[benchIndex] = null;
        this.addLog(`${isPlayer ? 'Player' : 'AI'} promoted ${card.name} to Active.`);
        return true;
    }

    private processKnockout(isPlayerKnockedOut: boolean) {
        const victim = isPlayerKnockedOut ? this.player : this.ai;
        const attacker = isPlayerKnockedOut ? this.ai : this.player;

        if (victim.active) {
            this.addLog(`${victim.active.name} was Knocked Out!`);
            victim.discard.push(victim.active, ...victim.active.attachedEnergy);
            victim.active = null;

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

        const damageRaw = parseInt(attackUse.damage.replace(/[^0-9]/g, ''));
        const damage = isNaN(damageRaw) ? 0 : damageRaw;

        this.addLog(`${attacker.active.name} used ${attackUse.name}!`);

        if (damage > 0) {
            defender.active.currentDamage += damage;
            this.addLog(`It dealt ${damage} damage to ${defender.active.name}.`);

            const hpRaw = parseInt(defender.active.hp || '0');
            if (defender.active.currentDamage >= hpRaw) {
                this.processKnockout(!isPlayer); 
            }
        }

        if (isPlayer) this.player.selectedUid = null; 

        this.turn = isPlayer ? 'ai' : 'player';
        if (this.turn === 'ai') this.executeAITurn();
        return true;
    }

    executeAITurn() {
        this.addLog("AI is taking its turn...");
        this.ai.draw(1);

        // 1. Try to promote a benched Pokémon if the active was knocked out
        if (!this.ai.active) {
            const benchedIndex = this.ai.bench.findIndex(c => c !== null);
            if (benchedIndex !== -1) {
                this.promote(false, benchedIndex);
            } else {
                // Otherwise play a new basic from hand
                const basic = this.ai.hand.find(c => isBasicPokemon(c));
                if (basic) this.playBasicPokemon(false, basic.uid, 'active');
            }
        }

        // 2. Play basics to bench
        for (const card of [...this.ai.hand]) {
            if (isBasicPokemon(card)) {
                const emptySlot = this.ai.bench.findIndex(c => c === null);
                if (emptySlot !== -1) {
                    this.playBasicPokemon(false, card.uid, emptySlot);
                }
            }
        }

        // 3. Attack
        let attacked = false;
        if (this.ai.active && this.ai.active.attacks && this.ai.active.attacks.length > 0) {
            attacked = this.attack(false, 0); 
        }

        if (!attacked) {
            this.addLog("AI ends turn without attacking.");
            this.turn = 'player';
        }

        if (this.turn === 'player') {
            this.player.draw(1);
            this.addLog("Player draws a card for turn.");
        }
    }
}
