import { useState } from 'react'
import LayoutAdmin from '../../components/layout/LayoutAdmin'
import { apiCall, formatDate } from '../../utils/api'
import { EMAIL_SUPPORT } from '../../config/api'
import {
  useCouleurs, useDonnees, useAction, PageAdmin, Carte, Badge, Bouton, Modal, Message, Vide, Champ,
} from '../../components/admin/ui'

// Libellés et unités des paramètres modifiables (les bornes sont vérifiées côté serveur)
const PARAMETRES = {
  COMMISSION_POURCENTAGE: { label: 'Taux de commission', unite: '%', aide: 'Prélevé sur chaque course, déduit du portefeuille du chauffeur.' },
  TARIF_VOITURE_KM: { label: 'Tarif voiture', unite: 'FCFA / km' },
  TARIF_MOTO_KM: { label: 'Tarif moto', unite: 'FCFA / km' },
  PRIX_MINIMUM: { label: 'Prix minimum d’une course', unite: 'FCFA' },
  SOLDE_MINIMUM_CHAUFFEUR: { label: 'Solde minimum chauffeur', unite: 'FCFA', aide: 'En dessous, le chauffeur ne peut plus accepter de course.' },
  DELAI_RECHERCHE_MIN: { label: 'Annulation auto sans chauffeur', unite: 'minutes' },
  DISTANCE_MAX_KM: { label: 'Distance maximale d’une course', unite: 'km' },
  TIMER_COURSE: { label: 'Temps pour accepter une demande', unite: 'secondes' },
  RAYON_DESSERTE_KM: { label: 'Rayon de desserte autour de chaque ville', unite: 'km' },
  ITINERAIRE_PREFERENCE: { label: 'Calcul des trajets', unite: '', aide: '1 = plus court (recommandé, prix au km) · 2 = plus rapide · 3 = privilégie les grands axes' },
}

const Parametres = () => (
  <LayoutAdmin>
    <PageAdmin titre="Paramètres" sousTitre="Tarifs, commission, administrateurs et points campus">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-5">
          <BlocTarifs />
          <BlocCampus />
        </div>
        <div className="flex flex-col gap-5">
          <BlocAdmins />
          <BlocJournal />
          <InfosPlateforme />
        </div>
      </div>
    </PageAdmin>
  </LayoutAdmin>
)

