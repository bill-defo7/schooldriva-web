import { useTheme } from '../../context/ThemeContext'

// Couleurs communes aux pages admin (mode jour / nuit)
export function useCouleurs() {
  const { modeNuit } = useTheme()
  return {
    modeNuit,
    bg: modeNuit ? '#0F172A' : '#F1F5F9',
    cardBg: modeNuit ? '#1E293B' : '#FFFFFF',
    sousBg: modeNuit ? '#0F172A' : '#F9FAFB',
    textPrimary: modeNuit ? '#F1F5F9' : '#111827',
    textSecondary: modeNuit ? '#94A3B8' : '#6B7280',
    border: modeNuit ? '#334155' : '#E5E7EB',
  }
}

export const Carte = ({ children, className = '', style = {} }) => {
  const c = useCouleurs()
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: c.cardBg, border: `1px solid ${c.border}`, ...style }}>
      {children}
    </div>
  )
}

export const Titre = ({ titre, sousTitre, action }) => {
  const c = useCouleurs()
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: c.textPrimary }}>{titre}</h1>
        {sousTitre && <p className="text-sm mt-1" style={{ color: c.textSecondary }}>{sousTitre}</p>}
      </div>
      {action}
    </div>
  )
}

export const Stat = ({ label, valeur, couleur, sous }) => {
  const c = useCouleurs()
  return (
    <Carte className="p-4">
      <div className="text-2xl font-black" style={{ color: couleur }}>{valeur}</div>
      <div className="text-xs font-semibold mt-1" style={{ color: c.textSecondary }}>{label}</div>
      {sous && <div className="text-xs mt-0.5" style={{ color: c.textSecondary, opacity: 0.8 }}>{sous}</div>}
    </Carte>
  )
}

const BADGES = {
  ACTIF: ['Actif', '#DCFCE7', '#16A34A'], BLOQUE: ['Bloqué', '#FEE2E2', '#DC2626'],
  EN_ATTENTE: ['En attente', '#FEF9C3', '#CA8A04'], VALIDE: ['Validé', '#DCFCE7', '#16A34A'],
  REJETE: ['Rejeté', '#FEE2E2', '#DC2626'], VALIDEE: ['Validée', '#DCFCE7', '#16A34A'],
  REJETEE: ['Rejetée', '#FEE2E2', '#DC2626'], CONFIRME: ['Confirmé', '#DCFCE7', '#16A34A'],
  ACCEPTEE: ['Acceptée', '#EFF6FF', '#2563EB'], EN_ROUTE: ['En route', '#EFF6FF', '#2563EB'],
  ARRIVEE: ['Arrivé', '#EFF6FF', '#2563EB'], DEMARREE: ['En cours', '#EFF6FF', '#2563EB'],
  TERMINEE: ['Terminée', '#DCFCE7', '#16A34A'], ANNULEE: ['Annulée', '#FEE2E2', '#DC2626'],
  MANQUANT: ['Manquant', '#F3F4F6', '#6B7280'], SUPER_ADMIN: ['Super admin', '#EDE9FE', '#7C3AED'],
  ADMIN: ['Admin', '#EFF6FF', '#2563EB'],
}

export const Badge = ({ statut }) => {
  const [label, bg, color] = BADGES[statut] || [statut || '—', '#F3F4F6', '#6B7280']
  return <span className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: bg, color }}>{label}</span>
}

export const Bouton = ({ children, onClick, variante = 'primaire', disabled, className = '', type = 'button' }) => {
  const c = useCouleurs()
  const styles = {
    primaire: { background: '#0B1F4A', color: 'white' },
    orange: { background: '#EA580C', color: 'white' },
    succes: { background: '#16A34A', color: 'white' },
    danger: { background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' },
    discret: { border: `1px solid ${c.border}`, color: c.textSecondary, background: 'transparent' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${className}`}
            style={styles[variante]}>
      {children}
    </button>
  )
}

export const Modale = ({ titre, sousTitre, onFermer, children, large }) => {
  const c = useCouleurs()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onFermer}>
      <div className={`w-full ${large ? 'max-w-2xl' : 'max-w-md'} rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto`}
           style={{ background: c.cardBg }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: '#0B1F4A' }}>
          <div>
            <div className="font-black text-white">{titre}</div>
            {sousTitre && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{sousTitre}</div>}
          </div>
          <button onClick={onFermer} aria-label="Fermer" style={{ color: 'rgba(255,255,255,0.7)' }} className="text-xl font-bold">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export const Champ = ({ label, ...props }) => {
  const c = useCouleurs()
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs font-semibold" style={{ color: c.textSecondary }}>{label}</span>}
      {props.multiline
        ? <textarea {...props} multiline={undefined} className="px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: c.sousBg, color: c.textPrimary, border: `1px solid ${c.border}` }} />
        : <input {...props} className="px-3 py-2.5 rounded-xl text-sm outline-none"
                 style={{ background: c.sousBg, color: c.textPrimary, border: `1px solid ${c.border}` }} />}
    </label>
  )
}

export const Filtres = ({ options, actif, onChange }) => {
  const c = useCouleurs()
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: actif === o ? '#0B1F4A' : c.cardBg, color: actif === o ? 'white' : c.textSecondary,
                         border: `1px solid ${actif === o ? '#0B1F4A' : c.border}` }}>
          {o}
        </button>
      ))}
    </div>
  )
}

export const Recherche = ({ valeur, onChange, placeholder }) => {
  const c = useCouleurs()
  return (
    <input value={valeur} onChange={e => onChange(e.target.value)} placeholder={placeholder}
           className="flex-1 min-w-[200px] px-4 py-2 rounded-xl text-sm outline-none"
           style={{ background: c.cardBg, color: c.textPrimary, border: `1px solid ${c.border}` }} />
  )
}

export const Alerte = ({ type = 'erreur', children, onFermer }) => {
  if (!children) return null
  const couleurs = type === 'succes' ? ['#DCFCE7', '#166534'] : type === 'info' ? ['#EFF6FF', '#1E40AF'] : ['#FEE2E2', '#991B1B']
  return (
    <div className="px-4 py-3 rounded-xl text-sm flex items-start justify-between gap-3"
         style={{ background: couleurs[0], color: couleurs[1] }}>
      <span>{children}</span>
      {onFermer && <button onClick={onFermer} className="font-bold">×</button>}
    </div>
  )
}

export const Vide = ({ texte }) => {
  const c = useCouleurs()
  return <div className="px-5 py-10 text-center text-sm" style={{ color: c.textSecondary }}>{texte}</div>
}

export const nomComplet = (p) => (p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : '—')
