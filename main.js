require("dotenv").config();
const RCon = require("./RCon.js");
const WebServer = require("./WebServer.js");
const path = require("path");

const HTTP_PORT = process.env.HTTP_PORT || 8080;
const RCON_PORT = process.env.RCON_PORT || 15777;
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const SERVER_ADDRESS = process.env.SERVER_ADDRESS || "127.0.0.1";
const RCON_PASS = process.env.RCON_PASS;
const WWWROOT = path.join(__dirname, "wwwroot");
const rcon = new RCon(SERVER_ADDRESS, RCON_PORT, RCON_PASS);
const server = new WebServer(HTTP_PORT, WWWROOT, STEAM_API_KEY, rcon);

// This is a hacky way of reconnecting if we lose connection or if there is a socket error
const reconnectRCon = async () => {
    try {
        if (!rcon.getConnected()) {
            await rcon.connect();
            console.log("Reconnected RCon");
        }
    } catch (e) {
        console.error("Failed to reconnect RCon", e);
    }
};

(async () => {
    await rcon.connect();
    console.log("RCon open:", RCON_PORT);
    const reconnectInterval = setInterval(reconnectRCon, 3000);
    await server.start();
    console.log("Server open:", HTTP_PORT);
    await server.waitForClose();
    clearInterval(reconnectInterval);
    console.log("Server closed");
    await rcon.disconnect();
    console.log("RCon closed")
})();
