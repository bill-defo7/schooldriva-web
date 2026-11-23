import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LayoutAdmin from '../../components/layout/LayoutAdmin'
import { apiCall, formatFcfa, formatDate } from '../../utils/api'
import {
  useCouleurs, useDonnees, useAction, PageAdmin, Carte, Stat, Badge, Bouton, Modal,
  Filtres, Recherche, Message, Vide, Ligne,
} from '../../components/admin/ui'

const EN_COURS = ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVEE', 'DEMARREE']
const FILTRES = {
  Toutes: () => true,
  'En cours': co => EN_COURS.includes(co.statut),
  Terminées: co => co.statut === 'TERMINEE',
  Annulées: co => co.statut === 'ANNULEE',
}
const ANNULEE_PAR = { PASSAGER: 'le passager', CHAUFFEUR: 'le chauffeur', ADMIN: 'un administrateur', SYSTEME: 'le système (aucun chauffeur)' }

const Courses = () => {
  const c = useCouleurs()
  const [params, setParams] = useSearchParams()
  const filtreChauffeur = params.get('chauffeurId')
  const filtrePassager = params.get('passagerId')
  const [filtre, setFiltre] = useState('Toutes')
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState(null)

  const { donnees, erreur, chargement, recharger } = useDonnees(async () => {
    const [courses, paiements, chauffeurs, passagers] = await Promise.all([
      apiCall('/api/courses/admin'),
      apiCall('/api/courses/admin/paiements').catch(() => []),
      apiCall('/api/chauffeurs/admin/liste').catch(() => []),
      apiCall('/api/passagers/admin/liste').catch(() => []),
    ])
    const nomsC = Object.fromEntries(chauffeurs.map(x => [x.id, `${x.prenom} ${x.nom}`]))
    const nomsP = Object.fromEntries(passagers.map(x => [x.id, `${x.prenom} ${x.nom}`]))
    const paiementsParCourse = Object.fromEntries(paiements.map(p => [p.courseId, p]))
    return courses.map(co => ({
      ...co,
      chauffeurNom: co.chauffeurId ? (nomsC[co.chauffeurId] || `#${co.chauffeurId}`) : '—',
      passagerNom: nomsP[co.passagerId] || `#${co.passagerId}`,
      paiement: paiementsParCourse[co.id],
    }))
  })
  const liste = useMemo(() => (donnees || []).filter(co =>
    (!filtreChauffeur || String(co.chauffeurId) === filtreChauffeur)
    && (!filtrePassager || String(co.passagerId) === filtrePassager)), [donnees, filtreChauffeur, filtrePassager])

  const filtres = liste.filter(co => {
    const q = recherche.toLowerCase()
    return FILTRES[filtre](co) && (!q || String(co.id).includes(q)
      || co.passagerNom.toLowerCase().includes(q) || co.chauffeurNom.toLowerCase().includes(q)
      || (co.arriveeAdresse || '').toLowerCase().includes(q))
  })
  const commissions = liste.reduce((s, co) => s + (co.paiement?.statut === 'CONFIRME' ? Number(co.paiement.commission) : 0), 0)

  return (
    <LayoutAdmin>
      <PageAdmin titre="Courses" sousTitre={filtreChauffeur || filtrePassager ? 'Historique filtré' : `${liste.length} course(s)`}
                 actions={<div className="flex gap-2">
                   {(filtreChauffeur || filtrePassager) && <Bouton variante="doux" onClick={() => setParams({})}>Retirer le filtre</Bouton>}
                   <Bouton variante="contour" onClick={recharger}>Actualiser</Bouton>
                 </div>}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total" valeur={liste.length} couleur="#2563EB" />
          <Stat label="En cours" valeur={liste.filter(FILTRES['En cours']).length} couleur="#EA580C" />
          <Stat label="Terminées" valeur={liste.filter(FILTRES.Terminées).length} couleur="#16A34A" />
          <Stat label="Commissions encaissées" valeur={formatFcfa(commissions)} couleur="#7C3AED" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Filtres options={Object.keys(FILTRES)} actif={filtre} onChange={setFiltre} />
          <Recherche valeur={recherche} onChange={setRecherche} placeholder="N°, passager, chauffeur, destination..." />
        </div>
        <Message>{erreur}</Message>
        <Carte className="overflow-hidden">
          {chargement && !donnees && <Vide>Chargement...</Vide>}
          {!chargement && filtres.length === 0 && <Vide>Aucune course.</Vide>}
          {filtres.map((co, i) => (
            <button key={co.id} onClick={() => setSelection(co)} className="w-full text-left flex items-center gap-4 px-5 py-4 hover:opacity-80"
                    style={{ borderBottom: i < filtres.length - 1 ? `1px solid ${c.border}` : 'none' }}>
              <div className="text-xs font-black w-12" style={{ color: c.textSecondary }}>#{co.id}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: c.textPrimary }}>{co.departAdresse} → {co.arriveeAdresse}</div>
                <div className="text-xs truncate" style={{ color: c.textSecondary }}>{co.passagerNom} · {co.chauffeurNom} · {formatDate(co.createdAt)}</div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-sm font-black" style={{ color: '#EA580C' }}>{formatFcfa(co.prixFinal ?? co.prixEstime)}</div>
                {co.paiement && <div className="text-xs" style={{ color: c.textSecondary }}>commission {formatFcfa(co.paiement.commission)}</div>}
              </div>
              <Badge statut={co.statut} />
            </button>
          ))}
        </Carte>
      </PageAdmin>
      {selection && <DetailCourse course={selection} onFermer={() => setSelection(null)} onChange={recharger} />}
    </LayoutAdmin>
  )
}

