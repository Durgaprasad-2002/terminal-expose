#!/usr/bin/env node

const { CliClient } = require("./src/cli");
const { parseClientArgs } = require("./src/utils/args");
const { printClientUsage } = require("./src/utils/logs");

async function main() {
  const args = parseClientArgs(process.argv.slice(2));

  if (!args.url || !args.token) {
    console.error("Error: Missing required arguments");
    console.error("Usage: terminal-expose-cli <url> <token> [options]\n");
    printClientUsage();
    process.exit(1);
  }

  const client = new CliClient({
    url: args.url,
    token: args.token,
    noResize: args.noResize,
    debug: args.debug,
  });

  try {
    console.log(`Connecting to ${args.url}...`);
    await client.connect();
    console.log("Connected! You are now in the remote terminal session.");
    console.log("(Press Ctrl+D to disconnect)\n");
  } catch (err) {
    console.error(`Failed to connect: ${err.message}`);
    process.exit(1);
  }

  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, () => {
      client.disconnect();
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
