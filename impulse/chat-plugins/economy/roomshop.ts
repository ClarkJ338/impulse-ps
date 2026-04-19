/**
 * Room Shop Plugin
 * Commands: roomshop, roomshophelp
 */

import { FS } from '../../../lib';
import { Table } from '../../impulse-utils';
import { getBalance, setBalance, CURRENCY_NAME } from './economy';

const ROOM_SHOP_PATH = 'impulse/db/roomshop.json';

/*************************************************************
 * Data helpers
 *************************************************************/

interface RoomShopItem {
	description: string;
	cost: number;
}

interface RoomShopConfig {
	enabled: boolean;
	bank: string | null;
	items: Record<string, RoomShopItem>;
}

type RoomShopData = Record<string, RoomShopConfig>;

let data: RoomShopData = {};

const saveData = (): void => {
	FS(ROOM_SHOP_PATH).writeUpdate(() => JSON.stringify(data));
};

const loadData = async (): Promise<void> => {
	try {
		const raw = await FS(ROOM_SHOP_PATH).readIfExists();
		if (raw) data = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to load room shop data:', e);
		data = {};
	}
};

void (async () => {
	await loadData();
})();

/*************************************************************
 * Commands
 *************************************************************/

export const commands: ChatCommands = {
	roomshop: {
		''(target, room, user) {
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}

			const roomData = data[room.roomid];
			if (!roomData || !roomData.enabled) {
				return this.errorReply(`The shop is not enabled for this room.`);
			}

			if (!this.runBroadcast()) return;

			const sorted = Object.entries(roomData.items).sort(([a], [b]) => a.localeCompare(b));

			if (!sorted.length) {
				return this.sendReplyBox(`<strong>The room shop is currently empty.</strong>`);
			}

			const rows = sorted.map(([name, item]) => [
				Chat.escapeHTML(name),
				Chat.escapeHTML(item.description),
				`<button class="button" name="send" value="/roomshop buy ${name}">${item.cost} ${CURRENCY_NAME}</button>`,
			]);

			this.sendReplyBox(Table(
				`${room.title} Shop`,
				['Name', 'Description', 'Cost'],
				rows
			));
		},

		enable(target, room, user) {
			this.checkCan('lockdown');
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}

			if (!data[room.roomid]) {
				data[room.roomid] = { enabled: true, bank: null, items: {} };
			} else {
				data[room.roomid].enabled = true;
			}
			
			saveData();
			this.sendReply(`|raw|<strong>Room Shop</strong> has been <strong>enabled</strong> for this room.`);
		},

		disable(target, room, user) {
			this.checkCan('lockdown');
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}

			if (!data[room.roomid]) {
				return this.errorReply(`The room shop is not configured here yet.`);
			}

			data[room.roomid].enabled = false;
			saveData();
			this.sendReply(`|raw|<strong>Room Shop</strong> has been <strong>disabled</strong> for this room.`);
		},

		bank(target, room, user) {
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}
			this.checkCan('roommod');

			const targetId = toID(target);
			if (!targetId) {
				return this.errorReply(`Usage: /roomshop bank [username/id]`);
			}

			if (!data[room.roomid]) {
				data[room.roomid] = { enabled: false, bank: targetId, items: {} };
			} else {
				data[room.roomid].bank = targetId;
			}
			
			saveData();
			this.sendReply(`|raw|The room shop bank for this room has been set to <strong>${Impulse.nameColor(target, true, true)}</strong>.`);
		},

		add(target, room, user) {
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}
			this.checkCan('roommod');

			const roomData = data[room.roomid];
			if (!roomData || !roomData.enabled) {
				return this.errorReply(`The shop must be enabled by a global admin first using /roomshop enable.`);
			}

			const parts = target.split(',').map(s => s.trim());
			if (parts.length < 3) {
				return this.errorReply(`Usage: /roomshop add [name], [description], [cost]`);
			}

			const [name, description, costArg] = parts;
			const cost = parseInt(costArg);
			if (isNaN(cost) || cost <= 0) {
				return this.errorReply(`Cost must be a positive number.`);
			}

			if (roomData.items[name]) {
				return this.errorReply(`Item "${name}" already exists in this room's shop. Use /roomshop edit to update it.`);
			}

			roomData.items[name] = { description, cost };
			saveData();

			this.sendReply(`|raw|Added item <strong>${name}</strong> to the room shop for <strong>${cost}</strong> ${CURRENCY_NAME}.`);
		},

		remove(target, room, user) {
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}
			this.checkCan('roommod');

			const roomData = data[room.roomid];
			if (!roomData || !roomData.enabled) {
				return this.errorReply(`The shop must be enabled by a global admin first.`);
			}

			const name = target.trim();
			if (!name) return this.errorReply(`Usage: /roomshop remove [item name]`);

			if (!roomData.items[name]) {
				return this.errorReply(`Item "${name}" does not exist in this room's shop.`);
			}

			delete roomData.items[name];
			saveData();

			this.sendReply(`Removed item "${name}" from the room shop.`);
		},

		edit(target, room, user) {
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}
			this.checkCan('roommod');

			const roomData = data[room.roomid];
			if (!roomData || !roomData.enabled) {
				return this.errorReply(`The shop must be enabled by a global admin first.`);
			}

			const parts = target.split(',').map(s => s.trim());
			if (parts.length < 3) {
				return this.errorReply(`Usage: /roomshop edit [name], [description], [cost]`);
			}

			const [name, description, costArg] = parts;
			const cost = parseInt(costArg);
			if (isNaN(cost) || cost <= 0) {
				return this.errorReply(`Cost must be a positive number.`);
			}

			if (!roomData.items[name]) {
				return this.errorReply(`Item "${name}" does not exist in this room's shop. Use /roomshop add to create it.`);
			}

			roomData.items[name] = { description, cost };
			saveData();

			this.sendReply(`|raw|Updated room shop item <strong>${Impulse.nameColor(name, true, true)}</strong>: "${description}" for <strong>${cost}</strong> ${CURRENCY_NAME}.`);
		},

		buy(target, room, user) {
			if (!room || room.roomid.startsWith('cmd-') || room.roomid === 'global') {
				return this.errorReply(`This command must be used in a chat room.`);
			}

			const roomData = data[room.roomid];
			if (!roomData || !roomData.enabled) {
				return this.errorReply(`The shop is not enabled for this room.`);
			}

			if (!roomData.bank) {
				return this.errorReply(`This room's shop does not have a bank set up yet. A Room Moderator must configure one using /roomshop bank before purchases can be made.`);
			}

			const itemName = target.trim();
			if (!itemName) return this.errorReply(`Usage: /roomshop buy [item name]`);

			const item = roomData.items[itemName];
			if (!item) return this.errorReply(`Item "${itemName}" does not exist in this room's shop.`);

			const balance = getBalance(user.id);
			if (balance < item.cost) {
				return this.errorReply(`You do not have enough ${CURRENCY_NAME}. Your balance: ${balance}. Cost: ${item.cost}.`);
			}

			setBalance(user.id, balance - item.cost);

			const bankBalance = getBalance(roomData.bank);
			setBalance(roomData.bank, bankBalance + item.cost);

			this.sendReply(`|raw|You purchased <strong>${itemName}</strong> for <strong>${item.cost}</strong> ${CURRENCY_NAME}. Your new balance: <strong>${balance - item.cost}</strong>.`);
		},

		help(target, room, user) {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Room Shop Commands</h4></strong><hr></center>` +
				`<b>/roomshop</b> - View all available items in the current room's shop.<hr>` +
				`<b>/roomshop buy [item name]</b> - Purchase an item from the current room's shop.<hr>` +
				`<center><strong>Room Owner Commands (#)</strong><hr></center>` +
				`<b>/roomshop add [name], [description], [cost]</b> - Add an item to the room shop.<hr>` +
				`<b>/roomshop remove [item name]</b> - Remove an item from the room shop.<hr>` +
				`<b>/roomshop edit [name], [description], [cost]</b> - Edit an existing room shop item.<hr>` +
				`<b>/roomshop bank [username/id]</b> - Set the user who receives the coins when an item is purchased in this room.<hr>` +
				`<center><strong>Admin Commands (~)</strong><hr></center>` +
				`<b>/roomshop enable</b> - Enable the room shop for the current room.<hr>` +
				`<b>/roomshop disable</b> - Disable the room shop for the current room.</div>`
			);
		},
	},

	roomshophelp: 'roomshop.help',
};
