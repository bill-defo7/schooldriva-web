import { useState, useEffect, useRef } from 'react'
import LayoutChauffeur from '../../components/layout/LayoutChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'

const Portefeuille = () => {
  const [showRecharge, setShowRecharge] = useState(false)
  const [operateur, setOperateur] = useState(null)
  const [montant, setMontant] = useState('')
  const [telephone, setTelephone] = useState('')
  const [erreurForm, setErreurForm] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const [portefeuille, setPortefeuille] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [rechargeSuivie, setRechargeSuivie] = useState(null) // recharge en cours de suivi (statut EN_ATTENTE)
  const [soldeMinimum, setSoldeMinimum] = useState(null) // paramètre admin
  const [verification, setVerification] = useState(false)

  const { modeNuit } = useTheme()
  const pollRef = useRef(null)

  const bg = modeNuit ? '#0F172A' : '#FFF7ED'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  const chargerTout = () => {
    apiCall('/api/paiements/portefeuille').then(setPortefeuille).catch(() => {})
    apiCall('/api/paiements/transactions').then(setTransactions).catch(() => {})
  }

  useEffect(() => {
    chargerTout()
    apiCall('/api/courses/tarifs').then(t => setSoldeMinimum(Number(t.soldeMinimum))).catch(() => {})
    // Numéro du profil pré-rempli dans le formulaire de recharge
    apiCall('/api/chauffeurs/mon-profil').then(p => setTelephone(t => t || p.numeroMtn || p.numeroOrange || p.telephone || '')).catch(() => {})
    // Reprend le suivi d'une recharge encore en attente au chargement
    apiCall('/api/paiements/recharges').then(liste => {
      const enCours = liste.find(r => r.statut === 'EN_ATTENTE')
      if (enCours) setRechargeSuivie(enCours)
    }).catch(() => {})
  }, [])

  // Poll le statut de la recharge en cours (validée / rejetée par le webhook CT Pay)
  useEffect(() => {
    if (!rechargeSuivie || rechargeSuivie.statut !== 'EN_ATTENTE') {
      clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(() => {
      apiCall('/api/paiements/recharges').then(liste => {
        const maj = liste.find(r => r.id === rechargeSuivie.id)
        if (maj && maj.statut !== 'EN_ATTENTE') {
          setRechargeSuivie(maj)
          chargerTout()
          clearInterval(pollRef.current)
        }
      }).catch(() => {})
    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [rechargeSuivie])

  const envoyerRecharge = async () => {
    if (!operateur || !montant || !telephone) return
    setEnvoiEnCours(true)
    setErreurForm('')
    try {
      const recharge = await apiCall('/api/paiements/recharges', {
        method: 'POST',
        body: JSON.stringify({ montant: Number(montant), telephone, operateur: operateur.toUpperCase() }),
      })
      setRechargeSuivie(recharge)
      setShowRecharge(false)
      setMontant('')
      setTelephone('')
      setOperateur(null)
    } catch (e) {
      setErreurForm(e.message || 'Impossible de lancer la recharge')
    } finally {
      setEnvoiEnCours(false)
    }
  }

  // Si CT PAY n'a pas pu nous notifier, on lui redemande directement le statut
  const verifierMaintenant = async () => {
    setVerification(true)
    try {
      const maj = await apiCall(`/api/paiements/recharges/${rechargeSuivie.id}/verifier`, { method: 'POST' })
      setRechargeSuivie(maj)
      if (maj.statut !== 'EN_ATTENTE') chargerTout()
    } catch (e) {
      setErreurForm(e.message)
    } finally {
      setVerification(false)
    }
  }

  const solde = portefeuille ? Number(portefeuille.solde) : null
  const soldeInsuffisant = solde != null && soldeMinimum != null ? solde < soldeMinimum : portefeuille?.soldeInsuffisant

  const formaterDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <LayoutChauffeur>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── COLONNE GAUCHE ── */}
            <div className="flex-1 flex flex-col gap-5">

              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>Portefeuille</h1>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>Gérez votre solde et vos transactions</p>
              </div>

              {/* Solde */}
              <div className="p-6 rounded-2xl" style={{ background: modeNuit ? '#1E293B' : '#7C2D12' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Solde disponible
                </div>
                <div className="text-4xl font-black text-white mb-1">
                  {solde != null ? `${solde.toLocaleString()} FCFA` : '—'}
                </div>

                {soldeInsuffisant && (
                  <div className="p-3 rounded-xl mb-4 mt-2" style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)' }}>
                    <p className="text-xs font-bold text-red-300">
                      Solde insuffisant (minimum {soldeMinimum != null ? soldeMinimum.toLocaleString() : '…'} FCFA) — rechargez pour continuer à accepter des courses
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowRecharge(true)}
                  disabled={rechargeSuivie?.statut === 'EN_ATTENTE'}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold mt-4"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', opacity: rechargeSuivie?.statut === 'EN_ATTENTE' ? 0.5 : 1 }}
                >
                  Demander une recharge
                </button>
              </div>

              {/* Suivi recharge en cours */}
              {rechargeSuivie?.statut === 'EN_ATTENTE' && (
                <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ border: '3px solid #FED7AA', borderTopColor: '#EA580C', animation: 'tourner 0.8s linear infinite' }} />
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#7C2D12' }}>Recharge en attente</div>
                    <div className="text-xs" style={{ color: '#9A3412' }}>
                      Validez le paiement {rechargeSuivie.operateur} sur votre téléphone ({Number(rechargeSuivie.montant).toLocaleString()} FCFA)
                    </div>
                    <button onClick={verifierMaintenant} disabled={verification} className="mt-1 text-xs font-bold underline" style={{ color: '#7C2D12' }}>
                      {verification ? 'Vérification...' : 'J’ai validé, vérifier maintenant'}
                    </button>
                  </div>
                </div>
              )}
              {rechargeSuivie?.statut === 'VALIDEE' && (
                <div className="p-4 rounded-2xl" style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}>
                  <div className="text-sm font-bold text-green-700">Recharge confirmée</div>
                  <div className="text-xs text-green-600">{Number(rechargeSuivie.montant).toLocaleString()} FCFA ajoutés à votre solde.</div>
                </div>
              )}
              {rechargeSuivie?.statut === 'REJETEE' && (
                <div className="p-4 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div className="text-sm font-bold" style={{ color: '#DC2626' }}>Recharge échouée</div>
                  <div className="text-xs" style={{ color: '#DC2626' }}>{rechargeSuivie.raisonRejet || 'Paiement refusé ou échoué.'}</div>
                </div>
              )}

              {/* Historique transactions */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textSecondary }}>
                  Historique des transactions
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  {transactions.length === 0 && (
                    <div className="px-5 py-6 text-center text-sm" style={{ color: textSecondary }}>Aucune transaction pour l'instant</div>
                  )}
                  {transactions.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: i < transactions.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.type === 'RECHARGE' ? '#DCFCE7' : '#FEE2E2' }}>
                        {t.type === 'RECHARGE' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: textPrimary }}>
                          {t.type === 'RECHARGE' ? 'Recharge' : `Commission — course #${t.courseId ?? '?'}`}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: textSecondary }}>{formaterDate(t.createdAt)}</div>
                      </div>
                      <div className="text-sm font-black flex-shrink-0" style={{ color: t.type === 'RECHARGE' ? '#16A34A' : '#DC2626' }}>
                        {t.type === 'RECHARGE' ? '+' : '-'}{Number(t.montant).toLocaleString()} FCFA
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── COLONNE DROITE ── */}
            <div className="w-full lg:w-80 flex flex-col gap-5">

              <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>
                  Comment recharger
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { num: '1', texte: 'Indiquez le montant, votre numéro et l\'opérateur' },
                    { num: '2', texte: 'Un prompt de paiement s\'affiche directement sur votre téléphone' },
                    { num: '3', texte: 'Validez le paiement via le code MTN/Orange Money' },
                    { num: '4', texte: 'Votre solde est crédité automatiquement, en quelques secondes' },
                  ].map(item => (
                    <div key={item.num} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5" style={{ background: '#EA580C', color: 'white' }}>
                        {item.num}
                      </div>
                      <span className="text-xs leading-relaxed" style={{ color: textSecondary }}>{item.texte}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowRecharge(true)}
                  disabled={rechargeSuivie?.statut === 'EN_ATTENTE'}
                  className="w-full mt-4 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', opacity: rechargeSuivie?.statut === 'EN_ATTENTE' ? 0.5 : 1 }}
                >
                  Demander une recharge
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal recharge */}
      {showRecharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowRecharge(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: cardBg }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black" style={{ color: textPrimary }}>Demande de recharge</h3>
              <button onClick={() => setShowRecharge(false)} style={{ color: textSecondary }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {erreurForm && (
              <div className="text-xs font-semibold px-3 py-2 rounded-lg mb-4" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                {erreurForm}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: textSecondary }}>Opérateur</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'mtn', label: 'MTN Mobile Money', couleur: '#FFCC00' },
                  { id: 'orange', label: 'Orange Money', couleur: '#FF6600' },
                ].map(op => (
                  <button
                    key={op.id}
                    onClick={() => setOperateur(op.id)}
                    className="py-3 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: operateur === op.id ? op.couleur : (modeNuit ? '#374151' : '#F3F4F6'),
                      color: operateur === op.id ? (op.id === 'mtn' ? '#111827' : 'white') : textSecondary,
                      border: `2px solid ${operateur === op.id ? op.couleur : border}`
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: textSecondary }}>Numéro de téléphone</label>
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="Ex: 677123456"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', border: `1.5px solid ${border}`, color: textPrimary }}
              />
            </div>

            <div className="mb-6">
              <label className="text-xs font-semibold mb-2 block" style={{ color: textSecondary }}>Montant (FCFA)</label>
              <input
                type="number"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: modeNuit ? '#0F172A' : '#F9FAFB', border: `1.5px solid ${border}`, color: textPrimary }}
              />
            </div>

            <button
              onClick={envoyerRecharge}
              disabled={!operateur || !montant || !telephone || envoiEnCours}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{
                background: operateur && montant && telephone ? '#EA580C' : '#D1D5DB',
                color: 'white',
                cursor: (operateur && montant && telephone && !envoiEnCours) ? 'pointer' : 'not-allowed',
                opacity: envoiEnCours ? 0.7 : 1
              }}
            >
              {envoiEnCours ? 'Envoi...' : 'Lancer le paiement'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tourner { to { transform: rotate(360deg); } }
      `}</style>

    </LayoutChauffeur>
  )
}

export default Portefeuille