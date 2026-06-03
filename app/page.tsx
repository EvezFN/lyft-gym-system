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
            {/* Form asset container can be rendered or closed cleanly from this matrix subview */}
          </div>
        )}
      </main>
    </div>
  );
}
