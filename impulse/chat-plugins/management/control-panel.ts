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

/**
 * Read icon data fresh from disk each time a page loads.
 * This avoids coupling to the icons plugin's in-memory `data`
 * object and always reflects the current persisted state.
 */
async function loadIconData(): Promise<IconData> {
	try {
		const raw = await FS(ICONS_DATA_FILE).readIfExists();
		if (raw) return JSON.parse(raw) as IconData;
	} catch (e) {
		console.error('[ControlPanel] Failed to read icon data:', e);
	}
	return {};
}

/**
 * Shared page chrome: wraps content with a consistent header bar
 * that shows the panel title and a Home button (hidden on home itself).
 */
function pageShell(title: string, showHomeBtn: boolean, content: string): string {
	const homeBtn = showHomeBtn
		? `<button class="button" name="send" value="/j view-controlpanel">
				← Back to Control Panel
			</button>`
		: '';

	return `
		<div class="pad">
			<div style="
				display: flex;
				align-items: center;
				justify-content: space-between;
				border-bottom: 1px solid #ccc;
				padding-bottom: 8px;
				margin-bottom: 14px;
			">
				<strong style="font-size: 1.2em;">⚙️ Control Panel${title ? ` — ${title}` : ''}</strong>
				${homeBtn}
			</div>
			${content}
		</div>
	`.trim();
}

// ─── View renderers ───────────────────────────────────────────────────────────

/** Main dashboard — one card per feature section. */
function renderHome(user: User): string {
	const cards: Array<{ label: string; desc: string; view: string; emoji: string }> = [
		{
			emoji: '🖼️',
			label: 'User Icons',
			desc: 'Manage custom userlist icons assigned to players.',
			view: 'icons',
		},
		// ── add future sections here ─────────────────────────────────────────
		// { emoji: '🎨', label: 'Custom Colors', desc: '...', view: 'colors' },
	];

	const cardHtml = cards.map(c => `
		<div style="
			border: 1px solid #ccc;
			border-radius: 8px;
			padding: 12px 16px;
			margin-bottom: 10px;
			display: flex;
			align-items: center;
			gap: 14px;
		">
			<span style="font-size: 2em; line-height: 1;">${c.emoji}</span>
			<div style="flex: 1;">
				<strong>${c.label}</strong>
				<div style="font-size: 0.9em; color: #555;">${c.desc}</div>
			</div>
			<button class="button" name="send"
				value="/j view-controlpanel-${c.view}">
				Open →
			</button>
		</div>
	`).join('');

	return pageShell('', false, `
		<p style="color: #555; margin-bottom: 14px;">
			Welcome, ${Impulse.nameColor(user.name, true, false)}.
			Select a section to manage.
		</p>
		${cardHtml}
	`);
}

