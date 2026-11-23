import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticlesFlottantes from '../../components/layout/ParticlesFlottantes'
import { apiCall } from '../../utils/api'

const MotDePasseOublie = () => {
  const [etape, setEtape] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const navigate = useNavigate()

  const force = (mdp) => {
    let score = 0
    if (mdp.length >= 8) score++
    if (/[A-Z]/.test(mdp)) score++
    if (/[0-9]/.test(mdp)) score++
    if (/[^A-Za-z0-9]/.test(mdp)) score++
    return score
  }

  const handleVerifierCode = () => {
  setErreur('')
  if (code.length !== 6) {
    setErreur('Le code doit contenir 6 chiffres')
    return
  }

  setEtape(3)
}

  const forceMdp = force(motDePasse)
  const couleurs = ['', '#DC2626', '#EA580C', '#EAB308', '#16A34A']
  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Excellent']
  const handleEnvoyerCode = async () => {
  setErreur('')
  if (!email) {
    setErreur('Veuillez saisir votre email')
    return
  }

  setChargement(true)
  try {
    await apiCall('/api/auth/mot-de-passe/reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    setEtape(2)
  } catch (err) {
    setErreur(err.message)
  } finally {
    setChargement(false)
  }
}

  const handleReinitialiser = async () => {
    setErreur('')

    if (motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (motDePasse !== confirmation) {
      setErreur('Les mots de passe ne correspondent pas')
      return
    }

    setChargement(true)
    try {
      await apiCall('/api/auth/mot-de-passe/nouveau', {
        method: 'POST',
        body: JSON.stringify({ email, code, nouveauMotDePasse: motDePasse }),
      })
      navigate('/')
    } catch (err) {
      setErreur(err.message)
    } finally {
      setChargement(false)
    }
  }

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
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header bleu */}
        <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #0B1F4A, #1A3A6B)' }}>
          <div className="text-xl font-black text-white mb-1 tracking-tight">
            School<span className="text-orange-500">Driva</span>
          </div>
          <p className="text-white/50 text-xs">Réinitialisation du mot de passe</p>

          {/* Barre de progression */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{ background: i <= etape ? '#EA580C' : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {['Email', 'Code', 'Nouveau mot de passe'].map((label, i) => (
              <span
                key={i}
                className="text-xs font-semibold transition-all"
                style={{ color: i + 1 <= etape ? '#F97316' : 'rgba(255,255,255,0.3)' }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Corps */}
        <div className="px-8 py-7">

          {/* Étape 1 — Email */}
          {etape === 1 && (
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="text-lg font-black text-gray-900 text-center mb-1">Mot de passe oublié ?</h2>
              <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                Saisissez votre adresse email. Nous vous enverrons un code de vérification.
              </p>
              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all"
                />
              </div>
              {erreur && <p className="text-xs text-red-600 mb-3 text-center">{erreur}</p>}
<button
  onClick={handleEnvoyerCode}
  disabled={chargement}
  className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg text-sm hover:bg-orange-700 transition-all mb-3 disabled:opacity-50"
>
  {chargement ? 'Envoi...' : 'Envoyer le code'}
</button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all"
              >
                ← Retour à la connexion
              </button>
            </>
          )}

          {/* Étape 2 — Code */}
          {etape === 2 && (
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 className="text-lg font-black text-gray-900 text-center mb-1">Vérifiez votre email</h2>
              <p className="text-sm text-gray-500 text-center mb-1 leading-relaxed">
                Nous avons envoyé un code à
              </p>

              <p className="text-sm font-bold text-blue-600 text-center mb-6">{email}</p>

              {/* Champ code */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Code de vérification</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all font-mono text-center text-xl tracking-widest"
                />
              </div>

             {erreur && <p className="text-xs text-red-600 mb-3 text-center">{erreur}</p>}
<button
  onClick={handleVerifierCode}
  className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg text-sm hover:bg-orange-700 transition-all mb-3"
>
  Vérifier le code
</button>
              <p className="text-center text-xs text-gray-500">
                Vous n'avez pas reçu le code ?{' '}
                <span className="text-orange-600 font-semibold cursor-pointer hover:underline">
                  Renvoyer
                </span>
              </p>
              <button
                onClick={() => setEtape(1)}
                className="w-full mt-3 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all"
              >
                ← Retour
              </button>
            </>
          )}

          {/* Étape 3 — Nouveau mot de passe */}
          {etape === 3 && (
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h2 className="text-lg font-black text-gray-900 text-center mb-1">Nouveau mot de passe</h2>
              <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                Choisissez un mot de passe fort d'au moins 8 caractères.
              </p>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={motDePasse}
                  onChange={e => setMotDePasse(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all"
                />
                {motDePasse && (
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

              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmation}
                  onChange={e => setConfirmation(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all"
                />
                {confirmation && motDePasse !== confirmation && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Les mots de passe ne correspondent pas</p>
                )}
                {confirmation && motDePasse === confirmation && (
                  <p className="text-xs text-green-600 mt-1 font-semibold">Les mots de passe correspondent ✓</p>
                )}
              </div>

              {erreur && <p className="text-xs text-red-600 mb-3 text-center">{erreur}</p>}
<button
  onClick={handleReinitialiser}
  disabled={chargement}
  className="w-full py-3 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 transition-all mb-3 disabled:opacity-50"
>
  {chargement ? 'Réinitialisation...' : '✓ Réinitialiser le mot de passe'}
</button>
              <button
                onClick={() => setEtape(2)}
                className="w-full py-3 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all"
              >
                ← Retour
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default MotDePasseOublie