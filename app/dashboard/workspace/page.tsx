"use client"

type Task = {
  title: string
  desc: string
  tag: string
  date?: string
  alert?: boolean
  warning?: boolean
  comments?: string
  done?: boolean
}

type Column = {
  title: string
  count: number
  tasks: Task[]
}

export default function WorkspacePage() {
  const columns: Column[] = [
    {
      title: 'Backlog',
      count: 3,
      tasks: [
        { title: 'Draft poster board layout', desc: 'Collect figures and test result captions.', date: 'Feb 28', tag: 'Documentation' },
        { title: 'Cost per paver analysis', desc: 'Compare material pricing vs traditional blocks.', date: 'Feb 27', tag: 'Research' }
      ]
    },
    {
      title: 'In Progress',
      count: 3,
      tasks: [
        { title: 'Tensile strain curves - batch B5', desc: 'Required by mentor before Tuesday rehearsal.', tag: 'Lab Testing', alert: true },
        { title: 'Moisture absorption variance', desc: '24h immersion test on 6 sample cores.', tag: 'Lab Testing' },
        { title: 'Prepare pitch storyline', desc: 'Focus on circular economy and durability.', date: 'Mar 04', tag: 'Documentation' }
      ]
    },
    {
      title: 'In Review',
      count: 2,
      tasks: [
        { title: 'Ethics declaration', desc: 'Pending advisor signature from Dr. Hartono.', tag: 'Compliance', warning: true },
        { title: 'Abstract v3', desc: 'Peer review comments to resolve.', tag: 'Documentation', comments: '4 comments' }
      ]
    },
    {
      title: 'Done',
      count: 4,
      tasks: [
        { title: 'Compressive yield test B4', desc: 'Reached 24.6 MPa.', tag: 'Lab Testing', done: true },
        { title: '3-minute prototype video', desc: 'Uploaded successfully.', date: 'Feb 26', tag: 'Documentation', done: true },
        { title: 'Institutional safety clearance', desc: 'Approved by safety committee.', tag: 'Compliance', done: true },
        { title: 'Density measurements', desc: 'Mean density 1.28 g/cm³.', tag: 'Lab Testing', done: true }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Project Workspace 🗂️</h1>
          <p className="text-sm text-slate-500 mt-1">Sprint 4: Feb 17 - Mar 02 • Eco-Friendly Plastic Bricks (GEO-2025-081)</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-900">
            <i className="fa-solid fa-user-plus text-amber-500"></i> Invite
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600">
            <i className="fa-solid fa-plus"></i> Add Task
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col, idx) => (
          <div key={idx} className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between font-bold text-sm text-slate-700">
              <span>{col.title}</span>
              <span className="w-6 h-6 rounded-full bg-white text-slate-600 text-xs grid place-items-center shadow-sm">{col.count}</span>
            </div>

            <div className="space-y-3 flex-1">
              {col.tasks.map((task, tIdx) => (
                <div key={tIdx} className={`bg-white border rounded-xl p-4 shadow-sm space-y-2 ${task.warning ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{task.tag}</span>
                    {task.date && <span className="text-[10px] text-slate-400">{task.date}</span>}
                  </div>
                  <b className="text-xs block text-slate-900">{task.title}</b>
                  <p className="text-[11px] text-slate-500">{task.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}