const Titre = ({ children, action }) => {
  const c = useCouleurs()
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${c.border}` }}>
      <h2 className="font-black" style={{ color: c.textPrimary }}>{children}</h2>
      {action}
    </div>
  )
}

const BlocTarifs = () => {
  const c = useCouleurs()
  const { donnees, erreur, recharger } = useDonnees(() => apiCall('/api/admin/parametres'))
  const [edition, setEdition] = useState(null) // { cle, valeur }
  const action = useAction()
  const sauver = async () => {
    const r = await action.executer(() => apiCall(`/api/admin/parametres/${edition.cle}`, {
      method: 'PUT', body: JSON.stringify({ valeur: edition.valeur }),
    }), 'Paramètre enregistré, appliqué immédiatement aux nouvelles courses')
    if (r !== undefined) { setEdition(null); recharger() }
  }
  return (
    <Carte>
      <Titre>Tarifs et commission</Titre>
      <div className="p-5 flex flex-col gap-3">
        <Message>{erreur}</Message>
        <Message type={action.message?.type}>{action.message?.texte}</Message>
        {(donnees || []).map(p => {
          const meta = PARAMETRES[p.cle] || { label: p.cle, unite: '' }
          const enEdition = edition?.cle === p.cle
          return (
            <div key={p.cle} className="p-3 rounded-xl" style={{ background: c.subtleBg }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold" style={{ color: c.textPrimary }}>{meta.label}</div>
                  {meta.aide && <div className="text-xs" style={{ color: c.textSecondary }}>{meta.aide}</div>}
                </div>
                {!enEdition ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black whitespace-nowrap" style={{ color: '#EA580C' }}>{p.valeur} {meta.unite}</span>
                    <Bouton variante="doux" className="!px-3 !py-1 text-xs" onClick={() => setEdition({ cle: p.cle, valeur: p.valeur })}>Modifier</Bouton>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="number" step="any" autoFocus value={edition.valeur} onChange={e => setEdition({ ...edition, valeur: e.target.value })}
                           className="w-24 px-2 py-1 rounded-lg text-sm outline-none"
                           style={{ background: c.cardBg, border: `1px solid ${c.border}`, color: c.textPrimary }} />
                    <Bouton variante="contour" className="!px-2 !py-1 text-xs" onClick={() => setEdition(null)}>Annuler</Bouton>
                    <Bouton variante="primaire" className="!px-2 !py-1 text-xs" disabled={action.enCours || edition.valeur === ''} onClick={sauver}>OK</Bouton>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Carte>
  )
}

const BlocAdmins = () => {
  const c = useCouleurs()
  const { donnees, erreur, recharger } = useDonnees(async () => {
    const [admins, moi] = await Promise.all([apiCall('/api/admin/admins'), apiCall('/api/admin/moi')])
    return { admins, moi }
  })
  const [form, setForm] = useState(null)
  const action = useAction()
  const estSuper = donnees?.moi?.role === 'SUPER_ADMIN'

  const creer = async () => {
    const r = await action.executer(() => apiCall('/api/admin/admins', { method: 'POST', body: JSON.stringify(form) }),
      res => res.emailEnvoye ? 'Administrateur créé, identifiants envoyés par email'
        : `Administrateur créé. Email non configuré : mot de passe temporaire à transmettre : ${res.motDePasseTemporaire}`)
    if (r !== undefined) { setForm(null); recharger() }
  }
  const basculer = async (a) => {
    const actif = a.statut !== 'ACTIF'
    const r = await action.executer(() => apiCall(`/api/admin/admins/${a.id}/statut?actif=${actif}`, { method: 'PUT' }),
      actif ? 'Administrateur réactivé' : 'Administrateur désactivé')
    if (r !== undefined) recharger()
  }

  return (
    <Carte>
      <Titre action={estSuper && <Bouton variante="doux" className="!px-3 !py-1 text-xs" onClick={() => setForm({ nom: '', email: '' })}>+ Ajouter</Bouton>}>
        Administrateurs
      </Titre>
      <div className="p-5 flex flex-col gap-2">
        <Message>{erreur}</Message>
        <Message type={action.message?.type}>{action.message?.texte}</Message>
        {(donnees?.admins || []).map(a => (
          <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: c.subtleBg }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: c.textPrimary }}>{a.nom}{a.id === donnees.moi.id && ' (vous)'}</div>
              <div className="text-xs truncate" style={{ color: c.textSecondary }}>{a.email}</div>
            </div>
            <Badge statut={a.role} />
            {a.statut !== 'ACTIF' && <Badge statut="BLOQUE" />}
            {estSuper && a.id !== donnees.moi.id && (
              <Bouton variante={a.statut === 'ACTIF' ? 'danger' : 'succes'} className="!px-2 !py-1 text-xs" disabled={action.enCours} onClick={() => basculer(a)}>
                {a.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver'}
              </Bouton>
            )}
          </div>
        ))}
        {!estSuper && donnees && <p className="text-xs" style={{ color: c.textSecondary }}>Seul un super administrateur peut gérer les comptes admin.</p>}
      </div>
      {form && (
        <Modal titre="Nouvel administrateur" onFermer={() => setForm(null)}>
          <div className="flex flex-col gap-3">
            <Champ label="Nom complet" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
            <Champ label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <p className="text-xs" style={{ color: c.textSecondary }}>Un mot de passe temporaire sera généré ; il devra être changé à la première connexion.</p>
            <Message type={action.message?.type}>{action.message?.type === 'erreur' && action.message.texte}</Message>
            <Bouton variante="primaire" className="w-full py-3" disabled={!form.nom.trim() || !form.email.trim() || action.enCours} onClick={creer}>Créer le compte</Bouton>
          </div>
        </Modal>
      )}
    </Carte>
  )
}

const BlocJournal = () => {
  const c = useCouleurs()
  const { donnees, erreur, recharger } = useDonnees(() => apiCall('/api/admin/journal'))
  return (
    <Carte>
      <Titre action={<Bouton variante="contour" className="!px-3 !py-1 text-xs" onClick={recharger}>Actualiser</Bouton>}>Journal d’activité</Titre>
      <div className="max-h-80 overflow-y-auto">
        <Message>{erreur}</Message>
        {donnees?.length === 0 && <Vide>Aucune action enregistrée.</Vide>}
        {(donnees || []).map((j, i) => (
          <div key={j.id} className="px-5 py-3" style={{ borderBottom: i < donnees.length - 1 ? `1px solid ${c.border}` : 'none' }}>
            <div className="text-sm" style={{ color: c.textPrimary }}>{j.action}</div>
            <div className="text-xs" style={{ color: c.textSecondary }}>{j.admin} · {formatDate(j.createdAt)}</div>
          </div>
        ))}
      </div>
    </Carte>
  )
}

const VIDE_CAMPUS = { villeId: '', nom: '', categorie: 'Université', adresse: '', lat: '', lng: '', actif: true }

const BlocCampus = () => {
  const c = useCouleurs()
  const { donnees, erreur, recharger } = useDonnees(async () => {
    const [points, villes] = await Promise.all([apiCall('/api/admin/campus'), apiCall('/api/villes')])
    return { points, villes }
  })
  const [form, setForm] = useState(null)
  const action = useAction()
  const nomVille = (id) => donnees?.villes.find(v => v.id === id)?.nom || '—'

  const enregistrer = async () => {
    const corps = { ...form, villeId: Number(form.villeId), lat: Number(form.lat), lng: Number(form.lng) }
    const r = await action.executer(() => apiCall(form.id ? `/api/admin/campus/${form.id}` : '/api/admin/campus', {
      method: form.id ? 'PUT' : 'POST', body: JSON.stringify(corps),
    }), form.id ? 'Point modifié' : 'Point ajouté')
    if (r !== undefined) { setForm(null); recharger() }
  }
  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer « ${p.nom} » ?`)) return
    const r = await action.executer(() => apiCall(`/api/admin/campus/${p.id}`, { method: 'DELETE' }), 'Point supprimé')
    if (r !== undefined) recharger()
  }
  const positionActuelle = () => navigator.geolocation?.getCurrentPosition(
    pos => setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
    () => action.setMessage({ type: 'erreur', texte: 'Position indisponible' }))

  return (
    <Carte>
      <Titre action={<Bouton variante="doux" className="!px-3 !py-1 text-xs"
                             onClick={() => setForm({ ...VIDE_CAMPUS, villeId: donnees?.villes[0]?.id || '' })}>+ Ajouter</Bouton>}>
        Points campus
      </Titre>
      <div className="p-5 flex flex-col gap-2">
        <p className="text-xs" style={{ color: c.textSecondary }}>Destinations proposées en un clic aux étudiants lors de la réservation.</p>
        <Message>{erreur}</Message>
        <Message type={action.message?.type}>{action.message?.texte}</Message>
        {donnees?.points.length === 0 && <Vide>Aucun point campus.</Vide>}
        {(donnees?.points || []).map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: c.subtleBg, opacity: p.actif ? 1 : 0.5 }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: c.textPrimary }}>🎓 {p.nom}</div>
              <div className="text-xs truncate" style={{ color: c.textSecondary }}>{p.categorie} · {nomVille(p.villeId)}{p.adresse ? ` · ${p.adresse}` : ''}</div>
            </div>
            <Bouton variante="contour" className="!px-2 !py-1 text-xs" onClick={() => setForm({ ...p })}>Modifier</Bouton>
            <Bouton variante="danger" className="!px-2 !py-1 text-xs" onClick={() => supprimer(p)}>Supprimer</Bouton>
          </div>
        ))}
      </div>
      {form && (
        <Modal titre={form.id ? 'Modifier le point campus' : 'Nouveau point campus'} onFermer={() => setForm(null)}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold" style={{ color: c.textSecondary }}>Ville</span>
              <select value={form.villeId} onChange={e => setForm({ ...form, villeId: e.target.value })} className="px-3 py-2 rounded-xl text-sm"
                      style={{ background: c.subtleBg, border: `1px solid ${c.border}`, color: c.textPrimary }}>
                {(donnees?.villes || []).map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
              </select>
            </label>
            <Champ label="Nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Université de Yaoundé I" />
            <Champ label="Catégorie" value={form.categorie || ''} onChange={e => setForm({ ...form, categorie: e.target.value })} placeholder="Université, Cité U..." />
            <Champ label="Quartier / adresse" value={form.adresse || ''} onChange={e => setForm({ ...form, adresse: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Champ label="Latitude" type="number" step="any" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} />
              <Champ label="Longitude" type="number" step="any" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} />
            </div>
            <Bouton variante="contour" onClick={positionActuelle}>📍 Utiliser ma position actuelle</Bouton>
            <label className="flex items-center gap-2 text-sm" style={{ color: c.textPrimary }}>
              <input type="checkbox" checked={form.actif !== false} onChange={e => setForm({ ...form, actif: e.target.checked })} /> Visible par les passagers
            </label>
            <Bouton variante="primaire" className="w-full py-3"
                    disabled={!form.nom.trim() || !form.villeId || form.lat === '' || form.lng === '' || action.enCours} onClick={enregistrer}>
              Enregistrer
            </Bouton>
          </div>
        </Modal>
      )}
    </Carte>
  )
}

const InfosPlateforme = () => {
  const c = useCouleurs()
  return (
    <Carte>
      <Titre>Plateforme</Titre>
      <div className="p-5 grid grid-cols-2 gap-3 text-sm" style={{ color: c.textPrimary }}>
        <div><div className="text-xs" style={{ color: c.textSecondary }}>Version</div><b>MVP v1.0</b></div>
        <div><div className="text-xs" style={{ color: c.textSecondary }}>Support</div><b>{EMAIL_SUPPORT}</b></div>
      </div>
    </Carte>
  )
}

export default Parametres
