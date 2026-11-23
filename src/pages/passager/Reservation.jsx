import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LayoutPassager from '../../components/layout/LayoutPassager'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Icône position passager — bleu
const iconePassager = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: ''
})

// Icône destination — orange
const iconeDestination = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#EA580C;border:3px solid white;box-shadow:0 2px 8px rgba(234,88,12,0.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: ''
})

// Au-delà de cette marge d'erreur, la position GPS n'est pas fiable (PC sans
// GPS localisé par adresse IP, par ex.) : le passager doit la confirmer.
const PRECISION_MAX_M = 200

const MESSAGES_GPS = {
  1: "Accès à la position refusé : autorisez-le dans le navigateur, ou saisissez votre adresse de départ.",
  2: "Position introuvable sur cet appareil : saisissez votre adresse ou choisissez le point sur la carte.",
  3: "La localisation prend trop de temps : réessayez, ou saisissez votre adresse de départ.",
}

// Clic sur la carte → point de départ (quand le mode « choisir sur la carte » est actif)
function ClicCarte({ actif, onChoix }) {
  useMapEvents({ click: (e) => { if (actif) onChoix(e.latlng) } })
  return null
}

// Recentre la carte quand le point de départ change
function Recentrer({ lat, lng }) {
  const carte = useMap()
  useEffect(() => {
    if (lat != null && lng != null) carte.setView([lat, lng], Math.max(carte.getZoom(), 14))
  }, [lat, lng, carte])
  return null
}

