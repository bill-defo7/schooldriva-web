import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiCall } from '../../utils/api'

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

const BADGES = {
  MANQUANT: { texte: 'Manquant', fond: '#F3F4F6', couleur: '#6B7280' },
  EN_ATTENTE: { texte: 'En vérification', fond: '#FEF3C7', couleur: '#B45309' },
  VALIDE: { texte: 'Validé', fond: '#DCFCE7', couleur: '#15803D' },
  REJETE: { texte: 'Rejeté', fond: '#FEE2E2', couleur: '#B91C1C' },
}

// Page publique : le chauffeur dont le dossier n'est pas encore validé y
// complète ses documents grâce au lien personnel (48 h) reçu par email.
const CompleterDossier = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#0B1220' }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-black text-gray-900">Compléter mon dossier chauffeur</h1>
        {token ? <Dossier token={token} /> : <DemandeLien />}
        <button onClick={() => navigate('/connexion')} className="mt-6 text-sm text-gray-500 hover:underline">
          ← Retour à la connexion
        </button>
      </div>
    </div>
  )
}

// Étape 1 : pas de lien → le chauffeur saisit son email pour le recevoir
const DemandeLien = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  const envoyer = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    try {
      const r = await apiCall('/api/chauffeur/documents/dossier/lien', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      setMessage(r.message)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setChargement(false)
    }
  }

  if (message) {
    return (
      <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: '#ECFDF5', color: '#065F46' }}>
        {message} Pensez à vérifier vos spams. Le lien est valable 48 heures.
      </div>
    )
  }

  return (
    <form onSubmit={envoyer} className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        Saisissez l’email utilisé lors de votre inscription : vous recevrez un lien personnel pour envoyer
        les documents manquants ou rejetés.
      </p>
      <input type="email" required placeholder="votre.email@exemple.com" value={email}
             onChange={e => setEmail(e.target.value)}
             className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-gray-200 focus:border-orange-500" />
      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
      <button type="submit" disabled={chargement}
              className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: '#EA580C' }}>
        {chargement ? 'Envoi...' : 'Recevoir mon lien'}
      </button>
    </form>
  )
}

// Étape 2 : lien ouvert → état du dossier et envoi des documents
const Dossier = ({ token }) => {
  const [dossier, setDossier] = useState(null)
  const [erreur, setErreur] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(null)
  const [messages, setMessages] = useState({})

  const charger = useCallback(() =>
    apiCall('/api/chauffeur/documents/dossier', { headers: { 'X-Upload-Token': token } })
      .then(setDossier)
      .catch(e => setErreur(e.message)), [token])

  useEffect(() => { charger() }, [charger])

  const envoyer = async (type, fichier) => {
    if (!fichier) return
    setEnvoiEnCours(type)
    setMessages(m => ({ ...m, [type]: null }))
    const formData = new FormData()
    formData.append('chauffeurId', dossier.chauffeurId)
    formData.append('type', type)
    formData.append('fichier', fichier)
    try {
      await apiCall('/api/chauffeur/documents/upload', {
        method: 'POST',
        headers: { 'X-Upload-Token': token },
        body: formData,
      })
      setMessages(m => ({ ...m, [type]: { ok: true, texte: 'Document envoyé' } }))
      await charger()
    } catch (err) {
      setMessages(m => ({ ...m, [type]: { ok: false, texte: err.message } }))
    } finally {
      setEnvoiEnCours(null)
    }
  }

  if (erreur) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{erreur}</div>
        <a href="/completer-dossier" className="text-sm font-bold" style={{ color: '#EA580C' }}>
          Demander un nouveau lien
        </a>
      </div>
    )
  }
  if (!dossier) return <p className="mt-6 text-sm text-gray-500">Chargement du dossier...</p>

  const parType = Object.fromEntries(dossier.documents.map(d => [d.type, d]))
  const obligatoiresManquants = dossier.obligatoires.filter(t => !parType[t] || parType[t].statut === 'REJETE')

  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Bonjour {dossier.prenom}, voici l’état de votre dossier. Formats acceptés : JPG, PNG ou PDF (5 Mo max).
      </p>
      {obligatoiresManquants.length > 0 ? (
        <div className="p-3 rounded-xl text-sm" style={{ background: '#FFF7ED', color: '#9A3412' }}>
          Documents obligatoires à fournir : {obligatoiresManquants
            .map(t => TYPES_DOCUMENTS.find(d => d.type === t)?.label || t).join(', ')}
        </div>
      ) : (
        <div className="p-3 rounded-xl text-sm" style={{ background: '#ECFDF5', color: '#065F46' }}>
          Tous les documents obligatoires sont envoyés. Notre équipe les vérifie : vous recevrez vos identifiants par email.
        </div>
      )}

      <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-xl">
        {TYPES_DOCUMENTS.map(({ type, label }) => {
          const doc = parType[type]
          const statut = doc ? doc.statut : 'MANQUANT'
          const badge = BADGES[statut] || BADGES.MANQUANT
          const modifiable = statut !== 'VALIDE'
          const message = messages[type]
          return (
            <div key={type} className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-gray-900">
                  {label}{dossier.obligatoires.includes(type) && <span className="text-red-500"> *</span>}
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: badge.fond, color: badge.couleur }}>
                  {badge.texte}
                </span>
              </div>
              {statut === 'REJETE' && doc.raisonRejet && (
                <p className="text-xs text-red-600">Raison du rejet : {doc.raisonRejet}</p>
              )}
              {modifiable && (
                <label className="text-xs font-semibold cursor-pointer self-start" style={{ color: '#EA580C' }}>
                  {envoiEnCours === type ? 'Envoi en cours...' : statut === 'MANQUANT' ? '+ Envoyer ce document' : '↻ Remplacer ce document'}
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" disabled={envoiEnCours !== null}
                         onChange={e => { envoyer(type, e.target.files[0]); e.target.value = '' }} />
                </label>
              )}
              {message && (
                <p className={`text-xs ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.texte}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CompleterDossier
