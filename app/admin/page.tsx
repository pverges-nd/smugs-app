'use client'

import { useEffect, useState } from 'react'
import { Bebas_Neue, Inter } from 'next/font/google'
import { supabase } from '@/lib/supabase'

const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400' })
const inter = Inter({ subsets: ['latin'] })

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

const ADMIN_PASSWORD = 'smugsadmin'
const CATEGORIES = ['Specials', 'Mains', 'Snacks', 'Drinks']

const emptyItem = { name: '', description: '', price: '', category: 'Specials', addons: [] as Addon[] }
const emptyAddon = { label: '', price: '', type: 'many' as 'one' | 'many' }

const AddonForm = ({ addon, setAddon, onAdd }: { addon: typeof emptyAddon, setAddon: (a: typeof emptyAddon) => void, onAdd: () => void }) => (
    <div className="border rounded-lg p-3 mt-3" style={{ borderColor: '#d9cdc9' }}>
      <p className="text-sm font-medium mb-2" style={{ color: '#2a2e30' }}>Add an option</p>
      <input
        className="w-full border rounded-lg p-2 mb-2 outline-none text-sm"
        placeholder="Option label (e.g. Vanilla, Ham)"
        value={addon.label}
        onChange={e => setAddon({ ...addon, label: e.target.value })}
        style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
      />
      <input
        className="w-full border rounded-lg p-2 mb-2 outline-none text-sm"
        placeholder="Extra cost (leave blank for free)"
        value={addon.price}
        onChange={e => setAddon({ ...addon, price: e.target.value })}
        style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
      />
      <div className="flex gap-4 mb-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#2a2e30' }}>
          <input type="radio" checked={addon.type === 'many'} onChange={() => setAddon({ ...addon, type: 'many' })} />
          Pick many (checkboxes)
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#2a2e30' }}>
          <input type="radio" checked={addon.type === 'one'} onChange={() => setAddon({ ...addon, type: 'one' })} />
          Pick one (radio)
        </label>
      </div>
      <button
        onClick={onAdd}
        className="text-sm px-3 py-1 rounded-lg text-white"
        style={{ backgroundColor: '#2a2e30' }}
      >
        + Add Option
      </button>
    </div>
  )


