'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  HOURS_OF_OPERATION,
  RESTAURANT_SETTINGS_ID,
  type RestaurantSettings,
} from '@/lib/restaurant'

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
  menuItemId: string
  name: string
  price: number
  qty: number
  note: string
  addons: string[]
}

const CATEGORY_ORDER = ['Specials', 'Mains', 'Snacks', 'Drinks']

function ChristmasHeader({ restaurantOpen }: { restaurantOpen?: boolean }) {
  return (
    <header className="border-b-4 border-[#a6263d] bg-linear-to-br from-[#102e25] to-[#21513e] px-4 py-3 text-center text-white shadow-sm">
      <div className="flex items-center justify-center gap-4">
        <span aria-hidden="true" className="text-xl text-[#f3d89c]">❄</span>
        <h1 className="text-[2.5rem] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>The Cove</h1>
        <span aria-hidden="true" className="text-xl text-[#f3d89c]">❄</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#f3d89c]">Merry Christmas</p>
      {restaurantOpen !== undefined && (
        <p className="mt-2 text-xs font-semibold uppercase">
          {restaurantOpen ? 'Open for orders' : 'Closed - menu preview'}
        </p>
      )}
    </header>
  )
}

function HoursDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="hours-title">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="hours-title" className="text-xl font-semibold">Hours of Operation</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-xl leading-none"
            aria-label="Close hours"
            style={{ backgroundColor: '#f0e8e5', color: '#2a2e30' }}
          >
            ×
          </button>
        </div>
        <div className="mt-5 divide-y" style={{ borderColor: '#d9cdc9' }}>
          {HOURS_OF_OPERATION.map(({ days, hours }) => (
            <div key={days} className="flex justify-between gap-4 py-3 text-sm">
              <span className="font-medium">{days}</span>
              <span className="text-right" style={{ color: '#7a7a7a' }}>{hours}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg py-2 font-semibold text-white"
          style={{ backgroundColor: '#2a2e30' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

export default function OrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [restaurantOpen, setRestaurantOpen] = useState<boolean | null>(null)
  const [showHours, setShowHours] = useState(false)
  const [viewClosedMenu, setViewClosedMenu] = useState(false)

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

    const fetchRestaurantStatus = async () => {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('is_open')
        .eq('id', RESTAURANT_SETTINGS_ID)
        .single()

      setRestaurantOpen(error ? false : data.is_open)
    }

    fetchMenu()
    fetchRestaurantStatus()

    const settingsChannel = supabase
      .channel('restaurant-settings-order')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurant_settings',
        filter: `id=eq.${RESTAURANT_SETTINGS_ID}`
      }, (payload) => {
        const settings = payload.new as RestaurantSettings
        setRestaurantOpen(settings.is_open)
        if (!settings.is_open) {
          setCart([])
        } else {
          setViewClosedMenu(false)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(settingsChannel)
      document.head.removeChild(link)
    }
  }, [])

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const hasOptions = (item.addons?.length ?? 0) > 0
      const existing = prev.find(c => c.menuItemId === item.id)
      if (existing && !hasOptions) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, {
        id: hasOptions ? crypto.randomUUID() : item.id,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        note: '',
        addons: []
      }]
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
    if (!customerName || cart.length === 0 || !restaurantOpen) return
    setLoading(true)

    const { data: settings, error: settingsError } = await supabase
      .from('restaurant_settings')
      .select('is_open')
      .eq('id', RESTAURANT_SETTINGS_ID)
      .single()

    if (settingsError || !settings.is_open) {
      setRestaurantOpen(false)
      setCart([])
      setLoading(false)
      return
    }

    const { error } = await supabase.from('orders').insert({
      customer_name: customerName,
      items: cart,
      status: 'pending'
    })

    if (!error) setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f7f4eb', color: '#2a2e30', fontFamily: "'Inter', sans-serif" }}
      >
        <div className="text-center p-8">
          <img src="/tj_groden_csc.jpg" alt="success" className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#7E0923' }}>Order Placed!</h1>
          <p className="mt-2" style={{ color: '#2a2e30' }}>Thank you!</p>
          <p className="mt-2 font-semibold text-[#21513e]">Merry Christmas from The Cove!</p>
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

  if (restaurantOpen === null || (restaurantOpen === false && !viewClosedMenu)) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: '#f7f4eb', color: '#2a2e30', fontFamily: "'Inter', sans-serif" }}
      >
        <ChristmasHeader />
        <main className="mx-auto flex max-w-lg items-center justify-center px-4 py-16">
          <div className="w-full rounded-xl bg-white p-6 text-center shadow-sm">
            {restaurantOpen === null ? (
              <>
                <h2 className="text-xl font-semibold">Checking restaurant status...</h2>
                <p className="mt-2 text-sm" style={{ color: '#7a7a7a' }}>This will only take a moment.</p>
              </>
            ) : (
              <>
                <p className="mx-auto mb-4 h-3 w-3 rounded-full bg-red-600" aria-hidden="true" />
                <h2 className="text-2xl font-semibold">We are currently closed</h2>
                <p className="mt-2" style={{ color: '#7a7a7a' }}>
                  Ordering will be available when the kitchen opens the restaurant.
                </p>
                <button
                  type="button"
                  onClick={() => setShowHours(true)}
                  className="mt-6 w-full rounded-lg py-3 font-semibold text-white"
                  style={{ backgroundColor: '#2a2e30' }}
                >
                  View Hours
                </button>
                <button
                  type="button"
                  onClick={() => setViewClosedMenu(true)}
                  className="mt-3 w-full rounded-lg border py-3 font-semibold"
                  style={{ borderColor: '#2a2e30', color: '#2a2e30' }}
                >
                  View Menu
                </button>
              </>
            )}
          </div>
        </main>
        {showHours && <HoursDialog onClose={() => setShowHours(false)} />}
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${restaurantOpen ? 'pb-48' : 'pb-12'}`}
      style={{ backgroundColor: '#f7f4eb', color: '#2a2e30', fontFamily: "'Inter', sans-serif" }}
    >
      <div className="sticky top-0 z-10">
        <ChristmasHeader restaurantOpen={restaurantOpen} />
      </div>

      <div className="max-w-lg mx-auto p-4">
        {restaurantOpen ? (
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
        ) : (
          <div className="mb-6 rounded-xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#d9cdc9' }}>
            <h2 className="font-semibold">Ordering is currently closed</h2>
            <p className="mt-1 text-sm" style={{ color: '#7a7a7a' }}>
              You can browse the menu, but items cannot be added until the kitchen opens.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setViewClosedMenu(false)}
                className="flex-1 rounded-lg border py-2 font-semibold"
                style={{ borderColor: '#2a2e30', color: '#2a2e30' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setShowHours(true)}
                className="flex-1 rounded-lg py-2 font-semibold text-white"
                style={{ backgroundColor: '#2a2e30' }}
              >
                View Hours
              </button>
            </div>
          </div>
        )}

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
                const cartItems = cart.filter(c => c.menuItemId === item.id)
                const cartItem = cartItems[0]
                const manyAddons = item.addons?.filter(a => a.type === 'many') ?? []
                const oneAddons = item.addons?.filter(a => a.type === 'one') ?? []
                const hasOptions = manyAddons.length > 0 || oneAddons.length > 0
                return (
                  <div key={item.id} className="rounded-xl shadow-sm p-4" style={{ backgroundColor: '#fff' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold" style={{ color: '#2a2e30' }}>{item.name}</h3>
                        <p className="text-sm mt-0.5" style={{ color: '#7a7a7a' }}>{item.description}</p>
                        <p className="font-medium mt-1" style={{ color: '#2a2e30' }}>${item.price.toFixed(2)}</p>
                      </div>
                      {restaurantOpen && <div className="flex items-center gap-2">
                        {cartItem && !hasOptions ? (
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
                      </div>}
                    </div>

                    {cartItems.map((cartLine, index) => hasOptions && (
                      <div key={cartLine.id} className="mt-3 rounded-lg border p-3" style={{ borderColor: '#d9cdc9' }}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold">{item.name} #{index + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(cartLine.id)}
                            className="text-sm font-semibold"
                            style={{ color: '#7E0923' }}
                          >
                            Remove
                          </button>
                        </div>
                        {oneAddons.length > 0 && (
                          <div>
                            <p className="mb-2 text-sm font-medium">Pick one:</p>
                            {oneAddons.map(addon => (
                              <label key={addon.label} className="mb-1 flex cursor-pointer items-center gap-2">
                                <input
                                  type="radio"
                                  name={`one-${cartLine.id}`}
                                  checked={cartLine.addons.includes(addon.label)}
                                  onChange={() => selectOneAddon(cartLine.id, addon.label, addon.price, item.addons)}
                                />
                                <span className="text-sm">
                                  {addon.label}
                                  {addon.price > 0 && <span style={{ color: '#7a7a7a' }}> +${addon.price.toFixed(2)}</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                        {manyAddons.length > 0 && (
                          <div className={oneAddons.length > 0 ? 'mt-3' : ''}>
                            <p className="mb-2 text-sm font-medium">Add-ons:</p>
                            {manyAddons.map(addon => (
                              <label key={addon.label} className="mb-1 flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cartLine.addons.includes(addon.label)}
                                  onChange={() => toggleManyAddon(cartLine.id, addon.label, addon.price)}
                                />
                                <span className="text-sm">
                                  {addon.label}
                                  {addon.price > 0 && <span style={{ color: '#7a7a7a' }}> +${addon.price.toFixed(2)}</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                        <input
                          className="mt-3 w-full rounded-lg border p-2 text-sm outline-none"
                          placeholder="Special instructions (optional)"
                          value={cartLine.note}
                          onChange={e => updateNote(cartLine.id, e.target.value)}
                          style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
                        />
                      </div>
                    ))}

                    {cartItem && !hasOptions && (
                      <input
                        className="w-full border rounded-lg p-2 mt-3 text-sm outline-none"
                        placeholder="Special instructions (optional)"
                        value={cartItem.note}
                        onChange={e => updateNote(item.id, e.target.value)}
                        style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
                      />
                    )}

                    {restaurantOpen && hasOptions && cartItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="mt-3 w-full rounded-lg border py-2 text-sm font-semibold"
                        style={{ borderColor: '#2a2e30', color: '#2a2e30' }}
                      >
                        + Add another {item.name}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {restaurantOpen && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t shadow-lg p-4" style={{ backgroundColor: '#f7f4eb', borderColor: '#d9cdc9' }}>
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between mb-3">
              <span className="font-semibold" style={{ color: '#2a2e30' }}>Total</span>
              <span className="font-bold" style={{ color: '#2a2e30' }}>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={submitOrder}
              disabled={loading || !customerName}
              className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#21513e', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem' }}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
      {showHours && <HoursDialog onClose={() => setShowHours(false)} />}
    </div>
  )
}
