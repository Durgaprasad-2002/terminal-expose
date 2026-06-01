const { spawn } = require("child_process");

async function startPublicTunnel(options, { HOST, PORT, SESSION_TOKEN }) {
  const localHost = HOST === "0.0.0.0" || HOST === "::" ? "127.0.0.1" : HOST;

  // spinning the cloudflare tunnel for exposing the localhost url's to public
  const cloudflared = await spawn(
    "cloudflared",
    ["tunnel", "--url", `http://${localHost}:${PORT}`, "--no-autoupdate"],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const publicUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Cloudflare tunnel timeout"));
    }, 30000);

    cloudflared.stderr.on("data", (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/);

      if (match) {
        clearTimeout(timeout);
        resolve(`${match[0]}/s/${SESSION_TOKEN}`);
      }
    });

    cloudflared.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    cloudflared.on("exit", (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Cloudflare exited ${code}`));
      }
    });
  });

  // wait 10 seconds
  await new Promise((resolve) => setTimeout(resolve, 10000));

  return {
    url: publicUrl,
    close() {
      cloudflared.kill();
    },
  };
}

module.exports = {
  startPublicTunnel,
};
