import { useNavigate, useParams } from 'react-router-dom'
import { EMAIL_SUPPORT } from '../../config/api'

const CONTENUS = {
  conditions: {
    titre: 'Conditions d’utilisation',
    sections: [
      ['Objet', 'School Driva met en relation des passagers, principalement étudiants, avec des chauffeurs indépendants vérifiés, au Cameroun.'],
      ['Comptes', 'Chaque utilisateur est responsable de la confidentialité de ses identifiants. Les chauffeurs sont activés après vérification de leurs documents.'],
      ['Prix et paiement', 'Le prix est estimé avant la réservation et calculé par la plateforme. Le passager paie le chauffeur en espèces ou par Mobile Money. Une commission est prélevée sur le portefeuille du chauffeur.'],
      ['Annulation', 'Le passager peut annuler tant que le trajet n’a pas démarré. Une course sans chauffeur est annulée automatiquement après quelques minutes.'],
      ['Comportement', 'Tout comportement dangereux ou frauduleux peut entraîner le blocage du compte.'],
    ],
  },
  confidentialite: {
    titre: 'Politique de confidentialité',
    sections: [
      ['Données collectées', 'Identité, téléphone, email, ville, historique des courses et, pendant une course, la position du chauffeur. Pour les chauffeurs : documents d’identité et du véhicule.'],
      ['Utilisation', 'Ces données servent uniquement au fonctionnement du service : mise en relation, sécurité des trajets, paiement et support.'],
      ['Partage', 'Le téléphone du passager n’est communiqué qu’au chauffeur qui a accepté sa course. Un lien de suivi partagé n’affiche ni téléphone ni identifiant et cesse d’afficher la position à la fin du trajet.'],
      ['Sécurité', 'Mots de passe chiffrés, accès limités par rôle, documents accessibles aux seuls administrateurs.'],
      ['Vos droits', `Pour consulter ou supprimer vos données, écrivez à ${EMAIL_SUPPORT}.`],
    ],
  },
}

const MentionsLegales = () => {
  const { type } = useParams()
  const navigate = useNavigate()
  const contenu = CONTENUS[type] || CONTENUS.conditions
  return (
    <div className="min-h-screen px-4 py-10" style={{ background: '#F0F4F8' }}>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow">
        <button onClick={() => navigate(-1)} className="text-sm font-bold mb-6" style={{ color: '#EA580C' }}>← Retour</button>
        <h1 className="text-2xl font-black text-gray-900 mb-6">{contenu.titre}</h1>
        {contenu.sections.map(([titre, texte]) => (
          <section key={titre} className="mb-5">
            <h2 className="font-bold text-gray-900 mb-1">{titre}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{texte}</p>
          </section>
        ))}
        <p className="text-xs text-gray-400 mt-8">Contact : {EMAIL_SUPPORT}</p>
      </div>
    </div>
  )
}

export default MentionsLegales
