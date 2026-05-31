#!/usr/bin/env node

const http = require("http");
const { parseArgs } = require("./src/utils/args");
const { getDefaultShell, getLanUrls } = require("./src/utils/system");
const { TerminalSession } = require("./src/core/terminal");
const { setupSocket } = require("./src/core/socket");
const { startPublicTunnel } = require("./src/core/tunnel");
const { createApp } = require("./src/server/app");

const { PORT, HOST, SESSION_TOKEN, EXTERNAL_URL } = require("./src/config/env");

// arguments
const rawArgs = process.argv.slice(2);

if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  console.log(`Terminal Expose

Usage:
  terminal-expose [options] [command] [args...]

Examples:
  terminal-expose
  terminal-expose bash
  terminal-expose zsh
  terminal-expose bash -lc "cd ~/project && npm test"
  terminal-expose --public bash
  terminal-expose --public --subdomain my-demo bash

Environment:
  PORT=3000
  HOST=0.0.0.0
  SESSION_TOKEN=<custom-token>
  EXTERNAL_URL=http://YOUR_PUBLIC_IP:3000
  PUBLIC_TUNNEL=1
  TUNNEL_SUBDOMAIN=my-demo
  TUNNEL_HOST=https://localtunnel.me
  TERM_COLS=120
  TERM_ROWS=40

Options:
  --public, --tunnel          Create a public HTTPS tunnel.
  --subdomain <name>          Request a localtunnel subdomain.
  --tunnel-host <url>         Use a different localtunnel server.
`);
  process.exit(0);
}

if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
  const packageJson = require("./package.json");
  console.log(packageJson.version);
  process.exit(0);
}

const { options, commandArgs: command } = parseArgs(rawArgs);

const shellCommand = command.length > 0 ? command[0] : getDefaultShell();
const shellArgs = command.length > 0 ? command.slice(1) : [];

// Initialize Terminal
const terminalSession = new TerminalSession(shellCommand, shellArgs);

// Initialize Express App
let ioInstance = null;
const app = createApp(() => ioInstance, terminalSession);
const server = http.createServer(app);

// Initialize Socket.io
ioInstance = setupSocket(server, terminalSession);

// Close server and process gracefully on terminal exit
terminalSession.on("exit", () => {
  console.log("Shutting down server port...");
  server.close(() => {
    // Ensure process is fully killed after server cleanly exits
    process.exit(terminalSession.exit?.exitCode ?? 0);
  });

  // Force exit if server.close() hangs (e.g., active keep-alive connections)
  setTimeout(
    () => process.exit(terminalSession.exit?.exitCode ?? 0),
    1000,
  ).unref();
});

server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}/s/${SESSION_TOKEN}`;
  const externalUrl = EXTERNAL_URL
    ? `${EXTERNAL_URL.replace(/\/$/, "")}/s/${SESSION_TOKEN}`
    : null;

  console.log("\n==============================");
  console.log("Terminal Expose Started");
  console.log("==============================");
  console.log(`Command   : ${[shellCommand, ...shellArgs].join(" ")}`);
  console.log(`Local URL : ${localUrl}`);

  getLanUrls({ port: PORT, session_token: SESSION_TOKEN }).forEach((url) =>
    console.log(`LAN URL   : ${url}`),
  );

  if (externalUrl) {
    console.log(`Public URL: ${externalUrl}`);
  }

  if (options.publicTunnel) {
    startPublicTunnel(options, { HOST, PORT, SESSION_TOKEN }).catch((error) => {
      console.error(`Public tunnel failed: ${error.message}`);
    });
  }

  console.log("");
  console.log("Share only the session URL with trusted viewers.");
  console.log("Use --public for internet access without router forwarding.");
  console.log("==============================\n");
});
