/**
 * Main file
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This is the main Pokemon Showdown app, and the file that the
 * `pokemon-showdown` script runs if you start Pokemon Showdown normally.
 *
 * This file sets up our SockJS server, which handles communication
 * between users and your server, and also sets up globals. You can
 * see details in their corresponding files, but here's an overview:
 *
 * Users - from users.ts
 *
 *   Most of the communication with users happens in users.ts, we just
 *   forward messages between the sockets.js and users.ts.
 *
 *   It exports the global tables `Users.users` and `Users.connections`.
 *
 * Rooms - from rooms.ts
 *
 *   Every chat room and battle is a room, and what they do is done in
 *   rooms.ts. There's also a global room which every user is in, and
 *   handles miscellaneous things like welcoming the user.
 *
 *   It exports the global table `Rooms.rooms`.
 *
 * Dex - from sim/dex.ts
 *
 *   Handles getting data about Pokemon, items, etc.
 *
 * Ladders - from ladders.ts and ladders-remote.ts
 *
 *   Handles Elo rating tracking for players.
 *
 * Chat - from chat.ts
 *
 *   Handles chat and parses chat commands like /me and /ban
 *
 * Sockets - from sockets.js
 *
 *   Used to abstract out network connections. sockets.js handles
 *   the actual server and connection set-up.
 *
 * @license MIT
 */
try {
	require('source-map-support').install();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
}
// NOTE: This file intentionally doesn't use too many modern JavaScript
// features, so that it doesn't crash old versions of Node.js, so we
// can successfully print the "We require Node.js 22+" message.

// I've gotten enough reports by people who don't use the launch
// script that this is worth repeating here
try {
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	fetch;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
	throw new Error("We require Node.js version 22 or later; you're using " + process.version);
}

try {
	require.resolve('ts-chacha20');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
	throw new Error("Dependencies are unmet; run `npm ci` before launching Pokemon Showdown again.");
}

// Note that `import` declarations are run before any other code
import { Repl } from '../lib';
import * as ConfigLoader from './config-loader';
import { Sockets } from './sockets';
import { ImpulseDB } from '../impulse/impulse-db';
import { initAutotour } from '../impulse/chat-plugins/misc/auto-tour';

function cleanupStale() {
	return Repl.cleanup();
}

function setupGlobals() {
	const { Monitor } = require('./monitor');
	global.Monitor = Monitor;
	global.__version = { head: '' };
	void Monitor.version().then((hash: any) => {
		global.__version.tree = hash;
	});

	// Make Impulse namespace global
	global.Impulse = {};

	const { Dex } = require('../sim/dex');
	global.Dex = Dex;
	global.toID = Dex.toID;

	const { Chat } = require('./chat');
	global.Chat = Chat;

	const { Rooms } = require('./rooms');
	global.Rooms = Rooms;
	// We initialize the global room here because roomlogs.ts needs the Rooms global
	Rooms.global = new Rooms.GlobalRoomState();

	const { Teams } = require('../sim/teams');
	global.Teams = Teams;

	const { LoginServer } = require('./loginserver');
	global.LoginServer = LoginServer;

	const { Ladders } = require('./ladders');
	global.Ladders = Ladders;

	const { Users } = require('./users');
	global.Users = Users;

	const { Punishments } = require('./punishments');
	global.Punishments = Punishments;

	const Verifier = require('./verifier');
	global.Verifier = Verifier;

	const { Tournaments } = require('./tournaments');
	global.Tournaments = Tournaments;

	const { IPTools } = require('./ip-tools');
	global.IPTools = IPTools;
	void IPTools.loadHostsAndRanges();

	const TeamValidatorAsync = require('./team-validator-async');
	global.TeamValidatorAsync = TeamValidatorAsync;

	global.Sockets = Sockets;
	if (!Config.lazysockets) {
		Sockets.start(Config.subprocessescache);
	}
}

