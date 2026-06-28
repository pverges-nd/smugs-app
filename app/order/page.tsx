'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Addon = {
  label: string
  price: number
  type: 'one' | 'many'
}

type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  is_available: boolean
  addons: Addon[]
}

type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  note: string
  addons: string[]
}

const CATEGORY_ORDER = ['Specials', 'Mains', 'Snacks', 'Drinks']

export default function OrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    const fetchMenu = async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
      if (data) setMenuItems(data)
    }
    fetchMenu()
  }, [])

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, note: '', addons: [] }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id)
      if (existing && existing.qty > 1) {
        return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c)
      }
      return prev.filter(c => c.id !== id)
    })
  }

  const updateNote = (id: string, note: string) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, note } : c))
  }

  const toggleManyAddon = (id: string, addonLabel: string, addonPrice: number) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c
      const has = c.addons.includes(addonLabel)
      return {
        ...c,
        addons: has ? c.addons.filter(a => a !== addonLabel) : [...c.addons, addonLabel],
        price: has ? c.price - addonPrice : c.price + addonPrice
      }
    }))
  }

  const selectOneAddon = (id: string, addonLabel: string, addonPrice: number, allOptions: Addon[]) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c
      const currentOne = c.addons.find(a => allOptions.some(o => o.label === a && o.type === 'one'))
      const currentPrice = currentOne ? allOptions.find(o => o.label === currentOne)?.price ?? 0 : 0
      const newAddons = c.addons.filter(a => !allOptions.some(o => o.label === a && o.type === 'one'))
      return {
        ...c,
        addons: [...newAddons, addonLabel],
        price: c.price - currentPrice + addonPrice
      }
    }))
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const categories = CATEGORY_ORDER.filter(cat => menuItems.some(item => item.category === cat))

  const submitOrder = async () => {
    if (!customerName || cart.length === 0) return
    setLoading(true)
    await supabase.from('orders').insert({
      customer_name: customerName,
      items: cart,
      status: 'pending'
    })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f0f0f0', color: '#2a2e30', fontFamily: "'Inter', sans-serif" }}
      >
        <div className="text-center p-8">
          <img src="/tj_groden_csc.jpg" alt="success" className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#7E0923' }}>Order Placed!</h1>
          <p className="mt-2" style={{ color: '#2a2e30' }}>Thank you!</p>
          <button
            onClick={() => {
              setSubmitted(false)
              setCart([])
              setCustomerName('')
            }}
            className="mt-8 px-8 py-3 rounded-xl font-bold text-white"
            style={{ backgroundColor: '#2a2e30', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem' }}
          >
            New Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-48"
      style={{ backgroundColor: '#f0f0f0', color: '#2a2e30', fontFamily: "'Inter', sans-serif" }}
    >
      <div className="shadow-sm p-4 sticky top-0 z-10" style={{ backgroundColor: '#f0f0f0' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', textAlign: 'center', color: '#7E0923' }}>
          The Cove
        </h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="rounded-xl shadow-sm p-4 mb-6" style={{ backgroundColor: '#fff' }}>
          <h2 className="font-semibold mb-3" style={{ color: '#2a2e30' }}>Welcome!</h2>
          <input
            className="w-full border rounded-lg p-2 outline-none"
            placeholder="Your name"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            style={{ color: '#2a2e30', borderColor: '#d9cdc9' }}
          />
        </div>

        {categories.map(category => (
          <div key={category} className="mb-6">
            <h2
              className="mb-3"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#7E0923' }}
            >
              {category}
            </h2>
            <div className="space-y-3">
              {menuItems.filter(i => i.category === category).map(item => {
                const cartItem = cart.find(c => c.id === item.id)
                const manyAddons = item.addons?.filter(a => a.type === 'many') ?? []
                const oneAddons = item.addons?.filter(a => a.type === 'one') ?? []
                return (
                  <div key={item.id} className="rounded-xl shadow-sm p-4" style={{ backgroundColor: '#fff' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold" style={{ color: '#2a2e30' }}>{item.name}</h3>
                        <p className="text-sm mt-0.5" style={{ color: '#7a7a7a' }}>{item.description}</p>
                        <p className="font-medium mt-1" style={{ color: '#2a2e30' }}>${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cartItem ? (
                          <>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 rounded-full font-bold"
                              style={{ backgroundColor: '#f0e8e5', color: '#2a2e30' }}
                            >−</button>
                            <span className="w-4 text-center">{cartItem.qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-8 h-8 rounded-full font-bold text-white"
                              style={{ backgroundColor: '#2a2e30' }}
                            >+</button>
                          </>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full font-bold text-white"
                            style={{ backgroundColor: '#2a2e30' }}
                          >+</button>
                        )}
                      </div>
                    </div>

                    {cartItem && oneAddons.length > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0e8e5' }}>
                        <p className="text-sm font-medium mb-2" style={{ color: '#2a2e30' }}>Pick one:</p>
                        {oneAddons.map(addon => (
                          <label key={addon.label} className="flex items-center gap-2 mb-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`one-${item.id}`}
                              checked={cartItem.addons.includes(addon.label)}
                              onChange={() => selectOneAddon(item.id, addon.label, addon.price, item.addons)}
                            />
                            <span className="text-sm" style={{ color: '#2a2e30' }}>
                              {addon.label}
                              {addon.price > 0 && <span style={{ color: '#7a7a7a' }}> +${addon.price.toFixed(2)}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {cartItem && manyAddons.length > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0e8e5' }}>
                        <p className="text-sm font-medium mb-2" style={{ color: '#2a2e30' }}>Add-ons:</p>
                        {manyAddons.map(addon => (
                          <label key={addon.label} className="flex items-center gap-2 mb-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cartItem.addons.includes(addon.label)}
                              onChange={() => toggleManyAddon(item.id, addon.label, addon.price)}
                            />
                            <span className="text-sm" style={{ color: '#2a2e30' }}>
                              {addon.label}
                              {addon.price > 0 && <span style={{ color: '#7a7a7a' }}> +${addon.price.toFixed(2)}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {cartItem && (
                      <input
                        className="w-full border rounded-lg p-2 mt-3 text-sm outline-none"
                        placeholder="Special instructions (optional)"
                        value={cartItem.note}
                        onChange={e => updateNote(item.id, e.target.value)}
                        style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t shadow-lg p-4" style={{ backgroundColor: '#f0f0f0', borderColor: '#d9cdc9' }}>
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between mb-3">
              <span className="font-semibold" style={{ color: '#2a2e30' }}>Total</span>
              <span className="font-bold" style={{ color: '#2a2e30' }}>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={submitOrder}
              disabled={loading || !customerName}
              className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#2a2e30', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem' }}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}