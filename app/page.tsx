"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { 
  Truck, FileSpreadsheet, LogOut, Users, UserPlus, 
  Activity, FileText, X, Dumbbell, BarChart3, Settings, 
  ShieldAlert, Plus, ShoppingCart, Tag, CreditCard, Camera,
  MapPin, Edit3, UserCheck, Layers, Trash2, Package, RefreshCw
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- System Interfaces ---
interface SystemUser {
  id?: string;
  name: string;
  username: string;
  role: string;
  department: "gym_operations" | "lyft_trucking" | "master_admin";
  access_all_locations: boolean;
  assigned_branch: string; 
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

interface GymMember {
  id?: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  membership_type: string;
  assigned_branch: string;
  status: "Active" | "Expired" | "Pending";
  fitness_goal: string;
  needs_trainer: boolean;
  assigned_trainer_id?: string;
  photo_url?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface TrainerProfile {
  id: string;
  name: string;
  specialty: string;
  assigned_branch: string;
  tier: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function UnifiedSystemMatrix() {
  // --- Auth & Navigation Channels ---
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentTab, setCurrentTab] = useState<string>("");
  
  // --- Location Context Tracking ---
  const [activeBranchContext, setActiveBranchContext] = useState<string>("Sheriff Street");

  // --- Core State Arrays ---
  const [workOrders, setWorkOrders] = useState<FleetWorkOrder[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [gymMembers, setGymMembers] = useState<GymMember[]>([]);
  const [systemUsersList, setSystemUsersList] = useState<SystemUser[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // --- Live Webcam Controls ---
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Trainer State Management ---
  const [trainers, setTrainers] = useState<TrainerProfile[]>([
    { id: "t1", name: "Ravin Mahabal", specialty: "Bodybuilding / Hypertrophy", assigned_branch: "Sheriff Street", tier: "Elite Tier 1" },
    { id: "t2", name: "Brian Addamas", specialty: "Powerlifting Strength & Conditioning", assigned_branch: "Main Street", tier: "Elite Tier 1" }
  ]);
  const [editingTrainer, setEditingTrainer] = useState<TrainerProfile | null>(null);

  // --- Point Of Sale (POS) Basket Parameters ---
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posCustomerName, setPosCustomerName] = useState("");
  const [posPaymentMethod, setPosPaymentMethod] = useState("Cash Tender");

  // --- Logistics Form Binding ---
  const [newPlate, setNewPlate] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newCargo, setNewCargo] = useState("Gym Equipment Iron Mat");

  // --- Inventory Form Binding ---
  const [inventoryForm, setInventoryForm] = useState({ name: "", price: 0, quantity: 0 });

  // --- Gym Registration Form (Fully Extended Restored Params) ---
  const [memberForm, setMemberForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    membership_type: "Full Access VIP",
    assigned_branch: "Sheriff Street",
    status: "Active" as const,
    fitness_goal: "Weight Loss / Toning",
    needs_trainer: false,
    assigned_trainer_id: "",
    photo_url: ""
  });
  
  // --- Admin Registration Control Bindings ---
  const [sysUserForm, setSysUserForm] = useState({ 
    name: "", username: "", password: "", role: "Staff", 
    department: "gym_operations" as const, access_all_locations: false, assigned_branch: "Sheriff Street" 
  });
  
  const [trainerForm, setTrainerForm] = useState({ 
    name: "", specialty: "Weight Training / HIIT", assigned_branch: "Sheriff Street", tier: "Elite Tier 1" 
  });

  // Automatically adjust branch focus when account profile switches
  useEffect(() => {
    if (currentUser) {
      setActiveBranchContext(currentUser.assigned_branch);
      const isMasterAdmin = currentUser.role?.toLowerCase() === "admin" || currentUser.department === "master_admin";
      
      if (isMasterAdmin) {
        setCurrentTab("gym_dashboard");
        fetchAllMatrixData();
      } else if (currentUser.department === "lyft_trucking") {
        setCurrentTab("trucking_fleet");
        fetchTruckingData();
      } else {
        setCurrentTab("gym_dashboard");
        fetchGymData();
      }
    }
    return () => stopWebcamStream(); // Safety cleanup for hot reloading
  }, [currentUser]);

  const calculateCartTotal = () => {
    return posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const fetchAllMatrixData = async () => {
    fetchTruckingData();
    fetchGymData();
    fetchInventoryData();
    const { data: users } = await supabase.from("system_users").select("*");
    if (users) setSystemUsersList(users);
  };

  const fetchTruckingData = async () => {
    const { data: wo } = await supabase.from("fleet_work_orders").select("*");
    if (wo) setWorkOrders(wo);
    const { data: pr } = await supabase.from("payroll_records").select("*");
    if (pr) setPayrollRecords(pr);
  };

  const fetchGymData = async () => {
    const { data: members, error } = await supabase.from("gym_members").select("*");
    if (!error && members) setGymMembers(members);
  };

  const fetchInventoryData = async () => {
    const { data: stock, error } = await supabase.from("inventory").select("*").order("name", { ascending: true });
    if (!error && stock) setInventoryItems(stock);
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

  // --- Live Device Webcam Logic ---
  const startWebcamStream = async () => {
    try {
      setIsWebcamActive(true);
      const constraints = { video: { width: 320, height: 320, facingMode: "user" } };
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = localStream;
      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
      }
    } catch (err) {
      alert("Unable to open device stream asset frame. Check hardware/permissions.");
      setIsWebcamActive(false);
    }
  };

  const stopWebcamStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const captureWebcamSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setMemberForm(prev => ({ ...prev, photo_url: dataUrl }));
      stopWebcamStream();
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...memberForm,
      assigned_branch: memberForm.assigned_branch
    };

    const { error } = await supabase.from("gym_members").insert([payload]);
    if (!error) {
      alert("Gym member database identity successfully enrolled.");
      setMemberForm({
        full_name: "", phone: "", email: "", address: "",
        membership_type: "Full Access VIP", assigned_branch: activeBranchContext,
        status: "Active", fitness_goal: "Weight Loss / Toning",
        needs_trainer: false, assigned_trainer_id: "", photo_url: ""
      });
      fetchGymData();
    } else {
      alert(`Database error saving profile: ${error.message}`);
    }
  };

