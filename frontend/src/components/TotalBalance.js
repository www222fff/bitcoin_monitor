import React from "react";

export default function TotalBalance({ total }) {
  return (
    <div className="bg-white shadow rounded-lg p-6 text-center">
      <h2 className="text-xl font-semibold mb-2">Total Balance</h2>
      <span className="text-4xl font-bold text-green-600">{total}</span>
    </div>
  );
}
