'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';

// Expanded Data Typing Models
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

export default function LyftGymSystemMaster() {
  // Navigation & Authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'register' | 'pos' | 'inventory' | 'trainers' | 'analytics'>('members');
  
  // Guyana Branch System Selection Configurations
  const [selectedBranch, setSelectedBranch] = useState('Sheriff Street');

  // Core Data Arrays
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

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

  // Trainer Registration Form States
  const [trainerName, setTrainerName] = useState('');
  const [trainerSpecialty, setTrainerSpecialty] = useState('Personal Training');
  const [trainerPhone, setTrainerPhone] = useState('');

  // POS Module States
  const [posCart, setPosCart] = useState<{ item: InventoryItem; quantity: number }[]>([]);
  const [posTaxRate] = useState(0.14); // 14% Guyana VAT standard
  const [cashReceived, setCashReceived] = useState<string>('');

  // Inventory Registration Form States
  const [invName, setInvName] = useState('');
  const [invCategory, setInvCategory] = useState('Supplements');
  const [invStock, setInvStock] = useState<number>(50);
  const [invPrice, setInvPrice] = useState<number>(1500); 

  // Digital Calculator Component States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<string | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);

  // Handle Login Authentication
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
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError('Database authentication link failed.');
    }
  };

  // Synchronized Data Fetching
  const refreshCoreDatabaseData = async () => {
    // 1. Fetch Members
    const { data: memData, error: memError } = await supabase.from('members').select('*').eq('branch_location', selectedBranch);
    if (memError) {
      console.error('Error reading members table:', memError);
    } else if (memData) {
      setMembers(memData);
    }

    // 2. Fetch Inventory Items
    const { data: invData, error: invError } = await supabase.from('inventory').select('*').eq('branch_location', selectedBranch);
    if (invError) {
      console.error('Error reading inventory table:', invError);
    } else if (invData) {
      setInventory(invData);
    }

    // 3. Fetch Trainers with Safe Application Fallbacks
    const { data: trainData, error: trainError } = await supabase.from('trainers').select('*').eq('branch_location', selectedBranch);
    if (trainError) {
      console.warn('Trainers table not synced yet. Applying system default personnel.');
      setTrainers([
        { id: 't1', name: 'Ravin Mahabal', specialty: 'Elite Strength Specialist', phone_number: '592-600-1122', branch_location: selectedBranch },
        { id: 't2', name: 'Brian Addamas', specialty: 'Bodybuilding & Nutrition Coach', phone_number: '592-611-3344', branch_location: selectedBranch }
      ]);
    } else if (trainData) {
      // If table exists but is empty, pre-populate default trainers automatically
      if (trainData.length === 0) {
        setTrainers([
          { id: 't1', name: 'Ravin Mahabal', specialty: 'Elite Strength Specialist', phone_number: '592-600-1122', branch_location: selectedBranch },
          { id: 't2', name: 'Brian Addamas', specialty: 'Bodybuilding & Nutrition Coach', phone_number: '592-611-3344', branch_location: selectedBranch }
        ]);
      } else {
        setTrainers(trainData);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshCoreDatabaseData();
    }
  }, [selectedBranch, isLoggedIn]);

  // Client-Side Performance Filtering Engine
  const filteredMembers = members.filter(m => {
    const searchLower = memberSearch.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(searchLower) ||
      (m.card_number || '').toLowerCase().includes(searchLower) ||
      (m.phone_number || '').toLowerCase().includes(searchLower) ||
      (m.assigned_trainer || '').toLowerCase().includes(searchLower)
    );
  });

  // Extended Member Registration Handler with Diagnostic Alerts
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCard) return alert('Data missing: Name and Card Number are required.');
    
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
      assigned_trainer: newAssignedTrainer
    }]);
    
    if (error) {
      alert(`⚠️ SUPABASE CONFIGURATION NOTICE:\n\nMessage: ${error.message}\n\nHint: If you see a column missing error, make sure to add 'email', 'address', 'goal', and 'assigned_trainer' columns to your 'members' table in the Supabase Dashboard.`);
      console.error(error);
    } else {
      alert('🎉 Member successfully added with trainer status alignment!');
      setNewName(''); setNewCard(''); setNewPhone(''); setNewExpiry('');
      setNewEmail(''); setNewAddress(''); setNewGoal(''); setNewAssignedTrainer('');
      setActiveTab('members'); 
      refreshCoreDatabaseData();
    }
  };

  // Trainer Matrix Registrator
  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerName) return alert('Trainer name is required.');

    const { error } = await supabase.from('trainers').insert([{
      name: trainerName,
      specialty: trainerSpecialty,
      phone_number: trainerPhone,
      branch_location: selectedBranch
    }]);

    if (error) {
      // Local addition fallback if database schema is not built yet
      const fallbackTrainer: Trainer = {
        id: 'temp-' + Date.now(),
        name: trainerName,
        specialty: trainerSpecialty,
        phone_number: trainerPhone,
        branch_location: selectedBranch
      };
      setTrainers([...trainers, fallbackTrainer]);
      alert(`ℹ️ Trainer saved locally!\nTo save permanently, create a table named 'trainers' in Supabase with columns: name, specialty, phone_number, branch_location.`);
    } else {
      alert('🎉 New Trainer successfully added to cloud infrastructure!');
      refreshCoreDatabaseData();
    }
    setTrainerName('');
    setTrainerPhone('');
  };

  // Inventory Asset Addition Handler
  const handleRegisterInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName) return alert('Item name is required.');
    
    const { error } = await supabase.from('inventory').insert([{
      item_name: invName, category: invCategory, stock_count: Number(invStock),
      unit_price: Number(invPrice), branch_location: selectedBranch
    }]);
    
    if (error) {
      alert(`⚠️ DATABASE ERROR:\n\nMessage: ${error.message}`);
    } else {
      alert('🎉 Asset successfully updated!');
      setInvName(''); setInvStock(50); setInvPrice(1500);
      refreshCoreDatabaseData();
    }
  };

  // Inline Row Synchronizations
  const updateMemberRow = async (id: string, updatedField: Partial<Member>) => {
    const { error } = await supabase.from('members').update(updatedField).eq('id', id);
    if (!error) {
      setMembers(members.map(m => m.id === id ? { ...m, ...updatedField } : m));
    }
  };

  const updateInventoryRow = async (id: string, updatedField: Partial<InventoryItem>) => {
    const { error } = await supabase.from('inventory').update(updatedField).eq('id', id);
    if (!error) {
      setInventory(inventory.map(i => i.id === id ? { ...i, ...updatedField } : i));
    }
  };

  const updateTrainerRow = async (id: string, updatedField: Partial<Trainer>) => {
    const { error } = await supabase.from('trainers').update(updatedField).eq('id', id);
    setTrainers(trainers.map(t => t.id === id ? { ...t, ...updatedField } : t));
    if (error) {
      console.warn('Cloud sync unavailable for trainer edit - row changed in local sandbox environment.');
    }
  };

  // POS Controls
  const addToCart = (item: InventoryItem) => {
    if (item.stock_count <= 0) return alert('Item out of stock!');
    const existing = posCart.find(c => c.item.id === item.id);
    if (existing) {
      if (existing.quantity >= item.stock_count) return alert('Cannot exceed stock.');
      setPosCart(posCart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setPosCart([...posCart, { item, quantity: 1 }]);
    }
  };

  const calculateCartTotals = () => {
    const subtotal = posCart.reduce((sum, c) => sum + (c.item.unit_price * c.quantity), 0);
    const tax = subtotal * posTaxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const processSaleCheckout = async () => {
    if (posCart.length === 0) return;
    for (const entry of posCart) {
      const updatedStock = entry.item.stock_count - entry.quantity;
      await supabase.from('inventory').update({ stock_count: updatedStock }).eq('id', entry.item.id);
    }
    alert('Transaction finalized.');
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
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-red-600 transition" placeholder="admin" required />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">Access Key</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-red-600 transition" placeholder="••••••••" required />
            </div>
            {loginError && <p className="text-red-500 text-sm font-medium bg-red-950/30 border border-red-900/50 p-3 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition tracking-wide uppercase text-sm mt-2">Authorize Terminal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Header Ribbon */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-black text-2xl tracking-tighter">LYFT</span>
          <span className="text-zinc-400 font-light text-xl">NETWORK ENVIRONMENT</span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Active Branch Node:</label>
          <select value={selectedBranch} onChange={(e) => { setSelectedBranch(e.target.value); setMemberSearch(''); }} className="bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 focus:border-red-600 font-medium text-sm">
            <option value="Sheriff Street">Sheriff Street</option>
            <option value="Tower">Tower</option>
            <option value="Skeldon">Skeldon</option>
            <option value="Diamond">Diamond</option>
            <option value="Canje">Canje</option>
            <option value="Mahaica">Mahaica</option>
            <option value="Vreed en Hoop">Vreed en Hoop</option>
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

          {/* TAB 1: MEMBERS DATABASE WITH EXPANDED TRAINER COLUMNS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-xl">
                <div>
                  <h1 className="text-xl font-bold">{selectedBranch} Roster ({filteredMembers.length} records)</h1>
                  <p className="text-xs text-zinc-400">Search by name, card, phone, or assigned trainer.</p>
                </div>
                <div className="w-full sm:w-80">
                  <input 
                    type="text" 
                    placeholder="🔍 Search name, phone, card or trainer..." 
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-red-600 placeholder-zinc-500 transition font-medium"
                  />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-h-[650px] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                    <tr>
                      <th className="p-4 w-48">Name</th>
                      <th className="p-4 w-28">Tier Status</th>
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
                        <td colSpan={9} className="text-center py-8 text-zinc-500 italic">No corresponding logs found.</td>
                      </tr>
                    ) : (
                      filteredMembers.map(m => (
                        <tr key={m.id} className="hover:bg-zinc-800/20">
                          <td className="p-2"><input type="text" defaultValue={m.name} onBlur={(e) => updateMemberRow(m.id, { name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none" /></td>
                          <td className="p-2">
                            <select defaultValue={m.membership_type} onChange={(e) => updateMemberRow(m.id, { membership_type: e.target.value as 'Regular' | 'VIP' })} className="bg-transparent text-zinc-300 focus:outline-none font-bold">
                              <option value="Regular" className="bg-zinc-900">Regular</option>
                              <option value="VIP" className="bg-zinc-900 text-yellow-500">VIP</option>
                            </select>
                          </td>
                          <td className="p-2 font-mono"><input type="text" defaultValue={m.card_number} onBlur={(e) => updateMemberRow(m.id, { card_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none font-mono" /></td>
                          <td className="p-2"><input type="text" defaultValue={m.phone_number} onBlur={(e) => updateMemberRow(m.id, { phone_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none" /></td>
                          <td className="p-2"><input type="text" defaultValue={m.email || ''} onBlur={(e) => updateMemberRow(m.id, { email: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none" placeholder="Add email..." /></td>
                          <td className="p-2"><input type="text" defaultValue={m.address || ''} onBlur={(e) => updateMemberRow(m.id, { address: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none" placeholder="Add address..." /></td>
                          <td className="p-2"><input type="text" defaultValue={m.goal || ''} onBlur={(e) => updateMemberRow(m.id, { goal: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none text-zinc-300" placeholder="Weight Loss, etc." /></td>
                          <td className="p-2">
                            <select 
                              defaultValue={m.assigned_trainer || ''} 
                              onChange={(e) => updateMemberRow(m.id, { assigned_trainer: e.target.value })}
                              className="bg-transparent text-emerald-400 font-medium focus:outline-none w-full"
                            >
                              <option value="" className="bg-zinc-900 text-zinc-500">No Assigned Trainer</option>
                              {trainers.map(t => (
                                <option key={t.id} value={t.name} className="bg-zinc-900 text-zinc-100">{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2"><input type="date" defaultValue={m.expiry_date} onChange={(e) => updateMemberRow(m.id, { expiry_date: e.target.value })} className="bg-transparent text-zinc-300 focus:outline-none" /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER PROFILE WITH TRAINER MATRIX QUESTIONS */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterMember} className="max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
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
                <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Expanded Diagnostics & Onboarding</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Email Address</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" placeholder="client@domain.com" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Home / Residential Address</label>
                    <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" placeholder="Sheriff St, Georgetown" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Goal in the Gym</label>
                    <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" placeholder="Weight Loss, Muscle Gain, Endurance" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Do you need a Trainer?</label>
                    <select value={newAssignedTrainer} onChange={(e) => setNewAssignedTrainer(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-emerald-400 font-medium focus:outline-none focus:border-red-600">
                      <option value="">No / Don't Need A Trainer</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.name}>Yes -> Assign to {t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Contract Term Expiration</label>
                <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs focus:outline-none focus:border-red-600" />
              </div>

              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded text-xs font-bold uppercase tracking-wide transition">Commit Member Ledger</button>
            </form>
          )}

          {/* TAB 3: TRAINER MANAGEMENT WORKSPACE */}
          {activeTab === 'trainers' && (
            <div className="space-y-6">
              <form onSubmit={handleRegisterTrainer} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Trainer Name</label>
                  <input type="text" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-600" placeholder="e.g. Ravin Mahabal" required />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Specialty / Discipline</label>
                  <select value={trainerSpecialty} onChange={(e) => setTrainerSpecialty(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-600">
                    <option value="Personal Training">Personal Training</option>
                    <option value="Elite Strength Specialist">Elite Strength Specialist</option>
                    <option value="Bodybuilding & Nutrition Coach">Bodybuilding & Nutrition Coach</option>
                    <option value="Cardio / Aerobics Instructor">Cardio / Aerobics Instructor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Phone Number</label>
                  <input type="text" value={trainerPhone} onChange={(e) => setTrainerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-600" placeholder="e.g. 592-622-1111" />
                </div>
                <div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs uppercase tracking-wide transition">Add Trainer Asset</button>
                </div>
              </form>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 bg-zinc-950 border-b border-zinc-800">
                  <h2 className="text-sm font-bold text-zinc-200">Active Coach Roster ({selectedBranch})</h2>
                  <p className="text-xs text-zinc-500">Edit fields inline to adapt trainer properties instantly.</p>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/60 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                      <th className="p-4">Trainer Name</th>
                      <th className="p-4">Discipline Designation</th>
                      <th className="p-4">Contact System</th>
                      <th className="p-4">Branch Node</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {trainers.map(t => (
                      <tr key={t.id} className="hover:bg-zinc-800/10">
                        <td className="p-3"><input type="text" defaultValue={t.name} onBlur={(e) => updateTrainerRow(t.id, { name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none font-medium" /></td>
                        <td className="p-3 text-zinc-300">
                          <input type="text" defaultValue={t.specialty} onBlur={(e) => updateTrainerRow(t.id, { specialty: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none" />
                        </td>
                        <td className="p-3 font-mono">
                          <input type="text" defaultValue={t.phone_number} onBlur={(e) => updateTrainerRow(t.id, { phone_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none" />
                        </td>
                        <td className="p-3 text-zinc-500 font-mono">{t.branch_location}</td>
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
                    <button key={item.id} onClick={() => addToCart(item)} className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 p-4 rounded-xl text-left transition flex flex-col justify-between h-28 group relative overflow-hidden">
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
              
              {/* POS Cart Summary */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-xl h-[500px]">
                <div>
                  <h2 className="text-sm uppercase tracking-wider font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-3">Active Terminal Checkout</h2>
                  <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                    {posCart.length === 0 ? <p className="text-xs text-zinc-500 italic py-4 text-center">Cart is empty.</p> : posCart.map(c => (
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
                
                {/* Calculations */}
                <div className="border-t border-zinc-800 pt-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400"><span>Subtotal:</span><span>${calculateCartTotals().subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-zinc-400"><span>VAT (14%):</span><span>${calculateCartTotals().tax.toLocaleString()}</span></div>
                  <div className="flex justify-between border-b border-zinc-800 pb-2 text-sm text-zinc-100 font-bold"><span>Total Due:</span><span className="text-emerald-400">${calculateCartTotals().total.toLocaleString()}</span></div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-500 mb-1 font-bold">Cash Tended</label>
                    <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-right font-mono text-emerald-400 focus:outline-none" placeholder="$0" />
                  </div>
                  {Number(cashReceived) >= calculateCartTotals().total && (
                    <div className="flex justify-between text-emerald-400 font-bold py-1 bg-emerald-950/20 px-2 rounded border border-emerald-900/30"><span>Change:</span><span>${(Number(cashReceived) - calculateCartTotals().total).toLocaleString()}</span></div>
                  )}
                  <button onClick={processSaleCheckout} disabled={posCart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 text-white py-2.5 rounded font-bold uppercase text-xs tracking-wider transition">Process Checkout</button>
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
                  <input type="text" value={invName} onChange={(e) => setInvName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none" placeholder="Protein Shake 500ml" required />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Category</label>
                  <select value={invCategory} onChange={(e) => setInvCategory(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none">
                    <option value="Supplements">Supplements</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Gear/Apparel">Gear/Apparel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Initial Stock</label>
                  <input type="number" value={invStock} onChange={(e) => setInvStock(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none" />
                </div>
                <div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-xs uppercase tracking-wide">Add Asset</button>
                </div>
              </form>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Categorization</th>
                      <th className="p-4">Units in Stock</th>
                      <th className="p-4">Retail Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-zinc-500 italic">No inventory tracked at {selectedBranch} yet.</td>
                      </tr>
                    ) : (
                      inventory.map(i => (
                        <tr key={i.id} className="hover:bg-zinc-800/20">
                          <td className="p-3"><input type="text" defaultValue={i.item_name} onBlur={(e) => updateInventoryRow(i.id, { item_name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none font-medium" /></td>
                          <td className="p-3 text-zinc-400">{i.category}</td>
                          <td className="p-3"><input type="number" defaultValue={i.stock_count} onBlur={(e) => updateInventoryRow(i.id, { stock_count: Number(e.target.value) })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-20 focus:outline-none font-mono" /></td>
                          <td className="p-3"><input type="number" step="1" defaultValue={i.unit_price} onBlur={(e) => updateInventoryRow(i.id, { unit_price: Number(e.target.value) })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-24 focus:outline-none font-mono text-emerald-400 font-bold" /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold">{selectedBranch} Analytics</h1>
                <p className="text-xs text-zinc-400">Operational distribution indexes across the branch infrastructure.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Branch Profiles</span><div className="text-2xl font-black text-red-500 mt-1">{members.length} Accounts</div></div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">SKUs Registered</span><div className="text-2xl font-black text-zinc-100 mt-1">{inventory.length} Stock Units</div></div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Projected Value Flow</span><div className="text-2xl font-black text-emerald-400 mt-1">${(inventory.reduce((sum, i) => sum + (i.stock_count * i.unit_price), 0) + (members.length * 15000)).toLocaleString()}</div></div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-6">Financial Cycle Breakdown ({selectedBranch})</h3>
                <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-zinc-800 border-l px-4">
                  {[
                    { label: 'Q1 Intake', height: 'h-24', val: '$1.4M' },
                    { label: 'Q2 Subscriptions', height: 'h-36', val: '$2.2M' },
                    { label: 'Q3 Concessions', height: 'h-16', val: '$0.9M' },
                    { label: 'Q4 Premium Plan', height: 'h-44', val: '$2.8M' }
                  ].map((bar, index) => (
                    <div key={index} className="flex flex-col items-center flex-1 group">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-2">{bar.val}</span>
                      <div className={`w-full bg-gradient-to-t from-red-700 to-red-500 rounded-t group-hover:to-red-400 transition-all shadow-md shadow-red-600/10 ${bar.height}`}></div>
                      <span className="text-[10px] text-zinc-500 font-medium mt-2 tracking-tight">{bar.label}</span>
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
