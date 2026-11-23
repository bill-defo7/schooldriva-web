import { useMemo, useState } from 'react'
import LayoutAdmin from '../../components/layout/LayoutAdmin'
import { apiCall, formatFcfa, formatDate } from '../../utils/api'
import {
  useCouleurs, useDonnees, useAction, PageAdmin, Carte, Stat, Badge, Bouton, Modal,
  Filtres, Message, Vide, Ligne, Champ,
} from '../../components/admin/ui'

const FILTRES = { Toutes: null, 'En attente': 'EN_ATTENTE', Validées: 'VALIDEE', Rejetées: 'REJETEE' }

const Paiements = () => {
  const c = useCouleurs()
  const [onglet, setOnglet] = useState('recharges')
  const [filtre, setFiltre] = useState('Toutes')
  const [recharge, setRecharge] = useState(null)
  const [chauffeurSel, setChauffeurSel] = useState(null)

  const { donnees, erreur, chargement, recharger } = useDonnees(async () => {
    const [stats, recharges, transactions, portefeuilles, chauffeurs, tarifs] = await Promise.all([
      apiCall('/api/paiements/admin/stats'),
      apiCall('/api/paiements/admin/recharges'),
      apiCall('/api/paiements/admin/transactions'),
      apiCall('/api/paiements/admin/portefeuilles'),
      apiCall('/api/chauffeurs/admin/liste').catch(() => []),
      apiCall('/api/admin/parametres').catch(() => []),
    ])
    const noms = Object.fromEntries(chauffeurs.map(x => [x.id, `${x.prenom} ${x.nom}`]))
    const pfVersChauffeur = Object.fromEntries(portefeuilles.map(p => [p.id, p.chauffeurId]))
    const seuil = Number(tarifs.find(t => t.cle === 'SOLDE_MINIMUM_CHAUFFEUR')?.valeur ?? 500)
    return {
      stats, seuil, noms,
      recharges: recharges.map(r => ({ ...r, chauffeurNom: noms[r.chauffeurId] || `#${r.chauffeurId}` })),
      transactions: transactions.map(t => {
        const chauffeurId = pfVersChauffeur[t.portefeuilleId]
        return { ...t, chauffeurId, chauffeurNom: noms[chauffeurId] || `#${chauffeurId}` }
      }),
      portefeuilles: portefeuilles.map(p => ({ ...p, chauffeurNom: noms[p.chauffeurId] || `#${p.chauffeurId}` }))
        .sort((a, b) => Number(a.solde) - Number(b.solde)),
    }
  })
  const d = donnees
  const recharges = useMemo(() => (d?.recharges || []).filter(r => !FILTRES[filtre] || r.statut === FILTRES[filtre]), [d, filtre])

  const etatSolde = (solde) => Number(solde) < d.seuil ? 'Insuffisant' : Number(solde) < d.seuil * 3 ? 'Faible' : 'Normal'
  const couleurEtat = { Insuffisant: ['#FEE2E2', '#DC2626'], Faible: ['#FEF9C3', '#CA8A04'], Normal: ['#DCFCE7', '#16A34A'] }

  return (
    <LayoutAdmin>
      <PageAdmin titre="Paiements" sousTitre="Recharges des portefeuilles chauffeurs et commissions"
                 actions={<Bouton variante="contour" onClick={recharger}>Actualiser</Bouton>}>
        <Message>{erreur}</Message>
        {chargement && !d && <Vide>Chargement...</Vide>}
        {d && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Recharges en attente" valeur={d.stats.nbRechargesEnAttente} couleur="#CA8A04" />
              <Stat label="Commissions encaissées" valeur={formatFcfa(d.stats.totalCommissions)} couleur="#2563EB" sous="Revenus School Driva" />
              <Stat label="Recharges validées" valeur={formatFcfa(d.stats.totalRecharges)} couleur="#16A34A" />
              <Stat label="Soldes cumulés" valeur={formatFcfa(d.stats.soldeCumuleChauffeurs)} couleur="#EA580C" sous="Tous chauffeurs" />
            </div>

            <div className="flex" style={{ borderBottom: `1px solid ${c.border}` }}>
              {[['recharges', 'Recharges'], ['transactions', 'Transactions'], ['soldes', 'Soldes chauffeurs']].map(([id, label]) => (
                <button key={id} onClick={() => setOnglet(id)} className="px-5 py-3 text-sm font-bold"
                        style={{ color: onglet === id ? '#EA580C' : c.textSecondary, borderBottom: onglet === id ? '2px solid #EA580C' : 'none' }}>
                  {label}
                </button>
              ))}
            </div>

            {onglet === 'recharges' && (
              <>
                <Filtres options={Object.keys(FILTRES)} actif={filtre} onChange={setFiltre} />
                <Carte className="overflow-hidden">
                  {recharges.length === 0 && <Vide>Aucune recharge.</Vide>}
                  {recharges.map((r, i) => (
                    <button key={r.id} onClick={() => setRecharge(r)} className="w-full text-left flex items-center gap-4 px-5 py-4 hover:opacity-80"
                            style={{ borderBottom: i < recharges.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white"
                           style={{ background: r.operateur === 'MTN' ? '#CA8A04' : '#EA580C' }}>{r.operateur === 'MTN' ? 'MTN' : 'OM'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm" style={{ color: c.textPrimary }}>{r.chauffeurNom}</div>
                        <div className="text-xs" style={{ color: c.textSecondary }}>{formatDate(r.createdAt)} · réf. {r.referenceTransaction || '—'}</div>
                      </div>
                      <div className="text-sm font-black" style={{ color: c.textPrimary }}>{formatFcfa(r.montant)}</div>
                      <Badge statut={r.statut} />
                    </button>
                  ))}
                </Carte>
              </>
            )}

            {onglet === 'transactions' && (
              <Carte className="overflow-hidden">
                {d.transactions.length === 0 && <Vide>Aucune transaction.</Vide>}
                {d.transactions.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3"
                       style={{ borderBottom: i < d.transactions.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: c.textPrimary }}>
                        {t.type === 'RECHARGE' ? 'Recharge' : `Commission course #${t.courseId}`}
                      </div>
                      <div className="text-xs" style={{ color: c.textSecondary }}>{t.chauffeurNom} · {formatDate(t.createdAt)}</div>
                    </div>
                    <div className="text-sm font-black" style={{ color: t.type === 'RECHARGE' ? '#16A34A' : '#DC2626' }}>
                      {t.type === 'RECHARGE' ? '+' : '−'}{formatFcfa(t.montant)}
                    </div>
                  </div>
                ))}
              </Carte>
            )}

            {onglet === 'soldes' && (
              <Carte className="overflow-hidden">
                {d.portefeuilles.length === 0 && <Vide>Aucun portefeuille.</Vide>}
                {d.portefeuilles.map((p, i) => {
                  const etat = etatSolde(p.solde)
                  return (
                    <button key={p.id} onClick={() => setChauffeurSel(p)} className="w-full text-left flex items-center gap-4 px-5 py-4 hover:opacity-80"
                            style={{ borderBottom: i < d.portefeuilles.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                      <div className="flex-1 font-bold text-sm" style={{ color: c.textPrimary }}>{p.chauffeurNom}</div>
                      <div className="text-sm font-black" style={{ color: c.textPrimary }}>{formatFcfa(p.solde)}</div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: couleurEtat[etat][0], color: couleurEtat[etat][1] }}>{etat}</span>
                    </button>
                  )
                })}
                <div className="px-5 py-3 text-xs" style={{ color: c.textSecondary }}>
                  Solde minimum pour accepter une course : {formatFcfa(d.seuil)} (modifiable dans Paramètres)
                </div>
              </Carte>
            )}
          </>
        )}
      </PageAdmin>

      {recharge && <DetailRecharge recharge={recharge} onFermer={() => setRecharge(null)} onChange={recharger} />}
      {chauffeurSel && d && (
        <Modal titre={`Transactions — ${chauffeurSel.chauffeurNom}`} onFermer={() => setChauffeurSel(null)}>
          <div className="flex flex-col gap-2">
            <Ligne label="Solde actuel" valeur={formatFcfa(chauffeurSel.solde)} />
            {d.transactions.filter(t => t.chauffeurId === chauffeurSel.chauffeurId).map(t => (
              <div key={t.id} className="flex justify-between text-sm py-2" style={{ borderBottom: `1px solid ${c.border}`, color: c.textPrimary }}>
                <span>{t.type === 'RECHARGE' ? 'Recharge' : `Commission #${t.courseId}`} · {formatDate(t.createdAt)}</span>
                <span className="font-bold" style={{ color: t.type === 'RECHARGE' ? '#16A34A' : '#DC2626' }}>
                  {t.type === 'RECHARGE' ? '+' : '−'}{formatFcfa(t.montant)}
                </span>
              </div>
            ))}
            {d.transactions.every(t => t.chauffeurId !== chauffeurSel.chauffeurId) && <Vide>Aucune transaction récente.</Vide>}
          </div>
        </Modal>
      )}
    </LayoutAdmin>
  )
}

