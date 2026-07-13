'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Line, Doughnut } from 'react-chartjs-2'
import '@/lib/chartSetup'
import axios from 'axios'

interface DashboardData {
  kpi: {
    totalEmployees: number
    activeEmployees: number
    departedEmployees: number
    newHiresThisMonth: number
    presentToday: number
    absentToday: number
    absenteeismRate: number
  }
  byDepartment: { department: string; _count: { id: number } }[]
  trialEmployees: { employee: { firstName: string; lastName: string }; trialEndDate: string }[]
  expiringContracts: { employee: { firstName: string; lastName: string }; endDate: string }[]
  birthdaysThisMonth: { firstName: string; lastName: string; birthDate: string }[]
  recentHires: { firstName: string; lastName: string; position: string; hireDate: string; department: string }[]
  seniorityBuckets: Record<string, number>
  ageBuckets: Record<string, number>
  leavesInProgress: number
  leavesPending: number
  leavesApproved: number
  trainingsThisYear: number
  trainingsUpcoming: number
  upcomingMedical: { employee: { firstName: string; lastName: string }; nextVisit: string }[]
  recentActivity: { type: string; message: string; date: string }[]
  headcountEvolution: number[]
  genderDistribution: { sex: string; _count: { id: number } }[]
  todoItems: { type: string; label: string; detail: string; severity: string; href: string }[]
}

interface KpiCardProps {
  label: string
  value: number
  icon: string
  colorClass?: string
  bgClass?: string
}

function KpiCard({ label, value, icon, colorClass = 'text-on-surface-variant', bgClass = '' }: KpiCardProps) {
  return (
    <div className={`bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant ${bgClass}`}>
      <div className="flex justify-between items-start">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        <span className={`material-symbols-outlined text-[15px] ${colorClass}`}>{icon}</span>
      </div>
      <div className={`text-display-lg mt-0.5 ${colorClass}`}>{value}</div>
    </div>
  )
}

