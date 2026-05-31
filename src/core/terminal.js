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
      cwd: WORKDIR,
      env: {
        ...process.env,
        TERM: "xterm-256color",
      },
    });

    // verify if terminal was available or not bro
    if (process.stdin.isTTY) {
      // listening to every stroke of host terminal input
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // write to shell after getting the input from host terminal
    process.stdin.on("data", (data) => {
      this.shell.write(data);
    });

    // after getting the data from shell writing it to host terminal
    this.shell.onData((data) => {
      if (ECHO_TO_STDOUT) {
        // this write the user input to the host terminal
        process.stdout.write(data);
      }

      this.buffer += data;
      if (this.buffer.length > MAX_BUFFER) {
        this.buffer = this.buffer.slice(-MAX_BUFFER);
      }

      // ! need to verify it was need or not
      this.emit("data", data);
    });

    // if the terminal was exited in host machine exit the process and inform the listeing clients
    this.shell.onExit(({ exitCode, signal }) => {
      this.exit = { exitCode, signal };
      this.emit("exit", this.exit);

      console.log(`Terminal-Expose exited: code=${exitCode} signal=${signal}`);

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    });
  }

  write(data) {
    if (this.shell) {
      this.shell.write(data);
    }
  }

  resize(cols, rows) {
    if (this.shell && cols && rows) {
      try {
        this.shell.resize(cols, rows);
      } catch (err) {
        console.error("Failed to resize terminal", err);
      }
    }
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
