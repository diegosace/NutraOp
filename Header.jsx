import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <nav className="bg-slate-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold hover:text-slate-300">
          NutraOp IA
        </Link>
        <div className="space-x-4">
          {currentUser ? (
            <>
              <span className="text-sm hidden sm:inline">
                Hola, {currentUser.email}
              </span>
              <Link 
                to="/valoraciones-guardadas" 
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm"
              >
                Mis Valoraciones
              </Link>
              <button 
                onClick={handleLogout} 
                className="bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-md transition-colors"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-slate-300 text-sm">
                Iniciar Sesión
              </Link>
              <Link to="/signup" className="hover:text-slate-300 text-sm">
                Crear Cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}