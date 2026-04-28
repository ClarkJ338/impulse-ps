import {Chat} from '../../server/chat';
import {Rooms} from '../../server/rooms';
import {Users, User} from '../../server/users';
import {Dex} from '../../sim/dex';
import {Teams} from '../../sim/teams';
import {ObjectReadWriteStream} from '../../lib/streams';
import {StreamWorker} from '../../lib/process-manager';

// =======================================================================
// 1. AI BOT INFRASTRUCTURE & STATE TRACKING
// =======================================================================

class NoopStream extends ObjectReadWriteStream<string> {
	override _write(_data: string): void {}
}

const noopWorker = new StreamWorker(new NoopStream());
let botCounter = 0;
const botBattleHandlers = new Map<string, (roomid: string, requestLine: string) => void>();

interface BotState {
	opponentActiveSpecies: string;
}
const botStates = new Map<string, BotState>();

const TRAINER_NAME = 'PokéRogue Challenger';

export function destroyBotUser(botUser: User): void {
	botBattleHandlers.delete(botUser.id);
	botStates.delete(botUser.id);
	for (const c of botUser.connections.slice()) {
		c.onDisconnect();
	}
	if (Users.get(botUser.id) === botUser) {
		Users.delete(botUser);
	}
}

function createBotUser(playerId: string): User {
	const uid = ++botCounter;
	const connId = `pokerogue-bot-${uid}`;
	const botInternalName = `pokeroguebot${uid}`;

	const conn = new Users.Connection(
		connId,
		noopWorker as any,
		String(uid),
		null,
		'127.0.0.1',
		null
	);

	const botUser = new Users.User(conn);
	conn.user = botUser;

	botUser.forceRename(botInternalName, true);
	(botUser as any).name = TRAINER_NAME;
	(botUser as any).named = false;

	botStates.set(botUser.id, { opponentActiveSpecies: '' });

	(botUser as any).sendTo = function (roomid: RoomID | BasicRoom | null, data: string) {
		if (typeof data === 'string') {
			const lines = data.split('\n');
			for (const line of lines) {
				
				if (line.startsWith('|switch|p1a: ') || line.startsWith('|drag|p1a: ') || line.startsWith('|detailschange|p1a: ')) {
					const parts = line.split('|');
					if (parts.length >= 4) {
						const details = parts[3];
						const species = details.split(',')[0]; 
						const state = botStates.get(botUser.id);
						if (state) state.opponentActiveSpecies = species;
					}
				}

				if (line.startsWith('|request|')) {
					const roomidStr = typeof roomid === 'string' ? roomid : (roomid as any)?.roomid ?? '';
					setTimeout(() => {
						const handler = botBattleHandlers.get(botUser.id);
						if (handler) handler(roomidStr, line);
					}, 150);
					break;
				}
			}
		}
	};

	return botUser;
}

// Improved AI Choice Logic
function makeAIChoice(requestJson: string, botId: string): string {
	let request: any;
	try {
		request = JSON.parse(requestJson.startsWith('|request|') ? requestJson.slice(9) : requestJson);
	} catch {
		return 'move 1';
	}

	if (!request || request.wait) return 'pass';

	if (request.teamPreview) {
		const count = request.side?.pokemon?.length ?? 1;
		const order = Array.from({ length: count }, (_, i) => i + 1);
		return `team ${order.join('')}`;
	}

	if (request.forceSwitch) {
		const choices: string[] = [];
		const pokemon = request.side?.pokemon ?? [];
		const chosen: number[] = [];

		for (const forceSwitchEntry of (request.forceSwitch as boolean[])) {
			if (!forceSwitchEntry) {
				choices.push('pass');
				continue;
			}
			const available = pokemon
				.map((p: any, idx: number) => ({ p, idx: idx + 1 }))
				.filter(({ p, idx }: { p: any, idx: number }) =>
					idx > (request.forceSwitch as boolean[]).length &&
					!p.condition?.endsWith(' fnt') &&
					!chosen.includes(idx)
				);
			if (available.length) {
				const pick = available[Math.floor(Math.random() * available.length)];
				chosen.push(pick.idx);
				choices.push(`switch ${pick.idx}`);
			} else {
				choices.push('pass');
			}
		}
		return choices.join(', ');
	}

	if (request.active) {
		const choicesList: string[] = [];
		const state = botStates.get(botId);
		const opponentSpecies = Dex.species.get(state?.opponentActiveSpecies || '');

		for (let i = 0; i < (request.active as any[]).length; i++) {
			const active = (request.active as any[])[i];
			const botActiveMon = request.side?.pokemon?.find((p: any) => p.active);
			const botSpeciesName = botActiveMon ? botActiveMon.details.split(',')[0] : '';
			const botSpecies = Dex.species.get(botSpeciesName);

			const moves: any[] = active?.moves ?? [];
			const usableMoves = moves.filter((m: any) => !m.disabled && (m.pp ?? 1) > 0);

			let chosen = '';
			if (usableMoves.length > 0) {
				const scored = usableMoves.map((m: any) => {
					const moveData = Dex.moves.get(m.id);
					let bp = moveData.basePower ?? 0;
					let score = bp;

					if (bp > 0) {
						let typeMod = 1;

						if (opponentSpecies && opponentSpecies.exists) {
							if (!Dex.getImmunity(moveData.type, opponentSpecies)) {
								typeMod = 0; 
							} else {
								for (const type of opponentSpecies.types) {
									const mod = Dex.getEffectiveness(moveData.type, type);
									if (mod > 0) typeMod *= Math.pow(2, mod);
									if (mod < 0) typeMod /= Math.pow(2, Math.abs(mod));
								}
							}
						}

						if (botSpecies && botSpecies.exists && botSpecies.types.includes(moveData.type)) {
							typeMod *= 1.5;
						}

						score = bp * typeMod;
					}

					if (bp === 0 && moveData.category === 'Status') {
						score = 10;
					}

					return { m, score };
				});

				scored.sort((a: any, b: any) => b.score - a.score);
				chosen = `move ${moves.indexOf(scored[0].m) + 1}`;
			} else {
				chosen = 'move 1';
			}

			if (active.canMegaEvo && Math.random() < 0.5) chosen += ' mega';
			else if (active.canTerastallize && Math.random() < 0.4) chosen += ' terastallize';

			choicesList.push(chosen);
		}

		return choicesList.join(', ') || 'move 1';
	}

	return 'move 1';
}

