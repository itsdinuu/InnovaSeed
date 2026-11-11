"use client"

export default function PrototypeNotesPage() {
  const notes = [
    { id: 'SAMPLE-GEO-B4', title: 'Compressive test - sample B4', date: 'Today, 09:42', peak: '24.6 MPa', load: '3.2 mm', temp: '190 °C', time: '12 min', status: 'Pass' },
    { id: 'SAMPLE-GEO-B3', title: 'Density & porosity check', date: 'Feb 22', peak: '24.1 MPa', load: '3.1 mm', temp: '185 °C', time: '10 min', status: 'Pass' },
    { id: 'SAMPLE-GEO-B2', title: 'Extrusion temperature trial', date: 'Feb 19', peak: '22.7 MPa', load: '2.9 mm', temp: '180 °C', time: '15 min', status: 'Review' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prototype Notes &amp; Lab Ledger 📓</h1>
          <p className="text-sm text-slate-500 mt-1">Digital lab notebook for Eco-Bricks Gen 3 — 12 samples logged with ISO/IEC 17025 rigor.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-900">
            <i className="fa-solid fa-file-pdf text-red-500"></i> Export ISEF Notebook
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600">
            <i className="fa-solid fa-plus"></i> New Entry
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {notes.map((n, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{n.id}</span>
                <span className="text-[11px] px-2 py-0.5 bg-green-50 text-green-700 rounded font-medium">Mentor Signed</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{n.title}</h3>
              <p className="text-xs text-slate-500">Logged by Nadia Kusuma • {n.date}</p>
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
              <button className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                View Dossier →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}