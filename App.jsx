// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';

// --- IMPORTANTE: VERIFICA ESTAS RUTAS Y LA ESTRUCTURA DE CARPETAS ---
// Este archivo (App.jsx) DEBE estar en la carpeta: src/
// Debes tener una carpeta: src/pages/ que contenga NewAssessmentPage.jsx, LoginPage.jsx, SignUpPage.jsx
// Debes tener una carpeta: src/context/ que contenga AuthContext.js

import NewAssessmentPage from './pages/NewAssessmentPage.jsx'; 
import LoginPage from './pages/LoginPage.jsx'; 
import SignUpPage from './pages/SignUpPage.jsx';
import ViewAssessmentsPage from './pages/ViewAssessmentsPage.jsx';
import FollowUpAssessmentPagePlaceholder from './pages/FollowUpAssessmentPagePlaceholder.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { useAuth } from './context/AuthContext.jsx'; // Asegúrate que la extensión es .jsx

// Componente Layout para la barra de navegación
function Layout({ children }) {
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
    <>
      <nav className="bg-slate-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold hover:text-slate-300">NutraOp IA</Link>
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <Link 
                  to="/" 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-md transition-colors"
                >
                  Inicio
                </Link>
                <Link 
                  to="/nueva-valoracion" 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-md transition-colors"
                >
                  Nueva Valoración
                </Link>
                <Link 
                  to="/valoraciones-guardadas" 
                  className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm"
                >
                  Mis Valoraciones
                </Link>
                <span className="text-sm hidden sm:inline">Hola, {currentUser.email}</span>
                <button 
                  onClick={handleLogout} 
                  className="bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-md transition-colors"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-slate-300 text-sm">Iniciar Sesión</Link>
                <Link to="/signup" className="hover:text-slate-300 text-sm">Crear Cuenta</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="pt-2">{children}</main> 
    </>
  );
}

// Componente para proteger rutas
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth(); 

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children; 
}

function App() {
  return (
    <Router> 
      <Layout> 
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          {/* Ruta para nueva valoración */}
          <Route 
            path="/nueva-valoracion" 
            element={
              <ProtectedRoute>
                <NewAssessmentPage />
              </ProtectedRoute>
            } 
          />
          {/* Ruta para ver valoraciones */}
          <Route 
            path="/valoraciones-guardadas" 
            element={
              <ProtectedRoute>
                <ViewAssessmentsPage /> 
              </ProtectedRoute>
            } 
          />
          {/* Ruta para nueva valoración de seguimiento */}
          <Route 
            path="/nueva-valoracion-seguimiento/:patientDocumentNumber" 
            element={
              <ProtectedRoute>
                <FollowUpAssessmentPagePlaceholder />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} /> 
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;