import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";


dotenv.config();


const app = express();
app.use(express.json());


// CORS (allow specific origin or all by default)
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: CORS_ORIGIN }));


// RPC connection settings
const RPC_HOST = process.env.RPC_HOST || "bitcoind"; // docker-compose service name or IP
const RPC_PORT = Number(process.env.RPC_PORT || 8332);
const RPC_USER = process.env.RPC_USER || "he";
const RPC_PASSWORD = process.env.RPC_PASSWORD || "shuang";
const WEB_PORT = Number(process.env.WEB_PORT || 4000);


const RPC_URL = `http://${RPC_HOST}:${RPC_PORT}`;


// Helper: call bitcoind JSON-RPC
async function rpcCall(method, params = []) {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout


try {
const res = await fetch(RPC_URL, {
method: "POST",
headers: {
"Content-Type": "text/plain",
"Authorization": "Basic " + Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString("base64")
},
body: JSON.stringify({ jsonrpc: "1.0", id: "web", method, params }),
signal: controller.signal
});


const json = await res.json().catch(() => ({ error: { code: -32700, message: "Invalid JSON from RPC" } }));


if (!res.ok) {
// HTTP error from daemon/proxy
throw new Error(`HTTP ${res.status} ${res.statusText}`);
}


if (json.error) {
// JSON-RPC level error
throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
}


return json.result;
} finally {
clearTimeout(timeout);
}
}

// Healthcheck
app.get("/healthz", (req, res) => res.json({ ok: true }));

// 1) GET /api/total-balances → gettotalbalances
app.get("/api/total-balances", async (req, res) => {
try {
const result = await rpcCall("gettotalbalances", []);
res.json({ result });
} catch (e) {
res.status(502).json({ error: e.message });
}
});

// 2) GET /api/top-balances → gettopbalances
app.get("/api/top-balances", async (req, res) => {
try {
const result = await rpcCall("gettopbalances", []);
res.json({ result });
} catch (e) {
res.status(502).json({ error: e.message });
}
});


// 3) GET /api/latest-utxo → getlatestutxo
app.get("/api/latest-utxo", async (req, res) => {
try {
const result = await rpcCall("getlatestutxo", []);
res.json({ result });
} catch (e) {
res.status(502).json({ error: e.message });
}
});


// Generic passthrough for debugging any RPC
// POST /api/rpc { method: "...", params: [...] }
app.post("/api/rpc", async (req, res) => {
try {
const { method, params = [] } = req.body || {};
if (!method) return res.status(400).json({ error: "Missing field: method" });
const result = await rpcCall(method, params);
res.json({ result });
} catch (e) {
res.status(502).json({ error: e.message });
}
});


app.listen(WEB_PORT, () => {
console.log(`Web API listening on 0.0.0.0:${WEB_PORT}, proxying to ${RPC_URL}`);
});
