// src/pages/ViewAssessmentsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; 
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig.js';
import SummaryModule from '../components/assessment/SummaryModule.jsx';
import FollowUpSummaryModule from '../components/assessment/FollowUpSummaryModule.jsx'; 
import { getAllUserAssessments } from '../services/assessmentService.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nutria-app';
const ASSESSMENT_INDEX_KEY = 'nutrIA_assessment_index'; 

export default function ViewAssessmentsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); 
  const [allAssessments, setAllAssessments] = useState([]); 
  const [groupedAssessments, setGroupedAssessments] = useState({}); 
  const [selectedPatientDocumentNumber, setSelectedPatientDocumentNumber] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      const fetchAssessments = async () => {
        setLoading(true);
        setError('');
        try {
          const userId = currentUser.uid;
          console.log('=== CARGANDO VALORACIONES ===');
          console.log('Usuario ID:', userId);

          const result = await getAllUserAssessments(userId);
          console.log('Resultado del servicio:', result);

          if (result.success && result.allAssessments.length > 0) {
            console.log('✅ Valoraciones cargadas exitosamente:', result.allAssessments.length);
            setAllAssessments(result.allAssessments);
            setGroupedAssessments(result.patientGroups.reduce((acc, group) => {
              acc[group.documentNumber] = {
                patientName: group.patientName,
                documentNumber: group.documentNumber,
                patientData: group.mostRecentAssessment?.generalInfo || {},
                assessments: group.assessments
              };
              return acc;
            }, {}));
            setError(''); // Limpiar cualquier error anterior
          } else if (result.success && result.allAssessments.length === 0) {
            console.log('ℹ️ No hay valoraciones guardadas');
            setAllAssessments([]);
            setGroupedAssessments({});
            setError(''); // Limpiar cualquier error anterior
          } else {
            console.error('❌ Error en resultado del servicio:', result);
            setError("No se pudieron cargar las valoraciones. Intente más tarde.");
          }
        } catch (err) {
          console.error("❌ Error al obtener valoraciones:", err);
          setError(`Error al cargar valoraciones: ${err.message}`);
        } finally {
          console.log('=== FINALIZANDO CARGA DE VALORACIONES ===');
          console.log('Cargando:', false);
          console.log('Error actual:', error);
          console.log('Total valoraciones cargadas:', allAssessments.length);
          console.log('Grupos de pacientes:', Object.keys(groupedAssessments).length);
          setLoading(false);
        }
      };
      fetchAssessments();
    } else {
      setAllAssessments([]); 
      setGroupedAssessments({});
      setLoading(false);
    }
  }, [currentUser]);

  const handleDeleteAssessment = async (assessmentIdToDelete) => {
    if (!window.confirm("¿Está seguro de que desea eliminar esta valoración? Esta acción no se puede deshacer.")) {
      return;
    }
    if (!currentUser) {
      setError("Debe estar autenticado para eliminar valoraciones.");
      return;
    }
    try {
      console.log('=== ELIMINANDO VALORACIÓN ===');
      console.log('ID a eliminar:', assessmentIdToDelete);
      console.log('Usuario actual:', currentUser.uid);
      const userId = currentUser.uid;
      const assessmentDocRef = doc(db, "artifacts", appId, "users", userId, "assessments", assessmentIdToDelete);
      await deleteDoc(assessmentDocRef);

      const updatedAssessments = allAssessments.filter(assessment => assessment.id !== assessmentIdToDelete);
      setAllAssessments(updatedAssessments);

      const groups = updatedAssessments.reduce((acc, assessment) => {
        const docNum = assessment.generalInfo?.documentNumber || 'SIN_DOCUMENTO';
        if (!acc[docNum]) {
          acc[docNum] = {
            patientName: assessment.generalInfo?.patientName || 'Paciente Sin Nombre',
            documentNumber: docNum,
            patientData: assessment.generalInfo,
            assessments: []
          };
        }
        acc[docNum].assessments.push(assessment);

        // Ordenar usando la función segura de fechas
        acc[docNum].assessments.sort((a, b) => {
          const getSafeSortDate = (docData) => {
            if (docData.firestoreTimestamp && typeof docData.firestoreTimestamp.toDate === 'function') {
              return docData.firestoreTimestamp.toDate();
            }
            if (docData.savedAtDate) {
              const date = new Date(docData.savedAtDate);
              if (!isNaN(date)) return date;
            }
            return new Date(0);
          };

          return getSafeSortDate(b) - getSafeSortDate(a);
        });

        if (acc[docNum].assessments.length > 0) {
            acc[docNum].patientData = acc[docNum].assessments[0].generalInfo;
            acc[docNum].patientName = acc[docNum].assessments[0].generalInfo?.patientName || 'Paciente Sin Nombre';
        }
        return acc;
      }, {});
      setGroupedAssessments(groups);

      if (selectedAssessment && selectedAssessment.id === assessmentIdToDelete) {
        setSelectedAssessment(null); 
      }
      if (selectedPatientDocumentNumber && (!groups[selectedPatientDocumentNumber] || groups[selectedPatientDocumentNumber].assessments.length === 0)) {
        setSelectedPatientDocumentNumber(null);
      }

      alert("Valoración eliminada exitosamente de la nube.");

      let assessmentIndex = JSON.parse(localStorage.getItem(ASSESSMENT_INDEX_KEY)) || [];
      assessmentIndex = assessmentIndex.filter(item => item.id !== assessmentIdToDelete);
      localStorage.setItem(ASSESSMENT_INDEX_KEY, JSON.stringify(assessmentIndex));

    } catch (err) {
      console.error("Error al eliminar valoración de Firestore:", err);
      console.error("Detalles del error:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      setError(`Error al eliminar la valoración: ${err.message || 'Error desconocido'}`);
      alert(`Error al eliminar la valoración de la nube: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleStartFollowUp = (patientDocumentNumber) => {
    const patientInfo = groupedAssessments[patientDocumentNumber]?.patientData;
    if (patientInfo) {
      console.log("Iniciar seguimiento para paciente:", patientInfo);
      navigate(`/nueva-valoracion-seguimiento/${patientDocumentNumber}`, { 
        state: { 
          patientDataForFollowUp: patientInfo
        } 
      });
    } else {
      alert("No se encontró información del paciente para iniciar el seguimiento.");
    }
  };

  const handlePatientClick = (patientDocumentNumber) => {
    if (selectedPatientDocumentNumber === patientDocumentNumber) {
      // Si el mismo paciente ya está seleccionado, deseleccionarlo (cerrar acordeón)
      setSelectedPatientDocumentNumber(null);
      setSelectedAssessment(null);
    } else {
      // Seleccionar nuevo paciente (abrir su acordeón)
      setSelectedPatientDocumentNumber(patientDocumentNumber);
      setSelectedAssessment(null); // Limpiar valoración seleccionada
    }
  };

  const handleAssessmentClick = (assessment, event) => {
    event.stopPropagation(); // Evitar que se cierre el acordeón
    setSelectedAssessment(assessment);
  };

  if (loading) {
    return <div className="text-center p-10">Cargando valoraciones...</div>;
  }

  const patientList = Object.values(groupedAssessments).sort((a,b) => (a.patientName || '').localeCompare(b.patientName || ''));

  console.log('=== ESTADO FINAL PARA RENDERIZADO ===');
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('CurrentUser:', !!currentUser);
  console.log('PatientList length:', patientList.length);
  console.log('AllAssessments length:', allAssessments.length);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-8 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 mb-4 sm:mb-0">Valoraciones Guardadas</h1>
            <Link 
              to="/nueva-valoracion" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nueva Valoración Inicial
            </Link>
          </div>
        </header>

        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert"><p>{error}</p></div>}

        {!currentUser && <p className="text-center text-slate-600">Por favor, inicie sesión para ver sus valoraciones guardadas.</p>}

        {currentUser && !loading && patientList.length === 0 && (
          <div className="text-center text-slate-600 bg-white p-10 rounded-lg shadow">
            <p className="text-xl mb-4">No tiene valoraciones guardadas en la nube.</p>
            <p>Comience creando una <Link to="/nueva-valoracion" className="text-blue-600 hover:underline font-semibold">nueva evaluación nutricional</Link>.</p>
          </div>
        )}

        {currentUser && patientList.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Pacientes con Acordeón */}
            <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 sticky top-0 bg-white py-2 z-10 border-b">
                Pacientes ({patientList.length})
              </h2>
              <ul className="space-y-2">
                {patientList.map((patient) => {
                  const isExpanded = selectedPatientDocumentNumber === patient.documentNumber;

                  // Buscar la próxima valoración programada en la valoración más reciente
                  const mostRecentAssessment = patient.assessments[0]; // Ya están ordenados por fecha desc
                  const upcomingAssessment = mostRecentAssessment?.nextAssessmentDate && 
                    new Date(mostRecentAssessment.nextAssessmentDate) >= new Date() 
                    ? mostRecentAssessment 
                    : null;

                  return (
                    <li key={patient.documentNumber} className="border border-slate-200 rounded-md overflow-hidden">
                      {/* Cabecera del Paciente (Clickeable) */}
                      <div 
                        className={`p-3 cursor-pointer hover:bg-slate-100 transition-all duration-150 ease-in-out ${
                          isExpanded ? 'bg-indigo-100 border-indigo-400' : 'bg-white'
                        }`}
                        onClick={() => handlePatientClick(patient.documentNumber)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-indigo-700">{patient.patientName}</p>
                            <p className="text-xs text-slate-500">Doc: {patient.documentNumber}</p>
                            <p className="text-xs text-slate-500">Valoraciones: {patient.assessments.length}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartFollowUp(patient.documentNumber);
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 text-xs rounded-md shadow-sm flex items-center"
                            >
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"></path>
                              </svg>
                              Seguimiento
                            </button>
                            <svg 
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Información de Próxima Cita */}
                        {upcomingAssessment ? (
                          <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md">
                            <div className="flex items-center">
                              <svg className="w-3 h-3 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-green-700">
                                Próxima cita: {(() => {
                                  const [year, month, day] = mostRecentAssessment.nextAssessmentDate.split('-');
                                  const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                  return localDate.toLocaleDateString('es-ES');
                                })()}
                                {mostRecentAssessment.nextAssessmentTime && ` - ${mostRecentAssessment.nextAssessmentTime}`}
                              </span>
                            </div>
                          </div>
                        ) : mostRecentAssessment.nextAssessmentDate && (() => {
                          // Crear fecha local sin conversión de zona horaria para comparación
                          const [year, month, day] = mostRecentAssessment.nextAssessmentDate.split('-');
                          const appointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          const today = new Date();
                          today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas

                          return appointmentDate < today;
                        })() ? (
                          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                            <div className="flex items-center">
                              <svg className="w-3 h-3 text-yellow-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-xs text-yellow-700">
                                Cita vencida: {(() => {
                                  const [year, month, day] = mostRecentAssessment.nextAssessmentDate.split('-');
                                  const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                  return localDate.toLocaleDateString('es-ES');
                                })()}
                                {mostRecentAssessment.nextAssessmentTime && ` - ${mostRecentAssessment.nextAssessmentTime}`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded-md">
                            <div className="flex items-center">
                              <svg className="w-3 h-3 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs text-gray-600">
                                Sin próxima valoración programada
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Acordeón de Valoraciones */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50">
                          <div className="p-3">
                            <h4 className="text-xs font-medium text-slate-600 mb-2">Valoraciones:</h4>
                            <ul className="space-y-1 max-h-48 overflow-y-auto">
                              {patient.assessments.map(assessment => (
                                <li 
                                  key={assessment.id}
                                  className={`p-2 text-xs rounded-md cursor-pointer hover:bg-white border transition-colors ${
                                    selectedAssessment && selectedAssessment.id === assessment.id 
                                      ? 'bg-blue-100 border-blue-300' 
                                      : 'bg-white border-slate-100'
                                  }`}
                                  onClick={(e) => handleAssessmentClick(assessment, e)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium">
                                        Val. del: {assessment.generalInfo?.assessmentDate || 'N/A'}
                                      </span>
                                      {assessment.assessmentType === 'follow-up' ? (
                                        <span className="ml-2 px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                          Seguimiento
                                        </span>
                                      ) : (
                                        <span className="ml-2 px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                          Inicial
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAssessment(assessment.id);
                                      }}
                                      className="text-xs bg-red-500 hover:bg-red-700 text-white font-semibold py-0.5 px-1 rounded-md shadow-sm"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Guardado: {assessment.savedAtDate || (assessment.firestoreTimestamp?.toDate ? assessment.firestoreTimestamp.toDate().toLocaleString() : 'N/A')}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Detalle de Valoración Seleccionada */}
            <div className="lg:col-span-2">
              {selectedAssessment ? (
                <div className="bg-white rounded-lg shadow-lg">
                  <div className="flex justify-between items-center p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <h2 className="text-md font-semibold text-slate-800">
                      Detalle Valoración del {selectedAssessment.generalInfo?.assessmentDate || 'N/A'}
                      {selectedAssessment.assessmentType === 'follow-up' ? (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Seguimiento
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Inicial
                        </span>
                      )}
                    </h2>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {selectedAssessment.assessmentType === 'follow-up' ? (
                      <FollowUpSummaryModule
                        followUpData={{
                          ...selectedAssessment,
                          ...selectedAssessment.followUpDetails,
                          // Fusionar todos los niveles posibles de datos
                          calculatorData: {
                            ...selectedAssessment.calculatorData,
                            ...selectedAssessment.followUpDetails?.calculatorData
                          },
                          calculatorResults: {
                            ...selectedAssessment.calculatorResults,
                            ...selectedAssessment.followUpDetails?.calculatorResults
                          }
                        }}
                        firstAssessmentDate={selectedAssessment.generalInfo?.assessmentDate || ''}
                        diagnosisText={selectedAssessment.diagnosisText || selectedAssessment.diagnosis || selectedAssessment.followUpDetails?.diagnosisText || ''}
                        onDiagnosisTextChange={() => {}}
                        planText={selectedAssessment.planText || selectedAssessment.plan || selectedAssessment.followUpDetails?.planText || ''}
                        onPlanTextChange={() => {}}
                        patientBasicInfo={groupedAssessments[selectedPatientDocumentNumber]?.patientData || {}}
                        labComparison={selectedAssessment.labComparison || selectedAssessment.followUpDetails?.labComparison || []}
                        fiScoreResults={selectedAssessment.fiScoreResults || 
                                       selectedAssessment.calculatorResults?.fiScore || 
                                       selectedAssessment.followUpDetails?.fiScoreResults ||
                                       selectedAssessment.followUpDetails?.calculatorResults?.fiScore || 
                                       {}}
                        refeedingCalculatorResults={selectedAssessment.refeedingCalculatorResults || 
                                                   selectedAssessment.calculatorResults?.refeedingRisk || 
                                                   selectedAssessment.followUpDetails?.refeedingCalculatorResults ||
                                                   selectedAssessment.followUpDetails?.calculatorResults?.refeedingRisk || 
                                                   {}}
                        nutritionalRecalculationResults={(() => {
                          // Función para extraer datos de recálculo de valoraciones guardadas
                          const extractRecalculationData = () => {
                            console.log('=== EXTRAYENDO DATOS DE RECÁLCULO PARA VISTA ===');
                            console.log('selectedAssessment completo:', selectedAssessment);

                            // PRIORIDAD 1: Datos directos en nivel superior
                            if (selectedAssessment.nutritionalRecalculationResults?.nutritionalNeeds) {
                              console.log('✅ Encontrado en nutritionalRecalculationResults');
                              return selectedAssessment.nutritionalRecalculationResults;
                            }

                            // PRIORIDAD 2: Datos en calculatorResults
                            if (selectedAssessment.calculatorResults?.nutritionalRecalculation?.nutritionalNeeds) {
                              console.log('✅ Encontrado en calculatorResults.nutritionalRecalculation');
                              return selectedAssessment.calculatorResults.nutritionalRecalculation;
                            }

                            // PRIORIDAD 3: Datos en followUpDetails
                            if (selectedAssessment.followUpDetails?.nutritionalRecalculationResults?.nutritionalNeeds) {
                              console.log('✅ Encontrado en followUpDetails.nutritionalRecalculationResults');
                              return selectedAssessment.followUpDetails.nutritionalRecalculationResults;
                            }

                            if (selectedAssessment.followUpDetails?.calculatorResults?.nutritionalRecalculation?.nutritionalNeeds) {
                              console.log('✅ Encontrado en followUpDetails.calculatorResults.nutritionalRecalculation');
                              return selectedAssessment.followUpDetails.calculatorResults.nutritionalRecalculation;
                            }

                            // PRIORIDAD 4: Buscar en las múltiples ubicaciones posibles de datos de seguimiento
                            const followUpData = selectedAssessment.followUpDetails || selectedAssessment;

                            // Buscar datos de recálculo en la estructura de seguimiento
                            if (followUpData.nutritionalRecalculationResults?.nutritionalNeeds) {
                              console.log('✅ Encontrado en followUpData.nutritionalRecalculationResults');
                              return followUpData.nutritionalRecalculationResults;
                            }

                            // PRIORIDAD 5: Reconstruir desde datos disponibles en la valoración de seguimiento
                            if (selectedAssessment.assessmentType === 'follow-up') {
                              // Buscar peso actual
                              const currentWeight = selectedAssessment.generalInfo?.weight || 
                                                   followUpData.followUp_currentWeight || 
                                                   followUpData.currentWeight;

                              // Buscar temperatura
                              const bodyTemp = selectedAssessment.generalInfo?.bodyTemperature || 
                                              followUpData.bodyTemperature || 
                                              selectedAssessment.bodyTemperature;

                              // Si tenemos peso y otros datos básicos, intentar reconstruir
                              if (currentWeight && parseFloat(currentWeight) > 0) {
                                console.log('✅ Reconstruyendo desde datos de seguimiento disponibles');

                                // Calcular TMB básico (usar fórmula Mifflin como estimación)
                                const weight = parseFloat(currentWeight);
                                const height = selectedAssessment.generalInfo?.height || 170; // fallback
                                const age = selectedAssessment.generalInfo?.age || 40; // fallback
                                const sex = selectedAssessment.generalInfo?.sex || 'male';

                                let bmr;
                                if (sex === 'male') {
                                  bmr = (10 * weight) + (6.25 * parseFloat(height)) - (5 * parseInt(age)) + 5;
                                } else {
                                  bmr = (10 * weight) + (6.25 * parseFloat(height)) - (5 * parseInt(age)) - 161;
                                }

                                // Factor de temperatura si está disponible
                                let tempFactor = 1.0;
                                if (bodyTemp && parseFloat(bodyTemp) > 37) {
                                  tempFactor = 1 + (0.10 * (parseFloat(bodyTemp) - 37));
                                }

                                const estimatedCalories = Math.round(bmr * 1.3 * tempFactor);
                                const estimatedProtein = Math.round(weight * 1.3);

                                return {
                                  nutritionalNeeds: {
                                    calories: {
                                      adjusted_get: estimatedCalories,
                                      get: estimatedCalories,
                                      tmb: Math.round(bmr),
                                      formula: 'Mifflin-St Jeor (seguimiento)'
                                    },
                                    protein: {
                                      totalGrams: `${estimatedProtein} g/día`,
                                      targetValue: estimatedProtein
                                    }
                                  },
                                  currentData: {
                                    weight: weight,
                                    bodyTemperature: bodyTemp || '37'
                                  },
                                  nonNutritionalCalories: 0,
                                  recalculationDate: selectedAssessment.generalInfo?.assessmentDate || 'seguimiento',
                                  source: 'reconstruccion-automatica-seguimiento'
                                };
                              }
                            }

                            // PRIORIDAD 6: Reconstruir desde calculatorData (nivel superior)
                            const calcData = selectedAssessment.calculatorData;
                            if (calcData?.hasRecalculation || (calcData?.adjusted_get && calcData?.targetProtein)) {
                              console.log('✅ Reconstruyendo desde calculatorData nivel superior');
                              return {
                                nutritionalNeeds: {
                                  calories: {
                                    adjusted_get: calcData.adjusted_get || calcData.targetCalories || calcData.dailyCalories,
                                    get: calcData.get || calcData.targetCalories || calcData.dailyCalories,
                                    formula: calcData.formula || 'Valoración guardada'
                                  },
                                  protein: {
                                    totalGrams: calcData.totalGrams || `${calcData.targetProtein} g/día`,
                                    targetValue: calcData.targetProtein || calcData.dailyProtein
                                  }
                                },
                                currentData: {
                                  weight: calcData.weight || selectedAssessment.generalInfo?.weight,
                                  bodyTemperature: calcData.bodyTemperature || selectedAssessment.generalInfo?.bodyTemperature
                                },
                                nonNutritionalCalories: calcData.nonNutritionalCalories || 0,
                                recalculationDate: calcData.recalculationDate || selectedAssessment.generalInfo?.assessmentDate,
                                source: 'valoracion-guardada-reconstruida'
                              };
                            }

                            console.log('❌ No se encontraron datos de recálculo en ninguna ubicación');
                            return null;
                          };

                          return extractRecalculationData();
                        })()}
                        previousWeight={selectedAssessment.previousWeight || selectedAssessment.followUpDetails?.previousWeight || (() => {
                          // Buscar valoración anterior para obtener peso previo
                          const assessments = groupedAssessments[selectedPatientDocumentNumber]?.assessments || [];
                          const currentIndex = assessments.findIndex(a => a.id === selectedAssessment.id);
                          if (currentIndex > 0 && currentIndex < assessments.length) {
                            const previousAssessment = assessments[currentIndex + 1]; // +1 porque está ordenado desc
                            return {
                              weight: previousAssessment?.generalInfo?.weight || previousAssessment?.calculatorData?.weight,
                              date: previousAssessment?.generalInfo?.assessmentDate || previousAssessment?.savedAtDate
                            };
                          }
                          return null;
                        })()}
                        previousLabs={selectedAssessment.previousLabs || selectedAssessment.followUpDetails?.previousLabs || (() => {
                          // Buscar laboratorios de valoración anterior
                          const assessments = groupedAssessments[selectedPatientDocumentNumber]?.assessments || [];
                          const currentIndex = assessments.findIndex(a => a.id === selectedAssessment.id);
                          if (currentIndex > 0 && currentIndex < assessments.length) {
                            const previousAssessment = assessments[currentIndex + 1];
                            return previousAssessment?.calculatorData?.labs || {};
                          }
                          return {};
                        })()}
                        nutritionalObjectives={selectedAssessment.nutritionalObjectives || selectedAssessment.followUpDetails?.nutritionalObjectives || (() => {
                          // Buscar objetivos nutricionales de valoración anterior
                          const assessments = groupedAssessments[selectedPatientDocumentNumber]?.assessments || [];
                          const currentIndex = assessments.findIndex(a => a.id === selectedAssessment.id);
                          if (currentIndex > 0 && currentIndex < assessments.length) {
                            const previousAssessment = assessments[currentIndex + 1];
                            return {
                              calorieGoal: previousAssessment?.calculatorData?.adjusted_get || previousAssessment?.calculatorData?.targetCalories || 0,
                              proteinGoal: previousAssessment?.calculatorData?.targetProtein || previousAssessment?.calculatorData?.dailyProtein || 0,
                              assessmentDate: previousAssessment?.generalInfo?.assessmentDate || previousAssessment?.savedAtDate?.split('T')[0] || ''
                            };
                          }
                          return null;
                        })()}
                      />
                    ) : (
                      <SummaryModule
                        generalPatientData={selectedAssessment.generalInfo}
                        calculatorResults={selectedAssessment.calculatorData}
                        diagnosisText={selectedAssessment.diagnosis || ''}
                        onDiagnosisTextChange={() => {}} 
                        planText={selectedAssessment.plan || ''}
                        onPlanTextChange={() => {}}
                        nextAssessmentDate={selectedAssessment.nextAssessmentDate || ''}
                        onNextAssessmentDateChange={() => {}}
                        nextAssessmentTime={selectedAssessment.nextAssessmentTime || ''}
                        onNextAssessmentTimeChange={() => {}}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-10 rounded-lg shadow-lg text-center text-slate-500 min-h-[300px] flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <div>
                    <p className="text-lg mb-2">Seleccione una valoración específica</p>
                    <p className="text-sm">
                      {selectedPatientDocumentNumber 
                        ? "Haga clic en una valoración de la lista del paciente expandido para ver sus detalles completos."
                        : "Primero seleccione un paciente de la lista para ver sus valoraciones."
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}