const Config = require('./server/config');
const Lib = global.exports['tk-lib'].GetLib();
const Logger = Lib.Functions.Logger(GetCurrentResourceName(), 'Main');

async function init() {
	Logger.debug('Starting Boot Process');

	Logger.debug("Creating Clockins Table");
    await Lib.DB.Run('CREATE TABLE IF NOT EXISTS `' + Config.DatabaseTable + '` ( \
        `id` INT NOT NULL AUTO_INCREMENT, \
        `identifier` VARCHAR(32) NOT NULL, \
        `job` VARCHAR(128) NOT NULL , \
        `clockin` BIGINT(11) NOT NULL , \
        `clockout` BIGINT(11) , \
        `total` BIGINT(11) , \
        PRIMARY KEY (`id`) \
    ) ENGINE = InnoDB;');

	require('./server/app');

	const {
		getPlayerHours,
		getPlayerClockins,
		getDepartmentClockinLeaderboard,
		getGlobalClockinLeaderboard,
		isDepartmentClocked
	} = require('./server/public');

	exports('getPlayerHours', getPlayerHours);
	exports('getPlayerClockins', getPlayerClockins);
	exports('getDepartmentClockinLeaderboard', getDepartmentClockinLeaderboard);
	exports('getGlobalClockinLeaderboard', getGlobalClockinLeaderboard);
	exports('isDepartmentClocked', isDepartmentClocked);

    Lib.Functions.VersionChecker(GetCurrentResourceName(), Lib.Functions.GetResourceVersion(GetCurrentResourceName()));
    Lib.Functions.EnsureResourceName(GetCurrentResourceName(), 'tk-clockins');

	Logger.debug('Completed Boot Process');
}

init();