import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

// Palette commune des pages admin (mode jour / nuit)
export function useCouleurs() {
  const { modeNuit } = useTheme()
  return {
    modeNuit,
    bg: modeNuit ? '#0F172A' : '#F1F5F9',
    cardBg: modeNuit ? '#1E293B' : '#FFFFFF',
    subtleBg: modeNuit ? '#0F172A' : '#F9FAFB',
    textPrimary: modeNuit ? '#F1F5F9' : '#111827',
    textSecondary: modeNuit ? '#94A3B8' : '#6B7280',
    border: modeNuit ? '#334155' : '#E5E7EB',
  }
}

/** Charge des données via une fonction async ; expose rechargement, chargement et erreur. */
export function useDonnees(chargeur, deps = []) {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  // La dernière version du chargeur est conservée dans une ref : pas besoin
  // de la mettre dans les dépendances (elle change à chaque rendu).
  const chargeurRef = useRef(chargeur)
  useEffect(() => { chargeurRef.current = chargeur })
  const cle = deps.join('|')

  const recharger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      setDonnees(await chargeurRef.current())
    } catch (e) {
      setErreur(e.message)
    } finally {
      setChargement(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { recharger() }, [recharger, cle])
  return { donnees, erreur, chargement, recharger }
}

export const PageAdmin = ({ titre, sousTitre, actions, children }) => {
  const c = useCouleurs()
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: c.bg }}>
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: c.textPrimary }}>{titre}</h1>
            {sousTitre && <p className="text-sm mt-1" style={{ color: c.textSecondary }}>{sousTitre}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  )
}

export const Carte = ({ children, className = '', style = {} }) => {
  const c = useCouleurs()
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: c.cardBg, border: `1px solid ${c.border}`, ...style }}>
      {children}
    </div>
  )
}

export const Stat = ({ label, valeur, couleur, sous }) => {
  const c = useCouleurs()
  return (
    <Carte className="p-4 text-center">
      <div className="text-2xl font-black" style={{ color: couleur }}>{valeur}</div>
      <div className="text-xs font-semibold mt-1" style={{ color: c.textSecondary }}>{label}</div>
      {sous && <div className="text-xs mt-0.5" style={{ color: c.textSecondary, opacity: 0.7 }}>{sous}</div>}
    </Carte>
  )
}

const BADGES = {
  ACTIF: ['Actif', '#DCFCE7', '#16A34A'], BLOQUE: ['Bloqué', '#FEE2E2', '#DC2626'],
  EN_ATTENTE: ['En attente', '#FEF9C3', '#CA8A04'], VALIDE: ['Validé', '#DCFCE7', '#16A34A'],
  REJETE: ['Rejeté', '#FEE2E2', '#DC2626'], VALIDEE: ['Validée', '#DCFCE7', '#16A34A'],
  REJETEE: ['Rejetée', '#FEE2E2', '#DC2626'], CONFIRME: ['Confirmé', '#DCFCE7', '#16A34A'],
  ACCEPTEE: ['Acceptée', '#EFF6FF', '#2563EB'], EN_ROUTE: ['En route', '#EFF6FF', '#2563EB'],
  ARRIVEE: ['Chauffeur arrivé', '#EFF6FF', '#2563EB'], DEMARREE: ['En cours', '#EFF6FF', '#2563EB'],
  TERMINEE: ['Terminée', '#DCFCE7', '#16A34A'], ANNULEE: ['Annulée', '#FEE2E2', '#DC2626'],
  MANQUANT: ['Manquant', '#F3F4F6', '#6B7280'], SUPER_ADMIN: ['Super admin', '#EDE9FE', '#7C3AED'],
  ADMIN: ['Admin', '#EFF6FF', '#2563EB'],
}

export const Badge = ({ statut }) => {
  const [label, bg, color] = BADGES[statut] || [statut, '#F3F4F6', '#374151']
  return <span className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: bg, color }}>{label}</span>
}

