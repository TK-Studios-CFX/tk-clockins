const Config = {}

Config.DatabaseTable = 'tk_clockins'

Config.MinimumTime = 30 * 1000 // Minimum time in order for a clock in to count. (IN MS)

// List of jobs to log
Config.Jobs = [
    "police",

    "tow",
    "burgershot",
    "mechanic",

    "unemployed",
]

module.exports = Config;