/** Icons section — table of all users with custom icons. */
async function renderIcons(user: User): Promise<string> {
	const iconData = await loadIconData();
	const entries = Object.entries(iconData);

	if (!entries.length) {
		return pageShell('User Icons', true, `
			<p style="color: #888; font-style: italic;">
				No custom icons have been set yet.
				Use <code>/icon set [user], [url]</code> to add one.
			</p>
		`);
	}

	// ── Table header ──────────────────────────────────────────────────────────
	const thead = `
		<tr style="background: #f0f0f0;">
			<th style="${thStyle()}">User</th>
			<th style="${thStyle()}">Icon</th>
			<th style="${thStyle()}">Size</th>
			<th style="${thStyle()}">Set By</th>
			<th style="${thStyle()}">Added</th>
			<th style="${thStyle()}">Action</th>
		</tr>
	`;

	// ── Table rows ────────────────────────────────────────────────────────────
	const rows = entries.map(([userid, entry]) => {
		const sizeLabel = entry.size !== DEFAULT_ICON_SIZE
			? `${entry.size}px`
			: `${DEFAULT_ICON_SIZE}px (default)`;

		const addedDate = new Date(entry.createdAt).toLocaleDateString('en-GB', {
			day: '2-digit', month: 'short', year: 'numeric',
		});

		/*
		 * The delete button sends the existing /icon delete command directly.
		 * No custom server-side delete handler is needed — the icons plugin
		 * owns that logic and keeps its CSS in sync automatically.
		 */
		const deleteBtn = `
			<button class="button" name="send"
				value="/icon delete ${userid}"
				style="color: #c00; border-color: #c00;">
				🗑 Delete
			</button>
		`;

		return `
			<tr style="border-bottom: 1px solid #ddd;">
				<td style="${tdStyle()}">
					${Impulse.nameColor(userid, true, false)}
				</td>
				<td style="${tdStyle('center')}">
					<img
						src="${entry.url}"
						width="32"
						height="32"
						style="object-fit: contain; vertical-align: middle;"
						onerror="this.style.opacity='0.3'; this.title='Image failed to load';"
						title="${entry.url}"
					/>
				</td>
				<td style="${tdStyle('center')}">${sizeLabel}</td>
				<td style="${tdStyle()}">
					${Impulse.nameColor(entry.setBy, true, false)}
				</td>
				<td style="${tdStyle('center')}">${addedDate}</td>
				<td style="${tdStyle('center')}">${deleteBtn}</td>
			</tr>
		`;
	}).join('');

	const table = `
		<div style="max-height: 420px; overflow-y: auto; border: 1px solid #ccc; border-radius: 6px;">
			<table style="width: 100%; border-collapse: collapse; font-size: 0.92em;">
				<thead>${thead}</thead>
				<tbody>${rows}</tbody>
			</table>
		</div>
		<p style="margin-top: 8px; font-size: 0.85em; color: #666;">
			${entries.length} icon${entries.length === 1 ? '' : 's'} total.
			Use <code>/icon set [user], [url]</code> to add more.
		</p>
	`;

	return pageShell('User Icons', true, table);
}

// ─── Inline style helpers (keeps template strings readable) ──────────────────

function thStyle(): string {
	return [
		'padding: 8px 12px',
		'text-align: left',
		'font-weight: bold',
		'font-size: 0.88em',
		'border-bottom: 2px solid #ccc',
		'white-space: nowrap',
	].join('; ');
}

function tdStyle(align: 'left' | 'center' | 'right' = 'left'): string {
	return [
		'padding: 8px 12px',
		`text-align: ${align}`,
		'vertical-align: middle',
	].join('; ');
}

// ─── Page registrations ───────────────────────────────────────────────────────

export const pages: Chat.PageTable = {
	async controlpanel(query, user, connection) {
		// Only global staff (roomowner+) may access
		this.checkCan('roomowner');
		this.title = 'Control Panel';

		const [view] = query;

		switch (view) {
			case 'icons':
				return renderIcons(user);

			// ── future views slot in here ────────────────────────────────────
			// case 'colors':
			//   return renderColors(user);

			default:
				return renderHome(user);
		}
	},
};

// ─── Commands ─────────────────────────────────────────────────────────────────

export const commands: Chat.ChatCommands = {
	controlpanel: {
		/**
		 * /controlpanel — open the main dashboard.
		 * Aliases: /cp, /panel
		 */
		''(target, room, user) {
			this.checkCan('roomowner');
			return this.parse('/join view-controlpanel');
		},

		/**
		 * /controlpanel icons — jump directly to the icons section.
		 */
		icons(target, room, user) {
			this.checkCan('roomowner');
			return this.parse('/join view-controlpanel-icons');
		},

		help: [
			`<strong>Control Panel commands</strong>`,
			`/controlpanel — Open the staff control panel.`,
			`/controlpanel icons — Jump to the User Icons section.`,
			`Aliases: /cp, /panel`,
		],
	},

	// Short aliases
	cp: 'controlpanel',
	panel: 'controlpanel',

	cphelp: 'controlpanel help',
};
