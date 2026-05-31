const pty = require("node-pty");
const {
  ECHO_TO_STDOUT,
  MAX_BUFFER,
  TERM_COLS,
  TERM_ROWS,
  WORKDIR,
} = require("../config/env");

class TerminalSession {
  constructor(shellCommand, shellArgs) {
    this.buffer = "";
    this.exit = null;
    this.listeners = [];

    this.shell = pty.spawn(shellCommand, shellArgs, {
      name: "xterm-256color",
      cols: TERM_COLS,
      rows: TERM_ROWS,
      cwd: WORKDIR,
      env: {
        ...process.env,
        TERM: "xterm-256color",
      },
    });

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on("data", (data) => {
      this.shell.write(data);
    });

    this.shell.onData((data) => {
      if (ECHO_TO_STDOUT) {
        process.stdout.write(data);
      }

      this.buffer += data;

      if (this.buffer.length > MAX_BUFFER) {
        this.buffer = this.buffer.slice(-MAX_BUFFER);
      }

      this.emit("data", data);
    });

    this.shell.onExit(({ exitCode, signal }) => {
      this.exit = { exitCode, signal };
      this.emit("exit", this.exit);

      console.log(`Terminal command exited: code=${exitCode} signal=${signal}`);

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }

      setTimeout(() => {
        process.exit(exitCode ?? 0);
      }, 250);
    });
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  emit(event, data) {
    this.listeners
      .filter((listener) => listener.event === event)
      .forEach((listener) => listener.callback(data));
  }
}

module.exports = { TerminalSession };
