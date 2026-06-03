'use client';

import { useState, useEffect } from 'react';
// Keeps your native path shortcuts fully intact
import { supabase } from '@/app/utils/supabase';
import * as XLSX from 'xlsx';

// ==========================================
// DATA TYPING MODELS
// ==========================================
interface Member {
  id: string;
  name: string;
  membership_type: 'Regular' | 'VIP';
  card_number: string;
  phone_number: string;
  expiry_date: string;
  branch_location: string;
  email: string;
  address: string;
  goal: string;
  assigned_trainer: string;
  photo?: string; 
}

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  stock_count: number;
  unit_price: number;
  branch_location: string;
}

interface Trainer {
  id: string;
  name: string;
  specialty: string;
  phone_number: string;
  branch_location: string;
}

interface AdminUser {
  id: string;
  username: string;
  name?: string;
  role?: string;
  department: 'gym_operations' | 'lyft_trucking';
  access_all_locations: boolean;
  allowed_branches: string[];
  branch_permissions: Record<string, 'view_only' | 'view_edit'>;
}

interface FleetWorkOrder {
  id: string;
  truck_plate: string;
  driver_name: string;
  destination: string;
  cargo_type: string;
  dispatch_status: 'Pending' | 'In Transit' | 'Delivered';
  created_at: string;
}

interface PayrollRecord {
  id: string;
  employee_name: string;
  gross_salary: number;
  nis_contribution: number;
  paye_deduction: number;
  net_pay: number;
  payment_frequency: string;
  payroll_cycle_date: string;
}

