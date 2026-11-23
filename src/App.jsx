import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RouteProtegee from './components/RouteProtegee'
import { lireSession, accueilPourRole } from './utils/session'

// Chargement à la demande : chaque espace (passager, chauffeur, admin) n'est
// téléchargé que s'il est utilisé.
const Connexion = lazy(() => import('./pages/auth/Connexion'))
const InscriptionPassager = lazy(() => import('./pages/auth/InscriptionPassager'))
const PreInscriptionChauffeur = lazy(() => import('./pages/auth/PreInscriptionChauffeur'))
const MotDePasseOublie = lazy(() => import('./pages/auth/MotDePasseOublie'))
const ChangerMotDePasse = lazy(() => import('./pages/auth/ChangerMotDePasse'))
const CompleterDossier = lazy(() => import('./pages/auth/CompleterDossier'))

const TableauDeBordPassager = lazy(() => import('./pages/passager/TableauDeBord'))
const Reservation = lazy(() => import('./pages/passager/Reservation'))
const SuiviCourse = lazy(() => import('./pages/passager/SuiviCourse'))
const Paiement = lazy(() => import('./pages/passager/Paiement'))
const Notation = lazy(() => import('./pages/passager/Notation'))
const Historique = lazy(() => import('./pages/passager/Historique'))
const ProfilPassager = lazy(() => import('./pages/passager/Profil'))

const TableauDeBordChauffeur = lazy(() => import('./pages/chauffeur/TableauDeBord'))
const CourseEnCours = lazy(() => import('./pages/chauffeur/CourseEnCours'))
const Portefeuille = lazy(() => import('./pages/chauffeur/Portefeuille'))
const Revenus = lazy(() => import('./pages/chauffeur/Revenus'))
const Documents = lazy(() => import('./pages/chauffeur/Documents'))
const ProfilChauffeur = lazy(() => import('./pages/chauffeur/Profil'))
const ConfirmationPaiement = lazy(() => import('./pages/chauffeur/ConfirmationPaiement'))

const TableauDeBordAdmin = lazy(() => import('./pages/admin/TableauDeBord'))
const ChauffeursAdmin = lazy(() => import('./pages/admin/Chauffeurs'))
const PassagersAdmin = lazy(() => import('./pages/admin/Passagers'))
const CoursesAdmin = lazy(() => import('./pages/admin/Courses'))
const PaiementsAdmin = lazy(() => import('./pages/admin/Paiements'))
const ParametresAdmin = lazy(() => import('./pages/admin/Parametres'))

const SuiviPartage = lazy(() => import('./pages/public/SuiviPartage'))
const MentionsLegales = lazy(() => import('./pages/public/MentionsLegales'))
const PageIntrouvable = lazy(() => import('./pages/public/PageIntrouvable'))

const Chargement = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1220' }}>
    <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
  </div>
)

// Utilisateur déjà connecté → directement dans son espace
const Accueil = () => {
  const session = lireSession()
  return session ? <Navigate to={accueilPourRole(session.role)} replace /> : <Connexion />
}

const P = ({ children }) => <RouteProtegee role="PASSAGER">{children}</RouteProtegee>
const C = ({ children }) => <RouteProtegee role="CHAUFFEUR">{children}</RouteProtegee>
const A = ({ children }) => <RouteProtegee role="ADMIN">{children}</RouteProtegee>

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<Chargement />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Accueil />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<InscriptionPassager />} />
        <Route path="/devenir-chauffeur" element={<PreInscriptionChauffeur />} />
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
        <Route path="/changer-mot-de-passe" element={<ChangerMotDePasse />} />
        <Route path="/completer-dossier" element={<CompleterDossier />} />
        <Route path="/suivi/:token" element={<SuiviPartage />} />
        <Route path="/legal/:type" element={<MentionsLegales />} />

        {/* Passager */}
        <Route path="/passager" element={<P><TableauDeBordPassager /></P>} />
        <Route path="/passager/reservation" element={<P><Reservation /></P>} />
        <Route path="/passager/suivi" element={<P><SuiviCourse /></P>} />
        <Route path="/passager/paiement" element={<P><Paiement /></P>} />
        <Route path="/passager/notation" element={<P><Notation /></P>} />
        <Route path="/passager/historique" element={<P><Historique /></P>} />
        <Route path="/passager/profil" element={<P><ProfilPassager /></P>} />

        {/* Chauffeur */}
        <Route path="/chauffeur" element={<C><TableauDeBordChauffeur /></C>} />
        <Route path="/chauffeur/course" element={<C><CourseEnCours /></C>} />
        <Route path="/chauffeur/portefeuille" element={<C><Portefeuille /></C>} />
        <Route path="/chauffeur/revenus" element={<C><Revenus /></C>} />
        <Route path="/chauffeur/documents" element={<C><Documents /></C>} />
        <Route path="/chauffeur/profil" element={<C><ProfilChauffeur /></C>} />
        <Route path="/chauffeur/confirmation" element={<C><ConfirmationPaiement /></C>} />

        {/* Admin */}
        <Route path="/admin" element={<A><TableauDeBordAdmin /></A>} />
        <Route path="/admin/chauffeurs" element={<A><ChauffeursAdmin /></A>} />
        <Route path="/admin/passagers" element={<A><PassagersAdmin /></A>} />
        <Route path="/admin/courses" element={<A><CoursesAdmin /></A>} />
        <Route path="/admin/paiements" element={<A><PaiementsAdmin /></A>} />
        <Route path="/admin/parametres" element={<A><ParametresAdmin /></A>} />

        <Route path="*" element={<PageIntrouvable />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)

export default App
