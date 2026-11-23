import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { useItineraireCourse } from '../../hooks/useItineraireCourse'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LayoutPassager from '../../components/layout/LayoutPassager'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'

// Icônes
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const iconePassager = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.5)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8], className: ''
})

const iconeDestination = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#EA580C;border:3px solid white;box-shadow:0 2px 8px rgba(234,88,12,0.5)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8], className: ''
})

const ikoneChauffeur = L.divIcon({
  html: `<div style="background:#0B1F4A;border-radius:8px;padding:4px 8px;color:white;font-size:10px;font-weight:700;border:2px solid #2563EB;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">Chauffeur</div>`,
  iconSize: [80, 28], iconAnchor: [40, 14], className: ''
})

// Statuts affichés dans la barre de progression. "EN_ATTENTE" (recherche
// d'un chauffeur) est géré séparément, avant que la course n'entre dans
// cette progression.
const STATUTS = [
  { id: 'ACCEPTEE', label: 'Acceptée' },
  { id: 'EN_ROUTE', label: 'En route' },
  { id: 'ARRIVEE', label: 'Arrivé' },
  { id: 'DEMARREE', label: 'En cours' },
  { id: 'TERMINEE', label: 'Terminée' },
]

// Temps restant avant l'annulation automatique d'une course sans chauffeur.
// Le serveur donne les secondes restantes (pas de souci de fuseau horaire),
// le décompte se fait ensuite localement, avec une resynchronisation chaque minute.
function CompteARebours({ courseId, couleur }) {
  const [fin, setFin] = useState(null)
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const synchroniser = () => apiCall(`/api/courses/${courseId}/recherche`)
      .then(r => setFin(Date.now() + r.secondesRestantes * 1000))
      .catch(() => {})
    synchroniser()
    const resync = setInterval(synchroniser, 60000)
    const tic = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => { clearInterval(resync); clearInterval(tic) }
  }, [courseId])

  if (fin == null) return <div className="text-xs" style={{ color: couleur }}>Ça peut prendre quelques instants</div>
  const restant = Math.max(0, Math.round((fin - maintenant) / 1000))
  const min = Math.floor(restant / 60)
  const sec = String(restant % 60).padStart(2, '0')
  return (
    <div className="text-xs" style={{ color: couleur }}>
      {restant > 0
        ? <>Annulation automatique dans <strong>{min} min {sec} s</strong> si aucun chauffeur n’accepte.<br />Vous pouvez annuler pour essayer un autre véhicule.</>
        : 'Aucun chauffeur trouvé : annulation en cours...'}
    </div>
  )
}

