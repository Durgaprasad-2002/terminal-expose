# Terminal Expose

Interactive terminal sharing from your own machine.

`terminal-expose` starts a real shell or command on the host where it is run, prints a private URL, and allows collaborative, interactive access to anyone who opens that URL.

## Install

```sh
npm install -g terminal-expose
```

## Use

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

The CLI prints a URL like:

```text
Local URL : http://localhost:5555/s/<token>
LAN URL   : http://192.168.1.10:5555/s/<token>
```

Share the full token URL with your collaborators. They will have full read and write access to the terminal.

## Public Internet Access

For quick public sharing, start a secure edge tunnel (powered by Cloudflare Quick Tunnels):

```sh
terminal-expose --public bash
```

The CLI prints a URL like:

```text
Public URL: https://random-name.trycloudflare.com/s/<token>
```

_(Note: Custom subdomains are not currently supported by free Cloudflare Quick Tunnels.)_

The tunnel URL works outside your Wi-Fi as long as the CLI is still running.

For a permanent setup, run it on a public server or forward TCP port 5555 to the machine running the CLI:

```sh
EXTERNAL_URL="http://YOUR_PUBLIC_IP:5555" terminal-expose bash
```

## Options

Use environment variables:

```sh
PORT=4000 terminal-expose bash
SESSION_TOKEN="change-this-secret" terminal-expose bash
PUBLIC_TUNNEL=1 terminal-expose bash
TERM_COLS=160 TERM_ROWS=48 terminal-expose bash
```

## Security

Anyone with the full URL can view and interact with the session. Do not type passwords, API keys, or private commands in a shared terminal.
