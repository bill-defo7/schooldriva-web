import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LayoutAdmin from '../../components/layout/LayoutAdmin'
import { apiCall, formatFcfa, formatDate } from '../../utils/api'
import {
  useCouleurs, useDonnees, useAction, PageAdmin, Carte, Stat, Badge, Bouton, Modal,
  Filtres, Recherche, Champ, Message, Vide, Ligne,
} from '../../components/admin/ui'

const FILTRES = { Tous: null, Actifs: 'ACTIF', Bloqués: 'BLOQUE' }

const Passagers = () => {
  const c = useCouleurs()
  const [filtre, setFiltre] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState(null)

  const { donnees, erreur, chargement, recharger } = useDonnees(async () => {
    const [passagers, courses] = await Promise.all([
      apiCall('/api/passagers/admin/liste'),
      apiCall('/api/courses/admin').catch(() => []),
    ])
    // Statistiques par passager calculées à partir de ses courses réelles
    return passagers.map(p => {
      const siennes = courses.filter(co => co.passagerId === p.id)
      const terminees = siennes.filter(co => co.statut === 'TERMINEE')
      return {
        ...p,
        nbCourses: terminees.length,
        totalDepense: terminees.reduce((s, co) => s + Number(co.prixFinal || 0), 0),
        derniereCourse: siennes[0]?.createdAt,
      }
    })
  })
  const liste = useMemo(() => donnees || [], [donnees])
  const filtres = liste.filter(p => {
    const q = recherche.toLowerCase()
    return (!FILTRES[filtre] || p.statut === FILTRES[filtre]) && (!q
      || `${p.prenom} ${p.nom}`.toLowerCase().includes(q) || (p.telephone || '').includes(q)
      || (p.email || '').toLowerCase().includes(q))
  })

  return (
    <LayoutAdmin>
      <PageAdmin titre="Passagers" sousTitre={`${liste.length} passager(s) inscrit(s)`}
                 actions={<Bouton variante="contour" onClick={recharger}>Actualiser</Bouton>}>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total" valeur={liste.length} couleur="#2563EB" />
          <Stat label="Actifs" valeur={liste.filter(p => p.statut === 'ACTIF').length} couleur="#16A34A" />
          <Stat label="Bloqués" valeur={liste.filter(p => p.statut === 'BLOQUE').length} couleur="#DC2626" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Filtres options={Object.keys(FILTRES)} actif={filtre} onChange={setFiltre} />
          <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom, téléphone, email..." />
        </div>
        <Message>{erreur}</Message>
        <Carte className="overflow-hidden">
          {chargement && !donnees && <Vide>Chargement...</Vide>}
          {!chargement && filtres.length === 0 && <Vide>Aucun passager ne correspond.</Vide>}
          {filtres.map((p, i) => (
            <button key={p.id} onClick={() => setSelection(p)}
                    className="w-full text-left flex items-center gap-4 px-5 py-4 hover:opacity-80"
                    style={{ borderBottom: i < filtres.length - 1 ? `1px solid ${c.border}` : 'none' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ background: '#1E3A8A' }}>
                {p.prenom?.[0]}{p.nom?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm truncate" style={{ color: c.textPrimary }}>{p.prenom} {p.nom}</div>
                <div className="text-xs truncate" style={{ color: c.textSecondary }}>{p.email} · {p.telephone}</div>
              </div>
              <div className="hidden md:flex gap-6 text-center">
                <div><div className="text-sm font-black" style={{ color: '#EA580C' }}>{p.nbCourses}</div><div className="text-xs" style={{ color: c.textSecondary }}>courses</div></div>
                <div><div className="text-sm font-black" style={{ color: '#16A34A' }}>{formatFcfa(p.totalDepense)}</div><div className="text-xs" style={{ color: c.textSecondary }}>dépensé</div></div>
              </div>
              <Badge statut={p.statut} />
            </button>
          ))}
        </Carte>
      </PageAdmin>
      {selection && <FichePassager passager={selection} onFermer={() => setSelection(null)} onChange={recharger} />}
    </LayoutAdmin>
  )
}

const FichePassager = ({ passager, onFermer, onChange }) => {
  const c = useCouleurs()
  const navigate = useNavigate()
  const [statut, setStatut] = useState(passager.statut)
  const [message, setMessageForm] = useState(null)
  const action = useAction()

  const basculer = async () => {
    const verbe = statut === 'ACTIF' ? 'bloquer' : 'debloquer'
    const r = await action.executer(() => apiCall(`/api/auth/admin/passagers/${passager.id}/${verbe}`, { method: 'PUT' }),
      statut === 'ACTIF' ? 'Passager bloqué' : 'Passager débloqué')
    if (r !== undefined) { setStatut(statut === 'ACTIF' ? 'BLOQUE' : 'ACTIF'); onChange() }
  }

  const envoyer = async () => {
    const r = await action.executer(() => apiCall(`/api/admin/passagers/${passager.id}/message`, {
      method: 'POST', body: JSON.stringify(message),
    }), res => res.emailEnvoye ? 'Message envoyé par email' : "Email non configuré : le message n'a pas pu partir")
    if (r !== undefined) setMessageForm(null)
  }

  return (
    <Modal titre={`${passager.prenom} ${passager.nom}`} couleur="#1E3A8A" onFermer={onFermer}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: c.textSecondary }}>Inscrit le {formatDate(passager.createdAt, false)}</span>
          <Badge statut={statut} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Ligne label="Email" valeur={passager.email} />
          <Ligne label="Téléphone" valeur={passager.telephone} />
          <Ligne label="Ville" valeur={passager.villeNom} />
          <Ligne label="Dernière course" valeur={passager.derniereCourse ? formatDate(passager.derniereCourse) : 'Aucune'} />
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: c.subtleBg }}>
          <div className="text-center"><div className="text-xl font-black" style={{ color: '#EA580C' }}>{passager.nbCourses}</div><div className="text-xs" style={{ color: c.textSecondary }}>Courses terminées</div></div>
          <div className="text-center"><div className="text-xl font-black" style={{ color: '#16A34A' }}>{formatFcfa(passager.totalDepense)}</div><div className="text-xs" style={{ color: c.textSecondary }}>Total dépensé</div></div>
        </div>
        <Message type={action.message?.type}>{action.message?.texte}</Message>
        <Bouton variante={statut === 'ACTIF' ? 'danger' : 'succes'} className="w-full py-3" disabled={action.enCours} onClick={basculer}>
          {statut === 'ACTIF' ? 'Bloquer ce passager' : 'Débloquer ce passager'}
        </Bouton>
        {message === null ? (
          <Bouton variante="contour" className="w-full py-3" onClick={() => setMessageForm({ sujet: '', texte: '' })}>Envoyer un message</Bouton>
        ) : (
          <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: c.subtleBg }}>
            <Champ label="Sujet" value={message.sujet} onChange={e => setMessageForm({ ...message, sujet: e.target.value })} />
            <Champ label="Message" multiline value={message.texte} onChange={e => setMessageForm({ ...message, texte: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <Bouton variante="contour" onClick={() => setMessageForm(null)}>Annuler</Bouton>
              <Bouton variante="orange" disabled={!message.sujet.trim() || !message.texte.trim() || action.enCours} onClick={envoyer}>Envoyer</Bouton>
            </div>
          </div>
        )}
        <Bouton variante="contour" className="w-full py-3" onClick={() => navigate(`/admin/courses?passagerId=${passager.id}`)}>
          Voir l'historique des courses
        </Bouton>
      </div>
    </Modal>
  )
}

export default Passagers
