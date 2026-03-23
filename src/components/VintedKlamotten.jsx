import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function VintedKlamotten({ onLogout, showToast, projectName, onBack }) {
  const [clothes, setClothes] = useState([])
  const [categories, setCategories] = useState([])
  const [sizes, setSizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterSize, setFilterSize] = useState('all')
  const [newItem, setNewItem] = useState({
    name: '',
    category_id: '',
    size_id: '',
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
      // Kleidung laden mit Kategorie und Größe
      const { data: clothesData, error: clothesError } = await supabase
        .from('clothes')
        .select(`
          *,
          categories(name),
          sizes(name)
        `)
        .order('created_at', { ascending: false })

      if (clothesError) throw clothesError
      setClothes(clothesData || [])

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
      const { error } = await supabase
        .from('clothes')
        .insert([{
          name: newItem.name,
          category_id: parseInt(newItem.category_id),
          size_id: parseInt(newItem.size_id),
          condition: newItem.condition,
          purchase_price: parseFloat(newItem.purchase_price),
          selling_price: parseFloat(newItem.selling_price),
          status: newItem.status
        }])

      if (error) throw error
      
      await loadData()
      setShowAddForm(false)
      setNewItem({
        name: '',
        category_id: '',
        size_id: '',
        condition: 'neuwertig',
        purchase_price: '',
        selling_price: '',
        status: 'verfügbar'
      })
      showToast('Kleidungsstück hinzugefügt!', 'success')
    } catch (error) {
      console.error('Error adding item:', error)
      showToast('Fehler beim Hinzufügen', 'error')
    }
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
      const { error } = await supabase
        .from('clothes')
        .update({ status: 'verkauft' })
        .eq('id', id)

      if (error) throw error

      // Verkauf in sales-Tabelle einfügen
      const item = clothes.find(c => c.id === id)
      await supabase
        .from('sales')
        .insert([{
          pc_name: item.name,
          selling_price: sellingPrice,
          total_cost: item.purchase_price,
          profit: sellingPrice - item.purchase_price
        }])

      await loadData()
      showToast('Als verkauft markiert!', 'success')
    } catch (error) {
      console.error('Error marking as sold:', error)
      showToast('Fehler beim Markieren', 'error')
    }
  }

  // Filter anwenden
  const filteredClothes = clothes.filter(item => {
    const categoryMatch = filterCategory === 'all' || item.category_id === parseInt(filterCategory)
    const sizeMatch = filterSize === 'all' || item.size_id === parseInt(filterSize)
    return categoryMatch && sizeMatch
  })

  const totalProfit = clothes
    .filter(item => item.status === 'verkauft')
    .reduce((sum, item) => sum + ((item.selling_price || 0) - (item.purchase_price || 0)), 0)
  const totalInvestment = clothes
    .reduce((sum, item) => sum + (item.purchase_price || 0), 0)
  const totalItems = clothes.length
  const availableItems = clothes.filter(item => item.status === 'verfügbar').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--vintage-cream)]">
        <div className="text-[var(--vintage-brown)] text-xl">Laden...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--vintage-cream)]">
      {/* Header */}
      <header className="bg-[var(--vintage-beige)] border-b border-[var(--vintage-border)] px-6 py-4">
        <div className="flex items-center justify-between">
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
            <h1 className="text-xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
              {projectName || 'Vinted Klamotten'}
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
          >
            Abmelden
          </button>
        </div>
      </header>

        {/* Stats */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--vintage-gray)]">Gesamtgewinn</div>
              <div className="text-2xl text-[var(--vintage-brown)]">€{totalProfit.toFixed(2)}</div>
            </div>
            <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--vintage-gray)]">Investment</div>
              <div className="text-2xl text-[var(--vintage-charcoal)]">€{totalInvestment.toFixed(2)}</div>
            </div>
            <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--vintage-gray)]">Gesamtanzahl</div>
              <div className="text-2xl text-[var(--vintage-charcoal)]">{totalItems}</div>
            </div>
            <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--vintage-gray)]">Verfügbar</div>
              <div className="text-2xl text-[var(--vintage-charcoal)]">{availableItems}</div>
            </div>
          </div>

        {/* Add Button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-6 px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
        >
          + Kleidung hinzufügen
        </button>

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg text-[var(--vintage-charcoal)] mb-4">Neues Kleidungsstück</h2>
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
                    <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Einkaufspreis (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.purchase_price}
                      onChange={(e) => setNewItem({...newItem, purchase_price: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Verkaufspreis (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.selling_price}
                      onChange={(e) => setNewItem({...newItem, selling_price: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-sm rounded hover:bg-[var(--vintage-beige)] transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                  >
                    Hinzufügen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Kategorie filtern</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm"
            >
              <option value="all">Alle Kategorien</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Größe filtern</label>
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm"
            >
              <option value="all">Alle Größen</option>
              {sizes.map(size => (
                <option key={size.id} value={size.id}>{size.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clothes List */}
        <div className="bg-white border border-[var(--vintage-border)] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[var(--vintage-border)]">
            <h2 className="text-lg text-[var(--vintage-charcoal)]">Kleidungsstücke ({filteredClothes.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--vintage-beige)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Name</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Kategorie</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Größe</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Zustand</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Einkauf</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Verkauf</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Gewinn</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)]">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--vintage-border)]">
                {filteredClothes.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--vintage-beige)]/50">
                    <td className="px-4 py-3 text-sm text-[var(--vintage-charcoal)]">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.categories?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.sizes?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">{item.condition}</td>
                    <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">€{item.purchase_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--vintage-gray)]">€{item.selling_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--vintage-brown)]">
                      €{((item.selling_price || 0) - (item.purchase_price || 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.status === 'verfügbar' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {item.status === 'verfügbar' && (
                          <button
                            onClick={() => handleMarkAsSold(item.id, item.selling_price)}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            Verkauft
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredClothes.length === 0 && (
              <div className="p-8 text-center text-[var(--vintage-gray)]">
                {clothes.length === 0 
                  ? 'Noch keine Kleidungsstücke hinzugefügt.'
                  : 'Keine Kleidungsstücke mit den gewählten Filtern.'
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VintedKlamotten