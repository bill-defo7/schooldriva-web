import TopbarChauffeur from './TopbarChauffeur'
import FooterChauffeur from './FooterChauffeur'
import { useTheme } from '../../context/ThemeContext'
import { useChauffeur } from '../../context/ChauffeurContext'

const LayoutChauffeur = ({ children }) => {
  const { modeNuit } = useTheme()
  const { enLigne, basculerEnLigne, chargement, erreur } = useChauffeur()

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        background: modeNuit ? '#0F172A' : '#FFF7ED',
        color: modeNuit ? '#F1F5F9' : '#111827'
      }}
    >
      <TopbarChauffeur enLigne={enLigne} onToggle={basculerEnLigne} chargement={chargement} erreur={erreur} />
      <main className="pt-14 flex-1">
        {children}
      </main>
      <FooterChauffeur />
    </div>
  )
}

export default LayoutChauffeur