"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { 
  Truck, FileSpreadsheet, Key, LogOut, Shield, Users, 
  UserPlus, DollarSign, Activity, Eye, FileText, X, Dumbbell, BarChart3, Settings
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SystemUser {
  name: string;
  username: string;
  role: string;
  department: "gym_operations" | "lyft_trucking" | "master_admin";
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

  // Form states for dispatch work orders
  const [newPlate, setNewPlate] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newCargo, setNewCargo] = useState("Gym Equipment Iron Mat");

  // Route fallback routing when user logs in to prevent blank screens
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role?.toLowerCase() === "admin" || currentUser.department === "master_admin") {
        setCurrentTab("gym_dashboard"); // Admins start here but have full access
        fetchTruckingData();
      } else if (currentUser.department === "lyft_trucking") {
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
      setAuthError("Invalid terminal authorization credentials.");
      return;
    }
    setCurrentUser(data);
  };

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
          alert(`Sheet "${targetSheetName}" not found inside workbook assets.`);
          return;
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const rawJsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
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

          // Excel line filtering constraint rules
          if (nisContribution === 0 && payeDeduction === 0) continue;

          compiledRecords.push({
            employee_name: employeeName,
            position: row[3] ? String(row[3]).trim() : "Staff Worker",
            location: row[4] ? String(row[4]).trim() : "Main Office",
            bank_name: row[40] ? String(row[40]).trim() : "Cash",
            account_number: row[39] ? String(row[39]).trim() : "N/A",
            email: row[41] ? String(row[41]).trim() : "",
            
            f1_normal_hours: formatExcelTime(row[7]),
            f1_ot_hours: formatExcelTime(row[8]),
            f1_gross: parseFloat(row[28]) || 0,
            
            f2_normal_hours: formatExcelTime(row[18]),
            f2_ot_hours: formatExcelTime(row[19]),
            f2_gross: parseFloat(row[29]) || 0,
            
            gross_salary: parseFloat(row[30]) || 0,
            nis_contribution: nisContribution,
            paye_deduction: payeDeduction,
            net_pay: parseFloat(row[35]) || 0,
            payment_frequency: "Paid Fortnightly",
            payroll_cycle_date: "2026-04-30"
          });
        }

        await supabase.from("payroll_records").delete().neq("employee_name", "WIPE");
        const { error } = await supabase.from("payroll_records").insert(compiledRecords);
        if (error) throw error;

        alert(`Successfully ingested and mapped ${compiledRecords.length} extended worker profiles!`);
        fetchTruckingData();
      } catch (err: any) {
        alert(`Error compiling spreadsheet: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newDriver) return;

    const record: FleetWorkOrder = {
      truck_plate: newPlate,
      driver_name: newDriver,
      destination: newDest,
      cargo_type: newCargo,
      dispatch_status: "Pending"
    };

    const { error } = await supabase.from("fleet_work_orders").insert([record]);
    if (!error) {
      setNewPlate("");
      setNewDriver("");
      setNewDest("");
      fetchTruckingData();
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: "In Transit" | "Delivered") => {
    await supabase.from("fleet_work_orders").update({ dispatch_status: nextStatus }).eq("id", id);
    fetchTruckingData();
  };

  // Helper flags to simplify multi-department visibility switches
  const isMasterAdmin = currentUser?.role?.toLowerCase() === "admin" || currentUser?.department === "master_admin";
  const hasTruckingAccess = isMasterAdmin || currentUser?.department === "lyft_trucking";
  const hasGymAccess = isMasterAdmin || currentUser?.department === "gym_operations";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans">
      
      {/* SIDEBAR NAVIGATION - MASTER CONTROL HUB */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-neutral-800 flex items-center gap-2.5 font-black tracking-wider text-red-500 uppercase">
            <Dumbbell className="w-6 h-6 text-red-600" />
            <span>Lyft Gym Matrix</span>
          </div>
          
          <div className="p-4 text-[10px] text-neutral-500 font-mono uppercase tracking-widest border-b border-neutral-850">
            Navigation Interface ({currentUser?.role})
          </div>

          <nav className="p-3 space-y-1">
            {/* GYM CHANNELS */}
            {hasGymAccess && (
              <>
                <button onClick={() => setCurrentTab("gym_dashboard")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "gym_dashboard" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <BarChart3 className="w-4 h-4" /> Gym Core Hub
                </button>
                <button onClick={() => setCurrentTab("gym_members")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "gym_members" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <Users className="w-4 h-4" /> Client Database
                </button>
              </>
            )}

            {/* TRUCKING LOGISTICS CHANNELS */}
            {hasTruckingAccess && (
              <>
                <button onClick={() => setCurrentTab("trucking_fleet")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "trucking_fleet" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <Truck className="w-4 h-4" /> Fleet Dispatch
                </button>
                <button onClick={() => setCurrentTab("trucking_payroll")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "trucking_payroll" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <FileSpreadsheet className="w-4 h-4" /> Matrix Payroll
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
          <div className="text-xs text-neutral-400 mb-2 truncate font-mono">User: {currentUser?.name}</div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-red-900/40 text-xs rounded text-red-400 border border-neutral-700 transition-all font-bold">
            <LogOut className="w-3.5 h-3.5" /> Terminate Access
          </button>
        </div>
      </aside>

      {/* WORKSPACE AREA LAYOUT CONTAINER */}
      <main className="flex-1 p-8 bg-neutral-950 overflow-y-auto">
        
        {/* TAB VIEW 1: GYM CORE DASHBOARD CONTROL */}
        {currentTab === "gym_dashboard" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl border-l-4 border-l-red-600">
              <h2 className="text-2xl font-black tracking-tight text-white">GYM METRIC OPERATIONS HUB</h2>
              <p className="text-sm text-neutral-400 mt-1">Real-time facility check-ins, membership counters, and operational tracking parameters.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">Active Membership Base</div>
                <div className="text-3xl font-black mt-2 text-red-500">1,248 Active</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">Daily POS Revenue Ring</div>
                <div className="text-3xl font-black mt-2 text-white">$420,500 GYD</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">Active Personal Trainers</div>
                <div className="text-3xl font-black mt-2 text-white">14 Roster Slots</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB VIEW 2: GYM CLIENT ACCESS DATABASE */}
        {currentTab === "gym_members" && (
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-2">Gym Access Accounts Registry</h3>
            <p className="text-xs text-neutral-400 mb-4">View active registration status fields for users spanning full-access multi-location tags.</p>
            <div className="text-sm text-neutral-500 italic p-8 text-center border border-dashed border-neutral-800 rounded">
              Client database synchronization active.
            </div>
          </div>
        )}

        {/* TAB VIEW 3: TRUCKING DISPATCH LOGISTICS */}
        {currentTab === "trucking_fleet" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
              <h2 className="text-lg font-bold text-white mb-4">Create Dispatch Logistics Order</h2>
              <form onSubmit={handleCreateWorkOrder} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <input type="text" placeholder="License Plate (e.g., GTT 8842)" value={newPlate} onChange={e => setNewPlate(e.target.value)} className="bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" required />
                <input type="text" placeholder="Driver Full Name" value={newDriver} onChange={e => setNewDriver(e.target.value)} className="bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" required />
                <input type="text" placeholder="Destination Delivery Node" value={newDest} onChange={e => setNewDest(e.target.value)} className="bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" required />
                <button type="submit" className="bg-red-600 hover:bg-red-700 font-bold p-2.5 rounded text-white transition-all">Commit To Active Roster</button>
              </form>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-neutral-850 font-bold text-sm text-white border-b border-neutral-800">Active Roster Monitoring Table</div>
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                  <tr>
                    <th className="p-3">Plate ID</th>
                    <th className="p-3">Cargo Driver</th>
                    <th className="p-3">Destination Node</th>
                    <th className="p-3">Operational Status</th>
                    <th className="p-3 text-right">State Control Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {workOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-850/50">
                      <td className="p-3 font-bold text-neutral-200">{order.truck_plate}</td>
                      <td className="p-3 font-sans text-neutral-300">{order.driver_name}</td>
                      <td className="p-3 font-sans">{order.destination}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.dispatch_status === 'Pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' : order.dispatch_status === 'In Transit' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                          {order.dispatch_status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {order.dispatch_status === "Pending" && (
                          <button onClick={() => handleUpdateStatus(order.id!, "In Transit")} className="bg-neutral-800 hover:bg-blue-600 text-white px-2 py-1 rounded text-[10px] transition-all">Mark Departure</button>
                        )}
                        {order.dispatch_status === "In Transit" && (
                          <button onClick={() => handleUpdateStatus(order.id!, "Delivered")} className="bg-neutral-800 hover:bg-emerald-600 text-white px-2 py-1 rounded text-[10px] transition-all">Confirm Delivery</button>
                        )}
                        {order.dispatch_status === "Delivered" && <span className="text-neutral-600 text-[10px] italic">Cycle Completed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB VIEW 4: MATRIX INFRASTRUCTURE PAYROLL PROCESSOR */}
        {currentTab === "trucking_payroll" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-900 p-6 rounded-xl border border-neutral-800 border-l-4 border-l-red-600">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Lyft Matrix Payroll Engine</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Automates job roles, branch worksites, hours parameters, and outputs formatted payslips.</p>
              </div>
              <label className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm cursor-pointer transition-all shadow-lg">
                Ingest Data Workbook
                <input type="file" accept=".xlsx, .xls" onChange={handleExcelIngestion} className="hidden" />
              </label>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 text-neutral-500 font-mono uppercase">
                  <tr>
                    <th className="p-3">Personnel Profile</th>
                    <th className="p-3">Role Matrix</th>
                    <th className="p-3">F1 / F2 Gross Breakdown</th>
                    <th className="p-3">Deductions (NIS / PAYE)</th>
                    <th className="p-3 text-red-500">Net Return Total</th>
                    <th className="p-3 text-center">Interactive Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {payrollRecords.map((rec, i) => (
                    <tr key={i} className="hover:bg-neutral-850/40">
                      <td className="p-3">
                        <div className="font-sans font-bold text-neutral-200">{rec.employee_name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{rec.location} • {rec.bank_name}</div>
                      </td>
                      <td className="p-3 text-neutral-300 font-sans">{rec.position}</td>
                      <td className="p-3 text-neutral-400 text-[11px]">
                        F1: ${rec.f1_gross.toLocaleString()} <br/> F2: ${rec.f2_gross.toLocaleString()}
                      </td>
                      <td className="p-3 text-red-400 text-[11px]">
                        NIS: ${rec.nis_contribution.toLocaleString()} <br/> PAYE: ${rec.paye_deduction.toLocaleString()}
                      </td>
                      <td className="p-3 text-red-500 font-black font-sans text-sm">${rec.net_pay.toLocaleString()} GYD</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => setSelectedPayslip(rec)} 
                          className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white border border-neutral-700 px-3 py-1.5 rounded text-xs transition-all"
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
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white text-neutral-900 w-full max-w-xl rounded-xl p-8 shadow-2xl relative border-t-8 border-red-600">
            <button onClick={() => setSelectedPayslip(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center border-b pb-4 mb-5">
              <h3 className="text-xl font-black uppercase tracking-wider text-neutral-900">Lyft Trucking Services Ltd.</h3>
              <p className="text-xs text-neutral-500 font-bold font-mono uppercase tracking-wider">Statement of Fortnightly Compensation Earnings</p>
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-neutral-100 p-4 rounded-lg mb-5 text-xs">
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Employee Name</span> <strong className="text-sm text-neutral-800">{selectedPayslip.employee_name}</strong></div>
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Assigned Designation</span> <strong className="text-sm text-neutral-800">{selectedPayslip.position}</strong></div>
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Operational Worksite</span> <span className="font-semibold text-neutral-700">{selectedPayslip.location} Node</span></div>
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Disbursement Target</span> <span className="font-semibold text-neutral-700">{selectedPayslip.bank_name} ({selectedPayslip.account_number})</span></div>
            </div>

            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2 border-b pb-1">Time Tracker Parameters</h4>
            <div className="grid grid-cols-2 gap-4 text-xs mb-5 font-mono">
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                <span className="font-bold text-neutral-700 block mb-1 border-b pb-0.5 font-sans">First Fortnightly Half</span>
                <div>Normal Hours: <span className="font-bold text-neutral-900">{selectedPayslip.f1_normal_hours}</span></div>
                <div>Overtime Hours: <span className="font-bold text-neutral-900">{selectedPayslip.f1_ot_hours}</span></div>
                <div className="mt-1.5 pt-1 border-t text-neutral-800 font-bold">Gross: ${selectedPayslip.f1_gross.toLocaleString()}</div>
              </div>
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                <span className="font-bold text-neutral-700 block mb-1 border-b pb-0.5 font-sans">Second Fortnightly Half</span>
                <div>Normal Hours: <span className="font-bold text-neutral-900">{selectedPayslip.f2_normal_hours}</span></div>
                <div>Overtime Hours: <span className="font-bold text-neutral-900">{selectedPayslip.f2_ot_hours}</span></div>
                <div className="mt-1.5 pt-1 border-t text-neutral-800 font-bold">Gross: ${selectedPayslip.f2_gross.toLocaleString()}</div>
              </div>
            </div>

            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2 border-b pb-1">Deductions Ledger & Net Payout</h4>
            <div className="space-y-1.5 text-xs font-mono mb-4">
              <div className="flex justify-between"><span>Consolidated Gross Income:</span> <span className="font-bold">${selectedPayslip.gross_salary.toLocaleString()} GYD</span></div>
              <div className="flex justify-between text-red-600"><span>National Insurance Contribution (NIS):</span> <span>-${selectedPayslip.nis_contribution.toLocaleString()}</span></div>
              <div className="flex justify-between text-red-600"><span>Pay As You Earn Tax Contribution (PAYE):</span> <span>-${selectedPayslip.paye_deduction.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-neutral-300 pt-2.5 text-sm font-black text-red-600 bg-red-50 p-2.5 rounded mt-2 font-sans">
                <span>NET ACCOUNTS PAYABLE DISBURSEMENT:</span>
                <span>${selectedPayslip.net_pay.toLocaleString()} GYD</span>
              </div>
            </div>

            <div className="text-[10px] text-center text-neutral-400 border-t pt-4 italic font-medium">
              This statement constitutes an encrypted digital record processed through the system ledger core.
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM AUTHORIZATION DOORWAY GATE FALLBACK */}
      {!currentUser && (
        <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center z-50">
          <form onSubmit={handleSystemLogin} className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 space-y-4 w-80 shadow-2xl relative border-t-4 border-red-600">
            <div className="text-center pb-2">
              <h2 className="text-white font-black tracking-wider uppercase text-md">Lyft Gym Matrix</h2>
              <p className="text-[10px] text-neutral-500 font-mono tracking-widest mt-0.5">Terminal Authentication Request</p>
            </div>
            {authError && <div className="bg-red-950/50 border border-red-800 text-red-400 p-2 rounded text-xs text-center font-semibold font-mono">{authError}</div>}
            <div className="space-y-2">
              <input type="text" placeholder="Username Identity" value={authUsername} onChange={e => setAuthUsername(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white rounded focus:outline-none focus:border-red-600 font-mono" required />
              <input type="password" placeholder="Access Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white rounded focus:outline-none focus:border-red-600 font-mono" required />
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white p-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-900/10">Authorize Access</button>
          </form>
        </div>
      )}
    </div>
  );
}
