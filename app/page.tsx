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
}

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  stock_count: number;
  unit_price: number;
  branch_location: string;
}

export default function LyftGymSystemMaster() {
  // Navigation & Authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'register' | 'pos' | 'inventory' | 'analytics'>('members');
  const [selectedBranch, setSelectedBranch] = useState('Downtown');

  // Core Data Arrays
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Registration Form States
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Regular' | 'VIP'>('Regular');
  const [newCard, setNewCard] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  // POS Module States
  const [posCart, setPosCart] = useState<{ item: InventoryItem; quantity: number }[]>([]);
  const [posTaxRate] = useState(0.08); // 8% Sales Tax
  const [cashReceived, setCashReceived] = useState<string>('');

  // Inventory Registration Form States
  const [invName, setInvName] = useState('');
  const [invCategory, setInvCategory] = useState('Supplements');
  const [invStock, setInvStock] = useState<number>(50);
  const [invPrice, setInvPrice] = useState<number>(4.99);

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
    const { data: memData } = await supabase.from('members').select('*').eq('branch_location', selectedBranch);
    if (memData) setMembers(memData);

    // 2. Fetch Inventory Items
    const { data: invData } = await supabase.from('inventory').select('*').eq('branch_location', selectedBranch);
    if (invData) setInventory(invData);
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshCoreDatabaseData();
    }
  }, [selectedBranch, isLoggedIn]);

  // Submit Member Registration
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCard) return alert('Data missing.');
    const { error } = await supabase.from('members').insert([{
      name: newName, membership_type: newType, card_number: newCard,
      phone_number: newPhone, expiry_date: newExpiry, branch_location: selectedBranch
    }]);
    if (!error) {
      setNewName(''); setNewCard(''); setNewPhone(''); setNewExpiry('');
      setActiveTab('members'); refreshCoreDatabaseData();
    }
  };

  // Submit Inventory Registration
  const handleRegisterInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName) return alert('Item name required.');
    const { error } = await supabase.from('inventory').insert([{
      item_name: invName, category: invCategory, stock_count: Number(invStock),
      unit_price: Number(invPrice), branch_location: selectedBranch
    }]);
    if (!error) {
      setInvName(''); setInvStock(50); setInvPrice(4.99);
      refreshCoreDatabaseData();
    }
  };

  // Inline Modifications for Data Tables
  const updateMemberRow = async (id: string, updatedField: Partial<Member>) => {
    await supabase.from('members').update(updatedField).eq('id', id);
    setMembers(members.map(m => m.id === id ? { ...m, ...updatedField } : m));
  };

  const updateInventoryRow = async (id: string, updatedField: Partial<InventoryItem>) => {
    await supabase.from('inventory').update(updatedField).eq('id', id);
    setInventory(inventory.map(i => i.id === id ? { ...i, ...updatedField } : i));
  };

  // POS Operational Controls
  const addToCart = (item: InventoryItem) => {
    if (item.stock_count <= 0) return alert('Item is out of stock!');
    const existing = posCart.find(c => c.item.id === item.id);
    if (existing) {
      if (existing.quantity >= item.stock_count) return alert('Cannot exceed total available stock.');
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
    
    // Deduct stock levels in Supabase
    for (const entry of posCart) {
      const updatedStock = entry.item.stock_count - entry.quantity;
      await supabase.from('inventory').update({ stock_count: updatedStock }).eq('id', entry.item.id);
    }

    alert('Transaction finalized and stock levels decremented.');
    setPosCart([]);
    setCashReceived('');
    refreshCoreDatabaseData();
  };

  // Digital Office Calculator Processing Matrix
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

  // --- BRANDED LOGIN INTERACTION COMPONENT ---
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
      {/* Top Application Ribbon */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-black text-2xl tracking-tighter">LYFT</span>
          <span className="text-zinc-400 font-light text-xl">NETWORK ENVIRONMENT</span>
        </div>
        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 focus:border-red-600 font-medium">
          <option value="Downtown">Downtown Main</option>
          <option value="Northside">Northside Elite</option>
          <option value="WestEnd">West End Center</option>
        </select>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Navigation Sidebar Drawer */}
        <nav className="w-full md:w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 space-y-1">
          <button onClick={() => setActiveTab('members')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'members' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>👥 Members Directory</button>
          <button onClick={() => setActiveTab('register')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'register' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>📝 Account Registration</button>
          <button onClick={() => setActiveTab('pos')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'pos' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>🛒 POS Sales Register</button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'inventory' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>📦 Inventory Logistics</button>
          <button onClick={() => setActiveTab('analytics')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'analytics' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800'}`}>📈 Analytics & Charts</button>
          
          {/* Integrated Live Workspace Calculator Utility */}
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

        {/* Workspace Display Frame */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">

          {/* TAB 1: MEMBERS DATABASE */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">{selectedBranch} Members</h1>
                <p className="text-xs text-zinc-400">Inline real-time updates connected directly to Supabase cloud storage matrices.</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                      <th className="p-4">Name</th>
                      <th className="p-4">Tier Status</th>
                      <th className="p-4">Card String</th>
                      <th className="p-4">Phone Contact</th>
                      <th className="p-4">Expiration Cycle</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800">
                    {members.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-800/20">
                        <td className="p-3"><input type="text" defaultValue={m.name} onBlur={(e) => updateMemberRow(m.id, { name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none" /></td>
                        <td className="p-3">
                          <select defaultValue={m.membership_type} onChange={(e) => updateMemberRow(m.id, { membership_type: e.target.value as 'Regular' | 'VIP' })} className="bg-transparent text-zinc-300 focus:outline-none font-bold">
                            <option value="Regular" className="bg-zinc-900">Regular</option>
                            <option value="VIP" className="bg-zinc-900 text-yellow-500">VIP</option>
                          </select>
                        </td>
                        <td className="p-3 font-mono"><input type="text" defaultValue={m.card_number} onBlur={(e) => updateMemberRow(m.id, { card_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none font-mono" /></td>
                        <td className="p-3"><input type="text" defaultValue={m.phone_number} onBlur={(e) => updateMemberRow(m.id, { phone_number: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 w-full focus:outline-none" /></td>
                        <td className="p-3"><input type="date" defaultValue={m.expiry_date} onChange={(e) => updateMemberRow(m.id, { expiry_date: e.target.value })} className="bg-transparent text-zinc-300 focus:outline-none" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBER REGISTRATION MODULE */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterMember} className="max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold">New Membership Profile File Creation</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Full Legal Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-600" placeholder="John Doe" required />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Membership Plan Designation</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value as 'Regular' | 'VIP')} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none text-zinc-100">
                    <option value="Regular">Regular Class Access</option>
                    <option value="VIP">VIP Elite Pass</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">RFID Access Token Value</label>
                  <input type="text" value={newCard} onChange={(e) => setNewCard(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-600" placeholder="LYFT-293" required />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Telephone Contact System</label>
                  <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none" placeholder="+1 (555) 019-28" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Billing Contract Expiration</label>
                <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none" />
              </div>
              <button type="submit" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-xs font-bold uppercase tracking-wide">Commit Registration File</button>
            </form>
          )}

          {/* TAB 3: POINT OF SALE TERMINAL REGISTER */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-4">
                <h1 className="text-xl font-bold">Front-Desk POS Terminal Menu</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {inventory.map(item => (
                    <button key={item.id} onClick={() => addToCart(item)} className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 p-4 rounded-xl text-left transition flex flex-col justify-between h-28 group relative overflow-hidden">
                      <div>
                        <span className="text-xs text-zinc-500 block uppercase font-bold tracking-tight">{item.category}</span>
                        <span className="text-sm font-semibold text-zinc-200 mt-1 block leading-tight">{item.item_name}</span>
                      </div>
                      <div className="flex justify-between items-center w-full mt-2">
                        <span className="text-emerald-400 font-mono font-bold">${item.unit_price.toFixed(2)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${item.stock_count < 10 ? 'bg-red-950 text-red-400 border border-red-900/30' : 'bg-zinc-950 text-zinc-400'}`}>Units: {item.stock_count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* POS Cart Checkout Drawer */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-xl h-[500px]">
                <div>
                  <h2 className="text-sm uppercase tracking-wider font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-3">Active Terminal Checkout Cart</h2>
                  <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                    {posCart.length === 0 ? <p className="text-xs text-zinc-500 italic py-4 text-center">Cart is empty. Click items to purchase.</p> : posCart.map(c => (
                      <div key={c.item.id} className="flex justify-between items-center text-xs bg-zinc-950 p-2 rounded border border-zinc-800">
                        <div>
                          <p className="font-semibold">{c.item.item_name}</p>
                          <p className="text-zinc-500 font-mono">${c.item.unit_price.toFixed(2)} x {c.quantity}</p>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">${(c.item.unit_price * c.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Billing Summary Segment */}
                <div className="border-t border-zinc-800 pt-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400"><span>Subtotal Matrix:</span><span>${calculateCartTotals().subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-zinc-400"><span>Regional Sales Tax (8%):</span><span>${calculateCartTotals().tax.toFixed(2)}</span></div>
                  <div className="flex justify-between border-b border-zinc-800 pb-2 text-sm text-zinc-100 font-bold"><span>Total Cash Due:</span><span className="text-emerald-400">${calculateCartTotals().total.toFixed(2)}</span></div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-500 mb-1 font-bold">Cash Drawer Input</label>
                    <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-right font-mono text-emerald-400 focus:outline-none" placeholder="$0.00" />
                  </div>
                  {Number(cashReceived) >= calculateCartTotals().total && (
                    <div className="flex justify-between text-emerald-400 font-bold py-1 bg-emerald-950/20 px-2 rounded border border-emerald-900/30"><span>Due Register Change:</span><span>${(Number(cashReceived) - calculateCartTotals().total).toFixed(2)}</span></div>
                  )}
                  <button onClick={processSaleCheckout} disabled={posCart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 text-white py-2.5 rounded font-bold uppercase text-xs tracking-wider transition">Finalize Ledger Receipt</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORY TRACKER & MASTER SUPPLY LOGISTICS */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <form onSubmit={handleRegisterInventory} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Item Title</label>
                  <input type="text" value={invName} onChange={(e) => setInvName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none" placeholder="Whey Isolate 1kg" required />
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
                    {inventory.map(i => (
                      <tr key={i.id} className="hover:bg-zinc-800/20">
                        <td className="p-3"><input type="text" defaultValue={i.item_name} onBlur={(e) => updateInventoryRow(i.id, { item_name: e.target.value })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-full focus:outline-none font-medium" /></td>
                        <td className="p-3 text-zinc-400">{i.category}</td>
                        <td className="p-3"><input type="number" defaultValue={i.stock_count} onBlur={(e) => updateInventoryRow(i.id, { stock_count: Number(e.target.value) })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-20 focus:outline-none font-mono" /></td>
                        <td className="p-3"><input type="number" step="0.01" defaultValue={i.unit_price} onBlur={(e) => updateInventoryRow(i.id, { unit_price: Number(e.target.value) })} className="bg-transparent border-b border-transparent focus:border-red-600 px-1 py-0.5 rounded w-24 focus:outline-none font-mono text-emerald-400 font-bold" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS & REVENUE CHARTS MATRIX */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold">Network Revenue Analytical Matrix</h1>
                <p className="text-xs text-zinc-400">Live operational distribution across the entire network cluster.</p>
              </div>

              {/* Statistical Value Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Active Branch Membership Count</span><div className="text-2xl font-black text-red-500 mt-1">{members.length} Accounts</div></div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Inventory SKUs Tracked</span><div className="text-2xl font-black text-zinc-100 mt-1">{inventory.length} Active Items</div></div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg"><span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">Projected Branch Value</span><div className="text-2xl font-black text-emerald-400 mt-1">${(inventory.reduce((sum, i) => sum + (i.stock_count * i.unit_price), 0) + (members.length * 79.99)).toFixed(2)}</div></div>
              </div>

              {/* Native Real-time Pure-CSS Bar Chart Matrix */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-6">Financial Performance Cycle Breakdown</h3>
                <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-zinc-800 border-l px-4">
                  {[
                    { label: 'Q1 Sales', height: 'h-24', val: '$14,200' },
                    { label: 'Q2 Member', height: 'h-36', val: '$22,400' },
                    { label: 'Q3 Supps', height: 'h-16', val: '$9,800' },
                    { label: 'Q4 VIP', height: 'h-44', val: '$28,100' }
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
