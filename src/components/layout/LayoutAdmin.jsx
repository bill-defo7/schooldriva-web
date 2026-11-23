import TopbarAdmin from './TopbarAdmin'
import FooterAdmin from './FooterAdmin'
import { useTheme } from '../../context/ThemeContext'

const LayoutAdmin = ({ children }) => {
  const { modeNuit } = useTheme()

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        background: modeNuit ? '#0F172A' : '#F1F5F9',
        color: modeNuit ? '#F1F5F9' : '#111827'
      }}
    >
      <TopbarAdmin />
      <main className="pt-14 flex-1">
        {children}
      </main>
      <FooterAdmin />
    </div>
  )
}

export default LayoutAdmin