const DetailCourse = ({ course, onFermer, onChange }) => {
  const [statut, setStatut] = useState(course.statut)
  const [confirmer, setConfirmer] = useState(false)
  const action = useAction()
  const annuler = async () => {
    const r = await action.executer(() => apiCall(`/api/courses/admin/${course.id}/annuler`, { method: 'PUT' }), 'Course annulée')
    if (r !== undefined) { setStatut('ANNULEE'); setConfirmer(false); onChange() }
  }
  const p = course.paiement
  return (
    <Modal titre={`Course #${course.id}`} onFermer={onFermer} large>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end"><Badge statut={statut} /></div>
        <div className="grid grid-cols-2 gap-4">
          <Ligne label="Passager" valeur={course.passagerNom} />
          <Ligne label="Chauffeur" valeur={course.chauffeurNom} />
          <Ligne label="Départ" valeur={course.departAdresse} />
          <Ligne label="Destination" valeur={course.arriveeAdresse} />
          <Ligne label="Véhicule" valeur={course.typeVehicule === 'MOTO' ? 'Moto' : 'Voiture'} />
          <Ligne label="Distance" valeur={course.distanceKm ? `${course.distanceKm} km` : null} />
          <Ligne label="Durée" valeur={course.dureeMin != null ? `${course.dureeMin} min` : null} />
          <Ligne label="Créée le" valeur={formatDate(course.createdAt)} />
          <Ligne label="Prix" valeur={formatFcfa(course.prixFinal ?? course.prixEstime)} />
          <Ligne label="Paiement" valeur={p ? `${p.mode} · ${p.statut === 'CONFIRME' ? 'confirmé' : 'en attente'}` : 'Non déclaré'} />
          {p && <Ligne label="Commission" valeur={formatFcfa(p.commission)} />}
          {p && <Ligne label="Gain chauffeur" valeur={formatFcfa(p.gainChauffeur)} />}
          {course.annuleePar && <Ligne label="Annulée par" valeur={ANNULEE_PAR[course.annuleePar] || course.annuleePar} />}
        </div>
        <Message type={action.message?.type}>{action.message?.texte}</Message>
        {EN_COURS.includes(statut) && (confirmer ? (
          <div className="flex gap-2">
            <Bouton variante="contour" className="flex-1" onClick={() => setConfirmer(false)}>Non</Bouton>
            <Bouton variante="danger" className="flex-1" disabled={action.enCours} onClick={annuler}>Oui, annuler la course</Bouton>
          </div>
        ) : (
          <Bouton variante="danger" className="w-full py-3" onClick={() => setConfirmer(true)}>Annuler cette course</Bouton>
        ))}
      </div>
    </Modal>
  )
}

export default Courses
