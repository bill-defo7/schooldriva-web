import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiCall } from '../../utils/api'

const point = (couleur) => L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${couleur};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8], className: '',
})
const iconeVehicule = L.divIcon({
  html: `<div style="background:#0B1F4A;border-radius:8px;padding:3px 7px;color:#fff;font-size:10px;font-weight:700;border:2px solid #EA580C">🚖</div>`,
  iconSize: [34, 24], iconAnchor: [17, 12], className: '',
})

const LIBELLES = {
  EN_ATTENTE: 'Recherche d’un chauffeur', ACCEPTEE: 'Chauffeur en approche', EN_ROUTE: 'Chauffeur en route',
  ARRIVEE: 'Chauffeur arrivé au point de départ', DEMARREE: 'Trajet en cours',
  TERMINEE: 'Trajet terminé', ANNULEE: 'Trajet annulé',
}

// Page PUBLIQUE (sans compte) ouverte par le proche qui a reçu le lien
const SuiviPartage = () => {
  const { token } = useParams()
  const [suivi, setSuivi] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    let minuteur = null
    const charger = () => apiCall(`/api/courses/partage/${encodeURIComponent(token)}`)
      .then(d => {
        if (!actif) return
        setSuivi(d)
        // Rafraîchissement toutes les 10 s tant que le trajet est en cours
        if (!['TERMINEE', 'ANNULEE'].includes(d.statut)) minuteur = setTimeout(charger, 10000)
      })
      .catch(e => actif && setErreur(e.message))
    charger()
    return () => { actif = false; clearTimeout(minuteur) }
  }, [token])

  const fini = suivi && ['TERMINEE', 'ANNULEE'].includes(suivi.statut)
  const depart = suivi?.departLat ? [Number(suivi.departLat), Number(suivi.departLng)] : null
  const arrivee = suivi?.arriveeLat ? [Number(suivi.arriveeLat), Number(suivi.arriveeLng)] : null
  const vehicule = suivi?.chauffeurLat ? [Number(suivi.chauffeurLat), Number(suivi.chauffeurLng)] : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F4F8' }}>
      <header className="px-5 py-4 flex items-center justify-between" style={{ background: '#0B1F4A' }}>
        <span className="text-white font-black text-lg">School <span style={{ color: '#F97316' }}>Driva</span></span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,.6)' }}>Suivi de trajet partagé</span>
      </header>

      {erreur && <div className="m-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{erreur}</div>}
      {!suivi && !erreur && <p className="m-6 text-sm text-gray-500">Chargement du trajet...</p>}

      {suivi && (
        <div className="flex-1 flex flex-col lg:flex-row">
          {!fini && depart && (
            <div className="flex-1" style={{ minHeight: 380 }}>
              <MapContainer center={vehicule || depart} zoom={14} style={{ height: '100%', minHeight: 380, width: '100%' }}>
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={depart} icon={point('#2563EB')}><Popup>Départ</Popup></Marker>
                {arrivee && <Marker position={arrivee} icon={point('#EA580C')}><Popup>Destination</Popup></Marker>}
                {vehicule && <Marker position={vehicule} icon={iconeVehicule}><Popup>Véhicule</Popup></Marker>}
                {suivi.trace?.length > 1
                  ? <Polyline positions={suivi.trace} color="#2563EB" weight={4} />
                  : arrivee && <Polyline positions={[depart, arrivee]} color="#2563EB" weight={3} dashArray="8 6" />}
              </MapContainer>
            </div>
          )}
          <aside className="w-full lg:w-96 p-6 flex flex-col gap-4 bg-white">
            <div className="p-4 rounded-xl" style={{ background: fini ? '#F3F4F6' : '#FFF7ED' }}>
              <div className="text-xs font-bold uppercase text-gray-500">Statut</div>
              <div className="text-lg font-black" style={{ color: fini ? '#374151' : '#EA580C' }}>
                {LIBELLES[suivi.statut] || suivi.statut}
              </div>
            </div>
            {!fini && (
              <>
                <Info label="Départ" valeur={suivi.departAdresse} />
                <Info label="Destination" valeur={suivi.arriveeAdresse} />
                {suivi.chauffeurPrenom && <Info label="Chauffeur" valeur={suivi.chauffeurPrenom} />}
                {suivi.vehicule && <Info label="Véhicule" valeur={`${suivi.vehicule}${suivi.vehiculeCouleur ? ' · ' + suivi.vehiculeCouleur : ''}`} />}
                {suivi.immatriculation && <Info label="Immatriculation" valeur={suivi.immatriculation} />}
                {suivi.positionMajAt && (
                  <p className="text-xs text-gray-400">
                    Position mise à jour à {new Date(suivi.positionMajAt).toLocaleTimeString('fr-FR')}
                  </p>
                )}
              </>
            )}
            {fini && <p className="text-sm text-gray-500">Ce lien n’affiche plus de position une fois le trajet terminé.</p>}
            <Link to="/connexion" className="text-sm font-bold text-center" style={{ color: '#EA580C' }}>
              Découvrir School Driva
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}

const Info = ({ label, valeur }) => (
  <div>
    <div className="text-xs font-semibold text-gray-500">{label}</div>
    <div className="text-sm font-bold text-gray-900">{valeur || '—'}</div>
  </div>
)

export default SuiviPartage