// =======================================================================
// 2. RUN STATE MANAGEMENT
// =======================================================================

interface ActiveRun {
	currentWave: number;
	room: RoomID;
	botId: string;
}

const activeRuns = new Map<string, ActiveRun>();

// =======================================================================
// 3. CHAT COMMANDS
// =======================================================================

export const commands: Chat.ChatCommands = {
	pokerogue: {
		start(target, room, user) {
			if (activeRuns.has(user.id)) {
				return this.errorReply("You already have an active PokéRogue run!");
			}

			this.sendReplyBox(`<b>Starting a new PokéRogue run!</b><br />Entering Wave 10...`);

			const playerTeamJSON: PokemonSet[] = [
				{
					name: "Tinkaton", species: "Tinkaton", item: "Leftovers", ability: "Mold Breaker",
					moves: ["Play Rough", "Gigaton Hammer", "Swords Dance", "Roost"],
					nature: "Adamant", evs: {hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0},
					level: 10, hp: 100 
				} as any 
			];
			const playerTeam = Teams.pack(playerTeamJSON);

			const bossTeamJSON: PokemonSet[] = [
				{
					// Utilizing the ultra-short nickname tag to safely bypass the 18-char limit
					name: "[B:sit,lum]", 
					species: "Eternatus", 
					item: "Sitrus Berry", 
					ability: "Pressure",
					moves: ["Dynamax Cannon", "Sludge Wave", "Flamethrower", "Recover"],
					nature: "Timid", evs: {hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252},
					level: 5, hp: 100
				} as any
			];
			const bossTeam = Teams.pack(bossTeamJSON);

			const botUser = createBotUser(user.id);
			const botSlot = 'p2' as const;

			let battleRoom: AnyObject | null = null;
			
			try {
				battleRoom = Rooms.createBattle({
					format: 'gen9pokeroguecampaign',
					players: [
						{ user: user, team: playerTeam },
						{ user: botUser, team: bossTeam },
					],
					rated: false,
					tour: false,
				});
			} catch (e) {
				destroyBotUser(botUser);
				Monitor.crashlog(e as Error, 'PokéRogue battle creation');
				return this.errorReply("Failed to create the PokéRogue battle room due to an internal error.");
			}

			if (!battleRoom) {
				destroyBotUser(botUser);
				return this.errorReply("Failed to create the PokéRogue battle room.");
			}

			botBattleHandlers.set(botUser.id, (roomid, requestLine) => {
				const roomObj = Rooms.get(roomid as RoomID);
				if (!roomObj?.battle) return;
				const choice = makeAIChoice(requestLine, botUser.id);
				void roomObj.battle.stream.write(`>${botSlot} ${choice}`);
			});

			activeRuns.set(user.id, {
				currentWave: 10,
				room: battleRoom.roomid,
				botId: botUser.id,
			});

			this.sendReplyBox(`Battle generated! <button class="button" name="joinRoom" value="${battleRoom.roomid}">Join Wave 10</button>`);
		},

		end(target, room, user) {
			const run = activeRuns.get(user.id);
			if (!run) {
				return this.errorReply("You do not have an active run to end.");
			}
			
			const botUser = Users.get(run.botId);
			if (botUser) {
				destroyBotUser(botUser);
			}

			activeRuns.delete(user.id);
			this.sendReply("Your PokéRogue run has been terminated and the AI has been disconnected.");
		},

		help() {
			this.sendReplyBox(
				`<b>PokéRogue Commands:</b><br />` +
				`<code>/pokerogue start</code> - Starts a new run against the AI.<br />` +
				`<code>/pokerogue end</code> - Ends your current run.<br />`
			);
		},
	},
	
	pokeroguehelp() {
		this.parse('/pokerogue help');
	},
};
