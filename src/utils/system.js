const os = require("os");

const getDefaultShell = () => {
  switch (process.platform) {
    case "win32":
      return process.env.ComSpec || "powershell.exe";

    case "darwin":
      return process.env.SHELL || "/bin/zsh";

    case "linux":
      return process.env.SHELL || "/bin/bash";

    default:
      return process.env.SHELL || "/bin/sh";
  }
};

function getLanUrls({ port, session_token }) {
  const urls = [];
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((addresses = []) => {
    addresses
      .filter((address) => address.family === "IPv4" && !address.internal)
      .forEach((address) => {
        urls.push(`http://${address.address}:${port}/s/${session_token}`);
      });
  });

  return urls;
}

module.exports = { getDefaultShell, getLanUrls };
