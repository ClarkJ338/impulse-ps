/************************************************
* PokemonShowdown Impulse Server
* Customization chat-plugin
* Includes Custom Colors, Icons, Symbols, Avatars
* and Symbol Colors.
* @author PrinceSky-Git
************************************************/
import * as crypto from 'crypto';
import https from 'https';
import { FS, Utils } from '/../../lib';
import { toID } from '/../../sim/dex';
import { ensureCustomCSS } from '../impulse-utils';

const STAFF_ROOM_ID = 'staff';
const CONFIG_PATH = 'config/custom.css';

const AVATAR_CONFIG = {
	path: 'config/avatars/',
	maxSize: 5 * 1024 * 1024,
	timeout: 10000,
	baseUrl: Config.Avatar_Url || 'impulse-ps.mooo.com/avatars/',
};

const IMAGE_FORMATS: { [ext: string]: number[] } = {
	'.png': [0x89, 0x50, 0x4E, 0x47],
	'.jpg': [0xFF, 0xD8, 0xFF],
	'.gif': [0x47, 0x49, 0x46],
};

const VALID_EXTENSIONS = Object.keys(IMAGE_FORMATS);

const getExtension = (url: string): string => {
	const match = /\.([0-9a-z]+)(?:[?#]|$)/i.exec(url);
	return match ? `.${match[1].toLowerCase()}` : '';
};

const isValidImageSignature = (buffer: Uint8Array, ext: string): boolean => {
	const sig = IMAGE_FORMATS[ext];
	return sig && buffer.length >= sig.length && sig.every((byte, i) => buffer[i] === byte);
};

const displayAvatar = (filename: string): string => {

	const url = `${AVATAR_CONFIG.baseUrl}${filename}?v=${Date.now()}`;
	return `<img src='${url}' width='80' height='80'>`;
};

const notifyAvatarChanges = (
	user: User,
	targetId: string,
	action: 'set' | 'delete',
	filename?: string
): void => {
	const setterColor = Impulse.nameColor(user.name, true, true);
	const targetColor = Impulse.nameColor(targetId, true, true);
	const targetUser = Users.get(targetId);

	let staffMsg = '';
	let userMsg = '';

	if (action === 'set' && filename) {
		const imgHtml = displayAvatar(filename);
		userMsg = `${setterColor} set your custom avatar.<p>${imgHtml}</p><p>Use <code>/avatars</code> to see it!</p>`;
		staffMsg = `<center><strong>${setterColor} set custom avatar for ${targetColor}:</strong><br>${imgHtml}</center>`;
		if (targetUser) targetUser.avatar = filename;
	} else {
		userMsg = `${setterColor} has deleted your custom avatar.`;
		staffMsg = `<strong>${setterColor} deleted custom avatar for ${targetColor}.</strong>`;
		if (targetUser) targetUser.avatar = 1;
	}

	Rooms.get(STAFF_ROOM_ID)?.add(`|html|<div class="infobox">${staffMsg}</div>`).update();
	if (targetUser?.connected) targetUser.popup(`|html|${userMsg}`);
};

const deleteUserAvatarFiles = async (userId: string): Promise<void> => {
	await Promise.all(VALID_EXTENSIONS.map(ext =>
		FS(AVATAR_CONFIG.path + userId + ext).unlinkIfExists()
	));
};

const downloadImage = async (urlStr: string, name: string, ext: string) => {
	try {
		const url = new URL(urlStr);
		if (!['http:', 'https:'].includes(url.protocol)) return { error: 'Invalid protocol' };

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), AVATAR_CONFIG.timeout);

		const res = await fetch(urlStr, { signal: controller.signal }).catch(err => {
			throw new Error(err.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch');
		});
		clearTimeout(timeoutId);

		if (!res.ok) return { error: `HTTP error ${res.status}` };
		if (!res.headers.get('content-type')?.startsWith('image/')) return { error: 'Not an image' };

		const buffer = await res.arrayBuffer();
		if (buffer.byteLength > AVATAR_CONFIG.maxSize) return { error: 'File too large (max 5MB)' };

		const uint8 = new Uint8Array(buffer);
		if (!isValidImageSignature(uint8, ext)) return { error: 'Corrupted or mismatched file type' };

		await FS(AVATAR_CONFIG.path).parentDir().mkdirp();
		await FS(AVATAR_CONFIG.path + name + ext).write(Buffer.from(buffer));

		return { success: true };
	} catch (err: any) {
		return { error: err.message || 'Unknown error' };
	}
};

interface RGB { R: number; G: number; B: number }
interface CustomColors { [userid: string]: string }

const COLORS_DATA_FILE = 'impulse/db/custom-colors.json';
const COLORS_START_TAG = '';
const COLORS_END_TAG = '';

let customColors: CustomColors = {};
const colorCache: Record<string, string> = {};

const loadColors = async (): Promise<void> => {
	try {
		const raw = await FS(COLORS_DATA_FILE).readIfExists();
		if (raw) customColors = JSON.parse(raw);
	} catch (e) {
		console.error('Error loading colors:', e);
		customColors = {};
	}
};

const saveColors = (): void => {
	FS(COLORS_DATA_FILE).writeUpdate(() => JSON.stringify(customColors));
};

export const clearColorCache = (): void => {
	for (const key in colorCache) delete colorCache[key];
};

export const reloadCustomColors = async (): Promise<void> => {
	await loadColors();
	clearColorCache();
};

export const getCustomColors = (): CustomColors => customColors;

export const addCustomColor = (userid: string, color: string): void => {
	customColors[userid] = color;
	colorCache[userid] = color;
	saveColors();
};

export const removeCustomColor = (userid: string): void => {
	delete customColors[userid];
	delete colorCache[userid];
	saveColors();
};

export const validateHexColor = (color: string): boolean =>
	/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);

