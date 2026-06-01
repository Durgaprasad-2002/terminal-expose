const { io } = require("socket.io-client");
const { EventEmitter } = require("events");

class CliClient extends EventEmitter {
  constructor({ url, token, noResize = false, debug = false }) {
    super();
    this.baseUrl = url;
    this.token = token;
    this.noResize = noResize;
    this.debug = debug;
    this.socket = null;
    this.connected = false;
    this.originalTerminalMode = null;
  }

  _log(msg) {
    if (this.debug) {
      console.error(`[CLI] ${msg}`);
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.baseUrl, {
          transports: ["websocket"],
          auth: {
            token: this.token,
          },
          reconnection: true,
          reconnectionAttempts: 60,
          timeout: 5000,
        });

        this.socket.on("connect", () => this._onConnect());
        this.socket.on("disconnect", () => this._onDisconnect());
        this.socket.on("connect_error", (err) => {
          this._log(`Connection error: ${err.message}`);
          if (!this.connected) {
            reject(err);
          }
        });
        this.socket.on("terminal-output", (data) =>
          this._onTerminalOutput(data),
        );
        this.socket.on("terminal-exit", (exitData) =>
          this._onTerminalExit(exitData),
        );

        // Wait for connection
        const connectTimeout = setTimeout(
          () => reject(new Error("Connection timeout")),
          6000,
        );

        this.once("connected", () => {
          clearTimeout(connectTimeout);
          resolve();
        });

        this.once("connection_failed", (err) => {
          clearTimeout(connectTimeout);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  _onConnect() {
    this._log("Connected to server");
    this.connected = true;
    this.emit("connected");

    // Setup handlers after connection
    this._setupInputHandler();
    this._setupResizeHandler();

    // Send initial terminal size
    this._sendTerminalResize();
  }

  _onDisconnect() {
    const wasConnected = this.connected;
    this.connected = false;

    if (wasConnected) {
      console.error("\n[Disconnected from terminal server]");
    }

    this._cleanupInputHandler();
    this._cleanupResizeHandler();
  }

  _onTerminalOutput(data) {
    if (this.connected) {
      process.stdout.write(data);
    }
  }

  _onTerminalExit(exitData) {
    console.error(
      `\n[Terminal exited with code ${exitData.exitCode || 0}${exitData.signal ? `, signal ${exitData.signal}` : ""}]`,
    );
    this.disconnect();
    process.exit(exitData.exitCode || 0);
  }

  _setupInputHandler() {
    if (!process.stdin.isTTY) {
      // Handle piped input
      process.stdin.on("data", (data) => {
        if (this.connected) {
          this.socket.emit("terminal-input", data.toString());
        }
      });
      return;
    }

    try {
      this.originalTerminalMode = process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on("data", (data) => {
        if (this.connected) {
          // Ctrl+D to disconnect
          if (data.length === 1 && data[0] === 4) {
            this.disconnect();
            return;
          }
          this.socket.emit("terminal-input", data.toString());
        }
      });
    } catch (err) {
      this._log(`Failed to setup input handler: ${err.message}`);
    }
  }

  _cleanupInputHandler() {
    process.stdin.removeAllListeners("data");
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(this.originalTerminalMode ?? false);
      } catch (err) {
        this._log(`Failed to restore terminal mode: ${err.message}`);
      }
    }
  }

  _setupResizeHandler() {
    if (this.noResize || !process.stdout.isTTY) {
      return;
    }

    process.stdout.on("resize", () => {
      this._sendTerminalResize();
    });
  }

  _cleanupResizeHandler() {
    if (!this.noResize && process.stdout.isTTY) {
      process.stdout.removeAllListeners("resize");
    }
  }

  _sendTerminalResize() {
    if (this.noResize || !process.stdout.isTTY) {
      return;
    }

    const { columns, rows } = process.stdout;
    if (this.connected) {
      this.socket.emit("terminal-resize", {
        cols: columns,
        rows: rows,
      });
    }
  }

  disconnect() {
    this._cleanupInputHandler();
    this._cleanupResizeHandler();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
  }
}

module.exports = { CliClient };
