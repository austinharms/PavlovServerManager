require("dotenv").config();
const RCon = require("./RCon.js");
const WebServer = require("./WebServer.js");
const path = require("path");

const HTTP_PORT = process.env.HTTP_PORT || 8080;
const RCON_PORT = process.env.RCON_PORT || 15777;
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const WWWROOT = path.join(__dirname, "wwwroot");

const rcon = new RCon("192.168.12.7", RCON_PORT, "PTECSVR");
const server = new WebServer(HTTP_PORT, WWWROOT, STEAM_API_KEY, rcon);

// Attempts to reconnect if RCon gets disconnected
const reconnectRCon = async () => {
    try {
        if (!rcon.getConnected()) {
            console.warn("RCon disconnected, reconnecting");
            await rcon.connect();
        }
    } catch (e) {
        console.error("Failed to reconnect RCon", e);
    }
};

// Hack: prevents crash on unhandled rejected promise
process.on('unhandledRejection', (error, promise) => {
    console.error("Promise error", promise);
});

(async () => {
    await rcon.connect();
    const reconnectInterval = setInterval(reconnectRCon, 3000);
    console.log("RCon open:", RCON_PORT);
    await server.start(rcon);
    console.log("Server open:", HTTP_PORT);
    await server.waitForClose();
    clearInterval(reconnectInterval);
    console.log("Server closed");
    await rcon.disconnect();
    console.log("RCon closed");
})();
