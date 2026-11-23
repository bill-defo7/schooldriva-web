import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LayoutAdmin from '../../components/layout/LayoutAdmin'
import { apiCall, formatFcfa, formatDate } from '../../utils/api'
import { useCouleurs, useDonnees, PageAdmin, Carte, Stat, Badge, Bouton, Message, Vide } from '../../components/admin/ui'

const point = (couleur) => L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${couleur};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7], className: '',
})
const ICONE_DEPART = point('#2563EB')
const ICONE_CHAUFFEUR = point('#EA580C')
const EN_COURS = ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVEE', 'DEMARREE']

const TableauDeBord = () => {
  const c = useCouleurs()
  const navigate = useNavigate()

  const { donnees: d, erreur, chargement, recharger } = useDonnees(async () => {
    const [stats, finances, courses, journal] = await Promise.all([
      apiCall('/api/admin/dashboard-stats'),
      apiCall('/api/paiements/admin/stats').catch(() => null),
      apiCall('/api/courses/admin').catch(() => []),
      apiCall('/api/admin/journal').catch(() => []),
    ])
    // Courses des 7 derniers jours, jour par jour
    const jours = [...Array(7)].map((_, i) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - i))
      return date
    })
    const parJour = jours.map(j => {
      const fin = new Date(j); fin.setDate(fin.getDate() + 1)
      const duJour = courses.filter(co => { const t = new Date(co.createdAt); return t >= j && t < fin })
      return {
        label: j.toLocaleDateString('fr-FR', { weekday: 'short' }),
        total: duJour.length,
        terminees: duJour.filter(co => co.statut === 'TERMINEE').length,
      }
    })
    return { stats, finances, enCours: courses.filter(co => EN_COURS.includes(co.statut)), parJour, journal: journal.slice(0, 8) }
  })

  // Rafraîchissement automatique toutes les 30 s (courses en cours, positions)
  useEffect(() => {
    const t = setInterval(recharger, 30000)
    return () => clearInterval(t)
  }, [recharger])

  const alertes = d ? [
    d.stats.nbChauffeursEnAttente > 0 && { texte: `${d.stats.nbChauffeursEnAttente} dossier(s) chauffeur à valider`, lien: '/admin/chauffeurs' },
    d.stats.nbDocumentsEnAttente > 0 && { texte: `${d.stats.nbDocumentsEnAttente} document(s) à vérifier`, lien: '/admin/chauffeurs' },
    d.finances?.nbRechargesEnAttente > 0 && { texte: `${d.finances.nbRechargesEnAttente} recharge(s) en attente`, lien: '/admin/paiements' },
  ].filter(Boolean) : []
  const maxJour = d ? Math.max(1, ...d.parJour.map(j => j.total)) : 1
  const centre = d?.enCours.find(co => co.departLat)
  const centreCarte = centre ? [Number(centre.departLat), Number(centre.departLng)] : [3.848, 11.502]

  return (
    <LayoutAdmin>
      <PageAdmin titre="Tableau de bord" sousTitre={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                 actions={<Bouton variante="contour" onClick={recharger}>Actualiser</Bouton>}>
        <Message>{erreur}</Message>
        {chargement && !d && <Vide>Chargement...</Vide>}
        {d && (
          <>
            {alertes.length > 0 && (
              <Carte className="p-4" style={{ borderColor: '#FECACA' }}>
                <div className="text-xs font-black uppercase mb-2" style={{ color: '#DC2626' }}>Action requise</div>
                <div className="flex flex-wrap gap-2">
                  {alertes.map(a => <Bouton key={a.texte} variante="danger" onClick={() => navigate(a.lien)}>{a.texte} →</Bouton>)}
                </div>
              </Carte>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Chauffeurs en ligne" valeur={d.stats.nbChauffeursEnLigne} couleur="#EA580C" sous={`${d.stats.nbChauffeursActifs} actifs sur ${d.stats.nbChauffeursTotal}`} />
              <Stat label="Passagers actifs" valeur={d.stats.nbPassagersActifs} couleur="#EAB308" sous={`${d.stats.nbPassagersTotal} inscrits`} />
              <Stat label="Courses en cours" valeur={d.enCours.length} couleur="#2563EB" />
              <Stat label="Commissions encaissées" valeur={formatFcfa(d.finances?.totalCommissions)} couleur="#16A34A" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Carte className="lg:col-span-2 overflow-hidden" style={{ minHeight: 340 }}>
                <MapContainer center={centreCarte} zoom={13} style={{ height: 340, width: '100%' }}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {d.enCours.filter(co => co.departLat).map(co => (
                    <Marker key={`d${co.id}`} position={[Number(co.departLat), Number(co.departLng)]} icon={ICONE_DEPART}>
                      <Popup>Course #{co.id} — départ<br />{co.departAdresse} → {co.arriveeAdresse}</Popup>
                    </Marker>
                  ))}
                  {d.enCours.filter(co => co.chauffeurLat).map(co => (
                    <Marker key={`c${co.id}`} position={[Number(co.chauffeurLat), Number(co.chauffeurLng)]} icon={ICONE_CHAUFFEUR}>
                      <Popup>Chauffeur — course #{co.id}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </Carte>
              <Carte className="overflow-hidden flex flex-col">
                <div className="px-5 py-4 font-black" style={{ color: c.textPrimary, borderBottom: `1px solid ${c.border}` }}>Courses en cours</div>
                <div className="flex-1 overflow-y-auto max-h-64">
                  {d.enCours.length === 0 && <Vide>Aucune course en cours.</Vide>}
                  {d.enCours.slice(0, 8).map(co => (
                    <div key={co.id} className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${c.border}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: c.textPrimary }}>#{co.id} → {co.arriveeAdresse}</div>
                        <div className="text-xs" style={{ color: c.textSecondary }}>{formatDate(co.createdAt)}</div>
                      </div>
                      <Badge statut={co.statut} />
                    </div>
                  ))}
                </div>
                <Bouton variante="doux" className="m-3" onClick={() => navigate('/admin/courses')}>Toutes les courses</Bouton>
              </Carte>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Carte className="p-5">
                <div className="font-black mb-4" style={{ color: c.textPrimary }}>Courses des 7 derniers jours</div>
                <div className="flex items-end gap-3 h-40">
                  {d.parJour.map(j => (
                    <div key={j.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-xs font-bold" style={{ color: c.textPrimary }}>{j.total}</span>
                      <div className="w-full rounded-t-lg relative" style={{ height: `${(j.total / maxJour) * 100}%`, minHeight: 4, background: '#BFDBFE' }}>
                        <div className="absolute bottom-0 w-full rounded-t-lg" style={{ height: j.total ? `${(j.terminees / j.total) * 100}%` : 0, background: '#2563EB' }} />
                      </div>
                      <span className="text-xs" style={{ color: c.textSecondary }}>{j.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs mt-3" style={{ color: c.textSecondary }}>Bleu foncé : terminées · bleu clair : autres</div>
              </Carte>
              <Carte className="overflow-hidden">
                <div className="px-5 py-4 font-black" style={{ color: c.textPrimary, borderBottom: `1px solid ${c.border}` }}>Activité récente des admins</div>
                {d.journal.length === 0 && <Vide>Aucune action récente.</Vide>}
                {d.journal.map(j => (
                  <div key={j.id} className="px-5 py-2.5" style={{ borderBottom: `1px solid ${c.border}` }}>
                    <div className="text-sm" style={{ color: c.textPrimary }}>{j.action}</div>
                    <div className="text-xs" style={{ color: c.textSecondary }}>{j.admin} · {formatDate(j.createdAt)}</div>
                  </div>
                ))}
              </Carte>
            </div>

            {d.finances && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Stat label="Recharges validées (total)" valeur={formatFcfa(d.finances.totalRecharges)} couleur="#16A34A" />
                <Stat label="Recharges en attente" valeur={d.finances.nbRechargesEnAttente} couleur="#EA580C" />
                <Stat label="Soldes cumulés des chauffeurs" valeur={formatFcfa(d.finances.soldeCumuleChauffeurs)} couleur="#2563EB" />
              </div>
            )}
          </>
        )}
      </PageAdmin>
    </LayoutAdmin>
  )
}

export default TableauDeBord
