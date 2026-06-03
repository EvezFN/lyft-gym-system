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
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono uppercase">Full Identity Name</label>
                  <input type="text" value={memberForm.full_name} onChange={e => setMemberForm({...memberForm, full_name: e.target.value, assigned_branch: activeBranchContext})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" placeholder="John Doe" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono uppercase">Phone Contact Handle</label>
                  <input type="text" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" placeholder="+592-600-0000" required />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono uppercase">Email Communication Address</label>
                  <input type="email" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" placeholder="johndoe@gmail.com" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono uppercase">Home Residence Street Address</label>
                  <input type="text" value={memberForm.address} onChange={e => setMemberForm({...memberForm, address: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" placeholder="Lot 123 Public Road, Georgetown" required />
                </div>
              </div>

              {/* RESTORED LIVE MEDIA WEBCAM FRAME MODULE */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-lg space-y-3">
                <label className="text-xs text-neutral-400 font-mono uppercase block">Profile Security Photo Asset Integration</label>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-32 h-32 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center overflow-hidden relative">
                    {memberForm.photo_url ? (
                      <img src={memberForm.photo_url} alt="Profile Asset" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-neutral-700" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    {!isWebcamActive ? (
                      <button type="button" onClick={startWebcamStream} className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold px-3 py-2 rounded flex items-center justify-center gap-1.5 transition-all">
                        <Camera className="w-4 h-4 text-red-500" /> Activate Device Webcam
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="border border-neutral-800 rounded overflow-hidden bg-black w-full max-w-[240px]">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-auto scale-x-[-1]" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={captureWebcamSnapshot} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-all">
                            Capture Profile Frame
                          </button>
                          <button type="button" onClick={stopWebcamStream} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs px-2 py-1.5 rounded transition-all">
                            Kill Stream
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="text-[10px] text-neutral-500 font-mono">Or supply direct URL asset reference location link below:</div>
                    <input type="text" value={memberForm.photo_url} onChange={e => setMemberForm({...memberForm, photo_url: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded text-xs text-white font-mono focus:outline-none focus:border-red-600" placeholder="https://images.com/manual-link.jpg" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono uppercase">What Is Your Goal In The Gym?</label>
                  <select value={memberForm.fitness_goal} onChange={e => setMemberForm({...memberForm, fitness_goal: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white text-xs focus:outline-none focus:border-red-600">
                    <option>Weight Loss / Toning</option>
                    <option>Hypertrophy / Muscle Mass</option>
                    <option>Powerlifting Strength Core Focus</option>
                    <option>Cardiovascular Endurance / HIIT</option>
                    <option>General Fitness Maintenance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono uppercase">Plan Matrix Tier</label>
                  <select value={memberForm.membership_type} onChange={e => setMemberForm({...memberForm, membership_type: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white text-xs focus:outline-none focus:border-red-600">
                    <option>Full Access VIP</option>
                    <option>Fortnightly Regular</option>
                    <option>Monthly Corporate Plan</option>
                    <option>Basic Open Gym</option>
                  </select>
                </div>
              </div>

              {/* RESTORED TRAINING ASSIGNMENT STEP ROUTERS */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="needTrainerCheckbox" checked={memberForm.needs_trainer} onChange={e => setMemberForm({...memberForm, needs_trainer: e.target.checked, assigned_trainer_id: e.target.checked ? trainers[0]?.id || "" : ""})} className="accent-red-600 w-4 " />
                  <label htmlFor="needTrainerCheckbox" className="text-xs font-mono uppercase tracking-wide text-neutral-300 cursor-pointer select-none">
                    Do you need an active personal fitness trainer assigned to this profile?
                  </label>
                </div>

                {memberForm.needs_trainer && (
                  <div className="space-y-1 animate-fadeIn pt-1">
                    <label className="text-[11px] text-red-400 font-mono uppercase tracking-wider block">Select Active Coach Asset</label>
                    <select value={memberForm.assigned_trainer_id} onChange={e => setMemberForm({...assigned_trainer_id, assigned_trainer_id: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded text-xs text-white focus:outline-none focus:border-red-600">
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} — {t.tier} ({t.assigned_branch})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-3 rounded transition-all tracking-wider uppercase text-xs shadow-lg shadow-red-900/10">
                Commit Complete Profile Ingestion
              </button>
            </form>
          </div>
        )}

        {/* NEW SYSTEM VIEW: SUPABASE BACKED INVENTORY MANAGEMENT CONTROLLER */}
        {currentTab === "inventory_ledger" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-5 bg-neutral-850 border-b border-neutral-800 font-bold text-xs uppercase tracking-wide text-white">
                Inject Product Stock Row
              </div>
              <form onSubmit={handleAddInventory} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Product Stock Display Name</label>
                  <input type="text" value={inventoryForm.name} onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" placeholder="e.g. Mass Gainer Shake (Vanilla)" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono uppercase">Unit Price (GYD)</label>
                    <input type="number" value={inventoryForm.price || ""} onChange={e => setInventoryForm({...inventoryForm, price: parseInt(e.target.value) || 0})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 font-mono" placeholder="1500" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono uppercase">Starting Quantity</label>
                    <input type="number" value={inventoryForm.quantity || ""} onChange={e => setInventoryForm({...inventoryForm, quantity: parseInt(e.target.value) || 0})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 font-mono" placeholder="25" required />
                  </div>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-2.5 rounded text-center transition-all uppercase tracking-wider text-[11px]">
                  Commit Stock SKU
                </button>
              </form>
            </div>

            <div className="xl:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-bold text-xs uppercase tracking-wider text-white flex justify-between items-center">
                <span>Warehouse Bar Ledger Matrix</span>
                <button onClick={fetchInventoryData} className="text-neutral-400 hover:text-white inline-flex items-center gap-1 text-[10px] font-mono">
                  <RefreshCw className="w-3 h-3" /> Sync Supabase
                </button>
              </div>
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                  <tr>
                    <th className="p-3">Product Name Structure</th>
                    <th className="p-3">Unit Valuation</th>
                    <th className="p-3 text-center">In-Stock Volume</th>
                    <th className="p-3 text-right">Ledger Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {inventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center italic text-neutral-600 font-sans">No product rows returned from the Supabase inventory ledger.</td>
                    </tr>
                  ) : (
                    inventoryItems.map(item => (
                      <tr key={item.id} className="hover:bg-neutral-850/40">
                        <td className="p-3 text-neutral-200 font-bold font-sans">{item.name}</td>
                        <td className="p-3 text-red-500 font-bold">${item.price.toLocaleString()} GYD</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleUpdateStockQty(item.id, item.quantity - 1)} className="bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 hover:text-white">-</button>
                            <span className={`w-8 text-center font-bold ${item.quantity === 0 ? 'text-red-500 animate-pulse' : 'text-neutral-300'}`}>{item.quantity}</span>
                            <button onClick={() => handleUpdateStockQty(item.id, item.quantity + 1)} className="bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 hover:text-white">+</button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteInventoryItem(item.id)} className="bg-neutral-950 hover:bg-red-950 text-red-400 border border-neutral-800 hover:border-red-900 p-1 rounded transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW D: POINT OF SALE MODULE (POOLS LIVE DATA FROM SUPABASE) */}
        {currentTab === "gym_pos" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="xl:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Tag className="w-5 h-5 text-red-500" />
                  Matrix Inventory Bar Counter
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Select real stock rows pooled from Supabase to compile parameters onto checkout.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventoryItems.map((prod) => (
                  <div key={prod.id} className="bg-neutral-950 border border-neutral-800 p-4 rounded-lg flex justify-between items-center hover:border-neutral-700 transition-all">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-200">{prod.name}</h4>
                      <div className="text-xs text-red-500 font-mono font-bold mt-1">${prod.price.toLocaleString()} GYD</div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Avail: {prod.quantity} units</div>
                    </div>
                    <button onClick={() => addToCart(prod)} disabled={prod.quantity <= 0} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-all ${prod.quantity > 0 ? 'bg-neutral-900 hover:bg-red-600 border border-neutral-800 hover:border-red-600 text-neutral-300 hover:text-white' : 'bg-neutral-950 text-neutral-700 border border-neutral-900 cursor-not-allowed'}`}>
                      {prod.quantity > 0 ? "+ Stage" : "Stock Out"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-bold text-xs uppercase text-white flex items-center justify-between">
                <span>Active Ledger Checkout</span>
                <span className="font-mono bg-neutral-950 px-2 py-0.5 rounded text-red-400">{posCart.length} Lines</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 font-mono uppercase">Client/Target Identifier Reference</label>
                  <input type="text" value={posCustomerName} onChange={e => setPosCustomerName(e.target.value)} placeholder="Walk-In Base Target" className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded text-xs text-white focus:outline-none focus:border-red-600" />
                </div>

                <div className="divide-y divide-neutral-800 border-t border-b border-neutral-800 py-2 max-h-48 overflow-y-auto font-mono text-xs">
                  {posCart.length === 0 ? (
                    <div className="text-center text-neutral-600 py-6 italic font-sans">Basket layout empty.</div>
                  ) : (
                    posCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-2">
                        <div className="max-w-[180px] truncate">
                          <span className="text-neutral-200 font-sans font-bold">{item.name}</span>
                          <div className="text-[10px] text-neutral-500">${item.price} x {item.quantity}</div>
                        </div>
                        <span className="text-neutral-300 font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-sm font-bold text-white bg-neutral-950 p-2.5 rounded border border-neutral-800">
                    <span>COUNTER DUE TOTAL:</span>
                    <span className="text-red-500">${calculateCartTotal().toLocaleString()} GYD</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-mono uppercase">Tender Gateway Route</label>
                    <select value={posPaymentMethod} onChange={e => setPosPaymentMethod(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded text-xs text-white focus:outline-none focus:border-red-600">
                      <option>Cash Tender</option>
                      <option>MMG Mobile Wallet Gateway</option>
                      <option>Bank Debit Card Terminal POS</option>
                    </select>
                  </div>

                  <button onClick={handleProcessCheckout} disabled={posCart.length === 0} className={`w-full p-2.5 rounded text-xs font-bold text-white text-center uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${posCart.length > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-850 text-neutral-600 border border-neutral-800 cursor-not-allowed'}`}>
                    <CreditCard className="w-3.5 h-3.5" /> Finalize Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW E: TRAINER ROSTER MANAGER WITH EXTENDED EDIT / ASSIGN ARCHITECTURE */}
        {currentTab === "gym_trainers" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-5 bg-neutral-850 border-b border-neutral-800 font-bold text-xs uppercase tracking-wide text-white flex justify-between items-center">
                <span>{editingTrainer ? "Modify Coach Metrics" : "Inject Trainer Asset"}</span>
                {editingTrainer && (
                  <button onClick={() => setEditingTrainer(null)} className="text-neutral-400 hover:text-white text-[10px] bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded">Cancel</button>
                )}
              </div>
              <form onSubmit={handleAddOrUpdateTrainer} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Trainer Full Name</label>
                  <input type="text" value={editingTrainer ? editingTrainer.name : trainerForm.name} onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, name: e.target.value}) : setTrainerForm({...trainerForm, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 font-sans" placeholder="e.g. Ravin Mahabal" required />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Specialty Framework Parameters</label>
                  <input type="text" value={editingTrainer ? editingTrainer.specialty : trainerForm.specialty} onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, specialty: e.target.value}) : setTrainerForm({...trainerForm, specialty: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 font-sans" placeholder="e.g. HIIT Strength / Bodybuilding" required />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Assigned Location Node Access</label>
                  <select value={editingTrainer ? editingTrainer.assigned_branch : trainerForm.assigned_branch} onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, assigned_branch: e.target.value}) : setTrainerForm({...trainerForm, assigned_branch: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600">
                    <option>Sheriff Street</option>
                    <option>Main Street</option>
                    <option>Tower Node</option>
                    <option>Mahaica Branch</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Roster Tier Placement Ranking</label>
                  <select value={editingTrainer ? editingTrainer.tier : trainerForm.tier} onChange={e => editingTrainer ? setEditingTrainer({...editingTrainer, tier: e.target.value}) : setTrainerForm({...trainerForm, tier: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600">
                    <option>Elite Tier 1</option>
                    <option>Senior Coach Tier 2</option>
                    <option>Junior Associate Matrix</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-2.5 rounded transition-all uppercase text-[11px] tracking-wider">
                  {editingTrainer ? "Apply Parameter Matrix" : "Save Trainer Profile"}
                </button>
              </form>
            </div>

            <div className="xl:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-neutral-850 font-bold text-xs uppercase tracking-wider text-white border-b border-neutral-800">
                Authorized System Coaching Grid ({activeBranchContext})
              </div>
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 text-neutral-500 font-mono uppercase">
                  <tr>
                    <th className="p-3">Coach Blueprint</th>
                    <th className="p-3">Specialty Parameters</th>
                    <th className="p-3">Location Node</th>
                    <th className="p-3 text-red-500">Tier Profile</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {filteredTrainers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center italic text-neutral-600 font-sans">No staff alignments cataloged under {activeBranchContext} network parameters.</td>
                    </tr>
                  ) : (
                    filteredTrainers.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-850/40">
                        <td className="p-3 font-sans font-bold text-neutral-200">{t.name}</td>
                        <td className="p-3 font-sans text-neutral-300">{t.specialty}</td>
                        <td className="p-3 font-sans text-neutral-400">{t.assigned_branch}</td>
                        <td className="p-3 text-red-500 font-bold">{t.tier}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => setEditingTrainer(t)} className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-2 py-1 rounded text-[10px] inline-flex items-center gap-1 transition-all">
                            <Edit3 className="w-3 h-3" /> Edit / Assign
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW F: DISPATCH MANAGEMENT CHANNEL */}
        {currentTab === "trucking_fleet" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
              <h2 className="text-lg font-bold text-white mb-4 uppercase">Commit Fleet Logistics Dispatch Order</h2>
              <form onSubmit={handleCreateWorkOrder} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <input type="text" placeholder="License Plate ID" value={newPlate} onChange={e => setNewPlate(e.target.value)} className="bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 font-mono text-xs" required />
                <input type="text" placeholder="Driver Full Identity Name" value={newDriver} onChange={e => setNewDriver(e.target.value)} className="bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 text-xs" required />
                <input type="text" placeholder="Destination Hub Terminal" value={newDest} onChange={e => setNewDest(e.target.value)} className="bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 text-xs" required />
                <button type="submit" className="bg-red-600 hover:bg-red-700 font-bold p-2.5 rounded text-white transition-all text-xs uppercase tracking-wider">Commit Route</button>
              </form>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-neutral-850 font-bold text-sm text-white border-b border-neutral-800">Active Trucking Logistics Framework</div>
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 font-mono text-neutral-500 uppercase">
                  <tr>
                    <th className="p-3">Plate ID</th>
                    <th className="p-3">Cargo Driver</th>
                    <th className="p-3">Destination Node</th>
                    <th className="p-3">State Framework Status</th>
                    <th className="p-3 text-right">Route Action Overrides</th>
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
                          <button onClick={() => handleUpdateStatus(order.id!, "Delivered")} className="bg-neutral-800 hover:bg-emerald-600 text-white px-2 py-1 rounded text-[10px] transition-all">Confirm Arrival</button>
                        )}
                        {order.dispatch_status === "Delivered" && <span className="text-neutral-600 text-[10px] italic">Cycle Finalized</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW G: LOGISTICS PAYROLL LEGER SYSTEM */}
        {currentTab === "trucking_payroll" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-900 p-6 rounded-xl border border-neutral-800 border-l-4 border-l-red-600">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Matrix Payroll Processing Hub</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Automate roles, hour variables, and map spreadsheet file arrays onto active fields.</p>
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
                    <th className="p-3">Gross Breakdown (F1 / F2)</th>
                    <th className="p-3">Deductions Track</th>
                    <th className="p-3 text-red-500">Net Return Payable</th>
                    <th className="p-3 text-center">Interactive Statement</th>
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
                        <button onClick={() => setSelectedPayslip(rec)} className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white border border-neutral-700 px-3 py-1.5 rounded text-xs transition-all">
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

        {/* VIEW H: SECURITY OVER overrides ACCESS CONTROL WITH STRICT LOCATION ASSIGNMENTS */}
        {currentTab === "admin_settings" && isMasterAdmin && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-5 bg-neutral-850 border-b border-neutral-800 font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Register Terminal Operator
              </div>
              <form onSubmit={handleCreateSystemUser} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Full Identity Name</label>
                  <input type="text" value={sysUserForm.name} onChange={e => setSysUserForm({...sysUserForm, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" placeholder="e.g. Supervisor Ryan" required />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Terminal Username ID</label>
                  <input type="text" value={sysUserForm.username} onChange={e => setSysUserForm({...sysUserForm, username: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 font-mono" placeholder="username_id" required />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Security Key Password</label>
                  <input type="password" value={sysUserForm.password} onChange={e => setSysUserForm({...sysUserForm, password: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600 font-mono" placeholder="••••••••" required />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Authorization Level Tag</label>
                  <input type="text" value={sysUserForm.role} onChange={e => setSysUserForm({...sysUserForm, role: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600" placeholder="Branch Manager" required />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Operational Target Framework</label>
                  <select value={sysUserForm.department} onChange={e => setSysUserForm({...sysUserForm, department: e.target.value as any})} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600">
                    <option value="gym_operations">Gym Facility Operations Only</option>
                    <option value="lyft_trucking">Lyft Trucking Logistics Channels</option>
                    <option value="master_admin">Master Global Admin Grid Visibility</option>
                  </select>
                </div>

                {/* RESTORED PER LOCATION AUTHORIZATION NODE SELECTION */}
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono uppercase">Assigned Access Node Location Boundary</label>
                  <select value={sysUserForm.assigned_branch} onChange={e => setSysUserForm({...sysUserForm, assigned_branch: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-2.5 rounded text-white focus:outline-none focus:border-red-600">
                    <option value="Sheriff Street">Sheriff Street Base</option>
                    <option value="Main Street">Main Street Hub</option>
                    <option value="Tower Node">Tower Node Terminal</option>
                    <option value="Mahaica Branch">Mahaica Branch Outpost</option>
                  </select>
                  <p className="text-[10px] text-neutral-500 italic mt-0.5">Staff parameters lock strictly onto this branch frame row unless override token is checked below.</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="all_locs_check" checked={sysUserForm.access_all_locations} onChange={e => setSysUserForm({...sysUserForm, access_all_locations: e.target.checked})} className="accent-red-600" />
                  <label htmlFor="all_locs_check" className="text-neutral-300 font-mono text-[11px] cursor-pointer select-none">
                    Grant Multi-Location Override (Switch Tabs Mode)
                  </label>
                </div>

                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-2.5 rounded transition-all uppercase tracking-wider text-[11px] mt-1">
                  Commit Matrix Access Credential
                </button>
              </form>
            </div>

            <div className="xl:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-neutral-850 border-b border-neutral-800 font-bold text-xs uppercase tracking-wider text-white">
                Authorized Operator Network Grid
              </div>
              <table className="w-full text-left text-xs text-neutral-400">
                <thead className="bg-neutral-950 text-neutral-500 font-mono uppercase">
                  <tr>
                    <th className="p-3">Operator</th>
                    <th className="p-3">Index Descriptor</th>
                    <th className="p-3">Domain Vector</th>
                    <th className="p-3 text-right">Strict Branch Parameter Boundary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {systemUsersList.map((u, idx) => (
                    <tr key={idx} className="hover:bg-neutral-850/40">
                      <td className="p-3 font-sans font-bold text-neutral-200">{u.name}</td>
                      <td className="p-3 text-neutral-400">@{u.username} <span className="text-neutral-600">({u.role})</span></td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${u.department === 'master_admin' ? 'bg-red-950 text-red-400 border border-red-900' : u.department === 'lyft_trucking' ? 'bg-blue-950 text-blue-400 border border-blue-900' : 'bg-neutral-850 text-neutral-300'}`}>
                          {u.department}
                        </span>
                      </td>
                      <td className="p-3 text-right text-neutral-400 font-sans">
                        {u.access_all_locations ? (
                          <span className="text-red-500 font-bold font-mono text-[10px] bg-red-950/40 px-2 py-0.5 rounded border border-red-900">GLOBAL ALL OVERRIDE</span>
                        ) : (
                          <span>{u.assigned_branch} Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* AUTOMATIC FORTNIGHTLY STATEMENT MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-neutral-900 w-full max-w-xl rounded-xl p-8 shadow-2xl relative border-t-8 border-red-600">
            <button onClick={() => setSelectedPayslip(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center border-b pb-4 mb-5">
              <h3 className="text-xl font-black uppercase tracking-wider text-neutral-900">Lyft Trucking Services Ltd.</h3>
              <p className="text-xs text-neutral-500 font-bold font-mono uppercase tracking-wider">Statement of Fortnightly Earning Parameters</p>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-neutral-100 p-4 rounded-lg mb-5 text-xs">
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Employee Target Name</span> <strong className="text-sm text-neutral-800">{selectedPayslip.employee_name}</strong></div>
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Assigned Designation</span> <strong className="text-sm text-neutral-800">{selectedPayslip.position}</strong></div>
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Operational Workspace</span> <span className="font-semibold text-neutral-700">{selectedPayslip.location} Node</span></div>
              <div><span className="text-neutral-400 font-bold uppercase block text-[9px]">Disbursement Target</span> <span className="font-semibold text-neutral-700">{selectedPayslip.bank_name} ({selectedPayslip.account_number})</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs mb-5 font-mono">
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                <span className="font-bold text-neutral-700 block mb-1 border-b pb-0.5 font-sans">First Fortnightly Half</span>
                <div>Hours Matrix: <span className="font-bold text-neutral-900">{selectedPayslip.f1_normal_hours}h</span></div>
                <div className="mt-1.5 pt-1 border-t text-neutral-800 font-bold">Gross: ${selectedPayslip.f1_gross.toLocaleString()}</div>
              </div>
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                <span className="font-bold text-neutral-700 block mb-1 border-b pb-0.5 font-sans">Second Fortnightly Half</span>
                <div>Hours Matrix: <span className="font-bold text-neutral-900">{selectedPayslip.f2_normal_hours}h</span></div>
                <div className="mt-1.5 pt-1 border-t text-neutral-800 font-bold">Gross: ${selectedPayslip.f2_gross.toLocaleString()}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs font-mono mb-4 border-t pt-3">
              <div className="flex justify-between"><span>Consolidated Gross Base:</span> <span className="font-bold">${selectedPayslip.gross_salary.toLocaleString()} GYD</span></div>
              <div className="flex justify-between text-red-600"><span>National Insurance (NIS):</span> <span>-${selectedPayslip.nis_contribution.toLocaleString()}</span></div>
              <div className="flex justify-between text-red-600"><span>PAYE Income Tax:</span> <span>-${selectedPayslip.paye_deduction.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-neutral-300 pt-2.5 text-sm font-black text-red-600 bg-red-50 p-2.5 rounded mt-2 font-sans">
                <span>NET ACCOUNT PAYABLE DISBURSEMENT:</span>
                <span>${selectedPayslip.net_pay.toLocaleString()} GYD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY ACCESS TERMINAL SHIELD BACK DROP DOORWAY */}
      {!currentUser && (
        <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center z-50">
          <form onSubmit={handleSystemLogin} className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 space-y-4 w-80 shadow-2xl relative border-t-4 border-red-600">
            <div className="text-center pb-2">
              <h2 className="text-white font-black tracking-wider uppercase text-md">Lyft Gym Matrix</h2>
              <p className="text-[10px] text-neutral-500 font-mono tracking-widest mt-0.5">Terminal Authorization Required</p>
            </div>
            {authError && <div className="bg-red-950/50 border border-red-800 text-red-400 p-2 rounded text-xs text-center font-semibold font-mono">{authError}</div>}
            <div className="space-y-2">
              <input type="text" placeholder="Operator Identity Handle" value={authUsername} onChange={e => setAuthUsername(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white rounded focus:outline-none focus:border-red-600 font-mono" required />
              <input type="password" placeholder="Terminal Password Code" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white rounded focus:outline-none focus:border-red-600 font-mono" required />
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white p-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-900/10">Authorize Terminal</button>
          </form>
        </div>
      )}
    </div>
  );
}
