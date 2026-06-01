module.exports = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>Terminal Session</title>

    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/xterm/css/xterm.css"
    />

    <style>
      * {
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;

        overflow: hidden;

        background: #09090b;
        color: #ffffff;

        font-family:
          Inter,
          system-ui,
          sans-serif;
      }


      /* ======================
         Layout
      ====================== */

      .app {
        height: 100vh;

        display: flex;
        flex-direction: column;
      }


      /* ======================
         Header
      ====================== */

      .header {
        height: 48px;

        padding: 0 16px;

        display: flex;
        align-items: center;
        justify-content: space-between;

        background:
          linear-gradient(
            180deg,
            #18181b,
            #09090b
          );

        border-bottom: 1px solid #27272a;

        user-select: none;
      }


      .title {
        font-size: 14px;
        font-weight: 500;

        color: #e4e4e7;
      }


      .actions {
        display: flex;
        align-items: center;

        gap: 14px;

        font-size: 13px;
      }



      /* ======================
         Status
      ====================== */


      .status {
        display: flex;
        align-items: center;

        gap: 6px;
      }


      .status-dot {
        width: 9px;
        height: 9px;

        border-radius: 999px;

        background: currentColor;

        box-shadow:
          0 0 12px currentColor;
      }


      .connected {
        color: #22c55e;
      }


      .connecting {
        color: #f97316;
      }


      .disconnected {
        color: #ef4444;
      }



      /* ======================
         Buttons
      ====================== */


      button {
        padding: 0px 10px;

        cursor: pointer;

        background: #18181b;
        color: #e4e4e7;

        border:
          1px solid #3f3f46;

        border-radius: 6px;
      }


      button:hover {
        background: #27272a;
      }




      /* ======================
         Terminal
      ====================== */


      #terminal {
        flex: 1;

        padding: 12px;

        overflow: hidden;
      }


      .xterm {
        height: 100%;
      }



      /* ======================
         Scrollbar
      ====================== */


      .xterm-viewport::-webkit-scrollbar {
        width: 8px;
      }


      .xterm-viewport::-webkit-scrollbar-track {
        background: transparent;
      }


      .xterm-viewport::-webkit-scrollbar-thumb {
        background: #3f3f46;

        border-radius: 20px;
      }


      .xterm-viewport::-webkit-scrollbar-thumb:hover {
        background: #71717a;
      }



      @media(max-width: 600px) {

        .title {
          font-size: 12px;
        }


        .actions {
          gap: 8px;
        }

      }
    </style>
  </head>

  <body>
    <div class="app">
      <header class="header">
        <div class="title">⚡ Remote Terminal</div>

        <div class="actions">
          <span id="timer"> 00:00 </span>

          <div id="status" class="status connecting">
            <span class="status-dot"></span>

            <span id="statusText"> Connecting </span>
          </div>

          <button id="fullscreen">⛶</button>
        </div>
      </header>

      <main id="terminal"></main>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.js"></script>

    <script>


      const token =
        location.pathname
          .split("/")
          .filter(Boolean)
          .pop();



      const term =
        new Terminal({
          cursorBlink: true,
          convertEol: true,
          fontFamily:
            \`"JetBrains Mono", monospace\`,
          fontSize: 14,
          lineHeight: 1.3,
          scrollback: 20000,
          theme: {
            background: "#09090b",
            foreground: "#fafafa",
            cursor: "#22c55e",
            selection: "#334155"
          }
        });



      const fitAddon =
        new FitAddon.FitAddon();



      term.loadAddon(
        fitAddon
      );


      term.open(
        document.getElementById(
          "terminal"
        )
      );


      fitAddon.fit();



      const socket =
        io({
          transports: ["websocket"],
          auth:{
            token
          },
          reconnection: true,
          reconnectionAttempts: 60,
          timeout:5000
        });

      const statusBox =
        document.getElementById(
          "status"
        );

      const statusText =
        document.getElementById(
          "statusText"
        );


      function setStatus(
        text,
        type
      ){
        statusBox.className =
          "status " + type;
        statusText.textContent =
          text;

      }




      socket.on(
        "connect",
        () => {

          setStatus(
            "Connected",
            "connected"
          );


          socket.emit(
            "terminal-resize",
            {
              cols: term.cols,
              rows: term.rows
            }
          );

        }
      );





      socket.on(
        "disconnect",
        () => {

          setStatus(
            "Disconnected",
            "disconnected"
          );

        }
      );




      socket.io.on(
        "reconnect_attempt",
        () => {

          setStatus(
            "Reconnecting",
            "connecting"
          );

        }
      );




      socket.on(
        "terminal-output",
        data => {

          term.write(data);

        }
      );





      term.onData(
        data => {

          socket.emit(
            "terminal-input",
            data
          );

        }
      );




      window.addEventListener(
        "resize",
        () => {

          fitAddon.fit();


          socket.emit(
            "terminal-resize",
            {
              cols: term.cols,
              rows: term.rows
            }
          );

        }
      );





      let seconds = 0;


      setInterval(
        () => {

          if(!socket.connected)
            return;


          seconds++;


          timer.textContent =
            new Date(
              seconds * 1000
            )
            .toISOString()
            .substring(
              14,
              19
            );


        },
        1000
      );





      fullscreen.onclick =
        () => {

          document.documentElement
            .requestFullscreen();

        };
    </script>
  </body>
</html>
`;
