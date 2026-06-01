function printClientUsage() {
  console.log(`Terminal Expose CLI Client
Connect to a remote terminal session from your terminal.

Usage:
  terminal-expose-cli <url> <token> [options]

Arguments:
  <url>       Server URL (e.g., http://localhost:5555)
  <token>     Session token (from server output)

Options:
  --no-resize Skip sending terminal resize events
  --debug     Enable debug logging
  --help      Show this help message

Examples:
  terminal-expose-cli http://localhost:5555 abc123xyz
  terminal-expose-cli https://example.com/expose xyz789abc --no-resize
  terminal-expose-cli http://192.168.1.5:5555 token123 --debug

Keyboard shortcuts:
  Ctrl+D      Disconnect from the session
`);
}

module.exports = { printClientUsage };
