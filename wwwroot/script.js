const DEFAULT_DATASETS = Object.freeze({
    SERVER_INFO: "ServerInfo",
    PLAYER_LIST: "PlayerList",
    ITEM_LIST: "ItemList",
    BAN_LIST: "BanList",
    MOD_LIST: "ModList",
    MAP_ROTATION: "MapRotation",
    HELP_INFO: "Help",
    MAP_LIST: "MapList",
    MODE_LIST: "ModeList",
    WORKSHOP_RESULTS: "WorkshopSearchResults",
});

const refreshSets = {};
const DatasetManager = {
    _datasets: {},
    getOrCreateDataset: (datasetName) => {
        let set = DatasetManager._datasets[datasetName];
        if (!set) {
            set = { name: datasetName, data: null, listeners: [] };
            DatasetManager._datasets[datasetName] = set;
        }

        return set;
    },
    setData: (datasetName, data) => {
        const set = DatasetManager.getOrCreateDataset(datasetName);
        set.data = data;
        set.listeners.forEach(cb => {
            try {
                cb(set);
            } catch (e) {
                console.error("Data Callback Error:", e);
            }
        });
    },
    getData: (datasetName) => {
        return DatasetManager._datasets[datasetName]?.data;
    },
    addDataListener: (datasetName, cb) => {
        DatasetManager.getOrCreateDataset(datasetName).listeners.push(cb);
    },
    removeDataListener: (datasetName, cb) => {
        const set = DatasetManager.getOrCreateDataset(datasetName);
        set.listeners = set.listeners.filter(v => v !== cb);
    }
};

const AutoRefreshSet = function (datasetName, callback, interval, defaultValue = undefined) {
    this.datasetName = datasetName;
    this._dataCallback = callback;
    this._requestInterval = interval;
    this._boundRefresh = this.tryRefresh.bind(this);
    this._timeout = null;
    if (defaultValue !== undefined) {
        DatasetManager.setData(this.datasetName, defaultValue);
    }

    this.tryRefresh();
};

AutoRefreshSet.prototype.tryRefresh = async function () {
    try {
        await this.refresh();
    } catch (e) {
        console.error(`Failed to refresh dataset "${this.datasetName}", error: ${e}`);
    }
};

AutoRefreshSet.prototype.refresh = async function () {
    if (this._requestInterval !== -1) {
        if (this._timeout !== null) {
            clearTimeout(this._timeout);
        }

        this._timeout = setTimeout(this._boundRefresh, this._requestInterval);
    }

    const data = await this._dataCallback();
    DatasetManager.setData(this.datasetName, data);
};

DatasetManager.addDataListener(DEFAULT_DATASETS.SERVER_INFO, (dataset) => {
    const infoDiv = document.querySelector(".server-info");
    const info = dataset.data;
    infoDiv.innerHTML = `
    <h2>Info</h2>
    <h3>Server Name: ${info.ServerName}</h3>
    <h3>Player Count: ${info.PlayerCount}</h3>
    <h3>Game Mode: ${info.GameMode}</h3>
    <h3>Map Id: ${info.MapLabel}</h3>
    <h3>Round State: ${info.RoundState}</h3>
    <h3>Team Score: ${info.Teams ? `${info.Team0Score} - ${info.Team1Score}` : "NA"}</h3>`;
});

DatasetManager.addDataListener(DEFAULT_DATASETS.PLAYER_LIST, (dataset) => {
    const infoDiv = document.querySelector(".player-list");
    const players = dataset.data;
    infoDiv.innerHTML = `
    <h2>Connected:</h2>
    <ul>
    ${players.reduce((acc, player) => (acc + `<li><h3>${player.Username}</h3><h4>${player.UniqueId}</h4></li>`), "") || "<li>No Players Connected</li>"}
    </ul>`;
});

DatasetManager.addDataListener(DEFAULT_DATASETS.MOD_LIST, (dataset) => {
    const infoDiv = document.querySelector(".mod-list");
    const players = dataset.data;
    infoDiv.innerHTML = `
    <h3>Moderators:</h3>
    <ul>
    ${players.reduce((acc, player) => (acc + `<li><h4>${player}</h4><button class="remove-button" data-id="${player}">Remove</button></li>`), "") || "<li>No Moderators</li>"}
    </ul>`;
    infoDiv.querySelectorAll(".remove-button").forEach(b => b.addEventListener("click", e => {
        e.preventDefault();
        if (e.target.dataset.id !== undefined) {
            PavlovServer.removeMod(e.target.dataset.id);
        }
    }));
});

