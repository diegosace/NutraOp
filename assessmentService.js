
// src/services/assessmentService.js

import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../firebaseConfig.js';
import { 
  normalizeInitialAssessment, 
  prepareForStorage, 
  validateAssessmentData,
  ASSESSMENT_TYPES 
} from '../utils/assessmentDataSchema.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nutria-app';

/**
 * FASE 3.1: Función de guardado para valoraciones iniciales
 * Esta es nuestra primera función del sistema centralizado
 */
export const saveInitialAssessment = async (assessmentData, userEmail, userId) => {
  try {
    console.log('=== GUARDANDO VALORACIÓN INICIAL CON NUEVO SERVICIO ===');
    console.log('Datos recibidos:', assessmentData);

    // 1. Validar datos de entrada
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    if (!assessmentData.generalInfo?.patientName || !assessmentData.generalInfo?.documentNumber) {
      throw new Error('Faltan datos requeridos del paciente (nombre o documento)');
    }

    // 2. Preparar datos en formato unificado
    const rawData = {
      // Metadatos
      assessmentType: ASSESSMENT_TYPES.INITIAL,
      savedByUser: userEmail,
      firestoreTimestamp: serverTimestamp(),
      
      // Datos del formulario tal como vienen de NewAssessmentPage
      generalInfo: assessmentData.generalInfo || {},
      calculatorData: assessmentData.calculatorData || {},
      calculatorResults: assessmentData.calculatorResults || {},
      diagnosis: assessmentData.diagnosis || '',
      diagnosisText: assessmentData.diagnosisText || '',
      plan: assessmentData.plan || '',
      planText: assessmentData.planText || '',
      nextAssessmentDate: assessmentData.nextAssessmentDate || null,
      nextAssessmentTime: assessmentData.nextAssessmentTime || null,
      
      // Campos de compatibilidad con formato anterior
      savedAtDate: new Date().toLocaleString()
    };

    // 3. Normalizar al esquema unificado
    const normalizedData = normalizeInitialAssessment(rawData);
    
    // 4. Validar datos normalizados
    const validation = validateAssessmentData(normalizedData);
    if (!validation.isValid) {
      console.warn('Errores de validación:', validation.errors);
      // No bloqueamos el guardado por errores de validación menores
    }

    // 5. Preparar para almacenamiento (limpieza final)
    const dataToSave = prepareForStorage(normalizedData);

    // 6. Agregar campos adicionales para compatibilidad con el sistema actual
    const finalData = {
      ...dataToSave,
      // Mantener estructura original para compatibilidad
      generalInfo: assessmentData.generalInfo,
      calculatorData: assessmentData.calculatorData,
      diagnosis: assessmentData.diagnosis || assessmentData.diagnosisText,
      plan: assessmentData.plan || assessmentData.planText,
      nextAssessmentDate: assessmentData.nextAssessmentDate,
      nextAssessmentTime: assessmentData.nextAssessmentTime,
      savedAtDate: new Date().toLocaleString(),
      
      // Nuevos campos del esquema unificado
      unifiedSchema: true,
      schemaVersion: '1.0'
    };

    console.log('Datos finales a guardar:', finalData);

    // 7. Guardar en Firestore
    const assessmentsCollectionRef = collection(db, "artifacts", appId, "users", userId, "assessments");
    const docRef = await addDoc(assessmentsCollectionRef, finalData);

    console.log('✅ Valoración inicial guardada con ID:', docRef.id);
    console.log('✅ Esquema unificado aplicado exitosamente');

    return {
      success: true,
      documentId: docRef.id,
      message: 'Valoración guardada exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en saveInitialAssessment:', error);
    throw new Error(`Error al guardar la valoración: ${error.message}`);
  }
};

/**
 * FUNCIONES PREPARADAS PARA FASES FUTURAS
 * (Estas serán implementadas en pasos posteriores)
 */

/**
 * FASE 3.3: Guarda una nueva valoración de seguimiento.
 * @param {object} followUpPayload - Todos los datos del estado del formulario de seguimiento.
 * @param {object} previousAssessment - La valoración anterior completa y normalizada.
 * @param {object} currentUser - El usuario autenticado.
 * @returns {Promise<string>} - El ID del nuevo documento de seguimiento.
 */
