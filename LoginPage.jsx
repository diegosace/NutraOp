// src/pages/LoginPage.jsx
import React, { useState } from 'react';
// --- IMPORTANTE: VERIFICA ESTA RUTA ---
// Esta ruta asume que:
// 1. Este archivo (LoginPage.jsx) está en 'src/pages/'.
// 2. Tienes una carpeta 'context' directamente dentro de 'src/' (es decir, 'src/context/').
// 3. El archivo del contexto de autenticación se llama 'AuthContext.js' y está en 'src/context/'.
// Si tu estructura es diferente, ajusta la ruta de abajo.
import { useAuth } from '../context/AuthContext.jsx'; 
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/'); // Redirigir a la página principal después del inicio de sesión
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError(`Error al iniciar sesión. Verifica tus credenciales.`);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Iniciar Sesión
          </h2>
        </div>
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address-login" className="sr-only">Correo Electrónico</label>
              <input id="email-address-login" name="email" type="email" autoComplete="email" required 
                     value={email} onChange={(e) => setEmail(e.target.value)}
                     className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                     placeholder="Correo Electrónico" />
            </div>
            <div>
              <label htmlFor="password-login" className="sr-only">Contraseña</label>
              <input id="password-login" name="password" type="password" autoComplete="current-password" required 
                     value={password} onChange={(e) => setPassword(e.target.value)}
                     className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                     placeholder="Contraseña" />
            </div>
          </div>

          <div>
            <button type="submit" disabled={loading} 
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {loading ? 
                  <svg className="h-5 w-5 text-indigo-300 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                :
                  <svg className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 2a5 5 0 00-5 5v3a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 2a3 3 0 00-3 3v3h6V7a3 3 0 00-3-3z" />
                  </svg>
                }
              </span>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            ¿No tienes una cuenta? Crea una
          </Link>
        </div>
      </div>
    </div>
  );
}