export default function DashboardClient() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/dashboard')
      .then(r => setData(r.data))
      .catch(e => {
        const msg = e.response?.data?.error || e.message
        setError(msg)
        console.error('[dashboard]', msg)
      })
  }, [])

  if (error) return (
    <div className="p-4 bg-error-container text-on-error-container rounded-xl text-body-md">
      <strong>Erreur dashboard :</strong> {error}
    </div>
  )
  if (!data) return <div className="p-4 text-secondary text-body-md">Chargement...</div>

  const {
    kpi,
    byDepartment,
    trialEmployees,
    birthdaysThisMonth,
    recentHires,
    expiringContracts,
    seniorityBuckets,
    ageBuckets,
    leavesInProgress,
    leavesPending,
    leavesApproved,
    trainingsThisYear,
    trainingsUpcoming,
    upcomingMedical,
    recentActivity,
    headcountEvolution,
    genderDistribution,
    todoItems,
  } = data

  const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const now = new Date()
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return MONTHS_FR[d.getMonth()]
  })

  const lineChartData = {
    labels: last6Months,
    datasets: [{
      label: 'Effectif',
      data: headcountEvolution,
      borderColor: '#1A56DB',
      backgroundColor: 'rgba(26,86,219,0.08)',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
    }],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: false, grid: { color: '#E2E1ED' }, ticks: { font: { size: 9 } } },
      x: { grid: { display: false }, ticks: { font: { size: 9 } } },
    },
  }

  const deptTotal = byDepartment.reduce((sum, d) => sum + d._count.id, 0)
  const deptDonutData = {
    labels: byDepartment.map(d => d.department),
    datasets: [{
      data: byDepartment.map(d => d._count.id),
      backgroundColor: ['#1A56DB', '#0D9488', '#F59E0B', '#BA1A1A', '#4C616C', '#7C3AED'],
      borderColor: '#FFFFFF',
      borderWidth: 2,
    }],
  }

  const totalGender = genderDistribution.reduce((sum, g) => sum + g._count.id, 0)
  const womenCount = genderDistribution.find(g => g.sex === 'F')?._count.id || 0
  const menCount = genderDistribution.find(g => g.sex === 'M')?._count.id || 0
  const womenPercent = totalGender ? Math.round((womenCount / totalGender) * 100) : 0
  const menPercent = totalGender ? Math.round((menCount / totalGender) * 100) : 0

  const genderDonutData = {
    labels: ['Femmes', 'Hommes'],
    datasets: [{
      data: [womenCount, menCount],
      backgroundColor: ['#EC4899', '#1A56DB'],
      borderColor: '#FFFFFF',
      borderWidth: 2,
    }],
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: { legend: { display: false } },
  }

  const totalAlerts = trialEmployees.length + expiringContracts.length

  return (
    <div className="space-y-3">
      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard label="Effectif total" value={kpi.totalEmployees} icon="groups" colorClass="text-primary" bgClass="bg-primary-container/20" />
        <KpiCard label="Actifs" value={kpi.activeEmployees} icon="how_to_reg" colorClass="text-tertiary" />
        <KpiCard label="Absents" value={kpi.absentToday} icon="event_busy" colorClass="text-error" />
        <KpiCard label="Nouv. recrut." value={kpi.newHiresThisMonth} icon="person_add" colorClass="text-primary" />
        <KpiCard label="Départs" value={kpi.departedEmployees} icon="person_remove" colorClass="text-error" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-7 bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
          <h3 className="text-title-sm text-on-background mb-2">Évolution des effectifs</h3>
          <div className="h-40">
            <Line data={lineChartData} options={lineOptions} />
          </div>
        </div>
        <div className="col-span-5 bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
          <h3 className="text-title-sm text-on-background mb-2">Répartition H/F</h3>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1.5 text-body-md text-on-surface">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EC4899] shrink-0" />
                <span>Femmes : {womenCount} ({womenPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                <span>Hommes : {menCount} ({menPercent}%)</span>
              </div>
            </div>
            <div className="relative w-24 h-24 ml-auto shrink-0">
              <Doughnut data={genderDonutData} options={donutOptions} />
              <div className="absolute inset-0 flex items-center justify-center text-display-lg font-bold text-on-background">
                {totalGender}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dept + Seniority + Age */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
          <h3 className="text-title-sm text-on-background mb-2">Répartition par département</h3>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1.5 text-body-md text-on-surface">
              {byDepartment.map(d => (
                <div key={d.department} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary shrink-0" />
                  <span>{d.department}: {d._count.id}</span>
                </div>
              ))}
            </div>
            <div className="relative w-24 h-24 ml-auto shrink-0">
              <Doughnut data={deptDonutData} options={donutOptions} />
              <div className="absolute inset-0 flex items-center justify-center text-display-lg font-bold text-on-background">
                {deptTotal}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
            <h3 className="text-title-sm mb-2">Ancienneté</h3>
            {Object.entries(seniorityBuckets).map(([key, val]) => (
              <div key={key} className="flex justify-between text-body-md">
                <span className="text-secondary">{key}</span>
                <span className="font-medium">{val}</span>
              </div>
            ))}
          </div>
          <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
            <h3 className="text-title-sm mb-2">Tranche d'âge</h3>
            {Object.entries(ageBuckets).map(([key, val]) => (
              <div key={key} className="flex justify-between text-body-md">
                <span className="text-secondary">{key} ans</span>
                <span className="font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts + Congés + Anniversaires */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl shadow-level-1 border border-outline-variant overflow-hidden">
          <div className="px-3 py-2 bg-surface-bright border-b border-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[15px] icon-filled">notification_important</span>
            <span className="text-title-sm text-on-background">Alertes</span>
            <span className="ml-auto px-1.5 py-0.5 bg-error-container text-on-error-container rounded-full text-caption">
              {totalAlerts}
            </span>
          </div>
          <div className="divide-y divide-surface-variant max-h-40 overflow-auto">
            {totalAlerts === 0 && (
              <div className="px-3 py-2 text-body-md text-secondary">Aucune alerte</div>
            )}
            {trialEmployees.map((t, i) => (
              <div key={`trial-${i}`} className="px-3 py-1.5 text-body-md flex justify-between">
                <span>{t.employee.firstName} {t.employee.lastName}</span>
                <span className="text-caption text-secondary">Essai fin {new Date(t.trialEndDate).toLocaleDateString()}</span>
              </div>
            ))}
            {expiringContracts.map((c, i) => (
              <div key={`exp-${i}`} className="px-3 py-1.5 text-body-md flex justify-between">
                <span>{c.employee.firstName} {c.employee.lastName}</span>
                <span className="text-caption text-secondary">Contrat fin {new Date(c.endDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant space-y-2">
          <h3 className="text-title-sm text-on-background">Congés</h3>
          <div className="flex justify-between text-body-md"><span>En cours</span><span className="font-medium">{leavesInProgress}</span></div>
          <div className="flex justify-between text-body-md"><span>En attente</span><span className="font-medium text-error">{leavesPending}</span></div>
          <div className="flex justify-between text-body-md"><span>Approuvés</span><span className="font-medium">{leavesApproved}</span></div>
          <div className="pt-2 border-t border-outline-variant">
            <div className="flex justify-between text-body-md"><span>Taux absentéisme</span><span className="font-medium">{kpi.absenteeismRate}%</span></div>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant space-y-1">
          <h3 className="text-title-sm text-on-background mb-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-primary">cake</span>
            Anniversaires du mois
          </h3>
          {birthdaysThisMonth.length === 0 ? (
            <p className="text-body-md text-secondary">Aucun ce mois</p>
          ) : (
            birthdaysThisMonth.map((b, i) => (
              <div key={i} className="text-body-md flex justify-between">
                <span>{b.firstName} {b.lastName}</span>
                <span className="text-caption text-secondary">
                  {new Date(b.birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activité + Nouveaux employés */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
          <h3 className="text-title-sm text-on-background mb-2">Activité récente</h3>
          {recentActivity.length === 0 ? (
            <p className="text-body-md text-secondary">Aucune activité récente</p>
          ) : (
            recentActivity.map((act, i) => (
              <div key={i} className="flex justify-between text-body-md py-0.5">
                <span>{act.type} : {act.message}</span>
                <span className="text-caption text-secondary">{new Date(act.date).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
          <h3 className="text-title-sm text-on-background mb-2">Nouveaux employés</h3>
          {recentHires.length === 0 ? (
            <p className="text-body-md text-secondary">Aucun ce mois</p>
          ) : (
            recentHires.map((h, i) => (
              <div key={i} className="flex justify-between text-body-md py-0.5">
                <span>{h.firstName} {h.lastName} - {h.position}</span>
                <span className="text-caption text-secondary">{new Date(h.hireDate).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Formations + Documents + À faire */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
          <h3 className="text-title-sm text-on-background mb-2">Formations</h3>
          <div className="flex justify-between text-body-md"><span>Formés cette année</span><span className="font-medium">{trainingsThisYear}</span></div>
          <div className="flex justify-between text-body-md"><span>À venir</span><span className="font-medium">{trainingsUpcoming}</span></div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-level-1 border border-outline-variant">
          <h3 className="text-title-sm text-on-background mb-2">Documents expirant bientôt</h3>
          <p className="text-body-md text-secondary">Fonctionnalité à venir</p>
        </div>

        {/* À faire */}
        {todoItems.length > 0 && (
          <div className="bg-surface rounded-xl shadow-level-1 border border-outline-variant overflow-hidden">
            <div className="px-3 py-2 border-b border-outline-variant flex items-center gap-2">
              <span className="text-title-sm text-on-background">À faire</span>
              <span className="ml-auto px-1.5 py-0.5 bg-error-container text-on-error-container rounded-full text-caption font-medium">
                {todoItems.length}
              </span>
            </div>
            <div className="divide-y divide-outline-variant">
              {todoItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => router.push(item.href)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-surface-container-low transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.severity === 'error' ? 'bg-error' : 'bg-warning'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-body-lg text-on-surface font-medium leading-tight truncate">{item.label}</div>
                    <div className="text-caption text-secondary truncate">{item.detail}</div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-[14px] flex-shrink-0">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
