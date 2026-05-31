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
      }

      #terminal {
        width: 100vw;
        height: 100vh;
      }

      .xterm {
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.js"></script>
    <script>
      const token = window.location.pathname.split('/').filter(Boolean).pop();
      const term = new Terminal({
        cursorBlink: true,
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

      const fitAddon = new FitAddon.FitAddon();
      term.loadAddon(fitAddon);

      term.open(document.getElementById('terminal'));
      fitAddon.fit();

      const socket = io({
        auth: { token },
        reconnectionAttempts: 10,
        timeout: 5000
      });

      window.addEventListener('resize', () => {
        fitAddon.fit();
        socket.emit('terminal-resize', { cols: term.cols, rows: term.rows });
      });

      socket.on('connect', () => {
        socket.emit('terminal-resize', { cols: term.cols, rows: term.rows });
      });

      socket.on('terminal-output', (data) => {
        term.write(data);
      });

      term.onData((data) => {
        socket.emit('terminal-input', data);
      });

      socket.on('terminal-exit', ({ exitCode, signal }) => {
        const suffix = signal ? 'signal ' + signal : 'exit code ' + exitCode;
        term.writeln('\r\n[Command ended: ' + suffix + ']');
      });
    </script>
  </body>
</html>`;

module.exports = { VIEWER_HTML };
