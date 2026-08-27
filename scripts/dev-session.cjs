// Dev helper: mint a session cookie so you can poke at pages with curl.
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const db = new Database(path.join(process.cwd(), "data", "coralux.db"));
const email = process.argv[2] || null;
const user = email
  ? db.prepare("SELECT id FROM users WHERE email = ?").get(email)
  : db.prepare("SELECT id FROM users WHERE role = 'owner'").get();
if (!user) throw new Error("no such user");
const token = crypto.randomBytes(16).toString("hex");
db.prepare("INSERT INTO sessions (token,user_id,expires_at,created_at) VALUES (?,?,?,?)")
  .run(token, user.id, new Date(Date.now() + 864e5).toISOString(), new Date().toISOString());
console.log(token);
