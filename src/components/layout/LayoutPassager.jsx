import TopbarPassager from './TopbarPassager'
import FooterPassager from './FooterPassager'
import { useTheme } from '../../context/ThemeContext'

const LayoutPassager = ({ children }) => {
  const { modeNuit } = useTheme()

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        background: modeNuit ? '#0F172A' : '#F0F4F8',
        color: modeNuit ? '#F1F5F9' : '#111827'
      }}
    >
      <TopbarPassager />
      <main className="pt-16 flex-1">
        {children}
      </main>
      <FooterPassager />
    </div>
  )
}

export default LayoutPassager