DatasetManager.addDataListener(DEFAULT_DATASETS.BAN_LIST, (dataset) => {
    const infoDiv = document.querySelector(".banned-list");
    const players = dataset.data;
    infoDiv.innerHTML = `
    <h3>Banned:</h3>
    <ul>
    ${players.reduce((acc, player) => (acc + `<li><h4>${player}</h4><button class="remove-button" data-id="${player}">Remove</button></li>`), "") || "<li>No Banned Players</li>"}
    </ul>`;
    infoDiv.querySelectorAll(".remove-button").forEach(b => b.addEventListener("click", e => {
        e.preventDefault();
        if (e.target.dataset.id !== undefined) {
            PavlovServer.removeBan(e.target.dataset.id);
        }
    }));
});

DatasetManager.addDataListener(DEFAULT_DATASETS.MAP_ROTATION, (dataset) => {
    const infoDiv = document.querySelector(".map-rotation");
    const maps = dataset.data;
    infoDiv.innerHTML = `
    <h2>Rotation:</h2>
    <ul>
    ${maps.reduce((acc, map) => (acc + `<li><h3>Map Id: ${map.MapId} Game Mode: ${map.GameMode}</h3><button class="remove-button" data-id="${map.MapId}" data-mode="${map.GameMode}">Remove</button></li>`), "") || "<li>No Maps in rotation</li>"}
    </ul>`;
    infoDiv.querySelectorAll(".remove-button").forEach(b => b.addEventListener("click", e => {
        e.preventDefault();
        if (e.target.dataset.id !== undefined && e.target.dataset.mode !== undefined) {
            PavlovServer.removeMapRotation(e.target.dataset.id, e.target.dataset.mode);
        }
    }));
});

let selectedMapId = null;
DatasetManager.addDataListener(DEFAULT_DATASETS.MAP_LIST, (dataset) => {
    const maps = dataset.data;
    const mapSelect = document.querySelector(".map-swap-select");
    mapSelect.innerHTML = `
        ${maps.reduce((acc, map) => (acc + `<option value="${map.id}" ${map.id === selectedMapId ? "selected" : ""} >${map.name}</option>`), "")}
        <option class="workshop-map-option" value="">Select from workshop</option>`;
    mapSelect.querySelector(".workshop-map-option").addEventListener("click", e => {
        e.preventDefault();
        document.querySelector(".workshop-search-wrapper").hidden = false;
    });
});

DatasetManager.addDataListener(DEFAULT_DATASETS.MODE_LIST, (dataset) => {
    const modes = dataset.data;
    const mapSelect = document.querySelector(".map-mode-select");
    mapSelect.innerHTML = modes.reduce((acc, mode) => (acc + ` <option value="${mode.id}">${mode.name}</option> `), "");
});

DatasetManager.addDataListener(DEFAULT_DATASETS.WORKSHOP_RESULTS, (dataset) => {
    const resDiv = document.querySelector(".workshop-results");
    const results = dataset.data;
    resDiv.innerHTML = `<h3>Result Count: ${results.totalCount}</h3>
    <ul>
        ${results.maps.reduce((acc, map) => (acc + `<li class="workshop-result" data-id="UGC${map.id}" data-name="${map.title}" style="background-image: url('${map.image}');"><div><h3>${map.title}</h3><p>${map.description}</p></div></li>`), "")}
    </ul>
    <button class="workshop-next-button">Next Page</button>`;
    resDiv.querySelectorAll("li").forEach(li => {
        li.addEventListener("click", e => {
            e.preventDefault();
            const resLi = e.target.closest(".workshop-result");
            if (resLi !== null) {
                const mapList = DatasetManager.getData(DEFAULT_DATASETS.MAP_LIST);
                const newMap = { id: resLi.dataset.id, name: resLi.dataset.name };
                if (mapList.find(m => m.id === newMap.id) === undefined) {
                    mapList.push(newMap);
                }

                selectedMapId = newMap.id;
                DatasetManager.setData(DEFAULT_DATASETS.MAP_LIST, mapList);
                document.querySelector(".workshop-search-wrapper").hidden = true;
            }
        });
    });

    resDiv.querySelector(".workshop-next-button").addEventListener("click", async e => {
        e.preventDefault();
        try {
            const res = await fetch(`/map/search?next=${results.next}`);
            const text = decodeURI(await res.text());
            DatasetManager.setData(DEFAULT_DATASETS.WORKSHOP_RESULTS, JSON.parse(text));
        } catch (e) {
            console.error("Search Error: ", e);
        }
    });
});

