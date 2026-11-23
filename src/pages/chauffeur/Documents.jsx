import { useState, useEffect } from 'react'
import LayoutChauffeur from '../../components/layout/LayoutChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'
import { EMAIL_SUPPORT } from '../../config/api'

// Catalogue des types de documents attendus — même liste et mêmes
// slugs que ceux utilisés à l'inscription (PreInscriptionChauffeur.jsx),
// car le backend n'expose aucun endpoint listant les types requis.
const TYPES_DOCUMENTS = [
  { type: 'CNI_RECTO', label: 'CNI recto' },
  { type: 'CNI_VERSO', label: 'CNI verso' },
  { type: 'SELFIE_CNI', label: 'Selfie avec CNI' },
  { type: 'PERMIS', label: 'Permis de conduire' },
  { type: 'PLAN_DOMICILE', label: 'Plan de domicile' },
  { type: 'CARTE_GRISE', label: 'Carte grise' },
  { type: 'ASSURANCE', label: 'Assurance véhicule' },
  { type: 'VISITE_TECHNIQUE', label: 'Visite technique' },
  { type: 'PHOTOS_VEHICULE', label: 'Photos du véhicule' },
  { type: 'CNI_GARANT', label: 'CNI du garant' },
  { type: 'CONTACTS_GARANT', label: 'Contacts du garant' },
]

