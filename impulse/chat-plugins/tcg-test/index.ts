import { FS } from '../../../lib';
import { TCGMatch, TCGCard, InGameCard } from './engine';

// Load Database
let baseSetData: TCGCard[] = [];
try {
    const rawData = FS('impulse/chat-plugins/tcg-test/base1.json').readIfExistsSync();
    if (rawData) {
        const parsed = JSON.parse(rawData);
        // Safely handles both flat arrays and { data: [] } objects
        baseSetData = Array.isArray(parsed) ? parsed : (parsed.data || []);
    }
} catch (e) {
    console.error("Failed to load Base Set JSON:", e);
}

const activeMatches = new Map<string, TCGMatch>();

// --- UI Helper Functions ---
function renderCard(card: InGameCard | null, isHand: boolean, uidOrIndex: number, isAi: boolean, isActive = false): string {
    // Compact empty slot
    if (!card) return `<div style="width: 75px; height: 104px; border: 1px dashed #888; border-radius: 4px; display: inline-block; vertical-align: top; margin: 1px; text-align: center; line-height: 104px; color: #888; font-size: 10px;">Empty</div>`;

    // Compact card wrapper
    let html = `<div style="width: 75px; display: inline-block; vertical-align: top; margin: 1px; text-align: center; font-size: 10px;">`;
    html += `<img src="${card.images.small}" style="width: 100%; border-radius: 4px;" alt="${card.name}" />`;
    
    // Display Damage and Energy
    if (card.currentDamage > 0) html += `<div style="color: white; background: red; font-weight: bold; border-radius: 3px; margin-top: 1px; font-size: 9px;">${card.currentDamage} DMG</div>`;
    if (card.attachedEnergy?.length > 0) html += `<div style="font-size: 9px; margin-top: 1px;">⚡: ${card.attachedEnergy.length}</div>`;

    // Render Hand Actions (compact buttons)
    if (isHand && !isAi) {
        if (card.supertype === 'Pokémon' && card.subtypes?.includes('Basic')) {
            html += `<button class="button" name="send" value="/tcg playbasic ${uidOrIndex}" style="width: 100%; margin-top: 1px; font-size: 9px; padding: 2px 0;">Play</button>`;
        }
        if (card.supertype === 'Energy') {
            html += `<button class="button" name="send" value="/tcg attach ${uidOrIndex} active" style="width: 100%; margin-top: 1px; font-size: 9px; padding: 2px 0;">Attach</button>`;
        }
    }

    // Render Active Pokémon Attack Actions (compact buttons)
    if (!isHand && !isAi && isActive && card.attacks) {
        card.attacks.forEach((atk, atkIndex) => {
            html += `<button class="button" name="send" value="/tcg attack ${atkIndex}" style="width: 100%; margin-top: 1px; font-size: 8px; padding: 2px 0;">⚔️ ${atk.name}</button>`;
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
            
            const uid = parseInt(target);
            if (isNaN(uid)) return this.errorReply("Invalid card ID.");

            if (match.playBasicPokemon(true, uid)) {
                this.refreshPage('tcg-match');
            } else {
                this.errorReply("Cannot play that card right now.");
            }
        },

        attach(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn.");
            
            const [uidStr, targetType] = target.split(' ');
            const uid = parseInt(uidStr);
            if (isNaN(uid)) return this.errorReply("Invalid card ID.");

            if (match.attachEnergy(true, uid, targetType === 'active')) {
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

            let html = `<div class="pad" style="max-width: 850px; margin: auto; font-size: 13px;">`;

            // --- AI Field (Flexbox Layout) ---
            html += `<div style="background: #e8e8e8; padding: 5px; border-radius: 6px; margin-bottom: 5px;">`;
            html += `<strong>AI Opponent</strong> (Hand: ${match.ai.hand.length} | Deck: ${match.ai.deck.length} | Prizes: ${match.ai.prizes.length})`;
            html += `<div style="display: flex; gap: 5px; margin-top: 3px;">`;
            html += `<div><strong>Active:</strong><br/>${renderCard(match.ai.active, false, 0, true, true)}</div>`;
            html += `<div style="flex-grow: 1; overflow-x: auto; white-space: nowrap;"><strong>Bench:</strong><br/>`;
            for (let i = 0; i < 5; i++) html += renderCard(match.ai.bench[i] || null, false, i, true);
            html += `</div></div></div>`;

            html += `<hr style="margin: 5px 0;"/>`;

            // --- Player Field (Flexbox Layout) ---
            html += `<div style="background: #f0f8ff; padding: 5px; border-radius: 6px; margin-bottom: 5px;">`;
            html += `<strong>Your Field</strong> (Deck: ${match.player.deck.length} | Prizes: ${match.player.prizes.length})`;
            html += `<div style="display: flex; gap: 5px; margin-top: 3px;">`;
            html += `<div><strong>Active:</strong><br/>${renderCard(match.player.active, false, 0, false, true)}</div>`;
            html += `<div style="flex-grow: 1; overflow-x: auto; white-space: nowrap;"><strong>Bench:</strong><br/>`;
            for (let i = 0; i < 5; i++) html += renderCard(match.player.bench[i] || null, false, i, false);
            html += `</div></div></div>`;

            // --- Player Hand ---
            html += `<strong>Your Hand</strong>`;
            html += `<div style="overflow-x: auto; white-space: nowrap; padding-bottom: 5px;">`;
            match.player.hand.forEach((card) => {
                html += renderCard(card, true, card.uid, false);
            });
            html += `</div>`;

            // --- Controls ---
            html += `<div style="padding: 5px; background: #fff; border-top: 1px solid #ccc;">`;
            if (match.turn === 'player') {
                html += `<button class="button" name="send" value="/tcg endturn" style="font-weight: bold; background: #c1e1c1;">End Turn</button> `;
            } else {
                html += `<em>Waiting for AI...</em> `;
            }
            html += `<button class="button" name="send" value="/tcg quit" style="color: red; float: right;">Quit Match</button>`;
            html += `</div>`;

            // --- Game Log (Compacted Height) ---
            html += `<div style="margin-top: 5px; background: #222; color: #fff; padding: 5px; height: 80px; overflow-y: scroll; border-radius: 5px; font-family: monospace; font-size: 11px;">`;
            match.logs.forEach(log => {
                html += `<div>> ${log}</div>`;
            });
            html += `</div>`;

            html += `</div>`;
            this.setHTML(html);
        }
    }
};