const HSLToRGB = (H: number, S: number, L: number): RGB => {
	const C = (100 - Math.abs(2 * L - 100)) * S / 100 / 100;
	const X = C * (1 - Math.abs((H / 60) % 2 - 1));
	const m = L / 100 - C / 2;
	let R1 = 0, G1 = 0, B1 = 0;

	const hCase = Math.floor(H / 60);
	if (hCase === 0) { R1 = C; G1 = X; }
	else if (hCase === 1) { R1 = X; G1 = C; }
	else if (hCase === 2) { G1 = C; B1 = X; }
	else if (hCase === 3) { G1 = X; B1 = C; }
	else if (hCase === 4) { R1 = X; B1 = C; }
	else if (hCase === 5) { R1 = C; B1 = X; }

	return { R: R1 + m, G: G1 + m, B: B1 + m };
};

const hashColor = (name: string): string => {
	const id = toID(name);
	if (customColors[id]) return customColors[id];
	if (colorCache[id]) return colorCache[id];

	const hash = crypto.createHash('md5').update(id).digest('hex');
	const H = parseInt(hash.slice(4, 8), 16) % 360;
	const S = (parseInt(hash.slice(0, 4), 16) % 50) + 40;
	let L = Math.floor(parseInt(hash.slice(8, 12), 16) % 20 + 30);

	const { R, G, B } = HSLToRGB(H, S, L);
	const lum = R * R * R * 0.2126 + G * G * G * 0.7152 + B * B * B * 0.0722;
	let HLmod = (lum - 0.2) * -150;
	if (HLmod > 18) HLmod = (HLmod - 18) * 2.5;
	else if (HLmod < 0) HLmod /= 3;

	const Hdist = Math.min(Math.abs(180 - H), Math.abs(240 - H));
	if (Hdist < 15) HLmod += (15 - Hdist) / 3;

	L += HLmod;

	const { R: r, G: g, B: b } = HSLToRGB(H, S, L);
	const toHex = (x: number): string => {
		const hex = Math.round(x * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};

	const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	colorCache[id] = color;
	return color;
};

export const nameColor = (name: string, bold = true, userGroup = false): string => {
	const userId = toID(name);
	const symbol = userGroup && Users.globalAuth.get(userId)
		? `<font color=#948A88>${Users.globalAuth.get(userId)}</font>`
		: '';
	const userName = Utils.escapeHTML(Users.getExact(name)?.name || name);
	return `${symbol}${bold ? '<b>' : ''}<font color=${hashColor(name)}>${userName}</font>${bold ? '</b>' : ''}`;
};

Impulse.nameColor = nameColor;

const reloadCSS = (): void => {
	if (global.Config?.serverid) {
		const url = `https://play.pokemonshowdown.com/customcss.php?server=${Config.serverid}&invalidate`;
		const req = https.get(url, () => { });
		req.on('error', () => { });
		req.end();
	}
};

Impulse.reloadCSS = reloadCSS;

const generateColorCSSRule = (name: string, color: string): string => {
	const id = toID(name);
	return `[class$="chatmessage-${id}"] strong, [class$="chatmessage-${id} mine"] strong, ` +
		`[class$="chatmessage-${id} highlighted"] strong, [id$="-userlist-user-${id}"] strong em, ` +
		`[id$="-userlist-user-${id}"] strong, [id$="-userlist-user-${id}"] span ` +
		`{ color: ${color} !important; }`;
};

const updateColorsCSS = async (): Promise<void> => {
	try {
		const colors = getCustomColors();
		const cssRules = Object.entries(colors)
			.map(([userid, color]) => generateColorCSSRule(userid, color))
			.join('\n');
		const cssBlock = `${COLORS_START_TAG}\n${cssRules}\n${COLORS_END_TAG}`;

		FS(CONFIG_PATH).writeUpdate(() => {
			const fileContent = FS(CONFIG_PATH).readIfExistsSync();
			if (!fileContent.trim()) return `${cssBlock}\n`;

			const startIndex = fileContent.indexOf(COLORS_START_TAG);
			const endIndex = fileContent.indexOf(COLORS_END_TAG);

			if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
				return fileContent.substring(0, startIndex) + cssBlock + fileContent.substring(endIndex + COLORS_END_TAG.length);
			}
			return `${fileContent}\n${cssBlock}\n`;
		});

		if (typeof Impulse !== 'undefined' && Impulse.reloadCSS) Impulse.reloadCSS();
	} catch (err) {
		console.error('Error updating colors CSS:', err);
	}
};

