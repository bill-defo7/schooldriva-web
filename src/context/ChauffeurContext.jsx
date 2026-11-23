import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { lireSession } from '../utils/session'
import { apiCall } from '../utils/api'

const ChauffeurContext = createContext()

export const ChauffeurProvider = ({ children }) => {
  const [enLigne, setEnLigne] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(null)

  // Relit le statut réel côté serveur (appelé au chargement et à l'ouverture du tableau de bord,
  // car le fournisseur est monté avant la connexion)
  const rafraichir = useCallback(() => {
    const session = lireSession()
    if (!session || session.role !== 'CHAUFFEUR') return
    apiCall('/api/chauffeurs/mon-profil')
      .then(profil => setEnLigne(!!profil.enLigne))
      .catch(() => {})
  }, [])

  useEffect(() => { rafraichir() }, [rafraichir])

  const basculerEnLigne = async () => {
    const nouveauStatut = !enLigne
    setChargement(true)
    setErreur(null)
    try {
      await apiCall(`/api/chauffeurs/statut-ligne?enLigne=${nouveauStatut}`, {
        method: 'PUT',
      })
      setEnLigne(nouveauStatut)
    } catch (e) {
      setErreur(e.message || 'Impossible de changer de statut')
    } finally {
      setChargement(false)
    }
  }

  return (
    <ChauffeurContext.Provider value={{ enLigne, basculerEnLigne, chargement, erreur, rafraichir }}>
      {children}
    </ChauffeurContext.Provider>
  )
}

export const useChauffeur = () => useContext(ChauffeurContext)