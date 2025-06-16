// src/pages/NewAssessmentPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import GeneralDataModule from '../components/assessment/GeneralDataModule.jsx';
import SpecificCalculatorsModule from '../components/assessment/SpecificCalculatorsModule.jsx';
import SummaryModule from '../components/assessment/SummaryModule.jsx';
import { saveInitialAssessment } from '../services/assessmentService.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nutria-app';

// Función para limpiar valores undefined de objetos
const cleanUndefined = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};

export default function NewAssessmentPage() {
  const { currentUser } = useAuth();
  const [generalPatientData, setGeneralPatientData] = useState({});
  const [calculatorResults, setCalculatorResults] = useState({});
  const [diagnosisText, setDiagnosisText] = useState('');
  const [planText, setPlanText] = useState('');
  const [nextAssessmentDate, setNextAssessmentDate] = useState('');
  const [nextAssessmentTime, setNextAssessmentTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentSection, setCurrentSection] = useState(1);

  // Debug para verificar el estado
  useEffect(() => {
    console.log('NewAssessmentPage - generalPatientData actualizado:', generalPatientData);
    console.log('NewAssessmentPage - calculatorResults actualizado:', calculatorResults);
  }, [generalPatientData, calculatorResults]);

const handleSaveAssessment = async () => {
    if (!currentUser) {
      alert('Debe estar autenticado para guardar valoraciones.');
      return;
    }

    if (!generalPatientData.patientName || !generalPatientData.documentNumber) {
      alert('Faltan datos del paciente. Por favor complete la información requerida.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Preparar datos limpios
      const cleanedGeneralData = cleanUndefined(generalPatientData);
      const cleanedCalculatorResults = cleanUndefined(calculatorResults);
      
      const assessmentData = {
        generalInfo: cleanedGeneralData,
        calculatorData: cleanedCalculatorResults,
        calculatorResults: cleanedCalculatorResults, // Para compatibilidad
        diagnosis: diagnosisText,
        diagnosisText: diagnosisText, // Para compatibilidad
        plan: planText,
        planText: planText, // Para compatibilidad
        nextAssessmentDate: nextAssessmentDate || null,
        nextAssessmentTime: nextAssessmentTime || null
      };

      // Debug: Log para verificar que los datos se están guardando
      console.log('=== GUARDANDO VALORACIÓN CON NUEVO SERVICIO ===');
      console.log('nextAssessmentDate:', nextAssessmentDate);
      console.log('nextAssessmentTime:', nextAssessmentTime);
      console.log('Assessment data completa:', assessmentData);

      // ¡NUEVO! Usar el servicio centralizado
      const result = await saveInitialAssessment(
        assessmentData, 
        currentUser.email, 
        currentUser.uid
      );

      alert(result.message);
      console.log('✅ Valoración guardada con nuevo servicio. ID:', result.documentId);

      // Limpiar formulario
      setGeneralPatientData({});
      setCalculatorResults({});
      setDiagnosisText('');
      setPlanText('');
      setNextAssessmentDate('');
      setNextAssessmentTime('');
      setCurrentSection(1);

    } catch (error) {
      console.error('❌ Error con nuevo servicio:', error);
      setError(error.message);
      alert(`Error al guardar la valoración: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextSection = () => {
    if (currentSection < 3) {
      console.log('Navegando a sección siguiente. Estado actual:', {
        generalPatientData,
        calculatorResults
      });
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePreviousSection = () => {
    if (currentSection > 1) {
      console.log('Navegando a sección anterior. Estado actual:', {
        generalPatientData,
        calculatorResults
      });
      setCurrentSection(currentSection - 1);
    }
  };

  // Función para manejar cambios en los resultados de calculadoras
  const handleCalculatorResultsChange = (newResults) => {
    console.log('Actualizando resultados de calculadoras:', newResults);
    setCalculatorResults(prevResults => {
      const updatedResults = { ...prevResults, ...newResults };
      console.log('Resultados combinados:', updatedResults);
      return updatedResults;
    });
  };

  const getSectionTitle = (section) => {
    switch (section) {
      case 1: return 'Módulo 1: Datos Generales del Paciente';
      case 2: return 'Módulo 2: Riesgo y Diagnóstico Nutricional';
      case 3: return 'Módulo 3: Resumen Consolidado y Plan de Acción';
      default: return '';
    }
  };

  

return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-8 pt-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-2">
            Nueva Valoración Nutricional
          </h1>
          <p className="text-slate-600 text-center max-w-2xl mx-auto">
            Complete los módulos para realizar una valoración nutricional integral del paciente
          </p>

          {/* Indicador de progreso */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentSection === step 
                      ? 'bg-blue-600 text-white' 
                      : currentSection > step 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-300 text-gray-600'
                  }`}>
                    {currentSection > step ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      currentSection > step ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-700 text-center mt-4">
            {getSectionTitle(currentSection)}
          </h2>
        </header>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {currentSection === 1 && (
            <GeneralDataModule
              initialData={generalPatientData}
              onDataChange={setGeneralPatientData}
            />
          )}

          {currentSection === 2 && (
            <SpecificCalculatorsModule
              onResultsChange={handleCalculatorResultsChange}
              generalPatientData={generalPatientData}
              riskAssessmentResults={calculatorResults}
            />
          )}

          {currentSection === 3 && (
            <SummaryModule
              generalPatientData={generalPatientData}
              calculatorResults={calculatorResults}
              diagnosisText={diagnosisText}
              onDiagnosisTextChange={setDiagnosisText}
              planText={planText}
              onPlanTextChange={setPlanText}
              nextAssessmentDate={nextAssessmentDate}
              onNextAssessmentDateChange={setNextAssessmentDate}
              nextAssessmentTime={nextAssessmentTime}
              onNextAssessmentTimeChange={setNextAssessmentTime}
            />
          )}
        </div>

        {/* Botones de navegación */}
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={handlePreviousSection}
            disabled={currentSection === 1}
            className={`btn-previous-section text-white font-normal border-none cursor-pointer transition-all duration-300 focus:ring-4 focus:ring-gray-300 ${
              currentSection === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                : ''
            }`}
            style={{
              backgroundColor: currentSection === 1 ? '#D1D5DB' : '#5A6268',
              padding: '10px 20px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              if (currentSection !== 1) {
                e.target.style.backgroundColor = '#494E53';
              }
            }}
            onMouseLeave={(e) => {
              if (currentSection !== 1) {
                e.target.style.backgroundColor = '#5A6268';
              }
            }}
          >
            ← Sección Anterior
          </button>

          {currentSection < 3 ? (
            <button
              onClick={handleNextSection}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all duration-300"
            >
              Siguiente Sección →
            </button>
          ) : (
            <button
              onClick={handleSaveAssessment}
              disabled={isSaving}
              className={`btn-save-evaluation text-white font-bold border-none cursor-pointer shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-4 focus:ring-green-300 ${
                isSaving
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-50'
                  : ''
              }`}
              style={{
                backgroundColor: isSaving ? '#6B7280' : '#28A745',
                padding: '10px 20px',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.target.style.backgroundColor = '#218838';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving) {
                  e.target.style.backgroundColor = '#28A745';
                }
              }}
            >
              {isSaving ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}