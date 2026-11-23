import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LayoutPassager from '../../components/layout/LayoutPassager'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'
import { deconnecter } from '../../utils/session'

const Profil = () => {
  const [profil, setProfil] = useState(null)
  const [historique, setHistorique] = useState([])
  const [favoris, setFavoris] = useState([])
  const [villes, setVilles] = useState([])
  const [edition, setEdition] = useState(null) // formulaire en cours de modification
  const [message, setMessage] = useState({ type: '', texte: '' })
  const [enregistrement, setEnregistrement] = useState(false)
  const { modeNuit, basculerTheme } = useTheme()
  const navigate = useNavigate()

  const bg = modeNuit ? '#0F172A' : '#F0F4F8'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'
  const inputBg = modeNuit ? '#0F172A' : '#F9FAFB'

  useEffect(() => {
    apiCall('/api/passagers/mon-profil').then(setProfil).catch(() => {})
    apiCall('/api/courses/historique').then(setHistorique).catch(() => {})
    apiCall('/api/passagers/mes-favoris').then(setFavoris).catch(() => {})
    apiCall('/api/villes').then(setVilles).catch(() => {})
  }, [])

  const enregistrerProfil = async () => {
    setEnregistrement(true)
    setMessage({ type: '', texte: '' })
    try {
      const maj = await apiCall('/api/passagers/mon-profil', {
        method: 'PUT',
        body: JSON.stringify({ ...edition, villeId: edition.villeId ? Number(edition.villeId) : null }),
      })
      setProfil(maj)
      setEdition(null)
      setMessage({ type: 'succes', texte: 'Profil mis à jour' })
    } catch (e) {
      setMessage({ type: 'erreur', texte: e.message })
    } finally {
      setEnregistrement(false)
    }
  }

  const supprimerFavori = async (id) => {
    try {
      await apiCall(`/api/passagers/mes-favoris/${id}`, { method: 'DELETE' })
      setFavoris(f => f.filter(x => x.id !== id))
    } catch (e) {
      setMessage({ type: 'erreur', texte: e.message })
    }
  }

  const coursesTerminees = useMemo(() => historique.filter(c => c.statut === 'TERMINEE'), [historique])
  const kmTotal = useMemo(
    () => coursesTerminees.reduce((acc, c) => acc + Number(c.distanceKm || 0), 0),
    [coursesTerminees]
  )

  const STATS = [
    { label: 'Courses', valeur: String(coursesTerminees.length) },
    { label: 'Km parcourus', valeur: kmTotal.toFixed(0) },
  ]

  const formaterDateCourte = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  const activiteRecente = historique.slice(0, 4).map(c => ({
    texte: c.statut === 'ANNULEE' ? `Course annulée — ${c.arriveeAdresse}` : `Course vers ${c.arriveeAdresse}`,
    date: formaterDateCourte(c.createdAt),
    couleur: c.statut === 'ANNULEE' ? '#DC2626' : '#16A34A',
  }))

  const deconnexion = () => {
    deconnecter()
    navigate('/connexion', { replace: true })
  }

  if (!profil) {
    return (
      <LayoutPassager>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
          <p style={{ color: textSecondary }}>Chargement du profil...</p>
        </div>
      </LayoutPassager>
    )
  }

  return (
    <LayoutPassager>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>Mon profil</h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>Vos informations personnelles</p>
              </div>

              {/* Avatar + stats */}
              <div className="p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center font-black text-white text-2xl flex-shrink-0" style={{ background: '#0B1F4A' }}>
                  {profil.prenom[0]}{profil.nom[0]}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xl font-black" style={{ color: textPrimary }}>{profil.prenom} {profil.nom}</div>
                  <div className="text-sm mt-0.5" style={{ color: textSecondary }}>{profil.email}</div>
                  <div
                    className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: profil.statut === 'ACTIF' ? '#DCFCE7' : '#FEE2E2',
                      color: profil.statut === 'ACTIF' ? '#16A34A' : '#DC2626'
                    }}
                  >
                    {profil.statut === 'ACTIF' ? 'Compte actif' : 'Compte bloqué'}
                  </div>
                </div>
                <div className="flex gap-6">
                  {STATS.map(s => (
                    <div key={s.label} className="text-center">
                      <div className="text-xl font-black" style={{ color: '#EA580C' }}>{s.valeur}</div>
                      <div className="text-xs mt-0.5" style={{ color: textSecondary }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informations personnelles */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Informations personnelles</div>
                  {!edition && (
                    <button className="text-xs font-bold" style={{ color: '#2563EB' }}
                            onClick={() => setEdition({ nom: profil.nom, prenom: profil.prenom, telephone: profil.telephone, villeId: profil.villeId || '' })}>
                      Modifier
                    </button>
                  )}
                </div>
                {message.texte && (
                  <div className="mb-4 text-xs font-semibold px-3 py-2 rounded-lg"
                       style={{ background: message.type === 'succes' ? '#DCFCE7' : '#FEF2F2', color: message.type === 'succes' ? '#16A34A' : '#DC2626' }}>
                    {message.texte}
                  </div>
                )}
                {edition ? (
                  <div className="flex flex-col gap-4">
                    {[['nom', 'Nom'], ['prenom', 'Prénom'], ['telephone', 'Téléphone (6XXXXXXXX)']].map(([cle, label]) => (
                      <div key={cle}>
                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: textSecondary }}>{label}</label>
                        <input value={edition[cle]} onChange={e => setEdition({ ...edition, [cle]: e.target.value })}
                               className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: inputBg, border: `1px solid ${border}`, color: textPrimary }} />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: textSecondary }}>Ville</label>
                      <select value={edition.villeId} onChange={e => setEdition({ ...edition, villeId: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl text-sm" style={{ background: inputBg, border: `1px solid ${border}`, color: textPrimary }}>
                        <option value="">— Choisir —</option>
                        {villes.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEdition(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ border: `1px solid ${border}`, color: textSecondary }}>Annuler</button>
                      <button onClick={enregistrerProfil} disabled={enregistrement} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: '#EA580C' }}>
                        {enregistrement ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Nom', valeur: profil.nom },
                    { label: 'Prénom', valeur: profil.prenom },
                    { label: 'Email', valeur: profil.email },
                    { label: 'Téléphone', valeur: profil.telephone },
                    { label: 'Ville', valeur: profil.villeNom },
                  ].map(champ => (
                    <div key={champ.label}>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: textSecondary }}>{champ.label}</label>
                      <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: inputBg, border: `1px solid ${border}`, color: textPrimary }}>
                        {champ.valeur || '—'}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Paramètres */}
              <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Paramètres</div>
                </div>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: modeNuit ? '#1E3A5F' : '#EFF6FF' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: textPrimary }}>Mode nuit</div>
                      <div className="text-xs" style={{ color: textSecondary }}>Thème sombre pour l’application</div>
                    </div>
                  </div>
                  <button onClick={basculerTheme} className="w-12 h-6 rounded-full transition-all relative" style={{ background: modeNuit ? '#2563EB' : '#D1D5DB' }}>
                    <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: modeNuit ? '26px' : '2px' }} />
                  </button>
                </div>
                <button onClick={() => navigate('/changer-mot-de-passe')} className="w-full flex items-center justify-between px-5 py-4 transition-all hover:opacity-80" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: modeNuit ? '#1E3A5F' : '#EFF6FF' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: textPrimary }}>Changer le mot de passe</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button onClick={deconnexion} className="w-full flex items-center gap-3 px-5 py-4 transition-all hover:opacity-80">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#DC2626' }}>Se déconnecter</span>
                </button>
              </div>

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              {/* Activité récente */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>Activité récente</div>
                <div className="flex flex-col gap-3">
                  {activiteRecente.length === 0 && (
                    <div className="text-xs" style={{ color: textSecondary }}>Aucune activité pour l'instant</div>
                  )}
                  {activiteRecente.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.couleur }} />
                      <div className="flex-1">
                        <div className="text-xs font-semibold" style={{ color: textPrimary }}>{item.texte}</div>
                        <div className="text-xs mt-0.5" style={{ color: textSecondary }}>{item.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destinations favorites */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>Mes destinations favorites</div>
                <div className="flex flex-col gap-3">
                  {favoris.length === 0 && (
                    <div className="text-xs" style={{ color: textSecondary }}>Aucun favori enregistré</div>
                  )}
                  {favoris.map((fav) => (
                    <div key={fav.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: modeNuit ? '#1E3A5F' : '#EFF6FF' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold" style={{ color: textPrimary }}>{fav.label}</div>
                        <div className="text-xs truncate" style={{ color: textSecondary }}>{fav.adresse}</div>
                      </div>
                      <button onClick={() => supprimerFavori(fav.id)} aria-label="Supprimer" className="text-xs font-bold" style={{ color: '#DC2626' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </LayoutPassager>
  )
}

export default Profil