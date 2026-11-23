import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

const FooterPassager = () => {
  const { modeNuit } = useTheme()
  const navigate = useNavigate()

  const bg = modeNuit ? '#0B1220' : '#0B1F4A'
  const textSecondary = 'rgba(255,255,255,0.6)'
  const border = 'rgba(255,255,255,0.1)'

  return (
    <footer style={{ background: bg, borderTop: `1px solid ${border}` }}>
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">

          {/* Colonne 1 — Logo + description */}
          <div>
            <div className="text-xl font-black text-white mb-4 tracking-tight">
              School<span style={{ color: '#F97316' }}>Driva</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>
              Le transport intelligent à Yaoundé. Réservez une voiture ou une moto en quelques secondes avec des chauffeurs vérifiés et des prix transparents.
            </p>
          </div>

          {/* Colonne 2 — Liens rapides */}
          <div>
            <div className="text-base font-black text-white mb-4">
              Liens Rapides
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Accueil', path: '/passager' },
                { label: 'Réserver une course', path: '/passager/reservation' },
                { label: 'Historique des courses', path: '/passager/historique' },
                { label: 'Mon profil', path: '/passager/profil' },
                { label: 'Devenir chauffeur', path: '/devenir-chauffeur' },
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

          {/* Colonne 3 — Contact */}
          <div>
            <div className="text-base font-black text-white mb-4">
              Contact
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/>
                </svg>
                <span className="text-sm leading-relaxed" style={{ color: textSecondary }}>
                  Yaoundé, Cameroun
                </span>
              </div>
              <div className="flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span className="text-sm" style={{ color: textSecondary }}>
                  +237 6XX XXX XXX
                </span>
              </div>
              <div className="flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-sm" style={{ color: textSecondary }}>
                  contact@schooldriva.cm
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Séparateur + copyright */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <p className="text-xs text-center sm:text-left" style={{ color: textSecondary }}>
            © 2026 School Driva. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            {[['Conditions générales', 'conditions'], ['Confidentialité', 'confidentialite']].map(([lien, type]) => (
              <button
                key={lien}
                onClick={() => navigate(`/legal/${type}`)}
                className="text-xs transition-all hover:text-white"
                style={{ color: textSecondary }}
              >
                {lien}
              </button>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}

export default FooterPassager