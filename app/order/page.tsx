'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  is_available: boolean
}

type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  note: string
}

export default function OrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchMenu = async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
      console.log('menu data:', data)
      console.log('menu error:', error)
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
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, note: '' }]
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

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  const categories = [...new Set(menuItems.map(i => i.category))]

  const submitOrder = async () => {
    if (!customerName || !tableNumber || cart.length === 0) return
    setLoading(true)
    await supabase.from('orders').insert({
      customer_name: customerName,
      table_number: tableNumber,
      items: cart,
      status: 'pending'
    })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
          <p className="text-gray-600">We'll have it out to you soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-48">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-center">Menu</h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-semibold mb-3">Your Info</h2>
          <input
            className="w-full border rounded-lg p-2 mb-2"
            placeholder="Your name"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
          <input
            className="w-full border rounded-lg p-2"
            placeholder="Table number"
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
          />
        </div>

        {categories.map(category => (
          <div key={category} className="mb-6">
            <h2 className="font-bold text-lg mb-3">{category}</h2>
            <div className="space-y-3">
              {menuItems.filter(i => i.category === category).map(item => {
                const cartItem = cart.find(c => c.id === item.id)
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-gray-500 text-sm">{item.description}</p>
                        <p className="text-green-600 font-medium mt-1">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cartItem ? (
                          <>
                            <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-gray-100 font-bold">−</button>
                            <span className="w-4 text-center">{cartItem.qty}</span>
                            <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-green-500 text-white font-bold">+</button>
                          </>
                        ) : (
                          <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-green-500 text-white font-bold">+</button>
                        )}
                      </div>
                    </div>
                    {cartItem && (
                      <input
                        className="w-full border rounded-lg p-2 mt-2 text-sm"
                        placeholder="Special instructions (optional)"
                        value={cartItem.note}
                        onChange={e => updateNote(item.id, e.target.value)}
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between mb-3">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-green-600">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={submitOrder}
              disabled={loading || !customerName || !tableNumber}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}