document.querySelector(".rotate-button").addEventListener("click", e => {
    e.preventDefault();
    PavlovServer.rotateMap();
});

document.querySelector(".add-rotation-button").addEventListener("click", e => {
    e.preventDefault();
    const mapId = document.querySelector(".map-swap-select").value;
    const modeId = document.querySelector(".map-mode-select").value;
    PavlovServer.addMapRotation(mapId, modeId);
});

document.querySelector(".set-map-button").addEventListener("click", e => {
    e.preventDefault();
    const mapId = document.querySelector(".map-swap-select").value;
    const modeId = document.querySelector(".map-mode-select").value;
    PavlovServer.switchMap(mapId, modeId);
});

document.querySelector(".workshop-search-wrapper").addEventListener("click", e => {
    const wrapper = document.querySelector(".workshop-search-wrapper");
    if (e.target === wrapper) {
        e.preventDefault();
        wrapper.hidden = true;
    }
});

document.querySelector(".workshop-search-form").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        const res = await fetch(`/map/search?query=${encodeURI(e.target[0].value)}`);
        const text = decodeURI(await res.text());
        DatasetManager.setData(DEFAULT_DATASETS.WORKSHOP_RESULTS, JSON.parse(text));
    } catch (e) {
        console.error("Search Error: ", e);
    }
});

document.querySelector(".command-input").innerHTML = `
    <h3>Select Command</h3>
    <select class="command-select">
        ${PavlovServer.COMMAND_LIST.reduce((acc, cmd, idx) => acc + `<option value="${idx}" title="${cmd.tooltip}">${cmd.commandName}</option>`, "")}
    </select>
    <form data-count="1" data-command="0" class="command-form">
        <h3>Enter Parameters</h3>
        <input name="0" type="text" placeholder="Enter Text" value="" />
        <br/>
        <h3 class="inline-block">Send Command</h3>
        <button>Send</button>
    </form>`;

document.querySelectorAll(".command-select option").forEach(opt => opt.addEventListener("click", e => {
    e.preventDefault();
    const commandIndex = parseInt(e.target.value);
    const form = document.querySelector(".command-form");
    const command = PavlovServer.COMMAND_LIST[commandIndex];
    const parameters = command.parameterTypes;
    form.dataset.count = parameters.length;
    form.dataset.command = commandIndex;
    const createParamInput = (acc, param, index) => {
        let input = "";
        switch (param.type) {
            case PavlovServer.PARAM_TYPE.BOOL:
                input = `<select name="${index}"><option value="true">True</option><option value="false">False</option></select>`
                break;
            case PavlovServer.PARAM_TYPE.INT:
                input = `<input name="${index}" type="number" ${param.min ? `min="${param.min}"` : ""} ${param.max ? `max="${param.max}"` : ""} placeholder="Enter Number" value="" />`
                break;
            case PavlovServer.PARAM_TYPE.STRING:
                input = `<input name="${index}" type="text" placeholder="Enter Text" value="" />`
                break;
            case PavlovServer.PARAM_TYPE.TEAM:
                input = `<select name="${index}">${PavlovServer.DEFAULT_TEAMS.reduce((acc, t) => acc + `<option value="${t.id}">${t.name}</option>`, "")}</select>`
                break;
            case PavlovServer.PARAM_TYPE.SKIN:
                input = `<select name="${index}">${PavlovServer.DEFAULT_SKINS.reduce((acc, t) => acc + `<option value="${t.id}">${t.name}</option>`, "")}</select>`
                break;
            case PavlovServer.PARAM_TYPE.AMMO_LIMIT:
                input = `<select name="${index}">${PavlovServer.DEFAULT_AMMO_LIMITS.reduce((acc, t) => acc + `<option value="${t.id}">${t.name}</option>`, "")}</select>`
                break;
            case PavlovServer.PARAM_TYPE.TTT_ROLE:
                input = `<select name="${index}">${PavlovServer.DEFAULT_TTT_ROLES.reduce((acc, t) => acc + `<option value="${t.id}">${t.name}</option>`, "")}</select>`
                break;
            case PavlovServer.PARAM_TYPE.ITEM:
                input = `<select name="${index}">${DatasetManager.getData(DEFAULT_DATASETS.ITEM_LIST).reduce((acc, t) => acc + `<option value="${t}">${t}</option>`, "")}</select>`
                break;
            case PavlovServer.PARAM_TYPE.PLAYER_ID:
                input = `<select name="${index}">${DatasetManager.getData(DEFAULT_DATASETS.PLAYER_LIST).reduce((acc, t) => acc + `<option value="${t.id}">${t.name}</option>`, "")}</select>`
                break;
            case PavlovServer.PARAM_TYPE.MODE:
                input = `<select name="${index}">${DatasetManager.getData(DEFAULT_DATASETS.MODE_LIST).reduce((acc, t) => acc + `<option value="${t.id}">${t.name}</option>`, "")}</select>`
                break;
            case PavlovServer.PARAM_TYPE.MAP:
                input = `<select name="${index}">${DatasetManager.getData(DEFAULT_DATASETS.MAP_LIST).reduce((acc, t) => acc + `<option value="${t.id}">${t.name}</option>`, "")}</select>`
                break;
        }

        return acc + input;
    };

    form.innerHTML = `
        ${parameters.length > 0 ? "<h3>Enter Parameters</h3>" : ""}
        ${parameters.reduce(createParamInput, "")}
        <br/>
        <h3 class="inline-block">Send Command</h3>
        <button>Send</button>`;
}));

