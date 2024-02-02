const Lib = global.exports["tk-lib"].GetLib();
const Logger = Lib.Functions.Logger(GetCurrentResourceName(), "Main");

const QBCore = global.exports["qb-core"].GetCoreObject();
const Config = require("../config");

const currentJob = new Map();

/**
 * Updates the clock-ins for all players.
 */
function UpdateClockins() {
	let Players = QBCore.Functions.GetPlayers();
	Players.forEach(async (Player) => {
		await ValidateClockin(Player);
	});
}

/**
 * Validates the clock-in process for a player.
 *
 * @param {number} source - The source of the player.
 * @returns {Promise<void>} - A promise that resolves when the validation is complete.
 */
async function ValidateClockin(source) {
	const player = QBCore.Functions.GetPlayer(source);
	if (!player) return Logger.error("Could not locate player at clockinManager:ValidateClockIn");
	let PlayerData = player.PlayerData;
	if (!PlayerData) return Logger.error("Could not locate PlayerData at clockinManager:ValidateClockIn");
	let job = PlayerData.job;
	if (!job) return Logger.error("Could not locate a job for the player at clockinManager:ValidateClockIn");
	if (!job.name) return Logger.error("Unable to fetch job name");
	const Identifier = Lib.Functions.GetStrippedPlayerIdentifier(source, "discord");
	if (!Identifier) return Logger.error("Unable to fetch discord identifier at initial validation stage.");
	let oldJob = currentJob.get(Identifier);
	if (!oldJob) return await ForceUpdateClockIn(Identifier, job);
	if (oldJob.name != job.name) return await ForceUpdateClockIn(Identifier, job);
	if (oldJob.onduty != job.onduty) return await ForceUpdateClockIn(Identifier, job);
	return;
}

/**
 * Updates the clock-in status for a player with the given Identifier and job.
 *
 * @param {string} Identifier - The unique identifier of the player.
 * @param {object} job - The job object containing the updated job information.
 * @returns {Promise<void>} - A promise that resolves once the clock-in status is updated.
 */
async function ForceUpdateClockIn(Identifier, job) {
	currentJob.set(Identifier, job);
	Logger.log(`${Identifier} Job Changed to ${job.name} with duty: ${job.onduty}`);
	if (!Identifier) return Logger.error(`Failed to pass in the players Identifier.`);
	await ForceClockOut(Identifier);
	if (!job?.name) return Logger.error("No job name provided within the 'job' object.");
	if (job.onduty) await ClockIn(Identifier, job);
	return;
}

/**
 * Forces a clock out for the given identifier.
 *
 * @param {string} Identifier - The identifier of the user.
 * @returns {Promise<void>} - A promise that resolves when the clock out is completed.
 */
async function ForceClockOut(Identifier) {
	if (!Identifier) return Logger.error("Was not given identifier");
	await Lib.DB.Run(`UPDATE ${Config.DatabaseTable} SET clockout = ? WHERE identifier = ? AND clockout IS NULL`, [
		Date.now(),
		Identifier,
	]);
	return;
}

/**
 * Clocks in a user for a job.
 *
 * @param {string} Identifier - The identifier of the user.
 * @param {object} job - The job object containing job details.
 * @returns {Promise<void>} - A promise that resolves when the clock-in is completed.
 */
async function ClockIn(Identifier, job) {
	if (!job.onduty) return;
	if (job.name == "unemployed") return;
	await Lib.DB.Run(`INSERT INTO ${Config.DatabaseTable} (identifier, job, clockin) VALUES (?, ?, ?)`, [
		Identifier,
		job.name,
		Date.now(),
	]);
	return;
}

/**
 * Clocks out a user on disconnect
 *
 * @returns {void}
 */
on("playerDropped", async (reason) => {
	Logger.log(Lib.Functions.GetStrippedPlayerIdentifier(global.source, "discord"));
	Logger.log(`[${global.source}] ${GetPlayerName(global.source)} Disconnected (Reason: ${reason}).`);
	await ForceClockOut(Lib.Functions.GetStrippedPlayerIdentifier(global.source, "discord"));
});

/**
 * Forces clock-in for all players when the resource is loaded.
 *
 * @returns {Promise<void>}
 */
async function ForceClockinOnResourceLoad() {
	let Players = QBCore.Functions.GetPlayers();
	Players.forEach(async (source) => {
		const player = QBCore.Functions.GetPlayer(source);
		if (!player) return Logger.error("Could not locate player at clockinManager:ValidateClockIn");
		let PlayerData = player.PlayerData;
		if (!PlayerData) return Logger.error("Could not locate PlayerData at clockinManager:ValidateClockIn");
		let job = PlayerData.job;
		if (!job)
			return Logger.error(
				"Could not locate a job for the player at clockinManager:ValidateClockIn (Their devs are dumb)"
			);
		const Identifier = Lib.Functions.GetStrippedPlayerIdentifier(source, "discord");
		if (!Identifier)
			return Logger.error(
				"Something went wrong when locating the players identifier. At clockinManager:ValidateClockIn."
			);
		currentJob.set(Identifier, job);
		await ForceUpdateClockIn(Identifier, job);
	});
}

/**
 * Forces a clock out for all resources on resource load.
 *
 * @returns {Promise<void>} A promise that resolves when all resources have been clocked out.
 */
async function ForceClockOutAllOnResourceLoad() {
	await Lib.DB.Run(`UPDATE ${Config.DatabaseTable} SET clockout = ? WHERE clockout IS NULL`, [Date.now()]);
}

/**
 * Initializes the application.
 *
 * @returns {Promise<void>} A promise that resolves when the initialization is complete.
 */
async function init() {
	await ForceClockOutAllOnResourceLoad();
	await ForceClockinOnResourceLoad();
	setInterval(UpdateClockins, 10000);
}

init();