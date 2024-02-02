const Lib = global.exports["tk-lib"].GetLib();
const Logger = Lib.Functions.Logger(GetCurrentResourceName(), "Public");

const QBCore = global.exports["qb-core"].GetCoreObject();
const Config = require("../config");

/**
 * Retrieves the total hours worked by a player for a specified number of days.
 * 
 * @param {string} Identifier - The identifier of the player.
 * @param {number} [Days=7] - The number of days to fetch clockins for. Defaults to 7 if not provided.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of objects containing job and totalTime.
 */
async function getPlayerHours(Identifier, Days) {
	if (!Identifier) return;
	Logger.log(`Fetching player clockins for last ${Days || 7} Days for identifier ${Identifier}`);
	let Returnable = await Lib.DB.All(
		"SELECT job, SUM(total) AS totalTime FROM `" +
			Config.DatabaseTable +
			"` WHERE total IS NOT NULL AND identifier = ? AND clockin > ? GROUP BY identifier, job;",
		[Identifier, DaysAgo(Days || 7)]
	);
	return Returnable;
}

/**
 * Retrieves player clock-ins based on the provided parameters.
 *
 * @param {string} Identifier - The identifier of the player.
 * @param {string} Job - The job for which clock-ins are retrieved.
 * @param {number} Days - The number of days to consider for clock-ins (default: 7).
 * @param {number} Limit - The maximum number of clock-ins to retrieve (default: 10).
 * @returns {Promise<Array<Object>>} An array of clock-in objects containing job, startTime, and totalTime.
 */
async function getPlayerClockins(Identifier, Job, Days, Limit) {
	if (!Identifier) return [];
	if (!Job) return [];
	Logger.log(`Fetching player clockins for last ${Days || 7} Days for ${Job} with identifier ${Identifier}`);
	let Returnable = await Lib.DB.All(
		"SELECT job, clockin AS startTime, total as totalTime FROM `" +
			Config.DatabaseTable +
			"` WHERE total IS NOT NULL AND identifier = ? AND job = ? AND total > ? AND clockin > ? LIMIT ?;",
		[Identifier, Job, Config.MinimumTime, DaysAgo(Days || 7), Limit || 10]
	);
	return Returnable;
}

/**
 * Retrieves the leaderboard for a specific job within a given time period.
 * 
 * @param {string} Job - The job name.
 * @param {number} Days - The number of days to consider for the leaderboard. Defaults to 7 days if not provided.
 * @param {number} Limit - The maximum number of results to return. Defaults to 10 if not provided.
 * @returns {Promise<Array<Object>>} - The leaderboard data, containing the identifier, total time, and rank for each department.
 */
async function getDepartmentClockinLeaderboard(Job, Days, Limit) {
	if (!Job) return [];
	Logger.log(`Fetching leaderboard for last ${Days || 7} Days for ${Job}`);
	let Returnable = await Lib.DB.All(
		"SELECT d.identifier, SUM(d.total) AS totalTime, RANK() OVER (PARTITION BY d.job ORDER BY SUM(d.total) DESC) AS rank FROM `" +
			Config.DatabaseTable +
			"` d WHERE d.job = ? AND d.total IS NOT NULL AND d.clockin > ? GROUP BY d.identifier, d.job ORDER BY rank ASC LIMIT ?;",
		[Job, DaysAgo(Days || 7), Limit || 10]
	);
	return Returnable;
}

/**
 * Fetches the leaderboard for the specified number of days.
 * If no number of days is provided, it fetches the leaderboard for the last 7 days.
 *
 * @param {number} Days - The number of days to fetch the leaderboard for.
 * @returns {Promise<Array<Object>>} - The leaderboard data, containing job and total time.
 */
async function getGlobalClockinLeaderboard(Days) {
	Logger.log(`Fetching leaderboard for last ${Days || 7} Days`);
	let Returnable = await Lib.DB.All(
		`SELECT job, SUM(total) AS totalTime FROM ` +
			Config.DatabaseTable +
			` WHERE clockin > ? AND total IS NOT NULL GROUP BY job ORDER BY totalTime DESC;`,
		[DaysAgo(Days || 7)]
	);
	return Returnable;
}

/**
 * Checks if a department clockins are being recorded.
 * 
 * @param {string} Department - The department to check.
 * @returns {boolean} - True if the department is clocked in, false otherwise.
 */
function isDepartmentClocked(Department) {
	return Config.Jobs.includes(Department);
}

/**
 * Calculates the time in ms for a specified number of days ago.
 * 
 * @param {number} Days - The number of days ago.
 * @returns {number} - The epoch time in ms for the specified number of days ago.
 */
function DaysAgo(Days) {
	return Date.now() - Days * 24 * 60 * 60 * 1000;
}

module.exports = {
	getPlayerHours,
	getPlayerClockins,
	getDepartmentClockinLeaderboard,
	getGlobalClockinLeaderboard,
	isDepartmentClocked,
};