const STYLES_BOUTON = {
  primaire: { background: '#0B1F4A', color: 'white' },
  orange: { background: '#EA580C', color: 'white' },
  succes: { background: '#16A34A', color: 'white' },
  danger: { background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' },
  doux: { background: '#EFF6FF', color: '#2563EB' },
}

export const Bouton = ({ variante = 'primaire', className = '', style = {}, ...props }) => {
  const c = useCouleurs()
  const base = variante === 'contour'
    ? { border: `1px solid ${c.border}`, color: c.textSecondary, background: 'transparent' }
    : STYLES_BOUTON[variante]
  return (
    <button {...props}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            style={{ ...base, ...style }} />
  )
}

export const Modal = ({ titre, couleur = '#0B1F4A', onFermer, children, large = false }) => {
  const c = useCouleurs()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onFermer}>
      <div className={`w-full ${large ? 'max-w-2xl' : 'max-w-md'} rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto`}
           style={{ background: c.cardBg }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: couleur }}>
          <div className="font-black text-white">{titre}</div>
          <button onClick={onFermer} aria-label="Fermer" className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export const Filtres = ({ options, actif, onChange }) => {
  const c = useCouleurs()
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(f => (
        <button key={f} onClick={() => onChange(f)} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: actif === f ? '#0B1F4A' : c.cardBg, color: actif === f ? 'white' : c.textSecondary,
                         border: `1px solid ${actif === f ? '#0B1F4A' : c.border}` }}>
          {f}
        </button>
      ))}
    </div>
  )
}

export const Recherche = ({ valeur, onChange, placeholder }) => {
  const c = useCouleurs()
  return (
    <div className="flex-1 min-w-[200px] flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
      <span style={{ color: c.textSecondary }}>🔍</span>
      <input type="text" value={valeur} onChange={e => onChange(e.target.value)} placeholder={placeholder}
             className="flex-1 text-sm outline-none bg-transparent" style={{ color: c.textPrimary }} />
    </div>
  )
}

export const Champ = ({ label, ...props }) => {
  const c = useCouleurs()
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold" style={{ color: c.textSecondary }}>{label}</span>
      {props.multiline
        ? <textarea {...props} multiline={undefined} rows={props.rows || 4} className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: c.subtleBg, border: `1px solid ${c.border}`, color: c.textPrimary }} />
        : <input {...props} className="px-3 py-2 rounded-xl text-sm outline-none"
                 style={{ background: c.subtleBg, border: `1px solid ${c.border}`, color: c.textPrimary }} />}
    </label>
  )
}

export const Message = ({ type = 'erreur', children }) => {
  if (!children) return null
  const s = type === 'erreur' ? { background: '#FEE2E2', color: '#B91C1C' }
    : type === 'succes' ? { background: '#DCFCE7', color: '#15803D' } : { background: '#FEF9C3', color: '#A16207' }
  return <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={s}>{children}</div>
}

export const Vide = ({ children }) => {
  const c = useCouleurs()
  return <div className="px-5 py-10 text-center text-sm" style={{ color: c.textSecondary }}>{children}</div>
}

export const Ligne = ({ label, valeur }) => {
  const c = useCouleurs()
  return (
    <div>
      <div className="text-xs font-semibold mb-1" style={{ color: c.textSecondary }}>{label}</div>
      <div className="text-sm font-bold break-words" style={{ color: c.textPrimary }}>{valeur ?? '—'}</div>
    </div>
  )
}

/** Exécute une action admin avec gestion du message de retour. */
export function useAction() {
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState(null) // { type, texte }
  const executer = async (fn, succes) => {
    setEnCours(true)
    setMessage(null)
    try {
      const r = await fn()
      if (succes) setMessage({ type: 'succes', texte: typeof succes === 'function' ? succes(r) : succes })
      return r
    } catch (e) {
      setMessage({ type: 'erreur', texte: e.message })
      return undefined
    } finally {
      setEnCours(false)
    }
  }
  return { enCours, message, setMessage, executer }
}
