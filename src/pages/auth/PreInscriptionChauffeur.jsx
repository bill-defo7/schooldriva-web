import { useNavigate } from 'react-router-dom'
import ParticlesFlottantes from '../../components/layout/ParticlesFlottantes'
import { useState, useEffect } from 'react'
import { apiCall } from '../../utils/api'
import { API_BASE_URL } from '../../config/api'

const ETAPES = ['Informations', 'Véhicule', 'Documents']

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

const PreInscriptionChauffeur = () => {
  const [etape, setEtape] = useState(0)
  const [typeVehicule, setTypeVehicule] = useState('voiture')
  const [villes, setVilles] = useState([])
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const [succes, setSucces] = useState(false)
  const [chauffeurId, setChauffeurId] = useState(null)
  // Jeton (2 h) remis par le backend : autorise uniquement l'envoi de NOS documents
  const [uploadToken, setUploadToken] = useState(null)
  const [fichiers, setFichiers] = useState({})
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', villeId: '',
    marque: '', modele: '', couleur: '', annee: '', immatriculation: ''
  })
  const navigate = useNavigate()

  useEffect(() => {
    apiCall('/api/villes')
      .then(setVilles)
      .catch(() => setErreur('Impossible de charger les villes'))
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFichierChange = (type, file) => {
    setFichiers({ ...fichiers, [type]: file })
  }

  const handleSoumettre = async () => {
    setErreur('')
    setChargement(true)
    try {
      const reponse = await apiCall('/api/auth/chauffeur/pre-inscription', {
        method: 'POST',
        body: JSON.stringify({
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          telephone: form.telephone,
          villeId: Number(form.villeId),
          typeVehicule: typeVehicule.toUpperCase(),
          marque: form.marque,
          modele: form.modele,
          couleur: form.couleur,
          annee: form.annee ? Number(form.annee) : null,
          immatriculation: form.immatriculation,
        }),
      })
      setChauffeurId(reponse.chauffeurId)
      setUploadToken(reponse.uploadToken)
      setEtape(2)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setChargement(false)
    }
  }

  const uploaderDocument = async (type) => {
    const fichier = fichiers[type]
    if (!fichier) return

    const formData = new FormData()
    formData.append('chauffeurId', chauffeurId)
    formData.append('type', type)
    formData.append('fichier', fichier)

    const response = await fetch(
      `${API_BASE_URL}/api/chauffeur/documents/upload`,
      { method: 'POST', headers: { 'X-Upload-Token': uploadToken }, body: formData }
    )

    if (!response.ok) {
      let message = `Erreur lors de l'envoi du document ${type}`
      try {
        const data = await response.json()
        if (data?.message) message = `${type} : ${data.message}`
      } catch { /* réponse non JSON */ }
      throw new Error(message)
    }
  }

  const handleTerminerInscription = async () => {
    setErreur('')
    setChargement(true)
    try {
      const typesAvecFichier = Object.keys(fichiers).filter(type => fichiers[type])
      for (const type of typesAvecFichier) {
        await uploaderDocument(type)
      }
      setSucces(true)
      setTimeout(() => navigate('/'), 2500)
    } catch (err) {
      setErreur(err.message || 'Erreur lors de l\'envoi des documents. Réessayez.')
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
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex">

        {/* Gauche sombre */}
        <div
          className="hidden md:flex w-2/5 flex-col p-10"
          style={{ background: 'linear-gradient(160deg, rgba(60,20,5,0.97) 0%, rgba(30,10,2,0.99) 100%)' }}
        >
          <div className="text-xl font-black text-white mb-8 tracking-tight">
            School<span className="text-orange-500">Driva</span>
          </div>

          <div className="flex flex-col gap-0 mb-8">
            {ETAPES.map((e, i) => (
              <div key={i} className="flex items-start gap-3 pb-5 relative">
                {i < ETAPES.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-white/10" />
                )}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10"
                  style={{
                    background: i < etape ? '#16A34A' : i === etape ? '#EA580C' : 'rgba(255,255,255,0.1)',
                    color: 'white'
                  }}
                >
                  {i < etape ? '✓' : i + 1}
                </div>
                <div className="pt-1">
                  <div className="text-sm font-bold" style={{ color: i === etape ? 'white' : 'rgba(255,255,255,0.4)' }}>
                    {e}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {['Nom, email, téléphone', 'Marque, immatriculation', '11 pièces obligatoires'][i]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-6">
            <svg width="80" height="56" viewBox="0 0 80 56" fill="none">
              <rect x="4" y="18" width="72" height="24" rx="5" fill="rgba(234,88,12,0.3)" stroke="rgba(234,88,12,0.5)" strokeWidth="1.5"/>
              <rect x="10" y="8" width="60" height="16" rx="4" fill="rgba(234,88,12,0.2)" stroke="rgba(234,88,12,0.35)" strokeWidth="1"/>
              <circle cx="18" cy="46" r="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)"/>
              <circle cx="62" cy="46" r="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)"/>
            </svg>
            <p className="text-white/35 text-xs mt-3 font-semibold">Chauffeur Partenaire</p>
          </div>

          <p className="text-white/40 text-xs italic text-center mt-4 leading-relaxed">
            "Rejoignez notre flotte et augmentez vos revenus avec une commission de seulement 15 %."
          </p>
        </div>

        {/* Droite blanche */}
        <div className="flex-1 p-8 overflow-y-auto max-h-screen">

          {/* Étape 1 — Informations */}
          {etape === 0 && (
            <>
              <h2 className="text-xl font-black text-gray-900 mb-1">Informations personnelles</h2>
              <p className="text-sm text-gray-500 mb-6">
                Déjà partenaire ?{' '}
                <span onClick={() => navigate('/')} className="text-orange-600 font-semibold cursor-pointer hover:underline">
                  Se connecter
                </span>
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Nom <span className="text-orange-600">*</span></label>
                  <input name="nom" value={form.nom} onChange={handleChange} placeholder="Votre nom" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Prénom <span className="text-orange-600">*</span></label>
                  <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Martin" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Email <span className="text-orange-600">*</span></label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Téléphone <span className="text-orange-600">*</span></label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700">
                    <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect width="6" height="12" fill="#007A5E"/><rect x="6" width="6" height="12" fill="#CE1126"/><rect x="12" width="6" height="12" fill="#FCD116"/></svg>
                    +237
                  </div>
                  <input name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="numéro de telephone" className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Ville <span className="text-orange-600">*</span></label>
                <select name="villeId" value={form.villeId} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all cursor-pointer">
                  <option value="">Sélectionner votre ville...</option>
                  {villes.map(v => (
                    <option key={v.id} value={v.id}>{v.nom}</option>
                  ))}
                </select>
              </div>

              <button onClick={() => setEtape(1)} className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg text-sm hover:bg-orange-700 transition-all">
                Continuer →
              </button>
            </>
          )}

          {/* Étape 2 — Véhicule */}
          {etape === 1 && (
            <>
              <h2 className="text-xl font-black text-gray-900 mb-1">Votre véhicule</h2>
              <p className="text-sm text-gray-500 mb-6">Étape 2 — Il sera vérifié avant validation.</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  onClick={() => setTypeVehicule('voiture')}
                  className="border-2 rounded-xl p-4 cursor-pointer text-center transition-all"
                  style={{ borderColor: typeVehicule === 'voiture' ? '#2563EB' : '#E5E7EB', background: typeVehicule === 'voiture' ? '#EFF6FF' : '#F9FAFB' }}
                >
                  <svg width="44" height="28" viewBox="0 0 56 36" fill="none" style={{ display: 'block', margin: '0 auto 6px' }}>
                    <rect x="4" y="12" width="48" height="16" rx="4" fill="#1A3A6B"/>
                    <rect x="10" y="6" width="36" height="11" rx="3" fill="#2563EB"/>
                    <circle cx="14" cy="28" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
                    <circle cx="42" cy="28" r="5" fill="#374151" stroke="white" strokeWidth="2"/>
                  </svg>
                  <div className="text-sm font-bold" style={{ color: typeVehicule === 'voiture' ? '#2563EB' : '#374151' }}>Voiture</div>
                </div>
                <div
                  onClick={() => setTypeVehicule('moto')}
                  className="border-2 rounded-xl p-4 cursor-pointer text-center transition-all"
                  style={{ borderColor: typeVehicule === 'moto' ? '#EA580C' : '#E5E7EB', background: typeVehicule === 'moto' ? '#FFEDD5' : '#F9FAFB' }}
                >
                  <svg width="34" height="28" viewBox="0 0 48 36" fill="none" style={{ display: 'block', margin: '0 auto 6px' }}>
                    <ellipse cx="24" cy="24" rx="16" ry="9" fill="#EA580C"/>
                    <ellipse cx="24" cy="18" rx="8" ry="6" fill="#F97316"/>
                    <circle cx="10" cy="30" r="4" fill="#374151" stroke="white" strokeWidth="2"/>
                    <circle cx="38" cy="30" r="4" fill="#374151" stroke="white" strokeWidth="2"/>
                  </svg>
                  <div className="text-sm font-bold" style={{ color: typeVehicule === 'moto' ? '#EA580C' : '#374151' }}>Moto</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Marque</label>
                  <input name="marque" value={form.marque} onChange={handleChange} placeholder="Toyota" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Modèle</label>
                  <input name="modele" value={form.modele} onChange={handleChange} placeholder="Corolla" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Couleur</label>
                  <input name="couleur" value={form.couleur} onChange={handleChange} placeholder="Blanc" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Année</label>
                  <input name="annee" type="number" value={form.annee} onChange={handleChange} placeholder="2019" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all" />
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Immatriculation</label>
                <input name="immatriculation" value={form.immatriculation} onChange={handleChange} placeholder="CE 123 AB" className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all font-mono" />
              </div>

              {erreur && <p className="text-xs text-red-600 mb-3 text-center">{erreur}</p>}

              <div className="flex gap-3">
                <button onClick={() => setEtape(0)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all">
                  ← Retour
                </button>
                <button
                  onClick={handleSoumettre}
                  disabled={chargement}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  {chargement ? 'Création...' : 'Continuer →'}
                </button>
              </div>
            </>
          )}

          {/* Étape 3 — Documents */}
          {etape === 2 && !succes && (
            <>
              <h2 className="text-xl font-black text-gray-900 mb-1">Documents obligatoires</h2>
              <p className="text-sm text-gray-500 mb-4">11 pièces requises. Aucun rejet définitif.</p>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-700">
                Vous pouvez soumettre un dossier incomplet et le compléter plus tard.
              </div>

              {erreur && <p className="text-xs text-red-600 mb-3 text-center">{erreur}</p>}

              <div className="grid grid-cols-2 gap-2 mb-6 max-h-80 overflow-y-auto">
                {TYPES_DOCUMENTS.map((doc) => (
                  <label
                    key={doc.type}
                    className="border rounded-xl p-3 text-center cursor-pointer transition-all"
                    style={{
                      borderColor: fichiers[doc.type] ? '#16A34A' : '#E5E7EB',
                      background: fichiers[doc.type] ? '#DCFCE7' : '#F9FAFB'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFichierChange(doc.type, e.target.files[0])}
                    />
                    <div style={{ color: fichiers[doc.type] ? '#16A34A' : '#9CA3AF', fontSize: 16 }}>
                      {fichiers[doc.type] ? '✓' : '↑'}
                    </div>
                    <div className="text-xs font-semibold text-gray-700 mt-1">{doc.label}</div>
                    <div className="text-xs mt-1" style={{ color: fichiers[doc.type] ? '#16A34A' : '#9CA3AF' }}>
                      {fichiers[doc.type] ? fichiers[doc.type].name.slice(0, 12) : 'Ajouter'}
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleTerminerInscription}
                  disabled={chargement}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {chargement ? 'Envoi...' : '✓ Soumettre'}
                </button>
              </div>
            </>
          )}

          {succes && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Dossier soumis avec succès !</h2>
              <p className="text-sm text-gray-500">Vous serez contacté sous 48h.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default PreInscriptionChauffeur