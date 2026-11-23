// Gestion centralisée de la session (token JWT + rôle) côté navigateur.

const CLES = ['token', 'role', 'userId', 'doitChangerMotDePasse']

export function enregistrerSession({ token, role, userId, doitChangerMotDePasse }) {
  localStorage.setItem('token', token)
  localStorage.setItem('role', role)
  localStorage.setItem('userId', String(userId))
  localStorage.setItem('doitChangerMotDePasse', doitChangerMotDePasse ? '1' : '0')
}

export function lireSession() {
  const token = localStorage.getItem('token')
  if (!token || tokenExpire(token)) return null
  return {
    token,
    role: localStorage.getItem('role'),
    userId: localStorage.getItem('userId'),
    doitChangerMotDePasse: localStorage.getItem('doitChangerMotDePasse') === '1',
  }
}

export function marquerMotDePasseChange() {
  localStorage.setItem('doitChangerMotDePasse', '0')
}

export function deconnecter() {
  CLES.forEach(c => localStorage.removeItem(c))
}

export function accueilPourRole(role) {
  if (role === 'PASSAGER') return '/passager'
  if (role === 'CHAUFFEUR') return '/chauffeur'
  if (role === 'ADMIN') return '/admin'
  return '/connexion'
}

// Lecture de la date d'expiration du JWT (sans vérifier la signature :
// c'est le serveur qui fait foi, ceci évite juste des appels voués à l'échec)
function tokenExpire(token) {
  try {
    const charge = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !charge.exp || charge.exp * 1000 < Date.now()
  } catch {
    return true
  }
}
