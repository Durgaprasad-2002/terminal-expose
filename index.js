#!/usr/bin/env node

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const https = require("https");
const os = require("os");
const pty = require("node-pty");
const path = require("path");
const localtunnel = require("localtunnel");

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BUFFER = Number(process.env.MAX_BUFFER || 100000);
const ECHO_TO_STDOUT = process.env.ECHO_TO_STDOUT !== "0";
const SESSION_TOKEN =
  process.env.SESSION_TOKEN || crypto.randomBytes(18).toString("base64url");
const rawArgs = process.argv.slice(2);

function parseArgs(args) {
  const options = {
    publicTunnel: false,
    tunnelSubdomain: process.env.TUNNEL_SUBDOMAIN || null,
    tunnelHost: process.env.TUNNEL_HOST || undefined,
  };
  const commandArgs = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--public" || arg === "--tunnel") {
      options.publicTunnel = true;
      continue;
    }

    if (arg === "--subdomain") {
      options.tunnelSubdomain = args[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg.startsWith("--subdomain=")) {
      options.tunnelSubdomain = arg.slice("--subdomain=".length) || null;
      continue;
    }

    if (arg === "--tunnel-host") {
      options.tunnelHost = args[index + 1] || undefined;
      index += 1;
      continue;
    }

    if (arg.startsWith("--tunnel-host=")) {
      options.tunnelHost = arg.slice("--tunnel-host=".length) || undefined;
      continue;
    }

    commandArgs.push(arg);
  }

  if (
    process.env.PUBLIC_TUNNEL === "1" ||
    process.env.PUBLIC_TUNNEL === "true"
  ) {
    options.publicTunnel = true;
  }

  return { options, commandArgs };
}

const { options, commandArgs: command } = parseArgs(rawArgs);

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

const shellCommand =
  command.length > 0
    ? command[0]
    : process.platform === "win32"
      ? "powershell.exe"
      : process.env.SHELL || "bash";
const shellArgs = command.length > 0 ? command.slice(1) : [];

function getLanUrls() {
  const urls = [];
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((addresses = []) => {
    addresses
      .filter((address) => address.family === "IPv4" && !address.internal)
      .forEach((address) => {
        urls.push(`http://${address.address}:${PORT}/s/${SESSION_TOKEN}`);
      });
  });

  return urls;
}

function getLocaltunnelPassword() {
  return new Promise((resolve) => {
    let settled = false;

    function finish(value) {
      if (settled) {
        return;
      }

      settled = true;
      resolve(value);
    }

    const request = https.get("https://loca.lt/mytunnelpassword", (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        finish(null);
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        finish(body.trim() || null);
      });
    });

    request.setTimeout(3000, () => {
      request.destroy();
      finish(null);
    });

    request.on("error", () => {
      finish(null);
    });
  });
}

async function startPublicTunnel() {
  const localHost =
    HOST === "0.0.0.0" || HOST === "::" ? "127.0.0.1" : HOST;
  const tunnelOptions = {
    port: PORT,
    local_host: localHost,
  };

  if (options.tunnelSubdomain) {
    tunnelOptions.subdomain = options.tunnelSubdomain;
  }

  if (options.tunnelHost) {
    tunnelOptions.host = options.tunnelHost;
  }

  console.log("Public tunnel: starting...");

  const tunnel = await localtunnel(tunnelOptions);
  const publicUrl = `${tunnel.url.replace(/\/$/, "")}/s/${SESSION_TOKEN}`;

  console.log(`Public URL: ${publicUrl}`);

  if (new URL(tunnel.url).hostname.endsWith(".loca.lt")) {
    const password = await getLocaltunnelPassword();

    if (password) {
      console.log(`Tunnel password: ${password}`);
    }
  }

  tunnel.on("error", (error) => {
    console.error(`Public tunnel error: ${error.message}`);
  });

  tunnel.on("close", () => {
    console.log("Public tunnel closed.");
  });

  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.once(signal, () => {
      tunnel.close();
      process.kill(process.pid, signal);
    });
  });

  return tunnel;
}

