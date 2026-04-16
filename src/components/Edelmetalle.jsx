import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const TROY_OZ_TO_GRAMS = 31.1035

const METALS = [
  { id: 'gold', name: 'Gold' },
  { id: 'silver', name: 'Silber' },
  { id: 'platinum', name: 'Platin' },
  { id: 'palladium', name: 'Palladium' },
]

const WEIGHT_OPTIONS = [
  { label: '1g', grams: 1 },
  { label: '2g', grams: 2 },
  { label: '5g', grams: 5 },
  { label: '10g', grams: 10 },
  { label: '20g', grams: 20 },
  { label: '50g', grams: 50 },
  { label: '100g', grams: 100 },
  { label: '1 oz', grams: TROY_OZ_TO_GRAMS },
]

export default function Edelmetalle({ onLogout, showToast, onBack }) {
  const [activeTab, setActiveTab] = useState('preise')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [spotPrices, setSpotPrices] = useState({})
  const [eurUsdRate, setEurUsdRate] = useState(null)
  const [pricesLoading, setPricesLoading] = useState(true)
  const [holdings, setHoldings] = useState([])
  const [holdingsLoading, setHoldingsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingHolding, setEditingHolding] = useState(null)
  const [spotLoading, setSpotLoading] = useState(false)
  const [selectedMetal, setSelectedMetal] = useState('gold')
  const [showPerfInEur, setShowPerfInEur] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const [historyRange, setHistoryRange] = useState('1Y')
  const [historyFetched, setHistoryFetched] = useState(false)
  const [newHolding, setNewHolding] = useState({
    metal_type: 'gold',
    product_type: 'coin',
    name: '',
    weight_display: '',
    weight_unit: 'g',
    purchase_price_eur: '',
    spot_price_per_gram_eur: '',
    purchase_date: '',
    notes: ''
  })

  const fmt = (n, decimals = 2) =>
    n != null && !isNaN(n)
      ? Number(n).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : '–'
  const fmtEur = (n) => (n != null && !isNaN(n) ? `${fmt(n)} €` : '–')

  const getWeightInGrams = (weight, unit) => {
    const w = parseFloat(weight)
    if (isNaN(w) || w <= 0) return 0
    return unit === 'oz' ? w * TROY_OZ_TO_GRAMS : w
  }

  const fetchPrices = useCallback(async () => {
    setPricesLoading(true)
    try {
      // gold-api.com: free, unlimited, no API key, CORS enabled — prices in USD
      // open.er-api.com: EUR/USD rate (confirmed working)
      const [fxRes, xau, xag, xpt, xpd] = await Promise.allSettled([
        fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()),
        fetch('https://api.gold-api.com/price/XAU').then(r => r.json()),
        fetch('https://api.gold-api.com/price/XAG').then(r => r.json()),
        fetch('https://api.gold-api.com/price/XPT').then(r => r.json()),
        fetch('https://api.gold-api.com/price/XPD').then(r => r.json()),
      ])

      const usdToEur = fxRes.status === 'fulfilled' ? fxRes.value?.rates?.EUR : null
      if (!usdToEur) throw new Error('EUR/USD rate unavailable')
      setEurUsdRate(usdToEur)

      const prices = {}
      const metalResults = { gold: xau, silver: xag, platinum: xpt, palladium: xpd }
      for (const [metalId, result] of Object.entries(metalResults)) {
        if (result.status === 'fulfilled' && result.value?.price) {
          const usdPerOz = result.value.price
          const eurPerOz = usdPerOz * usdToEur
          prices[metalId] = { eurPerOz, eurPerGram: eurPerOz / TROY_OZ_TO_GRAMS, usdPerOz }
        }
      }
      setSpotPrices(prices)
    } catch (error) {
      console.error('Error fetching prices:', error)
      showToast('Fehler beim Laden der Preise', 'error')
    } finally {
      setPricesLoading(false)
    }
  }, [showToast])

  const fetchHistoricalSpot = useCallback(async (dateStr, metalType) => {
    if (!dateStr || !metalType) return
    const date = dateStr.slice(0, 10) // YYYY-MM-DD
    const metalKey = { gold: 'XAU', silver: 'XAG', platinum: 'XPT', palladium: 'XPD' }[metalType]
    if (!metalKey) return
    setSpotLoading(true)
    try {
      // frankfurter.dev v2: ECB + 40 central banks, historical data, CORS enabled
      // rates[metalKey] = oz per EUR → invert to get EUR per oz
      const res = await fetch(
        `https://api.frankfurter.dev/v2/rates?date=${date}&base=EUR`
      )
      const data = await res.json()
      const ozPerEur = data?.rates?.[metalKey]
      if (ozPerEur) {
        const eurPerGram = (1 / ozPerEur) / TROY_OZ_TO_GRAMS
        setNewHolding(prev => ({
          ...prev,
          spot_price_per_gram_eur: eurPerGram.toFixed(6)
        }))
      } else {
        throw new Error('Metal not found in response')
      }
    } catch (error) {
      console.error('Error fetching historical spot:', error)
      // Fallback: fawazahmed0 CDN
      try {
        const today = new Date().toISOString().slice(0, 10)
        const cdnDate = date >= today ? 'latest' : date
        const fbKey = metalKey.toLowerCase()
        const res2 = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${cdnDate}/v1/currencies/${fbKey}.min.json`
        )
        const data2 = await res2.json()
        const eurPerOz = data2?.[fbKey]?.eur
        if (eurPerOz) {
          setNewHolding(prev => ({
            ...prev,
            spot_price_per_gram_eur: (eurPerOz / TROY_OZ_TO_GRAMS).toFixed(6)
          }))
        }
      } catch {
        // both failed — leave field empty for manual input
      }
    } finally {
      setSpotLoading(false)
    }
  }, [])

  const loadHoldings = useCallback(async () => {
    setHoldingsLoading(true)
    try {
      const { data, error } = await supabase
        .from('precious_metal_holdings')
        .select('*')
        .order('purchase_date', { ascending: false })
      if (error) throw error
      setHoldings(data || [])
    } catch (error) {
      console.error('Error loading holdings:', error)
      showToast('Fehler beim Laden der Käufe', 'error')
    } finally {
      setHoldingsLoading(false)
    }
  }, [showToast])

  const fetchPortfolioHistory = useCallback(async (range) => {
    if (holdings.length === 0) return
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const today = new Date()
      const toDate = today.toISOString().slice(0, 10)
      const fromDate = (() => {
        const d = new Date(today)
        if (range === '3M') d.setMonth(d.getMonth() - 3)
        else if (range === '6M') d.setMonth(d.getMonth() - 6)
        else if (range === '1Y') d.setFullYear(d.getFullYear() - 1)
        else {
          const earliest = holdings.map(h => h.purchase_date.slice(0, 10)).sort()[0]
          if (earliest) d.setTime(new Date(earliest).getTime())
          else d.setFullYear(d.getFullYear() - 1)
        }
        return d.toISOString().slice(0, 10)
      })()

      const res = await fetch(
        `https://api.frankfurter.dev/v2/rates?date_from=${fromDate}&date_to=${toDate}&base=EUR`
      )
      const data = await res.json()
      if (!data?.rates) throw new Error('No rates data')

      const metalKeyToId = { XAU: 'gold', XAG: 'silver', XPT: 'platinum', XPD: 'palladium' }
      const sortedDates = Object.keys(data.rates).sort()

      const points = sortedDates.map(dateStr => {
        const rates = data.rates[dateStr]
        const spotOnDate = {}
        for (const [key, ozPerEur] of Object.entries(rates)) {
          const metalId = metalKeyToId[key]
          if (metalId) spotOnDate[metalId] = (1 / ozPerEur) / TROY_OZ_TO_GRAMS
        }

        const activeHoldings = holdings.filter(h => h.purchase_date.slice(0, 10) <= dateStr)
        let portfolioValue = 0
        let allPricesAvailable = true
        for (const h of activeHoldings) {
          const spot = spotOnDate[h.metal_type]
          if (spot == null) { allPricesAvailable = false; break }
          portfolioValue += parseFloat(h.weight_grams) * spot
        }
        const invested = activeHoldings.reduce((s, h) => s + parseFloat(h.purchase_price_eur), 0)

        return {
          date: dateStr,
          portfolioValue: allPricesAvailable && activeHoldings.length > 0
            ? Math.round(portfolioValue * 100) / 100
            : null,
          invested: activeHoldings.length > 0 ? Math.round(invested * 100) / 100 : null
        }
      }).filter(p => p.invested !== null)

      setHistoryData(points)
      setHistoryFetched(true)
    } catch (err) {
      console.error('Error fetching portfolio history:', err)
      setHistoryError('Historische Daten konnten nicht geladen werden.')
      showToast('Fehler beim Laden des Verlaufs', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }, [holdings, showToast])

  const handleRangeChange = (range) => {
    setHistoryRange(range)
    setHistoryFetched(false)
    setHistoryData([])
  }

  useEffect(() => {
    fetchPrices()
    loadHoldings()
  }, [fetchPrices, loadHoldings])

  // Auto-fetch historical spot price when date or metal changes in the form
  useEffect(() => {
    if (!showAddForm || !newHolding.purchase_date) return
    fetchHistoricalSpot(newHolding.purchase_date, newHolding.metal_type)
  }, [showAddForm, newHolding.purchase_date, newHolding.metal_type, fetchHistoricalSpot])

  // Lazy-fetch portfolio history when Verlauf tab is opened or range changes
  useEffect(() => {
    if (activeTab === 'verlauf' && !historyFetched && !holdingsLoading && holdings.length > 0) {
      fetchPortfolioHistory(historyRange)
    }
  }, [activeTab, historyFetched, holdings, holdingsLoading, historyRange, fetchPortfolioHistory])

  const openAddForm = () => {
    const now = new Date()
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setNewHolding({
      metal_type: 'gold',
      name: '',
      weight_display: '',
      weight_unit: 'g',
      purchase_price_eur: '',
      spot_price_per_gram_eur: '',
      purchase_date: localISO,
      notes: ''
    })
    setEditingHolding(null)
    setShowAddForm(true)
  }

  const handleMetalChange = (metalType) => {
    setNewHolding(prev => ({ ...prev, metal_type: metalType }))
  }

  const handleSaveHolding = async () => {
    if (!newHolding.name || !newHolding.weight_display || !newHolding.purchase_price_eur || !newHolding.purchase_date) {
      showToast('Bitte alle Pflichtfelder ausfüllen', 'error')
      return
    }
    const weightGrams = getWeightInGrams(newHolding.weight_display, newHolding.weight_unit)
    if (weightGrams <= 0) {
      showToast('Ungültiges Gewicht', 'error')
      return
    }
    const payload = {
      metal_type: newHolding.metal_type,
      product_type: newHolding.product_type || 'coin',
      name: newHolding.name,
      weight_grams: weightGrams,
      purchase_price_eur: parseFloat(newHolding.purchase_price_eur),
      spot_price_per_gram_eur: newHolding.spot_price_per_gram_eur
        ? parseFloat(newHolding.spot_price_per_gram_eur)
        : null,
      purchase_date: new Date(newHolding.purchase_date).toISOString(),
      notes: newHolding.notes || null
    }
    try {
      let error
      if (editingHolding) {
        ;({ error } = await supabase
          .from('precious_metal_holdings')
          .update(payload)
          .eq('id', editingHolding.id))
      } else {
        ;({ error } = await supabase.from('precious_metal_holdings').insert([payload]))
      }
      if (error) throw error
      showToast(editingHolding ? 'Kauf aktualisiert!' : 'Kauf gespeichert!', 'success')
      setShowAddForm(false)
      setEditingHolding(null)
      await loadHoldings()
    } catch (error) {
      console.error('Error saving:', error)
      showToast('Fehler beim Speichern', 'error')
    }
  }

  const handleDeleteHolding = async (id) => {
    try {
      const { error } = await supabase
        .from('precious_metal_holdings')
        .delete()
        .eq('id', id)
      if (error) throw error
      showToast('Kauf gelöscht', 'success')
      await loadHoldings()
    } catch {
      showToast('Fehler beim Löschen', 'error')
    }
  }

  const startEdit = (holding) => {
    const d = new Date(holding.purchase_date)
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setNewHolding({
      metal_type: holding.metal_type,
      product_type: holding.product_type || 'coin',
      name: holding.name,
      weight_display: holding.weight_grams,
      weight_unit: 'g',
      purchase_price_eur: holding.purchase_price_eur,
      spot_price_per_gram_eur: holding.spot_price_per_gram_eur || '',
      purchase_date: localISO,
      notes: holding.notes || ''
    })
    setEditingHolding(holding)
    setShowAddForm(true)
  }

  const metalName = (id) => METALS.find(m => m.id === id)?.name || id

  // Portfolio calculations
  const portfolioByMetal = METALS.map(metal => {
    const mh = holdings.filter(h => h.metal_type === metal.id)
    const totalWeightGrams = mh.reduce((s, h) => s + parseFloat(h.weight_grams), 0)
    const totalInvestment = mh.reduce((s, h) => s + parseFloat(h.purchase_price_eur), 0)
    const totalSpotAtPurchase = mh.reduce((s, h) => {
      if (!h.spot_price_per_gram_eur) return s
      return s + parseFloat(h.spot_price_per_gram_eur) * parseFloat(h.weight_grams)
    }, 0)
    const currentSpotPerGram = spotPrices[metal.id]?.eurPerGram
    const currentValue = currentSpotPerGram != null ? totalWeightGrams * currentSpotPerGram : null
    const hasSpotData = mh.some(h => h.spot_price_per_gram_eur)
    const spread = hasSpotData ? totalInvestment - totalSpotAtPurchase : null
    const spreadPercent =
      hasSpotData && totalSpotAtPurchase > 0 ? (spread / totalSpotAtPurchase) * 100 : null
    const performance =
      currentValue != null && totalInvestment > 0
        ? ((currentValue - totalInvestment) / totalInvestment) * 100
        : null
    const performanceEur = currentValue != null ? currentValue - totalInvestment : null
    return {
      ...metal,
      totalWeightGrams,
      totalInvestment,
      totalSpotAtPurchase: hasSpotData ? totalSpotAtPurchase : null,
      currentValue,
      spread,
      spreadPercent,
      performance,
      performanceEur,
      count: mh.length
    }
  }).filter(m => m.count > 0)

  const totalInvestment = portfolioByMetal.reduce((s, m) => s + m.totalInvestment, 0)
  const totalCurrentValue =
    portfolioByMetal.length > 0 && portfolioByMetal.every(m => m.currentValue != null)
      ? portfolioByMetal.reduce((s, m) => s + m.currentValue, 0)
      : null
  const totalPerformance =
    totalCurrentValue != null && totalInvestment > 0
      ? ((totalCurrentValue - totalInvestment) / totalInvestment) * 100
      : null
  const totalPerformanceEur =
    totalCurrentValue != null ? totalCurrentValue - totalInvestment : null
  const totalSpotAtPurchaseSum = portfolioByMetal.reduce(
    (s, m) => s + (m.totalSpotAtPurchase || 0), 0
  )

  const formatChartDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  const CustomChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null
    const portfolioVal = payload.find(p => p.dataKey === 'portfolioValue')?.value
    const investedVal = payload.find(p => p.dataKey === 'invested')?.value
    const delta = portfolioVal != null && investedVal != null ? portfolioVal - investedVal : null
    const d = new Date(label + 'T00:00:00')
    const dateLabel = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return (
      <div className="bg-white border border-[var(--vintage-border)] rounded p-3 text-xs shadow-sm" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="text-[var(--vintage-gray)] mb-2">{dateLabel}</div>
        {portfolioVal != null && (
          <div className="text-[var(--vintage-brown)]">Wert: {fmtEur(portfolioVal)}</div>
        )}
        {investedVal != null && (
          <div className="text-[var(--vintage-gray)]">Investiert: {fmtEur(investedVal)}</div>
        )}
        {delta != null && (
          <div className={`mt-1 font-medium ${delta >= 0 ? 'text-[var(--vintage-olive)]' : 'text-red-500'}`}>
            {delta >= 0 ? '+' : ''}{fmtEur(delta)}
          </div>
        )}
      </div>
    )
  }

  const navItems = [
    {
      id: 'preise', label: 'Preise',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    },
    {
      id: 'portfolio', label: 'Portfolio',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },
    {
      id: 'kaeufe', label: 'Käufe',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    },
    {
      id: 'verlauf', label: 'Verlauf',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
    },
  ]

  return (
    <div className="min-h-screen flex bg-[var(--vintage-cream)]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-[var(--vintage-border)] z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="p-1 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <button onClick={onBack} className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0" style={{ fontFamily: 'Georgia, serif' }}>Projects</button>
          <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
          <h1 className="text-lg text-[var(--vintage-charcoal)] truncate" style={{ fontFamily: 'Georgia, serif' }}>Edelmetalle</h1>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] p-4" onClick={e => e.stopPropagation()}>
            <nav className="space-y-2 mt-12">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false) }}
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
              <button onClick={onLogout} className="w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors">
                Abmelden
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        <div className="p-4 border-b border-[var(--vintage-border)] flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={onBack} className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0" style={{ fontFamily: 'Georgia, serif' }}>
                Projects
              </button>
              <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
              <h1 className="text-lg text-[var(--vintage-charcoal)] tracking-wide truncate" style={{ fontFamily: 'Georgia, serif' }}>
                Edelmetalle
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
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-[var(--vintage-brown)] text-white'
                  : 'text-[var(--vintage-brown)] hover:bg-[var(--vintage-brown)]/10'
              }`}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-[var(--vintage-border)]">
          <button
            onClick={onLogout}
            className={`w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors ${sidebarCollapsed ? 'justify-center flex' : ''}`}
          >
            {sidebarCollapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            ) : 'Abmelden'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto">

        {/* ── TAB: PREISE ── */}
        {activeTab === 'preise' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                Spot-Preise
              </h2>
              <button
                onClick={fetchPrices}
                className="text-xs text-[var(--vintage-brown)] hover:underline flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Aktualisieren
              </button>
            </div>

            {pricesLoading ? (
              <div className="text-sm text-[var(--vintage-gray)]">Preise werden geladen…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {METALS.map(metal => {
                    const price = spotPrices[metal.id]
                    return (
                      <div key={metal.id} className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
                        <div className="text-xs text-[var(--vintage-gray)] uppercase tracking-wider mb-1">
                          {metal.name}
                        </div>
                        <div className="text-lg text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                          {price ? fmtEur(price.eurPerGram) : '–'}
                        </div>
                        <div className="text-xs text-[var(--vintage-gray)] mt-0.5">pro Gramm</div>
                        {price && (
                          <div className="text-xs text-[var(--vintage-gray)] mt-0.5">
                            {fmtEur(price.eurPerOz)} / oz
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>


                {/* Weight Calculator */}
                <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                  <h3 className="text-sm text-[var(--vintage-charcoal)] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                    Preisrechner
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {METALS.map(metal => (
                      <button
                        key={metal.id}
                        onClick={() => setSelectedMetal(metal.id)}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          selectedMetal === metal.id
                            ? 'bg-[var(--vintage-brown)] text-white'
                            : 'border border-[var(--vintage-border)] text-[var(--vintage-brown)] hover:border-[var(--vintage-brown)]'
                        }`}
                      >
                        {metal.name}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {WEIGHT_OPTIONS.map(opt => {
                      const price = spotPrices[selectedMetal]
                      const value = price ? price.eurPerGram * opt.grams : null
                      return (
                        <div key={opt.label} className="bg-[var(--vintage-beige)] rounded p-3 text-center">
                          <div className="text-xs text-[var(--vintage-gray)] mb-1">{opt.label}</div>
                          <div className="text-sm text-[var(--vintage-charcoal)]">{fmtEur(value)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: PORTFOLIO ── */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <h2 className="text-lg text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
              Portfolio
            </h2>

            {holdingsLoading ? (
              <div className="text-sm text-[var(--vintage-gray)]">Wird geladen…</div>
            ) : holdings.length === 0 ? (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-8 text-center">
                <p className="text-[var(--vintage-gray)] text-sm mb-3">Noch keine Käufe erfasst.</p>
                <button
                  onClick={() => setActiveTab('kaeufe')}
                  className="text-sm text-[var(--vintage-brown)] hover:underline"
                >
                  Ersten Kauf hinzufügen →
                </button>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
                    <div className="text-xs text-[var(--vintage-gray)] uppercase tracking-wider mb-1">
                      Gesamtinvestment
                    </div>
                    <div className="text-xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                      {fmtEur(totalInvestment)}
                    </div>
                    <div className="text-xs text-[var(--vintage-gray)]">inkl. Spread</div>
                  </div>
                  <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
                    <div className="text-xs text-[var(--vintage-gray)] uppercase tracking-wider mb-1">
                      Wert Kauftag
                    </div>
                    <div className="text-xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                      {totalSpotAtPurchaseSum > 0 ? fmtEur(totalSpotAtPurchaseSum) : '–'}
                    </div>
                    <div className="text-xs text-[var(--vintage-gray)]">ohne Spread</div>
                  </div>
                  <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
                    <div className="text-xs text-[var(--vintage-gray)] uppercase tracking-wider mb-1">
                      Aktueller Wert
                    </div>
                    <div className="text-xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                      {fmtEur(totalCurrentValue)}
                    </div>
                    <div className="text-xs text-[var(--vintage-gray)]">zu aktuellen Spot-Preisen</div>
                  </div>
                  <button
                    onClick={() => setShowPerfInEur(!showPerfInEur)}
                    className="bg-white border border-[var(--vintage-border)] rounded-lg p-4 text-left hover:border-[var(--vintage-brown)] transition-colors"
                  >
                    <div className="text-xs text-[var(--vintage-gray)] uppercase tracking-wider mb-1">
                      Performance
                    </div>
                    <div
                      className={`text-xl ${
                        totalPerformance != null
                          ? totalPerformance >= 0
                            ? 'text-[var(--vintage-olive)]'
                            : 'text-red-600'
                          : 'text-[var(--vintage-charcoal)]'
                      }`}
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {showPerfInEur
                        ? (totalPerformanceEur != null
                            ? `${totalPerformanceEur >= 0 ? '+' : ''}${fmtEur(totalPerformanceEur)}`
                            : '–')
                        : (totalPerformance != null
                            ? `${totalPerformance >= 0 ? '+' : ''}${fmt(totalPerformance)} %`
                            : '–')}
                    </div>
                    <div className="text-xs text-[var(--vintage-gray)]">
                      vs. Kaufpreis · Klick für {showPerfInEur ? '%' : '€'}
                    </div>
                  </button>
                </div>

                {/* Per Metal */}
                <div className="space-y-4">
                  {portfolioByMetal.map(metal => (
                    <div key={metal.id} className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                          {metal.name}
                        </h3>
                        <span className="text-xs text-[var(--vintage-gray)]">
                          {metal.count} {metal.count === 1 ? 'Kauf' : 'Käufe'} · {fmt(metal.totalWeightGrams, 3)} g
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-[var(--vintage-gray)] mb-0.5">Investment</div>
                          <div className="text-[var(--vintage-charcoal)]">{fmtEur(metal.totalInvestment)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--vintage-gray)] mb-0.5">Wert Kauftag</div>
                          <div className="text-[var(--vintage-charcoal)]">{fmtEur(metal.totalSpotAtPurchase)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--vintage-gray)] mb-0.5">Akt. Wert</div>
                          <div className="text-[var(--vintage-charcoal)]">{fmtEur(metal.currentValue)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--vintage-gray)] mb-0.5">Spread bezahlt</div>
                          <div className="text-[var(--vintage-charcoal)]">
                            {metal.spread != null
                              ? `${fmtEur(metal.spread)} (${fmt(metal.spreadPercent)} %)`
                              : '–'}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowPerfInEur(!showPerfInEur)}
                          className="text-left hover:opacity-70 transition-opacity"
                        >
                          <div className="text-xs text-[var(--vintage-gray)] mb-0.5">
                            Performance {showPerfInEur ? '(€)' : '(%)'}
                          </div>
                          <div
                            className={
                              metal.performance != null
                                ? metal.performance >= 0
                                  ? 'text-[var(--vintage-olive)]'
                                  : 'text-red-600'
                                : 'text-[var(--vintage-charcoal)]'
                            }
                          >
                            {showPerfInEur
                              ? (metal.performanceEur != null
                                  ? `${metal.performanceEur >= 0 ? '+' : ''}${fmtEur(metal.performanceEur)}`
                                  : '–')
                              : (metal.performance != null
                                  ? `${metal.performance >= 0 ? '+' : ''}${fmt(metal.performance)} %`
                                  : '–')}
                          </div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: KÄUFE ── */}
        {activeTab === 'kaeufe' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                Käufe
              </h2>
              <button
                onClick={openAddForm}
                className="px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:opacity-90 transition-opacity"
              >
                + Kauf hinzufügen
              </button>
            </div>

            {holdingsLoading ? (
              <div className="text-sm text-[var(--vintage-gray)]">Wird geladen…</div>
            ) : holdings.length === 0 ? (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-8 text-center text-[var(--vintage-gray)] text-sm">
                Noch keine Käufe erfasst.
              </div>
            ) : (
              <div className="space-y-3">
                {holdings.map(holding => {
                  const spotNow = spotPrices[holding.metal_type]?.eurPerGram
                  const currentVal = spotNow != null ? spotNow * parseFloat(holding.weight_grams) : null
                  const spotAtPurchase = holding.spot_price_per_gram_eur
                    ? parseFloat(holding.spot_price_per_gram_eur) * parseFloat(holding.weight_grams)
                    : null
                  const spread =
                    spotAtPurchase != null ? parseFloat(holding.purchase_price_eur) - spotAtPurchase : null
                  const spreadPct =
                    spread != null && spotAtPurchase > 0 ? (spread / spotAtPurchase) * 100 : null
                  const perf =
                    currentVal != null
                      ? ((currentVal - parseFloat(holding.purchase_price_eur)) /
                          parseFloat(holding.purchase_price_eur)) *
                        100
                      : null
                  const d = new Date(holding.purchase_date)
                  const dateStr = d.toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })
                  const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={holding.id} className="bg-white border border-[var(--vintage-border)] rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-[var(--vintage-beige)] text-[var(--vintage-brown)] rounded uppercase tracking-wider">
                              {metalName(holding.metal_type)}
                            </span>
                            {holding.product_type && holding.product_type !== 'other' && (
                              <span className="text-xs px-2 py-0.5 border border-[var(--vintage-border)] text-[var(--vintage-gray)] rounded">
                                {{ coin: 'Münze', bar: 'Barren', round: 'Round' }[holding.product_type] || holding.product_type}
                              </span>
                            )}
                            <span className="text-sm text-[var(--vintage-charcoal)] truncate">{holding.name}</span>
                          </div>
                          <div className="text-xs text-[var(--vintage-gray)] mb-2">
                            {dateStr} · {timeStr} Uhr · {fmt(parseFloat(holding.weight_grams), 3)} g
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 text-xs">
                            <div>
                              <span className="text-[var(--vintage-gray)]">Kaufpreis: </span>
                              <span className="text-[var(--vintage-charcoal)]">
                                {fmtEur(parseFloat(holding.purchase_price_eur))}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--vintage-gray)]">Wert Kauftag: </span>
                              <span className="text-[var(--vintage-charcoal)]">{fmtEur(spotAtPurchase)}</span>
                            </div>
                            <div>
                              <span className="text-[var(--vintage-gray)]">Akt. Wert: </span>
                              <span className="text-[var(--vintage-charcoal)]">{fmtEur(currentVal)}</span>
                            </div>
                            <div>
                              <span className="text-[var(--vintage-gray)]">Spread: </span>
                              <span className="text-[var(--vintage-charcoal)]">
                                {spread != null ? `${fmtEur(spread)} (${fmt(spreadPct)} %)` : '–'}
                              </span>
                            </div>
                            <button
                              onClick={() => setShowPerfInEur(!showPerfInEur)}
                              className="text-left hover:opacity-70 transition-opacity"
                            >
                              <span className="text-[var(--vintage-gray)]">Perf: </span>
                              <span
                                className={
                                  perf != null
                                    ? perf >= 0
                                      ? 'text-[var(--vintage-olive)]'
                                      : 'text-red-600'
                                    : 'text-[var(--vintage-charcoal)]'
                                }
                              >
                                {showPerfInEur
                                  ? (currentVal != null
                                      ? `${(currentVal - parseFloat(holding.purchase_price_eur)) >= 0 ? '+' : ''}${fmtEur(currentVal - parseFloat(holding.purchase_price_eur))}`
                                      : '–')
                                  : (perf != null ? `${perf >= 0 ? '+' : ''}${fmt(perf)} %` : '–')}
                              </span>
                            </button>
                          </div>
                          {holding.notes && (
                            <div className="text-xs text-[var(--vintage-gray)] mt-1 italic">{holding.notes}</div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => startEdit(holding)}
                            className="text-xs text-[var(--vintage-brown)] hover:underline"
                          >
                            Bearb.
                          </button>
                          <button
                            onClick={() => handleDeleteHolding(holding.id)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {/* ── TAB: VERLAUF ── */}
        {activeTab === 'verlauf' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                Verlauf
              </h2>
              <div className="flex border border-[var(--vintage-border)] rounded overflow-hidden">
                {['3M', '6M', '1Y', 'Max'].map(r => (
                  <button
                    key={r}
                    onClick={() => handleRangeChange(r)}
                    className={`px-3 py-1.5 text-xs transition-colors ${
                      historyRange === r
                        ? 'bg-[var(--vintage-brown)] text-white'
                        : 'bg-[var(--vintage-beige)] text-[var(--vintage-brown)] hover:bg-[var(--vintage-brown)]/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {holdings.length === 0 && !holdingsLoading && (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-8 text-center">
                <p className="text-[var(--vintage-gray)] text-sm mb-3">Noch keine Käufe erfasst.</p>
                <button onClick={() => setActiveTab('kaeufe')} className="text-sm text-[var(--vintage-brown)] hover:underline">
                  Ersten Kauf hinzufügen →
                </button>
              </div>
            )}

            {historyLoading && (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-8 text-center">
                <p className="text-sm text-[var(--vintage-gray)]">Verlauf wird geladen…</p>
              </div>
            )}

            {historyError && !historyLoading && (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 text-center">
                <p className="text-sm text-red-500 mb-3">{historyError}</p>
                <button
                  onClick={() => { setHistoryFetched(false); setHistoryData([]) }}
                  className="text-xs text-[var(--vintage-brown)] hover:underline"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {!historyLoading && !historyError && historyData.length > 0 && (
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={historyData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vintage-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontFamily: 'Georgia, serif', fontSize: 11, fill: 'var(--vintage-gray)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--vintage-border)' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={v => `${fmt(v / 1000, 1)}k €`}
                      tick={{ fontFamily: 'Georgia, serif', fontSize: 11, fill: 'var(--vintage-gray)' }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontFamily: 'Georgia, serif', fontSize: '12px', paddingTop: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="portfolioValue"
                      name="Portfoliowert"
                      stroke="var(--vintage-brown)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--vintage-brown)' }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="invested"
                      name="Investiert"
                      stroke="var(--vintage-gray)"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Add/Edit Modal ── */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-4">
          <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-base text-[var(--vintage-charcoal)] mb-5" style={{ fontFamily: 'Georgia, serif' }}>
              {editingHolding ? 'Kauf bearbeiten' : 'Kauf hinzufügen'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Metall *
                </label>
                <select
                  value={newHolding.metal_type}
                  onChange={e => handleMetalChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                >
                  {METALS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Produktart *
                </label>
                <select
                  value={newHolding.product_type}
                  onChange={e => setNewHolding({ ...newHolding, product_type: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                >
                  <option value="coin">Münze</option>
                  <option value="bar">Barren</option>
                  <option value="round">Round</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Bezeichnung *
                </label>
                <input
                  value={newHolding.name}
                  onChange={e => setNewHolding({ ...newHolding, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Gewicht *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newHolding.weight_display}
                    onChange={e => setNewHolding({ ...newHolding, weight_display: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                  />
                  <div className="flex border border-[var(--vintage-border)] rounded overflow-hidden">
                    {['g', 'oz'].map(unit => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setNewHolding({ ...newHolding, weight_unit: unit })}
                        className={`px-3 py-2 text-sm transition-colors ${
                          newHolding.weight_unit === unit
                            ? 'bg-[var(--vintage-brown)] text-white'
                            : 'bg-[var(--vintage-beige)] text-[var(--vintage-brown)]'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                {newHolding.weight_display && newHolding.weight_unit === 'oz' && (
                  <div className="text-xs text-[var(--vintage-gray)] mt-1">
                    = {fmt(parseFloat(newHolding.weight_display) * TROY_OZ_TO_GRAMS, 4)} g
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Kaufpreis EUR (mit Spread) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newHolding.purchase_price_eur}
                  onChange={e => setNewHolding({ ...newHolding, purchase_price_eur: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Kaufdatum & Uhrzeit *
                </label>
                <input
                  type="datetime-local"
                  value={newHolding.purchase_date}
                  onChange={e => setNewHolding({ ...newHolding, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Spot-Preis zum Kaufdatum (EUR/g)
                  {spotLoading && (
                    <span className="ml-2 text-[var(--vintage-gray)] normal-case tracking-normal font-normal">
                      wird geladen…
                    </span>
                  )}
                  {!spotLoading && newHolding.spot_price_per_gram_eur && (
                    <span className="ml-2 text-[var(--vintage-olive)] normal-case tracking-normal font-normal">
                      ✓ automatisch
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newHolding.spot_price_per_gram_eur}
                  onChange={e => setNewHolding({ ...newHolding, spot_price_per_gram_eur: e.target.value })}
                  disabled={spotLoading}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm disabled:opacity-50"
                />
                {newHolding.spot_price_per_gram_eur && newHolding.weight_display && newHolding.purchase_price_eur && (() => {
                  const spotVal =
                    parseFloat(newHolding.spot_price_per_gram_eur) *
                    getWeightInGrams(newHolding.weight_display, newHolding.weight_unit)
                  const paid = parseFloat(newHolding.purchase_price_eur)
                  const sp = paid - spotVal
                  const spPct = spotVal > 0 ? (sp / spotVal) * 100 : null
                  return (
                    <div className="text-xs text-[var(--vintage-gray)] mt-1">
                      Spread: {fmtEur(sp)}{spPct != null ? ` (${fmt(spPct)} %)` : ''}
                    </div>
                  )
                })()}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                  Notizen
                </label>
                <textarea
                  value={newHolding.notes}
                  onChange={e => setNewHolding({ ...newHolding, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setEditingHolding(null) }}
                className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-sm text-[var(--vintage-gray)] rounded hover:bg-[var(--vintage-beige)] transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSaveHolding}
                className="flex-1 px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:opacity-90 transition-opacity"
              >
                {editingHolding ? 'Speichern' : 'Hinzufügen'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
