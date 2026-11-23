import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { deconnecter } from '../../utils/session'

const LIENS = [
  {
    label: 'Tableau de bord',
    path: '/chauffeur',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  },
  {
    label: 'Course',
    path: '/chauffeur/course',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/></svg>
  },
  {
    label: 'Portefeuille',
    path: '/chauffeur/portefeuille',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
  },
  {
    label: 'Revenus',
    path: '/chauffeur/revenus',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  },
  {
    label: 'Documents',
    path: '/chauffeur/documents',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  },
  {
    label: 'Profil',
    path: '/chauffeur/profil',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
]

const TopbarChauffeur = ({ enLigne, onToggle, chargement, erreur }) => {
  const navigate = useNavigate()
  const seDeconnecter = () => {
    deconnecter()
    navigate('/connexion', { replace: true })
  }
  const location = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const { modeNuit, basculerTheme } = useTheme()

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: '#7C2D12', boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
      >
        {/* Logo */}
        <div
          className="text-xl font-black tracking-tight cursor-pointer flex items-center gap-3"
          onClick={() => navigate('/chauffeur')}
          style={{ color: 'white' }}
        >
          School<span style={{ color: '#FCD34D' }}>Driva</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: enLigne ? '#16A34A' : 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {enLigne ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>

        {/* Liens desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {LIENS.map((lien) => {
            const actif = location.pathname === lien.path
            return (
              <button
                key={lien.path}
                onClick={() => navigate(lien.path)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: actif ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: actif ? 'white' : 'rgba(255,255,255,0.65)',
                }}
              >
                {lien.icon}
                <span className="hidden xl:inline">{lien.label}</span>
              </button>
            )
          })}
        </div>

        {/* Droite */}
        <div className="hidden lg:flex items-center gap-2">

          {/* Toggle En ligne */}
          <button
            onClick={onToggle}
            disabled={chargement}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: enLigne ? '#16A34A' : 'rgba(255,255,255,0.15)',
              color: 'white',
              opacity: chargement ? 0.6 : 1,
              cursor: chargement ? 'not-allowed' : 'pointer',
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
            >
              {enLigne && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            {chargement ? 'Mise à jour...' : (enLigne ? 'En ligne' : 'Hors ligne')}
          </button>
          {erreur && (
            <span className="text-xs font-semibold px-2" style={{ color: '#FCA5A5' }}>
              {erreur}
            </span>
          )}

          {/* Mode nuit */}
          <button
            onClick={basculerTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)' }}
          >
            {modeNuit ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Déconnexion */}
          <button
            onClick={seDeconnecter}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>

        {/* Burger mobile */}
        <button
          className="lg:hidden flex flex-col gap-1.5 cursor-pointer"
          onClick={() => setMenuOuvert(!menuOuvert)}
        >
          <div className="w-6 h-0.5 bg-white transition-all" style={{ transform: menuOuvert ? 'rotate(45deg) translateY(8px)' : 'none' }} />
          <div className="w-6 h-0.5 bg-white transition-all" style={{ opacity: menuOuvert ? 0 : 1 }} />
          <div className="w-6 h-0.5 bg-white transition-all" style={{ transform: menuOuvert ? 'rotate(-45deg) translateY(-8px)' : 'none' }} />
        </button>
      </nav>

      {/* Menu mobile */}
      {menuOuvert && (
        <div
          className="fixed top-14 left-0 right-0 z-40 lg:hidden py-4 px-6 flex flex-col gap-2"
          style={{ background: '#7C2D12', borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          {LIENS.map((lien) => {
            const actif = location.pathname === lien.path
            return (
              <button
                key={lien.path}
                onClick={() => { navigate(lien.path); setMenuOuvert(false) }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: actif ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: actif ? 'white' : 'rgba(255,255,255,0.65)',
                }}
              >
                {lien.icon}
                {lien.label}
              </button>
            )
          })}
          <button
            onClick={onToggle}
            disabled={chargement}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold"
            style={{ background: enLigne ? '#16A34A' : 'rgba(255,255,255,0.15)', color: 'white', opacity: chargement ? 0.6 : 1 }}
          >
            {chargement ? 'Mise à jour...' : (enLigne ? 'Passer Hors ligne' : 'Passer En ligne')}
          </button>
          {erreur && (
            <span className="text-xs font-semibold px-4" style={{ color: '#FCA5A5' }}>{erreur}</span>
          )}
          <button
            onClick={basculerTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {modeNuit ? 'Mode jour' : 'Mode nuit'}
          </button>
          <button
            onClick={seDeconnecter}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      )}
    </>
  )
}

export default TopbarChauffeur