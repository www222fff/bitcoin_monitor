import React, { useEffect, useState } from "react";
import axios from "axios";
import LatestUtxo from "./components/LatestUtxo";
import AddressBalances from "./components/AddressBalances";
import TotalBalance from "./components/TotalBalance";

function App() {
  const [utxos, setUtxos] = useState([]);
  const [balances, setBalances] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  const API_BASE = process.env.REACT_APP_API_URL;

  const fetchData = async () => {
    try {
      const [utxoRes, balanceRes, totalRes] = await Promise.all([
        axios.get(`${API_BASE}/getlatestutxo`),
        axios.get(`${API_BASE}/getaddressbalances/0`),
        axios.get(`${API_BASE}/gettotalbalances`)
      ]);
      setUtxos(utxoRes.data || []);
      setBalances(balanceRes.data || []);
      setTotalBalance(totalRes.data.total || 0);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 每10秒更新一次
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6">Bitcoin Dashboard</h1>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Latest UTXO in Last Block</h2>
        <LatestUtxo utxos={utxos} />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">TOP Balances</h2>
        <AddressBalances balances={balances} />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Total valid Balance</h2>
        <TotalBalance total={totalBalance} />
      </section>
    </div>
  );
}

export default App;

