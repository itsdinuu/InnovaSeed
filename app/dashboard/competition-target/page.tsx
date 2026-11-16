"use client"

import { useState } from 'react'
import { Trophy, ShieldCheck, Award, Calendar, CheckCircle2, ArrowRight } from 'lucide-react'

interface Competition {
  id: string
  title: string
  organizer: string
  category: 'official' | 'curated' | 'prestigious'
  categoryLabel: string
  deadline: string
  level: string
  selected: boolean
}

export default function CompetitionTargetPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all")
  
  const [competitions, setCompetitions] = useState<Competition[]>([
    {
      id: "opsi-2027",
      title: "OPSI (Olimpiade Penelitian Siswa Indonesia)",
      organizer: "Puspresnas / BPTI",
      category: "official",
      categoryLabel: "Resmi Negara",
      deadline: "15 Maret 2027",
      level: "SMP & SMA",
      selected: true
    },
    {
      id: "fls2n-2027",
      title: "FLS2N – Kriya Inovasi & Desain Poster",
      organizer: "Puspresnas / BPTI",
      category: "official",
      categoryLabel: "Resmi Negara",
      deadline: "10 April 2027",
      level: "SD, SMP, SMA",
      selected: false
    },
    {
      id: "iyd-2027",
      title: "IYSA – Indonesia Inventors Day (IID)",
      organizer: "IYSA & INNOPA",
      category: "curated",
      categoryLabel: "Terkurasi Puspresnas",
      deadline: "25 Mei 2027",
      level: "SD, SMP, SMA",
      selected: false
    },
    {
      id: "isif-2027",
      title: "ISIF (International Science and Invention Fair)",
      organizer: "IYSA",
      category: "prestigious",
      categoryLabel: "Bergengsi Non-Terkurasi",
      deadline: "20 Agustus 2027",
      level: "SD, SMP, SMA",
      selected: false
    }
  ])

  const toggleSelectCompetition = (id: string) => {
    setCompetitions(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    )
  }

  const filteredCompetitions = activeCategory === "all" 
    ? competitions 
    : competitions.filter(item => item.category === activeCategory)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Trophy className="w-7 h-7 text-amber-400" /> Competition Target
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Pilih sumber data dan tentukan target perlombaan yang ingin kamu ikuti tahun ini.
        </p>
      </div>

      {/* Kartu Ringkasan Kategori (Sesuai Referensi UI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => setActiveCategory("official")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer bg-slate-900/90 ${
            activeCategory === "official" ? "border-amber-500 shadow-lg shadow-amber-500/10" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold text-slate-100">17</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100">Resmi Negara</h3>
          <p className="text-xs text-slate-400 mt-0.5">Diselenggarakan langsung oleh pemerintah.</p>
        </div>

        <div 
          onClick={() => setActiveCategory("curated")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer bg-slate-900/90 ${
            activeCategory === "curated" ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold text-slate-100">1.057</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100">Terkurasi Puspresnas</h3>
          <p className="text-xs text-slate-400 mt-0.5">Lolos kurasi resmi, ada rating 1-5.</p>
        </div>

        <div 
          onClick={() => setActiveCategory("prestigious")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer bg-slate-900/90 ${
            activeCategory === "prestigious" ? "border-purple-500 shadow-lg shadow-purple-500/10" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold text-slate-100">803</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100">Bergengsi Non-Terkurasi</h3>
          <p className="text-xs text-slate-400 mt-0.5">Belum dikurasi, tetap sangat bergengsi.</p>
        </div>
      </div>

      {activeCategory !== "all" && (
        <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-300">Menampilkan filter kategori: <strong className="text-indigo-400 uppercase">{activeCategory}</strong></span>
          <button 
            onClick={() => setActiveCategory("all")}
            className="text-indigo-400 hover:underline font-semibold cursor-pointer"
          >
            Tampilkan Semua
          </button>
        </div>
      )}

      {/* Daftar Kompetisi */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-200">Daftar Kompetisi Pilihan</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {filteredCompetitions.map((comp) => (
            <div 
              key={comp.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-500/20 font-medium">
                    {comp.categoryLabel}
                  </span>
                  <span className="text-xs text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-800">
                    Target: {comp.level}
                  </span>
                </div>
                
                <h3 className="text-base font-bold text-slate-100">{comp.title}</h3>
                
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Penyelenggara: <strong className="text-slate-300">{comp.organizer}</strong></span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Calendar className="w-3.5 h-3.5" /> Deadline: {comp.deadline}
                  </span>
                </div>
              </div>

              <button
                onClick={() => toggleSelectCompetition(comp.id)}
                className={`w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  comp.selected
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                }`}
              >
                {comp.selected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Masuk Competition Prep
                  </>
                ) : (
                  <>
                    Targetkan Lomba <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}