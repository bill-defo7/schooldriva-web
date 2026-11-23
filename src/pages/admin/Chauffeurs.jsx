import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LayoutAdmin from '../../components/layout/LayoutAdmin'
import { apiCall, ouvrirFichierProtege, formatFcfa, formatDate } from '../../utils/api'
import {
  useCouleurs, useDonnees, useAction, PageAdmin, Carte, Stat, Badge, Bouton, Modal,
  Filtres, Recherche, Champ, Message, Vide, Ligne,
} from '../../components/admin/ui'

const LIBELLES_DOCS = {
  CNI_RECTO: 'CNI recto', CNI_VERSO: 'CNI verso', SELFIE_CNI: 'Selfie avec CNI', PERMIS: 'Permis de conduire',
  PLAN_DOMICILE: 'Plan de domicile', CARTE_GRISE: 'Carte grise', ASSURANCE: 'Assurance véhicule',
  VISITE_TECHNIQUE: 'Visite technique', PHOTOS_VEHICULE: 'Photos du véhicule', CNI_GARANT: 'CNI du garant',
  CONTACTS_GARANT: 'Contacts du garant',
}
const OBLIGATOIRES = ['CNI_RECTO', 'CNI_VERSO', 'PERMIS', 'CARTE_GRISE']
const FILTRES = { Tous: null, Actifs: 'ACTIF', 'En attente': 'EN_ATTENTE', Bloqués: 'BLOQUE' }

