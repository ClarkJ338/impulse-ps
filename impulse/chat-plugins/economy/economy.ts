/**
 * Economy Plugin
 * Commands: balance, transfer, richestuser
 */

import { FS } from '../../../lib';
import { Table } from '../../impulse-utils';

const ECONOMY_PATH = 'impulse/db/economy.json';
const CURRENCY_NAME = 'coins';
const STARTING_BALANCE = 0;

/*************************************************************
 * Data helpers
 *************************************************************/

type EconomyData = Record<string, number>;

let data: EconomyData = {};

const saveData = (): void => {
	FS(ECONOMY_PATH).writeUpdate(() => JSON.stringify(data));
};

const loadData = async (): Promise<void> => {
	try {
		const raw = await FS(ECONOMY_PATH).readIfExists();
		if (raw) data = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to load economy data:', e);
		data = {};
	}
};

void (async () => {
	await loadData();
})();

function getBalance(userid: string): number {
	return data[userid] ?? STARTING_BALANCE;
}

function setBalance(userid: string, amount: number): void {
	data[userid] = amount;
	saveData();
}

/*************************************************************
 * Commands
 *************************************************************/

export const commands: ChatCommands = {
  balance(target, room, user) {
		if (!this.runBroadcast()) return;
		const targetId = target.trim() ? toID(target) : user.id;
		const displayName = target.trim() ? target.trim() : user.name;
		const balance = getBalance(targetId);
		this.sendReplyBox(`<strong>${Impulse.nameColor(displayName, true, true)}</strong> has <strong>${balance}</strong> ${CURRENCY_NAME}.`);
	},

	transfer(target, room, user) {
		const [targetArg, amountArg] = target.split(',').map(s => s.trim());
		if (!targetArg || !amountArg) {
			return this.errorReply(`Usage: /transfer [user], [amount]`);
		}

		const targetId = toID(targetArg);
		if (targetId === user.id) {
			return this.errorReply(`You cannot transfer ${CURRENCY_NAME} to yourself.`);
		}

		const amount = parseInt(amountArg);
		if (isNaN(amount) || amount <= 0) {
			return this.errorReply(`Amount must be a positive number.`);
		}

		const senderBalance = getBalance(user.id);
		if (senderBalance < amount) {
			return this.errorReply(`You do not have enough ${CURRENCY_NAME}. Your balance: ${senderBalance}.`);
		}

		setBalance(user.id, senderBalance - amount);
		setBalance(targetId, getBalance(targetId) + amount);

		this.sendReply(`You transferred <strong>${amount}</strong> ${CURRENCY_NAME} to <strong>${Impulse.nameColor(targetArg, true, true)}</strong>.`);

		const targetUserObj = Users.get(targetId);
		if (targetUserObj?.connected) {
			targetUserObj.send(`|pm|${user.name}|${targetUserObj.name}|/raw <strong>${Impulse.nameColor(user.name, true, true)}</strong> sent you <strong>${amount}</strong> ${CURRENCY_NAME}.`);
		}
	},
  
	ecohelp(target, room, user) {
		if (!this.runBroadcast()) return;
		this.sendReplyBox(
			`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Economy Commands</strong></h4><hr></center><hr>` +
			`<b>/balance [user]</b> - Check your balance or another user's balance.<hr>` +
			`<b>/transfer [user], [amount]</b> - Transfer ${CURRENCY_NAME} to another user.<hr>` +
			`<b>/richestuser</b> - View the top 100 richest users.</div>`
		);
	},

	richestuser(target, room, user) {
		if (!this.runBroadcast()) return;

		const sorted = Object.entries(data)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 100);

		if (!sorted.length) {
			return this.sendReplyBox(`No economy data found.`);
		}

		const rows = sorted.map(([userid, balance], i) => [
			String(i + 1),
			Chat.escapeHTML(userid),
			String(balance),
		]);

		this.sendReplyBox(Table(
			`Top 100 Richest Users`,
			['Rank', 'User', CURRENCY_NAME.charAt(0).toUpperCase() + CURRENCY_NAME.slice(1)],
			rows
		));
	},
};
