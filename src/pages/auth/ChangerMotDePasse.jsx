import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { apiCall } from '../../utils/api'
import { lireSession, marquerMotDePasseChange, accueilPourRole, deconnecter } from '../../utils/session'

// Écran obligatoire après connexion avec un mot de passe temporaire
// (chauffeur validé, nouvel admin). Aussi accessible depuis les profils.
const ChangerMotDePasse = () => {
  const navigate = useNavigate()
  const session = lireSession()
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  if (!session) return <Navigate to="/connexion" replace />

  const valider = async (e) => {
    e.preventDefault()
    setErreur('')
    if (nouveau.length < 8) return setErreur('Le nouveau mot de passe doit faire au moins 8 caractères')
    if (nouveau !== confirmation) return setErreur('Les deux mots de passe ne correspondent pas')
    setChargement(true)
    try {
      await apiCall('/api/auth/mot-de-passe', {
        method: 'PUT',
        body: JSON.stringify({ ancienMotDePasse: ancien, nouveauMotDePasse: nouveau }),
      })
      marquerMotDePasseChange()
      navigate(accueilPourRole(session.role), { replace: true })
    } catch (err) {
      setErreur(err.message)
    } finally {
      setChargement(false)
    }
  }

  const champ = 'w-full px-4 py-3 rounded-xl text-sm outline-none border border-gray-200 focus:border-orange-500'

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0B1220' }}>
      <form onSubmit={valider} className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-500 mt-1">
            {session.doitChangerMotDePasse
              ? 'Vous utilisez un mot de passe temporaire. Choisissez le vôtre pour continuer.'
              : 'Modifiez votre mot de passe.'}
          </p>
        </div>
        <input type="password" autoComplete="current-password" placeholder="Mot de passe actuel (temporaire)"
               value={ancien} onChange={e => setAncien(e.target.value)} className={champ} required />
        <input type="password" autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères min.)"
               value={nouveau} onChange={e => setNouveau(e.target.value)} className={champ} required />
        <input type="password" autoComplete="new-password" placeholder="Confirmer le nouveau mot de passe"
               value={confirmation} onChange={e => setConfirmation(e.target.value)} className={champ} required />
        {erreur && <p className="text-xs text-red-600">{erreur}</p>}
        <button type="submit" disabled={chargement}
                className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-60"
                style={{ background: '#EA580C' }}>
          {chargement ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {!session.doitChangerMotDePasse ? (
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-gray-500">Annuler</button>
        ) : (
          <button type="button" onClick={() => { deconnecter(); navigate('/connexion') }} className="text-sm text-gray-500">
            Se déconnecter
          </button>
        )}
      </form>
    </div>
  )
}

export default ChangerMotDePasse
