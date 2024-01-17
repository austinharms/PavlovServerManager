const PavlovServer = {
    PARAM_TYPE: Object.freeze({ PLAYER_ID: 0, MODE: 1, TEAM: 2, MAP: 3, SKIN: 4, TTT_ROLE: 5, ITEM: 6, AMMO_LIMIT: 7, INT: 8, STRING: 9, BOOL: 10 }),
    DEFAULT_TEAMS: Object.freeze([{ name: "Blue", id: 0 }, { name: "Red", id: 1 }]),
    DEFAULT_AMMO_LIMITS: Object.freeze([{ name: "Unlimited", id: 0 }, { name: "Limited Generic", id: 1 }, { name: "Limited Specific", id: 2 }, { name: "Custom", id: 3 }, { name: "Limited Special", id: 4 }, { name: "Boxless", id: 5 }]),
    DEFAULT_SKINS: Object.freeze([{ id: "aurora", name: "aurora" }, { id: "clown", name: "clown" }, { id: "cop", name: "cop" }, { id: "farmer", name: "farmer" }, { id: "german", name: "german" }, { id: "kevin", name: "kevin" }, { id: "naked", name: "naked" }, { id: "nato", name: "nato" }, { id: "nato1", name: "nato1" }, { id: "nato2", name: "nato2" }, { id: "nato3", name: "nato3" }, { id: "nato4", name: "nato4" }, { id: "prisoner", name: "prisoner" }, { id: "russian", name: "russian" }, { id: "russian1", name: "russian1" }, { id: "russian2", name: "russian2" }, { id: "russian3", name: "russian3" }, { id: "russian4", name: "russian4" }, { id: "soviet", name: "soviet" }, { id: "us", name: "us" }]),
    DEFAULT_TTT_ROLES: Object.freeze([{ id: "Innocent", name: "Innocent" }, { id: "Traitor", name: "Traitor" }, { id: "Detective", name: "Detective" }, { id: "Mercenary", name: "Mercenary" }, { id: "Glitch", name: "Glitch" }, { id: "Assassin", name: "Assassin" }, { id: "Jester", name: "Jester" }, { id: "Survivalist", name: "Survivalist" }, { id: "Sheriff", name: "Sheriff" }, { id: "Tank", name: "Tank" }, { id: "LoneWolf", name: "LoneWolf" }, { id: "Zombie", name: "Zombie" }, { id: "Hypnotist", name: "Hypnotist" }, { id: "Soulmate", name: "Soulmate" }, { id: "Psychopath", name: "Psychopath" }]),
    DEFAULT_MODES: Object.freeze([{ id: "DM", name: "Death match" }, { id: "KOTH", name: "King of the hill" }, { id: "GUN", name: "Gun game" }, { id: "OITC", name: "One in the chamber" }, { id: "SND", name: "Search and destroy" }, { id: "TANKTDM", name: "WW2 Team Death Match" }, { id: "TDM", name: "Team Death Match" }, { id: "TTT", name: "Trouble in Terrorist Town" }, { id: "TTTclassic", name: "TTT with only innocent/traitor/detective" }, { id: "WW2GUN", name: "WW2 gun game" }, { id: "ZWV", name: "Zombie wave survival" }, { id: "HIDE", name: "The Hidden" }, { id: "INFECTION", name: "Hidden infection" }, { id: "PUSH", name: "Push" }, { id: "PH", name: "Prop hunt" }]),
    DEFAULT_MAPS: Object.freeze([{ id: "Bridge", name: "Bridge" }, { id: "Bunker", name: "Bunker" }, { id: "Datacenter", name: "Datacenter" }, { id: "Industry", name: "Industry" }, { id: "Sand", name: "Sand" }, { id: "Santorini", name: "Santorini" }, { id: "Siberia", name: "Siberia" }, { id: "Station", name: "Station" }, { id: "Hospital", name: "Hospital" }, { id: "Range", name: "Range" }, { id: "WW2range", name: "WW2range" }, { id: "Tutorial", name: "Tutorial" }, { id: "Killhouse ", name: "Killhouse " }, { id: "containeryard", name: "containeryard" }, { id: "Stalingrad_night", name: "Stalingrad_night" }, { id: "Datacenter_night", name: "Datacenter_night" }, { id: "santorini_night", name: "santorini_night" }, { id: "sand_night", name: "sand_night" }, { id: "Siberia_night", name: "Siberia_night" }, { id: "station_night", name: "station_night" }, { id: "industry_night", name: "industry_night" }, { id: "containeryard_night", name: "containeryard_night" }]),
    COMMAND_LIST: [],
    DEFAULTS: [],
};

