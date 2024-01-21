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
const server = new WebServer(HTTP_PORT, WWWROOT, STEAM_API_KEY);

// This is a hacky way of reconnecting if we lose connection or if there is a socket error
const cycleRConConnection = async () => {
    try {
        const rcon = new RCon(SERVER_ADDRESS, RCON_PORT, RCON_PASS);
        await rcon.connect();
        server.setRCon(rcon);
    } catch (e) {
        console.error("Failed to connect RCon", e);
    }
};

// Prevents crash on unhandled rejected promise
process.on('unhandledRejection', (error, promise) => {
    console.error("Promise error", promise);
});

(async () => {
    await cycleRConConnection();
    const refreshInterval = setInterval(cycleRConConnection, 10000);
    await server.start();
    console.log("Server open:", HTTP_PORT);
    await server.waitForClose();
    clearInterval(refreshInterval);
    console.log("Server closed");
    const rcon = server.getRCon();
    if (rcon !== null) {
        await rcon.disconnect();
    }
})();