const sendColorNotifications = (user: User, targetName: string, color: string | null): void => {
	const targetUser = Users.get(targetName);
	const userNameColor = nameColor(user.name, true, true);
	const targetNameColor = nameColor(targetName, true, false);

	if (color) {
		if (targetUser?.connected) {
			const escapedName = Utils.escapeHTML(user.name);
			targetUser.popup(`|html|${escapedName} set your custom color to <font color="${color}">${color}</font>.`);
		}
		notifyStaffRoom(`${userNameColor} set custom color for ${targetNameColor} to ${color}.`);
	} else {
		if (targetUser?.connected) targetUser.popup(`${user.name} removed your custom color.`);
		notifyStaffRoom(`${userNameColor} removed custom color for ${targetNameColor}.`);
	}
};

const ICONS_DATA_FILE = 'impulse/db/custom-icons.json';
const ICONS_START_TAG = '';
const ICONS_END_TAG = '';
const DEFAULT_ICON_SIZE = 24;
const MIN_SIZE = 1;
const MAX_SIZE = 100;

interface IconEntry {
	url: string;
	size: number;
	setBy: string;
	createdAt: number;
	updatedAt: number;
}

interface IconData {
	[userid: string]: IconEntry;
}

let iconData: IconData = {};

const saveIconData = (): void => {
	FS(ICONS_DATA_FILE).writeUpdate(() => JSON.stringify(iconData));
};

const loadIconData = async (): Promise<void> => {
	try {
		const raw = await FS(ICONS_DATA_FILE).readIfExists();
		if (raw) iconData = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to load custom icons:', e);
		iconData = {};
	}
};

const validateIconSize = (sizeStr?: string): { valid: boolean; size: number; error?: string } => {
	if (!sizeStr) return { valid: true, size: DEFAULT_ICON_SIZE };
	const size = parseInt(sizeStr);
	if (isNaN(size) || size < MIN_SIZE || size > MAX_SIZE) {
		return { valid: false, size: 0, error: `Invalid size. Use ${MIN_SIZE}-${MAX_SIZE} pixels.` };
	}
	return { valid: true, size };
};

const parseIconArgs = (target: string) => {
	const [name, url, sizeStr] = target.split(',').map(s => s.trim());
	return { name, userId: toID(name), url, sizeStr };
};

const formatSizeDisplay = (size: number): string =>
	size !== DEFAULT_ICON_SIZE ? ` (${size}px)` : '';

const updateIconsCSS = (): void => {
	try {
		const cssRules = Object.entries(iconData).map(([userId, entry]) => {
			const size = entry.size || DEFAULT_ICON_SIZE;
			return `[id$="-userlist-user-${userId}"] { background: url("${entry.url}") right no-repeat !important; background-size: ${size}px!important;}`;
		}).join('\n');

		const cssBlock = `${ICONS_START_TAG}\n${cssRules}\n${ICONS_END_TAG}`;

		FS(CONFIG_PATH).writeUpdate(() => {
			const fileContent = FS(CONFIG_PATH).readIfExistsSync();
			if (!fileContent.trim()) return cssBlock + '\n';

			const startIndex = fileContent.indexOf(ICONS_START_TAG);
			const endIndex = fileContent.indexOf(ICONS_END_TAG);

			if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
				return fileContent.substring(0, startIndex) + cssBlock + fileContent.substring(endIndex + ICONS_END_TAG.length);
			}
			return fileContent + '\n' + cssBlock + '\n';
		});

		if (typeof Impulse !== 'undefined' && Impulse.reloadCSS) Impulse.reloadCSS();
	} catch (err) {
		console.error('Error updating icons CSS:', err);
	}
};

