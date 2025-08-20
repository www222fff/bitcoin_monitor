import React from "react";

export default function LatestUtxo({ utxos }) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Address</th>
            <th className="text-left p-2">UTXO</th>
          </tr>
        </thead>
        <tbody>
          {utxos.slice(0, 20).map((u, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-100">
              <td className="p-2">{u.address}</td>
              <td className="p-2">{u.utxo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

