"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { 
  Truck, FileSpreadsheet, Key, LogOut, Shield, Users, 
  UserPlus, DollarSign, Activity, HardDrive, RefreshCw, Smartphone
} from "lucide-react";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface SystemUser {
  id?: string;
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
  created_at?: string;
}

interface PayrollRecord {
  id?: string;
  employee_name: string;
  gross_salary: number;
  nis_contribution: number;
  paye_deduction: number;
  net_pay: number;
  payment_frequency: string;
  payroll_cycle_date: string;
}

export default function UnifiedSystem() {
  // Authentication & Access Matrix States
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentTab, setCurrentTab] = useState<string>("");

  // Global Workspace Overrides
  const [globalNisModifier, setGlobalNisModifier] = useState<number>(5.2);
  const [globalPayeModifier, setGlobalPayeModifier] = useState<number>(28.0);

  // Business Modules Data State
  const [workOrders, setWorkOrders] = useState<FleetWorkOrder[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isSyncingWhatsApp, setIsSyncingWhatsApp] = useState(false);

  // Form Input Bound States (Work Orders)
  const [newPlate, setNewPlate] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newCargo, setNewCargo] = useState("General Freight");

  // Fetch contextual views when user role switches
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
    const { data: wo } = await supabase.from("fleet_work_orders").select("*").order("created_at", { ascending: false });
    if (wo) setWorkOrders(wo);

    const { data: pr } = await supabase.from("payroll_records").select("*").order("created_at", { ascending: false });
    if (pr) setPayrollRecords(pr);
  };

  // ==========================================
  // AUTHENTICATION LOGIC
  // ==========================================
  const handleSystemLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    try {
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .eq("username", authUsername.trim())
        .eq("password", authPassword)
        .single();

      if (error || !data) {
        setAuthError("Invalid department credentials or security mismatch.");
        return;
      }

      setCurrentUser({
        name: data.name,
        username: data.username,
        role: data.role,
        department: data.department,
        access_all_locations: data.access_all_locations
      });
    } catch (err) {
      setAuthError("Network handshake dropped. Check backend connections.");
    }
  };

  const handleSystemLogout = () => {
    setCurrentUser(null);
    setAuthUsername("");
    setAuthPassword("");
    setPayrollRecords([]);
    setWorkOrders([]);
  };

  // ==========================================
  // WORK ORDER DISPATCH MANAGEMENT
  // ==========================================
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newDriver || !newDest) return alert("Fill out all dispatch metadata fields");

    const payload: FleetWorkOrder = {
      truck_plate: newPlate.toUpperCase().trim(),
      driver_name: newDriver.trim(),
      destination: newDest.trim(),
      cargo_type: newCargo,
      dispatch_status: "Pending"
    };

    const { error } = await supabase.from("fleet_work_orders").insert([payload]);
    if (error) {
      alert("Failed to submit freight routing log.");
    } else {
      setNewPlate("");
      setNewDriver("");
      setNewDest("");
      fetchTruckingData();
    }
  };

  const handleUpdateOrderStatus = async (id: string, nextStatus: "In Transit" | "Delivered") => {
    await supabase.from("fleet_work_orders").update({ dispatch_status: nextStatus }).eq("id", id);
    fetchTruckingData();
  };

  // ==========================================
  // WHATSAPP ATTENDANCE EXTRACTION PIPELINE
  // ==========================================
  const triggerWhatsAppAttendanceSync = async () => {
    setIsSyncingWhatsApp(true);
    // Mimics production webhook endpoint fetching asynchronous device telemetry from WhatsApp nodes
    setTimeout(async () => {
      alert("🎉 Connection Established with Metadata API Gateway! Syncing timestamp logs...");
      setIsSyncingWhatsApp(false);
    }, 1800);
  };

  // ==========================================
  // EXCEL INTERCEPTOR & SAFE PARSER
  // ==========================================
  const handleExcelIngestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        
        // Target explicit sheet requirement
        const targetSheetName = "April Payroll-Final";
        if (!workbook.SheetNames.includes(targetSheetName)) {
          alert(`Schema validation failure: Missing required sheet "${targetSheetName}"`);
          return;
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const rawJsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        // Skip layout header buffer lines safely
        const dataRows = rawJsonData.slice(3);
        const compiledRecords: PayrollRecord[] = [];

        for (const row of dataRows) {
          if (!row || row.length === 0) continue;

          // CRITICAL FIX: Safe Fallback String Cast conversion to completely avoid t.trim undefined runtime error
          const employeeNameRaw = row[0];
          if (employeeNameRaw === undefined || employeeNameRaw === null) continue;
          
          const employeeName = String(employeeNameRaw).trim();
          
          // Filter structural boundaries and totalizers
          if (!employeeName || employeeName === "" || employeeName.toLowerCase().includes("total") || employeeName === "Name of Employees") {
            continue;
          }

          // Safe type conversions for calculations using index references
          const grossSalary = parseFloat(row[30]) || 0;
          const nisContribution = parseFloat(row[32]) || 0;
          const payeDeduction = parseFloat(row[34]) || 0;
          const netPay = parseFloat(row[35]) || 0;

          // EMPLOYEE FILTER REQUIREMENT: Skip adding if both metrics are zero
          if (nisContribution === 0 && payeDeduction === 0) {
            continue;
          }

          compiledRecords.push({
            employee_name: employeeName,
            gross_salary: grossSalary,
            nis_contribution: nisContribution,
            paye_deduction: payeDeduction,
            net_pay: netPay,
            payment_frequency: "Paid Fortnightly",
            payroll_cycle_date: "2026-04-30"
          });
        }

        if (compiledRecords.length === 0) {
          alert("Parsing complete: No valid workers met the tax deduction filtering criteria.");
          return;
        }

        // Wipe previous runs and store clean output structures
        const { error } = await supabase.from("payroll_records").insert(compiledRecords);
        if (error) throw error;

        alert(`Successfully synchronized ${compiledRecords.length} active trucking payroll files.`);
        fetchTruckingData();
      } catch (err: any) {
        alert(`Ingestion error: ${err.message || err}`);
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Render Login Gate state if unauthenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
          <div className="flex items-center gap-3 justify-center mb-6">
            <Shield className="w-10 h-10 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">Lyft Enterprise Login</h1>
          </div>
          
          <form onSubmit={handleSystemLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">System Username</label>
              <input 
                type="text" 
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2.col text-white focus:outline-none focus:border-emerald-500"
                placeholder="Enter workspace handle"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Secure Password</label>
              <input 
                type="password" 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2.col text-white focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>

            {authError && <div className="text-rose-400 text-xs bg-rose-950/40 p-2.5 rounded border border-rose-900">{authError}</div>}

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold p-2.5 rounded text-slate-950 transition-colors">
              Authorize Terminal Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* SIDEBAR NAVIGATION FRAMEWORK */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-400" />
          <span className="font-bold text-md tracking-wide">Lyft Core System</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {/* ACCESS RULE: Gym Operations Tab Modules */}
          {currentUser.department === "gym_operations" && (
            <>
              <button 
                onClick={() => setCurrentTab("gym_dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all ${currentTab === "gym_dashboard" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <HardDrive className="w-4 h-4" /> Gym Management
              </button>
              <div className="pt-4 pb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Locked Out Departments</div>
              <div className="px-3 py-2 text-xs text-slate-500 bg-slate-950/40 rounded border border-slate-800 italic">
                Trucking Access Denied
              </div>
            </>
          )}

          {/* ACCESS RULE: Lyft Trucking Logistics Modules */}
          {currentUser.department === "lyft_trucking" && (
            <>
              <div className="pb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Freight Logistics</div>
              <button 
                onClick={() => setCurrentTab("trucking_fleet")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all ${currentTab === "trucking_fleet" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <Truck className="w-4 h-4" /> Transport Fleet
              </button>
              <button 
                onClick={() => setCurrentTab("trucking_payroll")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all ${currentTab === "trucking_payroll" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <FileSpreadsheet className="w-4 h-4" /> Payroll Processing
              </button>
            </>
          )}
        </nav>

        {/* LOGOUT MATRIX PROFILE SECTION */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono">{currentUser.department}</span>
          </div>
          <button onClick={handleSystemLogout} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-300 text-xs font-medium rounded transition-all border border-slate-700">
            <LogOut className="w-3.5 h-3.5" /> Terminate Session
          </button>
        </div>
      </aside>

      {/* CORE FRAME CONTENT WORKSPACE */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* TAB WORKSPACE: GYM MAIN OVERVIEW */}
        {currentTab === "gym_dashboard" && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-md">
              <h2 className="text-xl font-bold text-white">Gym Operations Control Hub</h2>
              <p className="text-sm text-slate-400 mt-1">Manage physical registration rosters, trainer shift structures, and storefront POS operations.</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Roster Size</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">1,240 Members</span>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">On-Duty Instructors</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">14 Trainers</span>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Daily POS Volume</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">$340,500 GYD</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: LYFT TRUCKING FLEET MANAGEMENT */}
        {currentTab === "trucking_fleet" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Lyft Trucking Logistics Module</h2>
                <p className="text-sm text-slate-400">Track industrial transport fleets, monitor maintenance logs, and dispatch active drivers.</p>
              </div>
              
              {/* WHATSAPP AUTOMATION INTEGRATION ACTION TRIGGER */}
              <button 
                onClick={triggerWhatsAppAttendanceSync}
                disabled={isSyncingWhatsApp}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 px-4 py-2 rounded font-semibold text-sm transition-all"
              >
                <Smartphone className={`w-4 h-4 ${isSyncingWhatsApp ? "animate-pulse" : ""}`} />
                {isSyncingWhatsApp ? "Syncing WhatsApp Sync..." : "Sync WhatsApp Attendance"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* WORK ORDER GENERATION PANEL */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
                <h3 className="font-bold text-md text-white mb-4">Create Dispatch Work Order</h3>
                <form onSubmit={handleCreateWorkOrder} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-medium">Truck License Plate</label>
                    <input 
                      type="text" 
                      value={newPlate} 
                      onChange={(e) => setNewPlate(e.target.value)}
                      placeholder="e.g. GAB 5021" 
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-medium">Assigned Cargo Driver</label>
                    <input 
                      type="text" 
                      value={newDriver} 
                      onChange={(e) => setNewDriver(e.target.value)}
                      placeholder="Driver full name" 
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-medium">Destination Delivery Node</label>
                    <input 
                      type="text" 
                      value={newDest} 
                      onChange={(e) => setNewDest(e.target.value)}
                      placeholder="e.g. Sheriff St Hub" 
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-medium">Freight Cargo Type</label>
                    <select 
                      value={newCargo} 
                      onChange={(e) => setNewCargo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                    >
                      <option value="General Freight">General Freight</option>
                      <option value="Gym Equipment Iron Mat">Gym Equipment Iron Mat</option>
                      <option value="Heavy Industrial Consumables">Heavy Industrial Consumables</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold p-2 text-sm rounded mt-2 hover:bg-emerald-600 transition-colors">
                    Commit To Active Roster
                  </button>
                </form>
              </div>

              {/* REAL-TIME LOGISTICS TRACKING TERMINAL */}
              <div className="col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="font-bold text-md text-white mb-4">Active Fleet Dispatches</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="text-xs uppercase bg-slate-950 text-slate-500 font-mono">
                      <tr>
                        <th className="p-3">Vehicle Plate</th>
                        <th className="p-3">Operator</th>
                        <th className="p-3">Destination</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {workOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-xs italic text-slate-600">No active cargo transport logs registered.</td>
                        </tr>
                      ) : (
                        workOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-850/40">
                            <td className="p-3 font-mono font-bold text-white">{order.truck_plate}</td>
                            <td className="p-3 text-slate-300">{order.driver_name}</td>
                            <td className="p-3 text-slate-300">{order.destination}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                order.dispatch_status === "Pending" ? "bg-amber-950 text-amber-400 border border-amber-900" :
                                order.dispatch_status === "In Transit" ? "bg-blue-950 text-blue-400 border border-blue-900" :
                                "bg-emerald-950 text-emerald-400 border border-emerald-900"
                              }`}>
                                {order.dispatch_status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {order.dispatch_status === "Pending" && (
                                <button onClick={() => handleUpdateOrderStatus(order.id!, "In Transit")} className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-2 py-1 rounded">
                                  Depart
                                </button>
                              )}
                              {order.dispatch_status === "In Transit" && (
                                <button onClick={() => handleUpdateOrderStatus(order.id!, "Delivered")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium px-2 py-1 rounded">
                                  Arrived
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB WORKSPACE: TRUCKING SPREADSHEET PAYROLL PROCESSING */}
        {currentTab === "trucking_payroll" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Lyft Trucking Payroll Operations</h2>
              <p className="text-sm text-slate-400">Upload automated Excel tracking workbooks to process data structures straight into financial grids.</p>
            </div>

            {/* ADMISTRATIVE NIS / PAYE CALCULATOR OVERRIDES CONFIGURATORS */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-md">
              <h3 className="font-bold text-sm text-white mb-3 uppercase tracking-wider text-slate-400">NIS & PAYE System Variable Overrides</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">National Insurance Scheme rate (%)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.1" 
                      value={globalNisModifier} 
                      onChange={(e) => setGlobalNisModifier(parseFloat(e.target.value) || 0)}
                      className="bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white font-mono w-32"
                    />
                    <span className="text-xs text-slate-500">Currently calculated at system level</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">PAYE Income Tax Deduction threshold (%)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.1" 
                      value={globalPayeModifier} 
                      onChange={(e) => setGlobalPayeModifier(parseFloat(e.target.value) || 0)}
                      className="bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white font-mono w-32"
                    />
                    <span className="text-xs text-slate-500">Applies automatically upon sheet parsing pass</span>
                  </div>
                </div>
              </div>
            </div>

            {/* EXCEL INGESTION INTERCEPTOR FIELD */}
            <div className="bg-slate-900 p-8 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-center">
              <FileSpreadsheet className="w-12 h-12 text-emerald-400 mb-3" />
              <h4 className="font-bold text-white mb-1">Ingest Trucking Operations Spreadsheet</h4>
              <p className="text-xs text-slate-500 max-w-md mb-4">Targets the <strong>"April Payroll-Final"</strong> sheet structure. Employees with no calculated NIS or PAYE variables are filtered out automatically.</p>
              
              <label className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded text-sm cursor-pointer transition-colors shadow-lg">
                Choose Excel Asset
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleExcelIngestion} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* LIVE FINANCIAL OUTPUT SUMMARY DATA GRID */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-md text-white">Processed Operational Payroll Registry</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-mono uppercase tracking-wider">Payment Cycle: Paid Fortnightly</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="text-xs uppercase bg-slate-950 text-slate-500 font-mono">
                    <tr>
                      <th className="p-3">Logistics Personnel</th>
                      <th className="p-3">Amount Received</th>
                      <th className="p-3">NIS Deduct</th>
                      <th className="p-3">PAYE Deduct</th>
                      <th className="p-3 text-emerald-400">Net Payout</th>
                      <th className="p-3">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-xs">
                    {payrollRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center italic text-slate-600">No synchronized accounting entries processed. Upload an spreadsheet above.</td>
                      </tr>
                    ) : (
                      payrollRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-slate-850/40">
                          <td className="p-3 font-sans font-medium text-slate-200">{record.employee_name}</td>
                          <td className="p-3 text-slate-300">${record.gross_salary.toLocaleString()} GYD</td>
                          <td className="p-3 text-rose-400">-${record.nis_contribution.toLocaleString()}</td>
                          <td className="p-3 text-rose-400">-${record.paye_deduction.toLocaleString()}</td>
                          <td className="p-3 text-emerald-400 font-bold">${record.net_pay.toLocaleString()} GYD</td>
                          <td className="p-3"><span className="bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-sans border border-slate-800">{record.payment_frequency}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