const sendIconNotifications = (
	staffUser: User,
	targetName: string,
	action: string,
	url?: string,
	size: number = DEFAULT_ICON_SIZE
): void => {
	const userId = toID(targetName);
	const sizeDisplay = formatSizeDisplay(size);
	const iconHtml = url ? `<img src="${url}" width="32" height="32">` : '';
	const iconDisplay = iconHtml ? `: ${iconHtml}` : '';

	const user = Users.get(userId);
	if (user?.connected) {
		const staffHtml = Impulse.nameColor(staffUser.name, true, true);
		user.popup(`|html|${staffHtml} ${action}${sizeDisplay}${iconDisplay}<br /><center>Refresh if you don't see it.</center>`);
	}

	const room = Rooms.get(STAFF_ROOM_ID);
	if (room) {
		const staffHtml = Impulse.nameColor(staffUser.name, true, true);
		const targetHtml = Impulse.nameColor(targetName, true, false);
		const logAction = action.replace('has ', '').replace('your userlist icon', `icon for ${targetHtml}`);
		room.add(`|html|<div class="infobox">${staffHtml} ${logAction}${iconDisplay}</div>`).update();
	}
};

const SYMBOL_COLORS_DATA_FILE = 'impulse/db/custom-symbol-colors.json';
const SYMBOLCOLORS_START_TAG = '';
const SYMBOLCOLORS_END_TAG = '';
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$/;

interface SymbolColorEntry {
	color: string;
	setBy: string;
	createdAt: number;
	updatedAt: number;
}

interface SymbolColorData {
	[userid: string]: SymbolColorEntry;
}

let symbolColorData: SymbolColorData = {};

const saveSymbolColorData = (): void => {
	FS(SYMBOL_COLORS_DATA_FILE).writeUpdate(() => JSON.stringify(symbolColorData));
};

const loadSymbolColorData = async (): Promise<void> => {
	try {
		const raw = await FS(SYMBOL_COLORS_DATA_FILE).readIfExists();
		if (raw) symbolColorData = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to load symbol colors:', e);
		symbolColorData = {};
	}
};

const isValidSymbolColor = (color: string): boolean => HEX_REGEX.test(color);

const parseSymbolColorArgs = (target: string) => {
	const [name, color] = target.split(',').map(s => s.trim());
	return { name, userId: toID(name), color };
};

const formatColorSpan = (color: string, content = '■'): string =>
	`<span style="color: ${color}">${content}</span>`;

const updateSymbolColorsCSS = (): void => {
	try {
		const cssRules = Object.entries(symbolColorData).map(([userId, entry]) => {
			const selector = `[id$="-userlist-user-${userId}"] button > em.group`;
			const chatSelector = `[class$="chatmessage-${userId}"] strong small, .groupsymbol`;
			return `${selector} { color: ${entry.color} !important; }\n${chatSelector} { color: ${entry.color} !important; }`;
		}).join('\n');

		const cssBlock = `${SYMBOLCOLORS_START_TAG}\n${cssRules}\n${SYMBOLCOLORS_END_TAG}`;

		FS(CONFIG_PATH).writeUpdate(() => {
			const fileContent = FS(CONFIG_PATH).readIfExistsSync();
			if (!fileContent.trim()) return cssBlock + '\n';

			const startIndex = fileContent.indexOf(SYMBOLCOLORS_START_TAG);
			const endIndex = fileContent.indexOf(SYMBOLCOLORS_END_TAG);

			if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
				return fileContent.substring(0, startIndex) + cssBlock + fileContent.substring(endIndex + SYMBOLCOLORS_END_TAG.length);
			}
			return fileContent + '\n' + cssBlock + '\n';
		});

		if (typeof Impulse !== 'undefined' && Impulse.reloadCSS) Impulse.reloadCSS();
	} catch (err) {
		console.error('Error updating symbol color CSS:', err);
	}
};

const sendSymbolColorNotifications = (
	staffUser: User,
	targetName: string,
	color: string,
	action: 'set' | 'updated' | 'removed'
): void => {
	const userId = toID(targetName);
	const staffHtml = Impulse.nameColor(staffUser.name, true, true);
	const targetHtml = Impulse.nameColor(targetName, true, false);
	const user = Users.get(userId);
	const room = Rooms.get(STAFF_ROOM_ID);

	if (action === 'removed') {
		if (user?.connected) user.popup(`|html|${staffHtml} has removed your symbol color.`);
		if (room) room.add(`|html|<div class="infobox">${staffHtml} removed symbol color for ${targetHtml}.</div>`).update();
		return;
	}

	if (user?.connected) {
		const colorSpan = `<span style="color: ${color}; font-weight: bold;">${color}</span>`;
		user.popup(`|html|${staffHtml} has ${action} your symbol color to ${colorSpan}<br /><center>Refresh if you don't see it.</center>`);
	}

	if (room) {
		room.add(`|html|<div class="infobox">${staffHtml} ${action} symbol color for ${targetHtml}: ${formatColorSpan(color, `■ ${color}`)}</div>`).update();
	}
};

const SYMBOLS_DATA_FILE = 'impulse/db/custom-symbol.json';
const BLOCKED_SYMBOLS = ['➦', '~', '&', '#', '@', '%', '*', '+'];

