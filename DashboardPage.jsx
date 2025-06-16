
// src/pages/DashboardPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <header className="text-center mb-12 pt-8">
          <div className="mb-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600 mb-4">
              Bienvenido a NutraOp IA
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-green-500 mx-auto rounded-full"></div>
          </div>
          
          <p className="text-xl sm:text-2xl text-slate-700 font-medium mb-2">
            Potencia Tu Práctica Clínica con Inteligencia Artificial
          </p>
          
          {currentUser && (
            <p className="text-lg text-slate-600">
              Hola, <span className="font-semibold text-blue-600">{currentUser.email}</span>
            </p>
          )}
        </header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          
          {/* Introductory Section */}
          <section className="bg-white rounded-2xl shadow-xl p-8 mb-10 border border-slate-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                Revoluciona la Nutrición Clínica
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed max-w-4xl mx-auto">
                NutraOp IA está diseñada específicamente para enfocar al paciente en el ámbito de la 
                <span className="font-semibold text-blue-600"> nutrición clínica</span>. Nuestra plataforma 
                te ayuda a establecer <span className="font-semibold text-green-600">diagnósticos precisos</span> y 
                <span className="font-semibold text-green-600"> planes de manejo adecuados</span> de manera más 
                eficiente y confiable que nunca.
              </p>
            </div>
          </section>

          {/* Key Features Section */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-slate-800 text-center mb-8">
              Características Clave de NutraOp IA
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Feature 1 */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3 text-center">
                  Información Relevante
                </h4>
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                  Recopila y organiza datos clínicos del paciente de manera estructurada para decisiones informadas.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3 text-center">
                  Escalas de Riesgo
                </h4>
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                  Integra escalas de riesgo avaladas por estudios científicos para evaluaciones precisas.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3 text-center">
                  Calculadoras Especializadas
                </h4>
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                  Calculadoras avanzadas de gasto calórico y proteico adaptadas a diferentes condiciones clínicas.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3 text-center">
                  Inteligencia Artificial
                </h4>
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                  IA especializada que hace el manejo de pacientes más rápido, certero y basado en evidencia.
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action Section */}
          <section className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl shadow-2xl p-8 text-white">
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Comienza a Transformar Tu Práctica Clínica
              </h3>
              <p className="text-lg opacity-90 max-w-2xl mx-auto">
                Accede a herramientas de vanguardia para mejorar la atención nutricional de tus pacientes
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/nueva-valoracion" 
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center text-lg min-w-[200px] justify-center"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Iniciar Nueva Valoración
              </Link>
              
              <Link 
                to="/valoraciones-guardadas" 
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center text-lg min-w-[200px] justify-center"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver Mis Valoraciones
              </Link>
            </div>
          </section>

          {/* Quick Stats or Additional Info */}
          <section className="mt-10 bg-slate-50 rounded-xl p-6 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">⚡</div>
                <h4 className="text-lg font-semibold text-slate-800 mb-1">Diagnósticos Rápidos</h4>
                <p className="text-sm text-slate-600">Reduce el tiempo de evaluación nutricional</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">🎯</div>
                <h4 className="text-lg font-semibold text-slate-800 mb-1">Precisión Clínica</h4>
                <p className="text-sm text-slate-600">Basado en evidencia científica actual</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">📊</div>
                <h4 className="text-lg font-semibold text-slate-800 mb-1">Seguimiento Integral</h4>
                <p className="text-sm text-slate-600">Monitoreo continuo de la evolución</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
