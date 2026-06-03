"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { 
  Truck, FileSpreadsheet, Key, LogOut, Shield, Users, 
  UserPlus, DollarSign, Activity, HardDrive, RefreshCw, Smartphone, Eye, FileText, X
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SystemUser {
  name: string;
  username: string;
  role: string;
  department: "gym_operations" | "lyft_trucking";
  access_all_locations: boolean;
}

interface FleetWorkOrder {
  id?: string;
  truck_plate: string;
  driver_name: string;
  destination: string;
  cargo_type: string;
  dispatch_status: "Pending" | "In Transit" | "Delivered";
}

interface PayrollRecord {
  id?: string;
  employee_name: string;
  position: string;
  location: string;
  bank_name: string;
  account_number: string;
  email: string;
  f1_normal_hours: string;
  f1_ot_hours: string;
  f1_gross: number;
  f2_normal_hours: string;
  f2_ot_hours: string;
  f2_gross: number;
  gross_salary: number;
  nis_contribution: number;
  paye_deduction: number;
  net_pay: number;
  payment_frequency: string;
  payroll_cycle_date: string;
}

export default function UnifiedSystem() {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentTab, setCurrentTab] = useState<string>("");

  const [workOrders, setWorkOrders] = useState<FleetWorkOrder[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [isSyncingWhatsApp, setIsSyncingWhatsApp] = useState(false);

  // Form states for work orders
  const [newPlate, setNewPlate] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newCargo, setNewCargo] = useState("General Freight");

  useEffect(() => {
    if (currentUser) {
      if (currentUser.department === "lyft_trucking") {
        setCurrentTab("trucking_fleet");
        fetchTruckingData();
      } else {
        setCurrentTab("gym_dashboard");
      }
    }
  }, [currentUser]);

  const fetchTruckingData = async () => {
    const { data: wo } = await supabase.from("fleet_work_orders").select("*");
    if (wo) setWorkOrders(wo);

    const { data: pr } = await supabase.from("payroll_records").select("*");
    if (pr) setPayrollRecords(pr);
  };

  const handleSystemLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .eq("username", authUsername.trim())
      .eq("password", authPassword)
      .single();

    if (error || !data) {
      setAuthError("Invalid credentials.");
      return;
    }
    setCurrentUser(data);
  };

  // Helper to format loose dates/times coming from Excel rows safely
  const formatExcelTime = (val: any): string => {
    if (!val) return "0";
    if (typeof val === "object" && val.hours !== undefined) return `${val.hours}h`;
    return String(val).trim();
  };

  const handleExcelIngestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const targetSheetName = "April Payroll-Final";
        
        if (!workbook.SheetNames.includes(targetSheetName)) {
          alert(`Sheet "${targetSheetName}" not found.`);
          return;
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const rawJsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        // Slice at row index 4 where active employee records begin inside the file format
        const dataRows = rawJsonData.slice(4);
        const compiledRecords: PayrollRecord[] = [];

        for (const row of dataRows) {
          if (!row || !row[0]) continue;

          const employeeName = String(row[0]).trim();
          if (employeeName === "" || employeeName.toLowerCase().includes("total") || employeeName === "Name of Employees") {
            continue;
          }

          const nisContribution = parseFloat(row[32]) || 0;
          const payeDeduction = parseFloat(row[34]) || 0;

          // EMPLOYEE FILTERING LAYER
          if (nisContribution === 0 && payeDeduction === 0) continue;

          compiledRecords.push({
            employee_name: employeeName,
            position: row[3] ? String(row[3]).trim() : "Staff",
            location: row[4] ? String(row[4]).trim() : "General Node",
            bank_name: row[40] ? String(row[40]).trim() : "Cash payout",
            account_number: row[39] ? String(row[39]).trim() : "N/A",
            email: row[41] ? String(row[41]).trim() : "",
            
            // Fortnight 1 trackers
            f1_normal_hours: formatExcelTime(row[7]),
            f1_ot_hours: formatExcelTime(row[8]),
            f1_gross: parseFloat(row[28]) || 0,
            
            // Fortnight 2 trackers
            f2_normal_hours: formatExcelTime(row[18]),
            f2_ot_hours: formatExcelTime(row[19]),
            f2_gross: parseFloat(row[29]) || 0,
            
            // Monthly Consolidated Balances
            gross_salary: parseFloat(row[30]) || 0,
            nis_contribution: nisContribution,
            paye_deduction: payeDeduction,
            net_pay: parseFloat(row[35]) || 0,
            payment_frequency: "Paid Fortnightly",
            payroll_cycle_date: "2026-04-30"
          });
        }

        await supabase.from("payroll_records").delete().neq("employee_name", "WIPE"); // Refresh snapshot rows cleanly
        const { error } = await supabase.from("payroll_records").insert(compiledRecords);
        if (error) throw error;

        alert(`Ingested ${compiledRecords.length} worker accounting entries perfectly!`);
        fetchTruckingData();
      } catch (err: any) {
        alert(`Parsing break: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2 font-bold text-emerald-400">
          <Activity className="w-6 h-6" /> <span>Lyft Matrix Terminal</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {currentUser?.department === "lyft_trucking" && (
            <>
              <button onClick={() => setCurrentTab("trucking_fleet")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium ${currentTab === "trucking_fleet" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}>
                <Truck className="w-4 h-4" /> Transport Fleet
              </button>
              <button onClick={() => setCurrentTab("trucking_payroll")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium ${currentTab === "trucking_payroll" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}>
                <FileSpreadsheet className="w-4 h-4" /> Payroll Processing
              </button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 text-xs rounded text-rose-400 border border-slate-700">
            <LogOut className="w-3.5 h-3.5" /> Close Session
          </button>
        </div>
      </aside>

      {/* WORKSPACE CONTENT MAIN SECTION */}
      <main className="flex-1 p-8 relative">
        {currentTab === "trucking_payroll" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Full-Capitalization Payroll Terminal</h2>
                <p className="text-xs text-slate-400">Extracts position matrices, branch node locations, time tracking values, and instantly populates individual payslips.</p>
              </div>
              <label className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded text-sm cursor-pointer shadow-md">
                Ingest Data Workbook
                <input type="file" accept=".xlsx, .xls" onChange={handleExcelIngestion} className="hidden" />
              </label>
            </div>

            {/* DATA EXTRACTION METRIC MATRIX GRID */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="bg-slate-950 text-slate-500 font-mono uppercase">
                  <tr>
                    <th className="p-3">Personnel / Node</th>
                    <th className="p-3">Role Profile</th>
                    <th className="p-3">F1 / F2 Gross</th>
                    <th className="p-3">Taxes (NIS + PAYE)</th>
                    <th className="p-3 text-emerald-400">Net Return</th>
                    <th className="p-3 text-center">Interactive Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {payrollRecords.map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-850/30">
                      <td className="p-3">
                        <div className="font-sans font-bold text-slate-200">{rec.employee_name}</div>
                        <div className="text-[10px] text-slate-500">{rec.location} • {rec.bank_name}</div>
                      </td>
                      <td className="p-3 text-slate-300 font-sans">{rec.position}</td>
                      <td className="p-3 text-slate-400">
                        F1: ${rec.f1_gross.toLocaleString()} <br/> F2: ${rec.f2_gross.toLocaleString()}
                      </td>
                      <td className="p-3 text-rose-400">
                        N: ${rec.nis_contribution.toLocaleString()} <br/> P: ${rec.paye_deduction.toLocaleString()}
                      </td>
                      <td className="p-3 text-emerald-400 font-bold font-sans">${rec.net_pay.toLocaleString()} GYD</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => setSelectedPayslip(rec)} 
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border border-slate-700 px-2.5 py-1 rounded text-xs transition-all text-slate-300"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* AUTOMATIC GENERATED PAYSLIP OVERLAY MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white text-slate-900 w-full max-w-xl rounded-xl p-8 shadow-2xl relative border-t-8 border-emerald-500">
            <button onClick={() => setSelectedPayslip(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center border-b pb-4 mb-6">
              <h3 className="text-xl font-black uppercase tracking-wider text-slate-900">Lyft Trucking Services Ltd.</h3>
              <p className="text-xs text-slate-500 font-medium font-mono">Statement of Fortnightly Compensation Earnings</p>
            </div>

            {/* Employee Metadata Roster Block */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-100 p-4 rounded-lg mb-6 text-xs">
              <div><span className="text-slate-400 font-bold uppercase block text-[10px]">Employee Name</span> <strong className="text-sm text-slate-800">{selectedPayslip.employee_name}</strong></div>
              <div><span className="text-slate-400 font-bold uppercase block text-[10px]">Assigned Designation</span> <strong className="text-sm text-slate-800">{selectedPayslip.position}</strong></div>
              <div><span className="text-slate-400 font-bold uppercase block text-[10px]">Operational Worksite</span> <span className="font-semibold">{selectedPayslip.location} Node</span></div>
              <div><span className="text-slate-400 font-bold uppercase block text-[10px]">Disbursement Target</span> <span className="font-semibold">{selectedPayslip.bank_name} ({selectedPayslip.account_number})</span></div>
            </div>

            {/* Time Tracking Parameters Ledger Breakdown */}
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 border-b pb-1">Time Tracker & Production Breakdown</h4>
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 font-mono">
              <div className="bg-slate-50 p-3 rounded border">
                <span className="font-bold text-slate-700 block mb-1 border-b pb-0.5 font-sans">First Fortnightly Half</span>
                <div>Normal Hours Worked: <span className="font-bold text-slate-900">{selectedPayslip.f1_normal_hours}</span></div>
                <div>Overtime Accumulated: <span className="font-bold text-slate-900">{selectedPayslip.f1_ot_hours}</span></div>
                <div className="mt-1 pt-1 border-t text-slate-800 font-bold">Gross Subtotal: ${selectedPayslip.f1_gross.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded border">
                <span className="font-bold text-slate-700 block mb-1 border-b pb-0.5 font-sans">Second Fortnightly Half</span>
                <div>Normal Hours Worked: <span className="font-bold text-slate-900">{selectedPayslip.f2_normal_hours}</span></div>
                <div>Overtime Accumulated: <span className="font-bold text-slate-900">{selectedPayslip.f2_ot_hours}</span></div>
                <div className="mt-1 pt-1 border-t text-slate-800 font-bold">Gross Subtotal: ${selectedPayslip.f2_gross.toLocaleString()}</div>
              </div>
            </div>

            {/* Financial Totals Calculations Section */}
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 border-b pb-1">Tax Deductions Ledger</h4>
            <div className="space-y-1.5 text-xs font-mono mb-6">
              <div className="flex justify-between"><span>Consolidated Month Gross Base Pay:</span> <span className="font-bold">${selectedPayslip.gross_salary.toLocaleString()} GYD</span></div>
              <div className="flex justify-between text-rose-600"><span>National Insurance Contribution Deduction (NIS):</span> <span>-${selectedPayslip.nis_contribution.toLocaleString()}</span></div>
              <div className="flex justify-between text-rose-600"><span>Pay As You Earn Income Tax Deduction (PAYE):</span> <span>-${selectedPayslip.paye_deduction.toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-2 text-sm font-black text-emerald-600 bg-emerald-50 p-2 rounded mt-2 font-sans">
                <span>NET NET CASH PAYOUT AMOUNT:</span>
                <span>${selectedPayslip.net_pay.toLocaleString()} GYD</span>
              </div>
            </div>

            <div className="text-[10px] text-center text-slate-400 border-t pt-4 font-medium italic">
              This is a system-generated tracking summary compiled directly from the live encrypted master payroll sheet ledger.
            </div>
          </div>
        </div>
      )}

      {/* LOGIN GATE CODE FALLBACK */}
      {!currentUser && (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
          <form onSubmit={handleSystemLogin} className="bg-slate-900 p-6 rounded-lg border border-slate-800 space-y-4 w-80">
            <h2 className="text-white font-bold text-lg">System Doorway</h2>
            <input type="text" placeholder="Username" value={authUsername} onChange={e => setAuthUsername(e.target.value)} className="w-full bg-slate-950 border p-2 text-sm text-white rounded" />
            <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-950 border p-2 text-sm text-white rounded" />
            <button type="submit" className="w-full bg-emerald-500 text-slate-950 p-2 rounded text-sm font-bold">Access Matrix</button>
          </form>
        </div>
      )}
    </div>
  );
}
