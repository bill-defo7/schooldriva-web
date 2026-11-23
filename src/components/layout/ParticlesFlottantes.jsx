const PARTICULES = [
  { type: 'texte', contenu: 'SchoolDriva', taille: 42 },
  { type: 'cercle', taille: 36 },
  { type: 'carre', taille: 30 },
  { type: 'losange', taille: 36 },
  { type: 'cercle', taille: 24 },
  { type: 'carre', taille: 42 },
  { type: 'losange', taille: 27 },
  { type: 'texte', contenu: 'SchoolDriva', taille: 39 },
  { type: 'cercle', taille: 30 },
  { type: 'carre', taille: 24 },
  { type: 'losange', taille: 33 },
  { type: 'cercle', taille: 42 },
  { type: 'texte', contenu: 'SchoolDriva', taille: 33 },
  { type: 'carre', taille: 36 },
  { type: 'losange', taille: 39 },
]

// Positions tirées une seule fois au chargement (pas à chaque rendu :
// sinon les particules « sautent » à chaque mise à jour de la page)
const POSITIONS = PARTICULES.map((_, i) => (i * 5.5 + Math.random() * 5) % 100)

const ParticlesFlottantes = () => {
  return (
    <div className="fixed inset-0 z-1 pointer-events-none overflow-hidden">
      {PARTICULES.map((p, i) => {
        const left = POSITIONS[i]
        const delay = (i * 1.3) % 18
        const duration = 14 + (i % 7) * 2
        const opacity = 0.06 + (i % 4) * 0.03

        return (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${left}%`,
              animation: `monterParticule ${duration}s ${delay}s linear infinite`,
              opacity,
            }}
          >
            {p.type === 'texte' && (
              <span
                style={{
                  fontSize: p.taille,
                  fontWeight: 900,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.3px',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
              >
                <span style={{ color: 'white' }}>School</span>
                <span style={{ color: '#F97316' }}>Driva</span>
              </span>
            )}
            {p.type === 'cercle' && (
              <div
                style={{
                  width: p.taille,
                  height: p.taille,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  animation: `tournerParticule ${duration}s ${delay}s linear infinite`,
                }}
              />
            )}
            {p.type === 'carre' && (
              <div
                style={{
                  width: p.taille,
                  height: p.taille,
                  border: '1.5px solid rgba(249,115,22,0.6)',
                  animation: `tournerParticule ${duration}s ${delay}s linear infinite`,
                }}
              />
            )}
            {p.type === 'losange' && (
              <div
                style={{
                  width: p.taille,
                  height: p.taille,
                  border: '1.5px solid rgba(37,99,235,0.6)',
                  animation: `tournerParticule ${duration}s ${delay}s linear infinite`,
                }}
              />
            )}
          </div>
        )
      })}

      <style>{`
        @keyframes monterParticule {
          0%   { transform: translateY(0); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateY(-110vh); opacity: 0; }
        }
        @keyframes tournerParticule {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default ParticlesFlottantes