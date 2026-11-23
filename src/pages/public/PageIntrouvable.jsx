import { Link } from 'react-router-dom'
import { lireSession, accueilPourRole } from '../../utils/session'

const PageIntrouvable = () => {
  const session = lireSession()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0B1220' }}>
      <div className="text-7xl font-black" style={{ color: '#F97316' }}>404</div>
      <p className="text-white text-lg font-bold">Cette page n’existe pas.</p>
      <Link to={session ? accueilPourRole(session.role) : '/connexion'}
            className="px-5 py-3 rounded-xl font-bold text-white" style={{ background: '#EA580C' }}>
        Retour à l’accueil
      </Link>
    </div>
  )
}

export default PageIntrouvable
