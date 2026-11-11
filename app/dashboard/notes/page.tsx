"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type PrototypeNote = {
  id: number | string
  sample_id: string
  title: string
  date: string
  peak: string
  load: string
  temp: string
  time: string
  status: string
  author_name?: string
}

export default function PrototypeNotesPage() {
  const [notes, setNotes] = useState<PrototypeNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('Innovator')

  // Form State untuk New Entry
  const [sampleId, setSampleId] = useState('SAMPLE-GEO-B5')
  const [title, setTitle] = useState('')
  const [peak, setPeak] = useState('24.0 MPa')
  const [load, setLoad] = useState('3.0 mm')
  const [temp, setTemp] = useState('185 °C')
  const [time, setTime] = useState('12 min')
  const [status, setStatus] = useState('Pass')

  useEffect(() => {
    async function initData() {
      setLoading(true)

      // Ambil nama user yang sedang login dari session auth Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.lead_name || session.user.email?.split('@')[0] || 'Innovator'
        setCurrentUserName(fullName)
      }

      // Tarik data real dari tabel prototype_notes_ledger di Supabase
      const { data, error } = await supabase
        .from('prototype_notes_ledger')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data) {
        setNotes(data)
      } else {
        setNotes([])
      }
      setLoading(false)
    }

    initData()
  }, [])

  async function handleCreateEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const currentDate = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newEntry = {
      sample_id: sampleId,
      title,
      date: currentDate,
      peak,
      load,
      temp,
      time,
      status,
      author_name: currentUserName
    }

    const { data, error } = await supabase
      .from('prototype_notes_ledger')
      .insert([newEntry])
      .select()

    if (!error && data) {
      setNotes([data[0], ...notes])
      setShowModal(false)
      setTitle('')
    } else {
      alert('Failed to save entry to database: ' + (error?.message || 'Unknown error'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prototype Notes &amp; Lab Ledger 📓</h1>
          <p className="text-sm text-slate-500 mt-1">Digital lab notebook logged with ISO/IEC 17025 rigor.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('Exporting ISEF Notebook PDF package...')}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf text-red-500"></i> Export ISEF Notebook
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i> New Entry
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading lab ledger records from database...</div>
      ) : notes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-flask"></i>
          </div>
          <h3 className="font-bold text-slate-900">No Lab Entries Recorded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Click &quot;New Entry&quot; above to add your first prototype testing record to Supabase.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {notes.map((n) => (
            <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{n.sample_id}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${n.status === 'Pass' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    Mentor Signed ({n.status})
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{n.title}</h3>
                <p className="text-xs text-slate-500">Logged by {n.author_name || currentUserName} • {n.date}</p>
              </div>

              <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                <div className="text-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase">Peak Load</p>
                  <b className="text-amber-600 text-sm">{n.peak}</b>
                </div>
                <div className="text-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase">Temp</p>
                  <b className="text-slate-900 text-sm">{n.temp}</b>
                </div>
                <button 
                  onClick={() => alert(`Viewing full lab dossier for ${n.sample_id}`)}
                  className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  View Dossier →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal New Entry */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg">New Lab Ledger Entry 🧪</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sample ID</label>
                  <input 
                    type="text" 
                    value={sampleId} 
                    onChange={(e) => setSampleId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-500"
                  >
                    <option value="Pass">Pass</option>
                    <option value="Review">Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Test Title / Description</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Compressive strength test - sample B5" 
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-1">Peak Load</label>
                  <input type="text" value={peak} onChange={(e) => setPeak(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-1">Deflection</label>
                  <input type="text" value={load} onChange={(e) => setLoad(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-1">Temp</label>
                  <input type="text" value={temp} onChange={(e) => setTemp(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-1">Duration</label>
                  <input type="text" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:border-amber-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm cursor-pointer">
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}