interface CustomSymbolEntry {
	symbol: string;
	setBy: string;
	createdAt: number;
	updatedAt: number;
}

interface CustomSymbolData {
	[userid: string]: CustomSymbolEntry;
}

let symbolData: CustomSymbolData = {};

const saveSymbolData = (): void => {
	FS(SYMBOLS_DATA_FILE).writeUpdate(() => JSON.stringify(symbolData));
};

const loadSymbolData = async (): Promise<void> => {
	try {
		const raw = await FS(SYMBOLS_DATA_FILE).readIfExists();
		if (raw) symbolData = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to load custom symbols:', e);
		symbolData = {};
	}
};

const parseSymbolArgs = (target: string) => {
	const [name, symbol] = target.split(',').map(s => s.trim());
	return { name, userId: toID(name), symbol };
};

const validateSymbol = (symbol: string): { valid: boolean; error?: string } => {
	if (!symbol || symbol.length !== 1) {
		return { valid: false, error: 'Symbol must be a single character.' };
	}
	if (BLOCKED_SYMBOLS.includes(symbol)) {
		return { valid: false, error: `The following symbols are blocked: ${BLOCKED_SYMBOLS.join(' ')}` };
	}
	return { valid: true };
};

const applyCustomSymbol = (userid: string): void => {
	const user = Users.get(userid) as any;
	if (!user) return;

	const symbolEntry = symbolData[userid];
	if (symbolEntry) {
		if (!user.originalGroup) user.originalGroup = user.tempGroup;
		user.customSymbol = symbolEntry.symbol;
		user.updateIdentity();
	}
};

const removeCustomSymbol = (userid: string): void => {
	const user = Users.get(userid) as any;
	if (!user) return;

	delete user.customSymbol;
	if (user.originalGroup) delete user.originalGroup;
	user.updateIdentity();
};

const sendSymbolNotifications = (
	staffUser: User,
	targetName: string,
	symbol: string,
	action: 'set' | 'updated' | 'removed'
): void => {
	const userId = toID(targetName);
	const staffHtml = Impulse.nameColor(staffUser.name, true, true);
	const targetHtml = Impulse.nameColor(targetName, true, false);
	const user = Users.get(userId);
	const room = Rooms.get(STAFF_ROOM_ID);

	if (action === 'removed') {
		if (user?.connected) user.popup(`|html|${staffHtml} has removed your custom symbol.<br /><center>Refresh to see changes.</center>`);
		if (room) room.add(`|html|<div class="infobox">${staffHtml} removed custom symbol for ${targetHtml}.</div>`).update();
		return;
	}

	if (user?.connected) {
		user.popup(`|html|${staffHtml} has ${action} your custom symbol to: <strong>${symbol}</strong><br /><center>Refresh to see changes.</center>`);
	}

	if (room) {
		room.add(`|html|<div class="infobox">${staffHtml} ${action} custom symbol for ${targetHtml}: <strong>${symbol}</strong></div>`).update();
	}
};

const notifyStaffRoom = (message: string): void => {
	const staffRoom = Rooms.get(STAFF_ROOM_ID);
	if (staffRoom) staffRoom.add(`|html|<div class="infobox">${message}</div>`).update();
};

void (async () => {
	await ensureCustomCSS();
	await Promise.all([
		loadColors(),
		loadIconData(),
		loadSymbolColorData(),
		loadSymbolData(),
	]);
})();

