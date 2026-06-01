# Terminal Expose

Interactive terminal sharing from your own machine.

`terminal-expose` starts a real shell or command, prints private session URLs, and lets trusted collaborators connect through a browser or from another terminal.

## Install

```sh
npm install -g terminal-expose
```

## Quick Start

Start your default shell:

```sh
terminal-expose
```

Start a specific shell:

```sh
terminal-expose bash
terminal-expose zsh
```

Run a command:

```sh
terminal-expose bash -lc "npm test"
```

The server prints session URLs:

```text
================================
Terminal Expose Started
================================
Command   : bash
Local URL : http://localhost:5555/s/<token>
LAN URL   : http://192.168.1.10:5555/s/<token>

Terminal sharing is active.
Share only the session URL with trusted collaborators.
================================
```

Anyone with the full session URL can view and type into the terminal.

## Features

- Share a real interactive PTY shell or command over HTTP and WebSocket.
- Connect from a web browser with xterm.js, live status, session timer, fullscreen, scrollback, and automatic resize.
- Connect from another terminal with `terminal-expose-cli` for a native terminal experience.
- Replay recent terminal output to new clients from the in-memory buffer.
- Resize the remote PTY when browser or CLI clients change size.
- Use token-based authentication for both browser and CLI clients.
- Generate LAN URLs automatically for devices on the same network.
- Create temporary public HTTPS URLs with Cloudflare Quick Tunnels.
- Redact session tokens from startup logs when needed.
- Pipe input into the CLI client for scripted or non-interactive use.
- Check server status with the `/health` endpoint.

## Connect

### Browser

Open the full session URL printed by the server:

```text
http://localhost:5555/s/<token>
```

For another device on the same network, use the printed LAN URL.

### CLI Client

Connect with the full session URL:

```sh
terminal-expose-cli http://localhost:5555/s/<token>
```

Or pass the server URL and token separately:

```sh
terminal-expose-cli http://localhost:5555 <token>
```

Useful options:

```sh
terminal-expose-cli http://localhost:5555/s/<token> --no-resize
terminal-expose-cli http://localhost:5555/s/<token> --debug
```

Press `Ctrl+D` to disconnect from the CLI client.

Piped input is supported:

```sh
printf 'pwd\nls\n' | terminal-expose-cli http://localhost:5555 <token>
```

## Public Internet Access

For quick public sharing, start a secure edge tunnel:

```sh
terminal-expose --public bash
```

You can also enable it with an environment variable:

```sh
PUBLIC_TUNNEL=1 terminal-expose bash
```

The server prints a public URL:

```text
Public URL: https://random-name.trycloudflare.com/s/<token>
```

Use that URL in a browser or with the CLI client:

```sh
terminal-expose-cli https://random-name.trycloudflare.com/s/<token>
```

The tunnel works outside your Wi-Fi as long as `terminal-expose` is still running.

For a permanent setup, run it on a public server or forward TCP port `5555` to the machine running `terminal-expose`:

```sh
EXTERNAL_URL="http://YOUR_PUBLIC_IP:5555" terminal-expose bash
```

## Configuration

Use environment variables to change server behavior:

```sh
PORT=4000 terminal-expose bash
SESSION_TOKEN="change-this-secret" terminal-expose bash
SESSION_TOKEN_REDACT=1 terminal-expose bash
ECHO_TO_STDOUT=0 terminal-expose bash
WORKDIR=/home/user/project terminal-expose bash
MAX_BUFFER=200000 terminal-expose bash
```

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5555` | HTTP and WebSocket server port. |
| `HOST` | `0.0.0.0` | Bind address. |
| `SESSION_TOKEN` | random | Token required for browser and CLI clients. |
| `EXTERNAL_URL` | unset | Public base URL to print in startup output. |
| `PUBLIC_TUNNEL` | `0` | Set to `1` or `true` to start a public tunnel. |
| `MAX_BUFFER` | `100000` | Number of recent output characters kept for new clients. |
| `ECHO_TO_STDOUT` | `1` | Set to `0` to stop echoing PTY output in the host terminal. |
| `WORKDIR` | current directory | Working directory for the spawned shell or command. |
| `SESSION_TOKEN_REDACT` | `0` | Set to `1` to hide the token in startup logs. |

## Security

- Share session URLs only with people you trust.
- Anyone with the token can read output and send input to the running terminal.
- Avoid typing passwords, API keys, or private commands in a shared session.
- Use HTTPS when sharing over the internet. The built-in public tunnel gives you an HTTPS URL.
- Use a strong `SESSION_TOKEN` for long-running or internet-facing sessions.
- Use `SESSION_TOKEN_REDACT=1` when logs are stored, streamed, or shared.

## Troubleshooting

### CLI Client Cannot Connect

- Use `http://localhost:5555/s/<token>` for local sessions, not `https`.
- Make sure the server is still running.
- Confirm the token matches the server output.
- Check that firewalls allow the selected port for LAN or public-server access.
- Add `--debug` to the CLI client for connection details.

### Terminal Size Looks Wrong

- Browser clients resize automatically when the window changes.
- CLI clients send resize events from the local terminal by default.
- Use `--no-resize` if resize events cause compatibility issues.

### Public URL Is Not Created

- Confirm `cloudflared` can run in the current environment.
- Make sure the local `terminal-expose` server stays running.
- Try again if the temporary tunnel provider does not return a URL before timeout.

## Architecture

- Server: Node.js, Express, Socket.io, and `node-pty`.
- Browser client: xterm.js and Socket.io.
- CLI client: Socket.io client with native stdin/stdout handling.
- Optional tunnel: Cloudflare Quick Tunnels.

## License

MIT
