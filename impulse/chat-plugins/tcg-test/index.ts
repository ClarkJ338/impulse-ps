import { FS } from '../../../lib';
import { TCGMatch, TCGCard, InGameCard } from './engine';

// Load Database
let baseSetData: TCGCard[] = [];
try {
    const rawData = FS('impulse/chat-plugins/tcg-test/base1.json').readIfExistsSync();
    if (rawData) {
        const parsed = JSON.parse(rawData);
        // The API returns { data: [...] }, but the raw GitHub repo JSON is just [...]
        // This safely handles both formats!
        baseSetData = Array.isArray(parsed) ? parsed : (parsed.data || []);
    }
} catch (e) {
    console.error("Failed to load Base Set JSON:", e);
}

const activeMatches = new Map<string, TCGMatch>();

// --- UI Helper Functions ---
function renderCard(card: InGameCard | null, isHand: boolean, index: number, isAi: boolean, isActive = false): string {
    if (!card) return `<div style="width: 120px; height: 167px; border: 2px dashed #888; border-radius: 5px; display: inline-block; vertical-align: top; margin: 2px; text-align: center; line-height: 167px; color: #888;">Empty</div>`;

    let html = `<div style="width: 120px; display: inline-block; vertical-align: top; margin: 2px; text-align: center;">`;
    html += `<img src="${card.images.small}" style="width: 100%; border-radius: 5px;" alt="${card.name}" />`;
    
    // Display Damage and Energy
    if (card.currentDamage > 0) html += `<div style="color: white; background: red; font-weight: bold; border-radius: 3px; margin-top: 2px;">${card.currentDamage} DMG</div>`;
    if (card.attachedEnergy?.length > 0) html += `<div style="font-size: 10px; margin-top: 2px;">⚡ Energy: ${card.attachedEnergy.length}</div>`;

    // Render Hand Actions
    if (isHand && !isAi) {
        if (card.supertype === 'Pokémon' && card.subtypes?.includes('Basic')) {
            html += `<button class="button" name="send" value="/tcg playbasic ${index}" style="width: 100%; margin-top: 2px;">Play to Field</button>`;
        }
        if (card.supertype === 'Energy') {
            html += `<button class="button" name="send" value="/tcg attach ${index} active" style="width: 100%; margin-top: 2px;">Attach to Active</button>`;
        }
    }

    // Render Active Pokémon Attack Actions
    if (!isHand && !isAi && isActive && card.attacks) {
        card.attacks.forEach((atk, atkIndex) => {
            html += `<button class="button" name="send" value="/tcg attack ${atkIndex}" style="width: 100%; margin-top: 2px; font-size: 10px;">⚔️ ${atk.name}</button>`;
        });
    }
    
    html += `</div>`;
    return html;
}

export const commands: Chat.ChatCommands = {
    tcg: {
        start(target, room, user) {
            if (!baseSetData.length) return this.errorReply("TCG Data not loaded on server.");
            if (activeMatches.has(user.id)) return this.errorReply("You already have a match. Use /join view-tcg-match");
            
            activeMatches.set(user.id, new TCGMatch(user.id, baseSetData));
            this.parse('/join view-tcg-match');
        },

        playbasic(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn or no active match.");
            
            const index = parseInt(target);
            if (isNaN(index)) return this.errorReply("Invalid card index.");

            if (match.playBasicPokemon(true, index)) {
                this.refreshPage('tcg-match');
            } else {
                this.errorReply("Cannot play that card right now.");
            }
        },

        attach(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn.");
            
            const [handIdxStr, targetType] = target.split(' ');
            const index = parseInt(handIdxStr);
            if (isNaN(index)) return this.errorReply("Invalid card index.");

            if (match.attachEnergy(true, index, targetType === 'active')) {
                this.refreshPage('tcg-match');
            } else {
                this.errorReply("Could not attach Energy. Do you have a valid target?");
            }
        },

        attack(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn.");
            
            const index = parseInt(target);
            if (isNaN(index)) return this.errorReply("Invalid attack index.");

            if (match.attack(true, index)) {
                this.refreshPage('tcg-match');
            } else {
                this.errorReply("Could not use that attack.");
            }
        },

        endturn(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn or no active match.");

            match.turn = 'ai';
            match.executeAITurn();
            this.refreshPage('tcg-match');
        },

        quit(target, room, user) {
            if (activeMatches.has(user.id)) {
                activeMatches.delete(user.id);
                this.sendReply("You have exited the TCG table.");
                this.closePage('tcg-match');
            }
        }
    }
};

export const pages: Chat.PageTable = {
    tcg: {
        match(query, user, connection) {
            this.title = '[TCG] Table';
            const match = activeMatches.get(user.id);

            if (!match) {
                return this.setHTML(`<div class="pad"><h2>Pokémon TCG Simulator</h2><p>No active match.</p><button class="button" name="send" value="/tcg start">Start Match vs AI</button></div>`);
            }

            let html = `<div class="pad" style="max-width: 850px; margin: auto;">`;

            // --- AI Field ---
            html += `<div style="background: #e8e8e8; padding: 10px; border-radius: 8px; margin-bottom: 10px;">`;
            html += `<h3>AI Opponent (Hand: ${match.ai.hand.length} | Deck: ${match.ai.deck.length} | Prizes: ${match.ai.prizes.length})</h3>`;
            html += `<div><strong>Active:</strong><br/>${renderCard(match.ai.active, false, 0, true, true)}</div>`;
            html += `<div style="margin-top: 10px;"><strong>Bench:</strong><br/>`;
            for (let i = 0; i < 5; i++) html += renderCard(match.ai.bench[i] || null, false, i, true);
            html += `</div></div>`;

            html += `<hr />`;

            // --- Player Field ---
            html += `<div style="background: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 10px;">`;
            html += `<h3>Your Field (Deck: ${match.player.deck.length} | Prizes: ${match.player.prizes.length})</h3>`;
            html += `<div><strong>Active:</strong><br/>${renderCard(match.player.active, false, 0, false, true)}</div>`;
            html += `<div style="margin-top: 10px;"><strong>Bench:</strong><br/>`;
            for (let i = 0; i < 5; i++) html += renderCard(match.player.bench[i] || null, false, i, false);
            html += `</div></div>`;

            // --- Player Hand ---
            html += `<h3>Your Hand</h3>`;
            html += `<div style="overflow-x: auto; white-space: nowrap; padding-bottom: 10px;">`;
            match.player.hand.forEach((card, i) => {
                html += renderCard(card, true, i, false);
            });
            html += `</div>`;

            // --- Controls ---
            html += `<div style="margin-top: 10px; padding: 10px; background: #fff; border-top: 1px solid #ccc;">`;
            if (match.turn === 'player') {
                html += `<button class="button" name="send" value="/tcg endturn" style="font-weight: bold; background: #c1e1c1;">End Turn</button> `;
            } else {
                html += `<em>Waiting for AI...</em> `;
            }
            html += `<button class="button" name="send" value="/tcg quit" style="color: red; float: right;">Quit Match</button>`;
            html += `</div>`;

            // --- Game Log ---
            html += `<div style="margin-top: 15px; background: #222; color: #fff; padding: 10px; height: 140px; overflow-y: scroll; border-radius: 5px; font-family: monospace;">`;
            match.logs.forEach(log => {
                html += `<div>> ${log}</div>`;
            });
            html += `</div>`;

            html += `</div>`;
            this.setHTML(html);
        }
    }
};
