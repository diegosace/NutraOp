
// src/components/assessment/FollowUpSummaryModule.jsx
import React, { useState, useCallback } from 'react';

const FollowUpSummaryModule = ({ 
  followUpData = {},
  onFollowUpDataChange = () => {},
  weightComparison = null,
  labComparison = null,
  fiScoreResults = null,
  refeedingCalculatorResults = null,
  nutritionalRecalculationResults = null,
  nutritionalObjectives = null,
  firstAssessmentDate = null,
  previousWeight = null,
  previousLabs = null,
  diagnosisText = "",
  onDiagnosisTextChange = () => {},
  planText = "",
  onPlanTextChange = () => {},
  patientBasicInfo = {},
  refeedingRiskData = {}
}) => {

  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [apiError, setApiError] = useState('');

  // Función para encontrar los datos de recálculo - MEJORADA para valoraciones guardadas
  const getRecalculationResults = useCallback(() => {
    console.log('=== BUSCANDO DATOS DE RECÁLCULO (MEJORADO) ===');
    console.log('nutritionalRecalculationResults prop:', nutritionalRecalculationResults);
    console.log('followUpData completo:', followUpData);
    
    // PRIORIDAD 1: Datos de recálculo pasados como prop (datos del cálculo actual)
    if (nutritionalRecalculationResults?.nutritionalNeeds && 
        (nutritionalRecalculationResults.nutritionalNeeds.calories || nutritionalRecalculationResults.nutritionalNeeds.protein)) {
      console.log('✅ DATOS VÁLIDOS: nutritionalRecalculationResults prop');
      return nutritionalRecalculationResults;
    }

    // PRIORIDAD 2: Datos en followUpData.nutritionalRecalculationResults
    if (followUpData.nutritionalRecalculationResults?.nutritionalNeeds) {
      console.log('✅ ENCONTRADOS: followUpData.nutritionalRecalculationResults');
      return followUpData.nutritionalRecalculationResults;
    }

    // PRIORIDAD 3: Datos en followUpData.calculatorData con flag de recálculo
    if (followUpData.calculatorData?.hasRecalculation || 
        (followUpData.calculatorData && (followUpData.calculatorData.adjusted_get || followUpData.calculatorData.targetCalories))) {
      console.log('✅ ENCONTRADOS: followUpData.calculatorData (VALORACIÓN GUARDADA)');
      const calcData = followUpData.calculatorData;

      return {
        nutritionalNeeds: {
          calories: {
            adjusted_get: calcData.adjusted_get || calcData.targetCalories || calcData.calculatedCalories,
            get: calcData.get || calcData.targetCalories || calcData.calculatedCalories,
            formula: calcData.calories?.formula || calcData.formula || 'Valoración guardada',
            tmb: calcData.calories?.tmb || calcData.tmb
          },
          protein: {
            totalGrams: calcData.protein?.totalGrams || calcData.totalGrams,
            targetValue: calcData.protein?.targetValue || calcData.targetProtein || calcData.calculatedProtein,
            target: {
              value: calcData.targetProtein ? (calcData.targetProtein / (calcData.weight || 60)).toFixed(1) : null,
              unit: 'g/kg peso',
              baseWeight: calcData.weight,
              weightType: 'Peso utilizado',
              source: calcData.recalculationSource || 'Valoración guardada'
            }
          }
        },
        currentData: {
          weight: calcData.weight,
          bodyTemperature: calcData.bodyTemperature
        },
        nonNutritionalCalories: calcData.nonNutritionalCalories || 0,
        recalculationDate: calcData.recalculationDate,
        source: 'valoracion-guardada'
      };
    }

    // PRIORIDAD 4: Buscar en followUpDetails si existe
    if (followUpData.followUpDetails?.nutritionalRecalculationResults?.nutritionalNeeds) {
      console.log('✅ ENCONTRADOS: followUpDetails.nutritionalRecalculationResults');
      return followUpData.followUpDetails.nutritionalRecalculationResults;
    }

    // PRIORIDAD 5: Buscar en calculatorResults si existe
    if (followUpData.calculatorResults?.nutritionalRecalculation?.nutritionalNeeds) {
      console.log('✅ ENCONTRADOS: calculatorResults.nutritionalRecalculation');
      return followUpData.calculatorResults.nutritionalRecalculation;
    }

    // PRIORIDAD 6: Buscar datos en la estructura directa de followUpData (para compatibilidad)
    if (followUpData.adjusted_get || followUpData.targetCalories || followUpData.calculatedCalories) {
      console.log('✅ RECONSTRUYENDO: desde followUpData directo');
      
      const calorieValue = followUpData.adjusted_get || followUpData.targetCalories || followUpData.calculatedCalories;
      const proteinValue = followUpData.targetProtein || followUpData.calculatedProtein;
      
      if (calorieValue || proteinValue) {
        return {
          nutritionalNeeds: {
            calories: {
              adjusted_get: calorieValue,
              get: followUpData.get || calorieValue,
              formula: 'Datos guardados'
            },
            protein: {
              totalGrams: proteinValue ? `${proteinValue} g/día` : null,
              targetValue: proteinValue,
              target: {
                value: proteinValue && followUpData.currentWeight ? (proteinValue / followUpData.currentWeight).toFixed(1) : null,
                unit: 'g/kg peso',
                baseWeight: followUpData.currentWeight,
                weightType: 'Peso actual',
                source: 'Datos guardados'
              }
            }
          },
          currentData: {
            weight: followUpData.currentWeight,
            bodyTemperature: followUpData.bodyTemperature
          },
          nonNutritionalCalories: 0,
          recalculationDate: followUpData.followUpDate,
          source: 'datos-directos'
        };
      }
    }

    console.log('❌ NO SE ENCONTRARON DATOS DE RECÁLCULO');
    return null;
  }, [nutritionalRecalculationResults, followUpData]);

  const finalRecalculationResults = getRecalculationResults();

  // Extraer los valores de calorías y proteínas con múltiples métodos - MEJORADO
  const recalculatedCalories = finalRecalculationResults?.nutritionalNeeds?.calories?.adjusted_get || 
                               finalRecalculationResults?.nutritionalNeeds?.calories?.get ||
                               finalRecalculationResults?.adjusted_get || 
                               finalRecalculationResults?.targetCalories ||
                               finalRecalculationResults?.dailyCalories ||
                               finalRecalculationResults?.calculatedCalories ||
                               // Intentar extraer de currentData si está ahí
                               finalRecalculationResults?.currentData?.calories?.adjusted_get ||
                               finalRecalculationResults?.currentData?.calories?.get ||
                               // Si es un número directo
                               (typeof finalRecalculationResults?.nutritionalNeeds?.calories === 'number' 
                                 ? finalRecalculationResults.nutritionalNeeds.calories 
                                 : null) ||
                               // Buscar en followUpData si no se encuentra en finalRecalculationResults
                               followUpData.adjusted_get ||
                               followUpData.targetCalories ||
                               followUpData.calculatedCalories ||
                               null;

  // Para proteínas, intentar múltiples métodos de extracción - MEJORADO
  let recalculatedProtein = null;

  if (finalRecalculationResults?.nutritionalNeeds?.protein?.totalGrams) {
    const proteinStr = finalRecalculationResults.nutritionalNeeds.protein.totalGrams.toString();
    const match = proteinStr.match(/(\d+(?:\.\d+)?)/);
    recalculatedProtein = match ? parseFloat(match[1]) : proteinStr;
  } else if (finalRecalculationResults?.nutritionalNeeds?.protein?.targetValue) {
    recalculatedProtein = finalRecalculationResults.nutritionalNeeds.protein.targetValue;
  } else if (finalRecalculationResults?.totalGrams) {
    const proteinStr = finalRecalculationResults.totalGrams.toString();
    const match = proteinStr.match(/(\d+(?:\.\d+)?)/);
    recalculatedProtein = match ? parseFloat(match[1]) : finalRecalculationResults.totalGrams;
  } else if (finalRecalculationResults?.targetProtein) {
    recalculatedProtein = finalRecalculationResults.targetProtein;
  } else if (finalRecalculationResults?.dailyProtein) {
    recalculatedProtein = finalRecalculationResults.dailyProtein;
  } else if (finalRecalculationResults?.calculatedProtein) {
    recalculatedProtein = finalRecalculationResults.calculatedProtein;
  }
  // Buscar en currentData si no se encontró antes
  else if (finalRecalculationResults?.currentData?.protein?.totalGrams) {
    const proteinStr = finalRecalculationResults.currentData.protein.totalGrams.toString();
    const match = proteinStr.match(/(\d+(?:\.\d+)?)/);
    recalculatedProtein = match ? parseFloat(match[1]) : proteinStr;
  } else if (finalRecalculationResults?.currentData?.protein?.targetValue) {
    recalculatedProtein = finalRecalculationResults.currentData.protein.targetValue;
  }
  // Si es un número directo en protein
  else if (typeof finalRecalculationResults?.nutritionalNeeds?.protein === 'number') {
    recalculatedProtein = finalRecalculationResults.nutritionalNeeds.protein;
  }
  // NUEVO: Buscar en followUpData si no se encuentra en finalRecalculationResults
  else if (followUpData.targetProtein) {
    recalculatedProtein = followUpData.targetProtein;
  } else if (followUpData.calculatedProtein) {
    recalculatedProtein = followUpData.calculatedProtein;
  } else if (followUpData.totalGrams) {
    const proteinStr = followUpData.totalGrams.toString();
    const match = proteinStr.match(/(\d+(?:\.\d+)?)/);
    recalculatedProtein = match ? parseFloat(match[1]) : followUpData.totalGrams;
  }

  console.log('=== VALORES EXTRAÍDOS ===');
  console.log('recalculatedCalories:', recalculatedCalories);
  console.log('recalculatedProtein:', recalculatedProtein);
  console.log('finalRecalculationResults:', finalRecalculationResults);

  const displayValue = (value, unit = '', precision = 1) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return <span className="font-normal text-gray-500">-</span>;
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return <>{value.toFixed(precision)} {unit}</>;
    }
    return <>{String(value)} {unit}</>;
  };

  const SectionTitle = ({ children, colorClass = "text-slate-700" }) => (
    <h3 className={`text-lg font-semibold ${colorClass} mb-2 pb-1 border-b border-slate-200`}>{children}</h3>
  );

  const DataItem = ({ label, value, fullWidth = false, colorClass = "" }) => (
    <div className={`py-1 ${fullWidth ? 'sm:col-span-2 md:col-span-3 lg:col-span-4' : ''}`}>
      <span className="font-medium text-gray-600">{label}:</span>{' '}
      <span className={`text-gray-800 font-semibold ${colorClass}`}>{value}</span>
    </div>
  );

  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const getDiseasePhaseText = (phase) => {
    const phases = {
      'hospitalizacionGeneral': 'Hospitalización General (No crítico)',
      'agudaTemprana': 'Fase Aguda Temprana (Días 1-2 UCI/Crítico)',
      'agudaTardia': 'Fase Aguda Tardía (Días 3-7 UCI/Crítico)',
      'recuperacion': 'Fase de Recuperación (Post-UCI/Sala General)'
    };
    return phases[phase] || phase;
  };

  const getNutritionRouteText = (route) => {
    const routes = {
      'oral': 'Oral',
      'oralSNO': 'Oral con Suplementos (SNOs)',
      'enteralNE': 'Nutrición Enteral (NE)',
      'parenteralNP': 'Nutrición Parenteral (NP)',
      'mixta': 'Mixta (NE/NP)',
      'porDefinir': 'No Definida / Por Determinar'
    };
    return routes[route] || route;
  };

  // Calcular calorías no nutricionales basándose en los datos de la página principal
  const calculateNonNutritionalCalories = () => {
    let total = 0;
    if (followUpData.hasPropofol) {
      const rate = parseFloat(followUpData.followUp_propofol_rate) || 0;
      const duration = parseFloat(followUpData.followUp_propofol_duration) || 0;
      total += rate * duration * 1.1;
    }
    if (followUpData.hasDextrose) {
      const concentration = parseFloat(followUpData.followUp_dextrose_concentration) || 0;
      const volume = parseFloat(followUpData.followUp_dextrose_volume) || 0;
      total += (concentration / 100) * volume * 3.4;
    }
    return total;
  };

  const getNutritionalCalculation = () => {
    const nonNutritionalCals = calculateNonNutritionalCalories();

    if (followUpData.nutritionRoute === 'enteralNE') {
      const volume = parseFloat(followUpData.followUp_enActualIntakeVolume) || 0;
      const calsPerMl = parseFloat(followUpData.followUp_enCaloriesPerMl) || 0;
      const protPerMl = parseFloat(followUpData.followUp_enProteinPerMl) || 0;
      return {
        calories: volume * calsPerMl,
        protein: volume * protPerMl,
        totalCalories: (volume * calsPerMl) + nonNutritionalCals,
        volume: volume,
        type: 'Enteral'
      };
    } else if (followUpData.nutritionRoute === 'parenteralNP') {
      const volume = parseFloat(followUpData.followUp_npActualIntakeVolume) || 0;
      const calsPerMl = parseFloat(followUpData.followUp_npCaloriesPerMl) || 0;
      const protPerMl = parseFloat(followUpData.followUp_npProteinPerMl) || 0;
      return {
        calories: volume * calsPerMl,
        protein: volume * protPerMl,
        totalCalories: (volume * calsPerMl) + nonNutritionalCals,
        volume: volume,
        type: 'Parenteral'
      };
    } else if (followUpData.nutritionRoute === 'mixta') {
      const neVolume = parseFloat(followUpData.followUp_mixedNeVolume) || 0;
      const neCalsPerMl = parseFloat(followUpData.followUp_mixedNeCaloriesPerMl) || 0;
      const neProtPerMl = parseFloat(followUpData.followUp_mixedNeProteinPerMl) || 0;

      const npVolume = parseFloat(followUpData.followUp_mixedNpVolume) || 0;
      const npCalsPerMl = parseFloat(followUpData.followUp_mixedNpCaloriesPerMl) || 0;
      const npProtPerMl = parseFloat(followUpData.followUp_mixedNpProteinPerMl) || 0;

      const totalCals = (neVolume * neCalsPerMl) + (npVolume * npCalsPerMl);
      const totalProt = (neVolume * neProtPerMl) + (npVolume * npProtPerMl);

      return {
        calories: totalCals,
        protein: totalProt,
        totalCalories: totalCals + nonNutritionalCals,
        volume: neVolume + npVolume,
        type: 'Mixta',
        neDetails: { volume: neVolume, calories: neVolume * neCalsPerMl, protein: neVolume * neProtPerMl },
        npDetails: { volume: npVolume, calories: npVolume * npCalsPerMl, protein: npVolume * npProtPerMl }
      };
    }

    return {
      calories: 0,
      protein: 0,
      totalCalories: nonNutritionalCals,
      volume: 0,
      type: 'Oral/Otros'
    };
  };

  const nutritionalCalc = getNutritionalCalculation();

  const getObjectiveStatus = (actual, target) => {
    if (!target || target <= 0) return { status: 'sin-objetivo', color: 'text-gray-500', icon: '❓' };

    const percentage = (actual / target) * 100;

    if (percentage >= 90 && percentage <= 110) {
      return { status: 'cumplido', color: 'text-green-600', icon: '✅', percentage };
    } else if (percentage >= 80 && percentage < 90) {
      return { status: 'bajo', color: 'text-yellow-600', icon: '⚠️', percentage };
    } else if (percentage > 110 && percentage <= 120) {
      return { status: 'alto', color: 'text-blue-600', icon: '📈', percentage };
    } else if (percentage < 80) {
      return { status: 'deficitario', color: 'text-red-600', icon: '🔻', percentage };
    } else {
      return { status: 'excesivo', color: 'text-orange-600', icon: '⬆️', percentage };
    }
  };

  const calorieObjectiveStatus = nutritionalObjectives ? 
    getObjectiveStatus(nutritionalCalc.totalCalories, nutritionalObjectives.calorieGoal) : null;
  const proteinObjectiveStatus = nutritionalObjectives ? 
    getObjectiveStatus(nutritionalCalc.protein, nutritionalObjectives.proteinGoal) : null;

  // Funciones para integración con IA
  const callGeminiAPI = async (prompt) => {
    setApiError('');
    let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 
    if (!apiKey) { setApiError("API Key de Gemini no configurada."); return "API Key no configurada."; }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) {
        let errorBodyText = "No se pudo obtener el cuerpo del error."; try { errorBodyText = await response.text(); } catch (e) { console.error("Error al leer el cuerpo del error de la API:", e); }
        console.error("Error en la API de Gemini - Status:", response.status, "Cuerpo:", errorBodyText);
        const displayError = `Error al contactar la IA: ${response.status}. ${errorBodyText.substring(0,150)}... (Ver consola).`;
        setApiError(displayError); return displayError;
      }
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0 && result.candidates[0].content.parts[0].text) {
        return result.candidates[0].content.parts[0].text;
      } else { setApiError("La IA no pudo generar una respuesta válida."); return "La IA no pudo generar una respuesta válida."; }
    } catch (error) { setApiError("Error de conexión con la IA."); return "Error de conexión con la IA."; }
  };

  const generateFollowUpSummaryForIA = () => {
    let summary = `VALORACIÓN DE SEGUIMIENTO NUTRICIONAL:\n\n`;

    // Datos básicos del seguimiento
    summary += `Fecha de Seguimiento: ${followUpData.followUpDate || 'N/A'}\n`;
    summary += `Paciente: ${followUpData.patientName || 'N/A'}\n`;
    summary += `Documento: ${followUpData.documentNumber || 'N/A'}\n`;
    if (firstAssessmentDate) {
      summary += `Días desde primera valoración: ${calculateDaysBetween(firstAssessmentDate, followUpData.followUpDate)}\n`;
    }
    summary += `\n`;

    // Estado clínico actual
    summary += `ESTADO CLÍNICO ACTUAL:\n`;
    summary += `- Fase de enfermedad: ${getDiseasePhaseText(followUpData.diseasePhase)}\n`;
    summary += `- Estado respiratorio: ${followUpData.respiratoryStatus || 'N/A'}\n`;
    summary += `- Temperatura: ${followUpData.bodyTemperature || 'N/A'}°C\n`;
    summary += `- Estado hemodinámico: ${followUpData.followUp_hemodynamicStatus || 'N/A'}\n`;
    summary += `- Uso de vasopresores: ${followUpData.followUp_vasopressorUse || 'N/A'}\n`;
    if (followUpData.followUp_vasopressorUse === 'si') {
      summary += `- Detalles vasopresores: ${followUpData.followUp_vasopressorDetails || 'N/A'}\n`;
      summary += `- Shock incontrolado: ${followUpData.followUp_uncontrolledShock ? 'Sí' : 'No'}\n`;
    }
    if (followUpData.followUp_clinicalChanges) {
      summary += `- Cambios clínicos observados: ${followUpData.followUp_clinicalChanges}\n`;
    }
    summary += `\n`;

    // Cambios antropométricos
    summary += `CAMBIOS ANTROPOMÉTRICOS:\n`;
    summary += `- Peso actual: ${followUpData.currentWeight || 'N/A'} kg\n`;
    if (weightComparison && previousWeight) {
      summary += `- Peso anterior: ${previousWeight.weight} kg (${previousWeight.date})\n`;
      summary += `- Cambio de peso: ${weightComparison.difference > 0 ? '+' : ''}${weightComparison.difference.toFixed(1)} kg (${weightComparison.percentChange > 0 ? '+' : ''}${weightComparison.percentChange.toFixed(1)}%)\n`;
      summary += `- Período de análisis: ${calculateDaysBetween(previousWeight.date, followUpData.followUpDate)} días\n`;
      summary += `- Estado: ${weightComparison.status}\n`;
      if (Math.abs(weightComparison.percentChange) >= 5) {
        summary += `- ⚠️ Cambio clínicamente significativo (≥5%)\n`;
      }
    }
    summary += `\n`;

    // Vía de nutrición y aportes
    summary += `VÍA DE NUTRICIÓN Y APORTES:\n`;
    summary += `- Vía de nutrición: ${getNutritionRouteText(followUpData.nutritionRoute)}\n`;
    if (nutritionalCalc.type !== 'Oral/Otros') {
      summary += `- Volumen administrado: ${nutritionalCalc.volume} mL/día\n`;
      summary += `- Calorías nutricionales: ${nutritionalCalc.calories.toFixed(1)} kcal/día\n`;
      summary += `- Proteínas: ${nutritionalCalc.protein.toFixed(1)} g/día\n`;
      summary += `- Calorías totales: ${nutritionalCalc.totalCalories.toFixed(1)} kcal/día\n`;

      if (nutritionalCalc.type === 'Mixta') {
        summary += `  - Componente Enteral: ${nutritionalCalc.neDetails.volume} mL/día, ${nutritionalCalc.neDetails.calories.toFixed(1)} kcal, ${nutritionalCalc.neDetails.protein.toFixed(1)} g proteína\n`;
        summary += `  - Componente Parenteral: ${nutritionalCalc.npDetails.volume} mL/día, ${nutritionalCalc.npDetails.calories.toFixed(1)} kcal, ${nutritionalCalc.npDetails.protein.toFixed(1)} g proteína\n`;
      }
    }

    // Calorías no nutricionales
    const nonNutritionalCals = calculateNonNutritionalCalories();
    if (nonNutritionalCals > 0) {
      summary += `- Calorías no nutricionales: ${nonNutritionalCals.toFixed(1)} kcal/día\n`;
      if (followUpData.hasPropofol) {
        summary += `  - Propofol: ${((parseFloat(followUpData.followUp_propofol_rate) || 0) * (parseFloat(followUpData.followUp_propofol_duration) || 0) * 1.1).toFixed(1)} kcal/día\n`;
      }
      if (followUpData.hasDextrose) {
        summary += `  - Dextrosa: ${(((parseFloat(followUpData.followUp_dextrose_concentration) || 0) / 100) * (parseFloat(followUpData.followUp_dextrose_volume) || 0) * 3.4).toFixed(1)} kcal/día\n`;
      }
    }

    // Comparación con objetivos
    if (nutritionalObjectives) {
      summary += `\nCUMPLIMIENTO DE OBJETIVOS NUTRICIONALES:\n`;
      summary += `- Objetivos establecidos en valoración del ${nutritionalObjectives.assessmentDate}\n`;
      summary += `- Objetivo calórico: ${nutritionalObjectives.calorieGoal} kcal/día\n`;
      summary += `- Objetivo proteico: ${nutritionalObjectives.proteinGoal} g/día\n`;

      if (calorieObjectiveStatus) {
        summary += `- Cumplimiento calórico: ${calorieObjectiveStatus.percentage.toFixed(1)}% (${calorieObjectiveStatus.status})\n`;
      }
      if (proteinObjectiveStatus) {
        summary += `- Cumplimiento proteico: ${proteinObjectiveStatus.percentage.toFixed(1)}% (${proteinObjectiveStatus.status})\n`;
      }
    }
    summary += `\n`;

    // Tolerancia a nutrición enteral (FI Score)
    if (fiScoreResults) {
      summary += `TOLERANCIA A NUTRICIÓN ENTERAL (FI SCORE):\n`;
      summary += `- Score total: ${fiScoreResults.totalScore} puntos\n`;
      summary += `- Interpretación: ${fiScoreResults.interpretation}\n`;
      summary += `- Componentes: ${fiScoreResults.details.join(', ')}\n`;
      summary += `- Recomendación: ${fiScoreResults.recommendation}\n`;
      summary += `\n`;
    }

    // Laboratorios y tendencias
    if (labComparison) {
      summary += `TENDENCIAS DE LABORATORIOS:\n`;
      summary += `- Referencia: ${labComparison.previousType} del ${labComparison.previousDate}\n`;
      summary += `- Cambios significativos detectados: ${labComparison.hasSignificantChanges ? 'Sí' : 'No'}\n`;

      if (labComparison.electrolyteConcerns && labComparison.electrolyteConcerns.length > 0) {
        summary += `- ⚠️ ELECTROLITOS CRÍTICOS (Riesgo síndrome realimentación):\n`;
        labComparison.electrolyteConcerns.forEach(concern => {
          summary += `  * ${concern.displayName}: ${concern.currentValue.toFixed(1)} (cambio: ${concern.percentChange.toFixed(1)}%)`;
          if (concern.isLow) summary += ` - VALOR BAJO`;
          if (concern.significantDrop) summary += ` - CAÍDA >10%`;
          summary += `\n`;
        });
      }

      // Resumen de otros laboratorios con cambios
      const significantChanges = Object.entries(labComparison.comparison).filter(([key, data]) => 
        data.percentChange !== null && Math.abs(data.percentChange) >= 5
      );
      if (significantChanges.length > 0) {
        summary += `- Otros cambios significativos (≥5%):\n`;
        significantChanges.forEach(([labKey, data]) => {
          const labNames = {
            sodium: 'Sodio', glucose: 'Glucosa', creatinine: 'Creatinina',
            bun: 'BUN', ast: 'AST', alt: 'ALT', alkPhos: 'Fosfatasa Alcalina',
            triglycerides: 'Triglicéridos', crp: 'Proteína C Reactiva'
          };
          const labName = labNames[labKey] || labKey;
          summary += `  * ${labName}: ${data.current.toFixed(1)} (${data.percentChange > 0 ? '+' : ''}${data.percentChange.toFixed(1)}%)\n`;
        });
      }
      summary += `\n`;
    }

    // Síndrome de realimentación
    if (refeedingCalculatorResults && refeedingCalculatorResults.diagnostico) {
      summary += `EVALUACIÓN SÍNDROME DE REALIMENTACIÓN:\n`;
      summary += `- Diagnóstico: ${refeedingCalculatorResults.diagnostico.diagnostico}\n`;
      if (refeedingCalculatorResults.diagnostico.severity) {
        summary += `- Severidad: ${refeedingCalculatorResults.diagnostico.severity}\n`;
      }
      summary += `- Electrolitos afectados: ${refeedingCalculatorResults.diagnostico.affectedElectrolytes}\n`;
      summary += `- Síntomas documentados: ${refeedingCalculatorResults.diagnostico.totalSymptoms}\n`;
      summary += `- Criterio temporalidad: ${refeedingCalculatorResults.diagnostico.temporalityCriteriaMet ? 'Cumplido' : 'No cumplido'}\n`;
      if (refeedingCalculatorResults.diagnostico.details) {
        summary += `- Detalles: ${refeedingCalculatorResults.diagnostico.details}\n`;
      }
      summary += `\n`;
    }

    // Plan y observaciones
    summary += `PLAN Y OBSERVACIONES:\n`;
    if (followUpData.followUp_planChanges) {
      summary += `- Cambios en el plan: ${followUpData.followUp_planChanges}\n`;
    }
    if (followUpData.followUp_observations) {
      summary += `- Observaciones: ${followUpData.followUp_observations}\n`;
    }
    if (followUpData.followUp_nextEvaluationDate) {
      summary += `- Próxima evaluación: ${followUpData.followUp_nextEvaluationDate}\n`;
    }

    return summary;
  };

  const handleGenerateDiagnosis = async () => { 
    setIsLoadingDiagnosis(true); 
    const followUpSummary = generateFollowUpSummaryForIA(); 
    const prompt = `Actúa como un nutricionista clínico experto especializado en cuidados críticos y seguimiento nutricional. Basándote en la siguiente información de seguimiento nutricional del paciente, redacta un diagnóstico nutricional integrado actualizado (máximo 3-4 párrafos). 

Enfócate en:
1. Evolución clínica y nutricional desde la valoración anterior
2. Tendencias en laboratorios y su significado clínico  
3. Cumplimiento de objetivos nutricionales
4. Tolerancia a la vía de nutrición actual
5. Identificación de complicaciones o riesgos emergentes
6. Estado nutricional actual comparado con el baseline

Evita dar recomendaciones de tratamiento en este diagnóstico, solo análisis e interpretación clínica.

Información del Seguimiento Nutricional:
${followUpSummary}

Diagnóstico Nutricional Integrado Actualizado:`; 
    const generatedText = await callGeminiAPI(prompt); 
    onDiagnosisTextChange(generatedText); 
    setIsLoadingDiagnosis(false); 
  };

  const handleSuggestPlan = async () => { 
    setIsLoadingPlan(true); 
    const followUpSummary = generateFollowUpSummaryForIA(); 
    const prompt = `Actúa como un nutricionista clínico experto especializado en cuidados críticos y seguimiento nutricional. Basándote en la información de seguimiento del paciente y el diagnóstico nutricional integrado actualizado, sugiere un plan de intervención y recomendaciones nutricionales detallado (máximo 4-5 párrafos).

Incluye específicamente:
1. Ajustes a objetivos nutricionales (calóricos y proteicos) basados en la evolución
2. Modificaciones a la vía de nutrición actual si es necesario
3. Manejo de complicaciones identificadas (intolerancia, síndrome realimentación, etc.)
4. Recomendaciones de monitorización específicas (laboratorios, signos clínicos)
5. Cronograma de seguimiento y criterios de escalamiento
6. Consideraciones especiales según la fase de enfermedad actual

Información del Seguimiento Nutricional:
${followUpSummary}

Diagnóstico Nutricional Integrado:
${diagnosisText || "No se ha generado un diagnóstico aún."}

Plan de Intervención y Recomendaciones Actualizado:`; 
    const generatedText = await callGeminiAPI(prompt); 
    onPlanTextChange(generatedText); 
    setIsLoadingPlan(false); 
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl mt-8 border border-slate-200">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 text-center">
        📋 Consolidado de Valoración de Seguimiento
      </h2>

      <div className="space-y-6">
        {/* Información General del Seguimiento */}
        <section className="p-4 bg-blue-50 rounded-md">
          <SectionTitle colorClass="text-blue-700">Información General del Seguimiento</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <DataItem 
              label="Paciente" 
              value={displayValue(
                followUpData.patientName || 
                followUpData.generalInfo?.patientName || 
                patientBasicInfo?.patientName || 
                'No especificado'
              )} 
            />
            <DataItem 
              label="Documento" 
              value={displayValue(
                followUpData.documentNumber || 
                followUpData.generalInfo?.documentNumber || 
                patientBasicInfo?.documentNumber || 
                'No especificado'
              )} 
            />
            <DataItem label="Fecha Seguimiento" value={displayValue(followUpData.followUpDate)} />
            {firstAssessmentDate && (
              <DataItem 
                label="Días desde 1ª Valoración" 
                value={displayValue(calculateDaysBetween(firstAssessmentDate, followUpData.followUpDate), 'días', 0)} 
              />
            )}
          </div>
        </section>

        {/* Estado Clínico Actual */}
        <section className="p-4 bg-yellow-50 rounded-md">
          <SectionTitle colorClass="text-yellow-700">Estado Clínico Actual</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <DataItem label="Fase Enfermedad" value={displayValue(getDiseasePhaseText(followUpData.diseasePhase))} fullWidth />
            <DataItem label="Estado Respiratorio" value={displayValue(followUpData.respiratoryStatus)} />
            <DataItem label="Temperatura" value={displayValue(followUpData.bodyTemperature, '°C')} />
            <DataItem label="Estado Hemodinámico" value={displayValue(followUpData.followUp_hemodynamicStatus)} />
            <DataItem label="Uso Vasopresores" value={displayValue(followUpData.followUp_vasopressorUse)} />
            {followUpData.followUp_vasopressorUse === 'si' && (
              <>
                <DataItem 
                  label="Detalles Vasopresores" 
                  value={displayValue(followUpData.followUp_vasopressorDetails)} 
                  fullWidth 
                />
                <DataItem 
                  label="Shock Incontrolado" 
                  value={followUpData.followUp_uncontrolledShock ? 'Sí' : 'No'}
                  colorClass={followUpData.followUp_uncontrolledShock ? 'text-red-600' : 'text-green-600'}
                />
              </>
            )}
            {followUpData.followUp_clinicalChanges && (
              <DataItem 
                label="Cambios Clínicos" 
                value={displayValue(followUpData.followUp_clinicalChanges)} 
                fullWidth 
              />
            )}
          </div>
        </section>

        {/* Cambios Antropométricos */}
        <section className="p-4 bg-green-50 rounded-md">
          <SectionTitle colorClass="text-green-700">Peso y Cambios Antropométricos</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <DataItem label="Peso Actual" value={displayValue(followUpData.currentWeight, 'kg')} />
            {previousWeight && (
              <DataItem 
                label="Peso Anterior" 
                value={
                  <span>
                    {displayValue(previousWeight.weight, 'kg')} ({previousWeight.date})
                  </span>
                } 
              />
            )}
            {weightComparison && (
              <>
                <DataItem 
                  label="Cambio de Peso" 
                  value={`${weightComparison.difference > 0 ? '+' : ''}${weightComparison.difference.toFixed(1)} kg`}
                  colorClass={
                    weightComparison.status === 'aumento' ? 'text-green-600' :
                    weightComparison.status === 'pérdida' ? 'text-red-600' : 'text-gray-600'
                  }
                />
                <DataItem 
                  label="% Cambio de Peso" 
                  value={`${weightComparison.percentChange > 0 ? '+' : ''}${weightComparison.percentChange.toFixed(1)}%`}
                  colorClass={
                    Math.abs(weightComparison.percentChange) >= 5 ? 'text-orange-600' : 'text-gray-600'
                  }
                />
                {previousWeight && (
                  <DataItem 
                    label="Período Análisis" 
                    value={`${calculateDaysBetween(previousWeight.date, followUpData.followUpDate)} días`} 
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* Calorías No Nutricionales */}
        {followUpData.hasActiveInfusions && (
          <section className="p-4 bg-orange-50 rounded-md">
            <SectionTitle colorClass="text-orange-700">Calorías No Nutricionales</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {followUpData.hasPropofol && (
                <>
                  <DataItem 
                    label="Propofol (tasa)" 
                    value={displayValue(followUpData.followUp_propofol_rate, 'mL/h')} 
                  />
                  <DataItem 
                    label="Propofol (duración)" 
                    value={displayValue(followUpData.followUp_propofol_duration, 'h/día')} 
                  />
                  <DataItem 
                    label="Calorías Propofol" 
                    value={displayValue(
                      (parseFloat(followUpData.followUp_propofol_rate) || 0) * 
                      (parseFloat(followUpData.followUp_propofol_duration) || 0) * 1.1, 
                      'kcal/día'
                    )} 
                  />
                </>
              )}
              {followUpData.hasDextrose && (
                <>
                  <DataItem 
                    label="Dextrosa (concentración)" 
                    value={displayValue(followUpData.followUp_dextrose_concentration, '%')} 
                  />
                  <DataItem 
                    label="Dextrosa (volumen)" 
                    value={displayValue(followUpData.followUp_dextrose_volume, 'mL/día')} 
                  />
                  <DataItem 
                    label="Calorías Dextrosa" 
                    value={displayValue(
                      ((parseFloat(followUpData.followUp_dextrose_concentration) || 0) / 100) * 
                      (parseFloat(followUpData.followUp_dextrose_volume) || 0) * 3.4, 
                      'kcal/día'
                    )} 
                  />
                </>
              )}
              <DataItem 
                label="Total No Nutricionales" 
                value={displayValue(calculateNonNutritionalCalories(), 'kcal/día')}
                colorClass="text-orange-600 font-bold"
              />
            </div>
          </section>
        )}

        {/* Vía de Nutrición y Aportes */}
        <section className="p-4 bg-purple-50 rounded-md">
          <SectionTitle colorClass="text-purple-700">Vía de Nutrición y Aportes Nutricionales</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm">
              <DataItem label="Vía de Nutrición" value={displayValue(getNutritionRouteText(followUpData.nutritionRoute))} />

              {nutritionalCalc.type !== 'Oral/Otros' && (
                <>
                  <DataItem label="Volumen Administrado" value={displayValue(nutritionalCalc.volume, 'mL/día')} />
                  <DataItem label="Calorías Nutricionales" value={displayValue(nutritionalCalc.calories, 'kcal/día')} />
                  <DataItem label="Proteínas" value={displayValue(nutritionalCalc.protein, 'g/día')} />
                  <DataItem 
                    label="Calorías Totales"
                    value={displayValue(nutritionalCalc.totalCalories, 'kcal/día')}
                    colorClass="text-purple-600 font-bold"
                  />
                </>
              )}

              {nutritionalCalc.type === 'Mixta' && (
                <>
                  <div className="md:col-span-3 lg:col-span-4 mt-2 p-2 bg-white rounded border">
                    <p className="text-xs font-medium text-gray-700 mb-1">Desglose Nutrición Mixta:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p><strong>Enteral:</strong> {nutritionalCalc.neDetails.volume} mL/día</p>
                        <p>Calorías: {nutritionalCalc.neDetails.calories.toFixed(1)} kcal</p>
                        <p>Proteínas: {nutritionalCalc.neDetails.protein.toFixed(1)} g</p>
                      </div>
                      <div>
                        <p><strong>Parenteral:</strong> {nutritionalCalc.npDetails.volume} mL/día</p>
                        <p>Calorías: {nutritionalCalc.npDetails.calories.toFixed(1)} kcal</p>
                        <p>Proteínas: {nutritionalCalc.npDetails.protein.toFixed(1)} g</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(followUpData.nutritionRoute === 'oral' || followUpData.nutritionRoute === 'oralSNO') && (
                <>
                  <DataItem 
                    label="% Ingesta Oral" 
                    value={displayValue(followUpData.followUp_oralIntakePercentage)} 
                  />
                  {followUpData.nutritionRoute === 'oralSNO' && (
                    <DataItem 
                      label="Suplementos" 
                      value={displayValue(followUpData.followUp_supplementIntake)} 
                      fullWidth
                    />
                  )}
                </>
              )}
            </div>

            {/* Comparación con Objetivos */}
            {(nutritionalObjectives && (nutritionalObjectives.calorieGoal || nutritionalObjectives.proteinGoal)) && (
              <div className="mt-4 p-3 bg-white rounded border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">📊 Cumplimiento de Objetivos Nutricionales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {nutritionalObjectives.calorieGoal && (
                    <div className="flex items-center justify-between">
                      <span>Calorías:</span>
                      <div className="flex items-center">
                        {calorieObjectiveStatus && (
                          <>
                            <span className={calorieObjectiveStatus.color}>
                              {calorieObjectiveStatus.icon} {calorieObjectiveStatus.percentage?.toFixed(1)}%
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({nutritionalCalc.totalCalories.toFixed(1)}/{nutritionalObjectives.calorieGoal} kcal)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {nutritionalObjectives.proteinGoal && (
                    <div className="flex items-center justify-between">
                      <span>Proteínas:</span>
                      <div className="flex items-center">
                        {proteinObjectiveStatus && (
                          <>
                            <span className={proteinObjectiveStatus.color}>
                              {proteinObjectiveStatus.icon} {proteinObjectiveStatus.percentage?.toFixed(1)}%
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({nutritionalCalc.protein.toFixed(1)}/{nutritionalObjectives.proteinGoal} g)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Objetivos basados en valoración del {nutritionalObjectives.assessmentDate || 'valoración anterior'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Escala de Tolerancia FI Score */}
        {fiScoreResults && (
          <section className="p-4 bg-orange-50 rounded-md">
            <SectionTitle colorClass="text-orange-700">Tolerancia a Nutrición Enteral (FI Score)</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
              <DataItem 
                label="Score Total" 
                value={displayValue(fiScoreResults.totalScore, 'puntos', 0)}
                colorClass="text-orange-600 font-bold"
              />
              <DataItem 
                label="Interpretación" 
                value={displayValue(fiScoreResults.interpretation)}
                colorClass={fiScoreResults.colorClass?.replace('bg-', 'text-').replace('border-', '').replace('-100', '-600').replace('-400', '-600')}
              />
              <div className="md:col-span-3 lg:col-span-4">
                <DataItem 
                  label="Componentes" 
                  value={
                    <div className="text-xs space-y-1 mt-1">
                      {fiScoreResults.details?.map((detail, index) => (
                        <p key={index}>• {detail}</p>
                      ))}
                    </div>
                  }
                  fullWidth
                />
              </div>
              <div className="md:col-span-3 lg:col-span-4 mt-2 p-2 bg-white rounded border">
                <p className="text-xs font-medium text-gray-700">Recomendación:</p>
                <p className="text-xs text-gray-600">{fiScoreResults.recommendation}</p>
              </div>
            </div>
          </section>
        )}

        {/* Comparación de Laboratorios */}
        {labComparison && (
          <section className="p-4 bg-red-50 rounded-md">
            <SectionTitle colorClass="text-red-700">Tendencias de Laboratorios</SectionTitle>
            <div className="space-y-3">
              <div className="text-sm">
                <DataItem 
                  label="Referencia" 
                  value={`${labComparison.previousType} del ${labComparison.previousDate}`} 
                />
                <DataItem 
                  label="Cambios Significativos" 
                  value={labComparison.hasSignificantChanges ? 'Sí' : 'No'}
                  colorClass={labComparison.hasSignificantChanges ? 'text-red-600' : 'text-green-600'}
                />
              </div>

              {/* Alertas de Electrolitos Críticos */}
              {labComparison.electrolyteConcerns?.length > 0 && (
                <div className="p-3 bg-red-100 rounded border border-red-300">
                  <h4 className="text-sm font-bold text-red-800 mb-2">⚠️ Electrolitos Críticos (Riesgo Síndrome Realimentación)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {labComparison.electrolyteConcerns.map((concern, index) => (
                      <div key={index} className="p-2 bg-white rounded">
                        <p className="font-medium">{concern.displayName}</p>
                        <p>Cambio: {concern.percentChange.toFixed(1)}%</p>
                        <p className="text-red-600">
                          {concern.isLow && '🔻 Valor bajo'} 
                          {concern.significantDrop && ' | 📉 Caída >10%'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen de Cambios por Categorías */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {Object.entries(labComparison.comparison || {}).map(([labKey, data]) => {
                  const labNames = {
                    potassium: 'Potasio',
                    phosphorus: 'Fósforo', 
                    magnesium: 'Magnesio',
                    thiamine: 'Tiamina',
                    sodium: 'Sodio',
                    glucose: 'Glucosa',
                    creatinine: 'Creatinina',
                    bun: 'BUN',
                    ast: 'AST',
                    alt: 'ALT',
                    alkPhos: 'Fosfatasa Alc.',
                    triglycerides: 'Triglicéridos',
                    crp: 'PCR'
                  };

                  return (
                    <div key={labKey} className="p-2 bg-white rounded border">
                      <p className="font-medium">{labNames[labKey]}</p>
                      <p className={data.color}>
                        {data.icon} {data.current?.toFixed(1)} 
                        {data.previous && (
                          <span className="text-gray-500">
                            {' '}(vs {data.previous.toFixed(1)})
                          </span>
                        )}
                      </p>
                      {data.percentChange !== null && (
                        <p className="text-xs">
                          {data.percentChange > 0 ? '+' : ''}{data.percentChange.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Síndrome de Realimentación */}
        {refeedingCalculatorResults?.diagnostico && (
          <section className="p-4 bg-yellow-50 rounded-md">
            <SectionTitle colorClass="text-yellow-700">Evaluación Síndrome de Realimentación</SectionTitle>
            <div className="space-y-2 text-sm">
              <DataItem 
                label="Diagnóstico" 
                value={displayValue(refeedingCalculatorResults.diagnostico.diagnostico)}
                colorClass={
                  refeedingCalculatorResults.diagnostico.diagnostico.includes('SÍNDROME DE REALIMENTACIÓN') 
                    ? 'text-red-600 font-bold' 
                    : 'text-yellow-600'
                }
                fullWidth
              />
              {refeedingCalculatorResults.diagnostico.severity && (
                <DataItem 
                  label="Severidad" 
                  value={displayValue(refeedingCalculatorResults.diagnostico.severity)}
                  colorClass="text-red-600"
                />
              )}
              <DataItem 
                label="Electrolitos Afectados" 
                value={displayValue(refeedingCalculatorResults.diagnostico.affectedElectrolytes, '', 0)}
              />
              <DataItem 
                label="Síntomas Documentados" 
                value={displayValue(refeedingCalculatorResults.diagnostico.totalSymptoms, '', 0)}
              />
              <DataItem 
                label="Criterio Temporalidad" 
                value={refeedingCalculatorResults.diagnostico.temporalityCriteriaMet ? 'Cumplido' : 'No cumplido'}
                colorClass={refeedingCalculatorResults.diagnostico.temporalityCriteriaMet ? 'text-green-600' : 'text-red-600'}
              />
              {refeedingCalculatorResults.diagnostico.details && (
                <div className="mt-2 p-2 bg-white rounded border">
                  <p className="text-xs text-gray-600">{refeedingCalculatorResults.diagnostico.details}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Objetivos Nutricionales de Valoración Anterior - MEJORADO */}
        {nutritionalObjectives && (
          <section className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <SectionTitle colorClass="text-blue-700">📊 Objetivos Nutricionales de Referencia</SectionTitle>
            <div className="space-y-4">
              <div className={`p-3 rounded-md border ${
                finalRecalculationResults 
                  ? 'bg-green-100 border-green-300' 
                  : 'bg-yellow-100 border-yellow-300'
              }`}>
                <div className="flex items-center">
                  <svg className={`w-5 h-5 mr-2 ${
                    finalRecalculationResults ? 'text-green-600' : 'text-yellow-600'
                  }`} fill="currentColor" viewBox="0 0 20 20">
                    {finalRecalculationResults ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span className={`font-medium ${
                    finalRecalculationResults ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {finalRecalculationResults 
                      ? `Objetivos actualizados con nuevo recálculo vs. referencia de ${nutritionalObjectives.assessmentType || 'valoración anterior'} del ${nutritionalObjectives.assessmentDate}`
                      : `Usando objetivos de ${nutritionalObjectives.assessmentType || 'valoración anterior'} del ${nutritionalObjectives.assessmentDate} como referencia (no se ha realizado recálculo)`
                    }
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <h5 className="font-medium text-blue-700 mb-2 flex items-center">
                    <span className="mr-2">🔥</span>
                    Objetivo Calórico de Referencia
                  </h5>
                  <p className="text-2xl font-bold text-blue-800">
                    {displayValue(nutritionalObjectives.calorieGoal, 'kcal/día')}
                  </p>
                  <p className="text-sm text-blue-600">
                    {nutritionalObjectives.assessmentType || 'Valoración anterior'} del {nutritionalObjectives.assessmentDate}
                  </p>
                  {nutritionalObjectives.source && (
                    <p className="text-xs text-blue-500">
                      Fuente: {nutritionalObjectives.source}
                    </p>
                  )}
                </div>

                <div className="bg-white p-3 rounded border border-emerald-200">
                  <h5 className="font-medium text-emerald-700 mb-2 flex items-center">
                    <span className="mr-2">🥩</span>
                    Objetivo Proteico de Referencia
                  </h5>
                  <p className="text-2xl font-bold text-emerald-800">
                    {displayValue(nutritionalObjectives.proteinGoal, 'g/día')}
                  </p>
                  <p className="text-sm text-emerald-600">
                    {nutritionalObjectives.assessmentType || 'Valoración anterior'} del {nutritionalObjectives.assessmentDate}
                  </p>
                  {nutritionalObjectives.source && (
                    <p className="text-xs text-emerald-500">
                      Fuente: {nutritionalObjectives.source}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-100 rounded border border-blue-300 text-xs text-blue-700">
                <p>
                  <strong>Nota:</strong> {finalRecalculationResults 
                    ? 'Los objetivos de referencia se muestran para comparación. Los valores actualizados aparecen en la sección de "Recálculo Nutricional" arriba.'
                    : 'Estos son los objetivos establecidos en la valoración anterior. Para obtener objetivos actualizados basados en el peso y condición clínica actual, utilice el módulo de "Recálculo Nutricional" arriba.'
                  }
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Resumen del Recálculo Nutricional - VERSIÓN ROBUSTA */}
        {(finalRecalculationResults || (recalculatedCalories !== null || recalculatedProtein !== null)) && (
          <section className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-md border border-blue-200">
            <SectionTitle colorClass="text-blue-700">📊 Resumen del Recálculo Nutricional</SectionTitle>
            <div className="space-y-4">
              {/* Indicador de que se realizó el recálculo */}
              <div className="p-3 bg-green-100 border border-green-300 rounded-md">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-800 font-medium">
                    Recálculo nutricional realizado exitosamente en esta valoración de seguimiento
                  </span>
                </div>
              </div>

              {/* Datos base del recálculo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <DataItem 
                  label="Fecha del Recálculo" 
                  value={displayValue(followUpData.followUpDate)} 
                />
                <DataItem 
                  label="Peso Utilizado" 
                  value={displayValue(
                    finalRecalculationResults?.currentData?.weight || 
                    followUpData.currentWeight, 
                    'kg'
                  )} 
                />
                {(finalRecalculationResults?.currentData?.bodyTemperature || 
                  followUpData.bodyTemperature) && (
                  <DataItem 
                    label="Temperatura Corporal" 
                    value={displayValue(
                      finalRecalculationResults?.currentData?.bodyTemperature ||
                      followUpData.bodyTemperature, 
                      '°C'
                    )} 
                  />
                )}
                {(finalRecalculationResults?.nonNutritionalCalories > 0) && (
                  <DataItem 
                    label="Calorías No Nutricionales" 
                    value={displayValue(
                      finalRecalculationResults?.nonNutritionalCalories, 
                      'kcal/día'
                    )}
                    colorClass="text-orange-600"
                  />
                )}
              </div>

              {/* Resultados del recálculo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Necesidades Calóricas Actualizadas */}
                {recalculatedCalories !== null && (
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <h5 className="font-medium text-blue-700 mb-2 flex items-center">
                      <span className="mr-2">🔥</span>
                      Necesidades Calóricas Actualizadas
                    </h5>
                    <p className="text-2xl font-bold text-blue-800">
                      {displayValue(recalculatedCalories, 'kcal/día')}
                    </p>
                    <div className="text-sm text-blue-600 space-y-1">
                      <p>
                        <strong>Fórmula:</strong> {
                          finalRecalculationResults?.nutritionalNeeds?.calories?.formula || 
                          'Recálculo en seguimiento'
                        }
                      </p>
                      {finalRecalculationResults?.nutritionalNeeds?.calories?.tmb && (
                        <p>
                          <strong>TMB/REE:</strong> {
                            finalRecalculationResults.nutritionalNeeds.calories.tmb
                          } kcal/día
                        </p>
                      )}
                      {finalRecalculationResults?.nonNutritionalCalories > 0 && (
                        <p className="text-orange-600">
                          <strong>Ajuste:</strong> -{
                            finalRecalculationResults.nonNutritionalCalories
                          } kcal no nutricionales
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Necesidades Proteicas Actualizadas */}
                {recalculatedProtein !== null && (
                  <div className="bg-white p-3 rounded border border-emerald-200">
                    <h5 className="font-medium text-emerald-700 mb-2 flex items-center">
                      <span className="mr-2">🥩</span>
                      Necesidades Proteicas Actualizadas
                    </h5>
                    <p className="text-2xl font-bold text-emerald-800">
                      {displayValue(recalculatedProtein, 'g/día')}
                    </p>
                    <div className="text-sm text-emerald-600 space-y-1">
                      <p>
                        <strong>Objetivo:</strong> {
                          finalRecalculationResults?.nutritionalNeeds?.protein?.target?.value ||
                          'Recálculo personalizado'
                        } {
                          finalRecalculationResults?.nutritionalNeeds?.protein?.target?.unit ||
                          ''
                        }
                      </p>
                      {finalRecalculationResults?.nutritionalNeeds?.protein?.target?.source && (
                        <p>
                          <strong>Fuente:</strong> {
                            finalRecalculationResults.nutritionalNeeds.protein.target.source
                          }
                        </p>
                      )}
                      {finalRecalculationResults?.nutritionalNeeds?.protein?.target?.baseWeight && (
                        <p>
                          <strong>Peso base:</strong> {
                            finalRecalculationResults.nutritionalNeeds.protein.target.weightType
                          } ({
                            finalRecalculationResults.nutritionalNeeds.protein.target.baseWeight.toFixed(1)
                          } kg)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Estado de riesgo de realimentación si está disponible */}
              {finalRecalculationResults?.refeedingRisk && (
                <div className="p-3 bg-white rounded border border-yellow-200">
                  <h5 className="font-medium text-yellow-700 mb-2 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Estado de Riesgo de Realimentación
                  </h5>
                  <p className={`font-bold ${
                    finalRecalculationResults.refeedingRisk.riesgo?.colorClass || 
                    'text-gray-600'
                  }`}>
                    {
                      finalRecalculationResults.refeedingRisk.riesgo?.nivel || 
                      'No evaluado'
                    }
                  </p>
                  {finalRecalculationResults.refeedingRisk.riesgo?.factores?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-yellow-700">Factores de riesgo identificados:</p>
                      <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                        {finalRecalculationResults.refeedingRisk.riesgo.factores.map((factor, index) => (
                          <li key={index}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Consideraciones especiales si las hay */}
              {finalRecalculationResults?.nutritionalNeeds?.protein?.considerations?.length > 0 && (
                <div className="p-3 bg-gray-50 rounded border">
                  <h5 className="font-medium text-gray-700 mb-2">💡 Consideraciones Adicionales</h5>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    {finalRecalculationResults.nutritionalNeeds.protein.considerations.map((consideration, index) => (
                      <li key={index}>{consideration}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nota metodológica */}
              <div className="p-3 bg-blue-100 rounded border border-blue-300 text-xs text-blue-700">
                <p>
                  <strong>Nota:</strong> Estos son los requerimientos recalculados durante este seguimiento.
                  Peso utilizado: {finalRecalculationResults?.currentData?.weight || followUpData.currentWeight || 'N/A'} kg.
                  Los datos están disponibles para futuras valoraciones de seguimiento.
                </p>
              </div>

              {/* Debug info - solo mostrar si no hay resultados visibles */}
              {!recalculatedCalories && !recalculatedProtein && (
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-700">
                  <p><strong>Debug Info:</strong></p>
                  <p>finalRecalculationResults disponible: {finalRecalculationResults ? 'Sí' : 'No'}</p>
                  <p>Estructura de datos: {JSON.stringify(Object.keys(finalRecalculationResults || {}))}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Diagnóstico Nutricional Integrado */}
        <section className="p-4 bg-indigo-50 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <SectionTitle colorClass="text-indigo-700">Diagnóstico Nutricional Integrado</SectionTitle>
            <button 
              type="button" 
              onClick={handleGenerateDiagnosis} 
              disabled={isLoadingDiagnosis} 
              className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:opacity-50 flex items-center"
            > 
              {isLoadingDiagnosis ? ( 
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> 
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> 
                </svg> 
              ) : ( 
                <span className="mr-1">✨</span> 
              )} 
              Generar Diagnóstico (IA) 
            </button>
          </div>
          {apiError && ( 
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm"> 
              <p className="font-semibold">Error de IA:</p> 
              <p>{apiError}</p> 
            </div> 
          )}
          <textarea 
            rows="6" 
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm" 
            placeholder="El diagnóstico nutricional integrado actualizado aparecerá aquí o puede escribirlo manualmente..." 
            value={diagnosisText} 
            onChange={(e) => onDiagnosisTextChange(e.target.value)} 
            disabled={isLoadingDiagnosis} 
          />
        </section>

        {/* Plan de Intervención y Recomendaciones */}
        <section className="p-4 bg-teal-50 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <SectionTitle colorClass="text-teal-700">Plan de Intervención y Recomendaciones</SectionTitle>
            <button 
              type="button" 
              onClick={handleSuggestPlan} 
              disabled={isLoadingPlan || !diagnosisText} 
              className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:opacity-50 flex items-center"
            > 
              {isLoadingPlan ? ( 
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> 
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> 
                </svg> 
              ) : ( 
                <span className="mr-1">✨</span> 
              )} 
              Sugerir Plan (IA) 
            </button>
          </div>
          <textarea 
            rows="8" 
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm" 
            placeholder="El plan de intervención y recomendaciones actualizado aparecerá aquí o puede escribirlo manualmente..." 
            value={planText} 
            onChange={(e) => onPlanTextChange(e.target.value)} 
            disabled={isLoadingPlan} 
          />
          {!diagnosisText && (
            <p className="text-xs text-orange-500 mt-1">
              Se recomienda generar o escribir un diagnóstico antes de sugerir un plan con IA.
            </p>
          )}
        </section>

        {/* Programar Próxima Valoración */}
        <section className="p-4 bg-blue-50 rounded-md border border-blue-200">
          <SectionTitle colorClass="text-blue-700">📅 Programar Próxima Valoración</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Próxima Valoración
                </label>
                <input
                  type="date"
                  value={followUpData.nextAssessmentDate || ''}
                  onChange={(e) => {
                    console.log('Cambiando nextAssessmentDate a:', e.target.value);
                    onFollowUpDataChange && onFollowUpDataChange('nextAssessmentDate', e.target.value);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora de la Cita (Opcional)
                </label>
                <input
                  type="time"
                  value={followUpData.nextAssessmentTime || ''}
                  onChange={(e) => {
                    console.log('Cambiando nextAssessmentTime a:', e.target.value);
                    onFollowUpDataChange && onFollowUpDataChange('nextAssessmentTime', e.target.value);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {followUpData.nextAssessmentDate && (
              <div className="mt-3 p-3 bg-blue-100 rounded-md border border-blue-300">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                  </svg>
                  <span className="text-blue-800 font-medium text-sm">
                    Próxima valoración programada para: {(() => {
                      // Crear fecha local sin conversión de zona horaria
                      const [year, month, day] = followUpData.nextAssessmentDate.split('-');
                      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      
                      return localDate.toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    })()}
                    {followUpData.nextAssessmentTime && ` a las ${followUpData.nextAssessmentTime}`}
                  </span>
                </div>
              </div>
            )}

            {!followUpData.nextAssessmentDate && (
              <div className="mt-3 p-3 bg-gray-100 rounded-md border border-gray-300">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-600 text-sm">
                    No se ha programado una próxima valoración
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Plan y Próximos Pasos */}
        <section className="p-4 bg-slate-50 rounded-md">
          <SectionTitle colorClass="text-slate-700">Plan y Próximos Pasos</SectionTitle>
          <div className="space-y-2 text-sm">
            {followUpData.followUp_planChanges && (
              <DataItem 
                label="Cambios en el Plan" 
                value={displayValue(followUpData.followUp_planChanges)}
                fullWidth
              />
            )}
            {followUpData.followUp_observations && (
              <DataItem 
                label="Observaciones" 
                value={displayValue(followUpData.followUp_observations)}
                fullWidth
              />
            )}
            {followUpData.followUp_nextEvaluationDate && (
              <DataItem 
                label="Próxima Evaluación" 
                value={displayValue(followUpData.followUp_nextEvaluationDate)}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FollowUpSummaryModule;
