const https = require("https");
const localtunnel = require("localtunnel");

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

    const request = https.get(
      "https://loca.lt/mytunnelpassword",
      (response) => {
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
      },
    );

    request.setTimeout(3000, () => {
      request.destroy();
      finish(null);
    });

    request.on("error", () => {
      finish(null);
    });
  });
}

async function startPublicTunnel(options, { HOST, PORT, SESSION_TOKEN }) {
  const localHost = HOST === "0.0.0.0" || HOST === "::" ? "127.0.0.1" : HOST;
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

module.exports = { startPublicTunnel };
