const crypto = require("crypto");

const PORT = Number(process.env.PORT || 5555);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BUFFER = Number(process.env.MAX_BUFFER || 100000);
const ECHO_TO_STDOUT = process.env.ECHO_TO_STDOUT !== "0";
const SESSION_TOKEN =
  process.env.SESSION_TOKEN || crypto.randomBytes(18).toString("base64url");
const TERM_COLS = Number(process.env.TERM_COLS || 120);
const TERM_ROWS = Number(process.env.TERM_ROWS || 40);
const WORKDIR = process.env.WORKDIR || process.cwd();
const EXTERNAL_URL = process.env.EXTERNAL_URL || null;

module.exports = {
  PORT,
  HOST,
  MAX_BUFFER,
  ECHO_TO_STDOUT,
  SESSION_TOKEN,
  TERM_COLS,
  TERM_ROWS,
  WORKDIR,
  EXTERNAL_URL,
};
