// chat-plugins/tcg/index.ts
import { FS } from '../../../lib';
import { TCGMatch, TCGCard, InGameCard, isBasicPokemon } from './engine';

// Load Database
let baseSetData: TCGCard[] = [];
try {
    const rawData = FS('impulse/chat-plugins/tcg-test/base1.json').readIfExistsSync();
    if (rawData) {
        const parsed = JSON.parse(rawData);
        baseSetData = Array.isArray(parsed) ? parsed : (parsed.data || []);
    }
} catch (e) {
    console.error("Failed to load Base Set JSON:", e);
}

const activeMatches = new Map<string, TCGMatch>();

// --- Contextual UI Rendering ---
function renderSlot(card: InGameCard | null, context: 'hand' | 'active' | 'bench', targetSlot: number | 'active', isAi: boolean, match: TCGMatch): string {
    const isSelected = card && context === 'hand' && card.uid === match.player.selectedUid;
    const selectedCard = match.player.hand.find(c => c.uid === match.player.selectedUid);

    // Helpers to determine what actions are currently valid
    const isSelectedBasic = selectedCard && isBasicPokemon(selectedCard);
    const isSelectedEnergy = selectedCard && selectedCard.supertype?.includes('Energy');

    const borderStyle = isSelected ? `2px solid #007bff` : `2px solid transparent`;
    const borderDashed = isSelected ? `2px dashed #007bff` : `1px dashed #888`;

    // 1. Render Empty Field Slots
    if (!card) {
        if (!isAi && isSelectedBasic) {
            // Valid drop target for a Basic Pokémon
            return `<button class="button" name="send" value="/tcg place ${targetSlot}" style="width: 75px; height: 104px; margin: 1px; background: #e6f2ff; border: 2px dashed #007bff; border-radius: 6px; cursor: pointer; color: #007bff; font-weight: bold; font-size: 11px;">Place<br/>Here</button>`;
        } else {
            // Un-targetable empty slot
            return `<div style="width: 75px; height: 104px; border: 1px dashed #888; border-radius: 6px; display: inline-block; vertical-align: top; margin: 1px; text-align: center; line-height: 104px; color: #888; font-size: 10px;">Empty</div>`;
        }
    }

    // 2. Determine Action for Occupied Slot (Image Button)
    let btnValue = '';
    let isPromotable = false;
    
    if (context === 'hand' && !isAi) {
        btnValue = isSelected ? `/tcg deselect` : `/tcg select ${card.uid}`;
    } 
    else if ((context === 'active' || context === 'bench') && !isAi) {
        if (isSelectedEnergy) {
            btnValue = `/tcg attach ${targetSlot}`;
        } else if (!selectedCard && context === 'bench' && !match.player.active) {
            // If the Active slot is empty, clicking a benched Pokémon promotes it!
            btnValue = `/tcg promote ${targetSlot}`;
            isPromotable = true;
        } else if (!selectedCard && context === 'active' && card.attacks && card.attacks.length > 0) {
            btnValue = `/tcg attack 0`; 
        }
    }

    // 3. Render the Card with Overlays
    let html = `<div style="width: 75px; display: inline-block; vertical-align: top; margin: 1px; text-align: center; border: ${borderStyle}; border-radius: 6px; position: relative;">`;

    if (btnValue) {
        html += `<button class="button" name="send" value="${btnValue}" style="background: transparent; border: none; padding: 0; margin: 0; width: 100%; cursor: pointer; display: block; box-shadow: none;">`;
    }
    
    html += `<img src="${card.images.small}" style="width: 100%; border-radius: 4px; display: block;" alt="${card.name}" />`;
    
    if (btnValue) {
        // Visual overlays based on context
        if (isSelectedEnergy) {
             html += `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 123, 255, 0.3); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">Attach</div>`;
        } else if (isPromotable) {
             html += `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(40, 167, 69, 0.3); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">Promote</div>`;
        }
        html += `</button>`;
    }

    // Overlay Damage and Energy
    if (card.currentDamage > 0) {
         html += `<div style="position: absolute; top: -2px; right: -2px; color: white; background: #e60000; font-weight: bold; border-radius: 4px; font-size: 10px; padding: 1px 4px; border: 1px solid white; pointer-events: none; box-shadow: 0 1px 2px rgba(0,0,0,0.5);">${card.currentDamage}</div>`;
    }
    if (card.attachedEnergy?.length > 0) {
         html += `<div style="position: absolute; bottom: -2px; right: -2px; color: white; background: #222; border-radius: 4px; font-size: 10px; padding: 1px 4px; border: 1px solid white; pointer-events: none; box-shadow: 0 1px 2px rgba(0,0,0,0.5);">⚡ ${card.attachedEnergy.length}</div>`;
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

        select(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn.");
            
            const uid = parseInt(target);
            match.player.selectedUid = isNaN(uid) ? null : uid;
            this.refreshPage('tcg-match');
        },

        deselect(target, room, user) {
            const match = activeMatches.get(user.id);
            if (match) match.player.selectedUid = null;
            this.refreshPage('tcg-match');
        },

        place(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn.");
            if (match.player.selectedUid === null) return this.errorReply("No card selected.");
            
            const slot = target === 'active' ? 'active' : parseInt(target);
            if (match.playBasicPokemon(true, match.player.selectedUid, slot)) {
                this.refreshPage('tcg-match');
            } else {
                this.errorReply("Cannot place card there. Are you sure it's a Basic Pokémon?");
            }
        },

        attach(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn.");
            if (match.player.selectedUid === null) return this.errorReply("No card selected.");
            
            const slot = target === 'active' ? 'active' : parseInt(target);
            if (match.attachEnergy(true, match.player.selectedUid, slot)) {
                this.refreshPage('tcg-match');
            } else {
                this.errorReply("Cannot attach that card there. Are you sure it's Energy?");
            }
        },

        promote(target, room, user) {
            const match = activeMatches.get(user.id);
            if (!match || match.turn !== 'player') return this.errorReply("Not your turn.");
            
            const index = parseInt(target);
            if (isNaN(index)) return this.errorReply("Invalid bench index.");

            if (match.promote(true, index)) {
                this.refreshPage('tcg-match');
            } else {
                this.errorReply("Could not promote that Pokémon.");
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

            match.player.selectedUid = null; 
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

            // --- AI Field ---
            html += `<div style="background: #e8e8e8; padding: 5px; border-radius: 6px; margin-bottom: 5px;">`;
            html += `<strong>AI Opponent</strong> (Hand: ${match.ai.hand.length} | Deck: ${match.ai.deck.length} | Prizes: ${match.ai.prizes.length})`;
            html += `<div style="display: flex; gap: 5px; margin-top: 3px;">`;
            html += `<div><strong>Active:</strong><br/>${renderSlot(match.ai.active, 'active', 'active', true, match)}</div>`;
            html += `<div style="flex-grow: 1; overflow-x: auto; white-space: nowrap;"><strong>Bench:</strong><br/>`;
            for (let i = 0; i < 5; i++) html += renderSlot(match.ai.bench[i], 'bench', i, true, match);
            html += `</div></div></div>`;

            html += `<hr style="margin: 5px 0;"/>`;

            // --- Player Field ---
            html += `<div style="background: #f0f8ff; padding: 5px; border-radius: 6px; margin-bottom: 5px;">`;
            html += `<strong>Your Field</strong> (Deck: ${match.player.deck.length} | Prizes: ${match.player.prizes.length})`;
            html += `<div style="display: flex; gap: 5px; margin-top: 3px;">`;
            html += `<div><strong>Active:</strong><br/>${renderSlot(match.player.active, 'active', 'active', false, match)}</div>`;
            html += `<div style="flex-grow: 1; overflow-x: auto; white-space: nowrap;"><strong>Bench:</strong><br/>`;
            for (let i = 0; i < 5; i++) html += renderSlot(match.player.bench[i], 'bench', i, false, match);
            html += `</div></div></div>`;

            // --- Player Hand ---
            html += `<strong>Your Hand</strong>`;
            html += `<div style="overflow-x: auto; white-space: nowrap; padding-bottom: 5px;">`;
            match.player.hand.forEach((card) => {
                html += renderSlot(card, 'hand', card.uid, false, match);
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

            // --- Game Log ---
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