const DetailRecharge = ({ recharge, onFermer, onChange }) => {
  const [statut, setStatut] = useState(recharge.statut)
  const [rejet, setRejet] = useState(null)
  const action = useAction()
  const traiter = async (type) => {
    const r = await action.executer(() => apiCall(`/api/paiements/admin/recharges/${recharge.id}/${type}`, {
      method: 'PUT', ...(type === 'rejeter' && { body: JSON.stringify({ raison: rejet }) }),
    }), type === 'confirmer' ? 'Recharge validée : le portefeuille a été crédité' : 'Recharge rejetée')
    if (r !== undefined) { setStatut(type === 'confirmer' ? 'VALIDEE' : 'REJETEE'); setRejet(null); onChange() }
  }
  return (
    <Modal titre={`Recharge #${recharge.id}`} onFermer={onFermer}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end"><Badge statut={statut} /></div>
        <div className="grid grid-cols-2 gap-4">
          <Ligne label="Chauffeur" valeur={recharge.chauffeurNom} />
          <Ligne label="Montant" valeur={formatFcfa(recharge.montant)} />
          <Ligne label="Opérateur" valeur={recharge.operateur} />
          <Ligne label="Téléphone" valeur={recharge.telephone} />
          <Ligne label="Référence" valeur={recharge.referenceTransaction} />
          <Ligne label="Code CT Pay" valeur={recharge.payToken} />
          <Ligne label="Demandée le" valeur={formatDate(recharge.createdAt)} />
          {recharge.raisonRejet && <Ligne label="Motif du rejet" valeur={recharge.raisonRejet} />}
        </div>
        <Message type={action.message?.type}>{action.message?.texte}</Message>
        {statut === 'EN_ATTENTE' && (
          <>
            <p className="text-xs" style={{ color: '#A16207' }}>
              Normalement, CT Pay confirme automatiquement. Ne validez manuellement qu'après avoir vérifié la réception du paiement.
            </p>
            {rejet === null ? (
              <div className="flex gap-2">
                <Bouton variante="danger" className="flex-1" onClick={() => setRejet('')}>Rejeter</Bouton>
                <Bouton variante="succes" className="flex-1" disabled={action.enCours} onClick={() => traiter('confirmer')}>Valider manuellement</Bouton>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Champ label="Motif du rejet" value={rejet} onChange={e => setRejet(e.target.value)} />
                <div className="flex gap-2">
                  <Bouton variante="contour" className="flex-1" onClick={() => setRejet(null)}>Annuler</Bouton>
                  <Bouton variante="danger" className="flex-1" disabled={action.enCours} onClick={() => traiter('rejeter')}>Confirmer le rejet</Bouton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default Paiements
