const net = require("net");
const crypto = require("crypto");

function RCon(address, port, password) {
    this.address = address;
    this.port = port;
    this._socket = null;
    this._hash = crypto.createHash("md5").update(password).digest("hex");
    this._commandQueue = [];
    this._commandCounter = 0;
    this._receiveBuffer = Buffer.from([]);
    this._receiveTimeout = null;
};

RCon.ERROR = Object.freeze({
    NONE: 0,
    DISCONNECTED: 1,
    SOCKET_ERROR: 2,
    AUTH_FAILED: 3, // The server did not send the correct login message
    AUTH_INCORRECT: 4, // The login credentials were incorrect
    GENERAL_ERROR: 5,
    INVALID_COMMAND: 6,
    RESPONSE_TIMEOUT: 7,
    ERROR_ENUM_VALUE_COUNT: 8,
});

RCon.isError = function (value) {
    return typeof (value) === typeof (RCon.ERROR.NONE) && value > RCon.ERROR.NONE && value < RCon.ERROR.ERROR_ENUM_VALUE_COUNT;
};

RCon.getErrorString = function (err) {
    return Object.entries(RCon.ERROR).find(([key, value]) => value === err)?.[0] || "";
};

RCon.prototype.connect = async function () {
    // console.log("connect");
    try {
        // Ensure socket is not already connected
        await this.disconnect();
        this._socket = new net.Socket();
        this._socket.once("error", this._destroySocket.bind(this));
        this._socket.once("close", this._destroySocket.bind(this));
        this._socket.on("data", this._socketDataHandler.bind(this));
        // Start auth early so it does not miss the first socket message
        const authRequest = this._authenticate().catch(e => e);
        await this._connectSocket();
        // Now the socket is connected wait for auth to complete
        const authRes = await authRequest;
        if (RCon.isError(authRes)) {
            throw authRes;
        }
    } catch (e) {
        if (RCon.isError(e)) {
            throw e;
        } else {
            console.error("RCon GENERAL_ERROR:", e);
            throw RCon.ERROR.GENERAL_ERROR;
        }
    }
};

// Waits for all pending commands to complete and gracefully ends the connection
RCon.prototype.disconnect = async function () {
    // console.log("disconnect");
    try {
        if (this.getConnected()) {
            const endMsg = await this._queueCommand("Disconnect");
            if (endMsg.toString() !== "Goodbye\r\n") {
                console.warn("Unexpected disconnect message: ", endMsg.toString());
            }
        }

        this._destroySocket();
    } catch (e) {
        if (RCon.isError(e)) {
            throw e;
        } else {
            console.error("RCon GENERAL_ERROR:", e);
            throw RCon.ERROR.GENERAL_ERROR;
        }
    }
};

RCon.prototype.getConnected = function () {
    // console.log("getConnected");
    return this._socket !== null && this._socket.destroyed === false && this._socket.closed === false;
}

RCon.prototype.sendCommand = async function (cmd) {
    // console.log("sendCommand");
    try {
        if (cmd.trim().length === 0 || cmd.trim().toLowerCase().startsWith("disconnect")) {
            throw RCon.ERROR.INVALID_COMMAND;
        }

        const cmdRes = await this._queueCommand(cmd);
        return cmdRes.toString();
    } catch (e) {
        if (RCon.isError(e)) {
            throw e;
        } else {
            console.error("RCon GENERAL_ERROR:", e);
            throw RCon.ERROR.GENERAL_ERROR;
        }
    }
};

RCon.prototype._connectSocket = function () {
    // console.log("_connectSocket");
    return new Promise((a, r) => {
        this._socket.once("connect", a);
        this._socket.once("error", () => r(RCon.ERROR.SOCKET_ERROR));
        this._socket.connect(this.port, this.address);
    });
};

RCon.prototype._authenticate = async function () {
    // console.log("_authenticate");
    const loginMessage = await this._queueCommand("");
    if (loginMessage.toString() !== "Password: ") {
        throw RCon.ERROR.AUTH_FAILED;
    }

    const loginResponse = await this._queueCommand(this._hash);
    if (loginResponse.toString() !== "Authenticated=1\r\n") {
        throw RCon.ERROR.AUTH_INCORRECT;
    }
};

RCon.prototype._destroySocket = function () {
    // console.log("_destroySocket");
    if (this._socket !== null) {
        if (!this._socket.destroyed) {
            this._socket.destroy();
        }

        this._socket = null;
        this._commandQueue[0]?.complete(RCon.ERROR.DISCONNECTED);
    }
};

RCon.prototype._socketDataHandler = function (data) {
    // console.log("_socketDataHandler");
    const keepAliveBuffer = Buffer.from("\r\n");
    if (Buffer.compare(data, keepAliveBuffer) === 0) {
        this._socket.write(keepAliveBuffer);
    } else {
        if (this._receiveTimeout !== null) {
            clearTimeout(this._receiveTimeout);
            this._receiveTimeout = null;
        }

        this._receiveBuffer = Buffer.concat([this._receiveBuffer, data]);
        this._receiveTimeout = setTimeout(this._socketDataComplete.bind(this), 50);
    }
};

RCon.prototype._socketDataComplete = function () {
    // console.log("_socketDataComplete");
    this._receiveTimeout = null;
    if (this._commandQueue.length > 0) {
        this._commandQueue[0].complete(RCon.ERROR.NONE, this._receiveBuffer);
    } else {
        console.warn("Received RCon data without sending a command, data:", this._receiveBuffer.toString());
    }

    this._receiveBuffer = Buffer.from([]);
};

RCon.prototype._queueCommand = function (commandString, timeoutDuration = 750) {
    // console.log("_queueCommand");
    const self = this;
    const commandPromiseCallbacks = []
    const commandPromise = new Promise((...args) => commandPromiseCallbacks.push(...args));
    let commandTimeout = null;
    const command = {
        commandIndex: this._commandCounter++,
        send: () => {
            // Don't send empty payloads, required for _authenticate to work
            if (commandString.length === 0) {
                return;
            }

            if (!self.getConnected()) {
                command.complete(RCon.ERROR.DISCONNECTED);
            } else {
                commandTimeout = setTimeout(command.complete, timeoutDuration, RCon.ERROR.RESPONSE_TIMEOUT);
                self._socket.write(commandString, e => (e ? command.complete(RCon.ERROR.SOCKET_ERROR, e) : null));
            }
        },
        complete: (errorCode, result = null) => {
            console.assert(command == self._commandQueue.shift(), "Command completed without being first in queue");
            if (commandTimeout !== null) {
                clearTimeout(commandTimeout);
            }

            self._commandQueue[0]?.send();
            if (errorCode === RCon.ERROR.NONE) {
                commandPromiseCallbacks[0](result);
            } else {
                if (errorCode === RCon.ERROR.SOCKET_ERROR) {
                    console.error("RCon SOCKET_ERROR:", result);
                }

                commandPromiseCallbacks[1](errorCode);
            }
        },
    };

    this._commandQueue.push(command);
    // if the queue was empty send the command now
    if (this._commandQueue.length === 1) {
        command.send();
    }

    return commandPromise;
};

module.exports = RCon;
