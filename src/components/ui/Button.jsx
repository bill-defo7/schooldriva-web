const Button = ({ children, onClick, variant = 'primary', type = 'button', disabled = false }) => {

  const styles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    orange: 'bg-orange-600 hover:bg-orange-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    ghost: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${styles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

export default Button