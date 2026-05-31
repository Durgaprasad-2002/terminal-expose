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

module.exports = { parseArgs };
