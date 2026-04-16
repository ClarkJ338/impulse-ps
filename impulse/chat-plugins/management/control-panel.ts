/*
 * Pokemon Showdown - Impulse Server
 * Control Panel Plugin
 * @author PrinceSky-Git
 *
 * Pages:
 *   view-controlpanel              — main dashboard
 *   view-controlpanel-icons        — custom user icons list
 */

import { FS } from '../../../lib';
import { toID } from '../../../sim/dex';
import { Table } from '../../impulse-utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const ICONS_DATA_FILE = 'impulse/db/custom-icons.json';
const DEFAULT_ICON_SIZE = 24;

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function loadIconData(): Promise<IconData> {
	try {
		const raw = await FS(ICONS_DATA_FILE).readIfExists();
		if (raw) return JSON.parse(raw) as IconData;
	} catch (e) {
		console.error('[ControlPanel] Failed to read icon data:', e);
	}
	return {};
}

// ─── View renderers ───────────────────────────────────────────────────────────

function renderHome(user: User): string {
	const cards: Array<{ label: string; desc: string; view: string; emoji: string }> = [
		{
			emoji: '🖼️',
			label: 'User Icons',
			desc: 'Manage custom userlist icons assigned to players.',
			view: 'icons',
		},
	];

	const cardHtml = cards.map(c =>
		'<div style="' +
			'border: 1px solid #ccc;' +
			'border-radius: 8px;' +
			'padding: 12px 16px;' +
			'margin-bottom: 10px;' +
			'display: flex;' +
			'align-items: center;' +
			'gap: 14px;' +
		'">' +
			'<span style="font-size: 2em; line-height: 1;">' + c.emoji + '</span>' +
			'<div style="flex: 1;">' +
				'<strong>' + c.label + '</strong>' +
				'<div style="font-size: 0.9em; color: #555;">' + c.desc + '</div>' +
			'</div>' +
			'<button class="button" name="send" value="/controlpanel ' + c.view + '">' +
				'Open →' +
			'</button>' +
		'</div>'
	).join('');

	return (
		'<div class="pad">' +
			'<div style="' +
				'display: flex;' +
				'align-items: center;' +
				'justify-content: space-between;' +
				'border-bottom: 1px solid #ccc;' +
				'padding-bottom: 8px;' +
				'margin-bottom: 14px;' +
			'">' +
				'<strong style="font-size: 1.2em;">⚙️ Control Panel</strong>' +
			'</div>' +
			'<p style="color: #555; margin-bottom: 14px;">' +
				'Welcome, ' + Impulse.nameColor(user.name, true, false) + '. ' +
				'Select a section to manage.' +
			'</p>' +
			cardHtml +
		'</div>'
	);
}

async function renderIcons(user: User): Promise<string> {
	const iconData = await loadIconData();
	const entries = Object.entries(iconData);

	const backBtn =
		'<button class="button" name="send" value="/controlpanel">' +
			'← Back to Control Panel' +
		'</button>';

	const header =
		'<div style="' +
			'display: flex;' +
			'align-items: center;' +
			'justify-content: space-between;' +
			'border-bottom: 1px solid #ccc;' +
			'padding-bottom: 8px;' +
			'margin-bottom: 14px;' +
		'">' +
			'<strong style="font-size: 1.2em;">⚙️ Control Panel — User Icons</strong>' +
			backBtn +
		'</div>';

	if (!entries.length) {
		return (
			'<div class="pad">' +
				header +
				'<p style="color: #888; font-style: italic;">' +
					'No custom icons have been set yet. ' +
					'Use <code>/icon set [user], [url]</code> to add one.' +
				'</p>' +
			'</div>'
		);
	}

	const tableRows = entries.map(([userid, entry]) => {
		const sizeLabel = entry.size !== DEFAULT_ICON_SIZE
			? entry.size + 'px'
			: DEFAULT_ICON_SIZE + 'px (default)';

		const addedDate = new Date(entry.createdAt).toLocaleDateString('en-GB', {
			day: '2-digit', month: 'short', year: 'numeric',
		});

		const deleteBtn =
			'<button class="button" name="send"' +
				' value="/icon delete ' + userid + '"' +
				' style="color: #c00; border-color: #c00;">' +
				'🗑 Delete' +
			'</button>';

		return [
			Impulse.nameColor(userid, true, false),
			'<img src="' + entry.url + '" width="32" height="32"' +
				' style="object-fit: contain; vertical-align: middle;"' +
				' title="' + entry.url + '" />',
			sizeLabel,
			Impulse.nameColor(entry.setBy, true, false),
			addedDate,
			deleteBtn,
		];
	});

	const table =
		Table(
			'User Icons',
			['User', 'Icon', 'Size', 'Set By', 'Added', 'Action'],
			tableRows
		) +
		'<p style="margin-top: 8px; font-size: 0.85em; color: #666;">' +
			entries.length + ' icon' + (entries.length === 1 ? '' : 's') + ' total. ' +
			'Use <code>/icon set [user], [url]</code> to add more.' +
		'</p>';

	return (
		'<div class="pad">' +
			header +
			table +
		'</div>'
	);
}

// ─── Page registrations ───────────────────────────────────────────────────────

export const pages: Chat.PageTable = {
	async controlpanel(query, user, connection) {
		this.checkCan('roomowner');
		this.title = 'Control Panel';

		const [view] = query;

		switch (view) {
			case 'icons':
				this.title = 'Control Panel — Icons';
				return renderIcons(user);

			default:
				return renderHome(user);
		}
	},
};

// ─── Commands ─────────────────────────────────────────────────────────────────

export const commands: Chat.ChatCommands = {
	controlpanel: {
		''(target, room, user) {
			this.checkCan('roomowner');
			return this.parse('/join view-controlpanel');
		},

		icons(target, room, user) {
			this.checkCan('roomowner');
			return this.parse('/join view-controlpanel-icons');
		},

		help: [
			'<strong>Control Panel commands</strong>',
			'/controlpanel — Open the staff control panel.',
			'/controlpanel icons — Jump to the User Icons section.',
			'Aliases: /cp, /panel',
		],
	},

	cp: 'controlpanel',
	panel: 'controlpanel',

	cphelp: 'controlpanel help',
};