document.querySelector(".command-form").addEventListener("submit", async e => {
    e.preventDefault();
    let resultText = "";
    let commandParameters = "";
    for (let i = 0; i < parseInt(e.target.dataset.count); ++i) {
        commandParameters = commandParameters + ` ${e.target.querySelector(`[name="${i}"]`).value}`;
    }

    try {
        const res = await PavlovServer.COMMAND_LIST[parseInt(e.target.dataset.command)](e.target[0].value);
        resultText = JSON.stringify(res);
    } catch (e) {
        console.error(`Failed to execute command, error:`, e);
        resultText = "Failed to execute command";
    }

    document.querySelector(".command-output").innerText = resultText;
});

const localMapList = localStorage.getItem(DEFAULT_DATASETS.MAP_LIST);
DatasetManager.addDataListener(DEFAULT_DATASETS.MAP_LIST, dataset => localStorage.setItem(DEFAULT_DATASETS.MAP_LIST, JSON.stringify(dataset.data)));
if (localMapList !== null) {
    DatasetManager.setData(DEFAULT_DATASETS.MAP_LIST, JSON.parse(localMapList));
} else {
    DatasetManager.setData(DEFAULT_DATASETS.MAP_LIST, [...PavlovServer.DEFAULT_MAPS]);
}

const localModeList = localStorage.getItem(DEFAULT_DATASETS.MODE_LIST);
DatasetManager.addDataListener(DEFAULT_DATASETS.MODE_LIST, dataset => localStorage.setItem(DEFAULT_DATASETS.MODE_LIST, JSON.stringify(dataset.data)));
if (localModeList !== null) {
    DatasetManager.setData(DEFAULT_DATASETS.MODE_LIST, JSON.parse(localModeList));
} else {
    DatasetManager.setData(DEFAULT_DATASETS.MODE_LIST, [...PavlovServer.DEFAULT_MODES]);
}

// Auto populate DEFAULT_DATASETS with use of AutoRefreshSet and store them in refreshSets
// array format is [dataset name, dataCallbackFunction, fetch interval(ms), default value(optional)]
[
    [DEFAULT_DATASETS.SERVER_INFO, PavlovServer.getInfo, 3000, {}],
    [DEFAULT_DATASETS.PLAYER_LIST, PavlovServer.getPlayers, 3000, []],
    [DEFAULT_DATASETS.ITEM_LIST, PavlovServer.getItems, 10000, []],
    [DEFAULT_DATASETS.BAN_LIST, PavlovServer.getBans, 30000, []],
    [DEFAULT_DATASETS.MOD_LIST, PavlovServer.getModerators, 30000, []],
    [DEFAULT_DATASETS.MAP_ROTATION, PavlovServer.getMapRotation, 10000, []],
    [DEFAULT_DATASETS.HELP_INFO, PavlovServer.getHelp, 30000, []],
].forEach(args => refreshSets[args[0]] = new AutoRefreshSet(...args));
