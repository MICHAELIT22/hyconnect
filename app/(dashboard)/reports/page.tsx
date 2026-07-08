'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import '@/lib/chartSetup'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const COLORS = ['#1B5E20','#43A047','#66BB6A','#A5D6A7','#1565C0','#1976D2','#42A5F5','#E65100','#F57C00','#FF9800']

const CHART_OPTS_LINE = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 } } },
  },
}

function KpiCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon?: string }) {
  return (
    <div className="bg-surface rounded-xl border border-outline-variant p-4">
      {icon && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption text-on-surface-variant">{label}</span>
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">{icon}</span>
        </div>
      )}
      {!icon && <p className="text-caption text-on-surface-variant mb-1">{label}</p>}
      <p className="text-display-lg font-bold text-on-surface">{value}</p>
      {sub && <p className="text-caption text-secondary mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-surface rounded-xl border border-outline-variant p-5 ${className}`}>
      <p className="text-body-md font-bold text-on-surface">{title}</p>
      {subtitle && <p className="text-caption text-secondary mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  )
}

function AIInsight({ text, loading, onRegen, date }: { text: string; loading: boolean; onRegen: () => void; date: string }) {
  return (
    <div className="bg-gradient-to-br from-teal-50 to-green-50 border border-teal-100 rounded-xl p-4 text-body-md text-on-surface leading-relaxed">
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-teal-200/60 rounded w-full" />
          <div className="h-3 bg-teal-200/60 rounded w-5/6" />
          <div className="h-3 bg-teal-200/60 rounded w-4/6" />
        </div>
      ) : (
        <>
          <p className="mb-2">{text}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-teal-200/60">
            <span className="text-caption text-secondary">Généré le {date}</span>
            <button onClick={onRegen} className="flex items-center gap-1 text-caption text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[12px]">refresh</span>
              Regénérer
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function BarChart({ data, height = 200 }: { data: any; height?: number }) {
  return (
    <div style={{ height }}>
      <Bar data={data} options={{ ...CHART_OPTS_LINE, maintainAspectRatio: false }} />
    </div>
  )
}

function LineChart({ data, height = 200 }: { data: any; height?: number }) {
  return (
    <div style={{ height }}>
      <Line data={data} options={{ ...CHART_OPTS_LINE, maintainAspectRatio: false }} />
    </div>
  )
}

function DonutChart({ data, height = 180 }: { data: any; height?: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <Doughnut data={data} options={{
        cutout: '65%', maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10 } } },
      }} />
    </div>
  )
}

function BarList({ items }: { items: Array<{ label: string; value: number; max?: number }> }) {
  const maxVal = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-caption text-on-surface-variant w-12 text-right flex-shrink-0">{item.label}</span>
          <div className="flex-1 bg-surface-container rounded-full h-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((item.value / (item.max ?? maxVal)) * 100)}%` }} />
          </div>
          <span className="text-caption font-semibold text-on-surface w-6 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// Fake AI insight per tab
function buildInsight(type: string, data: any, year: number): string {
  if (!data) return 'Données insuffisantes pour générer une analyse.'
  if (type === 'effectifs') {
    const t = data.total ?? 0
    const d = data.departed ?? 0
    const r = data.rotationRate ?? 0
    const s = data.avgSeniority ?? 0
    const sal = data.avgSalary ?? 0
    if (t === 0) return `Insufficient data to generate an analysis for this period.`
    return `Les données pour l'année ${year} montrent que l'entreprise compte actuellement ${t} employé${t > 1 ? 's' : ''} actif${t > 1 ? 's' : ''}, avec ${data.hiresCount ?? 0} nouvelle${(data.hiresCount ?? 0) > 1 ? 's' : ''} embauche${(data.hiresCount ?? 0) > 1 ? 's' : ''} et ${d} sortie${d > 1 ? 's' : ''} enregistrée${d > 1 ? 's' : ''}, résultant en un taux de rotation du personnel de ${r}%. La moyenne d'ancienneté est de ${s} ans${sal > 0 ? `. Le salaire mensuel moyen est de ${sal.toLocaleString('fr-FR')} FCFA` : ', aucune donnée salariale n\'est disponible pour une analyse de la rémunération'}.`
  }
  if (type === 'paie') {
    const g = data.totalGross ?? 0
    const n = data.totalNet ?? 0
    const c = data.paidCycles ?? 0
    if (g === 0) return `Insufficient data to generate an analysis for this period.`
    return `En ${year}, la masse salariale brute totale est de ${g.toLocaleString('fr-FR')} FCFA pour ${c} cycle${c > 1 ? 's' : ''} de paie traité${c > 1 ? 's' : ''}. La masse nette représente ${g > 0 ? Math.round((n / g) * 100) : 0}% du brut. Le coût employeur estimé atteint ${data.totalEmployerCost?.toLocaleString('fr-FR') ?? 0} FCFA en incluant les charges patronales.`
  }
  if (type === 'conges') {
    const ar = data.approvalRate ?? 0
    const p = data.pendingCount ?? 0
    const ab = data.absenceRate ?? 0
    if (ar === 0 && p === 0) return `Insufficient data to generate an analysis for this period.`
    return `Le taux d'approbation des congés est de ${ar}% pour l'année ${year}. ${p} demande${p > 1 ? 's' : ''} reste${p > 1 ? 'nt' : ''} en attente d'approbation. Le taux d'absentéisme est de ${ab}% des jours ouvrés. En moyenne, ${data.avgPerEmp ?? 0} jours de congé par salarié ont été posés.`
  }
  return 'Données insuffisantes.'
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('effectifs')
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState('')
  const loadedRef = useRef<string>('')

  const todayFr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  const load = (tab = activeTab, y = year) => {
    const key = `${tab}-${y}`
    if (loadedRef.current === key && data) return
    setLoading(true)
    setData(null)
    setAiText('')
    axios.get(`/api/reports?type=${tab}&year=${y}`).then(r => {
      setData(r.data)
      loadedRef.current = key
      setAiText(buildInsight(tab, r.data, y))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadedRef.current = ''; load() }, [activeTab, year])

  const regenAI = () => {
    setAiLoading(true)
    setTimeout(() => { setAiText(buildInsight(activeTab, data, year)); setAiLoading(false) }, 800)
  }

  function exportBilanSocial() {
    if (!data) return
    const lines: string[] = [`BILAN SOCIAL ${year}`, '']
    if (activeTab === 'effectifs') {
      lines.push(`Effectif total: ${data.total}`, `Taux de rotation: ${data.rotationRate}%`, `Ancienneté moyenne: ${data.avgSeniority} ans`, `Salaire mensuel moyen: ${data.avgSalary?.toLocaleString('fr-FR')} FCFA`)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bilan_social_${year}.txt`; a.click()
  }

  const years = [2024, 2025, 2026, 2027]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Rapports</h1>
          <p className="text-body-md text-on-surface-variant">Bilan social — effectifs, paie et congés</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportBilanSocial} className="btn-secondary">
            <span className="material-symbols-outlined text-[13px]">download</span>
            Télécharger le bilan social
          </button>
          <button className="btn-secondary">
            <span className="material-symbols-outlined text-[13px]">folder</span>
            Téléchargements
          </button>
          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="appearance-none pl-3 pr-7 py-1.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-on-surface-variant pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-container-low rounded-xl p-1 flex gap-1">
        {[
          { id: 'effectifs', label: 'Effectifs' },
          { id: 'paie', label: 'Paie' },
          { id: 'conges', label: 'Congés & Présence' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-body-md font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-surface text-on-surface shadow-level-1'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-surface-variant rounded-xl animate-pulse" />)}</div>
          <div className="h-40 bg-surface-variant rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 gap-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-64 bg-surface-variant rounded-xl animate-pulse" />)}</div>
        </div>
      ) : data && (
        <>
          {/* ── EFFECTIFS ─────────────────────────────────────────────────── */}
          {activeTab === 'effectifs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <KpiCard label="Effectif total" value={data.total} sub={`${data.hiresCount} embauches · ${data.departed} départs`} />
                <KpiCard label="Taux de rotation" value={`${data.rotationRate}%`} sub="Départs / effectif moyen" />
                <KpiCard label="Ancienneté moyenne" value={`${data.avgSeniority} ans`} sub="Salariés actifs" />
                <KpiCard label="Salaire mensuel moyen" value={data.avgSalary > 0 ? data.avgSalary.toLocaleString('fr-FR') : 0} sub="FCFA" />
              </div>

              <AIInsight text={aiText} loading={aiLoading} onRegen={regenAI} date={todayFr} />

              <div className="grid grid-cols-2 gap-4">
                <SectionCard title="Mouvements d'effectif" subtitle={`Embauches vs départs par mois — ${year}`}>
                  <BarChart
                    data={{
                      labels: MONTHS,
                      datasets: [
                        { label: 'Embauches', data: data.monthlyHires, backgroundColor: '#1B5E20' },
                        { label: 'Départs', data: data.monthlyDepartures, backgroundColor: '#E53935' },
                      ],
                    }}
                  />
                  <div className="flex items-center gap-4 mt-3 text-caption text-on-surface-variant">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1B5E20] inline-block" /> Embauches</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E53935] inline-block" /> Départs</span>
                  </div>
                  {/* AI sub-note */}
                  <div className="mt-3 bg-gradient-to-r from-yellow-50 to-white border border-yellow-200 rounded-lg p-3 text-caption text-on-surface-variant italic">
                    {data.total > 0
                      ? `L'entreprise a recruté ${data.hiresCount} nouvel${data.hiresCount > 1 ? 's' : ''} employé${data.hiresCount > 1 ? 's' : ''} sans aucune sortie, ce qui suggère une stabilité dans la rétention.`
                      : 'Aucune donnée de mouvement disponible pour cette période.'
                    }
                  </div>
                </SectionCard>

                <SectionCard title="Pyramide des âges" subtitle="Salariés actifs">
                  <BarList items={Object.entries(data.agePyramid).map(([label, value]) => ({ label, value: value as number }))} />
                  <div className="mt-3 bg-gradient-to-r from-teal-50 to-white border border-teal-200 rounded-lg p-3 text-caption text-on-surface-variant italic">
                    {Object.values(data.agePyramid as Record<string,number>).every(v => v === 0)
                      ? 'Données démographiques non disponibles pour ce groupe.'
                      : `Répartition des ${data.total} salarié${data.total > 1 ? 's' : ''} actif${data.total > 1 ? 's' : ''} par tranche d'âge.`
                    }
                  </div>
                </SectionCard>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <SectionCard title="Types de contrat" subtitle="Contrats actifs">
                  {Object.keys(data.contractTypeMap ?? {}).length === 0 ? (
                    <p className="text-body-md text-on-surface-variant text-center py-6">Aucune donnée</p>
                  ) : (
                    <DonutChart data={{
                      labels: Object.keys(data.contractTypeMap),
                      datasets: [{ data: Object.values(data.contractTypeMap), backgroundColor: COLORS, borderWidth: 0 }],
                    }} />
                  )}
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-caption text-on-surface-variant italic">
                    {Object.keys(data.contractTypeMap ?? {}).length === 0
                      ? "Aucune donnée n'est disponible concernant le mix de contrats, ce qui empêche l'analyse de la diversité des types de contrats."
                      : `${Object.keys(data.contractTypeMap).length} type${Object.keys(data.contractTypeMap).length > 1 ? 's' : ''} de contrat actif${Object.keys(data.contractTypeMap).length > 1 ? 's' : ''}.`
                    }
                  </div>
                </SectionCard>

                <SectionCard title="Catégories de travailleurs" subtitle="Salariés actifs">
                  {Object.keys(data.catMap ?? {}).length === 0 ? (
                    <p className="text-body-md text-on-surface-variant text-center py-6">Aucune donnée</p>
                  ) : (
                    <DonutChart data={{
                      labels: Object.keys(data.catMap),
                      datasets: [{ data: Object.values(data.catMap), backgroundColor: COLORS, borderWidth: 0 }],
                    }} />
                  )}
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-caption text-on-surface-variant italic">
                    {Object.keys(data.catMap ?? {}).length === 0
                      ? "Aucune catégorie de travailleur disponible."
                      : (() => {
                          const entries = Object.entries(data.catMap as Record<string,number>)
                          const top = entries.sort(([,a],[,b]) => b-a)[0]
                          return top ? `La seule catégorie de travailleurs recensée est celle des employés ${top[0].toLowerCase()}s, avec un effectif de ${top[1]}.` : ''
                        })()
                    }
                  </div>
                </SectionCard>

                <SectionCard title="Salaire moyen par type de contrat" subtitle="FCFA">
                  {Object.keys(data.avgSalaryByType ?? {}).length === 0 ? (
                    <p className="text-body-md text-on-surface-variant text-center py-6">Aucune donnée</p>
                  ) : (
                    <div className="space-y-3 mt-1">
                      {Object.entries(data.avgSalaryByType as Record<string,number>).map(([type, avg]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-body-md text-on-surface-variant">{type}</span>
                          <span className="text-body-md font-semibold text-on-surface">{avg.toLocaleString('fr-FR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          )}

          {/* ── PAIE ──────────────────────────────────────────────────────── */}
          {activeTab === 'paie' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-outline-variant p-4">
                <div className="grid grid-cols-6 gap-0 divide-x divide-outline-variant">
                  {[
                    { label: 'Masse salariale brute', value: (data.totalGross ?? 0).toLocaleString('fr-FR'), sub: 'FCFA' },
                    { label: 'Masse salariale nette', value: (data.totalNet ?? 0).toLocaleString('fr-FR'), sub: 'FCFA' },
                    { label: 'Coût employeur', value: (data.totalEmployerCost ?? 0).toLocaleString('fr-FR'), sub: 'FCFA' },
                    { label: 'Impôt sur le revenu', value: (data.totalTax ?? 0).toLocaleString('fr-FR'), sub: 'FCFA' },
                    { label: 'Sécurité sociale', value: (data.totalCnss ?? 0).toLocaleString('fr-FR'), sub: 'FCFA' },
                    { label: 'Paies traitées', value: data.paidCycles ?? 0, sub: String(year) },
                  ].map(kpi => (
                    <div key={kpi.label} className="px-4 first:pl-0 last:pr-0">
                      <p className="text-caption text-on-surface-variant">{kpi.label}</p>
                      <p className="text-display-lg font-bold text-on-surface mt-1">{kpi.value}</p>
                      <p className="text-caption text-secondary">{kpi.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SectionCard title="Évolution des coûts de paie" subtitle={`Brut · net · coût employeur mensuel — ${year}`}>
                  <LineChart
                    data={{
                      labels: MONTHS,
                      datasets: [
                        { label: 'Brut', data: data.monthlyGross, borderColor: '#1B5E20', backgroundColor: '#1B5E2020', fill: false, tension: 0.3, pointRadius: 3 },
                        { label: 'Net', data: data.monthlyNet, borderColor: '#1565C0', backgroundColor: '#1565C020', fill: false, tension: 0.3, pointRadius: 3 },
                        { label: 'Coût employeur', data: data.monthlyEmployerCost, borderColor: '#7B1FA2', backgroundColor: '#7B1FA220', fill: false, tension: 0.3, pointRadius: 3 },
                      ],
                    }}
                    height={220}
                  />
                  <div className="flex items-center gap-4 mt-2 text-caption text-on-surface-variant">
                    {[['#1B5E20','Brut'],['#1565C0','Net'],['#7B1FA2','Coût employeur']].map(([c,l]) => (
                      <span key={l} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />{l}</span>
                    ))}
                  </div>
                </SectionCard>

                <AIInsight text={aiText} loading={aiLoading} onRegen={regenAI} date={todayFr} />
              </div>

              <SectionCard title="Évolution heures sup. & primes" subtitle={`Heures sup. & primes mensuelles — ${year}`}>
                <LineChart
                  data={{
                    labels: MONTHS,
                    datasets: [
                      { label: 'Heures sup.', data: data.monthlyOvertime, borderColor: '#E65100', fill: false, tension: 0.3, pointRadius: 3 },
                      { label: 'Primes', data: data.monthlyBonus, borderColor: '#7B1FA2', fill: false, tension: 0.3, pointRadius: 3 },
                    ],
                  }}
                  height={180}
                />
                <div className="flex items-center gap-4 mt-2 text-caption text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E65100] inline-block" /> Heures sup.</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#7B1FA2] inline-block" /> Primes</span>
                </div>
              </SectionCard>

              <div className="grid grid-cols-2 gap-4">
                <SectionCard title="Paie par département" subtitle="Dernière paie traitée">
                  {Object.keys(data.deptPayMap ?? {}).length === 0 ? (
                    <p className="text-body-md text-on-surface-variant">Aucune donnée de paie pour le moment</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(data.deptPayMap as Record<string,number>).sort(([,a],[,b]) => b-a).map(([dept, val]) => (
                        <div key={dept} className="flex items-center justify-between text-body-md">
                          <span className="text-on-surface-variant">{dept}</span>
                          <span className="font-semibold">{val.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Paie par agence" subtitle="Dernière paie traitée">
                  {Object.keys(data.agencyPayMap ?? {}).length === 0 ? (
                    <p className="text-body-md text-on-surface-variant">Aucune donnée de paie pour le moment</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(data.agencyPayMap as Record<string,number>).sort(([,a],[,b]) => b-a).map(([loc, val]) => (
                        <div key={loc} className="flex items-center justify-between text-body-md">
                          <span className="text-on-surface-variant">{loc}</span>
                          <span className="font-semibold">{val.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SectionCard title="Coût total heures sup." subtitle="">
                  <p className="text-display-lg font-bold text-on-surface">{(data.totalOvertimeCost ?? 0).toLocaleString('fr-FR')}</p>
                  <p className="text-caption text-secondary">FCFA</p>
                </SectionCard>
                <SectionCard title="Coût total primes" subtitle="">
                  <p className="text-display-lg font-bold text-on-surface">{(data.totalBonusCost ?? 0).toLocaleString('fr-FR')}</p>
                  <p className="text-caption text-secondary">FCFA</p>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ── CONGÉS & PRÉSENCE ─────────────────────────────────────────── */}
          {activeTab === 'conges' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <KpiCard label="Taux d'approbation des congés" value={`${data.approvalRate ?? 0}%`} sub="Des demandes traitées" icon="calendar_today" />
                <KpiCard label="Taux de refus des congés" value={`${data.refusalRate ?? 0}%`} sub="Des demandes traitées" icon="calendar_today" />
                <KpiCard label="Demandes en attente" value={data.pendingCount ?? 0} sub="En attente d'approbation" icon="info" />
                <KpiCard label="Taux d'absentéisme" value={`${data.absenceRate ?? 0}%`} sub="Jours maladie / jours ouvrés" />
              </div>

              <AIInsight text={aiText} loading={aiLoading} onRegen={regenAI} date={todayFr} />

              <SectionCard title="Congés pris" subtitle={`Jours de congé approuvés par mois — ${year}`}>
                <BarChart
                  data={{
                    labels: MONTHS,
                    datasets: [{
                      label: 'Jours',
                      data: data.monthlyLeaves,
                      backgroundColor: '#1565C0',
                      borderRadius: 4,
                    }],
                  }}
                  height={180}
                />
              </SectionCard>

              <div className="grid grid-cols-2 gap-4">
                <SectionCard title="Congés par type" subtitle="Jours approuvés uniquement">
                  {Object.keys(data.leaveTypeMap ?? {}).length === 0 ? (
                    <p className="text-body-md text-on-surface-variant py-4">Aucun congé enregistré</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(data.leaveTypeMap as Record<string,number>).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-body-md">
                          <span className="text-on-surface-variant">{type}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <div className="space-y-4">
                  <SectionCard title="Maladie vs autres congés" subtitle="Congés maladie">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-body-md">
                        <span className="text-primary">Congés maladie</span>
                        <span className="font-semibold">{data.sickDays ?? 0} jours</span>
                      </div>
                      <div className="flex items-center justify-between text-body-md">
                        <span className="text-on-surface-variant">Autres congés</span>
                        <span className="font-semibold">{data.otherDays ?? 0} jours</span>
                      </div>
                      <div className="border-t border-outline-variant pt-2 space-y-1">
                        <div className="flex items-center justify-between text-caption text-secondary">
                          <span>Total jours pris</span><span>{data.totalDays ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-caption text-secondary">
                          <span>Moy. par salarié</span><span><strong>{data.avgPerEmp ?? 0} jours</strong></span>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Heures sup. (Feuilles de temps)" subtitle="Feuilles de temps soumises">
                    <div className="space-y-2">
                      {[
                        ['schedule', 'Total heures supplémentaires', `${data.totalOvertime ?? 0}h`, 'text-primary'],
                        ['schedule', 'Moy. par salarié', `${data.avgOvertimePerEmp ?? 0}h`, 'text-primary'],
                        ['calendar_today', "Taux d'approbation feuilles de temps", '0%', 'text-on-surface'],
                      ].map(([icon, label, value, color]) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[13px] text-on-surface-variant">{icon}</span>
                          <span className="text-body-md text-on-surface-variant flex-1">{label}</span>
                          <span className={`text-body-md font-semibold ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              </div>

              <SectionCard title="Évolution des heures supplémentaires" subtitle={`Heures sup. mensuelles — ${year}`}>
                <LineChart
                  data={{
                    labels: MONTHS,
                    datasets: [{
                      label: 'Heures sup.',
                      data: data.monthlyOvertime,
                      borderColor: '#E65100',
                      backgroundColor: '#E6510020',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 3,
                    }],
                  }}
                  height={180}
                />
              </SectionCard>
            </div>
          )}
        </>
      )}
    </div>
  )
}
