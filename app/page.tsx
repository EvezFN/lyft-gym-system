'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';

// Data Typing Models
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
  photo?: string; // Stored as high-fidelity Base64 URI string
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
  access_all_locations: boolean;
  allowed_branches: string[];
  branch_permissions: Record<string, 'view_only' | 'view_edit'>;
}

export default function LyftGymSystemMaster() {
  // Navigation & Authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'register' | 'pos' | 'inventory' | 'trainers' | 'analytics' | 'admin_mgmt'>('members');
  
  // Guyana Branch System Configuration Selection Index
  const allBranches = ['Sheriff Street', 'Main Street', 'Tower', 'Skeldon', 'Diamond', 'Canje', 'Mahaica', 'Vreed en Hoop'];
  const [selectedBranch, setSelectedBranch] = useState('Sheriff Street');

  // Core Data Arrays
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [systemAdmins, setSystemAdmins] = useState<AdminUser[]>([]);

  // Real-Time Search Filter State
  const [memberSearch, setMemberSearch] = useState('');

  // Expanded Registration Form States
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

  // New Admin User Registration Configuration States
  const [admName, setAdmName] = useState('');
  const [admUsername, setAdmUsername] = useState('');
  const [admPassword, setAdmPassword] = useState('');
  const [admAccessAll, setAdmAccessAll] = useState(false);
  const [admBranches, setAdmBranches] = useState<string[]>([]);
  const [admPerms, setAdmPerms] = useState<Record<string, 'view_only' | 'view_edit'>>({});

  // Digital Calculator Component States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<string | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);

  // Enlarged Photo Viewer Modal State
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  // Compute Dynamic Operational Access matrix for current user on active branch
  const canEditCurrentBranch = currentUser?.access_all_locations || 
    (currentUser?.branch_permissions?.[selectedBranch] === 'view_edit');

  const allowedBranchesToSelect = currentUser?.access_all_locations 
    ? allBranches 
    : (currentUser?.allowed_branches || []);

  // Handle Login Authentication with Permission Matrix Loadouts
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
        setLoginError('Invalid application username or security access key.');
        return;
      }

      const userPayload: AdminUser = {
        id: data.id,
        username: data.username,
        name: data.name || data.username,
        role: data.role || 'admin',
        access_all_locations: data.access_all_locations ?? (data.username === 'admin' || data.role === 'admin'),
        allowed_branches: data.allowed_branches || ['Sheriff Street'],
        branch_permissions: data.branch_permissions || { 'Sheriff Street': 'view_edit' }
      };

      setCurrentUser(userPayload);
      
      if (userPayload.access_all_locations) {
        setSelectedBranch('Sheriff Street');
      } else if (userPayload.allowed_branches.length > 0) {
        setSelectedBranch(userPayload.allowed_branches[0]);
      }

      setIsLoggedIn(true);
    } catch (err) {
      setLoginError('Database authentication link failed.');
    }
  };

  // Synchronized Data Fetching
  const refreshCoreDatabaseData = async () => {
    if (!selectedBranch) return;

    // 1. Fetch Members
    const { data: memData } = await supabase.from('members').select('*').eq('branch_location', selectedBranch);
    if (memData) setMembers(memData);

    // 2. Fetch Inventory Items
    const { data: invData } = await supabase.from('inventory').select('*').eq('branch_location', selectedBranch);
    if (invData) setInventory(invData);

    // 3. Fetch Trainers
    const { data: trainData } = await supabase.from('trainers').select('*').eq('branch_location', selectedBranch);
    if (trainData && trainData.length > 0) {
      setTrainers(trainData);
    } else {
      setTrainers([
        { id: 't1', name: 'Ravin Mahabal', specialty: 'Elite Strength Specialist', phone_number: '592-600-1122', branch_location: selectedBranch },
        { id: 't2', name: 'Brian Addamas', specialty: 'Bodybuilding & Nutrition Coach', phone_number: '592-611-3344', branch_location: selectedBranch }
      ]);
    }

    // 4. If Super Admin, fetch all admin configurations
    if (currentUser?.access_all_locations) {
      const { data: admData } = await supabase.from('system_users').select('id, username, name, role, access_all_locations, allowed_branches, branch_permissions');
      if (admData) setSystemAdmins(admData);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshCoreDatabaseData();
    }
  }, [selectedBranch, isLoggedIn]);

  // Handle branch checklist changes for creating new admins
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
    if (!admUsername || !admPassword || !admName) return alert('Provide full name, username, and password');
    if (!admAccessAll && admBranches.length === 0) return alert('Select at least one allowed branch or choose Universal Access.');

    const { error } = await supabase.from('system_users').insert([{
      name: admName.trim(),
      username: admUsername.toLowerCase().trim(),
      password: admPassword,
      role: 'admin', 
      access_all_locations: admAccessAll,
      allowed_branches: admAccessAll ? allBranches : admBranches,
      branch_permissions: admAccessAll 
        ? allBranches.reduce((acc, b) => ({ ...acc, [b]: 'view_edit' }), {}) 
        : admPerms
    }]);

    if (error) {
      alert(`Error creating admin user: ${error.message}`);
    } else {
      alert('🎉 New Admin Profile safely registered into matrix system logs!');
      setAdmName('');
      setAdmUsername('');
      setAdmPassword('');
      setAdmAccessAll(false);
      setAdmBranches([]);
      setAdmPerms({});
      refreshCoreDatabaseData();
    }
  };

  // Multimedia Webcam Handlers
  const startCameraInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setVideoStream(stream);
      setTimeout(() => {
        const videoEl = document.getElementById('webcam-feed') as HTMLVideoElement;
        if (videoEl) videoEl.srcObject = stream;
      }, 100);
    } catch (err) {
      alert('Webcam stream failed/denied. Please use alternative manual file upload option below.');
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

  const handleManualPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Member Registration Handler with Photo Enforcement
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    if (!newName || !newCard) return alert('Data missing: Name and Card Number are required.');
    if (!capturedPhoto) return alert('⚠️ PHOTO REGISTRATION MANDATORY:\n\nClient photo capture must be finalized before account registration can proceed.');
    
    const { error } = await supabase.from('members').insert([{
      name: newName, 
      membership_type: newType, 
      card_number: newCard,
      phone_number: newPhone, 
      expiry_date: newExpiry, 
      branch_location: selectedBranch,
      email: newEmail,
      address: newAddress,
      goal: newGoal,
      assigned_trainer: newAssignedTrainer,
      photo: capturedPhoto
    }]);
    
    if (error) {
      alert(`⚠️ DATABASE CONFIGURATION NOTICE:\n\nMessage: ${error.message}`);
    } else {
      alert('🎉 Member account successfully established with profile identity matrix!');
      setNewName(''); setNewCard(''); setNewPhone(''); setNewExpiry('');
      setNewEmail(''); setNewAddress(''); setNewGoal(''); setNewAssignedTrainer('');
      setCapturedPhoto('');
      setActiveTab('members'); 
      refreshCoreDatabaseData();
    }
  };

  // Trainer Matrix Registrator
  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    if (!trainerName) return alert('Trainer name is required.');

    const { error } = await supabase.from('trainers').insert([{
      name: trainerName, specialty: trainerSpecialty, phone_number: trainerPhone, branch_location: selectedBranch
    }]);

    if (!error) {
      alert('🎉 New Trainer successfully added to cloud infrastructure!');
      setTrainerName(''); setTrainerPhone('');
      refreshCoreDatabaseData();
    }
  };

  // Inventory Asset Addition Handler
  const handleRegisterInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    if (!invName) return alert('Item name is required.');
    
    const { error } = await supabase.from('inventory').insert([{
      item_name: invName, category: invCategory, stock_count: Number(invStock),
      unit_price: Number(invPrice), branch_location: selectedBranch
    }]);
    
    if (!error) {
      alert('🎉 Asset successfully updated!');
      setInvName(''); setInvStock(50); setInvPrice(1500);
      refreshCoreDatabaseData();
    }
  };

  // Inline Row Synchronizations
  const updateMemberRow = async (id: string, updatedField: Partial<Member>) => {
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    const { error } = await supabase.from('members').update(updatedField).eq('id', id);
    if (!error) setMembers(members.map(m => m.id === id ? { ...m, ...updatedField } : m));
  };

  const updateInventoryRow = async (id: string, updatedField: Partial<InventoryItem>) => {
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    const { error } = await supabase.from('inventory').update(updatedField).eq('id', id);
    if (!error) setInventory(inventory.map(i => i.id === id ? { ...i, ...updatedField } : i));
  };

  const deleteInventoryItem = async (id: string, name: string) => {
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    if (!confirm(`Are you sure you want to completely delete "${name}" from inventory logs?`)) return;
    
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (!error) {
      alert('Asset deleted successfully.');
      setInventory(inventory.filter(i => i.id !== id));
      setPosCart(posCart.filter(c => c.item.id !== id));
    }
  };

  const updateTrainerRow = async (id: string, updatedField: Partial<Trainer>) => {
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    const { error } = await supabase.from('trainers').update(updatedField).eq('id', id);
    if (!error) setTrainers(trainers.map(t => t.id === id ? { ...t, ...updatedField } : t));
  };

  // POS Controls
  const addToCart = (item: InventoryItem) => {
    if (!canEditCurrentBranch) return alert('Access Denied: Your profile holds view-only authorization constraints.');
    if (item.stock_count <= 0) return alert('Item out of stock!');
    const existing = posCart.find(c => c.item.id === item.id);
    if (existing) {
      if (existing.quantity >= item.stock_count) return alert('Cannot exceed stock.');
      setPosCart(posCart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setPosCart([...posCart, { item, quantity: 1 }]);
    }
  };

  // FIXED: Removed tax/VAT generation properties
  const calculateCartTotals = () => {
    const total = posCart.reduce((sum, c) => sum + (c.item.unit_price * c.quantity), 0);
    return { total };
  };

  const processSaleCheckout = async () => {
    if (!canEditCurrentBranch) return alert('Access Denied: Checkout disabled in view-only configuration status.');
    if (posCart.length === 0) return;
    for (const entry of posCart) {
      const updatedStock = entry.item.stock_count - entry.quantity;
      await supabase.from('inventory').update({ stock_count: updatedStock }).eq('id', entry.item.id);
    }
    alert('Transaction finalized and stock updated.');
    setPosCart([]);
    setCashReceived('');
    refreshCoreDatabaseData();
  };

  // Calculator Engine
  const handleCalcInput = (val: string) => {
    if (!isNaN(Number(val)) || val === '.') {
      setCalcDisplay(calcDisplay === '0' || calcOp && calcDisplay === calcMemory ? val : calcDisplay + val);
    } else if (val === 'C') {
      setCalcDisplay('0'); setCalcMemory(null); setCalcOp(null);
    } else if (val === '=') {
      if (!calcOp || !calcMemory) return;
      const res = eval(`${calcMemory} ${calcOp} ${calcDisplay}`);
      setCalcDisplay(String(res)); setCalcMemory(null); setCalcOp(null);
    } else {
      setCalcMemory(calcDisplay);
      setCalcOp(val);
    }
  };

  // Filter client-side performance rows
  const filteredMembers = members.filter(m => {
    const searchLower = memberSearch.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(searchLower) ||
      (m.card_number || '').toLowerCase().includes(searchLower) ||
      (m.phone_number || '').toLowerCase().includes(searchLower) ||
      (m.assigned_trainer || '').toLowerCase().includes(searchLower)
    );
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <span className="text-red-600 font-black text-3xl tracking-tighter">LYFT</span>
            <span className="text-zinc-100 font-light text-2xl tracking-wide">GYM MATRIX</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-red-600 transition text-sm" placeholder="admin" required />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">Access Key</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-red-600 transition text-sm" placeholder="••••••••" required />
            </div>
            {loginError && <p className="text-red-500 text-xs font-medium bg-red-950/30 border border-red-900/50 p-3 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition tracking-wide uppercase text-sm mt-2">Authorize Terminal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative">
      
      {previewPhotoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={() => setPreviewPhotoModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl max-w-sm w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-700 font-black rounded-full w-8 h-8 text-xs text-white" onClick={() => setPreviewPhotoModal(null)}>✕</button>
            <img src={previewPhotoModal} alt="Member Face Profile" className="w-full h-auto aspect-square object-cover rounded-xl bg-zinc-950 border border-zinc-800" />
            <p className="text-center text-[11px] text-zinc-400 mt-2 italic font-mono tracking-wide">Identity Verified Security Thumbnail</p>
          </div>
        </div>
      )}

      {/* Top Header Ribbon */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-red-600 font-black text-2xl tracking-tighter">LYFT</span>
            <span className="text-zinc-400 font-light text-xl">NETWORK</span>
          </div>
          <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${canEditCurrentBranch ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : 'bg-amber-950/40 border-amber-800/60 text-amber-500'}`}>
            {canEditCurrentBranch ? '⚡ FULL EDITING GRANTED' : '⚠️ READ-ONLY CONSTRAINED'}
          </div>
        </div>
        
        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Active Branch Node:</label>
          <select 
            value={selectedBranch} 
            onChange={(e) => { setSelectedBranch(e.target.value); setMemberSearch(''); }} 
            className="bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 focus:border-red-600 font-medium text-sm focus:outline-none"
          >
            {allowedBranchesToSelect.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 space-y-1">
          <button onClick={() => setActiveTab('members')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'members' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>👥 Members Directory</button>
          <button onClick={() => setActiveTab('register')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'register' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>📝 Account Registration</button>
          <button onClick={() => setActiveTab('trainers')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'trainers' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>🏋️ Trainer Management</button>
          <button onClick={() => setActiveTab('pos')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'pos' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>🛒 Front-Desk POS</button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'inventory' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>📦 Inventory Logistics</button>
          <button onClick={() => setActiveTab('analytics')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'analytics' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>📈 Analytics Overview</button>
          
          {currentUser?.access_all_locations && (
            <button onClick={() => setActiveTab('admin_mgmt')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition border border-zinc-800 ${activeTab === 'admin_mgmt' ? 'bg-zinc-100 text-zinc-950 font-black' : 'text-red-400 hover:bg-zinc-800'}`}>🔐 Admin Management</button>
          )}

          {/* Workspace Calculator */}
          <div className="pt-6">
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg space-y-2">
              <div className="bg-zinc-900 border border-zinc-800 text-right p-2 rounded text-base font-mono truncate text-emerald-400">{calcDisplay}</div>
              <div className="grid grid-cols-4 gap-1 text-xs font-bold font-mono">
                {['C', '/', '*', '-'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300">{b}</button>)}
                {['7', '8', '9', '+'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-100">{b}</button>)}
                {['4', '5', '6', '='].map(b => <button key={b} onClick={() => handleCalcInput(b)} className={`p-2 rounded row-span-2 ${b === '=' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-900 hover:bg-zinc-800'}`}>{b}</button>)}
                {['1', '2', '3'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-100">{b}</button>)}
                {['0', '.'].map(b => <button key={b} onClick={() => handleCalcInput(b)} className={`p-2 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-100 ${b === '0' ? 'col-span-2' : ''}`}>{b}</button>)}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Workspace display */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">

          {/* TAB 1: MEMBERS DATABASE */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-xl">
                <div>
                  <h1 className="text-xl font-bold">{selectedBranch} Roster ({filteredMembers.length} records)</h1>
                  <p className="text-xs text-zinc-400">Search profiles or tap identity thumbnails to confirm biometrics.</p>
                </div>
                <div className="w-full sm:w-80">
                  <input 
                    type="text" 
                    placeholder="🔍 Search name, phone, card..." 
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-red-600 placeholder-zinc-500 transition font-medium"
                  />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-h-[650px] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1250px]">
                  <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                    <tr>
                      <th className="p-4 w-16 text-center">Photo</th>
                      <th className="p-4 w-44">Name</th>
                      <th className="p-4 w-28">Tier</th>
                      <th className="p-4 w-32">Card String</th>
                      <th className="p-4 w-36">Phone</th>
                      <th className="p-4 w-44">Email</th>
                      <th className="p-4 w-44">Address</th>
                      <th className="p-4 w-40">Gym Goal</th>
                      <th className="p-4 w-48">Assigned Trainer</th>
                      <th className="p-4 w-36">Expiration</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-zinc-500 italic">No corresponding logs found at this branch node.</td>
                      </tr>
                    ) : (
                      filteredMembers.map(m => (
                        <tr key={m.id} className="hover:bg-zinc-800/20">
                          <td className="p-2 text-center">
                            {m.photo ? (
                              <img 
                                src={m.photo} 
                                alt="" 
                                onClick={() => setPreviewPhotoModal(m.photo!)}
                                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-950 object-cover cursor-zoom-in mx-auto hover:border-red-500 transition"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-950/40 flex items-center justify-center text-[9px] text-zinc-600 font-mono mx-auto">None</div>
                            )}
                          </td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.name} onBlur={(e) => updateMemberRow(m.id, { name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none disabled:text-zinc-400" /></td>
                          <td className="p-2">
                            <select disabled={!canEditCurrentBranch} defaultValue={m.membership_type} onChange={(e) => updateMemberRow(m.id, { membership_type: e.target.value as 'Regular' | 'VIP' })} className="bg-transparent text-zinc-300 focus:outline-none font-bold disabled:text-zinc-500">
                              <option value="Regular" className="bg-zinc-900">Regular</option>
                              <option value="VIP" className="bg-zinc-900 text-yellow-500">VIP</option>
                            </select>
                          </td>
                          <td className="p-2 font-mono"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.card_number} onBlur={(e) => updateMemberRow(m.id, { card_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none font-mono disabled:text-zinc-500" /></td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.phone_number} onBlur={(e) => updateMemberRow(m.id, { phone_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none disabled:text-zinc-400" /></td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.email || ''} onBlur={(e) => updateMemberRow(m.id, { email: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none disabled:text-zinc-400" placeholder="Add email..." /></td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.address || ''} onBlur={(e) => updateMemberRow(m.id, { address: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none disabled:text-zinc-400" placeholder="Add address..." /></td>
                          <td className="p-2"><input type="text" disabled={!canEditCurrentBranch} defaultValue={m.goal || ''} onBlur={(e) => updateMemberRow(m.id, { goal: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none text-zinc-300 disabled:text-zinc-400" placeholder="Goal detail..." /></td>
                          <td className="p-2">
                            <select 
                              disabled={!canEditCurrentBranch}
                              defaultValue={m.assigned_trainer || ''} 
                              onChange={(e) => updateMemberRow(m.id, { assigned_trainer: e.target.value })}
                              className="bg-transparent text-emerald-400 font-medium focus:outline-none w-full disabled:text-zinc-500"
                            >
                              <option value="" className="bg-zinc-900 text-zinc-500">No Coach Assigned</option>
                              {trainers.map(t => (
                                <option key={t.id} value={t.name} className="bg-zinc-900 text-zinc-100">{t.name}</option>
                              ))}
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

          {/* TAB 2: PROFILE REGISTRATION */}
          {activeTab === 'register' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <form onSubmit={handleRegisterMember} className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">📝 Profile Creation Asset: <span className="text-red-500 font-mono text-sm">{selectedBranch}</span></h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Full Legal Name</label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-zinc-100 focus:outline-none focus:border-red-600" placeholder="John Doe" required />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Membership Designation</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value as 'Regular' | 'VIP')} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-semibold focus:outline-none text-zinc-100">
                      <option value="Regular">Regular Class Access</option>
                      <option value="VIP">VIP Elite Pass</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">RFID Access Card String / Code</label>
                    <input type="text" value={newCard} onChange={(e) => setNewCard(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono focus:outline-none focus:border-red-600" placeholder="e.g. 8752" required />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Telephone Contact System</label>
                    <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" placeholder="e.g. 5926671954" />
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 pt-3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Email Address</label>
                      <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" placeholder="client@domain.com" />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Residential Address</label>
                      <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" placeholder="Sheriff St, Georgetown" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Goal in the Gym</label>
                      <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" placeholder="Weight Loss, Muscle Gain" />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Assign Coach Status</label>
                      <select value={newAssignedTrainer} onChange={(e) => setNewAssignedTrainer(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-emerald-400 font-medium focus:outline-none focus:border-red-600">
                        <option value="">No / Don't Need A Trainer</option>
                        {trainers.map(t => (
                          <option key={t.id} value={t.name}>Yes {'->'} Assign to {t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Contract Term Expiration</label>
                  <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" />
                </div>

                <button 
                  type="submit" 
                  disabled={!canEditCurrentBranch}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-3 px-4 rounded text-xs uppercase tracking-wide transition"
                >
                  {canEditCurrentBranch ? 'Commit Member Ledger Profile' : '🔒 Read-Only Restrained'}
                </button>
              </form>

              {/* MANDATORY PHOTO REGISTRATION STATION */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">📸 Identity Snapshot Terminal</h3>
                  <p className="text-[11px] text-zinc-500">A live biometric user photo is required for onboarding.</p>
                </div>

                <div className="w-full aspect-square bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex flex-col justify-center items-center relative">
                  {capturedPhoto ? (
                    <img src={capturedPhoto} alt="Captured Face Payload" className="w-full h-full object-cover" />
                  ) : videoStream ? (
                    <video id="webcam-feed" autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]"></video>
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <span className="text-3xl block">👤</span>
                      <p className="text-xs text-zinc-500 italic">No image data staged yet.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {!videoStream ? (
                    <button type="button" onClick={startCameraInput} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs py-2 rounded font-semibold transition">📷 Initialize Live Webcam</button>
                  ) : (
                    <button type="button" onClick={captureCameraFrame} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 rounded font-bold tracking-wide animate-pulse transition">🛑 Freeze & Save Photo Frame</button>
                  )}
                  <div className="text-center"><span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">- OR -</span></div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Upload File Manually</label>
                    <input type="file" accept="image/*" onChange={handleManualPhotoUpload} className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-800 file:text-zinc-300 file:cursor-pointer" />
                  </div>
                  {capturedPhoto && (
                    <div className="bg-emerald-950/20 border border-emerald-900/50 rounded p-2 text-center text-[10px] text-emerald-400 font-mono">✓ Profile Identity Matrix Staged</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAINER MANAGEMENT */}
          {activeTab === 'trainers' && (
            <div className="space-y-6">
              <form onSubmit={handleRegisterTrainer} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Trainer Name</label>
                  <input type="text" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-600" placeholder="e.g. Ravin Mahabal" required />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Discipline Specialty</label>
                  <select value={trainerSpecialty} onChange={(e) => setTrainerSpecialty(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-600">
                    <option value="Personal Training">Personal Training</option>
                    <option value="Elite Strength Specialist">Elite Strength Specialist</option>
                    <option value="Bodybuilding & Nutrition Coach">Bodybuilding & Nutrition Coach</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Phone Number</label>
                  <input type="text" value={trainerPhone} onChange={(e) => setTrainerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-600" placeholder="e.g. 592-622-1111" />
                </div>
                <div>
                  <button type="submit" disabled={!canEditCurrentBranch} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-2 rounded text-xs uppercase tracking-wide transition">Add Trainer Asset</button>
                </div>
              </form>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/60 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                      <th className="p-4">Trainer Name</th>
                      <th className="p-4">Discipline Designation</th>
                      <th className="p-4">Contact System</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {trainers.map(t => (
                      <tr key={t.id} className="hover:bg-zinc-800/10">
                        <td className="p-3"><input type="text" disabled={!canEditCurrentBranch} defaultValue={t.name} onBlur={(e) => updateTrainerRow(t.id, { name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none font-medium disabled:text-zinc-400" /></td>
                        <td className="p-3"><input type="text" disabled={!canEditCurrentBranch} defaultValue={t.specialty} onBlur={(e) => updateTrainerRow(t.id, { specialty: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none disabled:text-zinc-400" /></td>
                        <td className="p-3 font-mono"><input type="text" disabled={!canEditCurrentBranch} defaultValue={t.phone_number} onBlur={(e) => updateTrainerRow(t.id, { phone_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none disabled:text-zinc-400" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: POS FRONT REGISTER */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-4">
                <h1 className="text-xl font-bold">{selectedBranch} Front Register</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {inventory.map(item => (
                    <button key={item.id} onClick={() => addToCart(item)} className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 p-4 rounded-xl text-left transition flex flex-col justify-between h-28 group">
                      <div>
                        <span className="text-xs text-zinc-500 block uppercase font-bold tracking-tight">{item.category}</span>
                        <span className="text-sm font-semibold text-zinc-200 mt-1 block leading-tight">{item.item_name}</span>
                      </div>
                      <div className="flex justify-between items-center w-full mt-2">
                        <span className="text-emerald-400 font-mono font-bold">${item.unit_price.toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${item.stock_count < 10 ? 'bg-red-950 text-red-400 border border-red-900/30' : 'bg-zinc-950 text-zinc-400'}`}>Qty: {item.stock_count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-xl h-[500px]">
                <div>
                  <h2 className="text-sm uppercase tracking-wider font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-3">Checkout Terminal</h2>
                  <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                    {posCart.length === 0 ? <p className="text-xs text-zinc-500 italic py-4 text-center">Cart empty.</p> : posCart.map(c => (
                      <div key={c.item.id} className="flex justify-between items-center text-xs bg-zinc-950 p-2 rounded border border-zinc-800">
                        <div>
                          <p className="font-semibold">{c.item.item_name}</p>
                          <p className="text-zinc-500 font-mono">${c.item.unit_price.toLocaleString()} x {c.quantity}</p>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">${(c.item.unit_price * c.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* FIXED: Removed subtotal and VAT fields layout summary row blocks */}
                <div className="border-t border-zinc-800 pt-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-zinc-800 pb-2 text-sm text-zinc-100 font-bold"><span>Total Due:</span><span className="text-emerald-400">${calculateCartTotals().total.toLocaleString()}</span></div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-500 mb-1 font-bold">Cash Tended</label>
                    <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-right font-mono text-emerald-400 focus:outline-none" placeholder="$0" />
                  </div>
                  {Number(cashReceived) >= calculateCartTotals().total && (
                    <div className="flex justify-between text-emerald-400 font-bold py-1 bg-emerald-950/20 px-2 rounded border border-emerald-900/30"><span>Change:</span><span>${(Number(cashReceived) - calculateCartTotals().total).toLocaleString()}</span></div>
                  )}
                  <button onClick={processSaleCheckout} disabled={posCart.length === 0 || !canEditCurrentBranch} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white py-2.5 rounded font-bold uppercase text-xs tracking-wider transition">
                    {canEditCurrentBranch ? 'Process Checkout' : '🔒 Checkout Locked'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INVENTORY LOGISTICS */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <form onSubmit={handleRegisterInventory} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Item Title</label>
                  <input type="text" value={invName} onChange={(e) => setInvName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-red-600" placeholder="Protein Shake 500ml" required />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Category</label>
                  <select value={invCategory} onChange={(e) => setInvCategory(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-red-600">
                    <option value="Supplements">Supplements</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Gear/Apparel">Gear/Apparel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Initial Stock</label>
                  <input type="number" value={invStock} onChange={(e) => setInvStock(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-red-600" />
                </div>
                <div>
                  <button type="submit" disabled={!canEditCurrentBranch} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-1.5 rounded text-xs uppercase tracking-wide transition">Add Asset</button>
                </div>
              </form>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 w-32">Stock Count</th>
                      <th className="p-4 w-36">Retail Price ($)</th>
                      <th className="p-4 w-24 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {inventory.map(i => (
                      <tr key={i.id} className="hover:bg-zinc-800/20">
                        <td className="p-3"><input type="text" disabled={!canEditCurrentBranch} defaultValue={i.item_name} onBlur={(e) => updateInventoryRow(i.id, { item_name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none font-medium disabled:text-zinc-400" /></td>
                        <td className="p-3 text-zinc-400">{i.category}</td>
                        <td className="p-3"><input type="number" disabled={!canEditCurrentBranch} defaultValue={i.stock_count} onBlur={(e) => updateInventoryRow(i.id, { stock_count: Number(e.target.value) })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-20 focus:outline-none font-mono disabled:text-zinc-400" /></td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 bg-zinc-950/40 px-2 py-1 rounded border border-zinc-800 focus-within:border-red-600 max-w-[120px]">
                            <span className="text-emerald-500 font-bold font-mono">$</span>
                            <input type="number" disabled={!canEditCurrentBranch} defaultValue={i.unit_price} onBlur={(e) => updateInventoryRow(i.id, { unit_price: Number(e.target.value) })} className="bg-transparent w-full focus:outline-none font-mono text-emerald-400 font-bold text-xs disabled:text-zinc-500" />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => deleteInventoryItem(i.id, i.item_name)} disabled={!canEditCurrentBranch} className="bg-red-950/40 hover:bg-red-600 hover:text-white disabled:hover:bg-transparent disabled:text-zinc-600 border border-red-900/40 disabled:border-zinc-800 text-red-400 rounded p-1.5 px-2.5 font-bold transition text-[11px]">✕ Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ANALYTICS OVERVIEW */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div><h1 className="text-xl font-bold">{selectedBranch} Analytics</h1></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Branch Profiles</span><div className="text-2xl font-black text-red-500 mt-1">{members.length} Accounts</div></div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">SKUs Tracked</span><div className="text-2xl font-black text-zinc-100 mt-1">{inventory.length} Units</div></div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Value Flow</span><div className="text-2xl font-black text-emerald-400 mt-1">${(inventory.reduce((sum, i) => sum + (i.stock_count * i.unit_price), 0) + (members.length * 15000)).toLocaleString()}</div></div>
              </div>
            </div>
          )}

          {/* TAB 7: PRIVILEGED ADMIN USER PROVISIONING */}
          {activeTab === 'admin_mgmt' && currentUser?.access_all_locations && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              <form onSubmit={handleCreateAdmin} className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-xl">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">🔐 Provision Admin Credential</h2>
                  <p className="text-xs text-zinc-500">Configure separate localized access matrices and roles.</p>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Full Real Name</label>
                  <input type="text" value={admName} onChange={(e) => setAdmName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500" placeholder="Jane Smith" required />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Username / ID</label>
                  <input type="text" value={admUsername} onChange={(e) => setAdmUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" placeholder="receptionist_sheriff" required />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Security Access Key (Password)</label>
                  <input type="password" value={admPassword} onChange={(e) => setAdmPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500" placeholder="••••••••" required />
                </div>

                <div className="flex items-center gap-2 bg-zinc-950 p-3 rounded border border-zinc-800">
                  <input type="checkbox" id="admAccessAll" checked={admAccessAll} onChange={(e) => setAdmAccessAll(e.target.checked)} className="accent-red-600 scale-110 cursor-pointer" />
                  <label htmlFor="admAccessAll" className="text-xs font-bold text-red-400 cursor-pointer select-none">Universal Admin (All Locations + Edit Access)</label>
                </div>

                {!admAccessAll && (
                  <div className="space-y-2 border-t border-zinc-800 pt-3">
                    <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">Location Node Permissions</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {allBranches.map(branch => {
                        const isChecked = admBranches.includes(branch);
                        return (
                          <div key={branch} className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-zinc-200 flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleAdmBranch(branch)} className="accent-zinc-100" />
                                {branch}
                              </label>
                              {isChecked && <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 uppercase font-mono">Assigned</span>}
                            </div>
                            
                            {isChecked && (
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-zinc-900 p-1.5 rounded border border-zinc-800">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`perm-${branch}`} checked={admPerms[branch] === 'view_only'} onChange={() => setAdmBranchPermLevel(branch, 'view_only')} /> View Only</label>
                                <label className="flex items-center gap-1 cursor-pointer text-emerald-400 font-medium"><input type="radio" name={`perm-${branch}`} checked={admPerms[branch] === 'view_edit'} onChange={() => setAdmBranchPermLevel(branch, 'view_edit')} /> View & Edit</label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wide transition">Provision Admin Profile</button>
              </form>

              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 bg-zinc-950 border-b border-zinc-800">
                  <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Active System Admins Registry</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                  {systemAdmins.map(adm => (
                    <div key={adm.id} className="p-4 hover:bg-zinc-800/10 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono text-xs text-zinc-200 font-bold">👤 {adm.username}</span>
                          {adm.name && <span className="text-zinc-500 text-xs block pl-5 font-sans">Name: {adm.name}</span>}
                          {adm.role && <span className="text-zinc-500 text-[11px] block pl-5 font-mono">Role Key: {adm.role}</span>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${adm.access_all_locations ? 'bg-red-950/50 text-red-400 border border-red-900/40' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                          {adm.access_all_locations ? '⭐ UNIVERSAL PRIVILEGES' : '⚓ LOCALLY RESTRICTED'}
                        </span>
                      </div>
                      
                      {!adm.access_all_locations && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(adm.allowed_branches || []).map(b => {
                            const isEditable = adm.branch_permissions?.[b] === 'view_edit';
                            return (
                              <span key={b} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${isEditable ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                                {b} ({isEditable ? 'Write' : 'Read'})
                              </span>
                            );
                          })}
                        </div>
                      )}
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
