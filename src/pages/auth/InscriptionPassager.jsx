
import { useNavigate } from 'react-router-dom'
import ParticlesFlottantes from '../../components/layout/ParticlesFlottantes'
import { useState, useEffect } from 'react'
import { apiCall } from '../../utils/api'

const InscriptionPassager = () => {


const [villes, setVilles] = useState([])
const [erreur, setErreur] = useState('')
const [chargement, setChargement] = useState(false)
const [cguAcceptees, setCguAcceptees] = useState(false)

useEffect(() => {
  apiCall('/api/villes')
    .then(setVilles)
    .catch(() => setErreur('Impossible de charger les villes'))
}, [])


 const [form, setForm] = useState({
  nom: '', prenom: '', email: '', telephone: '', villeId: '', motDePasse: '', confirmationMotDePasse: ''
})
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const force = (mdp) => {
    let score = 0
    if (mdp.length >= 8) score++
    if (/[A-Z]/.test(mdp)) score++
    if (/[0-9]/.test(mdp)) score++
    if (/[^A-Za-z0-9]/.test(mdp)) score++
    return score
  }
 const [succes, setSucces] = useState(false)

const handleInscription = async () => {
  setErreur('')

  if (!form.nom || !form.prenom || !form.email || !form.telephone || !form.villeId || !form.motDePasse || !form.confirmationMotDePasse) {
    setErreur('Veuillez remplir tous les champs')
    return
  }

  if (form.motDePasse !== form.confirmationMotDePasse) {
    setErreur('Les mots de passe ne correspondent pas')
    return
  }

  if (!cguAcceptees) {
    setErreur('Veuillez accepter les conditions générales')
    return
  }


  

  setChargement(true)
  try {
    await apiCall('/api/auth/passager/inscription', {
      method: 'POST',
      body: JSON.stringify({
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        villeId: Number(form.villeId),
        motDePasse: form.motDePasse,
      }),
    })

    setSucces(true)
    setTimeout(() => navigate('/'), 2000)

  } catch (err) {
    setErreur(err.message)
  } finally {
    setChargement(false)
  }
}


  const forceMdp = force(form.motDePasse)
  const couleurs = ['', '#DC2626', '#EA580C', '#EAB308', '#16A34A']
  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Excellent']

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">

      {/* Fond */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/tacko.jpg')" }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(11,31,74,0.92) 0%, rgba(11,18,32,0.88) 100%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      </div>

      <ParticlesFlottantes />

      {/* Carte */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex">

        {/* Gauche sombre */}
        <div
          className="hidden md:flex w-2/5 flex-col p-10"
          style={{ background: 'linear-gradient(160deg, rgba(26,58,107,0.97) 0%, rgba(11,31,74,0.99) 100%)' }}
        >
          <div className="text-xl font-black text-white mb-8 tracking-tight">
            School<span className="text-orange-500">Driva</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6 flex flex-col items-center justify-center text-center">
              <svg width="80" height="80" viewBox="0 0 90 80" fill="none">
                <circle cx="45" cy="32" r="20" fill="rgba(37,99,235,.18)" stroke="rgba(37,99,235,.3)" strokeWidth="1.5"/>
                <circle cx="45" cy="26" r="8" fill="rgba(255,255,255,.25)"/>
                <path d="M28 50 Q45 42 62 50" stroke="rgba(255,255,255,.25)" strokeWidth="2" fill="none"/>
                <rect x="8" y="58" width="34" height="16" rx="5" fill="rgba(37,99,235,.3)" stroke="rgba(37,99,235,.5)" strokeWidth="1"/>
                <text x="25" y="70" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="8" fontWeight="700" fill="rgba(255,255,255,.7)">Passager</text>
              </svg>
              <p className="text-white/50 text-xs mt-4 font-semibold">Espace Passager</p>
            </div>
            <p className="text-white/50 text-xs italic text-center leading-relaxed">
              "Inscription gratuite en moins d'une minute. Commencez a reserver des courses immediatement."
            </p>
          </div>
        </div>

        {/* Droite blanche */}
        <div className="flex-1 p-8 overflow-y-auto max-h-screen">
          <h2 className="text-xl font-black text-gray-900 mb-1">Creer mon compte</h2>
          <p className="text-sm text-gray-500 mb-6">
            Deja inscrit ?{' '}
            <span onClick={() => navigate('/')} className="text-orange-600 font-semibold cursor-pointer hover:underline">
              Se connecter
            </span>
          </p>

          {/* Nom + Prenom */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Nom <span className="text-orange-600">*</span></label>
              <input name="nom" value={form.nom} onChange={handleChange} placeholder="DUPONT" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Prenom <span className="text-orange-600">*</span></label>
              <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Jean" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
            </div>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Email <span className="text-orange-600">*</span></label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jean.dupont@gmail.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
          </div>

          {/* Telephone */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Telephone <span className="text-orange-600">*</span></label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect width="6" height="12" fill="#007A5E"/><rect x="6" width="6" height="12" fill="#CE1126"/><rect x="12" width="6" height="12" fill="#FCD116"/></svg>
                +237
              </div>
              <input name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="6XX XXX XXX" className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
            </div>
          </div>

          {/* Ville */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Ville <span className="text-orange-600">*</span></label>
           <select name="villeId" value={form.villeId} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all cursor-pointer">
  <option value="">Selectionner votre ville...</option>
  {villes.map(v => (
    <option key={v.id} value={v.id}>{v.nom}</option>
  ))}
</select>
          </div>

          {/* Mot de passe */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Mot de passe <span className="text-orange-600">*</span></label>
            <input name="motDePasse" type="password" value={form.motDePasse} onChange={handleChange} placeholder="Minimum 8 caracteres" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
            {form.motDePasse && (
              <div className="mt-2">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${forceMdp * 25}%`, background: couleurs[forceMdp] }}
                  />
                </div>
                <p className="text-xs mt-1 font-semibold" style={{ color: couleurs[forceMdp] }}>
                  {labels[forceMdp]}
                </p>
              </div>
            )}
          </div>
          <div className="mb-4">
  <label className="text-xs font-semibold text-gray-700 mb-1 block">
    Confirmer le mot de passe <span className="text-orange-600">*</span>
  </label>
  <input
    name="confirmationMotDePasse"
    type="password"
    value={form.confirmationMotDePasse}
    onChange={handleChange}
    placeholder="Retapez votre mot de passe"
    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all"
  />
  {form.confirmationMotDePasse && form.motDePasse !== form.confirmationMotDePasse && (
    <p className="text-xs text-red-600 mt-1">Les mots de passe ne correspondent pas</p>
  )}
</div>

          {/* CGU */}
          <div className="flex items-start gap-2 mb-5">
            <input
  type="checkbox"
  id="cgu"
  checked={cguAcceptees}
  onChange={(e) => setCguAcceptees(e.target.checked)}
  className="mt-1 cursor-pointer accent-blue-500"
/>
            <label htmlFor="cgu" className="text-xs text-gray-600 cursor-pointer leading-relaxed">
              En m'inscrivant, j'accepte les <span className="text-orange-600 font-semibold">conditions generales</span> de School Driva.
            </label>
          </div>
{succes && (
  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
    <p className="text-sm text-green-700 font-semibold text-center">
      Compte créé avec succès ! Redirection...
    </p>
  </div>
)}
          {/* Bouton */}
         {erreur && <p className="text-xs text-red-600 mb-3 text-center">{erreur}</p>}
<button
  onClick={handleInscription}
  disabled={chargement}
  className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
>
  {chargement ? 'Création...' : 'Creer mon compte'}
</button>
          <p className="text-center text-sm text-gray-500 mt-3">
            Deja inscrit ?{' '}
            <span onClick={() => navigate('/')} className="text-orange-600 font-semibold cursor-pointer hover:underline">
              Se connecter
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default InscriptionPassager