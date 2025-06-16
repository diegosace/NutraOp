
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import FollowUpSummaryModule from '../components/assessment/FollowUpSummaryModule';
import FollowUpNutritionalRecalculationModule from '../components/assessment/FollowUpNutritionalRecalculationModule';
// Import removido para evitar conflictos de nombres

const FollowUpAssessmentPage = () => {
  const { patientDocumentNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // ESTADO UNIFICADO - Toda la información del formulario en un solo objeto
  const [formData, setFormData] = useState({
    followUpDate: new Date().toISOString().split('T')[0],
    currentWeight: '',
    bodyTemperature: '',
    diseasePhase: '',

    // Datos del seguimiento
    followUp_nextEvaluationDate: '',
    followUp_clinicalEvolution: '',
    followUp_nutritionalEvolution: '',
    followUp_complications: '',
    followUp_toleranceIssues: '',
    followUp_currentNutritionalSupport: '',
    followUp_currentCalories: '',
    followUp_currentProteins: '',
    followUp_adherence: '',
    followUp_laboratoryChanges: '',
    followUp_anthropometricChanges: '',
    followUp_generalObservations: '',

    // Infusiones no nutricionales
    hasPropofol: false,
    followUp_propofol_rate: '',
    followUp_propofol_duration: '',
    hasDextrose: false,
    followUp_dextrose_concentration: '',
    followUp_dextrose_volume: '',

    // Resultados de calculadoras
    fiScoreResults: null,
    refeedingCalculatorResults: null,
    nutritionalRecalculationResults: null,

    // Diagnóstico y Plan
    diagnosisText: '',
    planText: '',

    // Próxima valoración
    nextAssessmentDate: '',
    nextAssessmentTime: '',

    // Objetivos nutricionales y comparaciones
    nutritionalObjectives: null,
    weightComparison: null,
    labComparison: null,
    previousWeight: null,
    previousLabs: null
  });

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ref para guardar inmediatamente los resultados del recálculo
  const latestRecalculationResults = useRef(null);

  // Datos del paciente original pasados desde ViewAssessmentsPage
  const patientDataFromPrevious = location.state?.patientDataForFollowUp;

  // Debug: Log para ver qué datos estamos recibiendo
  useEffect(() => {
    console.log('=== DATOS RECIBIDOS EN FOLLOW-UP ===');
    console.log('location.state completo:', location.state);
    console.log('patientDataForFollowUp:', patientDataFromPrevious);
    console.log('================================');
  }, []);

  useEffect(() => {
    if (!patientDataFromPrevious || !patientDocumentNumber) {
      setError('No se encontraron datos del paciente para realizar el seguimiento.');
    } else {
      // Inicializar peso actual con el peso de la valoración anterior si no se ha ingresado uno
      const previousWeight = patientDataFromPrevious?.generalInfo?.weight || patientDataFromPrevious?.weight;
      
      setFormData(prev => ({
        ...prev,
        // Solo establecer el peso si no se ha ingresado uno manualmente
        currentWeight: prev.currentWeight || previousWeight || '',
        // También establecer temperatura si está disponible
        bodyTemperature: prev.bodyTemperature || patientDataFromPrevious?.generalInfo?.bodyTemperature || patientDataFromPrevious?.bodyTemperature || ''
      }));

      // Extraer objetivos nutricionales de la valoración anterior - VERSIÓN CORREGIDA
      const extractNutritionalObjectivesLocal = () => {
        console.log('=== EXTRAYENDO OBJETIVOS NUTRICIONALES (VERSIÓN CORREGIDA) ===');
        console.log('patientDataFromPrevious completo:', patientDataFromPrevious);
        
        // Usar el servicio centralizado para extracción de objetivos
        const { extractNutritionalObjectives: extractObjectives } = require('../services/assessmentService');
        const objectives = extractObjectives(patientDataFromPrevious);
        
        if (objectives) {
          console.log('✅ Objetivos extraídos con servicio centralizado:', objectives);
          
          setFormData(prev => ({
            ...prev,
            nutritionalObjectives: {
              calorieGoal: objectives.calorieGoal,
              proteinGoal: objectives.proteinGoal,
              assessmentDate: objectives.assessmentDate,
              source: objectives.source,
              assessmentType: objectives.assessmentType
            }
          }));
          
          return;
        }

        // FALLBACK: Lógica original como respaldo
        console.log('⚠️ Servicio centralizado no encontró objetivos, usando lógica de respaldo');
        
        const generalInfo = patientDataFromPrevious.generalInfo || patientDataFromPrevious;
        const calculatorData = patientDataFromPrevious.calculatorData || {};
        const calculatorResults = patientDataFromPrevious.calculatorResults || {};
        const followUpDetails = patientDataFromPrevious.followUpDetails || {};

        let calorieGoal = null;
        let proteinGoal = null;

        // 1. PRIORIDAD MÁXIMA: Datos de recálculo nutricional de seguimiento anterior
        if (patientDataFromPrevious.nutritionalRecalculationResults?.nutritionalNeeds) {
          const recalcResults = patientDataFromPrevious.nutritionalRecalculationResults.nutritionalNeeds;
          calorieGoal = recalcResults.calories?.adjusted_get || recalcResults.calories?.get;
          
          if (recalcResults.protein?.totalGrams) {
            const proteinMatch = String(recalcResults.protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
            proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : recalcResults.protein.totalGrams;
          } else if (recalcResults.protein?.targetValue) {
            proteinGoal = recalcResults.protein.targetValue;
          }
          
          console.log('✅ Objetivos desde nutritionalRecalculationResults:', { calorieGoal, proteinGoal });
        }

        // 2. PRIORIDAD ALTA: Datos en followUpDetails (seguimientos anteriores)
        if ((!calorieGoal || !proteinGoal) && followUpDetails.nutritionalRecalculationResults?.nutritionalNeeds) {
          const followUpRecalc = followUpDetails.nutritionalRecalculationResults.nutritionalNeeds;
          if (!calorieGoal) {
            calorieGoal = followUpRecalc.calories?.adjusted_get || followUpRecalc.calories?.get;
          }
          
          if (!proteinGoal && followUpRecalc.protein?.totalGrams) {
            const proteinMatch = String(followUpRecalc.protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
            proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : followUpRecalc.protein.totalGrams;
          } else if (!proteinGoal && followUpRecalc.protein?.targetValue) {
            proteinGoal = followUpRecalc.protein.targetValue;
          }
          
          console.log('✅ Objetivos desde followUpDetails:', { calorieGoal, proteinGoal });
        }

        // 3. BÚSQUEDA TRADICIONAL: calculatorData
        if (!calorieGoal) {
          calorieGoal = calculatorData.adjusted_get || 
                       calculatorData.get || 
                       calculatorData.calories?.adjusted_get || 
                       calculatorData.calories?.get ||
                       calculatorData.targetCalories ||
                       calculatorData.dailyCalories;
        }

        if (!proteinGoal) {
          if (calculatorData.totalGrams) {
            const proteinMatch = String(calculatorData.totalGrams).match(/(\d+(?:\.\d+)?)/);
            proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : calculatorData.totalGrams;
          } else if (calculatorData.protein?.totalGrams) {
            const proteinMatch = String(calculatorData.protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
            proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : calculatorData.protein.totalGrams;
          } else if (calculatorData.targetProtein) {
            proteinGoal = calculatorData.targetProtein;
          } else if (calculatorData.dailyProtein) {
            proteinGoal = calculatorData.dailyProtein;
          }
        }

        // 4. BÚSQUEDA EN GENERAL INFO
        if (!calorieGoal) {
          calorieGoal = generalInfo.targetCalories ||
                       generalInfo.calculatedCalories ||
                       generalInfo.adjusted_get ||
                       generalInfo.get;
        }

        if (!proteinGoal) {
          if (generalInfo.totalGrams) {
            const proteinMatch = String(generalInfo.totalGrams).match(/(\d+(?:\.\d+)?)/);
            proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : generalInfo.totalGrams;
          } else {
            proteinGoal = generalInfo.targetProtein ||
                         generalInfo.calculatedProtein;
          }
        }

        // 5. BÚSQUEDA EN CALCULATOR RESULTS
        if ((!calorieGoal || !proteinGoal) && calculatorResults.nutritionalNeeds) {
          if (!calorieGoal) {
            calorieGoal = calculatorResults.nutritionalNeeds.calories?.adjusted_get ||
                         calculatorResults.nutritionalNeeds.calories?.get;
          }
          
          if (!proteinGoal && calculatorResults.nutritionalNeeds.protein) {
            const protein = calculatorResults.nutritionalNeeds.protein;
            if (protein.totalGrams) {
              const proteinMatch = String(protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
              proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : protein.totalGrams;
            } else if (protein.targetValue) {
              proteinGoal = protein.targetValue;
            }
          }
        }

        console.log('OBJETIVOS FINALES EXTRAÍDOS:');
        console.log('calorieGoal:', calorieGoal);
        console.log('proteinGoal:', proteinGoal);

        if (calorieGoal || proteinGoal) {
          // Determinar tipo de valoración anterior
          const isFollowUpAssessment = patientDataFromPrevious.assessmentType === 'follow-up-nutrition' || 
                                      patientDataFromPrevious.nutritionalRecalculationResults || 
                                      patientDataFromPrevious.followUpDetails;

          const objectives = {
            calorieGoal: calorieGoal ? parseFloat(calorieGoal) : null,
            proteinGoal: proteinGoal ? parseFloat(proteinGoal) : null,
            assessmentDate: generalInfo.assessmentDate || generalInfo.savedAtDate?.split('T')[0] || 'valoración anterior',
            source: isFollowUpAssessment ? 'seguimiento-anterior' : 'valoracion-inicial',
            assessmentType: isFollowUpAssessment ? 'Seguimiento Anterior' : 'Valoración Inicial'
          };

          console.log('✅ Objetivos nutricionales establecidos:', objectives);

          setFormData(prev => ({
            ...prev,
            nutritionalObjectives: objectives
          }));
        } else {
          console.warn('❌ No se encontraron objetivos nutricionales en la valoración anterior');
        }
      };

      extractNutritionalObjectivesLocal();
    }
  }, [patientDataFromPrevious, patientDocumentNumber]);

  // MANEJADOR UNIFICADO para todos los cambios del formulario
  const handleFormDataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handler para capturar los resultados del recálculo nutricional
  const handleNutritionalRecalculationResults = (results) => {
    console.log('=== HANDLER: Resultados de recálculo recibidos ===');
    console.log('Resultados completos:', results);

    // Validar que tenemos resultados válidos
    if (!results || !results.nutritionalNeeds) {
      console.warn('No se recibieron resultados de recálculo válidos');
      return;
    }

    // 1. Guardar INMEDIATAMENTE en el ref (esto es crítico para el guardado)
    latestRecalculationResults.current = results;
    console.log('✅ Referencia actualizada:', latestRecalculationResults.current);

    // 2. Actualizar el estado del formulario de forma SÍNCRONA
    setFormData(prevData => {
      // 3. Extraer objetivos nutricionales de los resultados
      const calories = results.nutritionalNeeds?.calories;
      const protein = results.nutritionalNeeds?.protein;

      console.log('Calorías extraídas:', calories);
      console.log('Proteínas extraídas:', protein);

      const calorieGoal = calories?.adjusted_get || calories?.get || 0;
      
      let proteinGoal = 0;
      if (protein?.totalGrams) {
        const proteinMatch = String(protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
        proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : 0;
      } else if (protein?.targetValue) {
        proteinGoal = parseFloat(protein.targetValue) || 0;
      }

      console.log('Objetivos extraídos - Calorías:', calorieGoal, 'Proteínas:', proteinGoal);

      // 4. Crear objetivos nutricionales si tenemos valores válidos
      let newObjectives = null;
      if (calorieGoal > 0 || proteinGoal > 0) {
        newObjectives = {
          calorieGoal: calorieGoal,
          proteinGoal: proteinGoal,
          assessmentDate: prevData.followUpDate || new Date().toISOString().split('T')[0],
          source: 'recalculo-seguimiento',
          timestamp: new Date().toISOString(),
          recalculationData: results
        };
        console.log('✅ Objetivos nutricionales creados:', newObjectives);
      }

      const updatedData = {
        ...prevData,
        nutritionalRecalculationResults: results,
        nutritionalObjectives: newObjectives || prevData.nutritionalObjectives,
        _lastRecalculationTimestamp: Date.now() // Timestamp para tracking
      };

      console.log('Estado del formulario actualizado con recálculo:', updatedData);
      return updatedData;
    });

    console.log('=== FIN HANDLER ===');
  };

  // Calcular comparaciones cuando cambie el peso actual
  useEffect(() => {
    if (formData.currentWeight && patientDataFromPrevious) {
      const previousWeightValue = patientDataFromPrevious.generalInfo?.weight || patientDataFromPrevious.weight;
      const previousDate = patientDataFromPrevious.generalInfo?.assessmentDate || patientDataFromPrevious.assessmentDate;

      if (previousWeightValue) {
        const currentWeightNum = parseFloat(formData.currentWeight);
        const previousWeightNum = parseFloat(previousWeightValue);
        const difference = currentWeightNum - previousWeightNum;
        const percentChange = (difference / previousWeightNum) * 100;

        setFormData(prev => ({
          ...prev,
          previousWeight: {
            weight: previousWeightNum,
            date: previousDate || 'fecha anterior'
          },
          weightComparison: {
            difference: difference,
            percentChange: percentChange,
            status: difference > 0 ? 'aumento' : difference < 0 ? 'pérdida' : 'estable'
          }
        }));
      }
    }
  }, [formData.currentWeight, patientDataFromPrevious]);

  const handleSaveFollowUp = async () => {
    if (!currentUser) {
      setError('Debe estar autenticado para guardar el seguimiento.');
      return;
    }

    if (!patientDataFromPrevious) {
      setError('No se encontraron datos del paciente original.');
      return;
    }

    if (!formData.followUpDate || !formData.currentWeight) {
      setError('La fecha de seguimiento y el peso actual son obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const patientData = {
        patientName: patientDataFromPrevious.generalInfo?.patientName || 'Paciente Sin Nombre',
        documentNumber: patientDocumentNumber,
        ...patientDataFromPrevious.generalInfo,
        ...patientDataFromPrevious,
      };

      // Función para crear el objeto de guardado - mejorada para capturar datos de múltiples fuentes
      const getCalculatorDataForStorage = () => {
        // Intentar múltiples fuentes para los datos del recálculo
        const results = latestRecalculationResults.current || formData.nutritionalRecalculationResults;

        console.log('=== PREPARANDO DATOS PARA ALMACENAMIENTO (MEJORADO) ===');
        console.log('Results from ref:', latestRecalculationResults.current);
        console.log('Results from formData:', formData.nutritionalRecalculationResults);
        console.log('Final results used:', results);

        if (!results || !results.nutritionalNeeds) {
          console.warn('⚠️ No hay resultados de recálculo válidos para guardar');
          console.warn('latestRecalculationResults.current existe:', !!latestRecalculationResults.current);
          console.warn('formData.nutritionalRecalculationResults existe:', !!formData.nutritionalRecalculationResults);
          return null;
        }

        const calories = results.nutritionalNeeds.calories;
        const protein = results.nutritionalNeeds.protein;

        console.log('Extracting calories:', calories);
        console.log('Extracting protein:', protein);

        const calorieValue = calories?.adjusted_get || calories?.get || 0;

        let proteinValue = 0;
        if (protein?.totalGrams) {
          const proteinMatch = String(protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
          proteinValue = proteinMatch ? parseFloat(proteinMatch[1]) : 0;
        } else if (protein?.targetValue) {
          proteinValue = parseFloat(protein.targetValue) || 0;
        }

        console.log('Valores extraídos - Calorías:', calorieValue, 'Proteínas:', proteinValue);

        const storageData = {
          // === ESTRUCTURA COMPLETA DE RECÁLCULO ===
          nutritionalNeeds: results.nutritionalNeeds,
          currentData: results.currentData,
          nonNutritionalCalories: results.nonNutritionalCalories || 0,
          
          // === DATOS CALÓRICOS (múltiples formatos para compatibilidad) ===
          adjusted_get: calorieValue,
          get: calories?.get || calorieValue,
          targetCalories: calorieValue,
          dailyCalories: calorieValue,
          calculatedCalories: calorieValue,
          calories: {
            ...calories,
            adjusted_get: calorieValue,
            get: calories?.get || calorieValue,
            formula: calories?.formula || 'recálculo-seguimiento'
          },

          // === DATOS PROTEICOS (múltiples formatos para compatibilidad) ===
          protein: {
            ...protein,
            totalGrams: protein?.totalGrams || `${proteinValue} g/día`,
            targetValue: proteinValue
          },
          totalGrams: protein?.totalGrams || `${proteinValue} g/día`,
          targetProtein: proteinValue,
          dailyProtein: proteinValue,
          calculatedProtein: proteinValue,

          // === METADATOS ===
          recalculationDate: formData.followUpDate,
          recalculationSource: 'follow-up-nutritional-recalculation',
          timestamp: new Date().toISOString(),
          hasRecalculation: true, // Flag importante para identificación
          
          // === DATOS UTILIZADOS PARA EL CÁLCULO ===
          weight: results.currentData?.weight || formData.currentWeight,
          bodyTemperature: results.currentData?.bodyTemperature || formData.bodyTemperature,
          
          // === ESTRUCTURA ALTERNATIVA PARA COMPATIBILIDAD ===
          recalculationData: {
            hasRecalculation: true,
            recalculatedCalories: calorieValue,
            recalculatedProtein: proteinValue,
            recalculationDate: formData.followUpDate,
            currentData: results.currentData,
            recalculationSource: 'follow-up-assessment'
          }
        };

        console.log('✅ Datos preparados para almacenamiento (VERIFICADO):', storageData);
        console.log('✅ Calorías en storageData:', storageData.adjusted_get);
        console.log('✅ Proteínas en storageData:', storageData.targetProtein);
        return storageData;
      };

      const calculatorDataForStorage = getCalculatorDataForStorage();

      // Validación crítica: verificar que tenemos datos de recálculo
      if (!calculatorDataForStorage) {
        console.error('❌ CRÍTICO: No se pudieron preparar los datos de recálculo para guardar');
        console.error('Estado actual del ref:', latestRecalculationResults.current);
        console.error('Estado en formData:', formData.nutritionalRecalculationResults);
        setError('Error: No se encontraron datos de recálculo nutricional para guardar. Por favor, realice el recálculo nuevamente.');
        setLoading(false);
        return;
      }

      console.log('✅ Datos de recálculo validados para guardado:', calculatorDataForStorage);

      const followUpAssessmentData = {
        assessmentType: 'follow-up-nutrition',
        patientIdentifier: `${patientData.documentNumber}-${patientData.patientName.replace(/\s+/g, '_')}`,

        // === INFORMACIÓN GENERAL ENRIQUECIDA ===
        generalInfo: {
          ...patientData,
          weight: formData.currentWeight,
          previousWeight: patientData.weight,
          assessmentDate: formData.followUpDate,
          diseasePhase: formData.diseasePhase,
          bodyTemperature: formData.bodyTemperature,
          // Incluir los objetivos calculados en generalInfo para compatibilidad
          ...(calculatorDataForStorage && {
            targetCalories: calculatorDataForStorage.targetCalories,
            calculatedCalories: calculatorDataForStorage.adjusted_get,
            targetProtein: calculatorDataForStorage.targetProtein,
            calculatedProtein: calculatorDataForStorage.targetProtein,
            // Agregar campos adicionales para compatibilidad
            adjusted_get: calculatorDataForStorage.adjusted_get,
            get: calculatorDataForStorage.get,
            totalGrams: calculatorDataForStorage.totalGrams
          })
        },

        // === DETALLES COMPLETOS DEL SEGUIMIENTO ===
        followUpDetails: {
          ...formData,
          // IMPORTANTE: Incluir resultados de recálculo en followUpDetails
          nutritionalRecalculationResults: latestRecalculationResults.current,
          calculatorResults: {
            fiScore: formData.fiScoreResults,
            refeedingRisk: formData.refeedingCalculatorResults,
            nutritionalRecalculation: latestRecalculationResults.current
          }
        },

        // === RESULTADOS DE RECÁLCULO (NIVEL SUPERIOR) ===
        nutritionalRecalculationResults: latestRecalculationResults.current || formData.nutritionalRecalculationResults,
        
        // === DATOS DE CALCULADORA (FORMATO COMPATIBLE) ===
        calculatorData: calculatorDataForStorage,

        // === PRESERVAR DATOS DE RECÁLCULO EN MÚLTIPLES UBICACIONES ===
        nutritionalRecalculation: latestRecalculationResults.current,
        followUpNutritionalRecalculation: latestRecalculationResults.current,

        // === RESULTADOS DE CALCULADORAS ===
        calculatorResults: {
          fiScore: formData.fiScoreResults,
          refeedingRisk: formData.refeedingCalculatorResults,
          nutritionalRecalculation: latestRecalculationResults.current || formData.nutritionalRecalculationResults
        },

        // === OBJETIVOS Y COMPARACIONES ===
        nutritionalObjectives: formData.nutritionalObjectives,
        weightComparison: formData.weightComparison,
        labComparison: formData.labComparison,

        // === DIAGNÓSTICO Y PLAN ===
        diagnosis: formData.diagnosisText,
        plan: formData.planText,
        diagnosisText: formData.diagnosisText, // Compatibilidad
        planText: formData.planText, // Compatibilidad

        // === PRÓXIMA VALORACIÓN ===
        nextAssessmentDate: formData.nextAssessmentDate,
        nextAssessmentTime: formData.nextAssessmentTime,

        // === METADATOS ===
        metadata: {
          createdAt: new Date(),
          createdBy: currentUser.uid,
          createdByEmail: currentUser.email,
          hasNutritionalRecalculation: !!(latestRecalculationResults.current || formData.nutritionalRecalculationResults),
          recalculationTimestamp: (latestRecalculationResults.current || formData.nutritionalRecalculationResults) ? new Date().toISOString() : null
        },

        // === REFERENCIAS ===
        references: {
          originalAssessmentId: location.state?.originalAssessmentId || null,
          userId: currentUser.uid,
        },

        // === CAMPOS ADICIONALES PARA IDENTIFICACIÓN ===
        firestoreTimestamp: new Date(),
        savedAtDate: new Date().toISOString()
      };

      console.log('=== OBJETO FINAL PARA GUARDAR ===');
      console.log('followUpAssessmentData completo:', followUpAssessmentData);
      console.log('Tiene nutritionalRecalculationResults:', !!followUpAssessmentData.nutritionalRecalculationResults);
      console.log('Tiene calculatorData:', !!followUpAssessmentData.calculatorData);
      console.log('calculatorData.hasRecalculation:', followUpAssessmentData.calculatorData?.hasRecalculation);
      
      // VERIFICACIÓN CRÍTICA DE DATOS DE RECÁLCULO
      console.log('=== VERIFICACIÓN CRÍTICA ANTES DEL GUARDADO ===');
      console.log('latestRecalculationResults.current:', latestRecalculationResults.current);
      console.log('Calorías en calculatorData:', followUpAssessmentData.calculatorData?.adjusted_get);
      console.log('Proteínas en calculatorData:', followUpAssessmentData.calculatorData?.targetProtein);
      console.log('Datos en generalInfo:', {
        targetCalories: followUpAssessmentData.generalInfo?.targetCalories,
        targetProtein: followUpAssessmentData.generalInfo?.targetProtein
      });

      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nutria-app';
      const docRef = await addDoc(
        collection(db, `artifacts/${appId}/users/${currentUser.uid}/assessments`),
        followUpAssessmentData
      );

      console.log('✅ Valoración de seguimiento guardada con ID:', docRef.id);
      console.log('✅ Datos de recálculo guardados correctamente');
      
      // Guardar solo al final del flujo, por ejemplo al guardar definitivamente la valoración
      if (latestRecalculationResults.current) {
        try {
          localStorage.setItem(
            `recalculo_${patientDocumentNumber}_${formData.followUpDate}`,
            JSON.stringify({
              nutritionalNeeds: latestRecalculationResults.current.nutritionalNeeds,
              timestamp: Date.now(),
              documentNumber: patientDocumentNumber,
              source: 'follow-up-saved'
            })
          );
          console.log('✅ Respaldo guardado en localStorage');
        } catch (storageError) {
          console.warn('No se pudo crear respaldo:', storageError);
        }
      }
      
      setSuccess('Seguimiento guardado exitosamente.');

      setTimeout(() => {
        navigate('/mis-valoraciones');
      }, 2000);

    } catch (error) {
      console.error('Error al guardar el seguimiento:', error);
      setError('Error al guardar el seguimiento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!patientDataFromPrevious) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>No se encontraron datos del paciente para realizar el seguimiento.</p>
            <button 
              onClick={() => navigate('/mis-valoraciones')}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Volver a Mis Valoraciones
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <header className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Seguimiento Nutricional
          </h1>
          <p className="text-slate-600">
            Paciente: {patientDataFromPrevious.generalInfo?.patientName || 'Sin nombre'} - 
            Doc: {patientDocumentNumber || 'Sin documento'}
          </p>
        </header>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>{success}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Datos básicos del seguimiento */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Datos Básicos del Seguimiento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Seguimiento
                </label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => handleFormDataChange('followUpDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Peso Actual (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.currentWeight}
                  onChange={(e) => handleFormDataChange('currentWeight', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Temperatura (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bodyTemperature}
                  onChange={(e) => handleFormDataChange('bodyTemperature', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fase de Enfermedad
                </label>
                <select
                  value={formData.diseasePhase}
                  onChange={(e) => handleFormDataChange('diseasePhase', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="aguda">Aguda</option>
                  <option value="estable">Estable</option>
                  <option value="recuperacion">Recuperación</option>
                  <option value="cronica">Crónica</option>
                </select>
              </div>
            </div>
          </div>

          {/* Infusiones no nutricionales */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Infusiones No Nutricionales
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Propofol */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="hasPropofol"
                    checked={formData.hasPropofol}
                    onChange={(e) => handleFormDataChange('hasPropofol', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300"
                  />
                  <label htmlFor="hasPropofol" className="ml-2 text-sm font-medium text-slate-700">
                    Propofol
                  </label>
                </div>
                
                {formData.hasPropofol && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Velocidad (mL/h)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.followUp_propofol_rate}
                        onChange={(e) => handleFormDataChange('followUp_propofol_rate', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Duración (h)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.followUp_propofol_duration}
                        onChange={(e) => handleFormDataChange('followUp_propofol_duration', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dextrosa */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="hasDextrose"
                    checked={formData.hasDextrose}
                    onChange={(e) => handleFormDataChange('hasDextrose', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300"
                  />
                  <label htmlFor="hasDextrose" className="ml-2 text-sm font-medium text-slate-700">
                    Dextrosa
                  </label>
                </div>
                
                {formData.hasDextrose && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Concentración (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.followUp_dextrose_concentration}
                        onChange={(e) => handleFormDataChange('followUp_dextrose_concentration', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Volumen (mL/día)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.followUp_dextrose_volume}
                        onChange={(e) => handleFormDataChange('followUp_dextrose_volume', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Módulo de recálculo nutricional */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <FollowUpNutritionalRecalculationModule
              followUpPatientData={{
                ...formData,
                patientName: patientDataFromPrevious?.generalInfo?.patientName || patientDataFromPrevious?.patientName,
                documentNumber: patientDocumentNumber,
                // Asegurar que el peso esté disponible
                followUp_currentWeight: formData.currentWeight,
                currentWeight: formData.currentWeight || patientDataFromPrevious?.generalInfo?.weight || patientDataFromPrevious?.weight,
                bodyTemperature: formData.bodyTemperature,
                diseasePhase: formData.diseasePhase,
                // Propiedades de infusiones no nutricionales
                hasPropofol: formData.hasPropofol || false,
                followUp_propofol_rate: formData.followUp_propofol_rate || '',
                followUp_propofol_duration: formData.followUp_propofol_duration || '',
                hasDextrose: formData.hasDextrose || false,
                followUp_dextrose_concentration: formData.followUp_dextrose_concentration || '',
                followUp_dextrose_volume: formData.followUp_dextrose_volume || ''
              }}
              initialPatientData={{
                ...(patientDataFromPrevious?.generalInfo || patientDataFromPrevious),
                documentNumber: patientDocumentNumber,
                height: patientDataFromPrevious?.generalInfo?.height || patientDataFromPrevious?.height,
                age: patientDataFromPrevious?.generalInfo?.age || patientDataFromPrevious?.age,
                sex: patientDataFromPrevious?.generalInfo?.sex || patientDataFromPrevious?.sex,
                weight: patientDataFromPrevious?.generalInfo?.weight || patientDataFromPrevious?.weight
              }}
              initialAssessmentResults={{
                refeedingSyndrome: patientDataFromPrevious?.calculatorResults?.refeedingRisk || null,
                generalInfo: {
                  ...(patientDataFromPrevious?.generalInfo || patientDataFromPrevious),
                  documentNumber: patientDocumentNumber
                },
                // Resultados de evaluación de riesgo nutricional si existen
                nrs: patientDataFromPrevious?.calculatorResults?.nrs || null,
                glim: patientDataFromPrevious?.calculatorResults?.glim || null,
                calfScreening: patientDataFromPrevious?.calculatorResults?.calfScreening || null
              }}
              currentWeight={formData.currentWeight}
              bodyTemperature={formData.bodyTemperature}
              onRecalculationResult={handleNutritionalRecalculationResults}
              onObjectivesCalculated={(objectives) => handleFormDataChange('nutritionalObjectives', objectives)}
            />
          </div>

          {/* Módulo de resumen del seguimiento */}
          <FollowUpSummaryModule
            key={`summary-${formData._lastRecalculationTimestamp || 'initial'}`}
            followUpData={{
              ...formData,
              patientName: patientDataFromPrevious?.generalInfo?.patientName || patientDataFromPrevious?.patientName,
              documentNumber: patientDocumentNumber
            }}
            onFollowUpDataChange={handleFormDataChange}
            weightComparison={formData.weightComparison}
            labComparison={formData.labComparison}
            fiScoreResults={formData.fiScoreResults}
            refeedingCalculatorResults={formData.refeedingCalculatorResults}
            nutritionalRecalculationResults={formData.nutritionalRecalculationResults || latestRecalculationResults.current}
            nutritionalObjectives={formData.nutritionalObjectives}
            firstAssessmentDate={patientDataFromPrevious?.generalInfo?.assessmentDate || patientDataFromPrevious?.assessmentDate}
            previousWeight={formData.previousWeight}
            previousLabs={formData.previousLabs}
            diagnosisText={formData.diagnosisText}
            onDiagnosisTextChange={(text) => handleFormDataChange('diagnosisText', text)}
            planText={formData.planText}
            onPlanTextChange={(text) => handleFormDataChange('planText', text)}
            patientBasicInfo={patientDataFromPrevious?.generalInfo || patientDataFromPrevious}
          />

          {/* Botón de guardar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => navigate('/mis-valoraciones')}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFollowUp}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Guardando...' : 'Guardar Seguimiento'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpAssessmentPage;
