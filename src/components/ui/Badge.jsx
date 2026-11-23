const Badge = ({ children, variant = 'default' }) => {

  const styles = {
    default:  'bg-gray-100 text-gray-700',
    success:  'bg-green-100 text-green-600',
    warning:  'bg-yellow-100 text-yellow-600',
    danger:   'bg-red-100 text-red-600',
    primary:  'bg-blue-100 text-blue-600',
    orange:   'bg-orange-100 text-orange-600',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}

export default Badge