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

module.exports = { VIEWER_HTML };
