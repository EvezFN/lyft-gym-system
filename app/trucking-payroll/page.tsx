'use client';
import { useState, useEffect } from 'react';

export default function TruckingPayrollPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const res = await fetch('/api/payroll/records');
      const payload = await res.json();
      setRecords(payload.data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logistics Payroll Audit Dashboard</h1>
          <p className="text-slate-400 text-xs mt-1">Real-time breakdown summaries processed from active master spreadsheet ingestion pipelines.</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Frequency: Paid Fortnightly</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Name</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Received (Gross)</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">NIS Contribution</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">PAYE Deduction</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Pay</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100 text-sm text-slate-700">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400 animate-pulse font-medium">Synchronizing components reporting matrices...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No valid active records passed deduction validation filters.</td></tr>
            ) : (
              records.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">{item.employee_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono">${item.gross_salary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-amber-700 font-medium">-${item.nis_contribution.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-rose-600 font-medium">-${item.paye_deduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-emerald-600">${item.net_pay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}