const SuiviCourse = () => {
  const { modeNuit } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // courseId vient de la réservation, ou est retrouvé après un rechargement de la page
  const [courseId, setCourseId] = useState(location.state?.courseId)
  const [partage, setPartage] = useState({ url: '', message: '' })
  const vehiculeInitial = location.state?.vehicule || 'voiture'

  const [course, setCourse] = useState(null)
  const itineraire = useItineraireCourse(courseId)
  const [chauffeur, setChauffeur] = useState(null)
  const [erreur, setErreur] = useState('')
  const [showAnnulation, setShowAnnulation] = useState(false)
  const [annulationEnCours, setAnnulationEnCours] = useState(false)

  const pollRef = useRef(null)
  const chauffeurChargePourId = useRef(null)

  // Pas de courseId → on cherche une course active, sinon retour au tableau de bord
  useEffect(() => {
    if (!courseId) {
      apiCall('/api/courses/active')
        .then(c => (c ? setCourseId(c.id) : navigate('/passager')))
        .catch(() => navigate('/passager'))
    }
  }, [courseId])

  // Polling du statut réel de la course toutes les 4s, tant qu'elle
  // n'est pas dans un état final (TERMINEE / ANNULEE)
  useEffect(() => {
    if (!courseId) return

    const recupererCourse = () => {
      apiCall(`/api/courses/${courseId}`)
        .then(setCourse)
        .catch(() => setErreur("Impossible de récupérer le statut de la course"))
    }

    recupererCourse()
    pollRef.current = setInterval(() => {
      setCourse(prev => {
        if (prev && ['TERMINEE', 'ANNULEE'].includes(prev.statut)) {
          clearInterval(pollRef.current)
          return prev
        }
        recupererCourse()
        return prev
      })
    }, 4000)

    return () => clearInterval(pollRef.current)
  }, [courseId])

  // Dès qu'un chauffeur est assigné (statut ACCEPTEE et au-delà), on va
  // chercher son profil public une seule fois (pas à chaque poll)
  useEffect(() => {
    if (!course?.chauffeurId) return
    if (chauffeurChargePourId.current === course.chauffeurId) return

    chauffeurChargePourId.current = course.chauffeurId
    apiCall(`/api/chauffeurs/${course.chauffeurId}/public`)
      .then(setChauffeur)
      .catch(() => setChauffeur(null))
  }, [course?.chauffeurId])

  // Course terminée → redirection vers le paiement avec le vrai prix final
  useEffect(() => {
    if (course?.statut === 'TERMINEE') {
      clearInterval(pollRef.current)
      const t = setTimeout(() => navigate('/passager/paiement', {
        state: {
          courseId: course.id,
          prix: course.prixFinal ?? course.prixEstime,
          destination: course.arriveeAdresse,
          vehicule: vehiculeInitial,
        }
      }), 1500)
      return () => clearTimeout(t)
    }
  }, [course?.statut])

  const annulerCourse = async () => {
    setAnnulationEnCours(true)
    try {
      await apiCall(`/api/courses/${courseId}/annuler`, { method: 'PUT' })
      navigate('/passager')
    } catch (e) {
      setErreur(e.message || "Impossible d'annuler la course")
      setAnnulationEnCours(false)
      setShowAnnulation(false)
    }
  }

  // Partage du trajet : lien public à envoyer à un proche (WhatsApp, SMS...)
  const partagerTrajet = async () => {
    try {
      const { token } = await apiCall(`/api/courses/${courseId}/partage`, { method: 'POST' })
      const url = `${window.location.origin}/suivi/${token}`
      const texte = 'Suis mon trajet School Driva en direct :'
      if (navigator.share) {
        await navigator.share({ title: 'Mon trajet School Driva', text: texte, url }).catch(() => {})
        setPartage({ url, message: '' })
      } else {
        await navigator.clipboard?.writeText(url).catch(() => {})
        setPartage({ url, message: 'Lien copié ! Collez-le dans WhatsApp ou par SMS.' })
      }
    } catch (e) {
      setPartage({ url: '', message: e.message })
    }
  }

  const statutActifIndex = course ? STATUTS.findIndex(s => s.id === course.statut) : -1

  const bg = modeNuit ? '#0F172A' : '#F0F4F8'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  // Coordonnées réelles de la course (fallback centre Yaoundé si absentes)
  const departPos = course?.departLat && course?.departLng
    ? [Number(course.departLat), Number(course.departLng)]
    : [3.848, 11.502]
  const arriveePos = course?.arriveeLat && course?.arriveeLng
    ? [Number(course.arriveeLat), Number(course.arriveeLng)]
    : null

  if (!courseId) return null
  const chauffeurPos = course?.chauffeurLat && course?.chauffeurLng
    ? [Number(course.chauffeurLat), Number(course.chauffeurLng)]
    : null

  if (!course && !erreur) {
    return (
      <LayoutPassager>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
          <p style={{ color: textSecondary }}>Chargement de la course...</p>
        </div>
      </LayoutPassager>
    )
  }

  if (erreur && !course) {
    return (
      <LayoutPassager>
        <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: bg }}>
          <p style={{ color: '#DC2626' }}>{erreur}</p>
          <button onClick={() => navigate('/passager')} className="px-4 py-2 rounded-xl font-bold text-sm"
                  style={{ background: '#EA580C', color: 'white' }}>
            Retour au tableau de bord
          </button>
        </div>
      </LayoutPassager>
    )
  }

  const enAttenteChauffeur = course.statut === 'EN_ATTENTE'
  const prixAffiche = course.prixFinal ?? course.prixEstime

  return (
    <LayoutPassager>
      <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: bg }}>

        {/* ── CARTE ── */}
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <MapContainer
            center={departPos}
            zoom={14}
            style={{ height: '100%', minHeight: '400px', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={departPos} icon={iconePassager}>
              <Popup>Votre position</Popup>
            </Marker>
            {arriveePos && (
              <Marker position={arriveePos} icon={iconeDestination}>
                <Popup>Destination</Popup>
              </Marker>
            )}
            {!enAttenteChauffeur && chauffeurPos && (
              <Marker position={chauffeurPos} icon={ikoneChauffeur}>
                <Popup>{chauffeur ? `${chauffeur.prenom} ${chauffeur.nom}` : 'Votre chauffeur'}</Popup>
              </Marker>
            )}
            {/* Approche du chauffeur : indicative, en pointillés */}
            {chauffeurPos && ['ACCEPTEE', 'EN_ROUTE'].includes(course.statut) && (
              <Polyline positions={[chauffeurPos, departPos]} color="#EA580C" weight={3} dashArray="6 8" />
            )}
            {/* Trajet de la course : vrai tracé routier (pointillés si simple estimation) */}
            {itineraire ? (
              <Polyline positions={itineraire.trace} color="#2563EB" weight={4}
                        dashArray={itineraire.source === 'ESTIMATION' ? '10 5' : undefined} />
            ) : arriveePos && (
              <Polyline positions={[departPos, arriveePos]} color="#2563EB" weight={4} dashArray="10 5" />
            )}
          </MapContainer>
        </div>

        {/* ── PANNEAU INFOS ── */}
        <div
          className="w-full lg:w-96 flex flex-col gap-4 p-5 overflow-y-auto"
          style={{ background: cardBg, borderLeft: `1px solid ${border}` }}
        >

          {erreur && (
            <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {erreur}
            </div>
          )}

          {enAttenteChauffeur ? (
            <div className="p-4 rounded-2xl text-center" style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', border: `1px solid ${border}` }}>
              <div className="text-sm font-bold mb-1" style={{ color: textPrimary }}>Recherche d'un chauffeur...</div>
              <CompteARebours courseId={courseId} couleur={textSecondary} />
            </div>
          ) : (
            <>
              {/* Barre de progression statut */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  {STATUTS.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-3 h-3 rounded-full transition-all duration-500"
                          style={{
                            background: i <= statutActifIndex ? '#2563EB' : border,
                            transform: i === statutActifIndex ? 'scale(1.4)' : 'scale(1)'
                          }}
                        />
                        <span className="text-xs mt-1 font-semibold" style={{
                          color: i === statutActifIndex ? '#2563EB' : textSecondary,
                          fontSize: '9px'
                        }}>
                          {s.label}
                        </span>
                      </div>
                      {i < STATUTS.length - 1 && (
                        <div
                          className="flex-1 h-0.5 mx-1 transition-all duration-500"
                          style={{ background: i < statutActifIndex ? '#2563EB' : border }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Infos chauffeur */}
              <div
                className="p-4 rounded-2xl"
                style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', border: `1px solid ${border}` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg"
                    style={{ background: '#0B1F4A' }}
                  >
                    {chauffeur ? `${(chauffeur.prenom || '?')[0]}${(chauffeur.nom || '?')[0]}` : '?'}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: textPrimary }}>
                      {chauffeur ? `${chauffeur.prenom} ${chauffeur.nom}` : 'Chauffeur assigné'}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#EAB308" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: '#EAB308' }}>
                        {chauffeur?.noteMoyenne != null ? Number(chauffeur.noteMoyenne).toFixed(1) : '—'}
                      </span>
                      <span className="text-xs" style={{ color: textSecondary }}>
                        · {chauffeur?.nbCourses ?? 0} courses
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs font-semibold" style={{ color: textSecondary }}>
                      {chauffeur?.vehiculeMarque ? `${chauffeur.vehiculeMarque} ${chauffeur.vehiculeModele || ''}`.trim() : '—'}
                    </div>
                    <div className="text-xs font-black mt-0.5" style={{ color: textPrimary }}>
                      {chauffeur?.immatriculation || '—'}
                    </div>
                  </div>
                </div>

                {/* Boutons contact */}
                <div className="flex gap-2">
                  <a
                    href={chauffeur?.telephone ? `tel:${chauffeur.telephone}` : undefined}
                    className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    style={{ background: '#EFF6FF', color: '#2563EB', opacity: chauffeur?.telephone ? 1 : 0.5, pointerEvents: chauffeur?.telephone ? 'auto' : 'none' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Appeler
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Prix */}
          <div
            className="p-4 rounded-2xl text-center"
            style={{ background: modeNuit ? '#0F172A' : '#FFF7ED', border: `1px solid ${modeNuit ? border : '#FED7AA'}` }}
          >
            <div className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>
              {course.statut === 'DEMARREE' ? 'Prix en cours' : 'Prix estimé'}
            </div>
            <div className="text-3xl font-black" style={{ color: '#EA580C' }}>
              {prixAffiche != null ? Number(prixAffiche).toLocaleString() : '—'} FCFA
            </div>
          </div>

          {/* Destination */}
          <div
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', border: `1px solid ${border}` }}
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/>
              </svg>
            </div>
            <div>
              <div className="text-xs" style={{ color: textSecondary }}>Destination</div>
              <div className="text-sm font-bold" style={{ color: textPrimary }}>{course.arriveeAdresse}</div>
            </div>
          </div>

          {/* Partage du trajet avec un proche */}
          {course.statut !== 'TERMINEE' && course.statut !== 'ANNULEE' && (
            <div className="flex flex-col gap-2">
              <button onClick={partagerTrajet} className="w-full py-3 rounded-xl font-bold text-sm"
                      style={{ background: '#0B1F4A', color: 'white' }}>
                Partager mon trajet
              </button>
              {partage.message && <p className="text-xs text-center" style={{ color: textSecondary }}>{partage.message}</p>}
              {partage.url && (
                <input readOnly value={partage.url} onFocus={e => e.target.select()}
                       className="w-full text-xs px-3 py-2 rounded-lg" style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', color: textSecondary, border: `1px solid ${border}` }} />
              )}
            </div>
          )}

          {course.statut === 'ANNULEE' && (
            <div className="p-4 rounded-2xl text-sm text-center" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {course.annuleePar === 'SYSTEME'
                ? 'Aucun chauffeur n’a pu accepter votre course. Réessayez dans quelques minutes.'
                : 'Cette course a été annulée.'}
              <button onClick={() => navigate('/passager/reservation')} className="block mx-auto mt-2 font-bold underline">Nouvelle réservation</button>
            </div>
          )}

          {/* Bouton annuler — visible seulement avant démarrage */}
          {['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVEE'].includes(course.statut) && (
            <button
              onClick={() => setShowAnnulation(true)}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
            >
              Annuler la course
            </button>
          )}

        </div>
      </div>

      {/* Modal annulation */}
      {showAnnulation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: cardBg }}>
            <h3 className="text-lg font-black mb-2" style={{ color: textPrimary }}>Annuler la course ?</h3>
            <p className="text-sm mb-6" style={{ color: textSecondary }}>
              Êtes-vous sûr de vouloir annuler cette course ? Le chauffeur sera notifié immédiatement.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAnnulation(false)}
                disabled={annulationEnCours}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ border: `1px solid ${border}`, color: textSecondary }}
              >
                Non, continuer
              </button>
              <button
                onClick={annulerCourse}
                disabled={annulationEnCours}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: '#DC2626', color: 'white', opacity: annulationEnCours ? 0.6 : 1 }}
              >
                {annulationEnCours ? 'Annulation...' : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

    </LayoutPassager>
  )
}

export default SuiviCourse