// Build the PavlovServer API
(() => {
    PavlovServer.DEFAULTS = Object.freeze([[], PavlovServer.DEFAULT_MODES, PavlovServer.DEFAULT_TEAMS, PavlovServer.DEFAULT_MAPS, PavlovServer.DEFAULT_SKINS, PavlovServer.DEFAULT_TTT_ROLES, [], PavlovServer.DEFAULT_AMMO_LIMITS, [], [], []]);
    // Base command all other commands use
    PavlovServer.sendCommand= async (cmd, ...args) => {
        const queryString = `/command?cmd=${encodeURI(args.reduce((acc, param) => `${acc} ${param}`, cmd))}`;
        const res = await fetch(queryString);
        return await res.json();
    };

    PavlovServer.sendCommand.tooltip = "Sends a RCon command";
    PavlovServer.sendCommand.commandName = "sendCommand";
    PavlovServer.sendCommand.parameterTypes = [{ required: true, type: PavlovServer.PARAM_TYPE.STRING }];
    PavlovServer.COMMAND_LIST.push(PavlovServer.sendCommand);

    // Construct commands from array of "known commands"
    // This is a lazy way of creating all the commands without typing a function for each one
    // the array format is [function name, rcon command, command success value(a value that is true when success) or null(don't check if success), the value to be returned from the command response, [tooltip, params...]]
    [
        ["getInfo", "serverinfo", "Successful", "ServerInfo", ["Returns Server Info"]],
        ["getItems", "itemlist", "Successful", "ItemList", ["Returns Item list"]],
        ["getBans", "banlist", null, "BanList", ["Returns list of banned players"]],
        ["getMapRotation", "maplist", "Successful", "MapList", ["Returns list of maps in server rotation"]],
        ["getHelp", "help", "Successful", "Help", ["Returns the full list of commands and their parameters"]],
        ["getPlayers", "refreshlist", "Successful", "PlayerList", ["Returns a list of players on the server"]],
        ["getModerators", "moderatorlist", "Successful", "ModeratorList", ["Returns a list of moderators"]],
        ["rotateMap", "RotateMap", "RotateMap", "RotateMap", ["Swaps the server map to the next map in rotation"]],
        ["switchMap", "SwitchMap", "SwitchMap", "SwitchMap", ["Sets the server map", { required: true, type: PavlovServer.PARAM_TYPE.MAP }, { required: true, type: PavlovServer.PARAM_TYPE.MODE }]],
        ["setServerName", "updateservername", "Successful", "Successful", ["Sets the server name", { required: true, type: PavlovServer.PARAM_TYPE.STRING }]],
        ["removeModerator", "removeMod", "RemoveMod", "RemoveMod", ["Removes the player from the moderator list", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["addModerator", "addMod", "AddMod", "AddMod", ["Adds the specified player to the moderator list", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["addBan", "ban", "Ban", "Ban", ["Bans a player from the server", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["removeBan", "unban", "Unban", "Unban", ["Unbans a player from the server", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["removeMapRotation", "removemaprotation", "RemoveMapRotation", "RemoveMapRotation", ["Removes a map from rotation", { required: true, type: PavlovServer.PARAM_TYPE.MAP }, { required: true, type: PavlovServer.PARAM_TYPE.MODE }]],
        ["addMapRotation", "addmaprotation", "AddMapRotation", "AddMapRotation", ["Adds the specified map with the specified game mode to the bottom of the map rotation", { required: true, type: PavlovServer.PARAM_TYPE.MAP }, { required: true, type: PavlovServer.PARAM_TYPE.MODE }]],
        ["setWhitelistEnabled", "EnableWhitelist", "EnableWhitelist", "EnableWhitelist", ["Enable/Disable the server whitelist", { required: true, type: PavlovServer.PARAM_TYPE.BOOL }]],
        ["setPlayerMuted", "Gag", "Gag", "Gag", ["Mutes/Unmutes a player", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["giveTeamItem", "GiveAll", "GiveAll", "GiveAll", ["Gives the item to all players on the team", { required: true, type: PavlovServer.PARAM_TYPE.TEAM }, { required: true, type: PavlovServer.PARAM_TYPE.ITEM }]], // may not be right
        ["givePlayerCash", "GiveCash", "GiveCash", "GiveCash", ["Gives cash to the player", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.INT }]],
        ["givePlayerItem", "GiveItem", "GiveItem", "GiveItem", ["Gives item to the player", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.ITEM }]],
        ["giveTeamCash", "GiveTeamCash", "GiveTeamCash", "GiveTeamCash", ["Gives cash to each member of the team", { required: true, type: PavlovServer.PARAM_TYPE.TEAM }, { required: true, type: PavlovServer.PARAM_TYPE.INT }]],
        ["getPlayersDetailed", "InspectAll", "Successful", "InspectList", ["Returns details for all players"]], // may not be right, does not work on legacy servers
        ["getPlayerDetails", "InspectPlayer", "Successful", "PlayerInfo", ["Returns player details", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]], // may not be right
        ["getTeamDetails", "InspectTeam", "Successful", "InspectList", ["Returns details for all players on the team", { required: true, type: PavlovServer.PARAM_TYPE.TEAM }]], // may not be right
        ["kickPlayer", "Kick", "Kick", "Kick", ["Kicks the player", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["killPlayer", "Kill", "Kill", "Kill", ["Kills the player", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["resetSND", "ResetSND", "ResetSND", "ResetSND", ["Resets SND match"]],
        ["pauseMatch", "PauseMatch", "PauseMatch", "PauseMatch", ["Pauses match for an amount of seconds", { required: false, type: PavlovServer.PARAM_TYPE.INT }]],
        ["setBalanceTableURL", "SetBalanceTableURL", "SetBalanceTableURL", "SetBalanceTableURL", ["Sets the balance table url", { required: true, type: PavlovServer.PARAM_TYPE.STRING }]],
        ["setPlayerCash", "SetCash", "SetCash", "SetCash", ["Sets the player cash", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.INT }]],
        ["setLimitedAmmoType", "SetLimitedAmmoType", "SetLimitedAmmoType", "SetLimitedAmmoType", ["Limits all players ammo", { required: true, type: PavlovServer.PARAM_TYPE.AMMO_LIMIT }]],
        ["setMaxPlayerCount", "SetMaxPlayers", "SetMaxPlayers", "SetMaxPlayers", ["Sets the max players connected to the server", { required: true, type: PavlovServer.PARAM_TYPE.INT, max: 24, min: 1 }]],
        ["setServerPin", "SetPin", "SetPin", "SetPin", ["Sets the server pin, use no parameters to clear the pin", { required: false, type: PavlovServer.PARAM_TYPE.INT, max: 9999, min: 0}]],
        ["setPlayerSkin", "SetPlayerSkin", "SetPlayerSkin", "SetPlayerSkin", ["Sets the players skin", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.SKIN }]],
        ["setTimeLimit", "SetTimeLimit", "SetTimeLimit", "SetTimeLimit", ["Sets the time limit of the current match to the specified amount in seconds", { required: true, type: PavlovServer.PARAM_TYPE.INT, min: 0 }]], // may not be right
        ["showNametags", "ShowNametags", "ShowNametags", "ShowNametags", ["Enables or disables name tags above friendly players", { required: true, type: PavlovServer.PARAM_TYPE.BOOL }]],
        ["damagePlayer", "Slap", null, null, ["Damages the player", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.INT, min: 0 }]],
        ["setPlayerTeam", "SwitchTeam", "SwitchTeam", "SwitchTeam", ["Swaps the players team", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.TEAM }]],
        ["teleportPlayerToPlayer", "Teleport", "Teleport", "Teleport", ["Teleports the first player to the second", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }]],
        ["forceEnableTTTSkins", "TTTAlwaysEnableSkinMenu", "TTTAlwaysEnableSkinMenu", "TTTAlwaysEnableSkinMenu", ["Always show the TTT Skin menu", { required: true, type: PavlovServer.PARAM_TYPE.BOOL }]], // may not be right
        ["endTTTRound", "TTTEndRound", "TTTEndRound", "TTTEndRound", ["Ends the round", { required: true, type: PavlovServer.PARAM_TYPE.TEAM }]], // may not be right
        ["resetTTTKarma", "TTTFlushKarma", "TTTFlushKarma", "TTTFlushKarma", ["Resets all players TTT karma"]], // may not be right
        ["setPlayerTTTCredits", "TTTGiveCredits", "TTTGiveCredits", "TTTGiveCredits", ["Adds the specified amount of TTT credits to the player", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.INT, min: 0 }]], // may not be right
        ["setTTTTimerPaused", "TTTPauseTimer", "TTTPauseTimer", "TTTPauseTimer", ["Pauses the TTT round timer", { required: true, type: PavlovServer.PARAM_TYPE.BOOL }]], // may not be right
        ["setPlayerTTTKarma", "TTTSetKarma", "TTTSetKarma", "TTTSetKarma", ["Sets the players TTT karma", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.INT }]], // may not be right
        ["setPlayerTTTRole", "TTTSetRole", "TTTSetRole", "TTTSetRole", ["Sets the players TTT Role", { required: true, type: PavlovServer.PARAM_TYPE.PLAYER_ID }, { required: true, type: PavlovServer.PARAM_TYPE.TTT_ROLE }]], // may not be right
        ["SetCompEnabled", "EnableCompMode", "EnableCompMode", "EnableCompMode", ["Enable/Disable competitive mode", { required: true, type: PavlovServer.PARAM_TYPE.BOOL }]],
        ["shutdownServer", "Shutdown", "Shutdown", "Shutdown", ["Shutdown the server"]], // may not be right
    ].forEach(cmd => {
        PavlovServer[cmd[0]] = async (...args) => {
            let result = null;
            result = await PavlovServer.sendCommand(cmd[1], ...args);
            if (cmd[2] === null || result[cmd[2]]) {
                if (cmd[3] !== null) {
                    return result[cmd[3]];
                } else {
                    return true;
                }
            } else {
                throw new Error(`PavlovServer command ${cmd[1]} unsuccessful`);
            }
        };

        PavlovServer[cmd[0]].tooltip = cmd[4][0];
        PavlovServer[cmd[0]].commandName = cmd[0];
        PavlovServer[cmd[0]].parameterTypes = cmd[4].filter((v, index) => index > 0);
        PavlovServer.COMMAND_LIST.push(PavlovServer[cmd[0]]);
    });
    PavlovServer.COMMAND_LIST = Object.freeze(PavlovServer.COMMAND_LIST);
})();