/*
 * Initialise ImpulseDB
 *
 * Returns true if the database connected successfully, false otherwise.
 * The server always continues starting regardless of the outcome — a false
 * return simply means DB-backed features will be unavailable until the next
 * restart with a working connection.  The timeout options passed here are
 * critical: without them MongoClient falls back to its own defaults which
 * can be very long, causing the server startup to hang indefinitely.
 */
async function initializeDatabase(): Promise<boolean> {
	if (!Config.Impulse_DB?.uri) {
		console.log('ImpulseDB: MongoDB URI not configured. Database features disabled.');
		return false;
	}
	try {
		await ImpulseDB.init({
			uri: Config.Impulse_DB.uri,
			dbName: Config.Impulse_DB.dbName || 'impulse',
			options: {
				maxPoolSize: Config.Impulse_DB.maxPoolSize || 500,
				minPoolSize: Config.Impulse_DB.minPoolSize || 5,
				// These timeouts are required. Without them, MongoClient uses its own
				// defaults (which can be very long) and causes the server to hang on
				// startup when MongoDB is unreachable.
				serverSelectionTimeoutMS: Config.Impulse_DB.serverSelectionTimeoutMS || 5000,
				connectTimeoutMS: Config.Impulse_DB.connectTimeoutMS || 10000,
			},
		});
		console.log('ImpulseDB: Successfully connected to MongoDB');
		return true;
	} catch (err: any) {
		console.error('ImpulseDB: Initialization failed —', err?.message ?? err);
		console.log('ImpulseDB: Server will start without database. DB-backed features will be disabled.');
		return false;
	}
}

export const readyPromise = cleanupStale().then(() => {
	setupGlobals();
}).then(async () => {
	await initializeDatabase();
	if (Config.usesqlite) {
		require('./modlog').start(Config.subprocessescache);
	}

	Rooms.global.start(Config.subprocessescache);
	Verifier.start(Config.subprocessescache);
	TeamValidatorAsync.start(Config.subprocessescache);
	Chat.start(Config.subprocessescache);

	if (ImpulseDB.isConnected()) {
        await initAutotour();
	}

	/*********************************************************
	 * Monitor config file and display diagnostics
	 *********************************************************/

	if (Config.watchconfig) {
		ConfigLoader.watch();
	}

	ConfigLoader.flushLog();

	/*********************************************************
	 * On error continue - enabled by default
	 *********************************************************/

	if (Config.crashguard) {
		// graceful crash - allow current battles to finish before restarting
		process.on('uncaughtException', (err: Error) => {
			Monitor.crashlog(err, 'The main process');
		});

		process.on('unhandledRejection', err => {
			// TODO:
			// - Compatibility with https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode
			// - Crashlogger API for reporting rejections vs exceptions
			Monitor.crashlog(err as any, 'A main process Promise');
		});
	}

	/*********************************************************
	 * Start up the REPL server
	 *********************************************************/

	Repl.startGlobal('app');

	/*********************************************************
	 * Fully initialized, run startup hook
	 *********************************************************/

	if (Config.startuphook) {
		process.nextTick(Config.startuphook);
	}

	/*
	 * ImpulseDB Graceful Shutdown
	 * Only attempt to close the DB connection if it was actually established.
	 */
	const shutdownDb = async (signal: string) => {
		Monitor.notice(`Received ${signal}, shutting down gracefully...`);
		if (ImpulseDB.isConnected()) {
			try {
				await ImpulseDB.close();
				Monitor.notice('ImpulseDB: Connection closed');
			} catch (err: any) {
				Monitor.warn('ImpulseDB: Error closing connection: ' + err.message);
			}
		}
		process.exit(0);
	};

	process.on('SIGTERM', () => void shutdownDb('SIGTERM'));
	process.on('SIGINT',  () => void shutdownDb('SIGINT'));

	if (Config.ofemain) {
		// Create a heapdump if the process runs out of memory.
		global.nodeOomHeapdump = (require as any)('node-oom-heapdump')({
			addTimestamp: true,
		});
	}
});