const Reservation = () => {
  const [etape, setEtape] = useState(1)
  const [vehicule, setVehicule] = useState(null)
  const { modeNuit } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Destination reçue du tableau de bord : texte libre, ou objet déjà localisé
  // (favori, point campus, ancienne destination) → pas besoin de chercher.
  const destinationInitiale = location.state?.destination || ''
  const destObjet = typeof destinationInitiale === 'object' ? destinationInitiale : null
  const [dest, setDest] = useState(destObjet ? destObjet.texte : destinationInitiale)
  const [suggestions, setSuggestions] = useState([])
  const [destSelectionnee, setDestSelectionnee] = useState(destObjet)
  const [campus, setCampus] = useState([])
  const [favoriEnregistre, setFavoriEnregistre] = useState('')

  // depart : { lat, lng, texte, confirme } — confirme = position fiable ou choisie par le passager
  const [depart, setDepart] = useState(null)
  const [erreurDepart, setErreurDepart] = useState('')
  const [avertissementDepart, setAvertissementDepart] = useState('')
  const [localisationEnCours, setLocalisationEnCours] = useState(false)
  const [departSaisi, setDepartSaisi] = useState('')
  const [suggestionsDepart, setSuggestionsDepart] = useState([])
  const [choixSurCarte, setChoixSurCarte] = useState(false)
  // Zone desservie déterminée par le serveur à partir du point de départ
  // (ignorée tant que le départ n'est pas confirmé)
  const [zoneServeur, setZone] = useState(null)
  const [villeProfil, setVilleProfil] = useState(null)
  const zone = depart?.confirme ? zoneServeur : null
  const villeId = zone?.desservie ? zone.villeId : null
  const [tarifs, setTarifs] = useState(null)
  const [chauffeursParVille, setChauffeursParVille] = useState({})
  // Itinéraire routier calculé par le serveur (distance, durée, tracé, prix)
  const [itineraire, setItineraire] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  const debounceRef = useRef(null)
  const debounceDepartRef = useRef(null)
  // Cache des recherches d'adresse déjà faites pendant cette session —
  // évite de reconsommer le quota SerpAPI si l'utilisateur retape,
  // efface puis retape la même chose (très fréquent en pratique).
  const cacheAdressesRef = useRef(new Map())

  const bg = modeNuit ? '#0F172A' : '#F0F4F8'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  // Position de départ par géolocalisation. Réglages volontairement souples :
  // sur ordinateur, la « haute précision » échoue souvent (pas de GPS).
  const localiser = () => {
    setErreurDepart('')
    setAvertissementDepart('')
    if (!navigator.geolocation) {
      setErreurDepart('Géolocalisation non disponible : saisissez votre adresse de départ.')
      return
    }
    setLocalisationEnCours(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocalisationEnCours(false)
        const { latitude, longitude, accuracy } = pos.coords
        const fiable = accuracy <= PRECISION_MAX_M
        setDepart({ lat: latitude, lng: longitude, texte: 'Ma position actuelle', confirme: fiable })
        setDepartSaisi(fiable ? 'Ma position actuelle' : '')
        if (!fiable) {
          const marge = accuracy >= 1000 ? `${Math.round(accuracy / 1000)} km` : `${Math.round(accuracy)} m`
          setAvertissementDepart(`Position approximative (± ${marge}) : déplacez le repère bleu sur la carte, `
            + 'touchez « Choisir sur la carte » ou saisissez votre adresse.')
        }
      },
      err => {
        setLocalisationEnCours(false)
        setErreurDepart(MESSAGES_GPS[err.code] || MESSAGES_GPS[2])
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    )
  }

  // Première tentative au chargement (différée : pas de setState synchrone dans l'effet)
  useEffect(() => {
    const t = setTimeout(localiser, 0)
    return () => clearTimeout(t)
  }, [])

  // Point de départ choisi par le passager (carte, repère déplacé, adresse)
  const definirDepart = (lat, lng, texte) => {
    setDepart({ lat, lng, texte, confirme: true })
    setDepartSaisi(texte)
    setAvertissementDepart('')
    setErreurDepart('')
    setChoixSurCarte(false)
    setSuggestionsDepart([])
  }

  // Le serveur dit si le départ est dans une zone desservie (et dans quelle ville)
  useEffect(() => {
    if (!depart?.confirme) return
    apiCall(`/api/courses/zone?lat=${depart.lat}&lng=${depart.lng}`)
      .then(setZone)
      .catch(() => setZone(null))
  }, [depart])

  // Profil passager (ville) + tarifs réels + points campus de la ville
  useEffect(() => {
    apiCall('/api/passagers/mon-profil')
      .then(profil => {
        // La ville du profil ne sert plus qu'à proposer des points campus tant
        // que la zone du départ n'est pas connue
        if (profil.villeId) setVilleProfil(profil.villeId)
      })
      .catch(() => {})

    apiCall('/api/courses/tarifs')
      .then(setTarifs)
      .catch(() => {})
  }, [])

  // Si une course est déjà en cours, on y renvoie directement
  useEffect(() => {
    apiCall('/api/courses/active')
      .then(c => { if (c) navigate('/passager/suivi', { replace: true, state: { courseId: c.id } }) })
      .catch(() => {})
  }, [navigate])

  const choisirCampus = (pt) => {
    setDest(pt.nom)
    setDestSelectionnee({ texte: pt.nom, latitude: Number(pt.lat), longitude: Number(pt.lng) })
    setSuggestions([])
  }

  const enregistrerFavori = async () => {
    const label = window.prompt('Nom du favori (ex : Maison, Campus, Cité U)', 'Maison')
    if (!label || !destSelectionnee) return
    try {
      await apiCall('/api/passagers/mes-favoris', {
        method: 'POST',
        body: JSON.stringify({ label: label.slice(0, 50), adresse: destSelectionnee.texte, lat: destSelectionnee.latitude, lng: destSelectionnee.longitude }),
      })
      setFavoriEnregistre(`« ${label} » ajouté à vos favoris`)
    } catch (e) {
      setFavoriEnregistre(e.message)
    }
  }

  // Chauffeurs en ligne dans la zone du départ, au total et par type de véhicule
  const listeChauffeurs = villeId != null ? chauffeursParVille[villeId] : undefined
  const nbChauffeursDisponibles = listeChauffeurs ? listeChauffeurs.length : null
  const disponiblesParType = listeChauffeurs
    ? listeChauffeurs.reduce((acc, c) => ({ ...acc, [c.typeVehicule]: (acc[c.typeVehicule] || 0) + 1 }), {})
    : null

  // Points campus de la ville du départ (à défaut, de la ville du profil)
  const villeCampus = villeId || villeProfil
  useEffect(() => {
    if (!villeCampus) return
    apiCall(`/api/campus?villeId=${villeCampus}`).then(setCampus).catch(() => setCampus([]))
  }, [villeCampus])

  // Chauffeurs réellement en ligne dans la ville, rafraîchis toutes les 30 s
  useEffect(() => {
    if (!villeId) return
    const charger = () => apiCall(`/api/courses/chauffeurs-disponibles?villeId=${villeId}`)
      .then(liste => setChauffeursParVille(c => ({ ...c, [villeId]: liste })))
      .catch(() => {})
    charger()
    const minuteur = setInterval(charger, 30000)
    return () => clearInterval(minuteur)
  }, [villeId])

  // Recherche d'adresse partagée (départ et destination) : debounce 600 ms +
  // cache de session pour économiser le quota SerpAPI
  const rechercherAdresse = (valeur, refDebounce, setResultats) => {
    if (refDebounce.current) clearTimeout(refDebounce.current)
    if (valeur.trim().length < 3) { setResultats([]); return }
    const cle = valeur.trim().toLowerCase()
    if (cacheAdressesRef.current.has(cle)) { setResultats(cacheAdressesRef.current.get(cle)); return }
    refDebounce.current = setTimeout(() => {
      apiCall(`/api/courses/rechercher-adresse?q=${encodeURIComponent(valeur)}`)
        .then(resultats => { cacheAdressesRef.current.set(cle, resultats); setResultats(resultats) })
        .catch(() => setResultats([]))
    }, 600)
  }

  const onChangeDepart = (valeur) => {
    setDepartSaisi(valeur)
    if (depart?.confirme) setDepart(null)
    rechercherAdresse(valeur, debounceDepartRef, setSuggestionsDepart)
  }

  // Autocomplétion de la destination
  const onChangeDest = (valeur) => {
    setDest(valeur)
    setDestSelectionnee(null)
    rechercherAdresse(valeur, debounceRef, setSuggestions)
  }

  const choisirSuggestion = (s) => {
    setDest(s.texte)
    setDestSelectionnee(s)
    setSuggestions([])
  }

  const departPret = !!(depart?.confirme && zone?.desservie)

  // Itinéraire réel par la route, demandé au serveur dès que départ et destination sont connus
  const cleItineraire = departPret && destSelectionnee
    ? `${depart.lat},${depart.lng}>${destSelectionnee.latitude},${destSelectionnee.longitude}` : null
  useEffect(() => {
    if (!cleItineraire) return
    let actif = true
    apiCall(`/api/courses/itineraire?departLat=${depart.lat}&departLng=${depart.lng}`
      + `&arriveeLat=${destSelectionnee.latitude}&arriveeLng=${destSelectionnee.longitude}`)
      .then(it => { if (actif) setItineraire({ ...it, cle: cleItineraire }) })
      .catch(() => {})
    return () => { actif = false }
  }, [cleItineraire]) // eslint-disable-line react-hooks/exhaustive-deps

  const itineraireCourant = itineraire && itineraire.cle === cleItineraire ? itineraire : null
  const distance = itineraireCourant ? itineraireCourant.distanceKm : null

  // Le véhicule choisi doit avoir au moins un chauffeur en ligne (si on le sait)
  const vehiculeDisponible = !!vehicule
    && !(disponiblesParType && (disponiblesParType[vehicule.toUpperCase()] || 0) === 0)

  const VEHICULES = tarifs ? [
    {
      id: 'voiture', nom: 'Voiture', places: '4 places',
      prix: itineraireCourant ? Number(itineraireCourant.prixVoiture) : null,
      icon: (
        <svg width="48" height="32" viewBox="0 0 56 36" fill="none">
          <rect x="4" y="12" width="48" height="16" rx="4" fill="#1A3A6B"/>
          <rect x="10" y="6" width="36" height="11" rx="3" fill="#2563EB"/>
          <rect x="13" y="8" width="10" height="7" rx="1" fill="#DBEAFE" opacity=".7"/>
          <rect x="27" y="8" width="10" height="7" rx="1" fill="#DBEAFE" opacity=".7"/>
          <circle cx="14" cy="28" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
          <circle cx="42" cy="28" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
          <rect x="4" y="18" width="7" height="5" rx="1" fill="#FCD34D" opacity=".8"/>
          <rect x="45" y="18" width="7" height="5" rx="1" fill="#FCD34D" opacity=".8"/>
        </svg>
      )
    },
    {
      id: 'moto', nom: 'Moto', places: '1 place',
      prix: itineraireCourant ? Number(itineraireCourant.prixMoto) : null,
      icon: (
        <svg width="48" height="32" viewBox="0 0 56 40" fill="none">
          <ellipse cx="28" cy="28" rx="18" ry="10" fill="#EA580C"/>
          <ellipse cx="28" cy="20" rx="10" ry="8" fill="#F97316"/>
          <rect x="22" y="10" width="12" height="6" rx="2" fill="#7C2D12"/>
          <circle cx="12" cy="34" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
          <circle cx="44" cy="34" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
        </svg>
      )
    }
  ] : []

  const confirmerCourse = async () => {
    if (!departPret || !destSelectionnee || !vehiculeDisponible) return
    setChargement(true)
    setErreur('')
    try {
      const course = await apiCall('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          typeVehicule: vehicule.toUpperCase(),
          departAdresse: depart.texte || 'Point de départ',
          departLat: depart.lat,
          departLng: depart.lng,
          arriveeAdresse: destSelectionnee.texte,
          arriveeLat: destSelectionnee.latitude,
          arriveeLng: destSelectionnee.longitude,
          villeId,
        }),
      })
      navigate('/passager/suivi', {
        state: { courseId: course.id, vehicule, destination: dest, prix: course.prixEstime }
      })
    } catch (e) {
      setErreur(e.message || 'Impossible de créer la course')
    } finally {
      setChargement(false)
    }
  }

  return (
    <LayoutPassager>
      <div className="min-h-screen" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

          {/* ── COLONNE GAUCHE — Formulaire ── */}
          <div className="w-full lg:w-96 flex flex-col gap-4">

            {/* Titre */}
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: textPrimary }}>
                Réserver une course
              </h1>
              <p className="text-sm mt-1" style={{ color: textSecondary }}>
                Renseignez votre itinéraire
              </p>
            </div>

            {erreur && etape === 1 && (
              <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>{erreur}</div>
            )}

            {erreurDepart && (
              <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                {erreurDepart}
              </div>
            )}

            {avertissementDepart && (
              <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FFFBEB', color: '#B45309' }}>
                {avertissementDepart}
              </div>
            )}

            {zone && !zone.desservie && (
              <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                {zone.message || "School Driva n'est pas encore disponible dans votre zone."}
              </div>
            )}

            {villeId && nbChauffeursDisponibles !== null && (
              <div
                className="text-xs font-semibold px-3 py-2 rounded-lg"
                style={{
                  background: nbChauffeursDisponibles > 0 ? '#F0FDF4' : '#FEF2F2',
                  color: nbChauffeursDisponibles > 0 ? '#16A34A' : '#DC2626'
                }}
              >
                {nbChauffeursDisponibles > 0
                  ? `${nbChauffeursDisponibles} chauffeur(s) disponible(s) dans ta ville`
                  : 'Aucun chauffeur en ligne dans ta ville pour le moment'}
              </div>
            )}

            {/* Champs départ / arrivée */}
            <div className="relative">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: cardBg, border: `1px solid ${border}` }}
            >
              {/* Départ : GPS, adresse saisie ou point choisi sur la carte */}
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={departSaisi}
                    onChange={e => onChangeDepart(e.target.value)}
                    placeholder={localisationEnCours ? 'Localisation en cours...' : 'Point de départ'}
                    className="flex-1 text-sm font-medium outline-none bg-transparent"
                    style={{ color: textPrimary }}
                  />
                </div>
                <div className="flex gap-3 mt-2 pl-6 text-xs font-bold">
                  <button type="button" onClick={localiser} disabled={localisationEnCours} style={{ color: '#2563EB' }}>
                    📍 Ma position
                  </button>
                  <button type="button" onClick={() => setChoixSurCarte(c => !c)}
                          style={{ color: choixSurCarte ? '#EA580C' : '#2563EB' }}>
                    🗺️ {choixSurCarte ? 'Touchez la carte…' : 'Choisir sur la carte'}
                  </button>
                </div>
                {suggestionsDepart.length > 0 && (
                  <div className="mt-2 rounded-xl overflow-hidden shadow" style={{ background: cardBg, border: `1px solid ${border}` }}>
                    {suggestionsDepart.map((sg, i) => (
                      <button key={i} type="button"
                              onClick={() => definirDepart(sg.latitude, sg.longitude, sg.texte)}
                              className="w-full text-left px-4 py-2 text-sm"
                              style={{ color: textPrimary, borderBottom: i < suggestionsDepart.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <div className="font-semibold">{sg.texte}</div>
                        {sg.sousTexte && <div className="text-xs" style={{ color: textSecondary }}>{sg.sousTexte}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Arrivée */}
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                <input
                  type="text"
                  value={dest}
                  onChange={e => onChangeDest(e.target.value)}
                  placeholder="Où allez-vous ?"
                  className="flex-1 text-sm font-medium outline-none bg-transparent"
                  style={{ color: textPrimary }}
                />
                {dest && (
                  <button aria-label="Effacer" onClick={() => { setDest(''); setDestSelectionnee(null); setSuggestions([]) }} style={{ color: textSecondary }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions d'autocomplétion */}
            {suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10 shadow-lg"
                style={{ background: cardBg, border: `1px solid ${border}` }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => choisirSuggestion(s)}
                    className="w-full text-left px-4 py-3 text-sm"
                    style={{ color: textPrimary, borderBottom: i < suggestions.length - 1 ? `1px solid ${border}` : 'none' }}
                  >
                    <div className="font-semibold">{s.texte}</div>
                    {s.sousTexte && <div className="text-xs" style={{ color: textSecondary }}>{s.sousTexte}</div>}
                  </button>
                ))}
              </div>
            )}
            </div>

            {/* Points campus : destinations en un clic */}
            {campus.length > 0 && !destSelectionnee && (
              <div className="flex flex-wrap gap-2">
                {campus.map(pt => (
                  <button key={pt.id} onClick={() => choisirCampus(pt)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: cardBg, color: textPrimary, border: `1px solid ${border}` }}>
                    🎓 {pt.nom}
                  </button>
                ))}
              </div>
            )}

            {destSelectionnee && (
              <div className="flex items-center justify-between text-xs">
                <button onClick={enregistrerFavori} className="font-bold" style={{ color: '#2563EB' }}>★ Enregistrer en favori</button>
                {favoriEnregistre && <span style={{ color: textSecondary }}>{favoriEnregistre}</span>}
              </div>
            )}

            {/* Bouton voir les véhicules */}
            {etape === 1 && (
              <button
                onClick={() => destSelectionnee && departPret && setEtape(2)}
                disabled={!destSelectionnee || !departPret}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: (destSelectionnee && departPret) ? '#EA580C' : '#D1D5DB',
                  color: 'white',
                  cursor: (destSelectionnee && departPret) ? 'pointer' : 'not-allowed'
                }}
              >
                Voir les véhicules disponibles
              </button>
            )}

            {/* Choix du véhicule */}
            {etape === 2 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
                  Choisissez votre véhicule
                </h2>

                {distance != null && (
                  <p className="text-xs" style={{ color: textSecondary }}>
                    Trajet par la route : {distance.toFixed(1)} km · environ {itineraireCourant.dureeMin} min
                    {itineraireCourant.source === 'ESTIMATION' && ' (estimation)'}
                  </p>
                )}

                {VEHICULES.map(v => {
                  const enLigne = disponiblesParType ? (disponiblesParType[v.id.toUpperCase()] || 0) : null
                  const indisponible = enLigne === 0
                  return (
                  <button
                    key={v.id}
                    onClick={() => !indisponible && setVehicule(v.id)}
                    disabled={indisponible}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                    style={{
                      background: vehicule === v.id && !indisponible ? (modeNuit ? '#1E3A5F' : '#EFF6FF') : cardBg,
                      border: `2px solid ${vehicule === v.id && !indisponible ? '#2563EB' : border}`,
                      opacity: indisponible ? 0.5 : 1,
                      cursor: indisponible ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div className="flex-shrink-0">{v.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm" style={{ color: textPrimary }}>{v.nom}</span>
                        <span className="font-black text-base" style={{ color: '#EA580C' }}>
                          {v.prix != null ? `≈ ${v.prix.toLocaleString()} FCFA` : '...'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: textSecondary }}>{v.places}</span>
                        {enLigne !== null && (
                          <span className="text-xs font-semibold" style={{ color: indisponible ? '#DC2626' : '#16A34A' }}>
                            {indisponible ? `Aucune ${v.nom.toLowerCase()} en ligne pour le moment` : `${enLigne} en ligne`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  )
                })}

                {/* Note prix */}
                <p className="text-xs text-center px-2" style={{ color: textSecondary }}>
                  Prix fixé à la réservation, calculé sur le trajet par la route
                </p>

                {erreur && (
                  <p className="text-xs text-center px-2 font-semibold" style={{ color: '#DC2626' }}>
                    {erreur}
                  </p>
                )}

                {/* Bouton confirmer */}
                <button
                  onClick={confirmerCourse}
                  disabled={!vehiculeDisponible || chargement}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: (vehiculeDisponible && !chargement) ? '#EA580C' : '#D1D5DB',
                    color: 'white',
                    cursor: (vehiculeDisponible && !chargement) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {chargement ? 'Création en cours...' : 'Confirmer la course'}
                </button>

                <button
                  onClick={() => setEtape(1)}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{ background: 'transparent', border: `1px solid ${border}`, color: textSecondary }}
                >
                  Modifier le trajet
                </button>
              </div>
            )}
          </div>

          {/* ── COLONNE DROITE — Vraie carte Leaflet ── */}
<div className="flex-1 rounded-3xl overflow-hidden relative min-h-96" style={{ border: `1px solid ${border}` }}>
  {choixSurCarte && (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-2 rounded-lg text-xs font-bold text-white shadow"
         style={{ background: '#EA580C' }}>
      Touchez la carte pour placer votre point de départ
    </div>
  )}
  <MapContainer
    center={depart ? [depart.lat, depart.lng] : [3.848, 11.502]}
    zoom={13}
    style={{ height: '100%', minHeight: '500px', width: '100%' }}
    zoomControl={true}
  >
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Itinéraires © <a href="https://openrouteservice.org">openrouteservice</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
<ClicCarte actif={choixSurCarte} onChoix={ll => definirDepart(ll.lat, ll.lng, 'Point choisi sur la carte')} />
<Recentrer lat={depart?.lat} lng={depart?.lng} />
{/* Point de départ : déplaçable pour corriger une position approximative */}
{depart && (
  <Marker
    position={[depart.lat, depart.lng]}
    icon={iconePassager}
    draggable
    eventHandlers={{ dragend: e => { const ll = e.target.getLatLng(); definirDepart(ll.lat, ll.lng, 'Point choisi sur la carte') } }}
  >
    <Popup>{depart.confirme ? 'Point de départ' : 'Position approximative — déplacez-moi'}</Popup>
  </Marker>
)}

{/* Destination */}
{destSelectionnee && (
  <Marker position={[destSelectionnee.latitude, destSelectionnee.longitude]} icon={iconeDestination}>
    <Popup>{destSelectionnee.texte}</Popup>
  </Marker>
)}

{/* Trajet */}
{/* Trajet : vrai tracé routier ; en mode estimation, ligne droite en pointillés */}
{itineraireCourant && (
  <Polyline
    positions={itineraireCourant.trace}
    color="#2563EB"
    weight={4}
    dashArray={itineraireCourant.source === 'ESTIMATION' ? '10 5' : undefined}
  />
)}

  </MapContainer>
</div>

        </div>
      </div>
    </LayoutPassager>
  )
}

export default Reservation