import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LayoutChauffeur from '../../components/layout/LayoutChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'
import { deconnecter } from '../../utils/session'

const ProfilChauffeur = () => {
  const [profil, setProfil] = useState(null)
  const [vehicule, setVehicule] = useState(null)
  const [historique, setHistorique] = useState([])
  const [documents, setDocuments] = useState([])
  const [tarifs, setTarifs] = useState(null)
  const { modeNuit, basculerTheme } = useTheme()
  const navigate = useNavigate()

  const bg = modeNuit ? '#0F172A' : '#FFF7ED'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'
  const inputBg = modeNuit ? '#0F172A' : '#F9FAFB'

  const [edition, setEdition] = useState(null)
  const [message, setMessage] = useState({ type: '', texte: '' })
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    apiCall('/api/chauffeurs/mon-profil')
      .then(p => {
        setProfil(p)
        if (p.id) {
          apiCall(`/api/chauffeurs/${p.id}/public`).then(setVehicule).catch(() => {})
          apiCall(`/api/chauffeur/documents/${p.id}`).then(setDocuments).catch(() => {})
        }
      })
      .catch(() => {})
    apiCall('/api/courses/chauffeur/historique').then(setHistorique).catch(() => {})
    apiCall('/api/courses/tarifs').then(setTarifs).catch(() => {})
  }, [])

  const enregistrer = async () => {
    setEnregistrement(true)
    setMessage({ type: '', texte: '' })
    try {
      const maj = await apiCall('/api/chauffeurs/mon-profil', { method: 'PUT', body: JSON.stringify(edition) })
      setProfil(maj)
      setEdition(null)
      setMessage({ type: 'succes', texte: 'Coordonnées mises à jour. Les passagers verront vos nouveaux numéros pour payer.' })
    } catch (e) {
      setMessage({ type: 'erreur', texte: e.message })
    } finally {
      setEnregistrement(false)
    }
  }

  const commission = tarifs ? Number(tarifs.commissionPourcentage) : 0
  const documentsATraiter = documents.filter(d => d.statut !== 'VALIDE').length

  const formaterDateCourte = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  const activiteRecente = useMemo(() => historique.slice(0, 4).map(c => {
    const prix = Number(c.prixFinal ?? c.prixEstime ?? 0)
    const gain = Math.round(prix * (1 - commission / 100))
    return {
      texte: c.statut === 'ANNULEE' ? 'Course annulée' : `Course vers ${c.arriveeAdresse}`,
      date: formaterDateCourte(c.endedAt || c.createdAt),
      gains: c.statut === 'TERMINEE' ? `+${gain.toLocaleString()} FCFA` : null,
      couleur: c.statut === 'ANNULEE' ? '#DC2626' : '#16A34A',
    }
  }), [historique, commission])

  const deconnexion = () => {
    deconnecter()
    navigate('/connexion', { replace: true })
  }

  if (!profil) {
    return (
      <LayoutChauffeur>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
          <p style={{ color: textSecondary }}>Chargement du profil...</p>
        </div>
      </LayoutChauffeur>
    )
  }

  // Sécurise l'accès aux initiales : évite un crash si prenom/nom sont
  // vides ou absents dans la réponse API.
  const initiale = (s) => (s && s.length > 0 ? s[0] : '?')

  return (
    <LayoutChauffeur>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>Mon profil</h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>Vos informations personnelles et votre véhicule</p>
              </div>

              {/* Avatar + stats */}
              <div className="p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center font-black text-white text-2xl flex-shrink-0" style={{ background: '#7C2D12' }}>
                  {initiale(profil.prenom)}{initiale(profil.nom)}
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
                    {profil.statut === 'ACTIF' ? 'Chauffeur actif' : (profil.statut === 'EN_ATTENTE' ? 'En attente de validation' : 'Bloqué')}
                  </div>
                </div>
                <div className="flex gap-6">
                  {[
                    { label: 'Courses', valeur: String(profil.nbCourses ?? 0) },
                    { label: 'Note moyenne', valeur: profil.noteMoyenne != null ? Number(profil.noteMoyenne).toFixed(1) : '—' },
                    { label: 'Km parcourus', valeur: profil.kmTotal != null ? Number(profil.kmTotal).toFixed(0) : '0' },
                  ].map(s => (
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
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
                    Informations personnelles
                  </div>
                  <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: modeNuit ? '#374151' : '#F3F4F6', color: textSecondary }}>
                    Géré par l'admin
                  </div>
                </div>
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
                <p className="text-xs mt-4" style={{ color: textSecondary }}>
                  Nom, email et ville sont vérifiés par l’équipe : contactez le support pour les changer.
                </p>
              </div>

              {/* Coordonnées et Mobile Money (modifiables) */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Téléphone et Mobile Money</div>
                  {!edition && (
                    <button className="text-xs font-bold" style={{ color: '#EA580C' }}
                            onClick={() => setEdition({ telephone: profil.telephone || '', numeroMtn: profil.numeroMtn || '', numeroOrange: profil.numeroOrange || '' })}>
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
                <div className="flex flex-col gap-4">
                  {[['telephone', 'Téléphone'], ['numeroMtn', 'Numéro MTN Mobile Money'], ['numeroOrange', 'Numéro Orange Money']].map(([cle, label]) => (
                    <div key={cle}>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: textSecondary }}>{label}</label>
                      {edition ? (
                        <input value={edition[cle]} placeholder="6XXXXXXXX" onChange={e => setEdition({ ...edition, [cle]: e.target.value })}
                               className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: inputBg, border: `1px solid ${border}`, color: textPrimary }} />
                      ) : (
                        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: inputBg, border: `1px solid ${border}`, color: textPrimary }}>
                          {profil[cle] || '—'}
                        </div>
                      )}
                    </div>
                  ))}
                  {edition && (
                    <div className="flex gap-2">
                      <button onClick={() => setEdition(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ border: `1px solid ${border}`, color: textSecondary }}>Annuler</button>
                      <button onClick={enregistrer} disabled={enregistrement} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: '#EA580C' }}>
                        {enregistrement ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
                  )}
                  {!edition && !profil.numeroMtn && !profil.numeroOrange && (
                    <p className="text-xs" style={{ color: '#CA8A04' }}>Ajoutez au moins un numéro Mobile Money pour que les passagers puissent vous payer sans espèces.</p>
                  )}
                </div>
              </div>

              {/* Informations véhicule */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Mon véhicule</div>
                  <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: modeNuit ? '#374151' : '#F3F4F6', color: textSecondary }}>
                    Géré par l'admin
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Marque', valeur: vehicule?.vehiculeMarque },
                    { label: 'Modèle', valeur: vehicule?.vehiculeModele },
                    { label: 'Couleur', valeur: vehicule?.vehiculeCouleur },
                    { label: 'Immatriculation', valeur: vehicule?.immatriculation },
                  ].map(item => (
                    <div key={item.label}>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: textSecondary }}>{item.label}</label>
                      <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: inputBg, border: `1px solid ${border}`, color: textPrimary }}>
                        {item.valeur || '—'}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-4" style={{ color: textSecondary }}>
                  Pour modifier les informations du véhicule, contactez le support School Driva.
                </p>
              </div>

              {/* Paramètres */}
              <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Paramètres</div>
                </div>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: modeNuit ? '#1E3A5F' : '#FFF7ED' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: textPrimary }}>Mode nuit</div>
                      <div className="text-xs" style={{ color: textSecondary }}>Actif entre 20h et 6h</div>
                    </div>
                  </div>
                  <button onClick={basculerTheme} className="w-12 h-6 rounded-full transition-all relative" style={{ background: modeNuit ? '#EA580C' : '#D1D5DB' }}>
                    <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: modeNuit ? '26px' : '2px' }} />
                  </button>
                </div>
                <button onClick={() => navigate('/changer-mot-de-passe')} className="w-full flex items-center justify-between px-5 py-4 transition-all hover:opacity-80" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: modeNuit ? '#1E3A5F' : '#FFF7ED' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs" style={{ color: textSecondary }}>{item.date}</span>
                          {item.gains && <span className="text-xs font-black" style={{ color: item.couleur }}>{item.gains}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Numéros Mobile Money */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Mes numéros Mobile Money
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>MTN Mobile Money</div>
                    <div className="px-4 py-3 rounded-xl text-sm font-black" style={{ background: '#FFFBEB', border: '1px solid #FFCC00', color: '#111827' }}>
                      {profil.numeroMtn || 'Non renseigné'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>Orange Money</div>
                    <div className="px-4 py-3 rounded-xl text-sm font-black" style={{ background: '#FFF7ED', border: '1px solid #FF6600', color: '#111827' }}>
                      {profil.numeroOrange || 'Non renseigné'}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: textSecondary }}>
                    Ces numéros sont affichés aux passagers pour le paiement. Contactez le support pour les modifier.
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textSecondary }}>Documents</div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm" style={{ color: textSecondary }}>État du dossier</span>
                  <span className="text-sm font-black" style={{ color: documentsATraiter > 0 ? '#DC2626' : '#16A34A' }}>
                    {documentsATraiter > 0 ? `${documentsATraiter} à traiter` : 'Tous validés'}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/chauffeur/documents')}
                  className="w-full py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}
                >
                  Voir mes documents
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </LayoutChauffeur>
  )
}

export default ProfilChauffeur