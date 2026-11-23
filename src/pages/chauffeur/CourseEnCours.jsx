import { useState, useEffect, useRef } from 'react'
import { useItineraireCourse } from '../../hooks/useItineraireCourse'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LayoutChauffeur from '../../components/layout/LayoutChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'

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

const ikoneChauffeur = L.divIcon({
  html: `<div style="background:#7C2D12;border-radius:8px;padding:4px 8px;color:white;font-size:10px;font-weight:700;border:2px solid #EA580C;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">Moi</div>`,
  iconSize: [50, 28], iconAnchor: [25, 14], className: ''
})

const STATUTS = [
  { id: 'ACCEPTEE', label: 'Acceptée' },
  { id: 'EN_ROUTE', label: 'En route' },
  { id: 'ARRIVEE', label: 'Arrivé' },
  { id: 'DEMARREE', label: 'En cours' },
  { id: 'TERMINEE', label: 'Terminée' },
]

const PROCHAIN_STATUT = {
  ACCEPTEE: 'EN_ROUTE',
  EN_ROUTE: 'ARRIVEE',
  ARRIVEE: 'DEMARREE',
  DEMARREE: 'TERMINEE',
}

const LABEL_BOUTON = {
  ACCEPTEE: 'Je suis en route',
  EN_ROUTE: 'Je suis arrivé',
  ARRIVEE: 'Démarrer la course',
  DEMARREE: 'Terminer la course',
}

const COULEUR_BOUTON = {
  ACCEPTEE: '#2563EB',
  EN_ROUTE: '#EA580C',
  ARRIVEE: '#EA580C',
  DEMARREE: '#16A34A',
}

