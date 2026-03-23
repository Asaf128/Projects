import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function VintedKlamotten({ onLogout, showToast, projectName, onBack }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [clothes, setClothes] = useState([])
  const [salesHistory, setSalesHistory] = useState([])
  const [categories, setCategories] = useState([])
  const [sizes, setSizes] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterSize, setFilterSize] = useState('all')
  const [filterBrand, setFilterBrand] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    name: '',
    category_id: '',
    size_id: '',
    brand_id: '',
    condition: 'neuwertig',
    purchase_price: '',
    selling_price: '',
    status: 'verfügbar'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Kleidung laden mit Kategorie, Größe und Marke
      const { data: clothesData, error: clothesError } = await supabase
        .from('clothes')
        .select(`
          *,
          categories(name),
          sizes(name),
          brands(name)
        `)
        .order('created_at', { ascending: false })

      if (clothesError) throw clothesError
      setClothes(clothesData || [])

      // Verkaufshistorie laden (separate vinted_sales Tabelle)
      const { data: salesData, error: salesError } = await supabase
        .from('vinted_sales')
        .select('*, categories(name), brands(name), sizes(name)')
        .order('sold_at', { ascending: false })

      if (salesError) throw salesError
      setSalesHistory(salesData || [])

      // Kategorien laden
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Größen laden
      const { data: sizesData, error: sizesError } = await supabase
        .from('sizes')
        .select('*')
        .order('name', { ascending: true })

      if (sizesError) throw sizesError
      setSizes(sizesData || [])

      // Marken laden
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true })

      if (brandsError) throw brandsError
      setBrands(brandsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Fehler beim Laden der Daten', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    try {
      const itemData = {
        name: newItem.name,
        category_id: parseInt(newItem.category_id),
        size_id: parseInt(newItem.size_id),
        brand_id: newItem.brand_id ? parseInt(newItem.brand_id) : null,
        condition: newItem.condition,
        purchase_price: parseFloat(newItem.purchase_price),
        selling_price: parseFloat(newItem.selling_price),
        status: newItem.status
      }

      if (editingItem) {
        const { error } = await supabase
          .from('clothes')
          .update(itemData)
          .eq('id', editingItem.id)

        if (error) throw error
        showToast('Kleidungsstück aktualisiert!', 'success')
      } else {
        const { error } = await supabase
          .from('clothes')
          .insert([itemData])

        if (error) throw error
        showToast('Kleidungsstück hinzugefügt!', 'success')
      }
      
      await loadData()
      resetForm()
    } catch (error) {
      console.error('Error saving item:', error)
      showToast('Fehler beim Speichern', 'error')
    }
  }

  const resetForm = () => {
    setNewItem({
      name: '',
      category_id: '',
      size_id: '',
      brand_id: '',
      condition: 'neuwertig',
      purchase_price: '',
      selling_price: '',
      status: 'verfügbar'
    })
    setShowAddForm(false)
    setEditingItem(null)
  }

  const handleEditItem = (item) => {
    setNewItem({
      name: item.name,
      category_id: item.category_id?.toString() || '',
      size_id: item.size_id?.toString() || '',
      brand_id: item.brand_id?.toString() || '',
      condition: item.condition,
      purchase_price: item.purchase_price?.toString() || '',
      selling_price: item.selling_price?.toString() || '',
      status: item.status
    })
    setEditingItem(item)
    setShowAddForm(true)
  }

  const handleDeleteItem = async (id) => {
    try {
      const { error } = await supabase
        .from('clothes')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadData()
      showToast('Kleidungsstück gelöscht!', 'success')
    } catch (error) {
      console.error('Error deleting item:', error)
      showToast('Fehler beim Löschen', 'error')
    }
  }

  const handleMarkAsSold = async (id, sellingPrice) => {
    try {
      const item = clothes.find(c => c.id === id)
      
      const { error: updateError } = await supabase
        .from('clothes')
        .update({ status: 'verkauft' })
        .eq('id', id)

      if (updateError) throw updateError

      // Verkauf in vinted_sales-Tabelle einfügen
      const { error: saleError } = await supabase
        .from('vinted_sales')
        .insert([{
          item_name: item.name,
          selling_price: sellingPrice,
          purchase_price: item.purchase_price,
          profit: sellingPrice - item.purchase_price,
          category_id: item.category_id,
          brand_id: item.brand_id,
          size_id: item.size_id,
          condition: item.condition
        }])

      if (saleError) throw saleError

      await loadData()
      showToast('Als verkauft markiert!', 'success')
    } catch (error) {
      console.error('Error marking as sold:', error)
      showToast('Fehler beim Markieren', 'error')
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Filter und Sortierung
  const filteredClothes = clothes
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'all' || item.category_id === parseInt(filterCategory)
      const matchesSize = filterSize === 'all' || item.size_id === parseInt(filterSize)
      const matchesBrand = filterBrand === 'all' || item.brand_id === parseInt(filterBrand)
      return matchesSearch && matchesCategory && matchesSize && matchesBrand
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name': comparison = a.name.localeCompare(b.name); break
        case 'category': comparison = (a.categories?.name || '').localeCompare(b.categories?.name || ''); break
        case 'price': comparison = a.purchase_price - b.purchase_price; break
        case 'created_at': comparison = new Date(a.created_at) - new Date(b.created_at); break
        default: comparison = 0
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Statistiken berechnen
  const availableItems = clothes.filter(item => item.status === 'verfügbar')
  const soldItems = clothes.filter(item => item.status === 'verkauft')
  
  // Investment = nur Kleidung im Bestand
  const totalInvestment = availableItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0)
  const totalProfit = soldItems.reduce((sum, item) => sum + ((item.selling_price || 0) - (item.purchase_price || 0)), 0)
  const totalRevenue = salesHistory.reduce((sum, sale) => sum + (sale.selling_price || 0), 0)

  // Navigations-Elemente
  const navItems = [
    { id: 'overview', label: 'Übersicht', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    )},
    { id: 'clothes', label: 'Klamotten', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
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
  ]

  if (loading) {
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
    )
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
              {projectName || 'Vinted Klamotten'}
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
                {projectName || 'Vinted Klamotten'}
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
        {/* Overview */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl text-[var(--vintage-charcoal)] mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Übersicht
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Bestand</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{availableItems.length}</p>
                <p className="text-sm text-[var(--vintage-gray)] mt-1">{totalInvestment.toFixed(2)} €</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Verkauft</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{soldItems.length}</p>
                <p className="text-sm text-[var(--vintage-gray)] mt-1">{totalRevenue.toFixed(2)} €</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Gesamtanzahl</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{clothes.length}</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Gewinn</p>
                <p className="text-2xl text-[var(--vintage-olive)]">+{totalProfit.toFixed(2)} €</p>
              </div>
            </div>
            {clothes.length > 0 && (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-sm uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Letzte Einträge</h3>
                <div className="space-y-3">
                  {clothes.slice(-5).reverse().map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--vintage-border)] last:border-0">
                      <span className="text-[var(--vintage-charcoal)]">{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded ${item.status === 'verfügbar' ? 'bg-[var(--vintage-olive)]/10 text-[var(--vintage-olive)]' : 'bg-[var(--vintage-gray)]/10 text-[var(--vintage-gray)]'}`}>
                          {item.status === 'verfügbar' ? 'Verfügbar' : 'Verkauft'}
                        </span>
                        <span className="text-[var(--vintage-brown)]">{item.purchase_price?.toFixed(2)} €</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clothes */}
        {activeTab === 'clothes' && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                Kleidungsstücke
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
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm w-40 cursor-pointer"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  <option value="all">Alle Kategorien</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                  className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm w-40 cursor-pointer"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  <option value="all">Alle Größen</option>
                  {sizes.map(size => (
                    <option key={size.id} value={size.id}>{size.name}</option>
                  ))}
                </select>
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm w-40 cursor-pointer"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  <option value="all">Alle Marken</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  + Hinzufügen
                </button>
              </div>
            </div>

            {/* Add/Edit Form Modal */}
            {(showAddForm || editingItem) && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg text-[var(--vintage-charcoal)] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                    {editingItem ? 'Kleidungsstück bearbeiten' : 'Neues Kleidungsstück'}
                  </h3>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Name *</label>
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Kategorie *</label>
                      <select
                        value={newItem.category_id}
                        onChange={(e) => setNewItem({...newItem, category_id: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                        required
                      >
                        <option value="">Wählen...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Größe *</label>
                      <select
                        value={newItem.size_id}
                        onChange={(e) => setNewItem({...newItem, size_id: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                        required
                      >
                        <option value="">Wählen...</option>
                        {sizes.map(size => (
                          <option key={size.id} value={size.id}>{size.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Marke</label>
                      <select
                        value={newItem.brand_id}
                        onChange={(e) => setNewItem({...newItem, brand_id: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                      >
                        <option value="">Wählen...</option>
                        {brands.map(brand => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Zustand</label>
                      <select
                        value={newItem.condition}
                        onChange={(e) => setNewItem({...newItem, condition: e.target.value})}
                        className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                      >
                        <option value="neuwertig">Neuwertig</option>
                        <option value="sehr gut">Sehr gut</option>
                        <option value="gut">Gut</option>
                        <option value="akzeptabel">Akzeptabel</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Einkaufspreis (€) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newItem.purchase_price}
                          onChange={(e) => setNewItem({...newItem, purchase_price: e.target.value})}
                          className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Verkaufspreis (€) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newItem.selling_price}
                          onChange={(e) => setNewItem({...newItem, selling_price: e.target.value})}
                          className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-sm rounded hover:bg-[var(--vintage-beige)] transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                      >
                        {editingItem ? 'Speichern' : 'Hinzufügen'}
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
                      <th onClick={() => handleSort('name')} className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3 cursor-pointer hover:bg-[var(--vintage-cream)]">
                        Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('category')} className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3 cursor-pointer hover:bg-[var(--vintage-cream)]">
                        Kategorie {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Marke</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Größe</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Zustand</th>
                      <th onClick={() => handleSort('price')} className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3 cursor-pointer hover:bg-[var(--vintage-cream)]">
                        Einkauf {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Verkauf</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Gewinn</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClothes.map(item => (
                      <tr key={item.id} className="border-t border-[var(--vintage-border)] hover:bg-[var(--vintage-beige)]/50">
                        <td className="px-4 py-3 text-sm text-[var(--vintage-charcoal)]">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.categories?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.brands?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.sizes?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.condition}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.purchase_price?.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.selling_price?.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-olive)]">+{((item.selling_price || 0) - (item.purchase_price || 0)).toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${item.status === 'verfügbar' ? 'bg-[var(--vintage-olive)]/10 text-[var(--vintage-olive)]' : 'bg-[var(--vintage-gray)]/10 text-[var(--vintage-gray)]'}`}>
                            {item.status === 'verfügbar' ? 'Verfügbar' : 'Verkauft'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {item.status === 'verfügbar' && (
                              <button
                                onClick={() => handleMarkAsSold(item.id, item.selling_price)}
                                className="text-[var(--vintage-olive)] hover:text-[var(--vintage-olive-light)] transition-colors"
                                title="Als verkauft markieren"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
                              title="Bearbeiten"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-[var(--vintage-gray)] hover:text-red-600 transition-colors"
                              title="Löschen"
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
              {filteredClothes.length === 0 && (
                <p className="text-center py-8 text-[var(--vintage-gray)] text-sm">
                  {searchQuery || filterCategory !== 'all' || filterSize !== 'all' || filterBrand !== 'all'
                    ? 'Keine Kleidungsstücke gefunden'
                    : 'Noch keine Kleidungsstücke hinzugefügt'}
                </p>
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
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Artikel</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Einkauf</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Verkauf</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Gewinn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map(sale => (
                      <tr key={sale.id} className="border-t border-[var(--vintage-border)]">
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">
                          {new Date(sale.sold_at).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-charcoal)]">{sale.item_name}</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{sale.purchase_price?.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{sale.selling_price?.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-olive)]">+{sale.profit?.toFixed(2)} €</td>
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
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Bestand</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Artikel im Bestand</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{availableItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Investition (Bestand)</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{totalInvestment.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Potenzieller Umsatz</span>
                    <span className="text-sm text-[var(--vintage-brown)]">
                      {availableItems.reduce((sum, item) => sum + (item.selling_price || 0), 0).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Verkäufe</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Verkaufte Artikel</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{soldItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Gesamtumsatz</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{totalRevenue.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Gesamtgewinn</span>
                    <span className="text-sm text-[var(--vintage-olive)]">+{totalProfit.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Ø Gewinn/Artikel</span>
                    <span className="text-sm text-[var(--vintage-olive)]">
                      {soldItems.length > 0 ? (totalProfit / soldItems.length).toFixed(2) : '0.00'} €
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Kategorien</h3>
                <div className="space-y-2">
                  {categories.map(cat => {
                    const count = clothes.filter(c => c.category_id === cat.id).length
                    if (count === 0) return null
                    return (
                      <div key={cat.id} className="flex justify-between">
                        <span className="text-sm text-[var(--vintage-charcoal)]">{cat.name}</span>
                        <span className="text-sm text-[var(--vintage-brown)]">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default VintedKlamotten