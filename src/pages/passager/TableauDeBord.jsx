
import { useNavigate } from 'react-router-dom'
import LayoutPassager from '../../components/layout/LayoutPassager'
import { useTheme } from '../../context/ThemeContext'
import { useState, useEffect } from 'react'
import { apiCall } from '../../utils/api'

// Icônes des favoris selon leur libellé
const iconeFavori = (label = '') => {
  const l = label.toLowerCase()
  if (l.includes('maison') || l.includes('domicile')) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (l.includes('univ') || l.includes('école') || l.includes('ecole') || l.includes('campus') || l.includes('fac')) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}

const ACTUALITES = [
  {
    id: 1,
    type: 'securite',
    titre: 'Conseil sécurité',
    texte: 'Vérifiez toujours la plaque d\'immatriculation et le nom du chauffeur avant de monter.',
    couleur: '#2563EB',
    bgCouleur: '#EFF6FF',
  },
  {
    id: 2,
    type: 'info',
    titre: 'Nouveau dans l\'app',
    texte: 'Pendant une course, appuyez sur « Partager mon trajet » pour qu’un proche suive votre position en direct.',
    couleur: '#16A34A',
    bgCouleur: '#DCFCE7',
  },
]

const TableauDeBord = () => {
  const [recherche, setRecherche] = useState('')
  const [profil, setProfil] = useState(null)
  const [courses, setCourses] = useState([])
  const [favoris, setFavoris] = useState([])
  const [campus, setCampus] = useState([])
  const [courseActive, setCourseActive] = useState(null)
 
  const { modeNuit } = useTheme()
  const navigate = useNavigate()

  // destination : texte libre, ou objet { texte, latitude, longitude } déjà localisé
  const allerAReservation = (destination = '') => {
    navigate('/passager/reservation', { state: { destination } })
  }

  const bg = modeNuit ? '#0F172A' : '#E8EDF5'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#C7D7F0'
  const iconBg = modeNuit ? '#1E3A5F' : '#EFF6FF'

  useEffect(() => {
    apiCall('/api/passagers/mon-profil')
      .then(p => {
        setProfil(p)
        apiCall(`/api/campus${p.villeId ? `?villeId=${p.villeId}` : ''}`).then(setCampus).catch(() => {})
      })
      .catch(() => {})
    apiCall('/api/courses/historique').then(setCourses).catch(() => {})
    apiCall('/api/passagers/mes-favoris').then(setFavoris).catch(() => {})
    apiCall('/api/courses/active').then(setCourseActive).catch(() => {})
  }, [])
const coursesTerminees = courses.filter(c => c.statut === 'TERMINEE')
const nbCourses = coursesTerminees.length
const montantTotal = coursesTerminees.reduce((total, c) => total + (c.prixFinal || 0), 0)
const destinationsRecentes = [...new Map(
  coursesTerminees.map(c => [c.arriveeAdresse, c])
).values()]
  .slice(0, 3)
  .map(c => ({ id: c.id, nom: c.arriveeAdresse, adresse: c.arriveeAdresse,
    destination: c.arriveeLat ? { texte: c.arriveeAdresse, latitude: Number(c.arriveeLat), longitude: Number(c.arriveeLng) } : c.arriveeAdresse }))

  return (
    <LayoutPassager>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">

          {/* Layout 2 colonnes */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              {/* Salutation */}
              <div>
               <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>
                  Bonjour, {profil?.prenom || '...'}
                </h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>
                  Où souhaitez-vous aller ?
                </p>
              </div>

              {courseActive && (
                <button onClick={() => navigate('/passager/suivi', { state: { courseId: courseActive.id } })}
                        className="w-full p-4 rounded-2xl text-left flex items-center justify-between"
                        style={{ background: '#EA580C', color: 'white' }}>
                  <div>
                    <div className="font-black text-sm">Vous avez une course en cours</div>
                    <div className="text-xs opacity-90 truncate">Vers {courseActive.arriveeAdresse}</div>
                  </div>
                  <span className="font-bold text-sm">Suivre →</span>
                </button>
              )}

              {/* Barre de recherche */}
              <div
                className="flex items-center gap-3 px-4 py-4 rounded-2xl shadow-sm cursor-text"
                style={{ background: cardBg, border: `1px solid ${border}` }}
                onClick={() => allerAReservation()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={recherche}
                  onChange={e => setRecherche(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && allerAReservation(recherche)}
                  placeholder="Saisissez votre destination..."
                  className="flex-1 text-sm font-medium outline-none bg-transparent"
                  style={{ color: textPrimary }}
                />
                {recherche && (
                  <button onClick={() => setRecherche('')} style={{ color: textSecondary }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Favoris */}
              <div>
                <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: textSecondary }}>
                  Mes favoris
                </h2>
                {favoris.length === 0 ? (
                  <button onClick={() => navigate('/passager/profil')} className="w-full p-4 rounded-2xl text-sm text-left"
                          style={{ background: cardBg, border: `1px dashed ${border}`, color: textSecondary }}>
                    Aucun favori. Enregistrez une adresse (maison, campus...) depuis l’écran de réservation ★
                  </button>
                ) : (
                <div className="grid grid-cols-3 gap-3">
                  {favoris.slice(0, 6).map(fav => (
                    <button
                      key={fav.id}
                      onClick={() => allerAReservation(fav.lat ? { texte: fav.adresse, latitude: Number(fav.lat), longitude: Number(fav.lng) } : fav.adresse)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105"
                      style={{ background: cardBg, border: `1px solid ${border}` }}
                      title={fav.adresse}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: iconBg }}>
                        {iconeFavori(fav.label)}
                      </div>
                      <div className="text-xs font-bold text-center truncate w-full" style={{ color: textPrimary }}>
                        {fav.label}
                      </div>
                    </button>
                  ))}
                </div>
                )}
              </div>

              {/* Dernières destinations */}
              <div>
                <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: textSecondary }}>
                  Dernières destinations
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  {destinationsRecentes.length === 0 && (
                    <div className="px-5 py-4 text-sm" style={{ color: textSecondary }}>Vos destinations apparaîtront ici après votre première course.</div>
                  )}
                  {destinationsRecentes.map((dest, i) => (
  <button
    key={dest.id}
    onClick={() => allerAReservation(dest.destination)}
    className="w-full flex items-center gap-4 px-5 py-4 transition-all text-left hover:opacity-80"
    style={{ borderBottom: i < destinationsRecentes.length - 1 ? `1px solid ${border}` : 'none' }}
  >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                          <circle cx="12" cy="10" r="3"/>
                          <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{dest.nom}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: textSecondary }}>{dest.adresse}</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  ))}
                </div>
                {/* Comment ça marche */}
