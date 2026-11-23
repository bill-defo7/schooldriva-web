import { API_BASE_URL } from '../config/api'
import { deconnecter, lireSession } from './session'

/**
 * Appel à l'API (via le gateway). Ajoute le token, décode le JSON, et
 * renvoie vers la connexion si la session a expiré (401).
 * Sur Render gratuit, le premier appel peut prendre ~1 min (réveil des services).
 */
export async function apiCall(endpoint, options = {}) {
  const session = lireSession()
  const estFormData = options.body instanceof FormData

  const headers = {
    ...(estFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(session && { Authorization: `Bearer ${session.token}` }),
    ...options.headers,
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
  } catch {
    throw new Error('Serveur injoignable. Vérifiez votre connexion (le serveur peut mettre une minute à démarrer).')
  }

  if (response.status === 401) {
    const avaitSession = !!localStorage.getItem('token')
    deconnecter()
    if (avaitSession && !window.location.pathname.startsWith('/connexion')) {
      window.location.assign('/connexion?expire=1')
    }
    throw new Error('Session expirée, veuillez vous reconnecter')
  }

  if (response.status === 204) return null

  const texte = await response.text()
  let data
  try {
    data = texte ? JSON.parse(texte) : null
  } catch {
    data = texte
  }

  if (!response.ok) {
    const message = (data && data.message)
      ? data.message
      : (typeof data === 'string' && data ? data : messageParDefaut(response.status))
    throw new Error(message)
  }

  return data
}

function messageParDefaut(statut) {
  if (statut === 403) return "Vous n'avez pas accès à cette action"
  if (statut === 404) return 'Ressource introuvable'
  if (statut >= 500) return 'Erreur du serveur, réessayez dans un instant'
  return 'Une erreur est survenue'
}

/** Télécharge un fichier protégé (ex : document chauffeur) et l'ouvre dans un onglet. */
export async function ouvrirFichierProtege(endpoint) {
  const session = lireSession()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: session ? { Authorization: `Bearer ${session.token}` } : {},
  })
  if (!response.ok) throw new Error("Impossible d'ouvrir ce fichier")
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const formatFcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`

export const formatDate = (iso, avecHeure = true) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return avecHeure
    ? d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
