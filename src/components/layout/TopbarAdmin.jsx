import { useState, useEffect } from 'react'
import { apiCall } from '../../utils/api'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { deconnecter } from '../../utils/session'

const LIENS = [
  {
    label: 'Tableau de bord',
    path: '/admin',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  },
  {
    label: 'Chauffeurs',
    path: '/admin/chauffeurs',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    label: 'Passagers',
    path: '/admin/passagers',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
  {
    label: 'Courses',
    path: '/admin/courses',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/></svg>
  },
  {
    label: 'Paiements',
    path: '/admin/paiements',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
  },
  {
    label: 'Paramètres',
    path: '/admin/parametres',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  },
]


const TopbarAdmin = () => {
  const navigate = useNavigate()
  // Notifications calculées à partir des vraies données (rafraîchies toutes les 60 s)
  const [NOTIFICATIONS, setNotifications] = useState([])
  useEffect(() => {
    const charger = async () => {
      try {
        const [stats, recharges] = await Promise.all([
          apiCall('/api/admin/dashboard-stats'),
          apiCall('/api/paiements/admin/recharges?statut=EN_ATTENTE'),
        ])
        const liste = []
        if (stats.nbChauffeursEnAttente > 0) liste.push({ id: 'c', texte: `${stats.nbChauffeursEnAttente} dossier(s) chauffeur à valider`, lien: '/admin/chauffeurs', urgent: true })
        if (stats.nbDocumentsEnAttente > 0) liste.push({ id: 'd', texte: `${stats.nbDocumentsEnAttente} document(s) à vérifier`, lien: '/admin/chauffeurs', urgent: false })
        if (recharges.length > 0) liste.push({ id: 'r', texte: `${recharges.length} recharge(s) en attente`, lien: '/admin/paiements', urgent: true })
        setNotifications(liste)
      } catch { /* silencieux : la barre ne doit pas bloquer la page */ }
    }
    charger()
    const t = setInterval(charger, 60000)
    return () => clearInterval(t)
  }, [])

  const seDeconnecter = () => {
    deconnecter()
    navigate('/connexion', { replace: true })
  }
  const location = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [notifOuvert, setNotifOuvert] = useState(false)
  const { modeNuit, basculerTheme } = useTheme()

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: '#0B1F4A', boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
      >
        {/* Logo */}
        <div
          className="text-xl font-black tracking-tight cursor-pointer flex items-center gap-2"
          onClick={() => navigate('/admin')}
          style={{ color: 'white' }}
        >
          School<span style={{ color: '#F97316' }}>Driva</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
            Admin
          </span>
        </div>

        {/* Liens desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {LIENS.map(lien => {
            const actif = location.pathname === lien.path
            return (
              <button
                key={lien.path}
                onClick={() => navigate(lien.path)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: actif ? 'rgba(37,99,235,0.4)' : 'transparent',
                  color: actif ? 'white' : 'rgba(255,255,255,0.6)',
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

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOuvert(!notifOuvert)}
              className="relative p-2 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.08)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {NOTIFICATIONS.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: '#DC2626', color: 'white' }}
                >
                  {NOTIFICATIONS.length}
                </span>
              )}
            </button>

            {/* Dropdown notifications */}
            {notifOuvert && (
              <div
                className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ background: modeNuit ? '#1E293B' : '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: modeNuit ? '#334155' : '#E5E7EB' }}>
                  <div className="text-sm font-black" style={{ color: modeNuit ? '#F1F5F9' : '#111827' }}>
                    Notifications
                  </div>
                </div>
                {NOTIFICATIONS.length === 0 && (
                  <div className="px-4 py-3 text-xs" style={{ color: modeNuit ? '#94A3B8' : '#6B7280' }}>Rien à traiter pour le moment</div>
                )}
                {NOTIFICATIONS.map((n, i) => (
                  <div
                    key={n.id}
                    className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:opacity-80"
                    onClick={() => { setNotifOuvert(false); navigate(n.lien) }}
                    style={{ borderBottom: i < NOTIFICATIONS.length - 1 ? `1px solid ${modeNuit ? '#334155' : '#E5E7EB'}` : 'none' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: n.urgent ? '#DC2626' : '#EAB308' }}
                    />
                    <span className="text-xs leading-relaxed" style={{ color: modeNuit ? '#94A3B8' : '#6B7280' }}>
                      {n.texte}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mode nuit */}
          <button
            onClick={basculerTheme}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.08)' }}
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

          {/* Admin badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs" style={{ background: '#2563EB', color: 'white' }}>
              A
            </div>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Admin</span>
          </div>

          {/* Déconnexion */}
          <button
            onClick={seDeconnecter}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Burger mobile */}
        <button className="lg:hidden flex flex-col gap-1.5 cursor-pointer" onClick={() => setMenuOuvert(!menuOuvert)}>
          <div className="w-6 h-0.5 bg-white transition-all" style={{ transform: menuOuvert ? 'rotate(45deg) translateY(8px)' : 'none' }} />
          <div className="w-6 h-0.5 bg-white transition-all" style={{ opacity: menuOuvert ? 0 : 1 }} />
          <div className="w-6 h-0.5 bg-white transition-all" style={{ transform: menuOuvert ? 'rotate(-45deg) translateY(-8px)' : 'none' }} />
        </button>
      </nav>

      {/* Menu mobile */}
      {menuOuvert && (
        <div
          className="fixed top-14 left-0 right-0 z-40 lg:hidden py-4 px-6 flex flex-col gap-2"
          style={{ background: '#0B1F4A', borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          {LIENS.map(lien => {
            const actif = location.pathname === lien.path
            return (
              <button
                key={lien.path}
                onClick={() => { navigate(lien.path); setMenuOuvert(false) }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold"
                style={{
                  background: actif ? 'rgba(37,99,235,0.4)' : 'transparent',
                  color: actif ? 'white' : 'rgba(255,255,255,0.6)',
                }}
              >
                {lien.icon}
                {lien.label}
              </button>
            )
          })}
          <button onClick={seDeconnecter} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Déconnexion
          </button>
        </div>
      )}
    </>
  )
}

export default TopbarAdmin