const Documents = () => {
  const [chauffeurId, setChauffeurId] = useState(null)
  const [documentsBackend, setDocumentsBackend] = useState([]) // liste réelle
  const [docSelectionne, setDocSelectionne] = useState(null) // entrée du catalogue en cours de soumission
  const [fichier, setFichier] = useState(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const { modeNuit } = useTheme()

  const bg = modeNuit ? '#0F172A' : '#FFF7ED'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  const chargerDocuments = (id) => {
    apiCall(`/api/chauffeur/documents/${id}`).then(setDocumentsBackend).catch(() => {})
  }

  useEffect(() => {
    apiCall('/api/chauffeurs/mon-profil').then(p => {
      setChauffeurId(p.id)
      chargerDocuments(p.id)
    }).catch(() => {})
  }, [])

  // Fusionne le catalogue de types attendus avec les documents réels
  // renvoyés par le backend (par type) — "manquant" si jamais uploadé
  const documents = TYPES_DOCUMENTS.map(cat => {
    const doc = documentsBackend.find(d => d.type === cat.type)
    return {
      type: cat.type,
      nom: cat.label,
      statut: doc ? doc.statut : 'MANQUANT',
      raison: doc?.raisonRejet || null,
      expiration: doc?.expiration || null,
    }
  })

  const docsARenouveler = documents.filter(d => d.statut === 'REJETE' || d.statut === 'MANQUANT')
  const docsEnAttente = documents.filter(d => d.statut === 'EN_ATTENTE')
  const docsValides = documents.filter(d => d.statut === 'VALIDE')
  const toutOk = docsARenouveler.length === 0

  const soumettre = async () => {
    if (!fichier || !docSelectionne || !chauffeurId) return
    setEnvoiEnCours(true)
    setErreur('')
    try {
      const formData = new FormData()
      formData.append('chauffeurId', chauffeurId)
      formData.append('type', docSelectionne.type)
      formData.append('fichier', fichier)

      // apiCall ajoute le jeton de session et gère l'expiration de session
      await apiCall('/api/chauffeur/documents/upload', { method: 'POST', body: formData })

      chargerDocuments(chauffeurId)
      setDocSelectionne(null)
      setFichier(null)
    } catch (e) {
      setErreur(e.message || "Impossible d'envoyer ce document")
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const badge = (statut) => {
    if (statut === 'EN_ATTENTE') return { label: 'En attente', bg: '#FEF9C3', color: '#CA8A04' }
    if (statut === 'VALIDE') return { label: 'Validé', bg: '#DCFCE7', color: '#16A34A' }
    if (statut === 'REJETE') return { label: 'À renouveler', bg: '#FEE2E2', color: '#DC2626' }
    return { label: 'Manquant', bg: '#FEE2E2', color: '#DC2626' }
  }

  return (
    <LayoutChauffeur>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>Documents</h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>
                  {toutOk ? 'Tous vos documents sont en règle' : `${docsARenouveler.length} document(s) à soumettre`}
                </p>
              </div>

              {erreur && (
                <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  {erreur}
                </div>
              )}

              {!toutOk && (
                <div className="p-4 rounded-2xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                  <div className="font-bold text-sm text-red-700 mb-1">Action requise</div>
                  <p className="text-xs text-red-600">
                    Soumettez les documents manquants pour continuer à recevoir des courses.
                  </p>
                </div>
              )}

              {toutOk && (
                <div className="p-4 rounded-2xl" style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}>
                  <div className="font-bold text-sm text-green-700 mb-1">Dossier complet</div>
                  <p className="text-xs text-green-600">
                    Tous vos documents sont valides. Vous pouvez recevoir des courses.
                  </p>
                </div>
              )}

              {/* À renouveler / manquants */}
              {docsARenouveler.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#DC2626' }}>
                    À soumettre
                  </div>
                  <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: '1px solid #FECACA' }}>
                    {docsARenouveler.map((doc, i) => (
                      <div key={doc.type} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: i < docsARenouveler.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FEE2E2' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold" style={{ color: textPrimary }}>{doc.nom}</div>
                          <div className="text-xs mt-0.5" style={{ color: '#DC2626' }}>
                            {doc.raison || (doc.statut === 'MANQUANT' ? 'Document jamais soumis' : '')}
                          </div>
                        </div>
                        <button
                          onClick={() => setDocSelectionne(doc)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                          style={{ background: '#EA580C', color: 'white' }}
                        >
                          Soumettre
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validés / en attente */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textSecondary }}>
                  Autres documents
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  {[...docsEnAttente, ...docsValides].map((doc, i, arr) => {
                    const b = badge(doc.statut)
                    return (
                      <div key={doc.type} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: b.bg }}>
                          {doc.statut === 'EN_ATTENTE' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold" style={{ color: textPrimary }}>{doc.nom}</div>
                          {doc.expiration && (
                            <div className="text-xs mt-0.5" style={{ color: textSecondary }}>
                              Expire le {new Date(doc.expiration).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0" style={{ background: b.bg, color: b.color }}>
                          {b.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  État du dossier
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Validés', valeur: docsValides.length, couleur: '#16A34A', bg: '#DCFCE7' },
                    { label: 'En attente de vérification', valeur: docsEnAttente.length, couleur: '#CA8A04', bg: '#FEF9C3' },
                    { label: 'À soumettre', valeur: docsARenouveler.length, couleur: '#DC2626', bg: '#FEE2E2' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: item.bg }}>
                      <span className="text-xs font-semibold" style={{ color: item.couleur }}>{item.label}</span>
                      <span className="text-lg font-black" style={{ color: item.couleur }}>{item.valeur}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Renouvellement de documents
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { texte: 'Un document expiré ou rejeté doit être resoumis depuis cette page', couleur: '#2563EB' },
                    { texte: 'Soumettez le nouveau document dès que possible', couleur: '#EA580C' },
                    { texte: 'Validation par notre équipe après vérification', couleur: '#16A34A' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.couleur }} />
                      <span className="text-xs leading-relaxed" style={{ color: textSecondary }}>{item.texte}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textSecondary }}>
                  Besoin d'aide ?
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: textSecondary }}>
                  Un document refusé sans explication ? Contactez notre équipe.
                </p>
                <a href={`mailto:${EMAIL_SUPPORT}?subject=${encodeURIComponent('Documents chauffeur')}`}
                   className="block text-center w-full py-2.5 rounded-xl text-xs font-bold" style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>
                  Contacter le support
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal upload */}
      {docSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => { setDocSelectionne(null); setFichier(null) }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: cardBg }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black" style={{ color: textPrimary }}>{docSelectionne.nom}</h3>
              <button onClick={() => { setDocSelectionne(null); setFichier(null) }} style={{ color: textSecondary }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {docSelectionne.raison && (
              <p className="text-xs mb-5 p-3 rounded-xl" style={{ color: '#DC2626', background: '#FEE2E2' }}>
                {docSelectionne.raison}
              </p>
            )}

            <label
              className="w-full py-8 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer mb-5"
              style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', border: `2px dashed ${fichier ? '#16A34A' : border}` }}
            >
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setFichier(e.target.files[0])} />
              {fichier ? (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>{fichier.name}</span>
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="text-sm" style={{ color: textSecondary }}>Cliquez pour choisir un fichier</span>
                  <span className="text-xs" style={{ color: textSecondary }}>JPG, PNG ou PDF — max 5 Mo</span>
                </>
              )}
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => { setDocSelectionne(null); setFichier(null) }}
                disabled={envoiEnCours}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ border: `1px solid ${border}`, color: textSecondary }}
              >
                Annuler
              </button>
              <button
                onClick={soumettre}
                disabled={!fichier || envoiEnCours}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: fichier ? '#EA580C' : '#D1D5DB', color: 'white', cursor: (fichier && !envoiEnCours) ? 'pointer' : 'not-allowed', opacity: envoiEnCours ? 0.7 : 1 }}
              >
                {envoiEnCours ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </div>
        </div>
      )}

    </LayoutChauffeur>
  )
}

export default Documents