const DOMBuilder = {};

DOMBuilder.updateServerInfo = ({ data }) => {
    const targetDiv = document.querySelector(".server-info");
    targetDiv.innerHTML = `
    <h2>Info</h2>
    <h3>Server Name: ${data.ServerName}</h3>
    <h3>Player Count: ${data.PlayerCount}</h3>
    <h3>Game Mode: ${data.GameMode}</h3>
    <h3>Map Id: ${data.MapLabel}</h3>
    <h3>Round State: ${data.RoundState}</h3>
    <h3>Team Score: ${data.Teams ? `${info.Team0Score} - ${info.Team1Score}` : "NA"}</h3>`;
};

DOMBuilder.updatePlayerList = ({ data }) => {
    const targetDiv = document.querySelector(".player-list");
    targetDiv.innerHTML = data.reduce((acc, player) => (acc + `<li><h3>${player.Username}</h3><h4>${player.UniqueId}</h4></li>`), "") || "<li>No Players Connected</li>";
};

DOMBuilder.updateModeratorList = ({ data }) => {
    const targetDiv = document.querySelector(".mod-list");
    targetDiv.innerHTML = data.reduce((acc, player) => (acc + `<li><h4>${player}</h4>${DOMBuilder.createCommandForm("removeModerator", "Remove", [player], true)}</li>`), "") || "<li>No Moderators</li>";
};

DOMBuilder.updateBanList = ({ data }) => {
    const targetDiv = document.querySelector(".banned-list");
    targetDiv.innerHTML = data.reduce((acc, player) => (acc + `<li><h4>${player}</h4>${DOMBuilder.createCommandForm("removeBan", "Remove", [player], true)}</li>`), "") || "<li>No Banned Players</li>";
};

DOMBuilder.updateMapRotation = ({ data }) => {
    const targetDiv = document.querySelector(".map-rotation");
    targetDiv.innerHTML = data.reduce((acc, map) => (acc + `<li><h3>Map Id: ${map.MapId} Game Mode: ${map.GameMode}</h3>${DOMBuilder.createCommandForm("removeMapRotation", "Remove", [map.MapId, map.GameMode], true)}</li>`), "") || "<li>No Maps in rotation</li>"
};

DOMBuilder.updateWorkshopResults = ({ data }) => {
    const targetDiv = document.querySelector(".workshop-results");
    targetDiv.innerHTML = `<h3>Result Count: ${data.totalCount}</h3>
    <ul>
        ${data.maps.reduce((acc, map) => (acc + `<li class="workshop-result" data-id="UGC${map.id}" data-name="${map.title}" style="background-image: url('${map.image}');" onclick="onWorkshopResultSelected(this)"><div><h3>${map.title}</h3><p>${map.description}</p></div></li>`), "")}
    </ul>
    <button class="workshop-next-button" onclick="onWorkshopNextPage(this)">Next Page</button>`;
};

DOMBuilder.updateCustomCommand = () => {
    const targetDiv = document.querySelector(".command-input");
    targetDiv.innerHTML = `
    <h3 class="inline-block">Select Command:<h3>
    <select class="custom-command-select" onchange='document.querySelector(".command-input .command-form").innerHTML = DOMBuilder.createCommandForm(this.value);'>
    ${PavlovServer.COMMAND_LIST.reduce((acc, cmd, idx) => acc + `<option value="${cmd.commandName}" ${idx === 0?"selected":""}>${cmd.commandName}</option>`, "")}
    </select>
    <br/>
    ${DOMBuilder.createCommandForm(PavlovServer.COMMAND_LIST[0].commandName)}`;
};

DOMBuilder.createSelectOptions = ({ data }, selected = null, hasWorkshop = false) => data.reduce((acc, val) => acc + `<option ${selected === val.id ? "selected" : ""} value="${val.id}">${val.name}</option>`, "") + (hasWorkshop?`<option value="WORKSHOP" onclick="onOpenWorkshopResults(this)">Select from workshop</option>`:"");

DOMBuilder.createCommandForm = (commandName, buttonName = "Send", defaultValues = [], hidden = false) => {
    const command = PavlovServer[commandName];
    return `<form class="command-form inline-block" action="javascript:void(0);" onsubmit="onCommandFormSubmit(this)" data-command="${commandName}" data-count="${command.parameterTypes.length}" >${command.parameterTypes.reduce((acc, param, idx) => acc + DOMBuilder.createInputFromParameter(param, idx, defaultValues[idx] || "", hidden), "")}<button>${buttonName}</button></form>`;
};

DOMBuilder.createInputFromParameter = (param, index, defaultValue = "", hidden = false) => {
    switch (param.type) {
        case PavlovServer.PARAM_TYPE.BOOL:
            return `<select name="${index}" ${hidden ? "hidden" : ""}><option value="true" ${defaultValue ? "selected" : ""}>True</option><option value="false" ${defaultValue ? "" : "selected"}>False</option></select>`
        case PavlovServer.PARAM_TYPE.INT:
            return `<input name="${index}" type="number" ${param.min ? `min="${param.min}"` : ""} ${param.max ? `max="${param.max}"` : ""} ${hidden ? "hidden" : ""} placeholder="Enter Number" value="${defaultValue}" />`
        case PavlovServer.PARAM_TYPE.STRING:
            return `<input name="${index}" type="text" placeholder="Enter Text" value="${defaultValue}" ${hidden ? "hidden" : ""} />`
        case PavlovServer.PARAM_TYPE.TEAM:
        case PavlovServer.PARAM_TYPE.SKIN:
        case PavlovServer.PARAM_TYPE.AMMO_LIMIT:
        case PavlovServer.PARAM_TYPE.TTT_ROLE:
        case PavlovServer.PARAM_TYPE.ITEM:
        case PavlovServer.PARAM_TYPE.PLAYER_ID:
        case PavlovServer.PARAM_TYPE.MODE:
        case PavlovServer.PARAM_TYPE.MAP:
            let selectOptions = DOMBuilder.createSelectOptions({ data: PavlovServer.DEFAULTS[param.type] }, defaultValue, param.type === PavlovServer.PARAM_TYPE.MAP);
            if (defaultValue !== "" && selectOptions.search("<option selected") === -1) {
                selectOptions += `<option value="${defaultValue}">DEFAULT</option>`
            }

            return `<select class="param-select" name="${index}" data-type-id="${param.type}" ${hidden ? "hidden" : ""}>${selectOptions}</select>`
        default:
            return "";
    }
};
