import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function Dashboard({ onLogout, showToast, projectName, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [parts, setParts] = useState([]);
  const [pcs, setPcs] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddPC, setShowAddPC] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [editingPC, setEditingPC] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterType, setFilterType] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [newPart, setNewPart] = useState({
    type: 'cpu',
    name: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    condition: 'new',
    minStock: '2'
  });
  const [newPC, setNewPC] = useState({
    name: '',
    parts: [],
    sellingPrice: '',
    status: 'available'
  });

  // Daten aus Supabase laden
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Teile laden
      const { data: partsData, error: partsError } = await supabase
        .from('parts')
        .select('*')
        .order('created_at', { ascending: false });

      if (partsError) throw partsError;
      setParts(partsData || []);

      // PCs laden mit Teilen
      const { data: pcsData, error: pcsError } = await supabase
        .from('pcs')
        .select(`
          *,
          pc_parts (
            part_id,
            parts (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (pcsError) throw pcsError;
      
      // PCs formatieren
      const formattedPCs = (pcsData || []).map(pc => ({
        ...pc,
        parts: pc.pc_parts.map(pp => pp.parts)
      }));
      setPcs(formattedPCs);

      // Verkaufshistorie laden
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('sold_at', { ascending: false });

      if (salesError) throw salesError;
      setSalesHistory(salesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Fehler beim Laden der Daten', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const partTypes = [
    { value: 'cpu', label: 'CPU' },
    { value: 'gpu', label: 'GPU' },
    { value: 'ram', label: 'RAM' },
    { value: 'ssd', label: 'SSD' },
    { value: 'hdd', label: 'HDD' },
    { value: 'mainboard', label: 'Mainboard' },
    { value: 'psu', label: 'Netzteil' },
    { value: 'case', label: 'Gehäuse' },
    { value: 'cooler', label: 'Kühler' },
    { value: 'other', label: 'Sonstiges' }
  ];

  const getPartTypeLabel = (type) => partTypes.find(p => p.value === type)?.label || type;

  const filteredParts = parts
    .filter(part => {
      const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           getPartTypeLabel(part.type).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || part.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name': comparison = a.name.localeCompare(b.name); break;
        case 'type': comparison = a.type.localeCompare(b.type); break;
        case 'price': comparison = a.purchase_price - b.purchase_price; break;
        case 'quantity': comparison = a.quantity - b.quantity; break;
        default: comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const lowStockParts = parts.filter(p => p.quantity <= (p.min_stock || 2));

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    try {
      const partData = {
        type: newPart.type,
        name: newPart.name,
        purchase_price: parseFloat(newPart.purchasePrice),
        selling_price: parseFloat(newPart.sellingPrice),
        quantity: parseInt(newPart.quantity),
        condition: newPart.condition,
        min_stock: parseInt(newPart.minStock) || 2
      };

      if (editingPart) {
        // Update
        const { error } = await supabase
          .from('parts')
          .update(partData)
          .eq('id', editingPart.id);

        if (error) throw error;
        showToast('Teil aktualisiert!', 'success');
      } else {
        // Insert
        const { error } = await supabase
          .from('parts')
          .insert([partData]);

        if (error) throw error;
        showToast('Teil hinzugefügt!', 'success');
      }

      await loadData();
      resetPartForm();
    } catch (error) {
      console.error('Error saving part:', error);
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const resetPartForm = () => {
    setNewPart({ type: 'cpu', name: '', purchasePrice: '', sellingPrice: '', quantity: '', condition: 'new', minStock: '2' });
    setShowAddPart(false);
    setEditingPart(null);
  };

  const handleEditPart = (part) => {
    setNewPart({
      type: part.type,
      name: part.name,
      purchasePrice: part.purchase_price.toString(),
      sellingPrice: part.selling_price.toString(),
      quantity: part.quantity.toString(),
      condition: part.condition,
      minStock: (part.min_stock || 2).toString()
    });
    setEditingPart(part);
    setShowAddPart(true);
  };

  const handleDeletePart = async (id) => {
    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
      setShowConfirmDelete(null);
      showToast('Teil gelöscht!', 'success');
    } catch (error) {
      console.error('Error deleting part:', error);
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleAddPC = async (e) => {
    e.preventDefault();
    try {
      const selectedParts = newPC.parts.map(partId => parts.find(p => p.id === partId));
      const totalCost = selectedParts.reduce((sum, p) => sum + p.purchase_price, 0);
      const profit = parseFloat(newPC.sellingPrice) - totalCost;

      const pcData = {
        name: newPC.name,
        total_cost: totalCost,
        selling_price: parseFloat(newPC.sellingPrice),
        profit: profit,
        status: newPC.status
      };

      let pcId;
      if (editingPC) {
        // Update PC
        const { error } = await supabase
          .from('pcs')
          .update(pcData)
          .eq('id', editingPC.id);

        if (error) throw error;
        pcId = editingPC.id;

        // Alte Teile-Zuordnungen löschen
        await supabase
          .from('pc_parts')
          .delete()
          .eq('pc_id', pcId);
      } else {
        // Insert PC
        const { data, error } = await supabase
          .from('pcs')
          .insert([pcData])
          .select();

        if (error) throw error;
        pcId = data[0].id;
      }

      // Teile zuordnen
      const pcPartsData = newPC.parts.map(partId => ({
        pc_id: pcId,
        part_id: partId
      }));

      const { error: partsError } = await supabase
        .from('pc_parts')
        .insert(pcPartsData);

      if (partsError) throw partsError;

      await loadData();
      resetPCForm();
      showToast(editingPC ? 'PC aktualisiert!' : 'PC erstellt!', 'success');
    } catch (error) {
      console.error('Error saving PC:', error);
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const resetPCForm = () => {
    setNewPC({ name: '', parts: [], sellingPrice: '', status: 'available' });
    setShowAddPC(false);
    setEditingPC(null);
  };

  const handleEditPC = (pc) => {
    setNewPC({
      name: pc.name,
      parts: pc.parts.map(p => p.id),
      sellingPrice: pc.selling_price.toString(),
      status: pc.status
    });
    setEditingPC(pc);
    setShowAddPC(true);
  };

  const handleTogglePartSelection = (partId) => {
    if (newPC.parts.includes(partId)) {
      setNewPC({ ...newPC, parts: newPC.parts.filter(id => id !== partId) });
    } else {
      setNewPC({ ...newPC, parts: [...newPC.parts, partId] });
    }
  };

  const handleSellPC = async (pcId) => {
    try {
      const pc = pcs.find(p => p.id === pcId);
      
      // PC Status ändern
      const { error: updateError } = await supabase
        .from('pcs')
        .update({ 
          status: 'sold',
          sold_at: new Date().toISOString()
        })
        .eq('id', pcId);

      if (updateError) throw updateError;

      // Verkauf in Historie speichern
      const saleData = {
        pc_name: pc.name,
        selling_price: pc.selling_price,
        total_cost: pc.total_cost,
        profit: pc.profit
      };

      const { error: saleError } = await supabase
        .from('sales')
        .insert([saleData]);

      if (saleError) throw saleError;

      await loadData();
      showToast('PC als verkauft markiert!', 'success');
    } catch (error) {
      console.error('Error selling PC:', error);
      showToast('Fehler beim Verkaufen', 'error');
    }
  };

  const handleDeletePC = async (pcId) => {
    try {
      // Teile-Zuordnungen löschen
      await supabase
        .from('pc_parts')
        .delete()
        .eq('pc_id', pcId);

      // PC löschen
      const { error } = await supabase
        .from('pcs')
        .delete()
        .eq('id', pcId);

      if (error) throw error;
      await loadData();
      setShowConfirmDelete(null);
      showToast('PC gelöscht!', 'success');
    } catch (error) {
      console.error('Error deleting PC:', error);
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleDeleteSale = async (saleId, pcName) => {
    try {
      // Verkauf aus sales-Tabelle löschen
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (saleError) throw saleError;

      // PC-Status zurück auf "available" setzen
      const { error: pcError } = await supabase
        .from('pcs')
        .update({ 
          status: 'available',
          sold_at: null
        })
        .eq('name', pcName);

      if (pcError) throw pcError;

      await loadData();
      showToast('Verkauf gelöscht! PC ist wieder verfügbar.', 'success');
    } catch (error) {
      console.error('Error deleting sale:', error);
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const clearAllData = async () => {
    try {
      await supabase.from('pc_parts').delete().neq('id', 0);
      await supabase.from('pcs').delete().neq('id', 0);
      await supabase.from('parts').delete().neq('id', 0);
      await supabase.from('sales').delete().neq('id', 0);
      
      await loadData();
      showToast('Alle Daten gelöscht!', 'success');
    } catch (error) {
      console.error('Error clearing data:', error);
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const totalPartsValue = parts.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0);
  const totalPCValue = pcs.filter(pc => pc.status === 'available').reduce((sum, pc) => sum + pc.selling_price, 0);
  const totalProfit = pcs.filter(pc => pc.status === 'sold').reduce((sum, pc) => sum + pc.profit, 0);
  const soldPCs = pcs.filter(pc => pc.status === 'sold').length;
  const availablePCs = pcs.filter(pc => pc.status === 'available').length;

  const navItems = [
    { id: 'overview', label: 'Übersicht', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    )},
    { id: 'parts', label: 'Teile', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    )},
    { id: 'builds', label: 'Builds', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    )},
    { id: 'history', label: 'Historie', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )},
    { id: 'stats', label: 'Statistik', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    )}
  ];

  const ConfirmDeleteModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg text-[var(--vintage-charcoal)] mb-4">{title}</h3>
        <p className="text-sm text-[var(--vintage-gray)] mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-sm rounded hover:bg-[var(--vintage-beige)] transition-colors">
            Abbrechen
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
            Löschen
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--vintage-cream)]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-[var(--vintage-brown)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[var(--vintage-gray)]">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--vintage-cream)]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--vintage-beige)] border-b border-[var(--vintage-border)] z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Projects
            </button>
            <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
            <h1 className="text-lg text-[var(--vintage-charcoal)] truncate" style={{ fontFamily: 'Georgia, serif' }}>
              {projectName || 'PC Manager'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] p-4" onClick={e => e.stopPropagation()}>
            <nav className="space-y-2 mt-12">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm rounded transition-colors flex items-center gap-3 ${
                    activeTab === item.id
                      ? 'bg-[var(--vintage-brown)] text-white'
                      : 'text-[var(--vintage-brown)] hover:bg-[var(--vintage-brown)]/10'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-8 pt-4 border-t border-[var(--vintage-border)]">
              <button
                onClick={onLogout}
                className="w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
              >
                Abmelden
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        <div className="p-4 border-b border-[var(--vintage-border)] flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={onBack}
                className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Projects
              </button>
              <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
              <h1 className="text-lg text-[var(--vintage-charcoal)] tracking-wide truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {projectName || 'PC Manager'}
              </h1>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </>
              )}
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-2.5 text-sm rounded transition-colors flex items-center gap-3 ${
                activeTab === item.id
                  ? 'bg-[var(--vintage-brown)] text-white'
                  : 'text-[var(--vintage-brown)] hover:bg-[var(--vintage-brown)]/10'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <span>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--vintage-border)]">
          <button
            onClick={onLogout}
            className={`w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors ${sidebarCollapsed ? 'justify-center flex' : ''}`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {sidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            ) : 'Abmelden'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto">
        {/* Low Stock Alert Banner */}
        {lowStockParts.length > 0 && activeTab !== 'parts' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span className="text-sm font-medium">Niedriger Bestand: {lowStockParts.length} Teil(e) benötigen Nachschub</span>
              <button onClick={() => setActiveTab('parts')} className="ml-auto text-xs underline hover:no-underline">
                Anzeigen →
              </button>
            </div>
          </div>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl text-[var(--vintage-charcoal)] mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Übersicht
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Teile</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{parts.reduce((sum, p) => sum + p.quantity, 0)}</p>
                <p className="text-sm text-[var(--vintage-gray)] mt-1">{totalPartsValue.toFixed(2)} €</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Verfügbar</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{availablePCs}</p>
                <p className="text-sm text-[var(--vintage-gray)] mt-1">{totalPCValue.toFixed(2)} €</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Verkauft</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{soldPCs}</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Gewinn</p>
                <p className="text-2xl text-[var(--vintage-olive)]">{totalProfit.toFixed(2)} €</p>
              </div>
            </div>
            {pcs.length > 0 && (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-sm uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Letzte Builds</h3>
                <div className="space-y-3">
                  {pcs.slice(-5).reverse().map(pc => (
                    <div key={pc.id} className="flex items-center justify-between py-2 border-b border-[var(--vintage-border)] last:border-0">
                      <span className="text-[var(--vintage-charcoal)]">{pc.name}</span>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded ${pc.status === 'available' ? 'bg-[var(--vintage-olive)]/10 text-[var(--vintage-olive)]' : 'bg-[var(--vintage-gray)]/10 text-[var(--vintage-gray)]'}`}>
                          {pc.status === 'available' ? 'Verfügbar' : 'Verkauft'}
                        </span>
                        <span className="text-[var(--vintage-brown)]">{pc.selling_price.toFixed(2)} €</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Parts */}
        {activeTab === 'parts' && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                PC-Teile
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm w-40"
                  style={{ fontFamily: 'Georgia, serif' }}
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm w-40 cursor-pointer"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  <option value="all">Alle Typen</option>
                  {partTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddPart(true)}
                  className="px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  + Hinzufügen
                </button>
              </div>
            </div>

            {/* Add/Edit Part Modal */}
            {(showAddPart || editingPart) && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg text-[var(--vintage-charcoal)] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                    {editingPart ? 'Teil bearbeiten' : 'Neues Teil'}
                  </h3>
                  <form onSubmit={handleAddPart} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Typ</label>
                      <select
                        value={newPart.type}
                        onChange={(e) => setNewPart({...newPart, type: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                      >
                        {partTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Name</label>
                      <input
                        type="text"
                        value={newPart.name}
                        onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Einkauf €</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newPart.purchasePrice}
                          onChange={(e) => setNewPart({...newPart, purchasePrice: e.target.value})}
                          className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Verkauf €</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newPart.sellingPrice}
                          onChange={(e) => setNewPart({...newPart, sellingPrice: e.target.value})}
                          className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Menge</label>
                        <input
                          type="number"
                          value={newPart.quantity}
                          onChange={(e) => setNewPart({...newPart, quantity: e.target.value})}
                          className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Min. Bestand</label>
                        <input
                          type="number"
                          value={newPart.minStock}
                          onChange={(e) => setNewPart({...newPart, minStock: e.target.value})}
                          className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Zustand</label>
                      <select
                        value={newPart.condition}
                        onChange={(e) => setNewPart({...newPart, condition: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                      >
                        <option value="new">Neu</option>
                        <option value="used">Gebraucht</option>
                        <option value="refurbished">Aufbereitet</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={resetPartForm}
                        className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-sm rounded hover:bg-[var(--vintage-beige)] transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                      >
                        {editingPart ? 'Speichern' : 'Hinzufügen'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="bg-white border border-[var(--vintage-border)] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--vintage-beige)]">
                    <tr>
                      <th onClick={() => handleSort('type')} className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3 cursor-pointer hover:bg-[var(--vintage-cream)]">
                        Typ {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('name')} className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3 cursor-pointer hover:bg-[var(--vintage-cream)]">
                        Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('price')} className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3 cursor-pointer hover:bg-[var(--vintage-cream)]">
                        Einkauf {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Verkauf</th>
                      <th onClick={() => handleSort('quantity')} className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3 cursor-pointer hover:bg-[var(--vintage-cream)]">
                        Menge {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Gewinn</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map(part => (
                      <tr key={part.id} className={`border-t border-[var(--vintage-border)] ${part.quantity <= (part.min_stock || 2) ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-brown)]">{getPartTypeLabel(part.type)}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-charcoal)]">{part.name}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{part.purchase_price.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{part.selling_price.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={part.quantity <= (part.min_stock || 2) ? 'text-red-600 font-medium' : 'text-[var(--vintage-gray)]'}>
                            {part.quantity}
                            {part.quantity <= (part.min_stock || 2) && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                              </svg>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-olive)]">+{(part.selling_price - part.purchase_price).toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPart(part)}
                              className="text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => setShowConfirmDelete({ type: 'part', id: part.id, name: part.name })}
                              className="text-[var(--vintage-gray)] hover:text-red-600 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredParts.length === 0 && (
                <p className="text-center py-8 text-[var(--vintage-gray)] text-sm">
                  {searchQuery || filterType !== 'all' ? 'Keine Teile gefunden' : 'Noch keine Teile hinzugefügt'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Builds */}
        {activeTab === 'builds' && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                PC-Builds
              </h2>
              <button
                onClick={() => setShowAddPC(true)}
                className="px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                + PC erstellen
              </button>
            </div>

            {/* Add/Edit PC Modal */}
            {(showAddPC || editingPC) && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                  <h3 className="text-lg text-[var(--vintage-charcoal)] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                    {editingPC ? 'PC bearbeiten' : 'Neuen PC zusammenstellen'}
                  </h3>
                  <form onSubmit={handleAddPC} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Name</label>
                      <input
                        type="text"
                        value={newPC.name}
                        onChange={(e) => setNewPC({...newPC, name: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-2">Teile auswählen</label>
                      <div className="border border-[var(--vintage-border)] rounded divide-y divide-[var(--vintage-border)] max-h-48 overflow-y-auto">
                        {parts.filter(p => p.quantity > 0).map(part => (
                          <label
                            key={part.id}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--vintage-beige)] transition-colors ${
                              newPC.parts.includes(part.id) ? 'bg-[var(--vintage-beige)]' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={newPC.parts.includes(part.id)}
                              onChange={() => handleTogglePartSelection(part.id)}
                              className="accent-[var(--vintage-brown)]"
                            />
                            <span className="flex-1 text-sm text-[var(--vintage-charcoal)]">{part.name}</span>
                            <span className="text-xs text-[var(--vintage-gray)]">{getPartTypeLabel(part.type)}</span>
                            <span className="text-sm text-[var(--vintage-brown)]">{part.purchase_price.toFixed(2)} €</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[var(--vintage-beige)] rounded p-3">
                      <p className="text-sm text-[var(--vintage-charcoal)]">
                        Gesamtkosten: <strong>{newPC.parts.reduce((sum, id) => {
                          const part = parts.find(p => p.id === id);
                          return sum + (part ? part.purchase_price : 0);
                        }, 0).toFixed(2)} €</strong>
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Verkaufspreis €</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newPC.sellingPrice}
                        onChange={(e) => setNewPC({...newPC, sellingPrice: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={resetPCForm}
                        className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-sm rounded hover:bg-[var(--vintage-beige)] transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                      >
                        {editingPC ? 'Speichern' : 'Erstellen'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pcs.map(pc => (
                <div key={pc.id} className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>{pc.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${pc.status === 'available' ? 'bg-[var(--vintage-olive)]/10 text-[var(--vintage-olive)]' : 'bg-[var(--vintage-gray)]/10 text-[var(--vintage-gray)]'}`}>
                      {pc.status === 'available' ? 'Verfügbar' : 'Verkauft'}
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-2">Teile</p>
                    <ul className="text-sm text-[var(--vintage-charcoal)] space-y-1">
                      {pc.parts.map(part => (
                        <li key={part.id} className="flex justify-between">
                          <span>{part.name}</span>
                          <span className="text-[var(--vintage-gray)]">{getPartTypeLabel(part.type)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-[var(--vintage-border)] pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--vintage-gray)]">Kosten</span>
                      <span>{pc.total_cost.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--vintage-gray)]">Verkauf</span>
                      <span>{pc.selling_price.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-[var(--vintage-olive)]">Gewinn</span>
                      <span className="text-[var(--vintage-olive)]">+{pc.profit.toFixed(2)} €</span>
                    </div>
                    {pc.sold_at && (
                      <p className="text-xs text-[var(--vintage-gray)] pt-2">
                        Verkauft: {new Date(pc.sold_at).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--vintage-border)]">
                    <button
                      onClick={() => handleEditPC(pc)}
                      className="px-3 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-xs rounded hover:bg-[var(--vintage-beige)] transition-colors"
                    >
                      Bearbeiten
                    </button>
                    {pc.status === 'available' && (
                      <button
                        onClick={() => handleSellPC(pc.id)}
                        className="flex-1 px-3 py-2 bg-[var(--vintage-olive)] text-white text-xs rounded hover:bg-[var(--vintage-olive-light)] transition-colors"
                      >
                        Verkaufen
                      </button>
                    )}
                    <button
                      onClick={() => setShowConfirmDelete({ type: 'pc', id: pc.id, name: pc.name })}
                      className="px-3 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-xs rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
              {pcs.length === 0 && (
                <div className="col-span-full text-center py-12 text-[var(--vintage-gray)]">
                  Noch keine PCs erstellt
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl text-[var(--vintage-charcoal)] mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Verkaufshistorie
            </h2>
            {salesHistory.length > 0 ? (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[var(--vintage-beige)]">
                    <tr>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Datum</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">PC</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Kosten</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Verkauf</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Gewinn</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.slice().reverse().map(sale => (
                      <tr key={sale.id} className="border-t border-[var(--vintage-border)]">
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">
                          {new Date(sale.sold_at).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-charcoal)]">{sale.pc_name}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{sale.total_cost.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{sale.selling_price.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-olive)]">+{sale.profit.toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteSale(sale.id, sale.pc_name)}
                            className="text-[var(--vintage-gray)] hover:text-red-600 transition-colors"
                            title="Verkauf löschen"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-12 text-[var(--vintage-gray)]">Noch keine Verkäufe</p>
            )}
          </div>
        )}

        {/* Stats */}
        {activeTab === 'stats' && (
          <div>
            <h2 className="text-2xl text-[var(--vintage-charcoal)] mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Statistik
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Inventar</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Teile gesamt</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{parts.reduce((sum, p) => sum + p.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Wert Inventar</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{totalPartsValue.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Verfügbare PCs</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{availablePCs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Wert PCs</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{totalPCValue.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Verkäufe</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Verkaufte PCs</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{soldPCs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Gesamtgewinn</span>
                    <span className="text-sm text-[var(--vintage-olive)]">{totalProfit.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Ø Gewinn/PC</span>
                    <span className="text-sm text-[var(--vintage-olive)]">
                      {soldPCs > 0 ? (totalProfit / soldPCs).toFixed(2) : '0.00'} €
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Typen</h3>
                <div className="space-y-2">
                  {partTypes.map(type => {
                    const count = parts.filter(p => p.type === type.value).reduce((sum, p) => sum + p.quantity, 0);
                    if (count === 0) return null;
                    return (
                      <div key={type.value} className="flex justify-between">
                        <span className="text-sm text-[var(--vintage-charcoal)]">{type.label}</span>
                        <span className="text-sm text-[var(--vintage-brown)]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <ConfirmDeleteModal
          title={`${showConfirmDelete.type === 'part' ? 'Teil' : 'PC'} löschen`}
          message={`Möchten Sie "${showConfirmDelete.name}" wirklich löschen?`}
          onConfirm={() => showConfirmDelete.type === 'part' ? handleDeletePart(showConfirmDelete.id) : handleDeletePC(showConfirmDelete.id)}
          onCancel={() => setShowConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;