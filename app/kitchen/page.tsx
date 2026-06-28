'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [orders, setOrders] = useState<Order[]>([])
  const [connected, setConnected] = useState(true)
  const audioRef = useRef<AudioContext | null>(null)

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

  useEffect(() => {
    fetchPendingOrders()

    const channel = supabase
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

    // Reconnect when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPendingOrders()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kitchen Dashboard</h1>
        <span className={`text-sm px-3 py-1 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}>
          {connected ? '🟢 Live' : '🔴 Reconnecting...'}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <p className="text-xl">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <div
              key={order.id}
              className={`rounded-xl p-4 ${order.status === 'preparing' ? 'bg-yellow-800' : 'bg-gray-800'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-xl font-bold">Table {order.table_number}</h2>
                  <p className="text-gray-400 text-sm">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'preparing' ? 'bg-yellow-500 text-black' : 'bg-blue-500'}`}>
                    {order.status}
                  </span>
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
                {order.status === 'pending' && (
                  <button
                    onClick={() => markPreparing(order.id)}
                    className="flex-1 bg-yellow-500 text-black py-2 rounded-lg font-bold"
                  >
                    Preparing
                  </button>
                )}
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