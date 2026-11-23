import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LayoutPassager from '../../components/layout/LayoutPassager'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'

const FILTRES = ['Toutes', 'Terminées', 'Annulées']

const Historique = () => {
  const [filtreActif, setFiltreActif] = useState('Toutes')
  const [courseSelectionnee, setCourseSelectionnee] = useState(null)
  const [courses, setCourses] = useState([])
  const [chauffeurs, setChauffeurs] = useState({}) // { [chauffeurId]: profil public }
  const { modeNuit } = useTheme()
  const navigate = useNavigate()

  const bg = modeNuit ? '#0F172A' : '#F0F4F8'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  useEffect(() => {
    apiCall('/api/courses/historique').then(setCourses).catch(() => {})
  }, [])

  // Récupère le profil public de chaque chauffeur distinct rencontré
  useEffect(() => {
    const idsAmanquer = [...new Set(courses.map(c => c.chauffeurId).filter(Boolean))]
      .filter(id => !(id in chauffeurs))
    idsAmanquer.forEach(id => {
      apiCall(`/api/chauffeurs/${id}/public`)
        .then(profil => setChauffeurs(prev => ({ ...prev, [id]: profil })))
        .catch(() => setChauffeurs(prev => ({ ...prev, [id]: null })))
    })
  }, [courses])

  const nomChauffeur = (chauffeurId) => {
    const c = chauffeurs[chauffeurId]
    return c ? `${c.prenom} ${c.nom}` : (chauffeurId ? '...' : '—')
  }

  const formaterDateHeure = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const coursesFiltrees = courses.filter(c => {
    if (filtreActif === 'Terminées') return c.statut === 'TERMINEE'
    if (filtreActif === 'Annulées') return c.statut === 'ANNULEE'
    return true
  })

  const badgeStatut = (statut) => {
    if (statut === 'TERMINEE') return { label: 'Terminée', bg: '#DCFCE7', color: '#16A34A' }
    if (statut === 'ANNULEE') return { label: 'Annulée', bg: '#FEE2E2', color: '#DC2626' }
    return { label: statut, bg: '#F3F4F6', color: '#6B7280' }
  }

  const coursesTerminees = courses.filter(c => c.statut === 'TERMINEE')
  const prixDe = (c) => Number(c.prixFinal ?? c.prixEstime ?? 0)
  const totalDepense = coursesTerminees.reduce((acc, c) => acc + prixDe(c), 0)
  const prixMin = coursesTerminees.length ? Math.min(...coursesTerminees.map(prixDe)) : 0
  const prixMax = coursesTerminees.length ? Math.max(...coursesTerminees.map(prixDe)) : 0
  const prixMoyen = coursesTerminees.length ? Math.round(totalDepense / coursesTerminees.length) : 0

  // Chauffeurs fréquents : comptage par chauffeurId sur l'historique chargé
  const chauffeursFrequents = useMemo(() => {
    const compte = {}
    courses.forEach(c => {
      if (!c.chauffeurId) return
      compte[c.chauffeurId] = (compte[c.chauffeurId] || 0) + 1
    })
    return Object.entries(compte)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, nb]) => ({ chauffeurId: Number(id), nb }))
  }, [courses])

  return (
    <LayoutPassager>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>Historique</h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>{courses.length} courses au total</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Courses', valeur: courses.length, couleur: '#2563EB' },
                  { label: 'Terminées', valeur: coursesTerminees.length, couleur: '#16A34A' },
                  { label: 'Annulées', valeur: courses.filter(c => c.statut === 'ANNULEE').length, couleur: '#DC2626' },
                ].map(stat => (
                  <div key={stat.label} className="p-4 rounded-2xl text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
                    <div className="text-2xl font-black" style={{ color: stat.couleur }}>{stat.valeur}</div>
                    <div className="text-xs mt-1 font-semibold" style={{ color: textSecondary }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {FILTRES.map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltreActif(f)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: filtreActif === f ? '#0B1F4A' : cardBg,
                      color: filtreActif === f ? 'white' : textSecondary,
                      border: `1px solid ${filtreActif === f ? '#0B1F4A' : border}`
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {coursesFiltrees.length === 0 && (
                  <div className="text-center py-10 text-sm" style={{ color: textSecondary }}>Aucune course pour l'instant</div>
                )}
                {coursesFiltrees.map(course => {
                  const badge = badgeStatut(course.statut)
                  const { date, heure } = formaterDateHeure(course.createdAt)
                  return (
                    <button
                      key={course.id}
                      onClick={() => setCourseSelectionnee(course)}
                      className="w-full p-5 rounded-2xl text-left transition-all hover:opacity-90"
                      style={{ background: cardBg, border: `1px solid ${border}` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs font-semibold" style={{ color: textSecondary }}>{date} à {heure}</div>
                          <div className="font-black text-base mt-0.5" style={{ color: textPrimary }}>{course.arriveeAdresse}</div>
                          <div className="text-xs mt-0.5" style={{ color: textSecondary }}>Départ : {course.departAdresse}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                          <span className="text-base font-black" style={{ color: '#EA580C' }}>{prixDe(course).toLocaleString()} FCFA</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${border}` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: '#0B1F4A' }}>
                            {nomChauffeur(course.chauffeurId).split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: textSecondary }}>{nomChauffeur(course.chauffeurId)}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: modeNuit ? '#374151' : '#F3F4F6', color: textSecondary }}>{course.typeVehicule}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>Résumé financier</div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Total dépensé', valeur: `${totalDepense.toLocaleString()} FCFA`, couleur: '#EA580C' },
                    { label: 'Course la moins chère', valeur: `${prixMin.toLocaleString()} FCFA`, couleur: textPrimary },
                    { label: 'Course la plus chère', valeur: `${prixMax.toLocaleString()} FCFA`, couleur: textPrimary },
                    { label: 'Prix moyen', valeur: `${prixMoyen.toLocaleString()} FCFA`, couleur: textPrimary },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-sm" style={{ color: textSecondary }}>{item.label}</span>
                      <span className="text-sm font-black" style={{ color: item.couleur }}>{item.valeur}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>Chauffeurs fréquents</div>
                <div className="flex flex-col gap-3">
                  {chauffeursFrequents.length === 0 && (
                    <div className="text-xs" style={{ color: textSecondary }}>Aucun chauffeur pour l'instant</div>
                  )}
                  {chauffeursFrequents.map(cf => (
                    <div key={cf.chauffeurId} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: '#0B1F4A' }}>
                        {nomChauffeur(cf.chauffeurId).split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: textPrimary }}>{nomChauffeur(cf.chauffeurId)}</div>
                        <div className="text-xs" style={{ color: textSecondary }}>{cf.nb} course{cf.nb > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal détail course */}
      {courseSelectionnee && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setCourseSelectionnee(null)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: cardBg }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black" style={{ color: textPrimary }}>Détails de la course</h3>
              <button onClick={() => setCourseSelectionnee(null)} style={{ color: textSecondary }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Date', valeur: `${formaterDateHeure(courseSelectionnee.createdAt).date} à ${formaterDateHeure(courseSelectionnee.createdAt).heure}` },
                { label: 'Départ', valeur: courseSelectionnee.departAdresse },
                { label: 'Destination', valeur: courseSelectionnee.arriveeAdresse },
                { label: 'Véhicule', valeur: courseSelectionnee.typeVehicule },
                { label: 'Chauffeur', valeur: nomChauffeur(courseSelectionnee.chauffeurId) },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-sm" style={{ color: textSecondary }}>{item.label}</span>
                  <span className="text-sm font-semibold" style={{ color: textPrimary }}>{item.valeur}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3" style={{ borderTop: `1px solid ${border}` }}>
                <span className="text-sm font-bold" style={{ color: textPrimary }}>Total payé</span>
                <span className="text-xl font-black" style={{ color: '#EA580C' }}>{prixDe(courseSelectionnee).toLocaleString()} FCFA</span>
              </div>
            </div>
            {courseSelectionnee.statut === 'TERMINEE' && (
              <button
                onClick={() => { setCourseSelectionnee(null); navigate('/passager/notation', { state: { courseId: courseSelectionnee.id, destination: courseSelectionnee.arriveeAdresse, prix: prixDe(courseSelectionnee) } }) }}
                className="w-full mt-5 py-3 rounded-xl font-bold text-sm"
                style={{ background: '#EA580C', color: 'white' }}
              >
                Noter cette course
              </button>
            )}
            <button onClick={() => setCourseSelectionnee(null)} className="w-full mt-3 py-3 rounded-xl font-bold text-sm" style={{ border: `1px solid ${border}`, color: textSecondary }}>
              Fermer
            </button>
          </div>
        </div>
      )}

    </LayoutPassager>
  )
}

export default Historique