const Chauffeurs = () => {
  const c = useCouleurs()
  const [filtre, setFiltre] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState(null)

  const { donnees, erreur, chargement, recharger } = useDonnees(async () => {
    const [chauffeurs, portefeuilles] = await Promise.all([
      apiCall('/api/chauffeurs/admin/liste'),
      apiCall('/api/paiements/admin/portefeuilles').catch(() => []),
    ])
    const soldes = Object.fromEntries(portefeuilles.map(p => [p.chauffeurId, p.solde]))
    return chauffeurs.map(ch => ({ ...ch, solde: soldes[ch.id] ?? 0 }))
  })
  const liste = useMemo(() => donnees || [], [donnees])

  const filtres = liste.filter(ch => {
    const statut = FILTRES[filtre]
    const q = recherche.toLowerCase()
    return (!statut || ch.statut === statut) && (!q
      || `${ch.prenom} ${ch.nom}`.toLowerCase().includes(q)
      || (ch.telephone || '').includes(q) || (ch.immatriculation || '').toLowerCase().includes(q)
      || (ch.email || '').toLowerCase().includes(q))
  })

  const compte = (s) => liste.filter(ch => ch.statut === s).length

  return (
    <LayoutAdmin>
      <PageAdmin titre="Chauffeurs" sousTitre={`${liste.length} chauffeur(s) enregistré(s)`}
                 actions={<Bouton variante="contour" onClick={recharger}>Actualiser</Bouton>}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total" valeur={liste.length} couleur="#2563EB" />
          <Stat label="Actifs" valeur={compte('ACTIF')} couleur="#16A34A" sous={`${liste.filter(x => x.enLigne).length} en ligne`} />
          <Stat label="En attente" valeur={compte('EN_ATTENTE')} couleur="#CA8A04" />
          <Stat label="Bloqués" valeur={compte('BLOQUE')} couleur="#DC2626" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Filtres options={Object.keys(FILTRES)} actif={filtre} onChange={setFiltre} />
          <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom, téléphone, email, immatriculation..." />
        </div>

        <Message>{erreur}</Message>
        <Carte className="overflow-hidden">
          {chargement && !donnees && <Vide>Chargement...</Vide>}
          {!chargement && filtres.length === 0 && <Vide>Aucun chauffeur ne correspond.</Vide>}
          {filtres.map((ch, i) => (
            <button key={ch.id} onClick={() => setSelection(ch)}
                    className="w-full text-left flex items-center gap-4 px-5 py-4 hover:opacity-80 transition-all"
                    style={{ borderBottom: i < filtres.length - 1 ? `1px solid ${c.border}` : 'none' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ background: '#7C2D12' }}>
                {ch.prenom?.[0]}{ch.nom?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm truncate" style={{ color: c.textPrimary }}>{ch.prenom} {ch.nom}</span>
                  {ch.enLigne && <span className="w-2 h-2 rounded-full bg-green-500" title="En ligne" />}
                </div>
                <div className="text-xs truncate" style={{ color: c.textSecondary }}>
                  {[ch.marque, ch.modele].filter(Boolean).join(' ') || 'Véhicule'} · {ch.immatriculation || '—'} · {ch.typeVehicule === 'MOTO' ? 'Moto' : 'Voiture'}
                </div>
                <div className="text-xs" style={{ color: c.textSecondary }}>{ch.telephone} · {ch.villeNom || 'Ville non renseignée'}</div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-center">
                <div><div className="text-sm font-black" style={{ color: '#EA580C' }}>{ch.nbCourses ?? 0}</div><div className="text-xs" style={{ color: c.textSecondary }}>courses</div></div>
                <div><div className="text-sm font-black" style={{ color: '#EAB308' }}>{Number(ch.noteMoyenne || 0).toFixed(1)}</div><div className="text-xs" style={{ color: c.textSecondary }}>note</div></div>
                <div>
                  <div className="text-sm font-black" style={{ color: ch.docsRejetes > 0 ? '#DC2626' : ch.docsEnAttente > 0 ? '#CA8A04' : '#16A34A' }}>
                    {ch.docsValides}/{ch.docsValides + ch.docsEnAttente + ch.docsRejetes}
                  </div>
                  <div className="text-xs" style={{ color: c.textSecondary }}>docs validés</div>
                </div>
              </div>
              <Badge statut={ch.statut} />
            </button>
          ))}
        </Carte>
      </PageAdmin>

      {selection && (
        <FicheChauffeur chauffeur={selection} onFermer={() => setSelection(null)}
                        onChange={async () => { await recharger() }} />
      )}
    </LayoutAdmin>
  )
}

const FicheChauffeur = ({ chauffeur, onFermer, onChange }) => {
  const c = useCouleurs()
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState(chauffeur.statut === 'EN_ATTENTE' ? 'documents' : 'infos')
  const [statut, setStatut] = useState(chauffeur.statut)
  const [rejet, setRejet] = useState(null) // { id, raison }
  const [message, setMessageForm] = useState(null) // { sujet, texte }
  const action = useAction()

  const docs = useDonnees(() => apiCall(`/api/chauffeur/documents/${chauffeur.id}`), [chauffeur.id])
  const parType = Object.fromEntries((docs.donnees || []).map(d => [d.type, d]))
  const obligatoiresOk = OBLIGATOIRES.every(t => parType[t]?.statut === 'VALIDE')

  const agir = async (url, succes, nouveauStatut) => {
    const r = await action.executer(() => apiCall(url, { method: 'PUT' }), succes)
    if (r !== undefined) {
      if (nouveauStatut) setStatut(nouveauStatut)
      onChange()
    }
    return r
  }

  const validerDossier = async () => {
    const r = await action.executer(
      () => apiCall(`/api/auth/admin/chauffeurs/${chauffeur.id}/valider`, { method: 'PUT' }),
      (res) => res.emailEnvoye
        ? 'Dossier validé. Les identifiants ont été envoyés par email au chauffeur.'
        : `Dossier validé, mais l'email n'a pas pu partir. Transmettez ce mot de passe temporaire au chauffeur : ${res.motDePasseTemporaire}`)
    if (r !== undefined) { setStatut('ACTIF'); onChange() }
  }

  const docAction = async (id, type, corps) => {
    const r = await action.executer(() => apiCall(`/api/chauffeur/documents/admin/${id}/${type}`, {
      method: 'PUT', ...(corps && { body: JSON.stringify(corps) }),
    }), type === 'valider' ? 'Document validé' : 'Document rejeté')
    if (r !== undefined) { setRejet(null); docs.recharger(); onChange() }
  }

  const envoyerMessage = async () => {
    const r = await action.executer(() => apiCall(`/api/admin/chauffeurs/${chauffeur.id}/message`, {
      method: 'POST', body: JSON.stringify(message),
    }), (res) => res.emailEnvoye ? 'Message envoyé par email' : "Email non configuré : le message n'a pas pu partir")
    if (r !== undefined) setMessageForm(null)
  }

  return (
    <Modal titre={`${chauffeur.prenom} ${chauffeur.nom}`} couleur="#7C2D12" onFermer={onFermer} large>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs" style={{ color: c.textSecondary }}>Inscrit le {formatDate(chauffeur.createdAt, false)}</span>
        <Badge statut={statut} />
      </div>
      <div className="flex mb-5" style={{ borderBottom: `1px solid ${c.border}` }}>
        {[['infos', 'Informations'], ['documents', 'Documents'], ['actions', 'Actions']].map(([id, label]) => (
          <button key={id} onClick={() => setOnglet(id)} className="flex-1 py-3 text-xs font-bold"
                  style={{ color: onglet === id ? '#EA580C' : c.textSecondary, borderBottom: onglet === id ? '2px solid #EA580C' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4"><Message type={action.message?.type}>{action.message?.texte}</Message></div>

      {onglet === 'infos' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Ligne label="Email" valeur={chauffeur.email} />
            <Ligne label="Téléphone" valeur={chauffeur.telephone} />
            <Ligne label="Ville" valeur={chauffeur.villeNom} />
            <Ligne label="Type" valeur={chauffeur.typeVehicule === 'MOTO' ? 'Moto' : 'Voiture'} />
            <Ligne label="Véhicule" valeur={[chauffeur.marque, chauffeur.modele, chauffeur.couleur].filter(Boolean).join(' · ')} />
            <Ligne label="Immatriculation" valeur={chauffeur.immatriculation} />
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl" style={{ background: c.subtleBg }}>
            <div className="text-center"><div className="text-xl font-black" style={{ color: '#EA580C' }}>{chauffeur.nbCourses ?? 0}</div><div className="text-xs" style={{ color: c.textSecondary }}>Courses</div></div>
            <div className="text-center"><div className="text-xl font-black" style={{ color: '#EAB308' }}>{Number(chauffeur.noteMoyenne || 0).toFixed(1)}</div><div className="text-xs" style={{ color: c.textSecondary }}>Note</div></div>
            <div className="text-center"><div className="text-xl font-black" style={{ color: '#16A34A' }}>{formatFcfa(chauffeur.solde)}</div><div className="text-xs" style={{ color: c.textSecondary }}>Solde</div></div>
          </div>
        </div>
      )}

      {onglet === 'documents' && (
        <div className="flex flex-col gap-2">
          {docs.chargement && <Vide>Chargement des documents...</Vide>}
          <Message>{docs.erreur}</Message>
          {!docs.chargement && Object.keys(LIBELLES_DOCS).map(type => {
            const d = parType[type]
            return (
              <div key={type} className="p-3 rounded-xl flex flex-col gap-2" style={{ background: c.subtleBg }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm" style={{ color: c.textPrimary }}>
                    {LIBELLES_DOCS[type]}{OBLIGATOIRES.includes(type) && <span style={{ color: '#DC2626' }}> *</span>}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge statut={d ? d.statut : 'MANQUANT'} />
                    {d && <Bouton variante="contour" className="!px-2 !py-1 text-xs"
                                  onClick={() => ouvrirFichierProtege(`/api/chauffeur/documents/admin/${d.id}/fichier`)
                                    .catch(e => action.setMessage({ type: 'erreur', texte: e.message }))}>Voir</Bouton>}
                    {d && d.statut !== 'VALIDE' && <Bouton variante="succes" className="!px-2 !py-1 text-xs" disabled={action.enCours}
                                                           onClick={() => docAction(d.id, 'valider')}>Valider</Bouton>}
                    {d && d.statut !== 'REJETE' && <Bouton variante="danger" className="!px-2 !py-1 text-xs" disabled={action.enCours}
                                                           onClick={() => setRejet({ id: d.id, raison: '' })}>Rejeter</Bouton>}
                  </div>
                </div>
                {d?.raisonRejet && <div className="text-xs" style={{ color: '#DC2626' }}>Motif : {d.raisonRejet}</div>}
                {rejet?.id === d?.id && d && (
                  <div className="flex gap-2">
                    <input autoFocus value={rejet.raison} onChange={e => setRejet({ ...rejet, raison: e.target.value })}
                           placeholder="Motif du rejet (visible par le chauffeur)" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                           style={{ background: c.cardBg, border: `1px solid ${c.border}`, color: c.textPrimary }} />
                    <Bouton variante="danger" disabled={!rejet.raison.trim() || action.enCours}
                            onClick={() => docAction(d.id, 'rejeter', { raison: rejet.raison.trim() })}>OK</Bouton>
                  </div>
                )}
              </div>
            )
          })}
          <p className="text-xs mt-2" style={{ color: c.textSecondary }}>* Obligatoires pour valider le dossier.</p>
        </div>
      )}

      {onglet === 'actions' && (
        <div className="flex flex-col gap-3">
          {statut === 'EN_ATTENTE' && (
            <>
              <Bouton variante="succes" className="w-full py-3" disabled={!obligatoiresOk || action.enCours} onClick={validerDossier}>
                Valider le dossier et activer le compte
              </Bouton>
              {!obligatoiresOk && <p className="text-xs" style={{ color: '#CA8A04' }}>Validez d'abord la CNI (recto et verso), le permis et la carte grise.</p>}
            </>
          )}
          {statut === 'ACTIF' && (
            <Bouton variante="danger" className="w-full py-3" disabled={action.enCours}
                    onClick={() => agir(`/api/auth/admin/chauffeurs/${chauffeur.id}/bloquer`, 'Chauffeur bloqué', 'BLOQUE')}>
              Bloquer ce chauffeur
            </Bouton>
          )}
          {statut === 'BLOQUE' && (
            <Bouton variante="succes" className="w-full py-3" disabled={action.enCours}
                    onClick={() => agir(`/api/auth/admin/chauffeurs/${chauffeur.id}/debloquer`, 'Chauffeur débloqué', 'ACTIF')}>
              Débloquer ce chauffeur
            </Bouton>
          )}
          {message === null ? (
            <Bouton variante="contour" className="w-full py-3" onClick={() => setMessageForm({ sujet: '', texte: '' })}>
              Envoyer un message
            </Bouton>
          ) : (
            <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: c.subtleBg }}>
              <Champ label="Sujet" value={message.sujet} onChange={e => setMessageForm({ ...message, sujet: e.target.value })} />
              <Champ label="Message" multiline value={message.texte} onChange={e => setMessageForm({ ...message, texte: e.target.value })} />
              <div className="flex gap-2 justify-end">
                <Bouton variante="contour" onClick={() => setMessageForm(null)}>Annuler</Bouton>
                <Bouton variante="orange" disabled={!message.sujet.trim() || !message.texte.trim() || action.enCours} onClick={envoyerMessage}>Envoyer</Bouton>
              </div>
            </div>
          )}
          <Bouton variante="contour" className="w-full py-3" onClick={() => navigate(`/admin/courses?chauffeurId=${chauffeur.id}`)}>
            Voir l'historique des courses
          </Bouton>
        </div>
      )}
    </Modal>
  )
}

export default Chauffeurs