export const saveFollowUpAssessment = async (followUpPayload, previousAssessment, currentUser) => {
  if (!currentUser) throw new Error('Usuario no autenticado.');
  if (!followUpPayload || !previousAssessment) throw new Error('Faltan datos para guardar el seguimiento.');

  try {
    console.log('=== GUARDANDO VALORACIÓN DE SEGUIMIENTO CON NUEVO SERVICIO ===');
    console.log('Datos de seguimiento recibidos:', followUpPayload);
    console.log('Valoración anterior:', previousAssessment);

    // 1. Crear el molde para una valoración de seguimiento.
    const newAssessment = {
      assessmentType: ASSESSMENT_TYPES.FOLLOW_UP,
      firestoreTimestamp: serverTimestamp(),
      savedByUser: currentUser.email,
      metadata: {
        previousAssessmentId: previousAssessment.id || null,
        appId: appId
      }
    };

    // 2. Poblar la información general (heredada y actualizada).
    newAssessment.generalInfo = {
      patientName: previousAssessment.generalInfo?.patientName || previousAssessment.patientName,
      documentNumber: previousAssessment.generalInfo?.documentNumber || previousAssessment.documentNumber,
      age: previousAssessment.generalInfo?.age || previousAssessment.age,
      sex: previousAssessment.generalInfo?.sex || previousAssessment.sex,
      height: previousAssessment.generalInfo?.height || previousAssessment.height,
      weight: followUpPayload.followUp_currentWeight || followUpPayload.currentWeight || followUpPayload.weight,
      assessmentDate: followUpPayload.followUpDate || followUpPayload.assessmentDate,
      reasonForConsultation: previousAssessment.generalInfo?.reasonForConsultation || '',
      bodyTemperature: followUpPayload.bodyTemperature || '37'
    };

    // CRÍTICO: Incluir datos de recálculo en TODAS las ubicaciones necesarias
    if (followUpPayload.nutritionalRecalculationResults?.nutritionalNeeds) {
      const recalc = followUpPayload.nutritionalRecalculationResults.nutritionalNeeds;
      
      // Extraer valores de calorías y proteínas
      const calorieValue = recalc.calories?.adjusted_get || recalc.calories?.get;
      let proteinValue = null;
      if (recalc.protein?.totalGrams) {
        const match = String(recalc.protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
        proteinValue = match ? parseFloat(match[1]) : null;
      } else if (recalc.protein?.targetValue) {
        proteinValue = recalc.protein.targetValue;
      }

      // Agregar a generalInfo para compatibilidad con sistemas legacy
      newAssessment.generalInfo = {
        ...newAssessment.generalInfo,
        targetCalories: calorieValue,
        calculatedCalories: calorieValue,
        adjusted_get: calorieValue,
        get: recalc.calories?.get || calorieValue,
        targetProtein: proteinValue,
        calculatedProtein: proteinValue,
        totalGrams: recalc.protein?.totalGrams,
        hasRecalculation: true,
        recalculationDate: followUpPayload.followUpDate
      };

      // AGREGAR: También incluir en followUpDetails para preservar los datos
      newAssessment.followUpData = {
        ...newAssessment.followUpData,
        nutritionalRecalculationResults: followUpPayload.nutritionalRecalculationResults,
        recalculatedCalories: calorieValue,
        recalculatedProtein: proteinValue,
        hasRecalculation: true
      };
    }

    // 3. Poblar resultados de calculadoras de riesgo.
    newAssessment.riskScreening = {
      nrs: followUpPayload.calculatorResults?.nrs || null,
      nutric: followUpPayload.calculatorResults?.nutric || null,
      glim: followUpPayload.calculatorResults?.glim || null,
      refeedingSyndrome: followUpPayload.refeedingCalculatorResults || followUpPayload.calculatorResults?.refeedingRisk || null,
      calfScreening: followUpPayload.calculatorResults?.calfScreening || null
    };

    // 4. Poblar objetivos nutricionales (priorizar recálculo si existe).
    if (followUpPayload.nutritionalRecalculationResults?.nutritionalNeeds) {
      const recalc = followUpPayload.nutritionalRecalculationResults.nutritionalNeeds;
      newAssessment.nutritionalNeeds = {
        calorieGoal: recalc.calories?.adjusted_get || recalc.calories?.get,
        proteinGoal: (() => {
          if (recalc.protein?.totalGrams) {
            const match = String(recalc.protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : null;
          }
          return recalc.protein?.targetValue || null;
        })(),
        sourceFormula: recalc.calories?.formula || 'Recálculo de seguimiento',
        calculationDetails: followUpPayload.nutritionalRecalculationResults
      };

      // CRÍTICO: Asegurar que calculatorData tenga estructura completa para recuperación
      const extractedCalories = recalc.calories?.adjusted_get || recalc.calories?.get;
      const extractedProtein = (() => {
        if (recalc.protein?.totalGrams) {
          const match = String(recalc.protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : null;
        }
        return recalc.protein?.targetValue || null;
      })();

      newAssessment.calculatorData = {
        // Datos calóricos - TODAS las variaciones posibles
        adjusted_get: extractedCalories,
        get: recalc.calories?.get || extractedCalories,
        targetCalories: extractedCalories,
        calculatedCalories: extractedCalories,
        dailyCalories: extractedCalories,
        tmb: recalc.calories?.tmb,
        
        // Datos proteicos - TODAS las variaciones posibles
        totalGrams: recalc.protein?.totalGrams,
        targetProtein: extractedProtein,
        calculatedProtein: extractedProtein,
        dailyProtein: extractedProtein,
        
        // Metadatos del recálculo
        hasRecalculation: true,
        recalculationDate: followUpPayload.followUpDate,
        recalculationSource: 'follow-up-assessment',
        weight: followUpPayload.currentWeight || followUpPayload.followUp_currentWeight,
        bodyTemperature: followUpPayload.bodyTemperature,
        
        // Estructura completa para compatibilidad total
        calories: {
          adjusted_get: extractedCalories,
          get: recalc.calories?.get || extractedCalories,
          formula: recalc.calories?.formula || 'Recálculo de seguimiento',
          tmb: recalc.calories?.tmb,
          // Agregar múltiples alias
          targetCalories: extractedCalories,
          calculatedCalories: extractedCalories,
          dailyCalories: extractedCalories
        },
        protein: {
          totalGrams: recalc.protein?.totalGrams,
          targetValue: extractedProtein,
          target: recalc.protein?.target,
          // Agregar múltiples alias
          targetProtein: extractedProtein,
          calculatedProtein: extractedProtein,
          dailyProtein: extractedProtein
        },

        // NUEVO: Estructura plana adicional para máxima compatibilidad
        nutritionalRecalculationResults: followUpPayload.nutritionalRecalculationResults
      };
    } else {
      // Usar objetivos de la valoración anterior como fallback
      const previousObjectives = extractNutritionalObjectives(previousAssessment);
      newAssessment.nutritionalNeeds = {
        calorieGoal: previousObjectives?.calorieGoal || null,
        proteinGoal: previousObjectives?.proteinGoal || null,
        sourceFormula: 'Valoración anterior',
        calculationDetails: { inheritedFrom: previousAssessment.id }
      };
    }

    // 5. Poblar datos específicos de seguimiento.
    newAssessment.followUpData = {
      weightComparison: followUpPayload.weightComparison || null,
      labComparison: followUpPayload.labComparison || null,
      fiScore: followUpPayload.fiScoreResults || null,
      currentIntake: {
        calories: followUpPayload.followUp_currentCalories || null,
        protein: followUpPayload.followUp_currentProteins || null
      },
      clinicalEvolution: followUpPayload.followUp_clinicalEvolution || '',
      nutritionalEvolution: followUpPayload.followUp_nutritionalEvolution || '',
      complications: followUpPayload.followUp_complications || ''
    };

    // 6. Poblar notas clínicas.
    newAssessment.clinicalNotes = {
      diagnosis: followUpPayload.diagnosisText || followUpPayload.diagnosis || '',
      plan: followUpPayload.planText || followUpPayload.plan || ''
    };

    // 7. Poblar programación.
    newAssessment.scheduling = {
      nextAssessmentDate: followUpPayload.nextAssessmentDate || null,
      nextAssessmentTime: followUpPayload.nextAssessmentTime || null
    };

    // 8. Validar datos básicos
    if (!newAssessment.generalInfo?.patientName || !newAssessment.generalInfo?.documentNumber) {
      throw new Error('Faltan datos básicos del paciente (nombre o documento)');
    }

    // 9. Preparar datos finales con compatibilidad total.
    const finalData = {
      ...newAssessment,
      // Mantener estructura original para compatibilidad total
      followUpDetails: followUpPayload,
      nutritionalRecalculationResults: followUpPayload.nutritionalRecalculationResults,
      calculatorResults: {
        fiScore: followUpPayload.fiScoreResults,
        refeedingRisk: followUpPayload.refeedingCalculatorResults,
        nutritionalRecalculation: followUpPayload.nutritionalRecalculationResults
      },
      // Campos adicionales del esquema unificado
      unifiedSchema: true,
      schemaVersion: '1.0',
      // Campos de compatibilidad legacy
      savedAtDate: new Date().toLocaleString()
    };

    // 9.5. CRÍTICO: Agregar datos de recálculo en nivel superior para acceso directo
    if (followUpPayload.nutritionalRecalculationResults?.nutritionalNeeds) {
      const recalc = followUpPayload.nutritionalRecalculationResults.nutritionalNeeds;
      const extractedCalories = recalc.calories?.adjusted_get || recalc.calories?.get;
      const extractedProtein = (() => {
        if (recalc.protein?.totalGrams) {
          const match = String(recalc.protein.totalGrams).match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : null;
        }
        return recalc.protein?.targetValue || null;
      })();

      // Agregar campos directos en nivel superior para recuperación inmediata
      finalData.adjusted_get = extractedCalories;
      finalData.targetCalories = extractedCalories;
      finalData.calculatedCalories = extractedCalories;
      finalData.targetProtein = extractedProtein;
      finalData.calculatedProtein = extractedProtein;
      finalData.totalGrams = recalc.protein?.totalGrams;
    }

    // 10. Guardar en Firestore.
    const assessmentsCollectionRef = collection(db, "artifacts", appId, "users", currentUser.uid, "assessments");
    const docRef = await addDoc(assessmentsCollectionRef, finalData);

    console.log('✅ Valoración de seguimiento guardada con ID:', docRef.id);
    console.log('✅ Esquema unificado aplicado exitosamente');

    return {
      success: true,
      documentId: docRef.id,
      message: 'Seguimiento guardado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en saveFollowUpAssessment:', error);
    throw new Error(`Error al guardar el seguimiento: ${error.message}`);
  }
};

/**
 * FASE 3.2: Función de recuperación unificada
 * Recupera todas las valoraciones de un paciente con compatibilidad total
 */
export const getPatientAssessments = async (documentNumber, userId) => {
  try {
    console.log('=== RECUPERANDO VALORACIONES CON NUEVO SERVICIO ===');
    console.log('Documento:', documentNumber, 'Usuario:', userId);

    if (!userId || !documentNumber) {
      throw new Error('Faltan parámetros requeridos (userId o documentNumber)');
    }

    const assessmentsCollectionRef = collection(db, "artifacts", appId, "users", userId, "assessments");
    
    // Obtener todas las valoraciones del paciente
    const q = query(
      assessmentsCollectionRef, 
      where("generalInfo.documentNumber", "==", documentNumber),
      orderBy("firestoreTimestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const assessments = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Normalizar datos para compatibilidad
      const normalizedAssessment = {
        id: doc.id,
        // Datos originales
        ...data,
        // Campos normalizados para compatibilidad
        patientName: data.generalInfo?.patientName || data.patientName,
        documentNumber: data.generalInfo?.documentNumber || data.documentNumber,
        assessmentDate: data.generalInfo?.assessmentDate || data.savedAtDate?.split('T')[0],
        savedAtDate: data.savedAtDate || data.firestoreTimestamp?.toDate()?.toLocaleString(),
        // Timestamps para ordenar
        sortDate: data.firestoreTimestamp?.toDate() || new Date(data.savedAtDate) || new Date(0),
        // Indicadores de esquema
        hasUnifiedSchema: !!data.unifiedSchema,
        schemaVersion: data.schemaVersion || 'legacy'
      };

      assessments.push(normalizedAssessment);
    });

    console.log(`✅ Recuperadas ${assessments.length} valoraciones`);
    console.log('Esquemas encontrados:', {
      unificados: assessments.filter(a => a.hasUnifiedSchema).length,
      legacy: assessments.filter(a => !a.hasUnifiedSchema).length
    });

    return {
      success: true,
      assessments,
      total: assessments.length
    };

  } catch (error) {
    console.error('❌ Error en getPatientAssessments:', error);
    throw new Error(`Error al recuperar valoraciones: ${error.message}`);
  }
};

/**
 * FASE 3.2: Función para obtener todas las valoraciones del usuario (VERSIÓN CORREGIDA)
 * Recupera todas las valoraciones con agrupación por paciente y manejo de fechas robusto.
 */
export const getAllUserAssessments = async (userId) => {
  try {
    console.log('=== RECUPERANDO TODAS LAS VALORACIONES (VERSIÓN CORREGIDA) ===');
    console.log('Usuario:', userId);

    if (!userId) {
      throw new Error('userId requerido');
    }

    const assessmentsCollectionRef = collection(db, "artifacts", appId, "users", userId, "assessments");
    
    // La consulta inicial no necesita ordenar por un campo que puede no existir.
    // Ordenaremos los datos en el código después de normalizarlos.
    const querySnapshot = await getDocs(assessmentsCollectionRef);
    
    const allAssessments = [];
    const patientGroups = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // --- ¡AQUÍ ESTÁ LA CORRECCIÓN MEJORADA! ---
      // Función interna para obtener una fecha válida sin importar el formato.
      const getSafeSortDate = (docData) => {
        try {
          // 1. Prioridad: El timestamp de Firestore (formato nuevo y correcto).
          if (docData.firestoreTimestamp) {
            // Verificar si es un objeto Timestamp de Firestore
            if (typeof docData.firestoreTimestamp.toDate === 'function') {
              return docData.firestoreTimestamp.toDate();
            }
            // Si es un objeto con segundos (Timestamp serializado)
            if (docData.firestoreTimestamp.seconds) {
              return new Date(docData.firestoreTimestamp.seconds * 1000);
            }
            // Si es una fecha en formato ISO string
            if (typeof docData.firestoreTimestamp === 'string') {
              const date = new Date(docData.firestoreTimestamp);
              if (!isNaN(date)) return date;
            }
          }
          
          // 2. Fallback: El campo 'savedAtDate' de las valoraciones antiguas.
          if (docData.savedAtDate) {
            // new Date() puede parsear diferentes formatos de texto.
            const date = new Date(docData.savedAtDate);
            if (!isNaN(date)) return date;
          }
          
          // 3. Fallback: Buscar en otros campos de fecha posibles
          const possibleDateFields = [
            docData.generalInfo?.assessmentDate,
            docData.followUpDate,
            docData.assessmentDate,
            docData.metadata?.createdAt
          ];
          
          for (const dateField of possibleDateFields) {
            if (dateField) {
              const date = new Date(dateField);
              if (!isNaN(date)) return date;
            }
          }
          
          // 4. Fallback final: Si no hay fecha, se pone una muy antigua para que quede al final.
          return new Date(0);
        } catch (error) {
          console.warn('Error procesando fecha para ordenamiento:', error, docData);
          return new Date(0);
        }
      };
      
      // Normalizar datos
      const normalizedAssessment = {
        id: doc.id,
        ...data,
        patientName: data.generalInfo?.patientName || data.patientName,
        documentNumber: data.generalInfo?.documentNumber || data.documentNumber,
        assessmentDate: data.generalInfo?.assessmentDate || data.savedAtDate?.split('T')[0],
        savedAtDate: data.savedAtDate || (data.firestoreTimestamp && typeof data.firestoreTimestamp.toDate === 'function' ? data.firestoreTimestamp.toDate().toLocaleString() : 'N/A'),
        sortDate: getSafeSortDate(data), // <-- Usamos la nueva función segura
        hasUnifiedSchema: !!data.unifiedSchema,
        schemaVersion: data.schemaVersion || 'legacy'
      };

      allAssessments.push(normalizedAssessment);
    });

    // Ahora ordenamos la lista completa de forma segura
    allAssessments.sort((a, b) => b.sortDate - a.sortDate);

    // Agrupar por paciente (esta parte no cambia)
    allAssessments.forEach(assessment => {
      const docNumber = assessment.documentNumber;
      if (docNumber) {
        if (!patientGroups[docNumber]) {
          patientGroups[docNumber] = {
            patientName: assessment.patientName,
            documentNumber: docNumber,
            assessments: [],
            totalAssessments: 0,
            mostRecentDate: null
          };
        }
        
        patientGroups[docNumber].assessments.push(assessment);
        patientGroups[docNumber].totalAssessments++;
        
        if (!patientGroups[docNumber].mostRecentDate || 
            assessment.sortDate > patientGroups[docNumber].mostRecentDate) {
          patientGroups[docNumber].mostRecentDate = assessment.sortDate;
          patientGroups[docNumber].mostRecentAssessment = assessment;
        }
      }
    });

    console.log(`✅ Recuperadas ${allAssessments.length} valoraciones de ${Object.keys(patientGroups).length} pacientes`);
    console.log('Esquemas encontrados:', {
      unificados: allAssessments.filter(a => a.hasUnifiedSchema).length,
      legacy: allAssessments.filter(a => !a.hasUnifiedSchema).length
    });

    return {
      success: true,
      allAssessments,
      patientGroups: Object.values(patientGroups),
      total: allAssessments.length
    };

  } catch (error) {
    console.error('❌ Error en getAllUserAssessments:', error);
    throw new Error(`Error al recuperar valoraciones: ${error.message}`);
  }
};

/**
 * FASE 3.4: Función para obtener la última valoración de un paciente
 * TODO: Implementar para mejorar el flujo de seguimientos
 */
export const getLatestAssessment = async (documentNumber, userId) => {
  try {
    const result = await getPatientAssessments(documentNumber, userId);
    return result.assessments.length > 0 ? result.assessments[0] : null;
  } catch (error) {
    console.error('❌ Error en getLatestAssessment:', error);
    return null;
  }
};

/**
 * Función de utilidad para debugging y verificación
 */
export const verifyDataIntegrity = (assessmentData) => {
  console.log('=== VERIFICACIÓN DE INTEGRIDAD DE DATOS ===');
  console.log('Tipo de valoración detectado:', assessmentData.assessmentType || 'No definido');
  console.log('Tiene objetivos nutricionales:', !!(assessmentData.nutritionalNeeds?.calorieGoal));
  console.log('Esquema unificado:', assessmentData.unifiedSchema || false);
  console.log('Versión del esquema:', assessmentData.schemaVersion || 'Legacy');
  
  return {
    hasUnifiedSchema: !!assessmentData.unifiedSchema,
    hasNutritionalGoals: !!(assessmentData.nutritionalNeeds?.calorieGoal),
    assessmentType: assessmentData.assessmentType,
    isValid: !!assessmentData.generalInfo?.patientName
  };
};

/**
 * FASE 3.3: Función para recuperar y normalizar historial completo de un paciente
 * Recupera TODAS las valoraciones de un paciente específico y las normaliza,
 * ordenadas de la más reciente a la más antigua.
 */
export const getAndNormalizePatientHistory = async (documentNumber, userId) => {
  try {
    console.log('=== RECUPERANDO HISTORIAL NORMALIZADO ===');
    console.log('Documento:', documentNumber, 'Usuario:', userId);

    if (!userId || !documentNumber) {
      throw new Error('Faltan parámetros para buscar el historial del paciente.');
    }

    const assessmentsCollectionRef = collection(db, "artifacts", appId, "users", userId, "assessments");
    const q = query(
      assessmentsCollectionRef,
      where("generalInfo.documentNumber", "==", documentNumber)
    );

    const querySnapshot = await getDocs(q);
    const assessments = [];

    querySnapshot.forEach((doc) => {
      const rawData = doc.data();
      
      // Detectar tipo de valoración
      const isFollowUp = rawData.assessmentType === 'follow-up' || 
                        rawData.assessmentType === 'follow-up-nutrition' ||
                        rawData.followUpDetails ||
                        rawData.followUpDate;

      // Normalizar según el tipo detectado
      let normalizedData;
      if (isFollowUp) {
        // Para seguimientos, mantener estructura original pero normalizar campos clave
        normalizedData = {
          ...rawData,
          // Asegurar estructura estándar de generalInfo
          generalInfo: {
            ...rawData.generalInfo,
            patientName: rawData.generalInfo?.patientName || rawData.patientName,
            documentNumber: rawData.generalInfo?.documentNumber || rawData.documentNumber,
            assessmentDate: rawData.generalInfo?.assessmentDate || rawData.followUpDate || rawData.savedAtDate?.split('T')[0],
            weight: rawData.generalInfo?.weight || rawData.followUp_currentWeight || rawData.currentWeight,
            ...rawData.generalInfo
          },
          // Garantizar timestamp para ordenamiento
          sortDate: rawData.firestoreTimestamp?.toDate() || new Date(rawData.savedAtDate) || new Date(0)
        };
      } else {
        // Para valoraciones iniciales, usar normalización estándar
        normalizedData = normalizeInitialAssessment(rawData);
      }

      assessments.push({ 
        id: doc.id, 
        ...normalizedData 
      });
    });

    // Ordenar de más reciente a más antiguo con función segura
    assessments.sort((a, b) => {
      const getSafeDateForSort = (assessment) => {
        try {
          // 1. Usar sortDate si ya fue calculado
          if (assessment.sortDate && assessment.sortDate instanceof Date) {
            return assessment.sortDate;
          }
          
          // 2. Intentar firestoreTimestamp
          if (assessment.firestoreTimestamp) {
            if (typeof assessment.firestoreTimestamp.toDate === 'function') {
              return assessment.firestoreTimestamp.toDate();
            }
            if (assessment.firestoreTimestamp.seconds) {
              return new Date(assessment.firestoreTimestamp.seconds * 1000);
            }
          }
          
          // 3. Fallback a savedAtDate
          if (assessment.savedAtDate) {
            const date = new Date(assessment.savedAtDate);
            if (!isNaN(date)) return date;
          }
          
          // 4. Fallback a otros campos de fecha
          const possibleDates = [
            assessment.generalInfo?.assessmentDate,
            assessment.followUpDate,
            assessment.assessmentDate
          ];
          
          for (const dateStr of possibleDates) {
            if (dateStr) {
              const date = new Date(dateStr);
              if (!isNaN(date)) return date;
            }
          }
          
          return new Date(0);
        } catch (error) {
          console.warn('Error en getSafeDateForSort:', error);
          return new Date(0);
        }
      };
      
      const dateA = getSafeDateForSort(a);
      const dateB = getSafeDateForSort(b);
      return dateB - dateA;
    });

    console.log(`✅ Historial normalizado para ${documentNumber}: ${assessments.length} valoraciones`);
    console.log('Valoraciones por tipo:', {
      iniciales: assessments.filter(a => !a.assessmentType?.includes('follow')).length,
      seguimientos: assessments.filter(a => a.assessmentType?.includes('follow')).length
    });

    return assessments;

  } catch (error) {
    console.error('❌ Error en getAndNormalizePatientHistory:', error);
    throw new Error(`Error al recuperar historial del paciente: ${error.message}`);
  }
};

/**
 * FASE 3.3: Función utilitaria para extraer objetivos nutricionales de cualquier valoración
 * Funciona tanto con formato nuevo como legacy - VERSIÓN ULTRA ROBUSTA
 */
export const extractNutritionalObjectives = (assessment) => {
  try {
    console.log('=== EXTRAYENDO OBJETIVOS NUTRICIONALES (VERSIÓN ULTRA ROBUSTA) ===');
    console.log('Tipo de valoración:', assessment.assessmentType || 'inicial');
    console.log('Estructura completa de assessment:', assessment);

    let calorieGoal = null;
    let proteinGoal = null;
    let source = 'no-encontrado';

    // FUNCIÓN AUXILIAR: Extraer número de texto
    const extractNumber = (text) => {
      if (!text) return null;
      const match = String(text).match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    };

    // FUNCIÓN AUXILIAR: Búsqueda recursiva en objetos
    const searchInObject = (obj, targetKeys, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 5) return { calories: null, protein: null };
      
      let calories = null;
      let protein = null;
      
      // Buscar en propiedades directas
      for (const [key, value] of Object.entries(obj)) {
        if (targetKeys.calories.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          const extracted = extractNumber(value);
          if (extracted && extracted > 0 && extracted < 10000) {
            calories = extracted;
          }
        }
        
        if (targetKeys.protein.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          const extracted = extractNumber(value);
          if (extracted && extracted > 0 && extracted < 1000) {
            protein = extracted;
          }
        }
        
        // Buscar recursivamente en objetos anidados
        if (typeof value === 'object' && value !== null) {
          const nested = searchInObject(value, targetKeys, depth + 1);
          if (!calories && nested.calories) calories = nested.calories;
          if (!protein && nested.protein) protein = nested.protein;
        }
      }
      
      return { calories, protein };
    };

    // Palabras clave para búsqueda
    const targetKeys = {
      calories: ['calori', 'kcal', 'energ', 'get', 'adjusted'],
      protein: ['protein', 'proteina', 'totalGrams', 'targetValue', 'finalProtein']
    };

    // PRIORIDAD 1: Schema unificado (nutritionalNeeds)
    if (assessment.nutritionalNeeds) {
      console.log('🔍 Búsqueda PRIORIDAD 1: nutritionalNeeds (esquema unificado)');
      calorieGoal = assessment.nutritionalNeeds.calorieGoal;
      proteinGoal = assessment.nutritionalNeeds.proteinGoal;
      
      if (calorieGoal || proteinGoal) {
        source = 'schema-unificado';
        console.log('✅ ENCONTRADO en schema unificado - Cal:', calorieGoal, 'Prot:', proteinGoal);
      }
    }

    // PRIORIDAD 2: Recálculo nutricional (MÁXIMA PRIORIDAD - DETENER AQUÍ SI SE ENCUENTRA)
    if ((!calorieGoal || !proteinGoal)) {
      console.log('🔍 Búsqueda PRIORIDAD 2: nutritionalRecalculationResults');
      
      // Buscar en múltiples ubicaciones de recálculo - AMPLIADO
      const recalcSources = [
        assessment.nutritionalRecalculationResults?.nutritionalNeeds,
        assessment.followUpDetails?.nutritionalRecalculationResults?.nutritionalNeeds,
        assessment.calculatorResults?.nutritionalRecalculation?.nutritionalNeeds,
        assessment.calculatorResults?.nutritionalRecalculationResults?.nutritionalNeeds,
        // NUEVO: Buscar también en calculatorData si tiene flag de recálculo
        assessment.calculatorData?.hasRecalculation ? assessment.calculatorData : null
      ].filter(Boolean);

      for (const recalc of recalcSources) {
        if (!calorieGoal && recalc.calories) {
          calorieGoal = recalc.calories.adjusted_get || recalc.calories.get || extractNumber(recalc.calories);
        } else if (!calorieGoal && recalc.adjusted_get) {
          // Para datos guardados directamente en calculatorData
          calorieGoal = recalc.adjusted_get || recalc.targetCalories || recalc.calculatedCalories;
        }
        
        if (!proteinGoal && recalc.protein) {
          if (recalc.protein.totalGrams) {
            proteinGoal = extractNumber(recalc.protein.totalGrams);
          } else if (recalc.protein.targetValue) {
            proteinGoal = recalc.protein.targetValue;
          } else {
            proteinGoal = extractNumber(recalc.protein);
          }
        } else if (!proteinGoal && (recalc.targetProtein || recalc.calculatedProtein)) {
          // Para datos guardados directamente en calculatorData
          proteinGoal = recalc.targetProtein || recalc.calculatedProtein || extractNumber(recalc.totalGrams);
        }
        
        if (calorieGoal && proteinGoal) break;
      }
      
      // Si encontramos AL MENOS UNO de los valores en recálculo, USAR SOLO ESOS
      if (calorieGoal || proteinGoal) {
        source = 'recalculo-nutricional';
        console.log('✅ ENCONTRADO en recálculo - Cal:', calorieGoal, 'Prot:', proteinGoal);
        console.log('🚫 DETENIENDO búsqueda - Datos de recálculo tienen prioridad absoluta');
        
        const objectives = {
          calorieGoal: calorieGoal ? parseFloat(calorieGoal) : null,
          proteinGoal: proteinGoal ? parseFloat(proteinGoal) : null,
          assessmentDate: assessment.generalInfo?.assessmentDate || assessment.followUpDate || assessment.savedAtDate?.split('T')[0] || 'valoración anterior',
          source: source,
          assessmentType: assessment.assessmentType || 'inicial'
        };

        console.log('✅ OBJETIVOS EXTRAÍDOS DE RECÁLCULO (PRIORITARIO):', objectives);
        return objectives;
      }
    }

    // PRIORIDAD 3: Resultados de calculadoras (valoraciones iniciales)
    if ((!calorieGoal || !proteinGoal) && assessment.calculatorResults) {
      console.log('🔍 Búsqueda PRIORIDAD 3: calculatorResults');
      
      const searchResult = searchInObject(assessment.calculatorResults, targetKeys);
      if (!calorieGoal && searchResult.calories) calorieGoal = searchResult.calories;
      if (!proteinGoal && searchResult.protein) proteinGoal = searchResult.protein;
      
      if ((calorieGoal || proteinGoal) && source === 'no-encontrado') {
        source = 'calculator-results';
        console.log('✅ ENCONTRADO en calculatorResults - Cal:', calorieGoal, 'Prot:', proteinGoal);
        
        // Si encontramos ambos valores en calculatorResults, detener aquí
        if (calorieGoal && proteinGoal) {
          const objectives = {
            calorieGoal: parseFloat(calorieGoal),
            proteinGoal: parseFloat(proteinGoal),
            assessmentDate: assessment.generalInfo?.assessmentDate || assessment.followUpDate || assessment.savedAtDate?.split('T')[0] || 'valoración anterior',
            source: source,
            assessmentType: assessment.assessmentType || 'inicial'
          };

          console.log('✅ OBJETIVOS EXTRAÍDOS DE CALCULATOR RESULTS (COMPLETOS):', objectives);
          return objectives;
        }
      }
    }

    // PRIORIDAD 4: Datos legacy en calculatorData
    if ((!calorieGoal || !proteinGoal) && assessment.calculatorData) {
      console.log('🔍 Búsqueda PRIORIDAD 4: calculatorData');
      
      const searchResult = searchInObject(assessment.calculatorData, targetKeys);
      if (!calorieGoal && searchResult.calories) calorieGoal = searchResult.calories;
      if (!proteinGoal && searchResult.protein) proteinGoal = searchResult.protein;
      
      if ((calorieGoal || proteinGoal) && source === 'no-encontrado') {
        source = 'calculator-data';
        console.log('✅ ENCONTRADO en calculatorData - Cal:', calorieGoal, 'Prot:', proteinGoal);
      }
    }

    // PRIORIDAD 5: Datos en followUpDetails
    if ((!calorieGoal || !proteinGoal) && assessment.followUpDetails) {
      console.log('🔍 Búsqueda PRIORIDAD 5: followUpDetails');
      
      const searchResult = searchInObject(assessment.followUpDetails, targetKeys);
      if (!calorieGoal && searchResult.calories) calorieGoal = searchResult.calories;
      if (!proteinGoal && searchResult.protein) proteinGoal = searchResult.protein;
      
      if ((calorieGoal || proteinGoal) && source === 'no-encontrado') {
        source = 'followup-details';
        console.log('✅ ENCONTRADO en followUpDetails - Cal:', calorieGoal, 'Prot:', proteinGoal);
      }
    }

    // PRIORIDAD 6: Búsqueda en texto libre (DESHABILITADA PARA SEGUIMIENTOS)
    // El análisis de texto se omite para valoraciones de seguimiento para evitar contaminar
    // los datos calculados con valores incorrectos del texto del diagnóstico
    if ((!calorieGoal || !proteinGoal) && source === 'no-encontrado' && 
        !assessment.assessmentType?.includes('follow')) {
      console.log('🔍 Búsqueda PRIORIDAD 6: análisis de texto (SOLO PARA VALORACIONES INICIALES)');
      
      const searchTexts = [
        assessment.diagnosis,
        assessment.diagnosisText,
        assessment.plan,
        assessment.planText
      ].filter(text => text && typeof text === 'string');

      for (const text of searchTexts) {
        if (!calorieGoal) {
          // Patrones MÁS ESTRICTOS para calorías
          const caloriesPatterns = [
            /objetivo[\s\w]*:?\s*(\d+(?:\.\d+)?)\s*(?:kcal|calorías)/gi,
            /necesidad[\s\w]*:?\s*(\d+(?:\.\d+)?)\s*(?:kcal|calorías)/gi,
            /requerimiento[\s\w]*:?\s*(\d+(?:\.\d+)?)\s*(?:kcal|calorías)/gi
          ];
          
          for (const pattern of caloriesPatterns) {
            const match = text.match(pattern);
            if (match) {
              const extracted = extractNumber(match[0]);
              if (extracted && extracted > 800 && extracted < 5000) {
                calorieGoal = extracted;
                console.log('📝 Extrayendo calorías de texto:', extracted, 'de:', match[0]);
                break;
              }
            }
          }
        }
        
        if (!proteinGoal) {
          // Patrones MÁS ESTRICTOS para proteínas
          const proteinPatterns = [
            /objetivo[\s\w]*prote[ií]na[\s\w]*:?\s*(\d+(?:\.\d+)?)\s*g/gi,
            /necesidad[\s\w]*prote[ií]na[\s\w]*:?\s*(\d+(?:\.\d+)?)\s*g/gi,
            /requerimiento[\s\w]*prote[ií]na[\s\w]*:?\s*(\d+(?:\.\d+)?)\s*g/gi
          ];
          
          for (const pattern of proteinPatterns) {
            const match = text.match(pattern);
            if (match) {
              const extracted = extractNumber(match[0]);
              if (extracted && extracted > 20 && extracted < 200) {
                proteinGoal = extracted;
                console.log('📝 Extrayendo proteínas de texto:', extracted, 'de:', match[0]);
                break;
              }
            }
          }
        }
        
        if (calorieGoal && proteinGoal) break;
      }
      
      if ((calorieGoal || proteinGoal) && source === 'no-encontrado') {
        source = 'text-analysis';
        console.log('⚠️ USANDO análisis de texto - Cal:', calorieGoal, 'Prot:', proteinGoal);
      }
    } else if (assessment.assessmentType?.includes('follow')) {
      console.log('🚫 OMITIENDO análisis de texto para valoración de seguimiento');
    }

    // PRIORIDAD 7: Búsqueda exhaustiva en toda la estructura
    if ((!calorieGoal || !proteinGoal)) {
      console.log('🔍 Búsqueda PRIORIDAD 7: búsqueda exhaustiva en todo el objeto');
      
      const searchResult = searchInObject(assessment, targetKeys);
      if (!calorieGoal && searchResult.calories) calorieGoal = searchResult.calories;
      if (!proteinGoal && searchResult.protein) proteinGoal = searchResult.protein;
      
      if ((calorieGoal || proteinGoal) && source === 'no-encontrado') {
        source = 'busqueda-exhaustiva';
        console.log('✅ ENCONTRADO en búsqueda exhaustiva - Cal:', calorieGoal, 'Prot:', proteinGoal);
      }
    }

    // Validar y construir resultado
    if (calorieGoal || proteinGoal) {
      // Validar rangos razonables
      if (calorieGoal && (calorieGoal < 500 || calorieGoal > 10000)) {
        console.log('⚠️ Calorías fuera de rango razonable:', calorieGoal);
        calorieGoal = null;
      }
      
      if (proteinGoal && (proteinGoal < 10 || proteinGoal > 500)) {
        console.log('⚠️ Proteínas fuera de rango razonable:', proteinGoal);
        proteinGoal = null;
      }
      
      if (calorieGoal || proteinGoal) {
        const objectives = {
          calorieGoal: calorieGoal ? parseFloat(calorieGoal) : null,
          proteinGoal: proteinGoal ? parseFloat(proteinGoal) : null,
          assessmentDate: assessment.generalInfo?.assessmentDate || assessment.followUpDate || assessment.savedAtDate?.split('T')[0] || 'valoración anterior',
          source: source,
          assessmentType: assessment.assessmentType || 'inicial'
        };

        console.log('✅ OBJETIVOS EXTRAÍDOS EXITOSAMENTE:', objectives);
        return objectives;
      }
    }

    console.log('❌ NO SE ENCONTRARON OBJETIVOS NUTRICIONALES VÁLIDOS');
    console.log('📋 Estructura disponible para debug:', {
      hasNutritionalNeeds: !!assessment.nutritionalNeeds,
      hasNutritionalRecalc: !!assessment.nutritionalRecalculationResults,
      hasCalculatorResults: !!assessment.calculatorResults,
      hasCalculatorData: !!assessment.calculatorData,
      hasFollowUpDetails: !!assessment.followUpDetails,
      hasGeneralInfo: !!assessment.generalInfo,
      topLevelKeys: Object.keys(assessment)
    });
    
    return null;

  } catch (error) {
    console.error('❌ Error extrayendo objetivos:', error);
    console.error('Assessment object:', assessment);
    return null;
  }
};

export default {
  saveInitialAssessment,
  saveFollowUpAssessment,
  getPatientAssessments,
  getAllUserAssessments,
  getLatestAssessment,
  getAndNormalizePatientHistory,
  extractNutritionalObjectives,
  verifyDataIntegrity
};
