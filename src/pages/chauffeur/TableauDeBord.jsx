import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import LayoutChauffeur from '../../components/layout/LayoutChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { useChauffeur } from '../../context/ChauffeurContext'
import { apiCall } from '../../utils/api'

const TableauDeBordChauffeur = () => {
  const { enLigne, basculerEnLigne, erreur: erreurStatut, rafraichir } = useChauffeur()
  const [coursesAReprendre, setCoursesAReprendre] = useState({ course: null, courseAPayer: null })
  const [timerMax, setTimerMax] = useState(15)
  const [secondesRestantes, setSecondesRestantes] = useState(null)
  const [popupCourse, setPopupCourse] = useState(null) // la course (objet réel) en attente, ou null
  const [passagerPopup, setPassagerPopup] = useState(null)
  const [erreurAccept, setErreurAccept] = useState('')
  const [enAttente, setEnAttente] = useState(false)
  const { modeNuit } = useTheme()
  const navigate = useNavigate()

  const [moiProfil, setMoiProfil] = useState(null)
  const [villeId, setVilleId] = useState(null)
  const [stats, setStats] = useState(null)
  const [solde, setSolde] = useState(null)
  const [monVehicule, setMonVehicule] = useState(null)
  const [activite, setActivite] = useState([])

  const refusesRef = useRef(new Set())
  const pollRef = useRef(null)

  const bg = modeNuit ? '#0F172A' : '#FFF7ED'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  // Profil, véhicule, solde, stats, historique et course à reprendre
  useEffect(() => {
    rafraichir()
    apiCall('/api/chauffeurs/mon-profil').then(profil => {
      setMoiProfil(profil)
      setVilleId(profil.villeId)
      if (profil.id) apiCall(`/api/chauffeurs/${profil.id}/public`).then(setMonVehicule).catch(() => {})
    }).catch(() => {})
    apiCall('/api/paiements/portefeuille').then(p => setSolde(p.solde)).catch(() => {})
    apiCall('/api/courses/chauffeur/stats').then(setStats).catch(() => {})
    apiCall('/api/courses/chauffeur/historique').then(liste => setActivite(liste.slice(0, 4))).catch(() => {})
    apiCall('/api/courses/chauffeur/active').then(r => r && setCoursesAReprendre(r)).catch(() => {})
    apiCall('/api/courses/tarifs').then(t => setTimerMax(Number(t.timerCourse) || 15)).catch(() => {})
  }, [rafraichir])

  // Polling des courses en attente dans ma ville, tant que je suis en ligne
  useEffect(() => {
    if (!enLigne || !villeId) {
      clearInterval(pollRef.current)
      return
    }

    const verifier = () => {
      apiCall(`/api/courses/en-attente?villeId=${villeId}`)
        .then(liste => {
          const candidate = liste.find(c => !refusesRef.current.has(c.id))
          setPopupCourse(prev => {
            if (prev) return prev // popup déjà affiché, on ne le remplace pas
            return candidate || null
          })
        })
        .catch(() => {})
    }

    verifier()
    pollRef.current = setInterval(verifier, 5000)
    return () => clearInterval(pollRef.current)
  }, [enLigne, villeId])

  // Profil public du passager pour le popup
  useEffect(() => {
    if (!popupCourse) { setPassagerPopup(null); return }
    // Avant acceptation, le backend ne renvoie que le prénom du passager
    apiCall(`/api/courses/${popupCourse.id}/passager`)
      .then(setPassagerPopup)
      .catch(() => setPassagerPopup(null))
  }, [popupCourse])

  // Compte à rebours de la demande (paramètre admin TIMER_COURSE) : refus automatique à 0
  useEffect(() => {
    if (!popupCourse) { setSecondesRestantes(null); return }
    setSecondesRestantes(timerMax)
    const t = setInterval(() => {
      setSecondesRestantes(s => {
        if (s <= 1) {
          clearInterval(t)
          refusesRef.current.add(popupCourse.id)
          setPopupCourse(null)
          return null
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [popupCourse, timerMax])

  const accepterCourse = async () => {
    if (!popupCourse) return
    setEnAttente(true)
    setErreurAccept('')
    try {
      await apiCall(`/api/courses/${popupCourse.id}/accepter`, { method: 'PUT' })
      navigate('/chauffeur/course', { state: { courseId: popupCourse.id } })
    } catch (e) {
      setErreurAccept(e.message || "Impossible d'accepter cette course")
      refusesRef.current.add(popupCourse.id)
      setPopupCourse(null)
      setEnAttente(false)
    }
  }

  const refuserCourse = () => {
    if (popupCourse) refusesRef.current.add(popupCourse.id)
    setPopupCourse(null)
  }

  const STATS = stats ? [
    { label: 'Courses terminées', valeur: String(stats.nbCoursesTerminees), couleur: '#16A34A' },
    { label: 'Courses annulées', valeur: String(stats.nbCoursesAnnulees), couleur: '#DC2626' },
    { label: 'Note moyenne', valeur: stats.noteMoyenne != null ? stats.noteMoyenne.toFixed(1) : '—', couleur: '#EAB308' },
    { label: 'Total courses', valeur: String(stats.nbCoursesTotal), couleur: '#2563EB' },
  ] : []

  const formaterHeure = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const ACTIVITE = activite.map(c => ({
    destination: c.arriveeAdresse,
    prix: Number(c.prixFinal ?? c.prixEstime ?? 0),
    heure: formaterHeure(c.endedAt || c.createdAt),
    statut: c.statut === 'TERMINEE' ? 'terminee' : 'annulee',
  }))

  return (
    <LayoutChauffeur enLigne={enLigne} onToggle={basculerEnLigne}>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>
                  Bonjour{moiProfil ? `, ${moiProfil.prenom}` : ''}
                </h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>
                  {enLigne ? 'Vous êtes en ligne — en attente de courses' : 'Vous êtes hors ligne'}
                </p>
              </div>

              {/* Course en cours ou paiement à confirmer (reprise après rechargement) */}
              {coursesAReprendre.course && (
                <button onClick={() => navigate('/chauffeur/course', { state: { courseId: coursesAReprendre.course.id } })}
                        className="p-4 rounded-2xl text-left font-bold text-sm text-white" style={{ background: '#2563EB' }}>
                  Course #{coursesAReprendre.course.id} en cours → {coursesAReprendre.course.arriveeAdresse} · Reprendre
                </button>
              )}
              {!coursesAReprendre.course && coursesAReprendre.courseAPayer && (
                <button onClick={() => navigate('/chauffeur/confirmation', { state: { courseId: coursesAReprendre.courseAPayer.id } })}
                        className="p-4 rounded-2xl text-left font-bold text-sm" style={{ background: '#FEF9C3', color: '#A16207' }}>
                  Confirmez le paiement de la course #{coursesAReprendre.courseAPayer.id} pour recevoir de nouvelles demandes →
                </button>
              )}
              {(erreurStatut || erreurAccept) && (
                <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  {erreurStatut || erreurAccept}
                </div>
              )}

              {/* Toggle En ligne */}
              <div className="p-5 rounded-2xl flex items-center justify-between" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div>
                  <div className="font-black text-base" style={{ color: textPrimary }}>
                    {enLigne ? 'En ligne' : 'Hors ligne'}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: textSecondary }}>
                    {enLigne ? 'Vous recevez des demandes de course' : 'Activez pour recevoir des courses'}
                  </div>
                </div>
                <button
                  onClick={basculerEnLigne}
                  className="w-16 h-8 rounded-full transition-all duration-300 relative flex-shrink-0"
                  style={{ background: enLigne ? '#16A34A' : '#D1D5DB' }}
                >
                  <div
                    className="w-6 h-6 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-md"
                    style={{ left: enLigne ? '34px' : '4px' }}
                  />
                </button>
              </div>

              {/* Solde portefeuille */}
              <div className="p-5 rounded-2xl" style={{ background: modeNuit ? '#1E293B' : '#7C2D12' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Solde portefeuille
                </div>
                <div className="text-3xl font-black text-white mb-1">
                  {solde != null ? `${Number(solde).toLocaleString()} FCFA` : '—'}
                </div>
                <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Commission déduite automatiquement à chaque course
                </div>
                <button
                  onClick={() => navigate('/chauffeur/portefeuille')}
                  className="px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                >
                  Voir le portefeuille
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {STATS.map(stat => (
                  <div key={stat.label} className="p-4 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                    <div className="text-xl font-black mb-1" style={{ color: stat.couleur }}>{stat.valeur}</div>
                    <div className="text-xs font-semibold" style={{ color: textSecondary }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {enLigne && !villeId && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#FEF3C7', color: '#92400E' }}>
                  Ville introuvable sur votre profil — vous ne recevrez pas de demandes de course.
                </div>
              )}

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              {/* Véhicule */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Mon véhicule
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <svg width="48" height="32" viewBox="0 0 56 36" fill="none">
                    <rect x="4" y="12" width="48" height="16" rx="4" fill="#1A3A6B"/>
                    <rect x="10" y="6" width="36" height="11" rx="3" fill="#2563EB"/>
                    <rect x="13" y="8" width="10" height="7" rx="1" fill="#DBEAFE" opacity=".7"/>
                    <rect x="27" y="8" width="10" height="7" rx="1" fill="#DBEAFE" opacity=".7"/>
                    <circle cx="14" cy="28" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
                    <circle cx="42" cy="28" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
                  </svg>
                  <div>
                    <div className="font-black text-sm" style={{ color: textPrimary }}>
                      {monVehicule?.vehiculeMarque ? `${monVehicule.vehiculeMarque} ${monVehicule.vehiculeModele || ''}`.trim() : '—'}
                    </div>
                    <div className="font-black text-base mt-0.5" style={{ color: '#EA580C' }}>
                      {monVehicule?.immatriculation || '—'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: textSecondary }}>
                      {monVehicule?.vehiculeCouleur || '—'}
                    </div>
                  </div>
                </div>
                {[
                  { label: 'Type', valeur: 'Voiture' },
                  { label: 'Statut documents', valeur: moiProfil?.statut === 'ACTIF' ? 'Validés' : 'En attente' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: textSecondary }}>{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: item.valeur === 'Validés' ? '#16A34A' : textPrimary }}>{item.valeur}</span>
                  </div>
                ))}
              </div>

              {/* Activité récente */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Activité récente
                </div>
                <div className="flex flex-col gap-3">
                  {ACTIVITE.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: i < ACTIVITE.length - 1 ? `1px solid ${border}` : 'none' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: textPrimary }}>{a.destination}</div>
                        <div className="text-xs mt-0.5" style={{ color: textSecondary }}>{a.heure}</div>
                      </div>
                      <span className="text-xs font-black ml-2" style={{ color: a.statut === 'terminee' ? '#16A34A' : '#DC2626' }}>
                        {a.statut === 'terminee' ? `+${a.prix.toLocaleString()} FCFA` : 'Annulée'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/chauffeur/revenus')}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: modeNuit ? '#374151' : '#F3F4F6', color: textSecondary }}
                >
                  Voir tous les revenus
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Popup demande de course */}
      {popupCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: cardBg, animation: 'apparaitre 0.3s ease-out' }}
          >
            {/* Header */}
            <div className="px-6 py-5" style={{ background: '#7C2D12', animation: 'pulser 1s ease-in-out infinite' }}>
              <div className="text-base font-black text-white">Nouvelle course disponible</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Acceptez avant qu'un autre chauffeur ne le fasse</div>
                {secondesRestantes != null && (
                  <div className="text-lg font-black text-white tabular-nums" aria-label="Secondes restantes">{secondesRestantes}s</div>
                )}
              </div>
            </div>

            {/* Infos course */}
            <div className="p-6 flex flex-col gap-4">

              {erreurAccept && (
                <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  {erreurAccept}
                </div>
              )}

              {/* Trajet */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs" style={{ color: textSecondary }}>Départ</div>
                    <div className="text-sm font-bold" style={{ color: textPrimary }}>{popupCourse.departAdresse}</div>
                  </div>
                </div>
                <div className="ml-1.5 w-0.5 h-4" style={{ background: border }} />
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs" style={{ color: textSecondary }}>Destination</div>
                    <div className="text-sm font-bold" style={{ color: textPrimary }}>{popupCourse.arriveeAdresse}</div>
                  </div>
                </div>
              </div>

              {/* Stats course */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl" style={{ background: modeNuit ? '#0F172A' : '#F9FAFB' }}>
                <div className="text-center">
                  <div className="text-base font-black" style={{ color: '#EA580C' }}>{Number(popupCourse.prixEstime).toLocaleString()}</div>
                  <div className="text-xs" style={{ color: textSecondary }}>FCFA</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-black" style={{ color: '#2563EB' }}>{popupCourse.distanceKm != null ? `${Number(popupCourse.distanceKm).toFixed(1)} km` : '—'}</div>
                  <div className="text-xs" style={{ color: textSecondary }}>Distance</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-black" style={{ color: '#16A34A' }}>{Math.round(Number(popupCourse.prixEstime) * 0.85).toLocaleString()}</div>
                  <div className="text-xs" style={{ color: textSecondary }}>Gain net</div>
                </div>
              </div>

              {/* Passager */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: modeNuit ? '#0F172A' : '#F9FAFB' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ background: '#0B1F4A' }}>
                  {passagerPopup ? `${(passagerPopup.prenom || '?')[0]}${(passagerPopup.nom || '?')[0]}` : '?'}
                </div>
                <div className="text-sm font-bold" style={{ color: textPrimary }}>
                  {passagerPopup ? `${passagerPopup.prenom} ${passagerPopup.nom}` : 'Passager'}
                </div>
              </div>

              {/* Boutons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={refuserCourse}
                  disabled={enAttente}
                  className="py-3 rounded-xl font-bold text-sm"
                  style={{ border: `1px solid ${border}`, color: textSecondary }}
                >
                  Refuser
                </button>
                <button
                  onClick={accepterCourse}
                  disabled={enAttente}
                  className="py-3 rounded-xl font-bold text-sm"
                  style={{ background: '#16A34A', color: 'white', opacity: enAttente ? 0.6 : 1 }}
                >
                  {enAttente ? '...' : 'Accepter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulser {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes apparaitre {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes vibrer {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>

    </LayoutChauffeur>
  )
}

export default TableauDeBordChauffeur