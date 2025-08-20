import express from "express";
}


return json.result;
} finally {
clearTimeout(timeout);
}
}


// Healthcheck
app.get("/healthz", (req, res) => res.json({ ok: true }));

const WEB_PORT = process.env.WEB_PORT;

// 1) GET /api/total-balances → gettotalbalances
app.get("/api/total-balances", async (req, res) => {
try {
const result = await rpcCall("gettotalbalances", []);
res.json({ result });
} catch (e) {
res.status(502).json({ error: e.message });
}
});


// 2) /api/addressbalances -> getaddressbalances
app.get('/address-balances', async (req, res) => {
  const minConf = parseInt(req.query.minConf || "0", 10);

  try {
    const result = await callRpc("getaddressbalances", [minConf]);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
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
