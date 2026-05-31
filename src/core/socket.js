const { Server } = require("socket.io");
const { SESSION_TOKEN } = require("../config/env");

function setupSocket(server, terminalSession) {
  const io = new Server(server, {
    cors: {
      origin: false,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (token !== SESSION_TOKEN) {
      return next(new Error("unauthorized"));
    }

    return next();
  });

  io.on("connection", (socket) => {
    console.log(`Viewer connected: ${socket.id}`);

    if (terminalSession.buffer) {
      socket.emit("terminal-output", terminalSession.buffer);
    }

    if (terminalSession.exit) {
      socket.emit("terminal-exit", terminalSession.exit);
    }

    socket.on("disconnect", () => {
      console.log(`Viewer disconnected: ${socket.id}`);
    });
  });

  terminalSession.on("data", (data) => {
    io.emit("terminal-output", data);
  });

  terminalSession.on("exit", (exitState) => {
    io.emit("terminal-exit", exitState);
  });

  return io;
}

module.exports = { setupSocket };