export const commands: Chat.ChatCommands = {

	customavatar: {
		async set(target, room, user) {
			this.checkCan('roomowner');
			const [targetName, url] = target.split(',').map(s => s.trim());
			if (!targetName || !url) return this.parse('/ca help');

			const userId = toID(targetName);
			if (!userId) return this.errorReply('Invalid username.');

			const ext = getExtension(url);
			if (!VALID_EXTENSIONS.includes(ext)) {
				return this.errorReply(`URL must end with ${VALID_EXTENSIONS.join(', ')}`);
			}

			const processedUrl = url.startsWith('http') ? url : `https://${url}`;
			this.sendReply(`Downloading avatar for ${userId}...`);

			const result = await downloadImage(processedUrl, userId, ext);
			if (result.error) return this.errorReply(`Failed: ${result.error}`);

			const filename = userId + ext;

			for (const validExt of VALID_EXTENSIONS) {
				if (validExt !== ext) await FS(AVATAR_CONFIG.path + userId + validExt).unlinkIfExists();
			}

			const userAvatars = Users.Avatars.avatars[userId];
			const alreadyHasAvatar = userAvatars?.allowed.includes(filename);

			if (!Users.Avatars.addPersonal(userId, filename) && !alreadyHasAvatar) {
				await FS(AVATAR_CONFIG.path + filename).unlinkIfExists();
				return this.errorReply('Failed to register avatar. User may be banned from avatars.');
			}

			Users.Avatars.save(true);
			this.sendReply(`|raw|${targetName}'s avatar set successfully.`);
			notifyAvatarChanges(user, userId, 'set', filename);
		},

		async delete(target, room, user) {
			this.checkCan('roomowner');
			const userId = toID(target);
			if (!userId) return this.errorReply('Invalid username.');

			const userAvatars = Users.Avatars.avatars[userId];
			const filename = userAvatars?.allowed[0];

			if (!filename || filename.startsWith('#')) {
				return this.errorReply(`${target} does not have a custom avatar set.`);
			}

			try {
				Users.Avatars.removeAllowed(userId, filename);
				Users.Avatars.save(true);
				await deleteUserAvatarFiles(userId);

				this.sendReply(`${target}'s avatar removed.`);
				notifyAvatarChanges(user, userId, 'delete');
			} catch (e) {
				this.errorReply('Error deleting avatar.');
			}
		},

		help() {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Custom Avatar Commands</strong></h4><hr>Commands Alias: /ca</center><hr>` +
				`<b>/customavatar set [user], [url]</b> - Set a user's avatar. Requires: ~<hr>` +
				`<b>/customavatar delete [user]</b> - Remove a user's avatar. Requires: ~<hr></div>`
			);
		},
	},
	ca: 'customavatar',
	customavatarhelp: 'customavatar.help',
	cahelp: 'customavatar.help',

	customcolor: {
		''(target, room, user) {
			this.parse('/cc help');
		},

		async set(target: string, room: ChatRoom, user: User) {
			this.checkCan('roomowner');
			const [name, color] = target.split(',').map(t => t.trim());
			if (!name || !color) return this.parse('/cc help');

			const targetId = toID(name);
			if (targetId.length > 19) throw new Chat.ErrorMessage('Usernames are not this long...');
			if (!validateHexColor(color)) throw new Chat.ErrorMessage('Invalid hex format. Use #RGB or #RRGGBB.');

			addCustomColor(targetId, color);
			await updateColorsCSS();

			const escapedName = Utils.escapeHTML(name);
			this.sendReply(`|raw|You have given <b><font color="${color}">${escapedName}</font></b> a custom color.`);
			sendColorNotifications(user, name, color);
		},

		async delete(target, room, user) {
			this.checkCan('roomowner');
			if (!target) return this.parse('/cc help');

			const targetId = toID(target);
			const colors = getCustomColors();
			if (!colors[targetId]) throw new Chat.ErrorMessage(`${target} does not have a custom color.`);

			removeCustomColor(targetId);
			await updateColorsCSS();

			this.sendReply(`You removed ${target}'s custom color.`);
			sendColorNotifications(user, target, null);
		},

		preview(target, room, user) {
			if (!this.runBroadcast()) return;
			const [name, color] = target.split(',').map(t => t.trim());
			if (!name || !color) return this.parse('/cc help');
			if (!validateHexColor(color)) throw new Chat.ErrorMessage('Invalid hex format. Use #RGB or #RRGGBB.');

			const escapedName = Utils.escapeHTML(name);
			return this.sendReplyBox(`<b><font size="3" color="${color}">${escapedName}</font></b>`);
		},

		async reload(target: string, room: ChatRoom, user: User) {
			this.checkCan('roomowner');
			await reloadCustomColors();
			await updateColorsCSS();
			this.privateModAction(`(${user.name} has reloaded custom colours.)`);
		},

		help() {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Custom Color Commands</strong></h4><hr>Commands Alias: /cc</center><hr>` +
				`<b>/customcolor set [user], [hex]</b> - Set color for a user. Requires: ~<hr>` +
				`<b>/customcolor delete [user]</b> - Delete color for a user. Requires: ~<hr>` +
				`<b>/customcolor reload</b> - Reload all custom colors. Requires: ~<hr>` +
				`<b>/customcolor preview [user], [hex]</b> - Preview color for a user.<hr>` +
				`<center><small>Format: #RGB or #RRGGBB</small></center></div>`
			);
		},
	},
	cc: 'customcolor',
	customcolorhelp: 'customcolor.help',
	cchelp: 'customcolor.help',

	usericon: 'icon',
	ic: 'icon',
	icon: {
		''(target) {
			this.parse('/iconhelp');
		},

		set(target, room, user) {
			this.checkCan('roomowner');
			const { name, userId, url, sizeStr } = parseIconArgs(target);

			if (!name || !url) return this.parse('/icon help');
			if (userId.length > 19) throw new Chat.ErrorMessage('Usernames are not this long...');

			if (iconData[userId]) {
				throw new Chat.ErrorMessage('User already has icon. Remove with /icon delete [user].');
			}

			const { valid, size, error } = validateIconSize(sizeStr);
			if (!valid) throw new Chat.ErrorMessage(error!);

			const now = Date.now();
			iconData[userId] = { url, size, setBy: user.id, createdAt: now, updatedAt: now };
			saveIconData();
			updateIconsCSS();

			const targetHtml = Impulse.nameColor(name, true, false);
			this.sendReply(`|raw|You have given ${targetHtml} an icon${formatSizeDisplay(size)}.`);
			sendIconNotifications(user, name, 'has set your userlist icon', url, size);
		},

		update(target, room, user) {
			this.checkCan('roomowner');
			const { name, userId, url, sizeStr } = parseIconArgs(target);

			if (!name) return this.parse('/icon help');
			if (!iconData[userId]) throw new Chat.ErrorMessage('User does not have icon. Use /icon set.');

			const updateFields: Partial<IconEntry> = { updatedAt: Date.now() };
			if (url) updateFields.url = url;

			if (sizeStr) {
				const { valid, size, error } = validateIconSize(sizeStr);
				if (!valid) throw new Chat.ErrorMessage(error!);
				updateFields.size = size;
			}

			Object.assign(iconData[userId], updateFields);
			saveIconData();
			updateIconsCSS();

			const newSize = iconData[userId].size;
			const newUrl = iconData[userId].url;

			const targetHtml = Impulse.nameColor(name, true, false);
			this.sendReply(`|raw|You have updated ${targetHtml}'s icon${formatSizeDisplay(newSize)}.`);
			sendIconNotifications(user, name, 'has updated your userlist icon', newUrl, newSize);
		},

		delete(target, room, user) {
			this.checkCan('roomowner');
			const userId = toID(target);

			if (!iconData[userId]) throw new Chat.ErrorMessage(`${target} does not have an icon.`);

			delete iconData[userId];
			saveIconData();
			updateIconsCSS();

			this.sendReply(`You removed ${target}'s icon.`);
			sendIconNotifications(user, target, 'has removed your userlist icon');
		},

		help() {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Custom Icon Commands</strong></h4><hr>Commands Alias: /ic</center><hr>` +
				`<b>/icon set [user], [url], [size]</b> - Set icon (${DEFAULT_ICON_SIZE}-${MAX_SIZE}px). Requires: ~<hr>` +
				`<b>/icon update [user], [url], [size]</b> - Update icon. Requires: ~<hr>` +
				`<b>/icon delete [user]</b> - Remove icon. Requires: ~<hr></div>`
			);
		},
	},

	iconhelp: 'icon.help',
	ichelp: 'icon.help',

	symbolcolor: {
		set(this: CommandContext, target: string, room: Room, user: User) {
			this.checkCan('roomowner');
			const { name, userId, color } = parseSymbolColorArgs(target);

			if (!name || !color) return this.parse('/sc help');
			if (userId.length > 19) throw new Chat.ErrorMessage('Usernames are not this long...');
			if (!isValidSymbolColor(color)) throw new Chat.ErrorMessage('Invalid color. Use hex format: #FF5733 or #F73');

			if (symbolColorData[userId]) {
				throw new Chat.ErrorMessage('User already has symbol color. Remove with /symbolcolor delete.');
			}

			const now = Date.now();
			symbolColorData[userId] = { color, setBy: user.id, createdAt: now, updatedAt: now };
			saveSymbolColorData();
			updateSymbolColorsCSS();

			const targetHtml = Impulse.nameColor(name, true, false);
			this.sendReply(`|raw|You have given ${targetHtml} a symbol color: ${formatColorSpan(color)}`);
			sendSymbolColorNotifications(user, name, color, 'set');
		},

		update(this: CommandContext, target: string, room: Room, user: User) {
			this.checkCan('roomowner');
			const { name, userId, color } = parseSymbolColorArgs(target);

			if (!name || !color) return this.parse('/sc help');
			if (!isValidSymbolColor(color)) throw new Chat.ErrorMessage('Invalid color. Use hex format: #FF5733 or #F73');
			if (!symbolColorData[userId]) throw new Chat.ErrorMessage('User does not have symbol color. Use /symbolcolor set.');

			symbolColorData[userId].color = color;
			symbolColorData[userId].updatedAt = Date.now();
			saveSymbolColorData();
			updateSymbolColorsCSS();

			const targetHtml = Impulse.nameColor(name, true, false);
			this.sendReply(`|raw|You have updated ${targetHtml}'s symbol color to: ${formatColorSpan(color)}`);
			sendSymbolColorNotifications(user, name, color, 'updated');
		},

		delete(this: CommandContext, target: string, room: Room, user: User) {
			this.checkCan('roomowner');
			const userId = toID(target);

			if (!symbolColorData[userId]) throw new Chat.ErrorMessage(`${target} does not have a symbol color.`);

			delete symbolColorData[userId];
			saveSymbolColorData();
			updateSymbolColorsCSS();

			this.sendReply(`You removed ${target}'s symbol color.`);
			sendSymbolColorNotifications(user, target, '', 'removed');
		},

		help() {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Custom Symbol Color Commands</strong></h4><hr>Commands Alias: /sc</center><hr>` +
				`<b>/symbolcolor set [user], [hex]</b> - Set symbol color. Requires: ~<hr>` +
				`<b>/symbolcolor update [user], [hex]</b> - Update color. Requires: ~<hr>` +
				`<b>/symbolcolor delete [user]</b> - Remove color. Requires: ~<hr>` +
				`<center><small>Format: #FF5733 or #F73</small></center></div>`
			);
		},

		''(target: string, room: Room, user: User) {
			this.parse('/symbolcolor help');
		},
	},
	sc: 'symbolcolor',
	symbolcolorhelp: 'symbolcolor.help',
	schelp: 'symbolcolor.help',

	customsymbol: 'symbol',
	cs: 'symbol',
	symbol: {
		''(target) {
			this.parse('/symbolhelp');
		},

		set(target, room, user) {
			this.checkCan('roomowner');
			const { name, userId, symbol } = parseSymbolArgs(target);

			if (!name || !symbol) return this.parse('/cs help');
			if (userId.length > 19) throw new Chat.ErrorMessage('Usernames are not this long...');

			const validation = validateSymbol(symbol);
			if (!validation.valid) throw new Chat.ErrorMessage(validation.error!);

			if (symbolData[userId]) {
				throw new Chat.ErrorMessage('User already has symbol. Use /symbol update or /symbol delete.');
			}

			const now = Date.now();
			symbolData[userId] = { symbol, setBy: user.id, createdAt: now, updatedAt: now };
			saveSymbolData();
			applyCustomSymbol(userId);

			const targetHtml = Impulse.nameColor(name, true, false);
			this.sendReply(`|raw|You have given ${targetHtml} the custom symbol: ${symbol}`);
			sendSymbolNotifications(user, name, symbol, 'set');
		},

		update(target, room, user) {
			this.checkCan('roomowner');
			const { name, userId, symbol } = parseSymbolArgs(target);

			if (!name || !symbol) return this.parse('/sc help');

			const validation = validateSymbol(symbol);
			if (!validation.valid) throw new Chat.ErrorMessage(validation.error!);
			if (!symbolData[userId]) throw new Chat.ErrorMessage('User does not have symbol. Use /symbol set.');

			symbolData[userId].symbol = symbol;
			symbolData[userId].updatedAt = Date.now();
			saveSymbolData();
			applyCustomSymbol(userId);

			const targetHtml = Impulse.nameColor(name, true, false);
			this.sendReply(`|raw|You have updated ${targetHtml}'s custom symbol to: ${symbol}`);
			sendSymbolNotifications(user, name, symbol, 'updated');
		},

		delete(target, room, user) {
			this.checkCan('roomowner');
			const userId = toID(target);

			if (!symbolData[userId]) throw new Chat.ErrorMessage(`${target} does not have a custom symbol.`);

			delete symbolData[userId];
			saveSymbolData();
			removeCustomSymbol(userId);

			this.sendReply(`You removed ${target}'s custom symbol.`);
			sendSymbolNotifications(user, target, '', 'removed');
		},

		help() {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Custom Symbol Commands</strong></h4><hr>Commands Alias: /cs</center><hr>` +
				`<b>/symbol set [user], [symbol]</b> - Set custom symbol. Requires: ~<hr>` +
				`<b>/symbol update [user], [symbol]</b> - Update symbol. Requires: ~<hr>` +
				`<b>/symbol delete [user]</b> - Remove custom symbol. Requires: ~<hr>` +
				`<center><small>Blocked symbols: ${BLOCKED_SYMBOLS.join(' ')}</small></center></div>`
			);
		},
	},

	symbolhelp: 'symbol.help',
};

export const loginfilter: Chat.LoginFilter = user => {
	applyCustomSymbol(user.id);
};

const originalGetIdentity = Users.User.prototype.getIdentity;
Users.User.prototype.getIdentity = function (room: BasicRoom | null = null): string {
	const customSymbol = (this as any).customSymbol;
	if (!customSymbol) return originalGetIdentity.call(this, room);

	const punishgroups = Config.punishgroups || { locked: null, muted: null };

	if (this.locked || this.namelocked) {
		return (punishgroups.locked?.symbol || '\u203d') + this.name;
	}

	if (room) {
		if (room.isMuted(this)) return (punishgroups.muted?.symbol || '!') + this.name;
		const roomGroup = room.auth.get(this);
		if (roomGroup === this.tempGroup || roomGroup === ' ') return customSymbol + this.name;
		return roomGroup + this.name;
	}

	if (this.semilocked) return (punishgroups.muted?.symbol || '!') + this.name;

	return customSymbol + this.name;
};
