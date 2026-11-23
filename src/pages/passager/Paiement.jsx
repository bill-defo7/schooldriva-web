import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LayoutPassager from '../../components/layout/LayoutPassager'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'
import { EMAIL_SUPPORT } from '../../config/api'

const Paiement = () => {
  const [modePaiement, setModePaiement] = useState(null)
  const [enAttente, setEnAttente] = useState(false)
  const [course, setCourse] = useState(null)
  const [chauffeur, setChauffeur] = useState(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const { modeNuit } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const courseId = location.state?.courseId
  const pollRef = useRef(null)

  // Charger la course réelle et le profil du chauffeur (numéros mobile money inclus)
  useEffect(() => {
    if (!courseId) {
      setErreur('Aucune course à payer')
      return
    }
    apiCall(`/api/courses/${courseId}`)
      .then(c => {
        setCourse(c)
        if (c.chauffeurId) {
          return apiCall(`/api/chauffeurs/${c.chauffeurId}/public`).then(setChauffeur)
        }
      })
      .catch(e => setErreur(e.message || 'Impossible de charger la course'))
  }, [courseId])

  const prix = course?.prixFinal || course?.prixEstime || 0
  const destination = course?.arriveeAdresse || ''
  const vehicule = course?.typeVehicule?.toLowerCase() || 'voiture'
  // Le passager envoie le prix exact de la course (calculé par le serveur)
  const totalAvecFrais = Number(prix)

  const MODES = [
    { id: 'liquide', apiValue: 'LIQUIDE', label: 'Espèces', description: 'Payez directement au chauffeur en main propre', couleur: null, instructions: null },
    {
      id: 'mtn', apiValue: 'MTN', label: 'MTN Mobile Money', description: chauffeur?.numeroMtn ? `Vers le ${chauffeur.numeroMtn}` : 'Numéro MTN du chauffeur non renseigné', couleur: '#FFCC00',
      instructions: chauffeur?.numeroMtn ? {
        etapes: [
          'Composez *126# sur votre téléphone MTN',
          'Choisissez "Envoyer de l\'argent"',
          `Saisissez le numéro : ${chauffeur.numeroMtn}`,
          `Entrez le montant exact : ${totalAvecFrais.toLocaleString()} FCFA`,
          'Validez avec votre code PIN',
        ]
      } : null
    },
    {
      id: 'orange', apiValue: 'ORANGE', label: 'Orange Money', description: chauffeur?.numeroOrange ? `Vers le ${chauffeur.numeroOrange}` : 'Numéro Orange du chauffeur non renseigné', couleur: '#FF6600',
      instructions: chauffeur?.numeroOrange ? {
        etapes: [
          'Composez #150# sur votre téléphone Orange',
          'Choisissez "Transfert d\'argent"',
          `Saisissez le numéro : ${chauffeur.numeroOrange}`,
          `Entrez le montant exact : ${totalAvecFrais.toLocaleString()} FCFA`,
          'Validez avec votre code PIN',
        ]
      } : null
    },
  ]

  const modeSelectionne = MODES.find(m => m.id === modePaiement)

  const declarerPaiement = async () => {
    if (!modePaiement) return
    setChargement(true)
    setErreur('')
    try {
      await apiCall(`/api/courses/${courseId}/paiement`, {
        method: 'POST',
        body: JSON.stringify({ mode: modeSelectionne.apiValue }),
      })
      setEnAttente(true)
      // Polling : on attend que le chauffeur confirme la réception
      pollRef.current = setInterval(() => {
        apiCall(`/api/courses/${courseId}/paiement`)
          .then(p => {
            if (p.statut === 'CONFIRME') {
              clearInterval(pollRef.current)
              navigate('/passager/notation', { state: { courseId, prix, destination, vehicule } })
            }
          })
          .catch(() => {})
      }, 3000)
    } catch (e) {
      setErreur(e.message || 'Impossible de déclarer le paiement')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  const bg = modeNuit ? '#0F172A' : '#F0F4F8'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  if (erreur && !course) {
    return (
      <LayoutPassager>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
          <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>{erreur}</p>
        </div>
      </LayoutPassager>
    )
  }

  if (!course) {
    return (
      <LayoutPassager>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg, color: textSecondary }}>
          Chargement...
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
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>Paiement</h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>Choisissez votre mode de paiement</p>
              </div>

              {/* Récapitulatif */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>Récapitulatif</div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm" style={{ color: textSecondary }}>Destination</span>
                  <span className="text-sm font-semibold" style={{ color: textPrimary }}>{destination}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm" style={{ color: textSecondary }}>Véhicule</span>
                  <span className="text-sm font-semibold capitalize" style={{ color: textPrimary }}>{vehicule}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm" style={{ color: textSecondary }}>Prix course</span>
                  <span className="text-sm font-semibold" style={{ color: textPrimary }}>{prix.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center pt-3" style={{ borderTop: `1px solid ${border}`, marginTop: '8px' }}>
                  <span className="font-bold text-sm" style={{ color: textPrimary }}>Total à envoyer</span>
                  <span className="text-2xl font-black" style={{ color: '#EA580C' }}>
                    {totalAvecFrais.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              {/* Modes de paiement */}
              {!enAttente && (
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Mode de paiement</div>
                  {MODES.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setModePaiement(mode.id)}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                      style={{
                        background: modePaiement === mode.id ? (modeNuit ? '#1E3A5F' : '#EFF6FF') : cardBg,
                        border: `2px solid ${modePaiement === mode.id ? '#2563EB' : border}`,
                      }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs"
                        style={{ background: mode.couleur || (modeNuit ? '#374151' : '#F3F4F6'), color: mode.couleur ? '#111827' : textSecondary }}
                      >
                        {mode.id === 'liquide' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>}
                        {mode.id === 'mtn' && <span style={{ fontSize: 11 }}>MTN</span>}
                        {mode.id === 'orange' && <span style={{ fontSize: 10, color: 'white' }}>Orange</span>}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm" style={{ color: textPrimary }}>{mode.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: textSecondary }}>{mode.description}</div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: modePaiement === mode.id ? '#2563EB' : border }}>
                        {modePaiement === mode.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Instructions Mobile Money */}
              {!enAttente && modeSelectionne?.instructions && (
                <div className="p-5 rounded-2xl" style={{ background: modeNuit ? '#1E293B' : '#FFF7ED', border: `1px solid ${modeNuit ? border : '#FED7AA'}` }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#EA580C' }}>Instructions de paiement</div>
                  <div className="p-3 rounded-xl mb-4 flex items-center justify-between" style={{ background: modeNuit ? '#0F172A' : '#FFFFFF', border: `1px solid ${border}` }}>
                    <div>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: textSecondary }}>Compte {modeSelectionne.label}</div>
                      <div className="text-base font-black" style={{ color: textPrimary }}>{modePaiement === 'mtn' ? chauffeur.numeroMtn : chauffeur.numeroOrange}</div>
                      <div className="text-xs font-semibold mt-0.5" style={{ color: '#EA580C' }}>{chauffeur.prenom} {chauffeur.nom}</div>
                    </div>
                    <div className="px-3 py-1 rounded-lg text-xs font-black" style={{ background: modePaiement === 'mtn' ? '#FFCC00' : '#FF6600', color: modePaiement === 'mtn' ? '#111827' : 'white' }}>
                      {totalAvecFrais.toLocaleString()} FCFA
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {modeSelectionne.instructions.etapes.map((etape, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5" style={{ background: '#EA580C', color: 'white' }}>{i + 1}</div>
                        <span className="text-sm leading-relaxed" style={{ color: textPrimary }}>{etape}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!enAttente && modePaiement && (modePaiement === 'mtn' || modePaiement === 'orange') && !modeSelectionne?.instructions && (
                <p className="text-xs text-center font-semibold" style={{ color: '#DC2626' }}>
                  Ce chauffeur n'a pas encore renseigné de numéro {modePaiement === 'mtn' ? 'MTN' : 'Orange'} Money.
                </p>
              )}

              {erreur && (
                <p className="text-xs text-center font-semibold" style={{ color: '#DC2626' }}>{erreur}</p>
              )}

              {/* Bouton */}
              {!enAttente ? (
                <button
                  onClick={declarerPaiement}
                  disabled={!modePaiement || chargement}
                  className="w-full py-4 rounded-2xl font-black text-base transition-all"
                  style={{ background: (modePaiement && !chargement) ? '#EA580C' : '#D1D5DB', color: 'white', cursor: (modePaiement && !chargement) ? 'pointer' : 'not-allowed', boxShadow: modePaiement ? '0 4px 14px rgba(234,88,12,0.4)' : 'none' }}
                >
                  {chargement ? 'Envoi...' : (modePaiement === 'liquide' ? 'Confirmer — paiement en espèces' : 'J\'ai effectué le paiement')}
                </button>
              ) : (
                <div className="w-full py-6 rounded-2xl text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                    <span className="font-bold text-sm" style={{ color: textPrimary }}>En attente de confirmation du chauffeur...</span>
                  </div>
                  <p className="text-xs" style={{ color: textSecondary }}>Le chauffeur confirme avoir reçu le paiement</p>
                </div>
              )}

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>Paiement sécurisé</div>
                <div className="flex flex-col gap-3">
                  {[
                    { texte: 'Vérifiez le nom du chauffeur avant de payer', couleur: '#2563EB' },
                    { texte: 'Ne payez jamais en dehors de l\'application', couleur: '#EA580C' },
                    { texte: 'Conservez votre reçu de transaction MTN ou Orange', couleur: '#16A34A' },
                    { texte: 'En cas de litige contactez le support School Driva', couleur: '#EAB308' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.couleur }} />
                      <span className="text-xs leading-relaxed" style={{ color: textSecondary }}>{item.texte}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>Besoin d'aide ?</div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: textSecondary }}>Une difficulté avec votre paiement ? Notre équipe est disponible.</p>
                <a href={`mailto:${EMAIL_SUPPORT}?subject=${encodeURIComponent(`Paiement course #${courseId}`)}`}
                   className="block w-full py-2.5 rounded-xl text-xs font-bold text-center" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  Contacter le support
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </LayoutPassager>
  )
}

export default Paiement