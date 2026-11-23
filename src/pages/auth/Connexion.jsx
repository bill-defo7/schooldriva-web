import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { enregistrerSession, accueilPourRole } from '../../utils/session'
import { apiCall } from '../../utils/api'
import ParticlesFlottantes from '../../components/layout/ParticlesFlottantes'

const LETTRES = 'School Driva'.split('')
const slides = [
  {
    titre: "Reservez en quelques secondes",
    texte: "Saisissez votre destination, choisissez entre voiture et moto, et obtenez une estimation du prix avant meme de confirmer.",
  },
  {
    titre: "Un chauffeur verifie arrive",
    texte: "Tous nos chauffeurs sont valides manuellement par notre equipe. Suivez leur arrivee en temps reel sur la carte.",
  },
  {
    titre: "Voyagez en toute serenite",
    texte: "Prix transparents, trajet suivi, chauffeur identifie. Vous savez exactement ce que vous payez avant de partir.",
  },
  {
    titre: "Payez comme vous voulez",
    texte: "Reglez votre course en especes, par MTN Mobile Money ou Orange Money. Directement au chauffeur, sans commission cachee.",
  },
]

const Connexion = () => {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [slideActif, setSlideActif] = useState(0)
  const navigate = useNavigate()
  const [splash, setSplash] = useState(true)
const [lettresVisibles, setLettresVisibles] = useState([])
const [sousTitre, setSousTitre] = useState(false)
const location = useLocation()
const [erreur, setErreur] = useState(
  new URLSearchParams(location.search).get('expire') ? 'Votre session a expiré, reconnectez-vous.' : ''
)
const [chargement, setChargement] = useState(false)

useEffect(() => {
  LETTRES.forEach((_, i) => {
    setTimeout(() => {
      setLettresVisibles(prev => [...prev, i])
    }, 130 * i + 250)
  })
  const last = 130 * (LETTRES.length - 1) + 250
  setTimeout(() => setSousTitre(true), last + 150)
  setTimeout(() => setSplash(false), last + 1200)
}, [])
useEffect(() => {
  if (splash) return
  const timer = setInterval(() => {
    setSlideActif(prev => (prev + 1) % slides.length)
  }, 5000)
  return () => clearInterval(timer)
}, [splash])

const handleConnexion = async () => {
  setErreur('')

  if (!email || !motDePasse) {
    setErreur('Veuillez remplir tous les champs')
    return
  }

  setChargement(true)
  try {
    const data = await apiCall('/api/auth/connexion', {
      method: 'POST',
      body: JSON.stringify({ email, motDePasse }),
    })

    enregistrerSession(data)
    // Mot de passe temporaire → changement obligatoire avant toute autre page
    if (data.doitChangerMotDePasse) navigate('/changer-mot-de-passe', { replace: true })
    else navigate(location.state?.depuis || accueilPourRole(data.role), { replace: true })

  } catch (err) {
    setErreur(err.message)
  } finally {
    setChargement(false)
  }
}
if (splash) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#0B1220' }}
    >
      <div className="flex">
        {LETTRES.map((lettre, i) => (
          <span
            key={i}
            className="text-5xl font-black tracking-tight transition-all duration-300"
            style={{
              opacity: lettresVisibles.includes(i) ? 1 : 0,
              transform: lettresVisibles.includes(i) ? 'translateY(0)' : 'translateY(14px)',
              color: i >= 7 ? '#F97316' : 'white',
              display: 'inline-block',
            }}
          >
            {lettre === ' ' ? '\u00a0' : lettre}
          </span>
        ))}
      </div>
      <p
        className="text-xs font-semibold tracking-widest uppercase mt-3 transition-opacity duration-500"
        style={{
          color: 'rgba(255,255,255,0.3)',
          opacity: sousTitre ? 1 : 0
        }}
      >
        Transport intelligent à Yaoundé
      </p>
    </div>
  )
}

  return (
    <div className="flex min-h-screen">

      {/* FOND GLOBAL */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/tacko.jpg')" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(11,31,74,0.92) 0%, rgba(11,18,32,0.88) 100%)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '26px 26px'
          }}
        />
      </div>

      {/* PANNEAU GAUCHE — blanc */}
      <div className="relative z-10 w-full md:w-96 bg-white flex flex-col px-10 py-9 shadow-2xl">

        {/* Logo */}
        <div className="text-2xl font-black text-blue-900 mb-12 tracking-tight">
          School<span className="text-orange-500">Driva</span>
        </div>

        {/* Formulaire */}
        <div className="flex flex-col flex-1 justify-center">
          <h1 className="text-2xl font-black text-gray-900 mb-1">Bienvenue</h1>
          <p className="text-sm text-gray-500 mb-7">Connectez-vous pour continuer.</p>

          {/* Email */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Adresse email</label>
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all"
            />
          </div>

          {/* Mot de passe */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">Mot de passe</label>
              <span  onClick={() => navigate('/mot-de-passe-oublie')} className="text-xs text-orange-600 font-semibold cursor-pointer hover:underline">
                Mot de passe oublie ?
              </span>
            </div>
            <input
              type="password"
              placeholder="Entrez votre mot de passe"
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all"
            />
          </div>

          {/* Bouton */}
          {erreur && (
  <p className="text-xs text-red-600 mb-3 text-center">{erreur}</p>
)}
<button
  onClick={handleConnexion}
  disabled={chargement}
  className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg text-sm hover:bg-orange-700 transition-all mb-4 mt-2 disabled:opacity-50"
>
  {chargement ? 'Connexion...' : 'Se connecter'}
</button>
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-500 mt-2">
            Pas encore de compte ?{' '}
            <span
              onClick={() => navigate('/inscription')}
              className="text-orange-600 font-semibold cursor-pointer hover:underline"
            >
              S'inscrire
            </span>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Vous etes chauffeur ?{' '}
            <span
              onClick={() => navigate('/devenir-chauffeur')}
              className="text-orange-600 font-semibold cursor-pointer hover:underline"
            >
              Devenir partenaire
            </span>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Dossier chauffeur incomplet ?{' '}
            <span
              onClick={() => navigate('/completer-dossier')}
              className="text-orange-600 font-semibold cursor-pointer hover:underline"
            >
              Compléter mon dossier
            </span>
          </p>
        </div>

        <hr />
        <p className="text-center text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100">
          © 2026 School Driva <br /> Yaounde, Cameroun
        </p>
      </div>

      {/* PANNEAU DROIT — slider (cache sur mobile) */}
      <div className="hidden md:flex relative z-10 flex-1 items-center justify-center p-10">
        <div className="text-center max-w-sm">

         {/* Image du slide */}
<div className="w-full h-48 mx-auto mb-6 rounded-2xl overflow-hidden relative">
  {[
    '/reservation.webp',
    '/chauffeur_verifie.webp',
    '/voyage_securise.webp',
    '/paiement2.webp'
  ].map((src, i) => (
    <img
      key={i}
      src={src}
      alt={slides[i].titre}
      className="w-full h-full object-cover absolute top-0 transition-all duration-700 ease-in-out"
      style={{
        left: i === slideActif ? '0%' : i < slideActif ? '-100%' : '100%'
      }}
    />
  ))}
</div>

          {/* Titre et texte */}
          <div className="text-xl font-bold text-white mb-3 leading-tight">
            {slides[slideActif].titre}
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            {slides[slideActif].texte}
          </p>

          {/* Dots */}
          <div className="flex gap-2 justify-center mt-6">
            {slides.map((_, i) => (
              <div
                key={i}
                onClick={() => setSlideActif(i)}
                className={`h-1 rounded-full cursor-pointer transition-all ${
                  i === slideActif ? 'w-9 bg-orange-500' : 'w-5 bg-white/20'
                }`}
              />
            ))}
          </div>

        </div>
      </div>
      <ParticlesFlottantes />

    </div>
  )
}

export default Connexion