import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LayoutChauffeur from '../../components/layout/LayoutChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'

const ConfirmationPaiement = () => {
  const [modePaiement, setModePaiement] = useState(null)
  const [confirme, setConfirme] = useState(false)
  const [course, setCourse] = useState(null)
  const [passager, setPassager] = useState(null)
  const [tarifs, setTarifs] = useState(null)
  const [solde, setSolde] = useState(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const { modeNuit } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // courseId vient de la fin de course, ou est retrouvé (course terminée non confirmée)
  const [courseId, setCourseId] = useState(location.state?.courseId)
  const [paiementServeur, setPaiementServeur] = useState(null)

  useEffect(() => {
    if (courseId) return
    apiCall('/api/courses/chauffeur/active')
      .then(r => (r?.courseAPayer ? setCourseId(r.courseAPayer.id) : setErreur('Aucune course à confirmer')))
      .catch(e => setErreur(e.message))
  }, [courseId])

  useEffect(() => {
    if (!courseId) return
    apiCall(`/api/courses/${courseId}`)
      .then(c => {
        setCourse(c)
        if (c.passagerId) {
          apiCall(`/api/courses/${c.id}/passager`).then(setPassager).catch(() => {})
        }
        // Mode déjà déclaré par le passager → présélectionné
        apiCall(`/api/courses/${c.id}/paiement`)
          .then(p => { if (p?.mode) setModePaiement(p.mode.toLowerCase()) })
          .catch(() => {})
      })
      .catch(e => setErreur(e.message || 'Impossible de charger la course'))

    apiCall('/api/courses/tarifs').then(setTarifs).catch(() => {})
    apiCall('/api/paiements/portefeuille').then(setSolde).catch(() => {})
  }, [courseId])

  const prix = course?.prixFinal || course?.prixEstime || 0
  // Estimation avec le taux admin ; après confirmation, on affiche les montants du serveur
  const tauxCommission = tarifs ? Number(tarifs.commissionPourcentage) : 0
  const commission = paiementServeur ? Number(paiementServeur.commission) : Math.round(prix * tauxCommission / 100)
  const gainNet = paiementServeur ? Number(paiementServeur.gainChauffeur) : prix - commission

  const bg = modeNuit ? '#0F172A' : '#FFF7ED'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  const MODES = [
    { id: 'liquide', label: 'Espèces', description: 'Le passager a payé en main propre' },
    { id: 'mtn', label: 'MTN Mobile Money', description: 'Le passager a payé via MTN MoMo', couleur: '#FFCC00' },
    { id: 'orange', label: 'Orange Money', description: 'Le passager a payé via Orange Money', couleur: '#FF6600' },
  ]

  const confirmerReception = async () => {
    if (!modePaiement) return
    setChargement(true)
    setErreur('')
    try {
      const p = await apiCall(`/api/courses/${courseId}/paiement/confirmer`, {
        method: 'PUT',
        body: JSON.stringify({ mode: modePaiement.toUpperCase() }),
      })
      setPaiementServeur(p)
      setConfirme(true)
    } catch (e) {
      setErreur(e.message || 'Impossible de confirmer le paiement')
    } finally {
      setChargement(false)
    }
  }

  if (erreur && !course) {
    return (
      <LayoutChauffeur>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
          <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>{erreur}</p>
        </div>
      </LayoutChauffeur>
    )
  }

  if (!course) {
    return (
      <LayoutChauffeur>
        <div className="min-h-screen flex items-center justify-center" style={{ background: bg, color: textSecondary }}>
          Chargement...
        </div>
      </LayoutChauffeur>
    )
  }

  if (confirme) {
    return (
      <LayoutChauffeur>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: bg }}>
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#DCFCE7' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: textPrimary }}>Paiement confirmé !</h2>
            <p className="text-sm mb-2" style={{ color: textSecondary }}>
              La commission de {commission.toLocaleString()} FCFA a été déduite de votre portefeuille.
            </p>
            <p className="text-xl font-black mb-6" style={{ color: '#16A34A' }}>
              Gain net : {gainNet.toLocaleString()} FCFA
            </p>
            <button
              onClick={() => navigate('/chauffeur')}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: '#EA580C', color: 'white' }}
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </LayoutChauffeur>
    )
  }

  return (
    <LayoutChauffeur>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>
                  Confirmer le paiement
                </h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>
                  Confirmez avoir reçu le paiement du passager
                </p>
              </div>

              {/* Récapitulatif course */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Récapitulatif de la course
                </div>
                <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm" style={{ background: '#0B1F4A' }}>
                    {passager?.prenom?.[0]}{passager?.nom?.[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: textPrimary }}>
                      {passager ? `${passager.prenom} ${passager.nom}` : '...'}
                    </div>
                    <div className="text-xs" style={{ color: textSecondary }}>{course.arriveeAdresse}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: textSecondary }}>Prix de la course</span>
                    <span className="text-sm font-bold" style={{ color: textPrimary }}>{prix.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: textSecondary }}>Commission School Driva ({tauxCommission}%)</span>
                    <span className="text-sm font-bold" style={{ color: '#DC2626' }}>- {commission.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between pt-3" style={{ borderTop: `1px solid ${border}` }}>
                    <span className="font-bold text-sm" style={{ color: textPrimary }}>Votre gain net</span>
                    <span className="text-2xl font-black" style={{ color: '#16A34A' }}>{gainNet.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>

              {/* Mode de paiement reçu */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
                  Comment avez-vous reçu le paiement ?
                </div>
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
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs"
                      style={{ background: mode.couleur || (modeNuit ? '#374151' : '#F3F4F6'), color: mode.couleur ? '#111827' : textSecondary }}
                    >
                      {mode.id === 'liquide' && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="6" width="20" height="12" rx="2"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                      {mode.id === 'mtn' && <span style={{ fontSize: 11 }}>MTN</span>}
                      {mode.id === 'orange' && <span style={{ fontSize: 10, color: 'white' }}>Orange</span>}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm" style={{ color: textPrimary }}>{mode.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: textSecondary }}>{mode.description}</div>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: modePaiement === mode.id ? '#2563EB' : border }}
                    >
                      {modePaiement === mode.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>

              {erreur && (
                <p className="text-xs text-center font-semibold" style={{ color: '#DC2626' }}>{erreur}</p>
              )}

              {/* Bouton confirmer */}
              <button
                onClick={confirmerReception}
                disabled={!modePaiement || chargement}
                className="w-full py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: (modePaiement && !chargement) ? '#16A34A' : '#D1D5DB',
                  color: 'white',
                  cursor: (modePaiement && !chargement) ? 'pointer' : 'not-allowed',
                  boxShadow: modePaiement ? '0 4px 14px rgba(22,163,74,0.4)' : 'none'
                }}
              >
                {chargement ? 'Confirmation...' : 'Confirmer — j\'ai reçu le paiement'}
              </button>

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              {/* Rappel commission */}
              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Comment fonctionne la commission
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { texte: `La commission de ${tauxCommission}% est déduite automatiquement de votre portefeuille`, couleur: '#EA580C' },
                    { texte: 'Assurez-vous d\'avoir un solde suffisant avant de confirmer', couleur: '#2563EB' },
                    { texte: 'Vous ne pouvez pas repasser En ligne si votre solde est insuffisant', couleur: '#DC2626' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.couleur }} />
                      <span className="text-xs leading-relaxed" style={{ color: textSecondary }}>{item.texte}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solde réel */}
              <div className="p-5 rounded-2xl" style={{ background: modeNuit ? '#1E293B' : '#7C2D12', border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Solde actuel
                </div>
                <div className="text-2xl font-black text-white mb-1">
                  {solde ? Number(solde.solde).toLocaleString() : '...'} FCFA
                </div>
                {solde && (
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Après déduction : {(Number(solde.solde) - commission).toLocaleString()} FCFA
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </LayoutChauffeur>
  )
}

export default ConfirmationPaiement