export default function LyftNetworkMasterControl() {
  // Navigation & Session Access Authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  
  // Dynamic Tab Switchboard
  const [activeTab, setActiveTab] = useState<'members' | 'register' | 'pos' | 'inventory' | 'trainers' | 'trucking_fleet' | 'trucking_payroll' | 'admin_mgmt'>('members');
  
  // Comprehensive Regional Branch Pool Configuration Index
  const allBranches = ['Sheriff Street', 'Main Street', 'Tower', 'Skeldon', 'Diamond', 'Canje', 'Mahaica', 'Vreed en Hoop'];
  const [selectedBranch, setSelectedBranch] = useState('Sheriff Street');

  // Core Gym State Buckets
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [systemAdmins, setSystemAdmins] = useState<AdminUser[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Core Trucking State Buckets
  const [workOrders, setWorkOrders] = useState<FleetWorkOrder[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);

  // New Fleet Work Order Form States
  const [newPlate, setNewPlate] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newCargo, setNewCargo] = useState('');

  // Expanded Gym Registration Form States
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Regular' | 'VIP'>('Regular');
  const [newCard, setNewCard] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newAssignedTrainer, setNewAssignedTrainer] = useState('');
  
  // Mandatory Photo Capture States
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Trainer Registration Form States
  const [trainerName, setTrainerName] = useState('');
  const [trainerSpecialty, setTrainerSpecialty] = useState('Personal Training');
  const [trainerPhone, setTrainerPhone] = useState('');

  // POS Module States
  const [posCart, setPosCart] = useState<{ item: InventoryItem; quantity: number }[]>([]);
  const [cashReceived, setCashReceived] = useState<string>('');

  // Inventory Registration Form States
  const [invName, setInvName] = useState('');
  const [invCategory, setInvCategory] = useState('Supplements');
  const [invStock, setInvStock] = useState<number>(50);
  const [invPrice, setInvPrice] = useState<number>(1500); 

  // New Admin User Configuration States
  const [admName, setAdmName] = useState('');
  const [admUsername, setAdmUsername] = useState('');
  const [admPassword, setAdmPassword] = useState('');
  const [admDept, setAdmDept] = useState<'gym_operations' | 'lyft_trucking'>('gym_operations');
  const [admAccessAll, setAdmAccessAll] = useState(false);
  const [admBranches, setAdmBranches] = useState<string[]>([]);
  const [admPerms, setAdmPerms] = useState<Record<string, 'view_only' | 'view_edit'>>({});

  // Digital Calculator Component States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<string | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);

  // Image Preview Modal State
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  // Dynamic Operational Permissions Evaluations
  const canEditCurrentBranch = currentUser?.access_all_locations || 
    (currentUser?.branch_permissions?.[selectedBranch] === 'view_edit');

  const allowedBranchesToSelect = currentUser?.access_all_locations 
    ? allBranches 
    : (currentUser?.allowed_branches || []);

  // Handle Authentication with System Division Loading
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', username.toLowerCase().trim())
        .single();

      if (error || !data || data.password !== password) {
        setLoginError('Invalid verification matrix login credentials.');
        return;
      }

      const userPayload: AdminUser = {
        id: data.id,
        username: data.username,
        name: data.name || data.username,
        role: data.role || 'admin',
        department: data.department || 'gym_operations',
        access_all_locations: data.access_all_locations ?? (data.username === 'admin'),
        allowed_branches: data.allowed_branches || ['Sheriff Street'],
        branch_permissions: data.branch_permissions || { 'Sheriff Street': 'view_edit' }
      };

      setCurrentUser(userPayload);
      setIsLoggedIn(true);
      
      // Auto-route workspace viewports based on internal division map
      if (userPayload.department === 'lyft_trucking') {
        setActiveTab('trucking_fleet');
      } else {
        setActiveTab('members');
      }

      if (userPayload.access_all_locations) {
        setSelectedBranch('Sheriff Street');
      } else if (userPayload.allowed_branches.length > 0) {
        setSelectedBranch(userPayload.allowed_branches[0]);
      }
    } catch (err) {
      setLoginError('Terminal pipeline handshake timeout.');
    }
  };

  // Synchronized Data Fetching
  const refreshCoreDatabaseData = async () => {
    if (!selectedBranch) return;

    // Gym Operational Logs
    const { data: memData } = await supabase.from('members').select('*').eq('branch_location', selectedBranch);
    if (memData) setMembers(memData);

    const { data: invData } = await supabase.from('inventory').select('*').eq('branch_location', selectedBranch);
    if (invData) setInventory(invData);

    const { data: trainData } = await supabase.from('trainers').select('*').eq('branch_location', selectedBranch);
    if (trainData && trainData.length > 0) {
      setTrainers(trainData);
    } else {
      setTrainers([
        { id: 't1', name: 'Ravin Mahabal', specialty: 'Elite Strength Specialist', phone_number: '592-600-1122', branch_location: selectedBranch },
        { id: 't2', name: 'Brian Addamas', specialty: 'Bodybuilding & Nutrition Coach', phone_number: '592-611-3344', branch_location: selectedBranch }
      ]);
    }

    // Trucking Logistics Logs
    const { data: fleetData } = await supabase.from('fleet_work_orders').select('*').order('created_at', { ascending: false });
    if (fleetData) setWorkOrders(fleetData);

    const { data: payRecords } = await supabase.from('payroll_records').select('*').order('payroll_cycle_date', { ascending: false });
    if (payRecords) setPayrollRecords(payRecords);

    // Global User Directories
    if (currentUser?.access_all_locations) {
      const { data: admData } = await supabase.from('system_users').select('id, username, name, role, department, access_all_locations, allowed_branches, branch_permissions');
      if (admData) setSystemAdmins(admData);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshCoreDatabaseData();
    }
  }, [selectedBranch, isLoggedIn]);

  // Handle branch checkboxes for creating new admins
  const toggleAdmBranch = (branch: string) => {
    if (admBranches.includes(branch)) {
      setAdmBranches(admBranches.filter(b => b !== branch));
      const updatedPerms = { ...admPerms };
      delete updatedPerms[branch];
      setAdmPerms(updatedPerms);
    } else {
      setAdmBranches([...admBranches, branch]);
      setAdmPerms({ ...admPerms, [branch]: 'view_only' });
    }
  };

  const setAdmBranchPermLevel = (branch: string, level: 'view_only' | 'view_edit') => {
    setAdmPerms({ ...admPerms, [branch]: level });
  };

  // Create Restricted / Universal Admin Account
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admUsername || !admPassword || !admName) return alert('Provide full registration particulars.');
    if (!admAccessAll && admBranches.length === 0) return alert('Assign regional permission mappings.');

    const { error } = await supabase.from('system_users').insert([{
      name: admName.trim(),
      username: admUsername.toLowerCase().trim(),
      password: admPassword,
      role: 'admin', 
      department: admDept,
      access_all_locations: admAccessAll,
      allowed_branches: admAccessAll ? allBranches : admBranches,
      branch_permissions: admAccessAll 
        ? allBranches.reduce((acc, b) => ({ ...acc, [b]: 'view_edit' }), {}) 
        : admPerms
    }]);

    if (error) {
      alert(`Error configuration deployment: ${error.message}`);
    } else {
      alert('🎉 Profile cataloged safely into database registries!');
      setAdmName(''); setAdmUsername(''); setAdmPassword('');
      setAdmAccessAll(false); setAdmBranches([]); setAdmPerms({});
      refreshCoreDatabaseData();
    }
  };

  // Multimedia Hardware Handlers
  const startCameraInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setVideoStream(stream);
      setTimeout(() => {
        const videoEl = document.getElementById('webcam-feed') as HTMLVideoElement;
        if (videoEl) videoEl.srcObject = stream;
      }, 100);
    } catch (err) {
      alert('Webcam feed denied. Default to manual upload channel below.');
    }
  };

  const captureCameraFrame = () => {
    const videoEl = document.getElementById('webcam-feed') as HTMLVideoElement;
    if (!videoEl || !videoStream) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoEl, 0, 0, 320, 240);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedPhoto(dataUrl);
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  // Gym Operations Handlers
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCurrentBranch) return alert('Permission lock: View-only access permissions verified.');
    if (!newName || !newCard) return alert('Validation failed: Name and Card values are mandatory.');
    if (!capturedPhoto) return alert('⚠️ PHOTO REGISTRATION MANDATORY:\n\nClient photo capture must be finalized before account registration can proceed.');
    
    const { error } = await supabase.from('members').insert([{
      name: newName, membership_type: newType, card_number: newCard,
      phone_number: newPhone, expiry_date: newExpiry, branch_location: selectedBranch,
      email: newEmail, address: newAddress, goal: newGoal, assigned_trainer: newAssignedTrainer,
      photo: capturedPhoto
    }]);
    
    if (error) {
      alert(`Database error: ${error.message}`);
    } else {
      alert('🎉 Client account established successfully!');
      setNewName(''); setNewCard(''); setNewPhone(''); setNewExpiry('');
      setNewEmail(''); setNewAddress(''); setNewGoal(''); setNewAssignedTrainer('');
      setCapturedPhoto(''); setActiveTab('members'); 
      refreshCoreDatabaseData();
    }
  };

  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCurrentBranch) return alert('Access constraint verified.');
    if (!trainerName) return alert('Trainer designation label missing.');

    const { error } = await supabase.from('trainers').insert([{
      name: trainerName, specialty: trainerSpecialty, phone_number: trainerPhone, branch_location: selectedBranch
    }]);

    if (!error) {
      alert('🎉 Training professional logged successfully.');
      setTrainerName(''); setTrainerPhone('');
      refreshCoreDatabaseData();
    }
  };

  const handleRegisterInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCurrentBranch) return alert('Access constraint verified.');
    if (!invName) return alert('Asset taxonomy criteria missing.');
    
    const { error } = await supabase.from('inventory').insert([{
      item_name: invName, category: invCategory, stock_count: Number(invStock),
      unit_price: Number(invPrice), branch_location: selectedBranch
    }]);
    
    if (!error) {
      alert('🎉 Asset added successfully!');
      setInvName(''); setInvStock(50); setInvPrice(1500);
      refreshCoreDatabaseData();
    }
  };

  // Inline Data Updates
  const updateMemberRow = async (id: string, updatedField: Partial<Member>) => {
    if (!canEditCurrentBranch) return alert('Access constraint verified.');
    const { error } = await supabase.from('members').update(updatedField).eq('id', id);
    if (!error) setMembers(members.map(m => m.id === id ? { ...m, ...updatedField } : m));
  };

  const updateInventoryRow = async (id: string, updatedField: Partial<InventoryItem>) => {
    if (!canEditCurrentBranch) return alert('Access constraint verified.');
    const { error } = await supabase.from('inventory').update(updatedField).eq('id', id);
    if (!error) setInventory(inventory.map(i => i.id === id ? { ...i, ...updatedField } : i));
  };

  // POS Module Calculations (All VAT/Tax parameters completely removed)
  const addToCart = (item: InventoryItem) => {
    if (!canEditCurrentBranch) return alert('Access constraint verified.');
    if (item.stock_count <= 0) return alert('Item out of stock!');
    const existing = posCart.find(c => c.item.id === item.id);
    if (existing) {
      if (existing.quantity >= item.stock_count) return alert('Exceeds current shelf quantity.');
      setPosCart(posCart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setPosCart([...posCart, { item, quantity: 1 }]);
    }
  };

  const calculateCartTotals = () => {
    const total = posCart.reduce((sum, c) => sum + (c.item.unit_price * c.quantity), 0);
    return { total };
  };

  const processSaleCheckout = async () => {
    if (!canEditCurrentBranch) return alert('Terminal transaction lock out enabled.');
    if (posCart.length === 0) return;
    for (const entry of posCart) {
      const updatedStock = entry.item.stock_count - entry.quantity;
      await supabase.from('inventory').update({ stock_count: updatedStock }).eq('id', entry.item.id);
    }
    alert('Transaction completed. Ledger balances updated.');
    setPosCart([]); setCashReceived('');
    refreshCoreDatabaseData();
  };

  // Trucking Division Handlers
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newDriver || !newDest) return alert('Complete manifest metrics field values.');

    const { error } = await supabase.from('fleet_work_orders').insert([{
      truck_plate: newPlate.toUpperCase().trim(),
      driver_name: newDriver.trim(),
      destination: newDest,
      cargo_type: newCargo || 'General Freight',
      dispatch_status: 'Pending'
    }]);

    if (error) {
      alert(`Freight entry failure: ${error.message}`);
    } else {
      alert('🚚 Manifest entries uploaded to active transport routes.');
      setNewPlate(''); setNewDriver(''); setNewDest(''); setNewCargo('');
      refreshCoreDatabaseData();
    }
  };

  const updateOrderStatus = async (id: string, nextStatus: 'Pending' | 'In Transit' | 'Delivered') => {
    const { error } = await supabase.from('fleet_work_orders').update({ dispatch_status: nextStatus }).eq('id', id);
    if (!error) {
      setWorkOrders(workOrders.map(o => o.id === id ? { ...o, dispatch_status: nextStatus } : o));
    }
  };

  // Local Client-Side Excel Workbook Processor
  const handleSpreadsheetIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return alert('Target audit file load path invalid.');
    setExcelLoading(true);

    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
      
      const targetSheetName = 'April Payroll-Final';
      const targetSheet = workbook.Sheets[targetSheetName];
      if (!targetSheet) throw new Error(`Spreadsheet sheet layout context match failure: "${targetSheetName}" missing.`);

      const rawMatrix = XLSX.utils.sheet_to_json(targetSheet, { header: 1 }) as any[][];
      const dataRecordsLines = rawMatrix.slice(3); // Skips index layout table definitions
      const itemsToUpload = [];

      for (const row of dataRecordsLines) {
        const name = row[0];
        if (!name || name.trim() === '' || name.toLowerCase().includes('total')) continue;

        const gross = parseFloat(row[30]) || 0;
        const nis = parseFloat(row[32]) || 0;
        const paye = parseFloat(row[34]) || 0;
        const net = parseFloat(row[35]) || 0;

        // Skip records with empty contribution matches
        if (nis === 0 && paye === 0) continue;

        itemsToUpload.push({
          employee_name: name.trim(),
          gross_salary: gross,
          nis_contribution: nis,
          paye_deduction: paye,
          net_pay: net,
          payment_frequency: 'Paid Fortnightly',
          payroll_cycle_date: '2026-04-30'
        });
      }

      const { error: insertErr } = await supabase.from('payroll_records').insert(itemsToUpload);
      if (insertErr) throw insertErr;

      alert(`🎉 System verified and parsed ${itemsToUpload.length} payroll entries successfully.`);
      setExcelFile(null);
      refreshCoreDatabaseData();
    } catch (err: any) {
      alert(`Ingestion error: ${err.message}`);
    } finally {
      setExcelLoading(false);
    }
  };

  // Workspace Calculator Controls
  const handleCalcInput = (val: string) => {
    if (!isNaN(Number(val)) || val === '.') {
      setCalcDisplay(calcDisplay === '0' || (calcOp && calcDisplay === calcMemory) ? val : calcDisplay + val);
    } else if (val === 'C') {
      setCalcDisplay('0'); setCalcMemory(null); setCalcOp(null);
    } else if (val === '=') {
      if (!calcOp || !calcMemory) return;
      const res = eval(`${calcMemory} ${calcOp} ${calcDisplay}`);
      setCalcDisplay(String(res)); setCalcMemory(null); setCalcOp(null);
    } else {
      setCalcMemory(calcDisplay); setCalcOp(val);
    }
  };

  // Local View Filters
  const filteredMembers = members.filter(m => {
    const s = memberSearch.toLowerCase();
    return (m.name || '').toLowerCase().includes(s) || (m.card_number || '').toLowerCase().includes(s) || (m.phone_number || '').toLowerCase().includes(s);
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-1 mb-6 text-center">
            <span className="text-red-600 font-black text-3xl tracking-tighter">LYFT NETWORK</span>
            <span className="text-zinc-400 font-light text-sm tracking-wide">ENTERPRISE MANAGEMENT SYSTEM</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">System User Identity</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-red-600 text-sm" placeholder="Username" required />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">Secure Handshake Token</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-red-600 text-sm" placeholder="••••••••" required />
            </div>
            {loginError && <p className="text-red-500 text-xs font-medium bg-red-950/30 border border-red-900/50 p-3 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg tracking-wide uppercase text-sm mt-2">Initialize Hub Node</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative">
      
      {/* Lightbox Modal Window View */}
      {previewPhotoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={() => setPreviewPhotoModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl max-w-sm w-full relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-700 font-black rounded-full w-8 h-8 text-xs text-white" onClick={() => setPreviewPhotoModal(null)}>✕</button>
            <img src={previewPhotoModal} alt="Biometric Capture Thumbnail" className="w-full h-auto aspect-square object-cover rounded-xl bg-zinc-950 border border-zinc-800" />
          </div>
        </div>
      )}

      {/* Corporate Dashboard Header Block */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-black text-2xl tracking-tighter">LYFT</span>
              <span className="text-zinc-100 font-medium text-xl tracking-wide">MATRIX</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider">Operator Profile: {currentUser?.name} ({currentUser?.department === 'lyft_trucking' ? 'Logistics Division' : 'Fitness Operations'})</span>
          </div>
          <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${canEditCurrentBranch ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : 'bg-amber-950/40 border-amber-800/60 text-amber-500'}`}>
            {canEditCurrentBranch ? '⚡ READ-WRITE' : '⚠️ VIEW-ONLY'}
          </div>
        </div>
        
        {/* Network Location Routing Handle */}
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Location Segment:</label>
          <select 
            value={selectedBranch} 
            onChange={(e) => { setSelectedBranch(e.target.value); setMemberSearch(''); }} 
            className="bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 focus:border-red-600 font-medium text-sm focus:outline-none"
          >
            {allowedBranchesToSelect.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Navigation Sidebar Switchboard */}
        <nav className="w-full md:w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 space-y-1 shrink-0">
          
          {currentUser?.department === 'gym_operations' && (
            <>
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-3 pt-2 pb-1 font-mono">Gym Floor Control</div>
              <button onClick={() => setActiveTab('members')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${activeTab === 'members' ? 'bg-red-600 text-white shadow-lg font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>👥 Member Ledger</button>
              <button onClick={() => setActiveTab('register')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${activeTab === 'register' ? 'bg-red-600 text-white shadow-lg font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>📝 Register Member</button>
              <button onClick={() => setActiveTab('trainers')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${activeTab === 'trainers' ? 'bg-red-600 text-white shadow-lg font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>🏋️ Team Trainers</button>
              <button onClick={() => setActiveTab('pos')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${activeTab === 'pos' ? 'bg-red-600 text-white shadow-lg font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>🛒 Counter Checkout</button>
              <button onClick={() => setActiveTab('inventory')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${activeTab === 'inventory' ? 'bg-red-600 text-white shadow-lg font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>📦 Shelf Inventory</button>
            </>
          )}

          {currentUser?.department === 'lyft_trucking' && (
            <>
              <div className="text-[10px] uppercase font-bold text-amber-500 tracking-wider px-3 pt-4 pb-1 font-mono">Freight Logistics</div>
              <button onClick={() => setActiveTab('trucking_fleet')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${activeTab === 'trucking_fleet' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>🚚 Transport Fleet</button>
              <button onClick={() => setActiveTab('trucking_payroll')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${activeTab === 'trucking_payroll' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>💵 Payroll Processing</button>
            </>
          )}
          
          {currentUser?.access_all_locations && (
            <>
              <div className="text-[10px] uppercase font-bold text-red-500 tracking-wider px-3 pt-6 pb-1 font-mono">System Terminal Matrix</div>
              <button onClick={() => setActiveTab('admin_mgmt')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition border border-zinc-800 ${activeTab === 'admin_mgmt' ? 'bg-zinc-100 text-zinc-950 font-black' : 'text-zinc-400 hover:bg-zinc-800'}`}>🔐 User Access Rights</button>
            </>
          )}

          {/* Core Workspace Helper Tool Block */}
          <div className="pt-8">
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg space-y-2">
              <div className="bg-zinc-900 border border-zinc-800 text-right p-2 rounded text-sm font-mono truncate text-emerald-400">{calcDisplay}</div>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-bold font-mono">
                {['C', '/', '*', '-'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300">{b}</button>)}
                {['7', '8', '9', '+'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-100">{b}</button>)}
                {['4', '5', '6', '='].map(b => <button key={b} onClick={() => handleCalcInput(b)} className={`p-1.5 rounded ${b === '=' ? 'bg-red-600 text-white hover:bg-red-700 row-span-2 flex items-center justify-center' : 'bg-zinc-900 hover:bg-zinc-800'}`}>{b}</button>)}
                {['1', '2', '3'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-100">{b}</button>)}
                {['0', '.'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className={`p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-100 ${b === '0' ? 'col-span-2' : ''}`}>{b}</button>)}
              </div>
            </div>
          </div>
        </nav>

        {/* Dynamic Display Render Panels */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">

          {/* TAB 1: FITNESS ROSTER REGISTRIES */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-xl">
                <div>
                  <h1 className="text-xl font-bold">{selectedBranch} Active Ledger ({filteredMembers.length} Accounts)</h1>
                  <p className="text-xs text-zinc-400">Inline database updates save automatically on input frame loss.</p>
                </div>
                <div className="w-full sm:w-80">
                  <input type="text" placeholder="🔍 Search member name, card id..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-xs focus:border-red-600 placeholder-zinc-500 transition outline-none" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400">
                    <tr>
                      <th className="p-4 w-20 text-center">Biometric</th>
                      <th className="p-4">Client Name</th>
                      <th className="p-4 w-32">Tier Class</th>
                      <th className="p-4 w-36">Card Stripe ID</th>
                      <th className="p-4 w-36">Mobile Link</th>
                      <th className="p-4">Assigned Trainer</th>
                      <th className="p-4 w-36">Account Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-zinc-500 italic">No corresponding records mapped to active segment branch node.</td>
                      </tr>
                    ) : (
                      filteredMembers.map(m => (
                        <tr key={m.id} className="hover:bg-zinc-800/20">
                          <td className="p-2 text-center">
                            {m.photo ? (
                              <img src={m.photo} alt="" onClick={() => setPreviewPhotoModal(m.photo!)} className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-950 object-cover cursor-zoom-in mx-auto hover:border-red-500 transition" />
                            ) : (
                              <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-950/40 flex items-center justify-center text-[9px] text-zinc-600 mx-auto">None</div>
                            )}
                          </td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.name} onBlur={(e) => updateMemberRow(m.id, { name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none disabled:text-zinc-400" /></td>
                          <td className="p-2">
                            <select disabled={!canEditCurrentBranch} defaultValue={m.membership_type} onChange={(e) => updateMemberRow(m.id, { membership_type: e.target.value as 'Regular' | 'VIP' })} className="bg-transparent text-zinc-300 focus:outline-none font-bold disabled:text-zinc-500">
                              <option value="Regular" className="bg-zinc-900">Regular</option>
                              <option value="VIP" className="bg-zinc-900 text-yellow-500">VIP</option>
                            </select>
                          </td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.card_number} onBlur={(e) => updateMemberRow(m.id, { card_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none font-mono disabled:text-zinc-500" /></td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.phone_number} onBlur={(e) => updateMemberRow(m.id, { phone_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none disabled:text-zinc-400" /></td>
                          <td className="p-2">
                            <select disabled={!canEditCurrentBranch} defaultValue={m.assigned_trainer || ''} onChange={(e) => updateMemberRow(m.id, { assigned_trainer: e.target.value })} className="bg-transparent text-zinc-300 focus:outline-none w-full disabled:text-zinc-400">
                              <option value="">Unassigned</option>
                              {trainers.map(t => <option key={t.id} value={t.name} className="bg-zinc-900">{t.name}</option>)}
                            </select>
                          </td>
                          <td className="p-2"><input type="date" disabled={!canEditCurrentBranch} defaultValue={m.expiry_date} onChange={(e) => updateMemberRow(m.id, { expiry_date: e.target.value })} className="bg-transparent text-zinc-300 focus:outline-none disabled:text-zinc-500" /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MANDATORY BIOMETRIC REGISTRATION ENGINE */}
          {activeTab === 'register' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-bold">Client Matrix Entry Profile Registration</h1>
                <p className="text-xs text-zinc-400">Hardware verification check requires identity image mapping capture.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form Inputs Component */}
                <form onSubmit={handleRegisterMember} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Full Legal Name</label>
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:border-red-600 outline-none" placeholder="John Doe" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Membership Plan</label>
                      <select value={newType} onChange={(e) => setNewType(e.target.value as 'Regular' | 'VIP')} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:border-red-600 outline-none">
                        <option value="Regular">Regular Class Plan</option>
                        <option value="VIP">VIP Tier Matrix</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Card Terminal Value</label>
                      <input type="text" value={newCard} onChange={(e) => setNewCard(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono focus:border-red-600 outline-none" placeholder="LYFT-8890" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Mobile Interface Number</label>
                      <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:border-red-600 outline-none" placeholder="592-622-0000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Assigned Support Staff</label>
                      <select value={newAssignedTrainer} onChange={(e) => setNewAssignedTrainer(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:border-red-600 outline-none">
                        <option value="">No Instructor Assigned</option>
                        {trainers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Term End Date</label>
                      <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 focus:border-red-600 outline-none" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider transition">Deploy Registry Record</button>
                </form>

                {/* Biometric Media Ingestion Terminal */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-between space-y-4 text-center">
                  <div className="w-full">
                    <span className="block text-[11px] font-bold text-zinc-400 uppercase mb-2">Mandatory Identity Image Array</span>
                    
                    <div className="w-full aspect-video max-w-[280px] mx-auto bg-zinc-950 rounded-lg border border-zinc-800 relative flex items-center justify-center overflow-hidden">
                      {capturedPhoto ? (
                        <img src={capturedPhoto} alt="Captured preview" className="w-full h-full object-cover" />
                      ) : videoStream ? (
                        <video id="webcam-feed" autoPlay playsInline muted className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-zinc-600 text-xs italic p-4 font-mono">Camera Line Disconnected</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    {videoStream ? (
                      <button type="button" onClick={captureCameraFrame} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded text-xs uppercase tracking-wide">Capture Matrix Frame</button>
                    ) : (
                      <button type="button" onClick={startCameraInput} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded text-xs uppercase tracking-wide">Initialize Hardware Stream</button>
                    )}

                    <div className="relative flex py-1 items-center">
                      <div className="flex-1 border-t border-zinc-800"></div>
                      <span className="flex-shrink mx-4 text-[10px] text-zinc-600 uppercase font-bold font-mono">OR</span>
                      <div className="flex-1 border-t border-zinc-800"></div>
                    </div>

                    <div>
                      <input type="file" accept="image/*" id="photo-upload" className="hidden" onChange={handleManualPhotoUpload} />
                      <label htmlFor="photo-upload" className="block text-center w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 py-2 rounded text-xs cursor-pointer transition">Upload File Payload Instead</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAINER MANAGEMENT STRATIFICATION */}
          {activeTab === 'trainers' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-base font-bold uppercase tracking-wider text-red-500 mb-4">Add Certified Physical Specialist</h2>
                <form onSubmit={handleRegisterTrainer} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Instructor Name</label>
                    <input type="text" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-red-600" placeholder="Ravin Mahabal" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Mobile Interface</label>
                    <input type="text" value={trainerPhone} onChange={(e) => setTrainerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-red-600" placeholder="592-622-1111" />
                  </div>
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs uppercase tracking-wider">Deploy Instructor</button>
                </form>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-base font-bold uppercase tracking-wider text-zinc-300 mb-4">Active Staff Matrix Node</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trainers.map(t => (
                    <div key={t.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between space-y-2">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">{t.name}</h3>
                        <p className="text-xs text-red-400 font-mono">{t.specialty}</p>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-900 font-mono">
                        <span>Phone: {t.phone_number}</span>
                        <span>Branch: {t.branch_location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TAX-FREE POINT OF SALE SYSTEM */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Shelf Selection Viewport */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <h2 className="text-base font-bold tracking-tight">Segment Trading Goods Shelf ({selectedBranch})</h2>
                  <p className="text-xs text-zinc-400">Click item tile to drop into current checkout payload.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inventory.filter(i => i.stock_count > 0).map(item => (
                    <div key={item.id} onClick={() => addToCart(item)} className="bg-zinc-900 border border-zinc-800 hover:border-red-600 p-4 rounded-xl cursor-pointer transition flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-200">{item.item_name}</h3>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase">{item.category} • Count: {item.stock_count}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">${item.unit_price} GYD</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Ledger Slip (VAT parameters permanently scrubbed) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-fit space-y-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-red-500 border-b border-zinc-800 pb-3 mb-4">Checkout Cargo Payload</h2>
                  
                  {posCart.length === 0 ? (
                    <p className="text-zinc-500 text-xs italic py-8 text-center">Checkout bin empty.</p>
                  ) : (
                    <div className="space-y-3 divide-y divide-zinc-800/60 max-h-[220px] overflow-y-auto pr-1">
                      {posCart.map(c => (
                        <div key={c.item.id} className="flex justify-between items-center text-xs pt-2">
                          <div>
                            <p className="font-bold text-zinc-300">{c.item.item_name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">Qty: {c.quantity} × ${c.item.unit_price}</p>
                          </div>
                          <span className="font-mono text-zinc-300">${c.quantity * c.item.unit_price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-4">
                  <div className="flex justify-between text-sm font-bold border-b border-zinc-800/80 pb-3">
                    <span className="text-zinc-400">Net Transaction Total:</span>
                    <span className="text-emerald-400 font-mono text-base">${calculateCartTotals().total} GYD</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Cash Value Tendered</label>
                    <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none" placeholder="0" />
                  </div>

                  {Number(cashReceived) > 0 && (
                    <div className="flex justify-between text-xs font-mono text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800">
                      <span>Tender Change Output:</span>
                      <span className="text-white font-bold">${Number(cashReceived) - calculateCartTotals().total} GYD</span>
                    </div>
                  )}

                  <button onClick={processSaleCheckout} disabled={posCart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider transition">Finalize Ledger Receipt</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INVENTORY LOGISTICS ENGINE */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <h2 className="text-sm font-bold uppercase tracking-wider text-red-500 mb-4">Add Regional Trading Product Stock</h2>
                <form onSubmit={handleRegisterInventory} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Item Label Description</label>
                    <input type="text" value={invName} onChange={(e) => setInvName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-red-600" placeholder="Whey Isolate Protein 5lb" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Stock Count</label>
                    <input type="number" value={invStock} onChange={(e) => setInvStock(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-red-600" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Unit Price ($ GYD)</label>
                    <input type="number" value={invPrice} onChange={(e) => setInvPrice(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-red-600" />
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs uppercase tracking-wider">Log Asset</button>
                </form>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400">
                    <tr>
                      <th className="p-4">Asset Matrix Label</th>
                      <th className="p-4 w-44">Category Segment</th>
                      <th className="p-4 w-32">Unit Price</th>
                      <th className="p-4 w-36">In-Stock Count</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {inventory.map(i => (
                      <tr key={i.id} className="hover:bg-zinc-800/20">
                        <td className="p-4 font-bold text-zinc-200">{i.item_name}</td>
                        <td className="p-4 text-zinc-400">{i.category}</td>
                        <td className="p-4 font-mono text-emerald-400">${i.unit_price}</td>
                        <td className="p-4"><input type="number" disabled={!canEditCurrentBranch} defaultValue={i.stock_count} onBlur={(e) => updateInventoryRow(i.id, { stock_count: Number(e.target.value) })} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 w-20 text-center text-zinc-100 outline-none focus:border-red-600 disabled:bg-transparent disabled:border-transparent" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: TRUCKING FLEET MANAGEMENT SECTION */}
          {activeTab === 'trucking_fleet' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-4">Deploy New Fleet Manifest Route</h2>
                <form onSubmit={handleCreateWorkOrder} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Truck License Plate</label>
                    <input type="text" value={newPlate} onChange={(e) => setNewPlate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-amber-500 text-white font-mono" placeholder="GAB 4432" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Driver's Name</label>
                    <input type="text" value={newDriver} onChange={(e) => setNewDriver(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-amber-500" placeholder="Michael Anthony" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Regional Drop Node</label>
                    <select value={newDest} onChange={(e) => setNewDest(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-amber-500 text-white">
                      <option value="">Select Target Destination</option>
                      {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Cargo Specifications</label>
                    <input type="text" value={newCargo} onChange={(e) => setNewCargo(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-amber-500" placeholder="Supplements Cargo" />
                  </div>
                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded text-xs uppercase tracking-wider transition">Dispatch Manifest</button>
                </form>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400">
                    <tr>
                      <th className="p-4">License Plate</th>
                      <th className="p-4">Assigned Freight Driver</th>
                      <th className="p-4">Cargo Particulars</th>
                      <th className="p-4">Dropoff Terminal</th>
                      <th className="p-4 w-44">Transit Flow Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {workOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-zinc-500 italic">No transport vectors logged.</td>
                      </tr>
                    ) : (
                      workOrders.map(order => (
                        <tr key={order.id} className="hover:bg-zinc-800/20">
                          <td className="p-4 font-mono font-bold text-amber-400">{order.truck_plate}</td>
                          <td className="p-4 text-zinc-200">{order.driver_name}</td>
                          <td className="p-4 text-zinc-400">{order.cargo_type}</td>
                          <td className="p-4 font-medium text-zinc-300">{order.destination}</td>
                          <td className="p-4">
                            <select value={order.dispatch_status} onChange={(e) => updateOrderStatus(order.id, e.target.value as any)} className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-amber-500">
                              <option value="Pending">Pending Dispatch</option>
                              <option value="In Transit">In Transit</option>
                              <option value="Delivered">Delivered Node</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: LOCAL SPREADSHEET PARSING MODULE */}
          {activeTab === 'trucking_payroll' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl max-w-xl">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-2">Ingest Operations Spreadsheet</h2>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Target: "April Payroll-Final" sheet data parsing array context filter criteria matches.</p>
                
                <form onSubmit={handleSpreadsheetIngest} className="space-y-4">
                  <input type="file" accept=".xlsx, .xls" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs file:bg-zinc-800 file:border-0 file:text-white file:px-3 file:py-1 file:rounded file:text-xs file:mr-3 text-zinc-400" />
                  <button type="submit" disabled={excelLoading || !excelFile} className="bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-800 text-white font-bold py-2 px-4 rounded text-xs uppercase tracking-wider transition">
                    {excelLoading ? 'Processing Local Workbook Payload...' : 'Synchronize Sheet Ledger Data'}
                  </button>
                </form>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400">
                    <tr>
                      <th className="p-4">Logistics Personnel</th>
                      <th className="p-4">Gross Compensation</th>
                      <th className="p-4">NIS Deduct</th>
                      <th className="p-4">PAYE Deduct</th>
                      <th className="p-4">Net Payout</th>
                      <th className="p-4">Frequency</th>
                      <th className="p-4">Cycle Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800 font-mono">
                    {payrollRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-zinc-500 italic">No historical spreadsheets loaded into current session cache.</td>
                      </tr>
                    ) : (
                      payrollRecords.map(rec => (
                        <tr key={rec.id} className="hover:bg-zinc-800/20">
                          <td className="p-4 font-sans font-bold text-zinc-200">{rec.employee_name}</td>
                          <td className="p-4 text-zinc-400">${rec.gross_salary}</td>
                          <td className="p-4 text-red-400">-${rec.nis_contribution}</td>
                          <td className="p-4 text-red-400">-${rec.paye_deduction}</td>
                          <td className="p-4 text-emerald-400 font-bold">${rec.net_pay}</td>
                          <td className="p-4 text-zinc-500 font-sans">{rec.payment_frequency}</td>
                          <td className="p-4 text-zinc-400">{rec.payroll_cycle_date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: REGIONAL ACCESS ACCESS CONTROL MATRIX */}
          {activeTab === 'admin_mgmt' && currentUser?.access_all_locations && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <h2 className="text-base font-bold uppercase tracking-wider text-zinc-200 mb-4">Deploy Multi-Location Operator</h2>
                
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Full Identity Name</label>
                      <input type="text" value={admName} onChange={(e) => setAdmName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-zinc-500" placeholder="Admin Officer" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">System Identity Username</label>
                      <input type="text" value={admUsername} onChange={(e) => setAdmUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-zinc-500" placeholder="username" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Access Pass Key</label>
                      <input type="password" value={admPassword} onChange={(e) => setAdmPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none focus:border-zinc-500" placeholder="••••••••" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800/80 pt-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Corporate Segment Allocation</label>
                      <select value={admDept} onChange={(e) => setAdmDept(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs outline-none text-white">
                        <option value="gym_operations">Fitness Floor Control Node</option>
                        <option value="lyft_trucking">Logistics Freight Infrastructure</option>
                      </select>
                    </div>
                    <div className="flex items-center h-full pt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                        <input type="checkbox" checked={admAccessAll} onChange={(e) => setAdmAccessAll(e.target.checked)} className="rounded border-zinc-800 bg-zinc-950 accent-red-600" />
                        Grant Universal Cross-Regional Authorization Rights
                      </label>
                    </div>
                  </div>

                  {!admAccessAll && (
                    <div className="border-t border-zinc-800/80 pt-4 space-y-3">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase">Isolate Segment Branch Authorizations Matrix</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                        {allBranches.map(branch => {
                          const isChecked = admBranches.includes(branch);
                          return (
                            <div key={branch} className="flex items-center justify-between p-1 bg-zinc-900/30 rounded px-2">
                              <label className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleAdmBranch(branch)} className="rounded border-zinc-800 bg-zinc-950 accent-red-600" />
                                {branch}
                              </label>
                              
                              {isChecked && (
                                <select value={admPerms[branch] || 'view_only'} onChange={(e) => setAdmBranchPermLevel(branch, e.target.value as any)} className="bg-zinc-900 border border-zinc-700 text-[10px] rounded px-1.5 py-0.5 outline-none text-zinc-300">
                                  <option value="view_only">Read Matrix Only</option>
                                  <option value="view_edit">Full Read-Write</option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-2.5 rounded text-xs uppercase tracking-wider transition">Deploy Access Permission Set</button>
                </form>
              </div>

              {/* View Active Profile Configurations */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 bg-zinc-950 border-b border-zinc-800 font-bold text-xs uppercase tracking-wider text-zinc-400">Deployed Internal System Operators</div>
                <div className="divide-y divide-zinc-800">
                  {systemAdmins.map(admin => (
                    <div key={admin.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100">{admin.name}</span>
                          <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">@{admin.username}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Segment: <span className="text-zinc-400 font-mono">{admin.department}</span></p>
                      </div>
                      <div className="text-right text-[11px]">
                        {admin.access_all_locations ? (
                          <span className="text-emerald-400 font-bold font-mono">UNIVERSAL ACCESS</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                            {admin.allowed_branches?.map(b => (
                              <span key={b} className="bg-zinc-950 px-1.5 py-0.5 rounded text-[10px] border border-zinc-800 text-zinc-400">
                                {b} ({admin.branch_permissions?.[b] === 'view_edit' ? 'R/W' : 'R'})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
