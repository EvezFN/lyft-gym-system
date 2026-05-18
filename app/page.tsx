"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import { 
  Package, CreditCard, ShieldCheck, Plus, History, LogOut
} from 'lucide-react';

const BRANCHES = [
  { id: 'b1', name: 'Sheriff Street (Georgetown)' },
  { id: 'b2', name: 'Tower Main Street (Georgetown)' },
  { id: 'b3', name: 'Diamond Public Road' },
  { id: 'b4', name: 'Vreed-en-Hoop' },
  { id: 'b5', name: 'New Amsterdam (Canje)' },
  { id: 'b6', name: 'Skeldon (Corriverton)' },
  { id: 'b7', name: 'Mahaica' },
  { id: 'b8', name: 'West Bank Demerara' }
];

export default function LyftGymSystem() {
  // App Sync Hydration States
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Security Gate
  const [securityGateUnlocked, setSecurityGateUnlocked] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [masterPasswordError, setMasterPasswordError] = useState('');

  // Admin New Account Inputs
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState('Front Desk Staff');

  // Inventory Ingestion Inputs
  const [newInvName, setNewInvName] = useState('');
  const [newInvSku, setNewInvSku] = useState('');
  const [newInvStock, setNewInvStock] = useState('');
  const [newInvPrice, setNewInvPrice] = useState('');

  // General Dashboard Controls
  const [activeTab, setActiveTab] = useState('pos');
  const [selectedBranch, setSelectedBranch] = useState('b1'); 
  const [posCart, setPosCart] = useState<{product: any, quantity: number}[]>([]);

  // 1. Fetch live cloud database info on initialization
  const fetchCloudDatabase = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase.from('system_users').select('*');
      if (usersData) setSystemUsers(usersData);

      const { data: inventoryData } = await supabase.from('inventory').select('*');
      if (inventoryData) setInventory(inventoryData);

      const { data: logsData } = await supabase.from('inventory_logs').select('*').order('timestamp', { ascending: false });
      if (logsData) setInventoryLogs(logsData);
    } catch (err) {
      console.error("Database connection fault:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudDatabase();
  }, []);

  const formatMoney = (amountInGYD: number) => {
    return `GYD$ ${amountInGYD.toLocaleString()}`;
  };

  // 2. Authentication Rules
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const user = systemUsers.find(u => u.username.toLowerCase() === loginUsername.toLowerCase() && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid application username or security access key.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setSecurityGateUnlocked(false);
    setMasterPasswordInput('');
    setMasterPasswordError('');
  };

  const verifyMasterGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPasswordInput === 'SantanaRS14') {
      setSecurityGateUnlocked(true);
    } else {
      setMasterPasswordError('Access Denied. Master password mismatch.');
    }
  };

  // 3. User Creation Management
  const provisionNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regFullName) return alert('Fill out all fields.');
    
    const { error } = await supabase.from('system_users').insert([{
      username: regUsername,
      password: regPassword,
      name: regFullName,
      role: regRole
    }]);

    if (error) {
      alert(`Cloud Mutation Exception: ${error.message}`);
    } else {
      alert(`Success: ${regFullName} saved in global database!`);
      setRegUsername(''); setRegPassword(''); setRegFullName('');
      fetchCloudDatabase();
    }
  };

  // 4. Ingest/Add New Items to the Database
  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const stockNum = parseInt(newInvStock);
    const priceNum = parseFloat(newInvPrice);

    if (!newInvName || !newInvSku || isNaN(stockNum) || isNaN(priceNum) || stockNum < 0 || priceNum < 0) {
      return alert("Please fulfill standard item values accurately.");
    }

    const itemUuid = `I-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Send new item row info up to Supabase
    const { error: invError } = await supabase.from('inventory').insert([{
      id: itemUuid,
      name: newInvName,
      sku: newInvSku.toUpperCase().trim(),
      stock: stockNum,
      price_gyd: priceNum,
      branch_id: selectedBranch
    }]);

    if (invError) return alert(`Failed to add item: ${invError.message}`);

    // Create a history transaction row to track the addition event
    await supabase.from('inventory_logs').insert([{
      item_id: itemUuid,
      item_name: newInvName,
      sku: newInvSku.toUpperCase().trim(),
      quantity_changed: stockNum,
      action_type: 'RESTOCK'
    }]);

    alert("Product catalog index saved to cloud database.");
    setNewInvName(''); setNewInvSku(''); setNewInvStock(''); setNewInvPrice('');
    fetchCloudDatabase();
  };

  // 5. Checkout Cart / Stock Reduction Functions
  const addToCart = (product: any) => {
    if (product.stock <= 0) return alert("Item out of stock!");
    const existing = posCart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return alert("Cannot exceed current stock level!");
      setPosCart(posCart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setPosCart([...posCart, { product, quantity: 1 }]);
    }
  };

  const checkoutCart = async () => {
    if (posCart.length === 0) return;

    try {
      for (const cartItem of posCart) {
        const targetStockItem = inventory.find(i => i.id === cartItem.product.id);
        const computedNextStockValue = targetStockItem.stock - cartItem.quantity;

        // Deduct remaining item quantity amounts inside the Supabase cloud table row
        await supabase.from('inventory').update({ stock: computedNextStockValue }).eq('id', cartItem.product.id);

        // Append a formal deduction entry to the historical auditing tracking tables
        await supabase.from('inventory_logs').insert([{
          item_id: cartItem.product.id,
          item_name: cartItem.product.name,
          sku: cartItem.product.sku,
          quantity_changed: -cartItem.quantity, // Stored as a negative number to represent removal
          action_type: 'CHECKOUT'
        }]);
      }

      setPosCart([]);
      alert("Items taken out successfully! Global tables updated.");
      fetchCloudDatabase();
    } catch (err) {
      alert("An error occurred executing database updates.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#121212] border border-[#222] p-6 rounded-xl space-y-4 shadow-2xl">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Lyft Gym Cloud Network</h2>
            <p className="text-xs text-gray-500 mt-1">Global Real-time Master Matrix</p>
          </div>
          {loginError && <p className="text-xs text-red-500 bg-red-950/30 p-2 rounded border border-red-900/50">{loginError}</p>}
          <input type="text" placeholder="Username" value={loginUsername} onChange={e=>setLoginUsername(e.target.value)} className="w-full bg-[#1A1A1A] border border-[#333] p-2.5 rounded text-sm text-white outline-none focus:border-red-600" required />
          <input type="password" placeholder="Access Password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-[#333] p-2.5 rounded text-sm text-white outline-none focus:border-red-600" required />
          <button type="submit" className="w-full bg-red-600 text-white p-2.5 rounded font-bold hover:bg-red-500 transition-colors">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-gray-100 flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#161616] border-r border-[#262626] flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-[#262626] flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-black text-white text-xl shadow-lg shadow-red-600/20">LYFT</div>
            <div>
              <h1 className="text-sm font-bold text-white uppercase tracking-wider">Lyft Network</h1>
              <p className="text-[10px] text-emerald-400 font-mono tracking-wider">DATABASE SYNC ACTIVE</p>
            </div>
          </div>

          <div className="p-3 bg-[#1A1A1A] m-3 rounded border border-[#2A2A2A] space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase block">Active Branch Node</label>
            <select className="bg-[#121212] border border-[#333] p-1.5 rounded w-full text-xs text-white outline-none" value={selectedBranch} onChange={e=>{setSelectedBranch(e.target.value); setPosCart([]);}}>
              {BRANCHES.map(b => <option key={b.id} value={b.id} className="bg-[#161616]">{b.name}</option>)}
            </select>
          </div>

          <nav className="p-3 space-y-1">
            <button onClick={() => setActiveTab('pos')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-all ${activeTab==='pos'?'bg-red-600 text-white shadow-md shadow-red-600/10':'text-gray-400 hover:bg-zinc-800/50'}`}><CreditCard size={16}/> POS Register</button>
            <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-all ${activeTab==='inventory'?'bg-red-600 text-white shadow-md shadow-red-600/10':'text-gray-400 hover:bg-zinc-800/50'}`}><Package size={16}/> Inventory & Audit Logs</button>
            <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-all ${activeTab==='security'?'bg-red-600 text-white shadow-md shadow-red-600/10':'text-gray-400 hover:bg-zinc-800/50'}`}><ShieldCheck size={16}/> Security System</button>
          </nav>
        </div>

        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between">
          <div className="text-xs">
            <p className="font-bold text-white">{currentUser?.name}</p>
            <p className="text-[10px] text-gray-500 font-mono">{currentUser?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 bg-zinc-900 border border-[#2b2b2b] text-gray-400 hover:text-red-400 rounded transition-colors" title="Logout"><LogOut size={14}/></button>
        </div>
      </aside>

      {/* VIEWPORT BODY */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="text-center py-24 text-sm font-mono text-gray-400 animate-pulse">Synchronizing application cluster connection with database cloud records...</div>
        ) : (
          <>
            {/* TAB CONTENT: POS REGISTER PANEL */}
            {activeTab === 'pos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inventory.filter(item => item.branch_id === selectedBranch).length === 0 ? (
                    <div className="sm:col-span-2 bg-[#161616] border border-[#262626] p-12 text-center rounded-xl text-gray-500 text-sm">
                      No stock records found for this location. Head over to the Inventory tab to add your first item!
                    </div>
                  ) : (
                    inventory.filter(item => item.branch_id === selectedBranch).map(product => (
                      <div key={product.id} onClick={() => addToCart(product)} className="bg-[#161616] border border-[#262626] p-5 rounded-xl cursor-pointer hover:border-red-600 transition-all flex flex-col justify-between group">
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1 font-mono"><span>{product.sku}</span><span className={product.stock <= 5 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{product.stock} remaining</span></div>
                          <h4 className="font-bold text-white group-hover:text-red-400 transition-colors">{product.name}</h4>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-2 border-t border-[#222]">
                          <span className="font-black text-white text-base">{formatMoney(product.price_gyd)}</span>
                          <span className="p-1 bg-zinc-800 text-gray-400 group-hover:bg-red-600 group-hover:text-white rounded transition-colors"><Plus size={14}/></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* BASKET SIDE PANEL */}
                <div className="bg-[#161616] border border-[#262626] p-5 rounded-xl flex flex-col justify-between h-fit space-y-4">
                  <div>
                    <h3 className="font-bold text-white border-b border-[#262626] pb-2 mb-2 text-sm uppercase tracking-wider text-gray-400">Items to Take Out</h3>
                    {posCart.length === 0 ? (
                      <p className="text-xs text-gray-500 py-6 text-center">Your checkout tray is completely empty.</p>
                    ) : (
                      posCart.map(item => (
                        <div key={item.product.id} className="flex justify-between text-sm py-2 border-b border-zinc-800/30">
                          <div>
                            <p className="font-semibold text-white">{item.product.name}</p>
                            <p className="text-xs text-red-400">{item.quantity} unit{item.quantity > 1 ? 's' : ''} being removed</p>
                          </div>
                          <span className="font-mono text-gray-300 self-center">{formatMoney(item.product.price_gyd * item.quantity)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {posCart.length > 0 && (
                    <div className="border-t border-[#262626] pt-3 space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-gray-400">Total Valuation</span><span className="font-bold font-mono text-white text-base">{formatMoney(posCart.reduce((acc, item) => acc + (item.product.price_gyd * item.quantity), 0))}</span></div>
                      <button onClick={checkoutCart} className="w-full bg-red-600 text-white font-bold py-2.5 rounded text-sm hover:bg-red-500 transition-colors uppercase tracking-wider text-xs">
                        Confirm Storage Take-Out
                      </button>
                      <button onClick={() => setPosCart([])} className="w-full bg-zinc-900 border border-zinc-800 text-gray-400 font-semibold py-1.5 rounded text-xs hover:text-white transition-colors">Clear Selection</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: INVENTORY & LOGS PANEL */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* INVENTORY ITEM CREATION / INGESTION INTERFACE */}
                  <div className="bg-[#161616] border border-[#262626] p-5 rounded-xl h-fit">
                    <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider text-gray-400 flex items-center gap-2"><Plus size={16} className="text-red-500" /> Add New Product Profile</h3>
                    <form onSubmit={handleAddInventoryItem} className="space-y-3">
                      <div><label className="text-xs text-gray-400 block mb-1">Product Display Name</label><input type="text" value={newInvName} onChange={e=>setNewInvName(e.target.value)} placeholder="e.g. Rule 1 Whey Protein 5lbs" className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none focus:border-red-600" required /></div>
                      <div><label className="text-xs text-gray-400 block mb-1">SKU Unique Serial Identifier</label><input type="text" value={newInvSku} onChange={e=>setNewInvSku(e.target.value)} placeholder="e.g. R1-WHEY-BLU" className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none focus:border-red-600 font-mono" required /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs text-gray-400 block mb-1">Starting Stock Volume</label><input type="number" min="0" value={newInvStock} onChange={e=>setNewInvStock(e.target.value)} placeholder="0" className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none focus:border-red-600" required /></div>
                        <div><label className="text-xs text-gray-400 block mb-1">Unit Selling Price (GYD)</label><input type="number" min="0" value={newInvPrice} onChange={e=>setNewInvPrice(e.target.value)} placeholder="15000" className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none focus:border-red-600" required /></div>
                      </div>
                      <button type="submit" className="w-full bg-red-600 text-white py-2 rounded font-bold text-xs tracking-wider uppercase mt-2 hover:bg-red-500 transition-colors">Publish Asset to Database</button>
                    </form>
                  </div>

                  {/* CURRENT STOCK TABLE MATRIX DISPLAY */}
                  <div className="xl:col-span-2 bg-[#161616] border border-[#262626] rounded-xl overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="p-4 bg-[#121212] border-b border-[#262626] font-bold text-xs uppercase tracking-wider text-gray-400">Current Storage On-Hand Matrix</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#262626] bg-[#111] text-xs text-gray-400">
                              <th className="p-3">SKU Code</th>
                              <th className="p-3">Title Description</th>
                              <th className="p-3">Available Stock Volume</th>
                              <th className="p-3">Price Point</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#222]">
                            {inventory.filter(i=>i.branch_id===selectedBranch).length === 0 ? (
                              <tr><td colSpan={4} className="text-center py-8 text-gray-500 text-xs">No warehouse stock catalogued here.</td></tr>
                            ) : (
                              inventory.filter(i=>i.branch_id===selectedBranch).map(item => (
                                <tr key={item.id} className="hover:bg-[#1A1A1A]/40 transition-colors">
                                  <td className="p-3 font-mono text-xs text-gray-500">{item.sku}</td>
                                  <td className="p-3 font-bold text-white">{item.name}</td>
                                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${item.stock <= 5 ? 'bg-red-950 text-red-400 border border-red-900/40':'bg-zinc-800 text-zinc-300'}`}>{item.stock} units</span></td>
                                  <td className="p-3 text-white font-medium font-mono text-xs">{formatMoney(item.price_gyd)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* HISTORICAL REMOVAL AND AUDIT TRACKING LOGS SECTION */}
                <div className="bg-[#161616] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-[#121212] border-b border-[#262626] flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-gray-400">
                    <History size={14} className="text-red-500"/> Real-time Operational Removal & Auditing History Log
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#262626] bg-[#111] text-gray-400 uppercase tracking-wider text-[10px]">
                          <th className="p-3">Timestamp Signature</th>
                          <th className="p-3">Catalog Item Description</th>
                          <th className="p-3">SKU Identifier</th>
                          <th className="p-3">Transaction Ingestion Node</th>
                          <th className="p-3 text-right">Deduction / Addition Magnitude</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222] font-mono text-xs">
                        {inventoryLogs.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-8 text-gray-600">No storage modifications recorded across the database cluster stack yet.</td></tr>
                        ) : (
                          inventoryLogs.map(log => (
                            <tr key={log.id} className="hover:bg-[#1A1A1A]/30 transition-colors">
                              <td className="p-3 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                              <td className="p-3 text-white font-sans font-semibold text-sm">{log.item_name}</td>
                              <td className="p-3 text-zinc-400 font-bold">{log.sku}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${log.action_type==='CHECKOUT'?'bg-amber-950/80 text-amber-400 border border-amber-900/30':'bg-emerald-950/80 text-emerald-400 border border-emerald-900/30'}`}>
                                  {log.action_type === 'CHECKOUT' ? 'TAKEN OUT / SOLD' : 'RESTOCKED / INGESTED'}
                                </span>
                              </td>
                              <td className={`p-3 text-right font-black text-sm ${log.quantity_changed < 0 ? 'text-red-400':'text-emerald-400'}`}>
                                {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
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

            {/* TAB CONTENT: SECURITY ARCHITECTURE PANEL */}
            {activeTab === 'security' && (
              <div className="max-w-md mx-auto bg-[#161616] border border-[#262626] p-6 rounded-xl shadow-xl">
                {!securityGateUnlocked ? (
                  <form onSubmit={verifyMasterGate} className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-bold text-white text-sm uppercase tracking-wider">Elevated Access Authorization</h3>
                      <p className="text-xs text-gray-500 mt-1">Provide master encryption key to authorize changes</p>
                    </div>
                    {masterPasswordError && <p className="text-xs text-red-500 bg-red-950/20 p-2 rounded border border-red-900/40 text-center">{masterPasswordError}</p>}
                    <input type="password" placeholder="Enter System Master Key" value={masterPasswordInput} onChange={e=>setMasterPasswordInput(e.target.value)} className="w-full bg-[#1A1A1A] border border-[#333] p-2 rounded text-center text-white outline-none focus:border-red-600 text-sm" required />
                    <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors">Verify Credentials</button>
                  </form>
                ) : (
                  <form onSubmit={provisionNewUser} className="space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400 mb-2">Create New System Operator Key</h3>
                    <div><label className="text-xs text-gray-400 block mb-1">Username Handle</label><input type="text" placeholder="e.g. jdoe" value={regUsername} onChange={e=>setRegUsername(e.target.value)} className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none" required /></div>
                    <div><label className="text-xs text-gray-400 block mb-1">Secret Login Passphrase Pin</label><input type="password" placeholder="••••••••" value={regPassword} onChange={e=>setRegPassword(e.target.value)} className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none" required /></div>
                    <div><label className="text-xs text-gray-400 block mb-1">Operator Full Name Description</label><input type="text" placeholder="e.g. John Doe" value={regFullName} onChange={e=>setRegFullName(e.target.value)} className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none" required /></div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Account Authorization Tier Role</label>
                      <select value={regRole} onChange={e=>setRegRole(e.target.value)} className="w-full bg-[#1F1F1F] border border-[#333] p-2 rounded text-sm text-white outline-none">
                        <option value="Admin">Admin (Full Control)</option>
                        <option value="Branch Manager">Branch Manager (Restricted Management)</option>
                        <option value="Front Desk Staff">Front Desk Staff (Read/POS Only)</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded font-bold text-xs uppercase tracking-wider hover:bg-emerald-500 transition-colors mt-2">Save Staff Credentials</button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}