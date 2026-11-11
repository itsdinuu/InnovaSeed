"use client"

export default function MentorDashboardPage() {
  const pendingReviews = [
    { team: 'Team GeoPoly', project: 'Eco-Bricks Gen 3', field: 'Materials Science', time: '2 hours ago', status: 'Pending Review', highlight: true },
    { team: 'Bio-Spark Team', project: 'Banana-Fiber Bioplastic Film', field: 'Biotechnology', time: 'Yesterday', status: 'Needs Sign-off' },
    { team: 'AgriSense Lab', project: 'Solar-Powered Soil Sensor', field: 'IoT & AgriTech', time: '3 days ago', status: 'Reviewed' }
  ]

  const metrics = [
    { label: 'Assigned Teams', value: '12 Teams', desc: 'Across 4 research tracks' },
    { label: 'Pending Endorsements', value: '4 Docs', desc: 'Ethics & safety clearances' },
    { label: 'Avg. Response Time', value: '14 Hours', desc: 'Within SLA targets' },
    { label: 'National Qualifiers', value: '5 Teams', desc: 'Advancing to grand finals' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Faculty Mentor Console 🔬</h1>
        <p className="text-sm text-stone-500 mt-1">Review student telemetry data, authorize safety clearances, and endorse project milestones.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-stone-500 mb-1">{m.label}</p>
            <b className="text-2xl text-stone-900">{m.value}</b>
            <p className="text-xs text-stone-500 mt-1">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Teams Review Queue */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg"><i className="fa-solid fa-list-check text-amber-500 mr-2"></i>Student Teams Review Queue</h2>
          <span className="text-xs text-stone-500">Showing 3 active submissions</span>
        </div>

        <div className="space-y-3">
          {pendingReviews.map((item, idx) => (
            <div key={idx} className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${item.highlight ? 'border-amber-500 bg-amber-50/30' : 'border-stone-200 bg-stone-50/50'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <b className="text-sm">{item.team}</b>
                  <span className="text-[11px] px-2 py-0.5 bg-stone-200 text-stone-700 rounded font-medium">{item.field}</span>
                </div>
                <p className="text-xs text-stone-600 mt-1">Project: <b>{item.project}</b> • Submitted {item.time}</p>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${item.status === 'Reviewed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                  {item.status}
                </span>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition bg-stone-900 text-white hover:bg-stone-800">
                  Open Evaluation Dossier →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Endorsement Form */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base"><i className="fa-solid fa-signature text-amber-500 mr-2"></i>Quick Milestone Sign-off &amp; Endorsement</h3>
        <p className="text-xs text-stone-500 mt-0.5">Issue formal faculty verification or digital sign-off for student lab notebooks.</p>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Select Student Team</label>
            <select className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500">
              <option>Team GeoPoly (Eco-Bricks Gen 3)</option>
              <option>Bio-Spark Team (Bioplastic Film)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Endorsement Type</label>
            <select className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500">
              <option>Milestone 3 Telemetry Verification</option>
              <option>Ethical Clearance Sign-off</option>
              <option>Safety Compliance Approval</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Action</label>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition bg-amber-500 text-stone-950 hover:bg-amber-600">
              <i className="fa-solid fa-check-to-slot"></i> Authorize &amp; Sign Digitally
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}