const VIEWER_HTML = String.raw`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Terminal Viewer</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm/css/xterm.css" />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        background: #050505;
        color: #f2f2f2;
        width: 100%;
        height: 100%;
        overflow: hidden;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .topbar {
        align-items: center;
        background: #111;
        border-bottom: 1px solid #2a2a2a;
        box-sizing: border-box;
        display: flex;
        gap: 12px;
        height: 42px;
        justify-content: space-between;
        padding: 0 14px;
      }

      .title {
        font-size: 13px;
        font-weight: 650;
      }

      .status {
        align-items: center;
        color: #b8b8b8;
        display: flex;
        font-size: 12px;
        gap: 8px;
        min-width: 0;
      }

      .dot {
        background: #9ca3af;
        border-radius: 999px;
        flex: 0 0 auto;
        height: 8px;
        width: 8px;
      }

      .dot.connected {
        background: #22c55e;
      }

      .dot.disconnected {
        background: #ef4444;
      }

      #terminal {
        width: 100vw;
        height: calc(100vh - 42px);
      }

      .xterm {
        height: 100%;
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="title">Terminal Expose</div>
      <div class="status">
        <span id="dot" class="dot"></span>
        <span id="status">Connecting</span>
      </div>
    </header>
    <div id="terminal"></div>
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.js"></script>
    <script>
      const token = window.location.pathname.split('/').filter(Boolean).pop();
      const statusText = document.getElementById('status');
      const dot = document.getElementById('dot');
      const term = new Terminal({
        disableStdin: true,
        cursorBlink: false,
        convertEol: true,
        fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
        fontSize: 14,
        scrollback: 10000,
        theme: {
          background: '#050505',
          foreground: '#f4f4f5',
          cursor: '#f4f4f5',
          black: '#18181b',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e4e4e7'
        }
      });

      term.open(document.getElementById('terminal'));

      function setStatus(text, className) {
        statusText.textContent = text;
        dot.className = 'dot ' + (className || '');
      }

      const socket = io({
        auth: { token },
        reconnectionAttempts: 10,
        timeout: 5000
      });

      socket.on('connect', () => {
        setStatus('Connected', 'connected');
      });

      socket.on('terminal-output', (data) => {
        term.write(data);
      });

      socket.on('terminal-exit', ({ exitCode, signal }) => {
        const suffix = signal ? 'signal ' + signal : 'exit code ' + exitCode;
        setStatus('Command ended: ' + suffix, 'disconnected');
        term.writeln('\r\n[Command ended: ' + suffix + ']');
      });

      socket.on('connect_error', (error) => {
        setStatus(error.message || 'Connection error', 'disconnected');
      });

      socket.on('disconnect', () => {
        setStatus('Disconnected', 'disconnected');
      });
    </script>
  </body>
</html>`;

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

const shell = pty.spawn(shellCommand, shellArgs, {
  name: "xterm-256color",
  cols: Number(process.env.TERM_COLS || 120),
  rows: Number(process.env.TERM_ROWS || 40),
  cwd: process.env.WORKDIR || process.cwd(),
  env: {
    ...process.env,
    TERM: "xterm-256color",
  },
});

let terminalBuffer = "";
let terminalExit = null;

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.resume();
process.stdin.on("data", (data) => {
  shell.write(data);
});

shell.onData((data) => {
  if (ECHO_TO_STDOUT) {
    process.stdout.write(data);
  }

  terminalBuffer += data;

  if (terminalBuffer.length > MAX_BUFFER) {
    terminalBuffer = terminalBuffer.slice(-MAX_BUFFER);
  }

  io.emit("terminal-output", data);
});

shell.onExit(({ exitCode, signal }) => {
  terminalExit = { exitCode, signal };
  io.emit("terminal-exit", terminalExit);
  console.log(`Terminal command exited: code=${exitCode} signal=${signal}`);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  setTimeout(() => {
    process.exit(exitCode ?? 0);
  }, 250);
});

app.use("/assets", express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.type("html").send(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Terminal Expose</title>
      </head>
      <body style="font-family: system-ui, sans-serif; line-height: 1.5; padding: 32px;">
        <h1>Terminal Expose</h1>
        <p>This server is running. Use the private session URL printed in the container logs.</p>
      </body>
    </html>`);
});

app.get("/health", (_, res) => {
  res.json({
    ok: true,
    viewers: io.engine.clientsCount,
    exited: terminalExit,
  });
});

app.get("/s/:token", (req, res) => {
  if (req.params.token !== SESSION_TOKEN) {
    return res.status(403).send("Invalid session token");
  }

  res.type("html").send(VIEWER_HTML);
});

io.on("connection", (socket) => {
  console.log(`Viewer connected: ${socket.id}`);

  if (terminalBuffer) {
    socket.emit("terminal-output", terminalBuffer);
  }

  if (terminalExit) {
    socket.emit("terminal-exit", terminalExit);
  }

  socket.on("disconnect", () => {
    console.log(`Viewer disconnected: ${socket.id}`);
  });
});

server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}/s/${SESSION_TOKEN}`;
  const externalUrl = process.env.EXTERNAL_URL
    ? `${process.env.EXTERNAL_URL.replace(/\/$/, "")}/s/${SESSION_TOKEN}`
    : null;

  console.log("\n==============================");
  console.log("Terminal Expose Started");
  console.log("==============================");
  console.log(`Command   : ${[shellCommand, ...shellArgs].join(" ")}`);
  console.log(`Local URL : ${localUrl}`);

  getLanUrls().forEach((url) => console.log(`LAN URL   : ${url}`));

  if (externalUrl) {
    console.log(`Public URL: ${externalUrl}`);
  }

  if (options.publicTunnel) {
    startPublicTunnel().catch((error) => {
      console.error(`Public tunnel failed: ${error.message}`);
    });
  }

  console.log("");
  console.log("Share only the session URL with trusted viewers.");
  console.log("Use --public for internet access without router forwarding.");
  console.log("==============================\n");
});
