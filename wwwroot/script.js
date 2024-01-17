const DEFAULT_DATASETS = Object.freeze({
    SERVER_INFO: "ServerInfo",
    PLAYER_LIST: "PlayerList",
    ITEM_LIST: "ItemList",
    BAN_LIST: "BanList",
    MOD_LIST: "ModList",
    MAP_ROTATION: "MapRotation",
    MAP_LIST: "MapList",
    MODE_LIST: "ModeList",
    WORKSHOP_RESULTS: "WorkshopSearchResults",
});

const refreshSets = {};
let activeWorkshopMapSelect = null;
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

DatasetManager.addDataListener(DEFAULT_DATASETS.SERVER_INFO, DOMBuilder.updateServerInfo);
DatasetManager.addDataListener(DEFAULT_DATASETS.PLAYER_LIST, DOMBuilder.updatePlayerList);
DatasetManager.addDataListener(DEFAULT_DATASETS.MOD_LIST, DOMBuilder.updateModeratorList);
DatasetManager.addDataListener(DEFAULT_DATASETS.BAN_LIST, DOMBuilder.updateBanList);
DatasetManager.addDataListener(DEFAULT_DATASETS.MAP_ROTATION, DOMBuilder.updateMapRotation);
DatasetManager.addDataListener(DEFAULT_DATASETS.WORKSHOP_RESULTS, DOMBuilder.updateWorkshopResults);
DatasetManager.addDataListener(DEFAULT_DATASETS.MODE_LIST, (dataset) => document.querySelectorAll(`.param-select[data-type-id="${PavlovServer.PARAM_TYPE.MODE}"]`).forEach(e => e.innerHTML = DOMBuilder.createSelectOptions(dataset, e.value)));
DatasetManager.addDataListener(DEFAULT_DATASETS.MAP_LIST, (dataset) => document.querySelectorAll(`.param-select[data-type-id="${PavlovServer.PARAM_TYPE.MAP}"]`).forEach(e => e.innerHTML = DOMBuilder.createSelectOptions(dataset, e.value, true)));
DatasetManager.addDataListener(DEFAULT_DATASETS.ITEM_LIST, (dataset) => document.querySelectorAll(`.param-select[data-type-id="${PavlovServer.PARAM_TYPE.ITEM}"]`).forEach(e => e.innerHTML = DOMBuilder.createSelectOptions(dataset, e.value)));
DOMBuilder.updateCustomCommand();

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
        if (res.status !== 200) {
            throw new Error("Status code not 200");
        }

        const text = decodeURI(await res.text());
        DatasetManager.setData(DEFAULT_DATASETS.WORKSHOP_RESULTS, JSON.parse(text));
    } catch (e) {
        console.error("Search Error: ", e);
    }
});

const onOpenWorkshopResults = e => {
    activeWorkshopMapSelect = e.closest("select");
    document.querySelector(".workshop-search-wrapper").hidden = false;
};

const onWorkshopResultSelected = e => {
    const resultId = e.dataset.id;
    const resultName = e.dataset.name;
    const maps = DatasetManager.getData(DEFAULT_DATASETS.MAP_LIST);
    if (maps.find(m => m.id === resultId) === undefined) {
        maps.push({ id: resultId, name: resultName });
        DatasetManager.setData(DEFAULT_DATASETS.MAP_LIST, maps);
    }

    if (activeWorkshopMapSelect !== null) {
        activeWorkshopMapSelect.innerHTML = DOMBuilder.createSelectOptions({ data: maps }, resultId, true);
        document.querySelector(".workshop-search-wrapper").hidden = true;
        activeWorkshopMapSelect = null;
    }
};

const onWorkshopNextPage = async e => {
    try {
        const res = await fetch(`/map/search?next=${DatasetManager.getData(DEFAULT_DATASETS.WORKSHOP_RESULTS).next}`);
        if (res.status !== 200) {
            throw new Error("Status code not 200");
        }

        const text = decodeURI(await res.text());
        console.log(text);
        DatasetManager.setData(DEFAULT_DATASETS.WORKSHOP_RESULTS, JSON.parse(text));
    } catch (e) {
        console.error("Search Error: ", e);
    }
};

const onCommandFormSubmit = async e => {
    const commandName = e.dataset.command;
    const output = document.querySelector(".command-output");
    try {
        const command = PavlovServer[commandName];
        if (command === undefined) {
            throw new Error("Unknown command");
        }

        const paramCount = parseInt(e.dataset.count);
        const params = [];
        for (let i = 0; i < paramCount; ++i) {
            params.push(e.querySelector(`[name="${i}"]`).value);
        }

        const res = await command(...params);
        output.innerText = JSON.stringify(res);
    } catch (e) {
        output.innerText = `Failed to execute command "${commandName}"`;
        console.error(`Failed to execute command "${commandName}"`, e);
    }
};

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
].forEach(args => refreshSets[args[0]] = new AutoRefreshSet(...args));
