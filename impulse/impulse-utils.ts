/**
 * Impulse Utilities
 * Shared helpers for chat-plugins.
 * @author PrinceSky-Git
 */
import { ImpulseDB } from './impulse-db';
import { FS } from '../lib';

// Needed for ensureCustomCSS
const CONFIG_PATH = 'config/custom.css';

/*************************************************************
 * Database availability helpers
 *
 * isDbAvailable() — returns true if ImpulseDB has an active
 * connection, false otherwise.  Cost is a single null check.
 *
 * wrapWithDbCheck(commands, message?) — wraps every handler
 * in a ChatCommands map so that it returns an errorReply when
 * the DB is unavailable instead of throwing a connection error.
 * String aliases (e.g. tcg: 'pokemontcg') are passed through
 * unchanged — PS resolves them internally so the DB check fires
 * naturally on the wrapped target handler.  Aliases must never
 * be placed inside wrapWithDbCheck; keep them outside it at the
 * call site so the PS permission chain stays intact.
 *
 * Usage in any chat-plugin that requires MongoDB:
 *
 *   import { wrapWithDbCheck } from '../../impulse/utils';
 *
 *   export const commands: ChatCommands = {
 *     myplugin: wrapWithDbCheck({
 *       async foo(target, room, user) { ... },
 *       async bar(target, room, user) { ... },
 *     }, "The my-plugin system is currently unavailable."),
 *   };
 *
 * The optional second argument lets each plugin provide a
 * system-specific message instead of the generic default.
 *************************************************************/

const DEFAULT_DB_UNAVAILABLE_MSG =
	'This feature is currently unavailable (database not connected). ' +
	'Please contact an administrator.';

export function isDbAvailable(): boolean {
	return ImpulseDB.isConnected();
}

export function wrapWithDbCheck(
	commands: ChatCommands,
	message: string = DEFAULT_DB_UNAVAILABLE_MSG
): ChatCommands {
	const wrapped: ChatCommands = {};

	for (const [key, value] of Object.entries(commands)) {
		if (typeof value === 'function') {
			// Wrap the handler — the function signature must be preserved so that
			// Pokemon Showdown's command dispatcher can still introspect it
			// (e.g. for the !broadcast / runBroadcast permission checks).
			wrapped[key] = function(this: CommandContext, ...args: any[]) {
				if (!isDbAvailable()) return this.errorReply(message);
				return (value as Function).apply(this, args);
			};
			// Copy any extra properties the original handler may carry
			// (e.g. `aliases`, `broadcastMessage`, etc.)
			Object.assign(wrapped[key], value);
		} else if (typeof value === 'string') {
			// String aliases (e.g. tcg: 'pokemontcg') must NOT be converted to
			// functions. PS resolves aliases internally through the command map,
			// preserving broadcast context, checkCan, and the full permission
			// chain. Converting an alias to a function breaks all of that.
			// The DB check is not needed here either — the alias target's
			// handlers are already wrapped, so the check fires there naturally.
			wrapped[key] = value;
		} else {
			// Nested command objects (sub-maps) pass through unchanged —
			// their individual handlers are already wrapped if they came
			// from a recursive wrapWithDbCheck call.
			wrapped[key] = value;
		}
	}

	return wrapped;
}

/*************************************************************
 * Table rendering helper
 * Used by TCG leaderboard, shop and other commands
 *************************************************************/

export const Table = (title: string, headerRow: string[], dataRows: string[][]): string => {
	let output = `<div class="themed-table-container" style="max-width: 100%; max-height: 380px; overflow-y: auto;">`;
	output += `<h3 class="themed-table-title">${title}</h3>`;
	output += `<table class="themed-table" style="width: 100%; border-collapse: collapse;">`;
	output += `<tr class="themed-table-header">`;
	headerRow.forEach(header => { output += `<th>${header}</th>`; });
	output += `</tr>`;
	dataRows.forEach(row => {
		output += `<tr class="themed-table-row">`;
		row.forEach(cell => { output += `<td>${cell}</td>`; });
		output += `</tr>`;
	});
	output += `</table></div>`;
	return output;
};

/*************************************************************
 * WhiteList helper
 * Used by Management and other commands
 *************************************************************/

export const Check_White_Listed = (user: User): void => {
	if (!Config.WhiteListed?.includes(user.id)) {
		throw new Chat.ErrorMessage('You are not whitelisted to use this command.');
	}
};

/*************************************************************
 * Custom CSS helepr
 * Used by colors and other commands
 *************************************************************/

export const ensureCustomCSS = async (): Promise<void> => {
    try {
        const existing = await FS(CONFIG_PATH).readIfExists();
        if (existing === null || existing === undefined) {
            await FS(CONFIG_PATH).write('');
        }
    } catch (e) {
        console.error('Failed to ensure custom.css exists:', e);
    }
};