  // --- Supabase Backed Inventory Logic Operations ---
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryForm.name || inventoryForm.price <= 0) return;

    const { error } = await supabase.from("inventory").insert([inventoryForm]);
    if (!error) {
      setInventoryForm({ name: "", price: 0, quantity: 0 });
      fetchInventoryData();
    } else {
      alert(`Error saving inventory block: ${error.message}`);
    }
  };

  const handleUpdateStockQty = async (id: string, nextQty: number) => {
    if (nextQty < 0) return;
    const { error } = await supabase.from("inventory").update({ quantity: nextQty }).eq("id", id);
    if (!error) fetchInventoryData();
  };

  const handleDeleteInventoryItem = async (id: string) => {
    if (!confirm("Are you sure you want to drop this stock entry row from the central matrix?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) {
      fetchInventoryData();
      // Drop from checkout basket if present
      setPosCart(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleCreateSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("system_users").insert([sysUserForm]);
    if (!error) {
      alert(`Access profile authorized for ${sysUserForm.name}`);
      setSysUserForm({ name: "", username: "", password: "", role: "Staff", department: "gym_operations", access_all_locations: false, assigned_branch: "Sheriff Street" });
      fetchAllMatrixData();
    }
  };

  const handleAddOrUpdateTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrainer) {
      setTrainers(prev => prev.map(t => t.id === editingTrainer.id ? editingTrainer : t));
      alert("Trainer parameter modifications applied successfully.");
      setEditingTrainer(null);
    } else {
      const newId = `t_${Date.now()}`;
      setTrainers(prev => [...prev, { id: newId, ...trainerForm }]);
      alert(`Trainer ${trainerForm.name} added to the active staff register.`);
      setTrainerForm({ name: "", specialty: "Weight Training / HIIT", assigned_branch: activeBranchContext, tier: "Elite Tier 1" });
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newDriver) return;
    const record: FleetWorkOrder = { truck_plate: newPlate, driver_name: newDriver, destination: newDest, cargo_type: newCargo, dispatch_status: "Pending" };
    const { error } = await supabase.from("fleet_work_orders").insert([record]);
    if (!error) {
      setNewPlate(""); setNewDriver(""); setNewDest("");
      fetchTruckingData();
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: "In Transit" | "Delivered") => {
    await supabase.from("fleet_work_orders").update({ dispatch_status: nextStatus }).eq("id", id);
    fetchTruckingData();
  };

  const addToCart = (product: InventoryItem) => {
    if (product.quantity <= 0) {
      alert("Item row shows zero matching units left in available warehouse registry.");
      return;
    }
    setPosCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          alert("Cannot exceed maximum available database quantity levels.");
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const handleProcessCheckout = async () => {
    if (posCart.length === 0) return;
    
    // Reduce real numbers inside Supabase inventory table
    for (const item of posCart) {
      const match = inventoryItems.find(i => i.id === item.id);
      if (match) {
        const remaining = match.quantity - item.quantity;
        await supabase.from("inventory").update({ quantity: remaining >= 0 ? remaining : 0 }).eq("id", item.id);
      }
    }

    alert(`POS Checkout Finalized!\nCustomer: ${posCustomerName || "Walk-In"}\nTotal Ring: $${calculateCartTotal().toLocaleString()} GYD\nMethod: ${posPaymentMethod}\nLocation Base: ${activeBranchContext}`);
    setPosCart([]);
    setPosCustomerName("");
    fetchInventoryData();
  };

  // --- Excel Parser Mapping Logic ---
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
          if (employeeName === "" || employeeName.toLowerCase().includes("total") || employeeName === "Name of Employees") continue;

          const nisContribution = parseFloat(row[32]) || 0;
          const payeDeduction = parseFloat(row[34]) || 0;
          if (nisContribution === 0 && payeDeduction === 0) continue;

          compiledRecords.push({
            employee_name: employeeName,
            position: row[3] ? String(row[3]).trim() : "Staff Worker",
            location: row[4] ? String(row[4]).trim() : "Main Office",
            bank_name: row[40] ? String(row[40]).trim() : "Cash",
            account_number: row[39] ? String(row[39]).trim() : "N/A",
            email: row[41] ? String(row[41]).trim() : "",
            f1_normal_hours: row[7] ? String(row[7]) : "0",
            f1_ot_hours: row[8] ? String(row[8]) : "0",
            f1_gross: parseFloat(row[28]) || 0,
            f2_normal_hours: row[18] ? String(row[18]) : "0",
            f2_ot_hours: row[19] ? String(row[19]) : "0",
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
        await supabase.from("payroll_records").insert(compiledRecords);
        alert(`Successfully mapped and saved ${compiledRecords.length} system payroll entries!`);
        fetchTruckingData();
      } catch (err: any) {
        alert(`Spreadsheet alignment compilation failure: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- Permissible Guardrail Flags ---
  const isMasterAdmin = currentUser?.role?.toLowerCase() === "admin" || currentUser?.department === "master_admin";
  const hasGlobalLocationOverride = currentUser?.access_all_locations || isMasterAdmin;
  const hasTruckingAccess = isMasterAdmin || currentUser?.department === "lyft_trucking";
  const hasGymAccess = isMasterAdmin || currentUser?.department === "gym_operations";

  // Filter lists so branch views strictly compartmentalize data based on selection unless override
  const filteredMembers = gymMembers.filter(m => hasGlobalLocationOverride ? m.assigned_branch === activeBranchContext : m.assigned_branch === currentUser?.assigned_branch);
  const filteredTrainers = trainers.filter(t => hasGlobalLocationOverride ? t.assigned_branch === activeBranchContext : t.assigned_branch === currentUser?.assigned_branch);

  // --- Unauthenticated Screen Render Gate ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-neutral-950 rounded-lg flex items-center justify-center border border-neutral-800 mb-3 shadow">
              <Dumbbell className="w-6 h-6 text-red-600 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">LYFT Central Matrix Matrix</h2>
            <p className="text-xs text-neutral-500 font-mono tracking-tight mt-1 uppercase">Terminal Gateway Node Authentication</p>
          </div>

          <form onSubmit={handleSystemLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">Secure Operator Username</label>
              <input 
                type="text" 
                required 
                value={authUsername} 
                onChange={(e) => setAuthUsername(e.target.value)} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-sm text-white focus:outline-none focus:border-red-600 font-mono" 
                placeholder="operator_id"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">Secure Passcode Segment</label>
              <input 
                type="password" 
                required 
                value={authPassword} 
                onChange={(e) => setAuthPassword(e.target.value)} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-sm text-white focus:outline-none focus:border-red-600 font-mono" 
                placeholder="•••••••••"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-900 text-red-400 rounded text-xs flex items-center gap-2 font-mono">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {authError}
              </div>
            )}

            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold uppercase text-xs tracking-wider text-white py-3 rounded border border-red-500 transition-all shadow-lg shadow-red-900/10">
              Authorize Device Connection
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans select-none">
      
      {/* SIDEBAR NAVIGATION CONTROLS */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-neutral-800 flex items-center gap-2.5 font-black tracking-wider text-red-500 uppercase">
            <Dumbbell className="w-6 h-6 text-red-600" />
            <span>Lyft Gym Matrix</span>
          </div>
          
          <div className="p-4 text-[10px] text-neutral-500 font-mono uppercase tracking-widest border-b border-neutral-850">
            Control Node Modules
          </div>

          <nav className="p-3 space-y-1">
            {hasGymAccess && (
              <>
                <button onClick={() => setCurrentTab("gym_dashboard")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "gym_dashboard" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <BarChart3 className="w-4 h-4" /> Gym Core Hub
                </button>
                <button onClick={() => setCurrentTab("gym_members")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "gym_members" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <Users className="w-4 h-4" /> Member Records
                </button>
                <button onClick={() => setCurrentTab("gym_registration")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "gym_registration" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <UserPlus className="w-4 h-4" /> Enroll Clients
                </button>
                <button onClick={() => setCurrentTab("inventory_ledger")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "inventory_ledger" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <Package className="w-4 h-4" /> Stock Control Matrix
                </button>
                <button onClick={() => setCurrentTab("gym_pos")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "gym_pos" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <ShoppingCart className="w-4 h-4" /> Matrix POS Check
                </button>
                <button onClick={() => setCurrentTab("gym_trainers")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "gym_trainers" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                  <Activity className="w-4 h-4" /> Trainer Roster
                </button>
              </>
            )}

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

            {isMasterAdmin && (
              <button onClick={() => setCurrentTab("admin_settings")} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-semibold transition-all ${currentTab === "admin_settings" ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}>
                <Settings className="w-4 h-4" /> Access Control Matrix
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
          <div className="text-xs text-neutral-400 mb-0.5 truncate font-mono">Operator: {currentUser?.name}</div>
          <div className="text-[10px] text-neutral-500 mb-3 font-mono flex items-center gap-1">
            <MapPin className="w-3 h-3 text-red-500" /> Bound: {currentUser?.access_all_locations ? "Global All Override" : currentUser?.assigned_branch}
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-red-900/40 text-xs rounded text-red-400 border border-neutral-700 transition-all font-bold">
            <LogOut className="w-3.5 h-3.5" /> Terminate Access
          </button>
        </div>
      </aside>

      {/* WORKSPACE FRAME AREA */}
      <main className="flex-1 p-8 bg-neutral-950 overflow-y-auto space-y-6">
        
        {/* TOP OVERHEAD MATRIX: PER LOCATION ROUTER SWITCHER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-neutral-800 gap-4">
          <div>
            <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Active Terminal Gateway</div>
            <h1 className="text-xl font-black text-white flex items-center gap-2 mt-0.5 uppercase tracking-tight">
              {activeBranchContext} Network Node
            </h1>
          </div>

          {/* Render location selection if operator holds access_all_locations configuration */}
          {hasGlobalLocationOverride ? (
            <div className="bg-neutral-900 p-1 rounded-lg border border-neutral-800 flex items-center gap-1">
              <span className="text-[10px] text-neutral-500 font-mono uppercase px-2 flex items-center gap-1">
                <Layers className="w-3 h-3 text-red-500" /> Branch:
              </span>
              {["Sheriff Street", "Main Street", "Tower Node", "Mahaica Branch"].map((branch) => (
                <button key={branch} onClick={() => { setActiveBranchContext(branch); fetchInventoryData(); }} className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${activeBranchContext === branch ? "bg-red-600 text-white shadow" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}>
                  {branch.split(" ")[0]}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-900/40 text-neutral-400 border border-neutral-850 px-3 py-1.5 rounded text-xs font-mono">
              🔒 Node Locked to {currentUser?.assigned_branch}
            </div>
          )}
        </header>

        {/* VIEW A: GYM CORE HUB */}
        {currentTab === "gym_dashboard" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl border-l-4 border-l-red-600">
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">Metrics Control Hub - {activeBranchContext}</h2>
              <p className="text-sm text-neutral-400 mt-1">Localized metrics, active client matrices, and operational facility status tracks.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">Node Population Matrix</div>
                <div className="text-3xl font-black mt-2 text-red-500">{filteredMembers.length} Active Profiles</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">Coaching Staff Assigned</div>
                <div className="text-3xl font-black mt-2 text-white">{filteredTrainers.length} Active Roster</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">Bar Inventory Lines</div>
                <div className="text-3xl font-black mt-2 text-amber-500">{inventoryItems.length} Registered Row SKU's</div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW B: MEMBER RECORDS DISPLAY */}
        {currentTab === "gym_members" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Active Accounts Registry ({activeBranchContext})</h3>
                <p className="text-xs text-neutral-400 mt-1">Registry of verified client profiles with targets, photos, and coach pairings.</p>
              </div>
              <button onClick={() => setCurrentTab("gym_registration")} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1 transition-all">
                <Plus className="w-4 h-4" /> Enroll New Target
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                  <tr>
                    <th className="p-3">ID Image</th>
                    <th className="p-3">Client Parameters</th>
                    <th className="p-3">Home Residence/Address</th>
                    <th className="p-3">Target Objective</th>
                    <th className="p-3">Trainer Assignment</th>
                    <th className="p-3">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center italic text-neutral-600 font-sans">No client records aligned to the {activeBranchContext} node. Clear enrollment matrix to populate.</td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const coachPair = trainers.find(t => t.id === m.assigned_trainer_id);
                      return (
                        <tr key={m.id} className="hover:bg-neutral-850/50">
                          <td className="p-3">
                            {m.photo_url ? (
                              <img src={m.photo_url} alt="" className="w-10 h-10 object-cover rounded border border-neutral-700 shadow" />
                            ) : (
                              <div className="w-10 h-10 bg-neutral-950 flex items-center justify-center text-neutral-600 border border-neutral-800 rounded"><Camera className="w-4 h-4" /></div>
                            )}
                          </td>
                          <td className="p-3 font-sans font-bold text-neutral-200">
                            {m.full_name}
                            <div className="text-[10px] text-neutral-500 font-mono font-normal mt-0.5">{m.phone} | {m.email}</div>
                          </td>
                          <td className="p-3 font-sans text-neutral-300">{m.address || "Not Declared"}</td>
                          <td className="p-3 font-sans text-red-400 font-medium">{m.fitness_goal}</td>
                          <td className="p-3 font-sans">
                            {m.needs_trainer && coachPair ? (
                              <span className="text-neutral-200 text-xs bg-neutral-950 border border-neutral-800 px-2 py-1 rounded inline-flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-red-500" /> {coachPair.name}
                              </span>
                            ) : (
                              <span className="text-neutral-600 italic">Independent Access</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${m.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW C: CLIENT ENROLLMENT WITH LIVE HARDWARE WEBCAM SNAPSHOTTER */}
        {currentTab === "gym_registration" && (
          <div className="max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 bg-neutral-850 border-l-4 border-l-red-600">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Client Ingestion Registry Form</h3>
              <p className="text-xs text-neutral-400 mt-1">Enroll clean profile targets into the active tracking layout node ({activeBranchContext}).</p>
            </div>
            <form onSubmit={handleRegisterMember} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-neutral-400 font-mono uppercase tracking-wider block mb-1">Target Profile Name</label>
                  <input 
                    type="text" required 
                    value={memberForm.full_name} 
                    onChange={e => setMemberForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                  />
                </div>
                <div>
                  <label className="text-neutral-400 font-mono uppercase tracking-wider block mb-1">Phone Contact</label>
                  <input 
                    type="text" required 
                    value={memberForm.phone} 
                    onChange={e => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-neutral-400 font-mono uppercase tracking-wider block mb-1">E-Mail Identity</label>
                  <input 
                    type="email" 
                    value={memberForm.email} 
                    onChange={e => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                  />
                </div>
                <div>
                  <label className="text-neutral-400 font-mono uppercase tracking-wider block mb-1">Physical Address</label>
                  <input 
                    type="text" 
                    value={memberForm.address} 
                    onChange={e => setMemberForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-neutral-400 font-mono uppercase tracking-wider block mb-1">Membership Plan</label>
                  <select 
                    value={memberForm.membership_type} 
                    onChange={e => setMemberForm(prev => ({ ...prev, membership_type: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono text-xs"
                  >
                    <option value="Full Access VIP">Full Access VIP</option>
                    <option value="Regular Gym Core">Regular Gym Core</option>
                    <option value="Fortnightly Pass">Fortnightly Pass</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 font-mono uppercase tracking-wider block mb-1">Fitness Target Strategy</label>
                  <select 
                    value={memberForm.fitness_goal} 
                    onChange={e => setMemberForm(prev => ({ ...prev, fitness_goal: e.target.value }))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono text-xs"
                  >
                    <option value="Weight Loss / Toning">Weight Loss / Toning</option>
                    <option value="Hypertrophy / Muscularity">Hypertrophy / Muscularity</option>
                    <option value="Powerlifting / Strength">Powerlifting / Strength</option>
                    <option value="Cardio Fitness / Stamina">Cardio Fitness / Stamina</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-850 space-y-3">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="needs_trainer"
                    checked={memberForm.needs_trainer} 
                    onChange={e => setMemberForm(prev => ({ ...prev, needs_trainer: e.target.checked }))}
                    className="accent-red-600 w-4 h-4"
                  />
                  <label htmlFor="needs_trainer" className="text-xs text-neutral-300 font-bold uppercase tracking-wide">Attach Specialized Coaching Asset Pair</label>
                </div>

                {memberForm.needs_trainer && (
                  <div className="pt-1">
                    <label className="text-neutral-400 font-mono uppercase tracking-wider block mb-1 text-xs">Select Active Coach Asset</label>
                    <select 
                      value={memberForm.assigned_trainer_id} 
                      onChange={e => setMemberForm(prev => ({ ...prev, assigned_trainer_id: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono text-xs"
                    >
                      <option value="">-- No Coach (Independent Access) --</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} — {t.tier} ({t.assigned_branch})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* LIVE CAM SECTION */}
              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-850 space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">Biometric ID Snapshot Capture Frame</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-32 h-32 bg-neutral-900 rounded border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {memberForm.photo_url ? (
                      <img src={memberForm.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : isWebcamActive ? (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                    ) : (
                      <Camera className="w-8 h-8 text-neutral-700" />
                    )}
                  </div>
                  
                  <div className="space-y-2 w-full">
                    {!isWebcamActive ? (
                      <button type="button" onClick={startWebcamStream} className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded border border-neutral-700 flex items-center gap-1.5 transition-all">
                        <RefreshCw className="w-3.5 h-3.5" /> Launch Device Camera Asset
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" onClick={captureWebcamSnapshot} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all">
                          <Camera className="w-3.5 h-3.5" /> Trigger Snapshot
                        </button>
                        <button type="button" onClick={stopWebcamStream} className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs font-bold rounded transition-all">
                          Cancel
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-neutral-500 leading-relaxed font-mono">Uses hardware video pipelines to render a raw base64 frame mapping matrix layout directly to database table parameters.</p>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider py-3 rounded transition-all border border-red-500 shadow-xl">
                Commit Identity Matrix Into Supabase Rows
              </button>
            </form>
          </div>
        )}

        {/* VIEW D: INVENTORY LEDGER CONTROL */}
        {currentTab === "inventory_ledger" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4 md:col-span-1">
                <h3 className="text-sm font-black text-white uppercase font-mono tracking-wider">Inject SKU Stock Entry</h3>
                <form onSubmit={handleAddInventory} className="space-y-3 text-xs">
                  <div>
                    <label className="text-neutral-400 font-mono uppercase block mb-1">Product Item Label</label>
                    <input 
                      type="text" required 
                      value={inventoryForm.name}
                      onChange={e => setInventoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                      placeholder="e.g. Whey Protein Isolate 2lb"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 font-mono uppercase block mb-1">Price Ring (GYD)</label>
                    <input 
                      type="number" required 
                      value={inventoryForm.price || ""}
                      onChange={e => setInventoryForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 font-mono uppercase block mb-1">Opening Quantity Matrix</label>
                    <input 
                      type="number" required 
                      value={inventoryForm.quantity || ""}
                      onChange={e => setInventoryForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs uppercase transition-all flex items-center justify-center gap-1">
                    <Plus className="w-4 h-4" /> Save Warehouse SKU
                  </button>
                </form>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden md:col-span-2">
                <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-mono text-xs uppercase text-neutral-300 font-bold">
                  Central Bar Inventory Registry Matrix
                </div>
                <table className="w-full text-left text-xs text-neutral-400">
                  <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                    <tr>
                      <th className="p-3">SKU Identifier</th>
                      <th className="p-3">Unit Tag Price</th>
                      <th className="p-3">Stock Units Available</th>
                      <th className="p-3 text-right">Row Purge Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 font-mono">
                    {inventoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center italic text-neutral-600">Zero active stock records loaded from Supabase context framework.</td>
                      </tr>
                    ) : (
                      inventoryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-850/40">
                          <td className="p-3 text-neutral-200 font-sans font-bold">{item.name}</td>
                          <td className="p-3 text-amber-500 font-bold">${item.price.toLocaleString()} GYD</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold font-mono px-2 py-0.5 rounded ${item.quantity <= 3 ? "bg-red-950 text-red-400 border border-red-900" : "text-emerald-400"}`}>
                                {item.quantity} Units Left
                              </span>
                              <button onClick={() => handleUpdateStockQty(item.id, item.quantity + 5)} className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded text-[10px] font-bold hover:text-white hover:bg-neutral-700">
                                +5 Stock
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleDeleteInventoryItem(item.id)} className="text-neutral-600 hover:text-red-400 p-1 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW E: MATRIX POINT OF SALE */}
        {currentTab === "gym_pos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Products Array Selector Frame */}
            <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-mono text-xs uppercase text-neutral-300 font-black tracking-wider">
                Select Inventory Rows to Basket Add
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventoryItems.map(product => (
                  <button 
                    key={product.id} 
                    onClick={() => addToCart(product)}
                    disabled={product.quantity <= 0}
                    className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg text-left hover:border-red-600 group transition-all disabled:opacity-40 disabled:hover:border-neutral-800"
                  >
                    <div className="text-xs font-bold text-neutral-200 group-hover:text-red-500 transition-all truncate">{product.name}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-amber-500 font-mono font-bold">${product.price.toLocaleString()} GYD</span>
                      <span className="text-[10px] font-mono text-neutral-500">Qty: {product.quantity}</span>
                    </div>
                  </button>
                ))}
                {inventoryItems.length === 0 && (
                  <div className="col-span-2 text-center py-6 italic text-neutral-600 font-mono text-xs">No warehouse inventories instantiated to list inside register.</div>
                )}
              </div>
            </div>

            {/* Shopping Checkout Basket Panel */}
            <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-mono text-xs uppercase text-neutral-300 font-black tracking-wider flex items-center justify-between">
                  <span>Active Ring Checkout Basket</span>
                  <span className="bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded text-[10px] text-red-400 font-mono">{posCart.length} lines</span>
                </div>

                <div className="divide-y divide-neutral-850 p-4 space-y-2">
                  {posCart.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-1.5 text-xs font-mono">
                      <div>
                        <div className="font-sans font-bold text-neutral-200 text-xs">{item.name}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">${item.price.toLocaleString()} x {item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-200 font-bold">${(item.price * item.quantity).toLocaleString()} GYD</span>
                        <button onClick={() => setPosCart(prev => prev.filter(i => i.id !== item.id))} className="text-neutral-600 hover:text-red-400 text-xs font-sans">✕</button>
                      </div>
                    </div>
                  ))}

                  {posCart.length === 0 && (
                    <div className="text-center py-8 italic text-neutral-600 font-mono text-xs">Basket queue is clear. Inject product blocks from left array layout.</div>
                  )}
                </div>
              </div>

              {posCart.length > 0 && (
                <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-4">
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Customer Identification Tag</label>
                      <input 
                        type="text" 
                        value={posCustomerName}
                        onChange={e => setPosCustomerName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-850 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-red-600" 
                        placeholder="Walk-In Gym Client"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Payment Channel Logic</label>
                      <select 
                        value={posPaymentMethod}
                        onChange={e => setPosPaymentMethod(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-850 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-red-600"
                      >
                        <option value="Cash Tender">Cash Tender</option>
                        <option value="MMG Electronic Pay">MMG Electronic Pay</option>
                        <option value="POS Terminal Card Ring">POS Terminal Card Ring</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-850 flex justify-between items-center">
                    <span className="text-xs uppercase text-neutral-400 font-mono font-bold">Total Aggregated Ring:</span>
                    <span className="text-xl font-black font-mono text-red-500">${calculateCartTotal().toLocaleString()} GYD</span>
                  </div>

                  <button onClick={handleProcessCheckout} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-xs uppercase tracking-wider text-white py-3 rounded transition-all shadow-md">
                    Process Transaction Ring & Finalize
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW F: TRAINER ROSTER */}
        {currentTab === "gym_trainers" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              
              {/* Form panel */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4 md:col-span-1">
                <h3 className="text-sm font-black text-white uppercase font-mono tracking-wider">
                  {editingTrainer ? "Modify Coach Metrics Row" : "Enroll Coaching Staff Profile"}
                </h3>
                <form onSubmit={handleAddOrUpdateTrainer} className="space-y-3 text-xs">
                  <div>
                    <label className="text-neutral-400 font-mono uppercase block mb-1">Full Legal Name</label>
                    <input 
                      type="text" required 
                      value={editingTrainer ? editingTrainer.name : trainerForm.name}
                      onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, name: e.target.value}) : setTrainerForm({...trainerForm, name: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 font-mono uppercase block mb-1">Coaching Specialty Vector</label>
                    <input 
                      type="text" required 
                      value={editingTrainer ? editingTrainer.specialty : trainerForm.specialty}
                      onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, specialty: e.target.value}) : setTrainerForm({...trainerForm, specialty: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 font-mono uppercase block mb-1">Professional Tier Ranking</label>
                    <select 
                      value={editingTrainer ? editingTrainer.tier : trainerForm.tier}
                      onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, tier: e.target.value}) : setTrainerForm({...trainerForm, tier: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono text-xs"
                    >
                      <option value="Elite Tier 1">Elite Tier 1</option>
                      <option value="Senior Level Master Coach">Senior Level Master Coach</option>
                      <option value="Pro Level Trainer">Pro Level Trainer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-neutral-400 font-mono uppercase block mb-1">Home Station Base Assignment</label>
                    <select 
                      value={editingTrainer ? editingTrainer.assigned_branch : trainerForm.assigned_branch}
                      onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, assigned_branch: e.target.value}) : setTrainerForm({...trainerForm, assigned_branch: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 font-mono text-xs"
                    >
                      <option value="Sheriff Street">Sheriff Street</option>
                      <option value="Main Street">Main Street</option>
                      <option value="Tower Node">Tower Node</option>
                      <option value="Mahaica Branch">Mahaica Branch</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs uppercase transition-all">
                      {editingTrainer ? "Apply Overwrites" : "Commit Roster Registry"}
                    </button>
                    {editingTrainer && (
                      <button type="button" onClick={() => setEditingTrainer(null)} className="px-2 bg-neutral-800 text-neutral-400 rounded text-xs hover:text-white">
                        ✕
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Display list panel */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden md:col-span-2">
                <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-mono text-xs uppercase text-neutral-300 font-bold">
                  Active Coaching Roster Configuration
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTrainers.map(t => (
                    <div key={t.id} className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg relative group border-l-2 border-l-neutral-700">
                      <div className="text-xs font-sans font-bold text-neutral-200">{t.name}</div>
                      <div className="text-[10px] font-mono text-red-400 mt-1 uppercase tracking-tight">{t.tier}</div>
                      <div className="text-xs font-sans text-neutral-400 mt-2 italic">Specialty: {t.specialty}</div>
                      <div className="text-[10px] font-mono text-neutral-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-neutral-600" /> Bound Station: {t.assigned_branch}
                      </div>
                      
                      <button onClick={() => setEditingTrainer(t)} className="absolute top-2 right-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {filteredTrainers.length === 0 && (
                    <div className="col-span-2 text-center py-6 italic text-neutral-600 font-mono text-xs">No coaches matched to current context branch node filter layout.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW G: FLEET WORK ORDERS DISPATCH */}
        {currentTab === "trucking_fleet" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl border-l-4 border-l-amber-500">
              <h2 className="text-xl font-black text-white uppercase font-mono tracking-tight">Lyft Freight & Trucking Fleet Node</h2>
              <p className="text-xs text-neutral-400 mt-1">Centralized dispatch panel logging cross-border logistics pipelines and commercial haul operations syncs.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Dispatch Form Box */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
                <div className="text-xs font-black font-mono text-white uppercase tracking-wider">Instantiate Dispatch Registry Row</div>
                <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-neutral-400 uppercase block mb-1">Vehicle License Plate Number</label>
                    <input 
                      type="text" required placeholder="e.g. GAB 9283"
                      value={newPlate} onChange={e => setNewPlate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-amber-500" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 uppercase block mb-1">Driver In Command Identity</label>
                    <input 
                      type="text" required placeholder="e.g. Seon Scarborough"
                      value={newDriver} onChange={e => setNewDriver(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-amber-500" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 uppercase block mb-1">Target Route Destination</label>
                    <input 
                      type="text" required placeholder="e.g. Lethem Border Node Depot"
                      value={newDest} onChange={e => setNewDest(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-amber-500" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 uppercase block mb-1">Consolidated Freight Cargo Classification</label>
                    <select 
                      value={newCargo} onChange={e => setNewCargo(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="Gym Equipment Iron Mat">Gym Equipment Iron Mat</option>
                      <option value="Bulk Construction Aggregates">Bulk Construction Aggregates</option>
                      <option value="Imported Bar Supplements Container">Imported Bar Supplements Container</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-neutral-950 font-black py-2.5 rounded text-xs uppercase transition-all">
                    Publish Active Waybill Row
                  </button>
                </form>
              </div>

              {/* Active Orders List Tracking layout */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden lg:col-span-2">
                <table className="w-full text-left text-xs text-neutral-400">
                  <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                    <tr>
                      <th className="p-3">Vehicle / Driver</th>
                      <th className="p-3">Route Destination Point</th>
                      <th className="p-3">Freight Cargo</th>
                      <th className="p-3">Pipeline Status Track</th>
                      <th className="p-3 text-right">Gate Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 font-mono">
                    {workOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-neutral-850/40">
                        <td className="p-3">
                          <div className="font-bold text-neutral-200">{order.truck_plate}</div>
                          <div className="text-[10px] text-neutral-500 font-sans mt-0.5">{order.driver_name}</div>
                        </td>
                        <td className="p-3 text-neutral-300 font-sans">{order.destination}</td>
                        <td className="p-3 text-neutral-400 text-[11px]">{order.cargo_type}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${order.dispatch_status === 'Delivered' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : order.dispatch_status === 'In Transit' ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'bg-neutral-950 text-neutral-500 border border-neutral-800'}`}>
                            {order.dispatch_status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {order.dispatch_status === "Pending" && (
                            <button onClick={() => handleUpdateStatus(order.id!, "In Transit")} className="px-2 py-0.5 bg-neutral-800 hover:bg-amber-900/40 border border-neutral-700 text-[10px] rounded text-amber-400 font-bold">
                              Dispatch Route
                            </button>
                          )}
                          {order.dispatch_status === "In Transit" && (
                            <button onClick={() => handleUpdateStatus(order.id!, "Delivered")} className="px-2 py-0.5 bg-neutral-800 hover:bg-emerald-900/40 border border-neutral-700 text-[10px] rounded text-emerald-400 font-bold">
                              Log Handover Delivery
                            </button>
                          )}
                          {order.dispatch_status === "Delivered" && (
                            <span className="text-neutral-600 italic text-[10px]">Closed Log Entry</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {workOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center italic text-neutral-600 font-sans">Zero freight work orders tracked inside active database schema rows.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW H: LOGISTICS & SPREADSHEET PAYROLL */}
        {currentTab === "trucking_payroll" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-emerald-600">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight font-mono">Centralized Excel Ledger Payroll Compiler</h2>
                <p className="text-xs text-neutral-400 mt-1">Parses raw sheet cells targeting the standard format sheet array naming channel: <span className="text-red-400 font-mono font-bold">"April Payroll-Final"</span></p>
              </div>

              <div className="relative overflow-hidden inline-block shrink-0">
                <input 
                  type="file" accept=".xlsx, .xls" 
                  onChange={handleExcelIngestion}
                  className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer"
                />
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded border border-emerald-500 shadow transition-all flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Load Stream Ledger Asset
                </button>
              </div>
            </div>

            {/* Matrix Sheet Rows Display Table Grid */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                  <tr>
                    <th className="p-3">Staff Identity Name</th>
                    <th className="p-3">Role Position / Depot Base</th>
                    <th className="p-3">F1 Salary Segment</th>
                    <th className="p-3">F2 Salary Segment</th>
                    <th className="p-3">Gross Total</th>
                    <th className="p-3">Statutory Deductions (NIS/PAYE)</th>
                    <th className="p-3">Net Payment Takeout</th>
                    <th className="p-3 text-right">Slips Matrix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {payrollRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-neutral-850/40 text-[11px]">
                      <td className="p-3 font-sans font-bold text-neutral-200">{record.employee_name}</td>
                      <td className="p-3">
                        <div className="text-neutral-300 font-sans">{record.position}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">Location Base: {record.location}</div>
                      </td>
                      <td className="p-3 text-neutral-400">
                        Hrs: {record.f1_normal_hours}N / {record.f1_ot_hours}OT
                        <div className="text-[10px] text-neutral-500 font-medium mt-0.5">${record.f1_gross.toLocaleString()} GYD</div>
                      </td>
                      <td className="p-3 text-neutral-400">
                        Hrs: {record.f2_normal_hours}N / {record.f2_ot_hours}OT
                        <div className="text-[10px] text-neutral-500 font-medium mt-0.5">${record.f2_gross.toLocaleString()} GYD</div>
                      </td>
                      <td className="p-3 text-neutral-300 font-bold">${record.gross_salary.toLocaleString()}</td>
                      <td className="p-3 text-red-400/80">
                        NIS: -${record.nis_contribution.toLocaleString()}
                        <div className="text-[10px] text-red-500 mt-0.5">PAYE: -${record.paye_deduction.toLocaleString()}</div>
                      </td>
                      <td className="p-3 text-emerald-400 font-black text-xs">${record.net_pay.toLocaleString()} GYD</td>
                      <td className="p-3 text-right">
                        <button onClick={() => setSelectedPayslip(record)} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] rounded hover:border-emerald-600 text-neutral-300 hover:text-white font-bold transition-all">
                          View Slip Panel
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payrollRecords.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center italic text-neutral-600 font-sans">Zero payroll line maps loaded from parsed sheet schema layout grid. Trigger document ingestion handle framework.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW I: ACCESS SECURITY NODES */}
        {currentTab === "admin_settings" && isMasterAdmin && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Form segment */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
                <div className="text-sm font-black font-mono text-white uppercase tracking-wider">Instantiate Terminal Credentials Asset</div>
                <form onSubmit={handleCreateSystemUser} className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-neutral-400 uppercase block mb-1">Operator Legal Account Name</label>
                    <input 
                      type="text" required placeholder="e.g. Christine Gonsalves"
                      value={sysUserForm.name} onChange={e => setSysUserForm({...sysUserForm, name: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-neutral-400 uppercase block mb-1">Username Identifier</label>
                      <input 
                        type="text" required placeholder="christine_g"
                        value={sysUserForm.username} onChange={e => setSysUserForm({...sysUserForm, username: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600" 
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 uppercase block mb-1">System Crypt Passcode</label>
                      <input 
                        type="password" required placeholder="••••••••"
                        value={sysUserForm.password} onChange={e => setSysUserForm({...sysUserForm, password: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-neutral-400 uppercase block mb-1">Role Classification</label>
                      <select 
                        value={sysUserForm.role} onChange={e => setSysUserForm({...sysUserForm, role: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 text-xs"
                      >
                        <option value="Staff">Staff</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-neutral-400 uppercase block mb-1">Operational Division Context</label>
                      <select 
                        value={sysUserForm.department} onChange={e => setSysUserForm({...sysUserForm, department: e.target.value as any})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 text-xs"
                      >
                        <option value="gym_operations">Gym Operations Division</option>
                        <option value="lyft_trucking">Lyft Trucking Logistics</option>
                        <option value="master_admin">Master Central Admin Control</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-neutral-400 uppercase block mb-1">Default Base Station Node Locking</label>
                    <select 
                      value={sysUserForm.assigned_branch} onChange={e => setSysUserForm({...sysUserForm, assigned_branch: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-red-600 text-xs"
                    >
                      <option value="Sheriff Street">Sheriff Street</option>
                      <option value="Main Street">Main Street</option>
                      <option value="Tower Node">Tower Node</option>
                      <option value="Mahaica Branch">Mahaica Branch</option>
                    </select>
                  </div>

                  <div className="p-3 bg-neutral-950 rounded border border-neutral-850 flex items-center gap-2">
                    <input 
                      type="checkbox" id="access_all_locations"
                      checked={sysUserForm.access_all_locations}
                      onChange={e => setSysUserForm({...sysUserForm, access_all_locations: e.target.checked})}
                      className="accent-red-600 w-4 h-4 shrink-0"
                    />
                    <label htmlFor="access_all_locations" className="text-[10px] uppercase text-neutral-300 font-bold tracking-wide">Grant Global Location Override Permissions</label>
                  </div>

                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded text-xs uppercase transition-all shadow">
                    Generate Authenticated Profile Node Row
                  </button>
                </form>
              </div>

              {/* Security Users table view layout list */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-mono text-xs uppercase text-neutral-300 font-bold">
                  Active Verified Operator Matrix Context
                </div>
                <table className="w-full text-left text-xs text-neutral-400">
                  <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                    <tr>
                      <th className="p-3">Operator User</th>
                      <th className="p-3">Role Designation</th>
                      <th className="p-3">Division Node Scope</th>
                      <th className="p-3">Global Overrides</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 font-mono text-[11px]">
                    {systemUsersList.map((u, index) => (
                      <tr key={index} className="hover:bg-neutral-850/40">
                        <td className="p-3 font-sans font-bold text-neutral-200">
                          {u.name}
                          <div className="text-[10px] font-mono font-normal text-neutral-500 mt-0.5">UID ID: @{u.username}</div>
                        </td>
                        <td className="p-3 text-neutral-300">{u.role}</td>
                        <td className="p-3 text-red-400 uppercase text-[10px] tracking-tight">{u.department.replace("_", " ")}</td>
                        <td className="p-3 text-neutral-400">{u.access_all_locations ? "🟢 Unrestricted Global Access" : `🔒 Locked Base: ${u.assigned_branch}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL LIGHTBOX DIALOG WINDOW LAYOUT FOR GENERATING INDIVIDUAL DISPATCH SLIPS */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-xl bg-white text-neutral-900 rounded-xl overflow-hidden shadow-2xl p-6 relative font-mono space-y-6 text-xs border border-neutral-300">
            <button onClick={() => setSelectedPayslip(null)} className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-900 transition-all font-sans text-base">
              ✕
            </button>
            
            <div className="text-center pb-4 border-b border-dashed border-neutral-300 space-y-1">
              <div className="text-sm font-black uppercase tracking-wider">Lyft Trucking Logistics Matrix</div>
              <div className="text-[10px] text-neutral-500">Commercial Freight Waybill Remuneration Statement Node</div>
            </div>

            <div className="grid grid-cols-2 gap-y-2 border-b border-neutral-200 pb-4">
              <div><span className="text-neutral-500">Employee Name:</span> <span className="font-bold font-sans">{selectedPayslip.employee_name}</span></div>
              <div><span className="text-neutral-500">Position Role:</span> {selectedPayslip.position}</div>
              <div><span className="text-neutral-500">Location Base Context:</span> {selectedPayslip.location}</div>
              <div><span className="text-neutral-500">Payment Frequency:</span> {selectedPayslip.payment_frequency}</div>
              <div><span className="text-neutral-500">Target Cycle Date:</span> {selectedPayslip.payroll_cycle_date}</div>
              <div><span className="text-neutral-500">Bank Wire Target:</span> {selectedPayslip.bank_name} ({selectedPayslip.account_number})</div>
            </div>

            <div className="space-y-2 border-b border-neutral-200 pb-4">
              <div className="flex justify-between items-center font-bold text-[10px] text-neutral-500 uppercase">
                <span>Remuneration Component Sector</span>
                <span>Calculated Volume Aggregation (GYD)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Fortnight 1 Structural Basic + Overtime Gross Matrix:</span>
                <span className="font-bold">${selectedPayslip.f1_gross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Fortnight 2 Structural Basic + Overtime Gross Matrix:</span>
                <span className="font-bold">${selectedPayslip.f2_gross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-neutral-200 font-bold text-neutral-900">
                <span>Gross Accumulation Balance:</span>
                <span>${selectedPayslip.gross_salary.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1 text-red-600 border-b border-neutral-200 pb-4">
              <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase">
                <span>Statutory Deduction Track</span>
                <span>Amount Dropped</span>
              </div>
              <div className="flex justify-between items-center">
                <span>National Insurance Scheme (NIS Contribution):</span>
                <span>-${selectedPayslip.nis_contribution.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Pay As You Earn (PAYE Deduction):</span>
                <span>-${selectedPayslip.paye_deduction.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-black text-emerald-700 bg-emerald-50 p-3 rounded border border-emerald-200">
              <span className="uppercase tracking-wide">Net Remuneration Takeout Wire Pay:</span>
              <span className="text-base">${selectedPayslip.net_pay.toLocaleString()} GYD</span>
            </div>

            <div className="flex justify-between gap-4 pt-4 text-[9px] text-neutral-400 font-sans leading-relaxed">
              <p>Generated dynamically by spreadsheet injection layer on connection node matrix framework pipelines. Confidential statement output track.</p>
              <button onClick={() => window.print()} className="bg-neutral-900 text-white font-mono uppercase text-[10px] px-3 py-1.5 rounded shrink-0 font-bold border border-neutral-800 hover:bg-neutral-800 transition-all">
                Print Ledger Matrix Slips
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
