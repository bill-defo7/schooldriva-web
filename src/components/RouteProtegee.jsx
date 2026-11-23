import { Navigate, useLocation } from 'react-router-dom'
import { lireSession, accueilPourRole } from '../utils/session'

// Bloque l'accès aux pages d'un rôle : pas de session → connexion ;
// mauvais rôle → son propre espace ; mot de passe temporaire → changement obligatoire.
const RouteProtegee = ({ role, children }) => {
  const session = lireSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />
  }
  if (session.doitChangerMotDePasse) {
    return <Navigate to="/changer-mot-de-passe" replace />
  }
  if (role && session.role !== role) {
    return <Navigate to={accueilPourRole(session.role)} replace />
  }
  return children
}

export default RouteProtegee
