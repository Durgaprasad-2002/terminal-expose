const express = require("express");
const { SESSION_TOKEN } = require("../config/env");

function createApp(ioGetter, terminalSession) {
  const app = express();

  app.get("/", (_, res) => {
    res.type("html").send(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Terminal Expose</title>
        </head>
        <body style="font-family: system-ui, sans-serif; line-height: 1.5; padding: 32px;">
          <h1>Terminal Expose</h1>
          <p>This server is running. Use the private session URL printed in the container logs.</p>
        </body>
      </html>`);
  });

  app.get("/health", (_, res) => {
    const io = ioGetter();
    res.json({
      ok: true,
      clients: io ? io.engine.clientsCount : 0,
      exited: terminalSession.exit,
    });
  });

  app.get("/s/:token", (req, res) => {
    if (req.params.token !== SESSION_TOKEN) {
      return res.status(403).send("Invalid session token");
    }

    const viewerHtml = require("../templates/viewer.js");
    res.type("html").send(viewerHtml);
  });

  return app;
}

module.exports = { createApp };