export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [error, setError] = useState('')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [newItem, setNewItem] = useState(emptyItem)
  const [newAddon, setNewAddon] = useState(emptyAddon)
  const [adding, setAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editAddon, setEditAddon] = useState(emptyAddon)

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true)
      setError('')
    } else {
      setError('Incorrect password')
    }
  }

  const fetchItems = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('category')
    if (data) setMenuItems(data)
  }

  useEffect(() => {
    if (authed) fetchItems()
  }, [authed])

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, is_available: !current } : i))
  }

  const deleteItem = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id)
    setMenuItems(prev => prev.filter(i => i.id !== id))
  }

  const addItem = async () => {
    if (!newItem.name || !newItem.price) return
    setAdding(true)
    const { data } = await supabase.from('menu_items').insert({
      name: newItem.name,
      description: newItem.description,
      price: parseFloat(newItem.price),
      category: newItem.category,
      is_available: true,
      addons: newItem.addons
    }).select()
    if (data) setMenuItems(prev => [...prev, data[0]])
    setNewItem(emptyItem)
    setNewAddon(emptyAddon)
    setAdding(false)
  }

  const addAddonToNewItem = () => {
    if (!newAddon.label) return
    setNewItem(prev => ({
      ...prev,
      addons: [...prev.addons, { label: newAddon.label, price: parseFloat(newAddon.price || '0'), type: newAddon.type }]
    }))
    setNewAddon(emptyAddon)
  }

  const removeAddonFromNewItem = (index: number) => {
    setNewItem(prev => ({ ...prev, addons: prev.addons.filter((_, i) => i !== index) }))
  }

  const saveEdit = async () => {
    if (!editingItem) return
    await supabase.from('menu_items').update({
      name: editingItem.name,
      description: editingItem.description,
      price: editingItem.price,
      category: editingItem.category,
      addons: editingItem.addons
    }).eq('id', editingItem.id)
    setMenuItems(prev => prev.map(i => i.id === editingItem.id ? editingItem : i))
    setEditingItem(null)
    setEditAddon(emptyAddon)
  }

  const addAddonToEdit = () => {
    if (!editingItem || !editAddon.label) return
    setEditingItem(prev => prev ? ({
      ...prev,
      addons: [...prev.addons, { label: editAddon.label, price: parseFloat(editAddon.price || '0'), type: editAddon.type }]
    }) : null)
    setEditAddon(emptyAddon)
  }

  const removeAddonFromEdit = (index: number) => {
    setEditingItem(prev => prev ? ({ ...prev, addons: prev.addons.filter((_, i) => i !== index) }) : null)
  }

  if (!authed) {
    return (
      <div className={`${inter.className} min-h-screen flex items-center justify-center p-4`} style={{ backgroundColor: '#f0f0f0' }}>
        <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-sm">
          <h1 className={bebasNeue.className} style={{ fontSize: '2rem', color: '#7E0923', textAlign: 'center' }}>
            Admin Login
          </h1>
          <input
            type="password"
            className="w-full border rounded-lg p-2 mt-4 outline-none"
            placeholder="Password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full mt-4 py-2 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#2a2e30' }}
          >
            Enter
          </button>
        </div>
      </div>
    )
  }



  return (
    <div className={`${inter.className} min-h-screen px-4 py-6 sm:px-6`} style={{ backgroundColor: '#f0f0f0' }}>
      <div className="w-full max-w-lg mx-auto">
        <h1 className={bebasNeue.className} style={{ fontSize: '2.5rem', color: '#7E0923', textAlign: 'center' }}>
          Menu Admin
        </h1>

        {/* Add new item */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
        <h2 className="font-semibold mb-3" style={{ color: '#2a2e30' }}>Add New Item</h2>
        <input
          className="w-full border rounded-lg p-2 mb-2 outline-none"
          placeholder="Name"
          value={newItem.name}
          onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
        />
        <input
          className="w-full border rounded-lg p-2 mb-2 outline-none"
          placeholder="Description (optional)"
          value={newItem.description}
          onChange={e => setNewItem({ ...newItem, description: e.target.value })}
          style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
        />
        <input
          className="w-full border rounded-lg p-2 mb-2 outline-none"
          placeholder="Price (e.g. 8.99)"
          value={newItem.price}
          onChange={e => setNewItem({ ...newItem, price: e.target.value })}
          style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
        />
        <select
          className="w-full border rounded-lg p-2 mb-2 outline-none"
          value={newItem.category}
          onChange={e => setNewItem({ ...newItem, category: e.target.value })}
          style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
        >
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        {newItem.addons.length > 0 && (
          <div className="mb-2 space-y-1">
            {newItem.addons.map((a, i) => (
              <div key={i} className="flex justify-between items-center text-sm px-2 py-1 rounded" style={{ backgroundColor: '#f0f0f0', color: '#2a2e30' }}>
                <span>{a.label} {a.price > 0 ? `+$${a.price.toFixed(2)}` : '(free)'} · {a.type === 'one' ? 'pick one' : 'pick many'}</span>
                <button onClick={() => removeAddonFromNewItem(i)} style={{ color: '#7E0923' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <AddonForm addon={newAddon} setAddon={setNewAddon} onAdd={addAddonToNewItem} />

        <button
          onClick={addItem}
          disabled={adding}
          className="w-full mt-4 py-2 rounded-xl text-white font-bold disabled:opacity-50"
          style={{ backgroundColor: '#2a2e30' }}
        >
          {adding ? 'Adding...' : 'Add Item'}
        </button>
        </div>

        {/* Current menu items */}
        <div>
        <h2 className="font-semibold mb-3" style={{ color: '#2a2e30' }}>Current Menu</h2>
        <div className="space-y-3">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm p-4">
              {editingItem?.id === item.id ? (
                <div>
                  <input
                    className="w-full border rounded-lg p-2 mb-2 outline-none"
                    value={editingItem.name}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
                  />
                  <input
                    className="w-full border rounded-lg p-2 mb-2 outline-none"
                    value={editingItem.description}
                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                    style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
                  />
                  <input
                    className="w-full border rounded-lg p-2 mb-2 outline-none"
                    value={editingItem.price}
                    onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                    style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
                  />
                  <select
                    className="w-full border rounded-lg p-2 mb-2 outline-none"
                    value={editingItem.category}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    style={{ borderColor: '#d9cdc9', color: '#2a2e30' }}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  {editingItem.addons.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {editingItem.addons.map((a, i) => (
                        <div key={i} className="flex justify-between items-center text-sm px-2 py-1 rounded" style={{ backgroundColor: '#f0f0f0', color: '#2a2e30' }}>
                          <span>{a.label} {a.price > 0 ? `+$${a.price.toFixed(2)}` : '(free)'} · {a.type === 'one' ? 'pick one' : 'pick many'}</span>
                          <button onClick={() => removeAddonFromEdit(i)} style={{ color: '#7E0923' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <AddonForm addon={editAddon} setAddon={setEditAddon} onAdd={addAddonToEdit} />

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-2 rounded-xl text-white font-bold"
                      style={{ backgroundColor: '#2a2e30' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-2 rounded-xl font-bold"
                      style={{ backgroundColor: '#f0f0f0', color: '#2a2e30' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold" style={{ color: '#2a2e30' }}>{item.name}</p>
                    <p className="text-sm" style={{ color: '#7a7a7a' }}>{item.category} · ${item.price.toFixed(2)}</p>
                    {item.addons?.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: '#7a7a7a' }}>
                        Options: {item.addons.map(a => a.label).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className="text-sm px-3 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: item.is_available ? '#e6f4ea' : '#fde8e8',
                        color: item.is_available ? '#2a7a3b' : '#7E0923'
                      }}
                    >
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                    <button
                      onClick={() => { setEditingItem(item); setEditAddon(emptyAddon) }}
                      className="text-sm px-3 py-1 rounded-full font-medium"
                      style={{ backgroundColor: '#e8f0fe', color: '#2a2e30' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-sm px-3 py-1 rounded-full font-medium"
                      style={{ backgroundColor: '#fde8e8', color: '#7E0923' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}
