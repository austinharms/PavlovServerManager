const RCon = require("./RCon.js");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

function WebServer(port, rootDir, steamApiKey, rcon = null) {
    const self = this;
    this.port = port;
    this._rootDir = rootDir;
    this._sApiKey = steamApiKey;
    this._rcon = rcon;
    this._closeP = new Promise((a, r) => { self._closePA = a; self._closePR = r; });
    this._server = http.createServer(this._requestHandler.bind(this));
    this._server.once("close", () => self._closePA());
    this._server.once("error", (...e) => self._closePR(...e));
    this._lastSteamRequest = new Date().getTime();
    this._steamRateLimitTime = 3000;
};

WebServer.CONTENT_TYPE = Object.freeze({
    TEXT: "text/plain; charset=utf-8",
    JSON: "text/json; charset=utf-8",
    HTML: "text/html; charset=utf-8",
    SCRIPT: "application/javascript; charset=utf-8",
    CSS: "text/css; charset=utf-8",
    PNG: "image/png",
});

WebServer.prototype._requestHTTPS = function (options) {
    return new Promise((a, r) => {
        const req = https.request(options, res => {
            let payload = "";
            res.once("end", () => a({ res, payload }));
            res.on("data", d => payload = payload + d);
            res.once("error", r);
        });

        req.once("error", r);
        req.end();
    });
};

// Returns true if our internal rate limit allows a request to be made and resets the timer
// Returns false if the last timer has not yet elapsed
WebServer.prototype._canPerformSteamRequest = function () {
    const time = new Date().getTime();
    if (time - this._lastSteamRequest >= this._steamRateLimitTime) {
        this._lastSteamRequest = time;
        return true;
    } else {
        return false;
    }
}

WebServer.prototype._writeTextResponse = function (res, status, content, contentType = WebServer.CONTENT_TYPE.TEXT) {
    res.writeHead(status, {
        "content-length": content.length,
        "content-type": contentType,
    });
    res.end(content);
};

WebServer.prototype._writeFileResponse = function (res, status, filename, contentType = WebServer.CONTENT_TYPE.TEXT) {
    const filepath = path.join(this._rootDir, filename);
    const stat = fs.statSync(filepath);
    fs.createReadStream(filepath).pipe(res);
    res.writeHead(status, {
        "content-length": stat.size,
        "content-type": contentType,
    });
};

WebServer.prototype._writeJSONErrorResponse = function (res, status, message, errorCode = "") {
    const error = JSON.stringify({ error: true, status, errorCode, message });
    this._writeTextResponse(res, status, error, WebServer.CONTENT_TYPE.JSON);
};

WebServer.prototype._parseURLParams = function (url) {
    const params = {};
    const urlSplit = url.split("?");
    if (urlSplit.length > 1) {
        urlSplit[1].split("&").forEach(v => {
            const pair = v.split("=");
            params[pair[0].toLowerCase()] = pair[1];
        });
    }

    return params;
};

WebServer.prototype._requestHandler = async function (req, res) {//(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const trueURL = decodeURI(req.url || "");
        const url = trueURL.toLowerCase();
        if (url === "/quit") {
            this._writeTextResponse(res, 200, "ok");
            this._server.close();
        } else if (url === "" || url.startsWith("/index") || url === "/") {
            this._writeFileResponse(res, 200, "index.html", WebServer.CONTENT_TYPE.HTML);
        } else if (url === "/script.js") {
            this._writeFileResponse(res, 200, "script.js", WebServer.CONTENT_TYPE.SCRIPT);
        } else if (url === "/dombuilder.js") {
            this._writeFileResponse(res, 200, "dombuilder.js", WebServer.CONTENT_TYPE.SCRIPT);
        } else if (url === "/pavlovserver.js") {
            this._writeFileResponse(res, 200, "pavlovserver.js", WebServer.CONTENT_TYPE.SCRIPT);
        } else if (url === "/style.css") {
            this._writeFileResponse(res, 200, "style.css", WebServer.CONTENT_TYPE.CSS);
        } else if (url.startsWith("/command")) {
            const command = this._parseURLParams(trueURL).cmd;
            if (command === undefined) {
                this._writeJSONErrorResponse(res, 400, "Bad Parameters");
                return;
            }

            if (this._rcon === null) {
                this._writeJSONErrorResponse(res, 503, "Try again later", commandResult);
                return;
            }

            const commandResult = await this._rcon.sendCommand(command).catch(e => e);
            if (RCon.isError(commandResult)) {
                switch (commandResult) {
                    case RCon.ERROR.DISCONNECTED:
                        this._writeJSONErrorResponse(res, 503, RCon.getErrorString(commandResult), commandResult);
                        break;
                    case RCon.ERROR.RESPONSE_TIMEOUT:
                    case RCon.ERROR.INVALID_COMMAND:
                        this._writeJSONErrorResponse(res, 400, RCon.getErrorString(commandResult), commandResult);
                        break;
                    default:
                        this._writeJSONErrorResponse(res, 500, RCon.getErrorString(commandResult), commandResult);
                        break;
                };
            } else {
                this._writeTextResponse(res, 200, commandResult, WebServer.CONTENT_TYPE.JSON);
            }
        } else if (url.startsWith("/map/search")) {
            if (!this._canPerformSteamRequest()) {
                this._writeJSONErrorResponse(res, 429, "Too Many Request, Try again later");
                return;
            }

            const params = this._parseURLParams(trueURL);
            const steamQueryString = `https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?key=${this._sApiKey}&query_type=0&page=0&cursor=${params.next || "*"}&numperpage=${params.count || 30}&creator_appid=555160&appid=555160&${params.next ? "" : `search_text=${params.query || ""}&`}filetype=18&return_previews=true`;
            const httpsRes = await this._requestHTTPS(steamQueryString);
            if (httpsRes.res.statusCode !== 200) {
                this._writeJSONErrorResponse(res, 502, "Bad Gateway", httpsRes.res.statusCode);
                return;
            }

            const payload = JSON.parse(httpsRes.payload);
            const jsonResponse = {
                totalCount: payload.response.total,
                next: payload.response.next_cursor,
                maps: (payload.response.publishedfiledetails || []).map(r => ({ id: r.publishedfileid, title: r.title, image: r.preview_url, description: r.file_description, tags: (r.tags || []).map(t => t.display_name) })),
            };

            // Hack: we encode the json here as there may be special characters that cause errors later
            this._writeTextResponse(res, 200, encodeURI(JSON.stringify(jsonResponse)), WebServer.CONTENT_TYPE.JSON);
        } else {
            this._writeJSONErrorResponse(res, 404, "Not Found");
        }
    } catch (e) {
        console.error("WebServer Error:", e);
        this._writeJSONErrorResponse(res, 500, "Server Error");
    }
};

WebServer.prototype._start = function (a, r) {
    this._server.once("error", r);
    this._server.listen(this.port, a);
};

WebServer.prototype.start = function () {
    return new Promise(this._start.bind(this));
};

WebServer.prototype.waitForClose = function () {
    return this._closeP;
};

WebServer.prototype.setRCon = function(rcon) {
    this._rcon = rcon;
};

WebServer.prototype.getRCon = function() {
    return this._rcon;
};

module.exports = WebServer;
