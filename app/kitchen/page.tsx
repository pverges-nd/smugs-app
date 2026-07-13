'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { RESTAURANT_SETTINGS_ID, type RestaurantSettings } from '@/lib/restaurant'

const KITCHEN_PASSWORD = 'smugskitchen'

type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  note: string
}

type Order = {
  id: string
  created_at: string
  customer_name: string
  table_number: string
  items: CartItem[]
  status: string
}

export default function KitchenPage() {
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [connected, setConnected] = useState(true)
  const [restaurantOpen, setRestaurantOpen] = useState<boolean | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState('')
  const audioRef = useRef<AudioContext | null>(null)

  const handleLogin = () => {
    if (passwordInput === KITCHEN_PASSWORD) {
      setAuthed(true)
      setLoginError('')
    } else {
      setLoginError('Incorrect password')
    }
  }

  const playDing = () => {
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 880
      gainNode.gain.setValueAtTime(1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch (e) {}
  }

  const fetchPendingOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true })
    if (data) setOrders(data)
  }

  const markComplete = async (id: string) => {
    await supabase.from('orders').update({ status: 'completed' }).eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  const markPreparing = async (id: string) => {
    await supabase.from('orders').update({ status: 'preparing' }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'preparing' } : o))
  }

  const fetchRestaurantStatus = async () => {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('is_open')
      .eq('id', RESTAURANT_SETTINGS_ID)
      .single()

    if (error) {
      setRestaurantOpen(false)
      setStatusError('Restaurant status is unavailable. Run the database migration.')
      return
    }

    setRestaurantOpen(data.is_open)
    setStatusError('')
  }

  const toggleRestaurantStatus = async () => {
    if (restaurantOpen === null || statusSaving) return

    setStatusSaving(true)
    setStatusError('')

    const nextStatus = !restaurantOpen
    const { error } = await supabase
      .from('restaurant_settings')
      .update({ is_open: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', RESTAURANT_SETTINGS_ID)

    if (error) {
      setStatusError('Could not update the restaurant status. Please try again.')
    } else {
      setRestaurantOpen(nextStatus)
    }

    setStatusSaving(false)
  }

  useEffect(() => {
    if (!authed) return

    fetchPendingOrders()
    fetchRestaurantStatus()

    const ordersChannel = supabase
      .channel('orders-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        setOrders(prev => [...prev, payload.new as Order])
        playDing()
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    const settingsChannel = supabase
      .channel('restaurant-settings-kitchen')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurant_settings',
        filter: `id=eq.${RESTAURANT_SETTINGS_ID}`
      }, (payload) => {
        const settings = payload.new as RestaurantSettings
        setRestaurantOpen(settings.is_open)
        setStatusError('')
      })
      .subscribe()

    // Reconnect when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPendingOrders()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(settingsChannel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [authed])

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
        <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8 shadow-xl">
          <h1 className="text-center text-3xl font-bold">Kitchen Login</h1>
          <input
            type="password"
            value={passwordInput}
            onChange={event => setPasswordInput(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handleLogin()}
            placeholder="Password"
            autoFocus
            className="mt-6 w-full rounded-lg border border-gray-600 bg-gray-900 p-3 text-white outline-none focus:border-green-500"
          />
          {loginError && <p className="mt-2 text-sm text-red-400">{loginError}</p>}
          <button
            type="button"
            onClick={handleLogin}
            className="mt-4 w-full rounded-lg bg-green-500 py-3 font-bold text-black"
          >
            Enter Kitchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kitchen Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Ordering is {restaurantOpen ? 'open' : 'closed'} for customers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-sm px-3 py-1 rounded-full ${connected ? 'bg-green-500 text-black' : 'bg-red-500'}`}>
            {connected ? 'Live' : 'Reconnecting...'}
          </span>
          <button
            type="button"
            onClick={toggleRestaurantStatus}
            disabled={restaurantOpen === null || statusSaving}
            className={`min-w-48 px-5 py-3 rounded-lg font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
              restaurantOpen
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-black'
            }`}
          >
            {statusSaving
              ? 'Updating...'
              : restaurantOpen
                ? 'Close Restaurant'
                : 'Open Restaurant'}
          </button>
        </div>
      </div>

      {statusError && (
        <p className="mb-6 rounded-lg border border-red-500 bg-red-950 p-3 text-sm text-red-200">
          {statusError}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <p className="text-xl">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
              <div key={order.id} className="rounded-xl p-4 bg-gray-800">
              <div className="flex justify-between items-start mb-3">
                <div>
                <h2 className="text-xl font-bold">{order.customer_name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item, i) => (
                  <div key={i} className="border-b border-gray-700 pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.qty}x {item.name}</span>
                    </div>
                    {item.note && (
                      <p className="text-yellow-400 text-sm mt-1">⚠️ {item.note}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => markComplete(order.id)}
                  className="flex-1 bg-green-500 text-black py-2 rounded-lg font-bold"
                >
                  Complete ✓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
