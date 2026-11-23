import { useEffect, useState } from 'react'
import { apiCall } from '../utils/api'

/**
 * Tracé routier départ → arrivée d'une course (calculé par le serveur,
 * déjà en cache depuis la réservation). Renvoie null tant qu'il n'est pas chargé.
 */
export function useItineraireCourse(courseId) {
  const [itineraire, setItineraire] = useState(null)

  useEffect(() => {
    if (!courseId) return
    let actif = true
    apiCall(`/api/courses/${courseId}/itineraire`)
      .then(it => { if (actif) setItineraire({ ...it, courseId }) })
      .catch(() => {})
    return () => { actif = false }
  }, [courseId])

  return itineraire && itineraire.courseId === courseId ? itineraire : null
}
