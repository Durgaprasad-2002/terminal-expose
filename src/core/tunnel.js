const { startTunnel } = require("untun");

async function startPublicTunnel(options, { HOST, PORT, SESSION_TOKEN }) {
  const localHost = HOST === "0.0.0.0" || HOST === "::" ? "127.0.0.1" : HOST;

  if (options.tunnelSubdomain || options.tunnelHost) {
    console.warn(
      "Warning: Custom subdomain and tunnel host are not supported with Cloudflare Quick Tunnels.",
    );
  }

  console.log("Public tunnel: starting cloudflared...");

  try {
    const tunnel = await startTunnel({
      port: PORT,
      hostname: localHost,
      acceptCloudflareNotice: true,
    });

    const url = await tunnel.getURL();
    const publicUrl = `${url.replace(/\/$/, "")}/s/${SESSION_TOKEN}`;

    console.log(`Public URL: ${publicUrl}`);

    ["SIGINT", "SIGTERM"].forEach((signal) => {
      process.once(signal, async () => {
        await tunnel.close();
        process.kill(process.pid, signal);
      });
    });

    return tunnel;
  } catch (error) {
    console.error(`Public tunnel error: ${error.message}`);
    throw error;
  }
}

module.exports = { startPublicTunnel };
