import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LayoutPassager from '../../components/layout/LayoutPassager'
import { useTheme } from '../../context/ThemeContext'
import { apiCall } from '../../utils/api'

const TAGS = [
  'Ponctuel', 'Conduite agréable', 'Voiture propre',
  'Aimable', 'Connaît bien la route', 'Musique agréable'
]

const Notation = () => {
  const [note, setNote] = useState(0)
  const [noteHover, setNoteHover] = useState(0)
  const [tagsSelectionnes, setTagsSelectionnes] = useState([])
  const [commentaire, setCommentaire] = useState('')
  const [securite, setSecurite] = useState(null)
  const [envoye, setEnvoye] = useState(false)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [chauffeur, setChauffeur] = useState(null)
  const { modeNuit } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const courseId = location.state?.courseId
  const destination = location.state?.destination || ''
  const prix = location.state?.prix || 0

  const bg = modeNuit ? '#0F172A' : '#F0F4F8'
  const cardBg = modeNuit ? '#1E293B' : '#FFFFFF'
  const textPrimary = modeNuit ? '#F1F5F9' : '#111827'
  const textSecondary = modeNuit ? '#94A3B8' : '#6B7280'
  const border = modeNuit ? '#334155' : '#E5E7EB'

  // Pas de courseId → rien à noter, retour au tableau de bord
  useEffect(() => {
    if (!courseId) navigate('/passager')
  }, [courseId])

  // Récupère la course pour connaître le chauffeur à afficher/noter
  useEffect(() => {
    if (!courseId) return
    apiCall(`/api/courses/${courseId}`)
      .then(c => {
        if (c.chauffeurId) {
          apiCall(`/api/chauffeurs/${c.chauffeurId}/public`).then(setChauffeur).catch(() => {})
        }
      })
      .catch(() => {})
  }, [courseId])

  const toggleTag = (tag) => {
    setTagsSelectionnes(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const labels = ['', 'Très mauvais', 'Mauvais', 'Moyen', 'Bien', 'Excellent']

  const soumettre = async () => {
    if (note === 0 || !courseId) return
    setEnvoiEnCours(true)
    setErreur('')
    try {
      await apiCall(`/api/courses/${courseId}/noter`, {
        method: 'POST',
        body: JSON.stringify({
          note,
          commentaire: commentaire || null,
          securiteOk: securite,
          tags: tagsSelectionnes.join(','),
        }),
      })
      setEnvoye(true)
      setTimeout(() => navigate('/passager'), 2500)
    } catch (e) {
      setErreur(e.message || "Impossible d'envoyer votre évaluation")
    } finally {
      setEnvoiEnCours(false)
    }
  }

  if (!courseId) return null

  if (envoye) {
    return (
      <LayoutPassager>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: bg }}>
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#DCFCE7' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: textPrimary }}>Merci !</h2>
            <p className="text-sm" style={{ color: textSecondary }}>
              Votre avis a été enregistré. Il aide à améliorer la qualité du service.
            </p>
          </div>
        </div>
      </LayoutPassager>
    )
  }

  return (
    <LayoutPassager>
      <div className="min-h-screen px-4 py-6" style={{ background: bg }}>
        <div className="max-w-lg mx-auto flex flex-col gap-5">

          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>
              Évaluer la course
            </h1>
            <p className="text-sm mt-1" style={{ color: textSecondary }}>
              {destination} — {Number(prix).toLocaleString()} FCFA
            </p>
          </div>

          {erreur && (
            <div className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {erreur}
            </div>
          )}

          {/* Infos chauffeur */}
          <div className="p-5 rounded-2xl flex items-center gap-4" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-white text-lg flex-shrink-0" style={{ background: '#0B1F4A' }}>
              {chauffeur ? `${(chauffeur.prenom || '?')[0]}${(chauffeur.nom || '?')[0]}` : '?'}
            </div>
            <div>
              <div className="font-black text-base" style={{ color: textPrimary }}>
                {chauffeur ? `${chauffeur.prenom} ${chauffeur.nom}` : 'Chauffeur'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: textSecondary }}>
                {chauffeur?.vehiculeMarque ? `${chauffeur.vehiculeMarque} ${chauffeur.vehiculeModele || ''}`.trim() : ''}
                {chauffeur?.immatriculation ? ` · ${chauffeur.immatriculation}` : ''}
              </div>
            </div>
          </div>

          {/* Étoiles */}
          <div className="p-6 rounded-2xl text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <p className="text-sm font-semibold mb-4" style={{ color: textSecondary }}>
              Comment s'est passée votre course ?
            </p>
            <div className="flex items-center justify-center gap-3 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => setNote(i)}
                  onMouseEnter={() => setNoteHover(i)}
                  onMouseLeave={() => setNoteHover(0)}
                  className="transition-transform hover:scale-110"
                >
                  <svg width="40" height="40" viewBox="0 0 24 24"
                    fill={i <= (noteHover || note) ? '#EAB308' : 'none'}
                    stroke={i <= (noteHover || note) ? '#EAB308' : border}
                    strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              ))}
            </div>
            {note > 0 && (
              <div className="text-sm font-bold" style={{ color: '#EAB308' }}>{labels[note]}</div>
            )}
          </div>

          {/* Tags */}
          {note >= 4 && (
            <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
              <p className="text-sm font-semibold mb-3" style={{ color: textSecondary }}>Ce qui était bien</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: tagsSelectionnes.includes(tag) ? '#EFF6FF' : (modeNuit ? '#374151' : '#F3F4F6'),
                      color: tagsSelectionnes.includes(tag) ? '#2563EB' : textSecondary,
                      border: `1.5px solid ${tagsSelectionnes.includes(tag) ? '#2563EB' : border}`
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Commentaire */}
          <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <p className="text-sm font-semibold mb-3" style={{ color: textSecondary }}>Commentaire (optionnel)</p>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Décrivez votre expérience..."
              rows={3}
              className="w-full text-sm outline-none bg-transparent resize-none"
              style={{ color: textPrimary }}
            />
          </div>

          {/* Sécurité */}
          <div className="p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <p className="text-sm font-semibold mb-3" style={{ color: textSecondary }}>
              Vous êtes-vous senti en sécurité pendant ce trajet ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSecurite(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: securite === true ? '#DCFCE7' : (modeNuit ? '#374151' : '#F3F4F6'),
                  color: securite === true ? '#16A34A' : textSecondary,
                  border: `1.5px solid ${securite === true ? '#16A34A' : border}`
                }}
              >
                Oui
              </button>
              <button
                onClick={() => setSecurite(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: securite === false ? '#FEE2E2' : (modeNuit ? '#374151' : '#F3F4F6'),
                  color: securite === false ? '#DC2626' : textSecondary,
                  border: `1.5px solid ${securite === false ? '#DC2626' : border}`
                }}
              >
                Non — Signaler un problème
              </button>
            </div>
          </div>

          <button
            onClick={soumettre}
            disabled={note === 0 || envoiEnCours}
            className="w-full py-4 rounded-2xl font-black text-base transition-all"
            style={{
              background: note > 0 ? '#16A34A' : '#D1D5DB',
              color: 'white',
              cursor: (note > 0 && !envoiEnCours) ? 'pointer' : 'not-allowed',
              boxShadow: note > 0 ? '0 4px 14px rgba(22,163,74,0.4)' : 'none',
              opacity: envoiEnCours ? 0.7 : 1
            }}
          >
            {envoiEnCours ? 'Envoi...' : 'Envoyer mon évaluation'}
          </button>

          <button onClick={() => navigate('/passager')} className="w-full py-3 text-sm font-semibold" style={{ color: textSecondary }}>
            Passer
          </button>

        </div>
      </div>
    </LayoutPassager>
  )
}

export default Notation