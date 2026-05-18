'use client';

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';

// Define the Member structure for TypeScript
interface Member {
  id: string;
  name: string;
  membership_type: 'Regular' | 'VIP';
  card_number: string;
  phone_number: string;
  expiry_date: string;
  branch_location: string;
}

export default function LyftGymDashboard() {
  // Authentication & Navigation States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'register'>('members');
  
  // App Operational States
  const [selectedBranch, setSelectedBranch] = useState('Downtown');
  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Registration Form States
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Regular' | 'VIP'>('Regular');
  const [newCard, setNewCard] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  // Handle Login Authentication against Supabase system_users table
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
      setLoginError('Database connection error. Check your RLS settings.');
    }
  };

  // Fetch members matching the currently selected branch
  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('branch_location', selectedBranch);
    
    if (!error && data) {
      setMembers(data);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchMembers();
    }
  }, [selectedBranch, isLoggedIn]);

  // Submit new registration to Supabase
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCard) return alert('Name and Card Number are required.');

    const { error } = await supabase.from('members').insert([{
      name: newName,
      membership_type: newType,
      card_number: newCard,
      phone_number: newPhone,
      expiry_date: newExpiry,
      branch_location: selectedBranch
    }]);

    if (error) {
      alert('Error registering member: ' + error.message);
    } else {
      // Clear form inputs & redirect to dashboard view
      setNewName('');
      setNewCard('');
      setNewPhone('');
      setNewExpiry('');
      setActiveTab('members');
      fetchMembers();
    }
  };

  // Inline Real-Time Save Handlers
  const handleInlineSave = async (id: string, updatedField: Partial<Member>) => {
    const { error } = await supabase
      .from('members')
      .update(updatedField)
      .eq('id', id);

    if (error) {
      alert('Failed to update: ' + error.message);
    } else {
      setMembers(members.map(m => m.id === id ? { ...m, ...updatedField } : m));
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('Are you sure you want to cancel this membership profile?')) {
      await supabase.from('members').delete().eq('id', id);
      fetchMembers();
    }
  };

  // --- RENDER LOGIN GATE ---
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
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition tracking-wide uppercase text-sm mt-2 shadow-lg shadow-red-600/10">Authorize Terminal</button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APPLICATION DASHBOARD ---
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Global Navigation Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-black text-2xl tracking-tighter">LYFT</span>
          <span className="text-zinc-400 font-light text-xl">NETWORK CLOUD</span>
        </div>
        
        {/* Branch Selector Switch */}
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Active Branch:</label>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 font-medium">
            <option value="Downtown">Downtown Main</option>
            <option value="Northside">Northside Elite</option>
            <option value="WestEnd">West End Center</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 space-y-2">
          <button onClick={() => setActiveTab('members')} className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${activeTab === 'members' ? 'bg-red-600 text-white shadow-lg shadow-red-600/10' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>
            👥 Members Directory
          </button>
          <button onClick={() => setActiveTab('register')} className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${activeTab === 'register' ? 'bg-red-600 text-white shadow-lg shadow-red-600/10' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>
            📝 Register New Member
          </button>
          <hr className="border-zinc-800 my-4" />
          <button onClick={() => setIsLoggedIn(false)} className="w-full text-left px-4 py-3 rounded-xl font-medium text-zinc-500 hover:bg-red-950/20 hover:text-red-400 transition">
            🔒 Disconnect Terminal
          </button>
        </nav>

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-6 md:p-8">
          
          {/* TAB 1: MEMBERS DIRECTORY VIEW WITH INLINE EDITING */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{selectedBranch} Roster</h1>
                  <p className="text-sm text-zinc-400">Manage, modify, and monitor active database entries in real time.</p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-400 font-bold">
                        <th className="py-4 px-6">Full Name</th>
                        <th className="py-4 px-6">Tier</th>
                        <th className="py-4 px-6">Access Card #</th>
                        <th className="py-4 px-6">Phone System</th>
                        <th className="py-4 px-6">Expiry Cycle</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-sm">
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-zinc-500 italic">No registered members found at this branch location.</td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr key={member.id} className="hover:bg-zinc-800/30 transition">
                            {/* Inline Editable Name */}
                            <td className="py-4 px-6">
                              <input type="text" defaultValue={member.name} onBlur={(e) => handleInlineSave(member.id, { name: e.target.value })} className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-red-600 focus:bg-zinc-950 px-1 py-0.5 rounded text-zinc-100 focus:outline-none transition font-medium w-full" />
                            </td>
                            {/* Inline Editable Membership Type Dropdown */}
                            <td className="py-4 px-6">
                              <select defaultValue={member.membership_type} onChange={(e) => handleInlineSave(member.id, { membership_type: e.target.value as 'Regular' | 'VIP' })} className="bg-transparent hover:bg-zinc-800 border-none font-semibold focus:ring-1 focus:ring-red-600 rounded px-1 text-zinc-300 focus:outline-none">
                                <option value="Regular" className="bg-zinc-900">Regular</option>
                                <option value="VIP" className="bg-zinc-900 text-yellow-500">★ VIP</option>
                              </select>
                            </td>
                            {/* Inline Editable Card Number */}
                            <td className="py-4 px-6 font-mono text-zinc-300">
                              <input type="text" defaultValue={member.card_number} onBlur={(e) => handleInlineSave(member.id, { card_number: e.target.value })} className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-red-600 focus:bg-zinc-950 px-1 py-0.5 rounded w-full focus:outline-none font-mono" />
                            </td>
                            {/* Inline Editable Phone Number */}
                            <td className="py-4 px-6 text-zinc-300">
                              <input type="text" defaultValue={member.phone_number} onBlur={(e) => handleInlineSave(member.id, { phone_number: e.target.value })} className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-red-600 focus:bg-zinc-950 px-1 py-0.5 rounded w-full focus:outline-none" />
                            </td>
                            {/* Inline Editable Expiry Date */}
                            <td className="py-4 px-6">
                              <input type="date" defaultValue={member.expiry_date} onChange={(e) => handleInlineSave(member.id, { expiry_date: e.target.value })} className="bg-transparent hover:bg-zinc-800 border-none rounded text-zinc-300 focus:outline-none p-1" />
                            </td>
                            {/* Action Operations */}
                            <td className="py-4 px-6 text-center">
                              <button onClick={() => handleDeleteMember(member.id)} className="text-zinc-500 hover:text-red-400 p-1 transition" title="Revoke Profile">
                                🗑️ Delete
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

          {/* TAB 2: SYSTEM REGISTRATION PORTAL */}
          {activeTab === 'register' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Register System Asset</h1>
                <p className="text-sm text-zinc-400">Deploy a new access profile straight into the active database infrastructure for <strong>{selectedBranch}</strong>.</p>
              </div>

              <form onSubmit={handleRegister} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Full Legal Name</label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-600 transition" placeholder="e.g. John Doe" required />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Membership Status Tier</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value as 'Regular' | 'VIP')} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-600 transition font-medium">
                      <option value="Regular">Regular Class Access</option>
                      <option value="VIP">VIP Priority Pass</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">RFID Access Card String</label>
                    <input type="text" value={newCard} onChange={(e) => setNewCard(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-600 transition font-mono" placeholder="e.g. LYFT-4892A" required />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Contact Telephone</label>
                    <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-600 transition" placeholder="e.g. +1 (555) 019-2834" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">Contract Term Expiration Date</label>
                  <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-600 transition" />
                </div>

                <div className="pt-2">
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition tracking-wide uppercase text-xs shadow-md shadow-red-600/10">
                    Commit Registration File
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