<div>
  <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: textSecondary }}>
    Comment ça marche
  </h2>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {[
      {
        num: '1',
        titre: 'Saisissez votre destination',
        texte: 'Entrez où vous voulez aller et choisissez votre type de véhicule.',
        couleur: '#2563EB'
      },
      {
        num: '2',
        titre: 'Un chauffeur accepte',
        texte: 'Un chauffeur vérifié près de vous accepte votre course en quelques secondes.',
        couleur: '#EA580C'
      },
      {
        num: '3',
        titre: 'Voyagez et payez',
        texte: 'Suivez votre trajet en temps réel et payez en espèces ou mobile money.',
        couleur: '#16A34A'
      },
    ].map(etape => (
      <div
        key={etape.num}
        className="p-4 rounded-2xl"
        style={{ background: cardBg, border: `1px solid ${border}` }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm mb-3"
          style={{ background: etape.couleur }}
        >
          {etape.num}
        </div>
        <div className="text-sm font-bold mb-1" style={{ color: textPrimary }}>{etape.titre}</div>
        <div className="text-xs leading-relaxed" style={{ color: textSecondary }}>{etape.texte}</div>
      </div>
    ))}
  </div>
</div>
              </div>

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              {/* Trajets populaires */}
              <div>
                <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: textSecondary }}>
                  Points campus
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  {campus.length === 0 && (
                    <div className="px-5 py-4 text-sm" style={{ color: textSecondary }}>Aucun point campus pour votre ville.</div>
                  )}
                  {campus.slice(0, 6).map((pt, i) => (
                    <button
                      key={pt.id}
                      onClick={() => allerAReservation({ texte: pt.nom, latitude: Number(pt.lat), longitude: Number(pt.lng) })}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all hover:opacity-80"
                      style={{ borderBottom: i < Math.min(campus.length, 6) - 1 ? `1px solid ${border}` : 'none' }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                        {iconeFavori('campus')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{pt.nom}</div>
                        <div className="text-xs truncate" style={{ color: textSecondary }}>{[pt.categorie, pt.adresse].filter(Boolean).join(' · ')}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* À la une */}
              <div>
                <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: textSecondary }}>
                  À la une
                </h2>
                <div className="flex flex-col gap-3">
                  {ACTUALITES.map(actu => (
                    <div
                      key={actu.id}
                      className="p-4 rounded-2xl"
                      style={{
                        background: modeNuit ? cardBg : actu.bgCouleur,
                        border: `1px solid ${modeNuit ? border : actu.couleur + '33'}`
                      }}
                    >
                      <div className="text-xs font-bold mb-1" style={{ color: actu.couleur }}>
                        {actu.titre}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                        {actu.texte}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Mes statistiques */}
<div>
  <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: textSecondary }}>
    Mes statistiques
  </h2>
  <div
    className="rounded-2xl overflow-hidden"
    style={{ background: cardBg, border: `1px solid ${border}` }}
  >
    {[
  { label: 'Courses effectuées', valeur: String(nbCourses), couleur: '#2563EB' },
  { label: 'Montant total dépensé', valeur: `${montantTotal.toLocaleString()} FCFA`, couleur: '#16A34A' },
].map((stat, i) => (
      <div
        key={stat.label}
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: i < 1 ? `1px solid ${border}` : 'none' }}
      >
        <span className="text-sm" style={{ color: textSecondary }}>{stat.label}</span>
        <span className="text-sm font-black" style={{ color: stat.couleur }}>{stat.valeur}</span>
      </div>
    ))}
  </div>
</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </LayoutPassager>
  )
}

export default TableauDeBord