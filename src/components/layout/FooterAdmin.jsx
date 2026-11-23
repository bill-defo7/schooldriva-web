import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

const FooterAdmin = () => {
  const { modeNuit } = useTheme()
  const navigate = useNavigate()

  const bg = modeNuit ? '#0B1220' : '#0B1F4A'
  const textSecondary = 'rgba(255,255,255,0.5)'
  const border = 'rgba(255,255,255,0.1)'

  return (
    <footer style={{ background: bg, borderTop: `1px solid ${border}` }}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">

          {/* Logo + description */}
          <div>
            <div className="text-xl font-black text-white mb-4 tracking-tight">
              School<span style={{ color: '#F97316' }}>Driva</span>
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                Admin
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>
              Tableau de bord d'administration de la plateforme School Driva. Gérez les chauffeurs, les passagers, les courses et les paiements.
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <div className="text-base font-black text-white mb-4">Navigation</div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Tableau de bord', path: '/admin' },
                { label: 'Chauffeurs', path: '/admin/chauffeurs' },
                { label: 'Passagers', path: '/admin/passagers' },
                { label: 'Courses', path: '/admin/courses' },
                { label: 'Paiements', path: '/admin/paiements' },
                { label: 'Paramètres', path: '/admin/parametres' },
              ].map(lien => (
                <button
                  key={lien.path}
                  onClick={() => navigate(lien.path)}
                  className="text-sm text-left transition-all hover:text-white"
                  style={{ color: textSecondary }}
                >
                  {lien.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="text-base font-black text-white mb-4">Contact</div>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/>
                </svg>
                <span className="text-sm" style={{ color: textSecondary }}>Yaoundé, Cameroun</span>
              </div>
              <div className="flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-sm" style={{ color: textSecondary }}>admin@schooldriva.cm</span>
              </div>
            </div>
          </div>

        </div>

        {/* Séparateur + copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6" style={{ borderTop: `1px solid ${border}` }}>
          <p className="text-xs" style={{ color: textSecondary }}>
            © 2026 School Driva — Espace Admin. Tous droits réservés.
          </p>
          <p className="text-xs" style={{ color: textSecondary }}>
            Version MVP v1.0
          </p>
        </div>
      </div>
    </footer>
  )
}

export default FooterAdmin