const CourseEnCours = () => {
  const { modeNuit } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // courseId vient du tableau de bord, ou est retrouvé après un rechargement de la page
  const [courseId, setCourseId] = useState(location.state?.courseId)
  const dernierEnvoiRef = useRef(0)

  const [course, setCourse] = useState(null)
  const itineraire = useItineraireCourse(courseId)
  const [passager, setPassager] = useState(null)
  const [tarifs, setTarifs] = useState(null)
  const [maPosition, setMaPosition] = useState(null)
  const [erreur, setErreur] = useState('')
  const [actionEnCours, setActionEnCours] = useState(false)
  const [showAnnulation, setShowAnnulation] = useState(false)

  const pollRef = useRef(null)
  const passagerChargePourId = useRef(null)

  useEffect(() => {
    if (courseId) return
    apiCall('/api/courses/chauffeur/active')
      .then(r => (r?.course ? setCourseId(r.course.id) : navigate('/chauffeur')))
      .catch(() => navigate('/chauffeur'))
  }, [courseId, navigate])

  // Suivi GPS continu : la position est envoyée au serveur toutes les ~10 s
  // (le passager et le lien de partage la voient sur leur carte)
  useEffect(() => {
    if (!navigator.geolocation || !courseId) return
    const id = navigator.geolocation.watchPosition(
      pos => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMaPosition(position)
        if (Date.now() - dernierEnvoiRef.current > 10000) {
          dernierEnvoiRef.current = Date.now()
          apiCall(`/api/courses/${courseId}/position`, { method: 'PUT', body: JSON.stringify(position) })
            .catch(() => { /* course terminée ou réseau coupé : on réessaiera */ })
        }
      },
      () => setErreur('Activez la localisation pour que le passager puisse vous suivre'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [courseId])

  useEffect(() => {
    apiCall('/api/courses/tarifs').then(setTarifs).catch(() => {})
  }, [])

  useEffect(() => {
    if (!courseId) return

    const recuperer = () => {
      apiCall(`/api/courses/${courseId}`)
        .then(setCourse)
        .catch(() => setErreur('Impossible de récupérer cette course'))
    }

    recuperer()
    pollRef.current = setInterval(() => {
      setCourse(prev => {
        if (prev && ['TERMINEE', 'ANNULEE'].includes(prev.statut)) {
          clearInterval(pollRef.current)
          return prev
        }
        recuperer()
        return prev
      })
    }, 4000)

    return () => clearInterval(pollRef.current)
  }, [courseId])

  useEffect(() => {
    if (!course?.passagerId) return
    if (passagerChargePourId.current === course.passagerId) return
    passagerChargePourId.current = course.passagerId
    apiCall(`/api/courses/${course.id}/passager`)
      .then(setPassager)
      .catch(() => setPassager(null))
  }, [course?.passagerId])

  useEffect(() => {
    // ANNULEE (par le passager / l'admin) ou repassée EN_ATTENTE (plus assignée)
    if (course?.statut === 'ANNULEE' || course?.statut === 'EN_ATTENTE') {
      clearInterval(pollRef.current)
      const t = setTimeout(() => navigate('/chauffeur'), 2000)
      return () => clearTimeout(t)
    }
  }, [course?.statut])

  const statutActifIndex = course ? STATUTS.findIndex(s => s.id === course.statut) : -1

  const actionStatut = async () => {
    if (!course) return
    const prochain = PROCHAIN_STATUT[course.statut]
    if (!prochain) return

    setActionEnCours(true)
    setErreur('')
    try {
      const misAJour = await apiCall(`/api/courses/${courseId}/statut`, {
        method: 'PUT',
        body: JSON.stringify({ statut: prochain }),
      })
      setCourse(misAJour)
      if (prochain === 'TERMINEE') {
        navigate('/chauffeur/confirmation', { state: { courseId: misAJour.id } })
      }
    } catch (e) {
      setErreur(e.message || 'Action impossible')
    } finally {
      setActionEnCours(false)
    }
  }

  const annulerCourse = async () => {
    setActionEnCours(true)
    try {
      await apiCall(`/api/courses/${courseId}/annuler-chauffeur`, { method: 'PUT' })
      navigate('/chauffeur')
    } catch (e) {
      setErreur(e.message || "Impossible d'annuler la course")
      setActionEnCours(false)
      setShowAnnulation(false)
    }
  }

  const bg = modeNuit ? '#0F172A' : '#FFF7ED'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  if (!courseId) return null

  if (!course) {
    return (
      <LayoutChauffeur>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
          <p style={{ color: textSecondary }}>{erreur || 'Chargement de la course...'}</p>
        </div>
      </LayoutChauffeur>
    )
  }

  const depotPos = course.departLat && course.departLng
    ? [Number(course.departLat), Number(course.departLng)] : [3.848, 11.502]
  const arriveePos = course.arriveeLat && course.arriveeLng
    ? [Number(course.arriveeLat), Number(course.arriveeLng)] : null
  const moiPos = maPosition ? [maPosition.lat, maPosition.lng] : depotPos

  const prix = Number(course.prixFinal ?? course.prixEstime ?? 0)
  // Commission = taux défini par l'admin (page Paramètres)
  const commission = tarifs ? Number(tarifs.commissionPourcentage) : null
  const gainNet = commission != null ? Math.round(prix * (1 - commission / 100)) : null

  return (
    <LayoutChauffeur>
      <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: bg }}>

        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <MapContainer center={moiPos} zoom={14} style={{ height: '100%', minHeight: '400px', width: '100%' }} zoomControl={false}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={depotPos} icon={iconePassager}>
              <Popup>{passager ? `${passager.prenom} ${passager.nom}` : 'Passager'}</Popup>
            </Marker>
            <Marker position={moiPos} icon={ikoneChauffeur}>
              <Popup>Votre position</Popup>
            </Marker>
            {/* Approche jusqu'au passager : indicatif, en pointillés (position qui change sans cesse) */}
            {maPosition && ['ACCEPTEE', 'EN_ROUTE'].includes(course.statut) && (
              <Polyline positions={[moiPos, depotPos]} color="#EA580C" weight={3} dashArray="6 8" />
            )}
            {/* Trajet de la course : vrai tracé routier (pointillés si simple estimation) */}
            {itineraire ? (
              <Polyline positions={itineraire.trace} color="#EA580C" weight={4}
                        dashArray={itineraire.source === 'ESTIMATION' ? '10 5' : undefined} />
            ) : arriveePos && (
              <Polyline positions={[depotPos, arriveePos]} color="#EA580C" weight={4} dashArray="10 5" />
            )}
          </MapContainer>
        </div>

        <div className="w-full lg:w-96 flex flex-col gap-4 p-5 overflow-y-auto" style={{ background: cardBg, borderLeft: `1px solid ${border}` }}>

          {erreur && (
            <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {erreur}
            </div>
          )}

          {course.statut === 'ANNULEE' ? (
            <div className="p-4 rounded-2xl text-center" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div className="text-sm font-bold" style={{ color: '#DC2626' }}>Cette course a été annulée par le passager</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                {STATUTS.map((s, i) => (
                  <div key={s.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full transition-all duration-500"
                        style={{ background: i <= statutActifIndex ? '#EA580C' : border, transform: i === statutActifIndex ? 'scale(1.4)' : 'scale(1)' }}
                      />
                      <span style={{ fontSize: '9px', marginTop: '4px', color: i === statutActifIndex ? '#EA580C' : textSecondary, fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </div>
                    {i < STATUTS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 transition-all duration-500" style={{ background: i < statutActifIndex ? '#EA580C' : border }} />
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl" style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', border: `1px solid ${border}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg" style={{ background: '#0B1F4A' }}>
                    {passager ? `${(passager.prenom || '?')[0]}${(passager.nom || '?')[0]}` : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: textPrimary }}>
                      {passager ? `${passager.prenom} ${passager.nom}` : 'Passager'}
                    </div>
                  </div>
                  <a
                    href={passager?.telephone ? `tel:${passager.telephone}` : undefined}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: '#EFF6FF', color: '#2563EB', opacity: passager?.telephone ? 1 : 0.5, pointerEvents: passager?.telephone ? 'auto' : 'none' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Appeler
                  </a>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-xs" style={{ color: textSecondary }}>{course.departAdresse}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                    <span className="text-xs font-semibold" style={{ color: textPrimary }}>{course.arriveeAdresse}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl text-center" style={{ background: modeNuit ? '#0F172A' : '#FFF7ED', border: `1px solid ${modeNuit ? border : '#FED7AA'}` }}>
                <div className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>
                  {course.statut === 'DEMARREE' ? 'Prix en cours' : 'Prix estimé'}
                </div>
                <div className="text-3xl font-black" style={{ color: '#EA580C' }}>{prix.toLocaleString()} FCFA</div>
                <div className="text-xs mt-1" style={{ color: textSecondary }}>Gain net : {gainNet != null ? `${gainNet.toLocaleString()} FCFA (commission ${commission} %)` : "…"}</div>
              </div>

              {PROCHAIN_STATUT[course.statut] && (
                <button
                  onClick={actionStatut}
                  disabled={actionEnCours}
                  className="w-full py-4 rounded-2xl font-black text-base transition-all"
                  style={{ background: COULEUR_BOUTON[course.statut], color: 'white', boxShadow: `0 4px 14px ${COULEUR_BOUTON[course.statut]}66`, opacity: actionEnCours ? 0.6 : 1 }}
                >
                  {actionEnCours ? '...' : LABEL_BOUTON[course.statut]}
                </button>
              )}

              {['ACCEPTEE', 'EN_ROUTE'].includes(course.statut) && (
                <button
                  onClick={() => setShowAnnulation(true)}
                  className="w-full py-3 rounded-2xl font-bold text-sm"
                  style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
                >
                  Annuler la course
                </button>
              )}
            </>
          )}

        </div>
      </div>

      {showAnnulation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: cardBg }}>
            <h3 className="text-lg font-black mb-2" style={{ color: textPrimary }}>Annuler la course ?</h3>
            <p className="text-sm mb-6" style={{ color: textSecondary }}>
              Le passager sera notifié immédiatement. Les annulations fréquentes peuvent affecter votre note.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowAnnulation(false)} disabled={actionEnCours} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ border: `1px solid ${border}`, color: textSecondary }}>
                Non, continuer
              </button>
              <button onClick={annulerCourse} disabled={actionEnCours} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: '#DC2626', color: 'white', opacity: actionEnCours ? 0.6 : 1 }}>
                {actionEnCours ? 'Annulation...' : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

    </LayoutChauffeur>
  )
}

export default CourseEnCours