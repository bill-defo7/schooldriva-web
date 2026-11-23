import { useState, useEffect, useMemo } from 'react'
import LayoutChauffeur from '../../components/layout/LayoutChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const Revenus = () => {
  const { modeNuit } = useTheme()
  const [historique, setHistorique] = useState([])
  const [transactions, setTransactions] = useState([])

  const bg = modeNuit ? '#0F172A' : '#FFF7ED'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  useEffect(() => {
    apiCall('/api/courses/chauffeur/historique').then(setHistorique).catch(() => {})
    // Commissions réellement déduites (au taux en vigueur au moment de chaque course)
    apiCall('/api/paiements/transactions').then(setTransactions).catch(() => {})
  }, [])

  // Regroupe les 7 derniers jours (aujourd'hui inclus) à partir de
  // l'historique réel — seules les courses TERMINEE comptent comme gains
  const DONNEES_7J = useMemo(() => {
    const jours = []
    const aujourdHui = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(aujourdHui)
      d.setDate(d.getDate() - i)
      jours.push({ date: d, jour: JOURS[d.getDay()], courses: 0, gains: 0 })
    }

    historique.forEach(c => {
      if (c.statut !== 'TERMINEE' || !c.endedAt) return
      const dc = new Date(c.endedAt)
      const slot = jours.find(j => j.date.toDateString() === dc.toDateString())
      if (slot) {
        slot.courses += 1
        slot.gains += Number(c.prixFinal ?? c.prixEstime ?? 0)
      }
    })

    return jours
  }, [historique])

  const totalGainsBruts = DONNEES_7J.reduce((acc, d) => acc + d.gains, 0)
  const totalCourses = DONNEES_7J.reduce((acc, d) => acc + d.courses, 0)
  // Commissions des courses de la période, telles que déduites par le serveur
  const idsPeriode = new Set(historique.filter(c => c.statut === 'TERMINEE' && c.endedAt &&
    new Date(c.endedAt) >= new Date(DONNEES_7J[0].date.toDateString())).map(c => c.id))
  const totalCommissions = transactions
    .filter(t => t.type === 'COMMISSION' && idsPeriode.has(t.courseId))
    .reduce((acc, t) => acc + Number(t.montant), 0)
  const totalGainsNets = totalGainsBruts - totalCommissions
  const maxGains = Math.max(...DONNEES_7J.map(d => d.gains), 1)
  const meilleurJour = DONNEES_7J.reduce((max, d) => d.gains > max.gains ? d : max, DONNEES_7J[0])

  const STATS = [
    { label: 'Gains bruts', valeur: `${totalGainsBruts.toLocaleString()} FCFA`, couleur: '#16A34A' },
    { label: 'Commissions déduites', valeur: `-${totalCommissions.toLocaleString()} FCFA`, couleur: '#DC2626' },
    { label: 'Gains nets', valeur: `${totalGainsNets.toLocaleString()} FCFA`, couleur: '#EA580C' },
    { label: 'Courses effectuées', valeur: totalCourses, couleur: '#2563EB' },
    { label: 'Moyenne par course', valeur: totalCourses > 0 ? `${Math.round(totalGainsBruts / totalCourses).toLocaleString()} FCFA` : '—', couleur: textPrimary },
    { label: 'Meilleure journée', valeur: meilleurJour.gains > 0 ? meilleurJour.jour : '—', couleur: '#EAB308' },
  ]

  return (
    <LayoutChauffeur>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>Revenus</h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>Suivez vos gains et performances (7 derniers jours)</p>
              </div>

              {/* Graphique barres */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-6" style={{ color: textSecondary }}>
                  Gains des 7 derniers jours
                </div>
                <div className="flex items-end gap-3 h-40">
                  {DONNEES_7J.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs font-black" style={{ color: '#EA580C' }}>
                        {d.gains > 0 ? `${Math.round(d.gains / 1000)}k` : '0'}
                      </div>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${Math.max((d.gains / maxGains) * 100, 4)}px`,
                          background: d.gains === meilleurJour.gains && d.gains > 0 ? '#EA580C' : (modeNuit ? '#374151' : '#FED7AA'),
                        }}
                      />
                      <div className="text-xs font-semibold" style={{ color: textSecondary }}>{d.jour}</div>
                      <div className="text-xs" style={{ color: textSecondary }}>{d.courses}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs" style={{ color: textSecondary }}>Nombre de courses</span>
                  <span className="text-xs font-semibold" style={{ color: '#EA580C' }}>La barre orange = meilleure journée</span>
                </div>
              </div>

              {/* Stats grille */}
              <div className="grid grid-cols-2 gap-3">
                {STATS.map(stat => (
                  <div key={stat.label} className="p-4 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                    <div className="text-lg font-black mb-1" style={{ color: stat.couleur }}>{stat.valeur}</div>
                    <div className="text-xs font-semibold" style={{ color: textSecondary }}>{stat.label}</div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              <div className="p-5 rounded-2xl" style={{ background: modeNuit ? '#1E293B' : '#7C2D12' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Gains nets cette semaine
                </div>
                <div className="text-3xl font-black text-white mb-1">{totalGainsNets.toLocaleString()} FCFA</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Après déduction des commissions</div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Détail par jour
                </div>
                <div className="flex flex-col gap-3">
                  {DONNEES_7J.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: i < DONNEES_7J.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: textPrimary }}>{d.jour}</div>
                        <div className="text-xs" style={{ color: textSecondary }}>{d.courses} courses</div>
                      </div>
                      <div className="text-sm font-black" style={{ color: '#EA580C' }}>{d.gains.toLocaleString()} FCFA</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </LayoutChauffeur>
  )
}

export default Revenus