// src/pages/FollowUpAssessmentPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebaseConfig.js';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, where } from 'firebase/firestore';
import { getAndNormalizePatientHistory, extractNutritionalObjectives } from '../services/assessmentService.js';
import FollowUpSummaryModule from '../components/assessment/FollowUpSummaryModule.jsx';
import FollowUpNutritionalRecalculationModule from '../components/assessment/FollowUpNutritionalRecalculationModule.jsx';


const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nutria-app';

// Función para limpiar 'undefined' de un objeto (recursivamente)
const cleanUndefined = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj === undefined ? null : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  const cleaned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const cleanedValue = cleanUndefined(value);
      cleaned[key] = cleanedValue === undefined ? null : cleanedValue;
    }
  }
  return cleaned;
};

// Componente FI Score Calculator para evaluar tolerancia a nutrición enteral
const FIScoreCalculator = ({ onFIScoreResult, showCalculator = false }) => {
  const [fiScoreData, setFiScoreData] = useState({
    abdominalDistension: '',
    nauseasVomiting: '',
    diarrhea: '',
    gastricResidualVolume: '',
    hasGRV: false
  });

  const [fiScoreResult, setFiScoreResult] = useState(null);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Lógica especial para VRG - selección automática de náuseas/vómitos
    if (name === 'gastricResidualVolume') {
      const grv = parseFloat(value);
      let autoNauseaScore = '';
      
      if (!isNaN(grv) && grv > 0) {
        if (grv >= 500) {
          autoNauseaScore = '5'; // Vómitos Severos
        } else if (grv >= 250) {
          autoNauseaScore = '2'; // Vómitos Leves
        } else {
          autoNauseaScore = '0'; // No afecta - mantener selección manual o ninguno
        }
      }
      
      setFiScoreData(prev => ({
        ...prev,
        [name]: value,
        nauseasVomiting: autoNauseaScore
      }));
      return;
    }
    
    // Si se desactiva el checkbox de VRG, limpiar valores relacionados
    if (name === 'hasGRV' && !checked) {
      setFiScoreData(prev => ({
        ...prev,
        [name]: checked,
        gastricResidualVolume: '',
        nauseasVomiting: '' // Permitir selección manual nuevamente
      }));
      return;
    }
    
    setFiScoreData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const calculateFIScore = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      let totalScore = 0;
      let details = [];

      // 1. Distensión/Dolor Abdominal (0, 1, 2, 5 puntos)
      const abdScore = parseInt(fiScoreData.abdominalDistension) || 0;
      totalScore += abdScore;
      details.push(`Distensión/Dolor Abdominal: ${abdScore} puntos`);

      // 2. Náuseas/Vómitos (0, 1, 2, 5 puntos) - incluye automáticamente VRG según criterios
      const nauseaScore = parseInt(fiScoreData.nauseasVomiting) || 0;
      totalScore += nauseaScore;
      
      // Mostrar detalles de cómo se determinó la puntuación
      if (fiScoreData.hasGRV && fiScoreData.gastricResidualVolume) {
        const grv = parseFloat(fiScoreData.gastricResidualVolume);
        if (!isNaN(grv) && grv > 0) {
          if (grv >= 500) {
            details.push(`VRG: ${grv} ml (≥500ml) → Vómitos Severos automático`);
          } else if (grv >= 250) {
            details.push(`VRG: ${grv} ml (250-499ml) → Vómitos Leves automático`);
          } else {
            details.push(`VRG: ${grv} ml (<250ml) → Sin influencia en puntuación`);
          }
        }
      }
      
      details.push(`Náuseas/Vómitos: ${nauseaScore} puntos`);

      // 3. Diarrea (0, 1, 2, 5 puntos)
      const diarrheaScore = parseInt(fiScoreData.diarrhea) || 0;
      totalScore += diarrheaScore;
      details.push(`Diarrea: ${diarrheaScore} puntos`);

      // Interpretación del score según FI Score original
      let interpretation = '';
      let recommendation = '';
      let colorClass = '';

      if (totalScore >= 0 && totalScore <= 2) {
        interpretation = 'TOLERANCIA ACEPTABLE';
        recommendation = 'Continuar con la NE. Se puede mantener o aumentar la velocidad de infusión. Considerar tratamiento sintomático si es necesario.';
        colorClass = 'text-green-700 bg-green-100 border-green-400';
      } else if (totalScore >= 3 && totalScore <= 4) {
        interpretation = 'INTOLERANCIA LEVE A MODERADA';
        recommendation = 'Continuar con la NE pero disminuir la velocidad de infusión. Reevaluar la tolerancia a la NE después de 2 horas.';
        colorClass = 'text-yellow-700 bg-yellow-100 border-yellow-400';
      } else if (totalScore >= 5) {
        interpretation = 'INTOLERANCIA SEVERA';
        recommendation = 'Suspender la NE. Reevaluar o considerar cambiar la vía de infusión.';
        colorClass = 'text-red-700 bg-red-100 border-red-400';
      }

      const result = {
        totalScore,
        interpretation,
        recommendation,
        details,
        colorClass,
        components: {
          abdominal: abdScore,
          nausea: nauseaScore,
          diarrhea: diarrheaScore
        },
        fiScoreData: {...fiScoreData} // Incluir los datos del formulario
      };

      setFiScoreResult(result);
      if (onFIScoreResult && typeof onFIScoreResult === 'function') {
        try {
          onFIScoreResult(result);
        } catch (callbackError) {
          console.error("Error en callback de FI Score:", callbackError);
        }
      }
    } catch (error) {
      console.error("Error al calcular FI Score:", error);
    }
  }, [fiScoreData, onFIScoreResult]);

  if (!showCalculator) return null;

  return (
    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <h4 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
        📊 Escala de Tolerancia a Nutrición Enteral (FI Score)
      </h4>
      <p className="text-sm text-orange-700 mb-4">
        Evalúe la tolerancia del paciente a la nutrición enteral utilizando los siguientes criterios clínicos:
      </p>

      <div className="space-y-6">
        {/* Distensión/Dolor Abdominal */}
        <div className="p-4 bg-white border border-gray-200 rounded-md">
          <h5 className="text-md font-semibold text-gray-700 mb-3">1. Distensión/Dolor Abdominal</h5>
          <div className="space-y-2">
            {[
              { value: '0', label: 'Ninguno', points: '0 puntos' },
              { value: '1', label: 'Leve: Distensión leve sin dolor abdominal', points: '1 punto' },
              { value: '2', label: 'Moderado: Distensión moderada O Presión Intraabdominal (PIA) de 15-20 mmHg O dolor abdominal transitorio', points: '2 puntos' },
              { value: '5', label: 'Severo: Distensión severa O PIA >20 mmHg O dolor abdominal persistente', points: '5 puntos' }
            ].map(option => (
              <label key={option.value} className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="abdominalDistension"
                  value={option.value}
                  checked={fiScoreData.abdominalDistension === option.value}
                  onChange={handleInputChange}
                  className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="flex-grow text-sm">{option.label}</span>
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  {option.points}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Volumen Residual Gástrico - Campo Principal */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h5 className="text-md font-semibold text-blue-800 mb-3">2. Volumen Residual Gástrico (VRG)</h5>
          <p className="text-xs text-blue-700 mb-3 italic">
            Ingrese el valor del VRG medido. Este valor determinará automáticamente la puntuación en náuseas/vómitos.
          </p>
          
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              name="hasGRV"
              checked={fiScoreData.hasGRV}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm font-medium text-blue-800">
              Se midió Volumen Residual Gástrico
            </label>
          </div>

          {fiScoreData.hasGRV && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  VRG medido (mL):
                </label>
                <input
                  type="number"
                  name="gastricResidualVolume"
                  value={fiScoreData.gastricResidualVolume}
                  onChange={handleInputChange}
                  className="w-40 px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ej: 150"
                  min="0"
                />
              </div>

              {/* Mostrar automáticamente la puntuación según el VRG */}
              {fiScoreData.gastricResidualVolume && (
                <div className="p-3 bg-white border border-blue-200 rounded-md">
                  <h6 className="text-sm font-semibold text-blue-700 mb-2">Puntuación Automática por VRG:</h6>
                  {(() => {
                    const grv = parseFloat(fiScoreData.gastricResidualVolume);
                    if (isNaN(grv)) return null;
                    
                    if (grv < 250) {
                      return (
                        <p className="text-sm text-green-700">
                          <strong>VRG {grv} ml (&lt;250ml):</strong> 0 puntos adicionales
                          <br />
                          <span className="text-xs">No afecta la puntuación de náuseas/vómitos</span>
                        </p>
                      );
                    } else if (grv >= 250 && grv < 500) {
                      return (
                        <p className="text-sm text-yellow-700">
                          <strong>VRG {grv} ml (250-499ml):</strong> Seleccionará automáticamente "Vómitos Leves" (2 puntos)
                          <br />
                          <span className="text-xs">Se corresponde con vómitos leves según criterios FI Score</span>
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-sm text-red-700">
                          <strong>VRG {grv} ml (≥500ml):</strong> Seleccionará automáticamente "Vómitos Severos" (5 puntos)
                          <br />
                          <span className="text-xs">Se corresponde con vómitos severos según criterios FI Score</span>
                        </p>
                      );
                    }
                  })()}
                </div>
              )}

              <div className="p-2 bg-blue-100 rounded text-xs text-blue-600">
                <strong>Criterios automáticos:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• VRG &lt;250ml: No afecta puntuación (0 puntos)</li>
                  <li>• VRG 250-499ml: Vómitos Leves (2 puntos)</li>
                  <li>• VRG ≥500ml: Vómitos Severos (5 puntos)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Náuseas/Vómitos */}
        <div className="p-4 bg-white border border-gray-200 rounded-md">
          <h5 className="text-md font-semibold text-gray-700 mb-3">3. Náuseas/Vómitos</h5>
          <p className="text-xs text-gray-600 mb-3 italic">
            {fiScoreData.hasGRV && fiScoreData.gastricResidualVolume ? 
              'La selección se realizará automáticamente según el VRG ingresado. También puede seleccionar manualmente si hay otros síntomas.' :
              'Selecciona la opción que mejor describa el estado del paciente.'
            }
          </p>
          <div className="space-y-2">
            {[
              { value: '0', label: 'Ninguno', points: '0 puntos' },
              { value: '1', label: 'Náuseas: Presencia de náuseas pero sin vómitos', points: '1 punto' },
              { value: '2', label: 'Vómitos Leves: Náuseas y vómitos sin necesidad de descompresión gástrica', points: '2 puntos' },
              { value: '5', label: 'Vómitos Severos: Vómitos que requieren descompresión gástrica', points: '5 puntos' }
            ].map(option => (
              <label key={option.value} className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="nauseasVomiting"
                  value={option.value}
                  checked={fiScoreData.nauseasVomiting === option.value}
                  onChange={handleInputChange}
                  className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="flex-grow text-sm">{option.label}</span>
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  {option.points}
                </span>
              </label>
            ))}
          </div>

          {/* Indicador de selección automática */}
          {fiScoreData.hasGRV && fiScoreData.gastricResidualVolume && (() => {
            const grv = parseFloat(fiScoreData.gastricResidualVolume);
            if (isNaN(grv) || grv < 250) return null;
            
            return (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700">
                  <strong>🔄 Selección automática activa:</strong> Basado en VRG de {grv}ml, 
                  se seleccionó automáticamente "{grv >= 500 ? 'Vómitos Severos (5 puntos)' : 'Vómitos Leves (2 puntos)'}"
                </p>
              </div>
            );
          })()}
        </div>

        {/* Diarrea */}
        <div className="p-4 bg-white border border-gray-200 rounded-md">
          <h5 className="text-md font-semibold text-gray-700 mb-3">4. Diarrea</h5>
          <div className="space-y-2">
            {[
              { value: '0', label: 'Ninguna', points: '0 puntos' },
              { value: '1', label: 'Leve: Deposiciones líquidas ≥3 veces al día con un volumen total entre 250 ml y 500 ml', points: '1 punto' },
              { value: '2', label: 'Moderada: Deposiciones líquidas ≥3 veces al día con un volumen total entre 500 ml y 1500 ml', points: '2 puntos' },
              { value: '5', label: 'Severa: Deposiciones líquidas ≥3 veces al día con un volumen total ≥1500 ml', points: '5 puntos' }
            ].map(option => (
              <label key={option.value} className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="diarrhea"
                  value={option.value}
                  checked={fiScoreData.diarrhea === option.value}
                  onChange={handleInputChange}
                  className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="flex-grow text-sm">{option.label}</span>
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  {option.points}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Botón de cálculo */}
        <button
          type="button"
          onClick={calculateFIScore}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors"
        >
          Calcular FI Score de Tolerancia
        </button>

        {/* Resultado */}
        {fiScoreResult && (
          <div className={`p-4 border-2 rounded-lg ${fiScoreResult.colorClass}`}>
            <h4 className="text-lg font-bold mb-2">Resultado FI Score</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-2xl font-bold">Score Total: {fiScoreResult.totalScore}</p>
                <p className="text-lg font-semibold mt-1">{fiScoreResult.interpretation}</p>
              </div>
              <div className="text-sm space-y-1">
                {fiScoreResult.details.map((detail, index) => (
                  <p key={index}>• {detail}</p>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-gray-300">
              <h5 className="font-semibold mb-2">Recomendación Clínica:</h5>
              <p className="text-sm">{fiScoreResult.recommendation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600">
        <p><strong>Nota:</strong> El FI Score es una herramienta de evaluación clínica validada para cuantificar la intolerancia a la nutrición enteral. Los resultados deben interpretarse en el contexto clínico completo del paciente.</p>
        <p className="mt-1"><strong>Rangos de Interpretación:</strong></p>
        <ul className="mt-1 ml-4 space-y-1">
          <li>• <strong>0-2 puntos:</strong> Tolerancia Aceptable</li>
          <li>• <strong>3-4 puntos:</strong> Intolerancia Leve a Moderada</li>
          <li>• <strong>≥5 puntos:</strong> Intolerancia Severa</li>
        </ul>
        <p className="mt-2 text-amber-600"><strong>Correlación con mortalidad:</strong> Un puntaje más alto se correlaciona con mayor mortalidad a 28 días (ej. 13.1% para puntaje 0 vs. 54.4% para puntaje ≥5).</p>
      </div>
    </div>
  );
};

// Función para calcular días transcurridos entre dos fechas
const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff;
};

// Función para calcular calorías no nutricionales
const calculateNonNutritionalCalories = (followUpData) => {
  let totalNonNutritionalCalories = 0;
  
  // Calorías del propofol
  if (followUpData.hasPropofol) {
    const propofolRate = parseFloat(followUpData.followUp_propofol_rate) || 0;
    const propofolDuration = parseFloat(followUpData.followUp_propofol_duration) || 0;
    totalNonNutritionalCalories += propofolRate * propofolDuration * 1.1;
  }
  
  // Calorías de la dextrosa
  if (followUpData.hasDextrose) {
    const dextroseConcentration = parseFloat(followUpData.followUp_dextrose_concentration) || 0;
    const dextroseVolume = parseFloat(followUpData.followUp_dextrose_volume) || 0;
    totalNonNutritionalCalories += (dextroseConcentration / 100) * dextroseVolume * 3.4;
  }
  
  return totalNonNutritionalCalories;
};

// Función para determinar la fase de enfermedad automáticamente
const determineDiseasePhase = (firstAssessmentDate, currentDate) => {
  if (!firstAssessmentDate) return 'hospitalizacionGeneral';

  const daysSinceFirst = calculateDaysBetween(firstAssessmentDate, currentDate);

  if (daysSinceFirst <= 2) {
    return 'agudaTemprana'; // Días 1-2 UCI/Crítico
  } else if (daysSinceFirst >= 3 && daysSinceFirst <= 7) {
    return 'agudaTardia'; // Días 3-7 UCI/Crítico
  } else if (daysSinceFirst > 7) {
    return 'recuperacion'; // Fase de Recuperación (Post-UCI/Sala General)
  }

  return 'hospitalizacionGeneral';
};

// Componente para mostrar el cálculo del aporte calórico y proteico
const NutritionalCalculationDisplay = ({ volume, caloriesPerMl, proteinPerMl, label, objectives = null, nonNutritionalCalories = 0 }) => {
  const nutritionalCalories = (parseFloat(volume) || 0) * (parseFloat(caloriesPerMl) || 0);
  const totalCalories = nutritionalCalories + (parseFloat(nonNutritionalCalories) || 0);
  const protein = (parseFloat(volume) || 0) * (parseFloat(proteinPerMl) || 0);

  const getAdequacyStatus = (actual, target) => {
    if (!target || target <= 0) return { 
      status: 'sin-objetivo', 
      color: 'text-gray-500', 
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      percentage: 0,
      icon: '❓',
      description: 'Sin objetivo definido'
    };

    const percentage = (actual / target) * 100;
    const difference = actual - target;

    if (percentage >= 90 && percentage <= 110) {
      return { 
        status: 'objetivo-cumplido', 
        color: 'text-green-700', 
        bgColor: 'bg-green-100',
        borderColor: 'border-green-400',
        percentage,
        difference,
        icon: '✅',
        description: 'Objetivo cumplido'
      };
    } else if (percentage >= 80 && percentage < 90) {
      return { 
        status: 'ligeramente-bajo', 
        color: 'text-yellow-700', 
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-400',
        percentage,
        difference,
        icon: '⚠️',
        description: 'Ligeramente por debajo'
      };
    } else if (percentage > 110 && percentage <= 120) {
      return { 
        status: 'ligeramente-alto', 
        color: 'text-blue-700', 
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-400',
        percentage,
        difference,
        icon: '📈',
        description: 'Ligeramente por encima'
      };
    } else if (percentage < 80) {
      return { 
        status: 'deficitario', 
        color: 'text-red-700', 
        bgColor: 'bg-red-100',
        borderColor: 'border-red-400',
        percentage,
        difference,
        icon: '🔻',
        description: 'Significativamente por debajo'
      };
    } else if (percentage > 120) {
      return { 
        status: 'excesivo', 
        color: 'text-orange-700', 
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-400',
        percentage,
        difference,
        icon: '⬆️',
        description: 'Significativamente por encima'
      };
    }
  };

  const caloriesAdequacy = objectives ? getAdequacyStatus(totalCalories, objectives.calorieGoal) : null;
  const proteinAdequacy = objectives ? getAdequacyStatus(protein, objectives.proteinGoal) : null;

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-500 shadow-sm">
      <h4 className="text-md font-semibold text-blue-800 mb-3 flex items-center">
        📊 Reporte de Aporte Nutricional - {label}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calorías */}
        <div className={`p-3 rounded-lg border-2 ${caloriesAdequacy ? caloriesAdequacy.bgColor + ' ' + caloriesAdequacy.borderColor : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-semibold text-gray-800">Aporte Calórico</h5>
            {caloriesAdequacy && <span className="text-lg">{caloriesAdequacy.icon}</span>}
          </div>

          <div className="mb-1">
            <p className="text-xl font-bold text-gray-900">
              {totalCalories.toFixed(1)} <span className="text-sm font-normal text-gray-600">kcal/día</span>
            </p>
            {nonNutritionalCalories > 0 && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Nutricionales: {nutritionalCalories.toFixed(1)} kcal/día</p>
                <p>• No nutricionales: {nonNutritionalCalories.toFixed(1)} kcal/día</p>
              </div>
            )}
          </div>

          {caloriesAdequacy && objectives && (
            <div className="space-y-1">
              <p className="text-xs text-gray-600">
                <strong>Objetivo:</strong> {objectives.calorieGoal} kcal/día
              </p>
              <p className={`text-xs font-medium ${caloriesAdequacy.color}`}>
                {caloriesAdequacy.percentage.toFixed(1)}% del objetivo
              </p>
              <p className={`text-xs ${caloriesAdequacy.color}`}>
                <strong>{caloriesAdequacy.description}</strong>
              </p>
              {caloriesAdequacy.difference !== undefined && (
                <p className={`text-xs ${caloriesAdequacy.color}`}>
                  Diferencia: {caloriesAdequacy.difference > 0 ? '+' : ''}{caloriesAdequacy.difference.toFixed(1)} kcal
                </p>
              )}
            </div>
          )}

          {!objectives && (
            <div className="text-xs text-amber-600 italic space-y-1">
              <p>⚠️ No se encontraron objetivos nutricionales de valoraciones anteriores para realizar la comparación.</p>
              <p className="text-xs text-gray-500">
                Se recomienda establecer objetivos basados en las necesidades calculadas del paciente.
              </p>
              <p className="text-xs text-gray-400">
                Los objetivos se buscan en: Requerimientos Energéticos y Proteicos Estimados de la valoración anterior.
              </p>
            </div>
          )}
        </div>

        {/* Proteínas */}
        <div className={`p-3 rounded-lg border-2 ${proteinAdequacy ? proteinAdequacy.bgColor + ' ' + proteinAdequacy.borderColor : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-semibold text-gray-800">Aporte Proteico</h5>
            {proteinAdequacy && <span className="text-lg">{proteinAdequacy.icon}</span>}
          </div>

          <p className="text-xl font-bold text-gray-900 mb-1">
            {protein.toFixed(1)} <span className="text-sm font-normal text-gray-600">g/día</span>
          </p>

          {proteinAdequacy && objectives && (
            <div className="space-y-1">
              <p className="text-xs text-gray-600">
                <strong>Objetivo:</strong> {objectives.proteinGoal} g/día
              </p>
              <p className={`text-xs font-medium ${proteinAdequacy.color}`}>
                {proteinAdequacy.percentage.toFixed(1)}% del objetivo
              </p>
              <p className={`text-xs ${proteinAdequacy.color}`}>
                <strong>{proteinAdequacy.description}</strong>
              </p>
              {proteinAdequacy.difference !== undefined && (
                <p className={`text-xs ${proteinAdequacy.color}`}>
                  Diferencia: {proteinAdequacy.difference > 0 ? '+' : ''}{proteinAdequacy.difference.toFixed(1)} g
                </p>
              )}
            </div>
          )}

          {!objectives && (
            <div className="text-xs text-amber-600 italic space-y-1">
              <p>⚠️ No se encontraron objetivos nutricionales de valoraciones anteriores para realizar la comparación.</p>
              <p className="text-xs text-gray-500">
                Se recomienda establecer objetivos basados en las necesidades calculadas del paciente.
              </p>
              <p className="text-xs text-gray-400">
                Los objetivos se buscan en: Requerimientos Energéticos y Proteicos Estimados de la valoración anterior.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resumen consolidado si hay objetivos */}
      {objectives && (caloriesAdequacy || proteinAdequacy) && (
        <div className="mt-3 p-3 bg-white rounded-md border border-gray-200">
          <h6 className="text-sm font-semibold text-gray-700 mb-2">📋 Resumen del Cumplimiento</h6>
          <div className="text-xs text-gray-600 space-y-1">
            {caloriesAdequacy && (
              <p>• <strong>Calorías:</strong> <span className={caloriesAdequacy.color}>{caloriesAdequacy.description}</span> ({caloriesAdequacy.percentage.toFixed(1)}%)</p>
            )}
            {proteinAdequacy && (
              <p>• <strong>Proteínas:</strong> <span className={proteinAdequacy.color}>{proteinAdequacy.description}</span> ({proteinAdequacy.percentage.toFixed(1)}%)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para consolidación de aportes en nutrición mixta
const MixedNutritionSummary = ({ neVolume, neCaloriesPerMl, neProteinPerMl, npVolume, npCaloriesPerMl, npProteinPerMl, objectives = null, nonNutritionalCalories = 0 }) => {
  const neCalories = (parseFloat(neVolume) || 0) * (parseFloat(neCaloriesPerMl) || 0);
  const neProtein = (parseFloat(neVolume) || 0) * (parseFloat(neProteinPerMl) || 0);
  const npCalories = (parseFloat(npVolume) || 0) * (parseFloat(npCaloriesPerMl) || 0);
  const npProtein = (parseFloat(npVolume) || 0) * (parseFloat(npProteinPerMl) || 0);

  const nutritionalCalories = neCalories + npCalories;
  const totalCalories = nutritionalCalories + (parseFloat(nonNutritionalCalories) || 0);
  const totalProtein = neProtein + npProtein;

  const getAdequacyStatus = (actual, target) => {
    if (!target || target <= 0) return { 
      status: 'sin-objetivo', 
      color: 'text-gray-500', 
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      percentage: 0,
      icon: '❓',
      description: 'Sin objetivo definido',
      recommendation: 'Establecer objetivos nutricionales'
    };

    const percentage = (actual / target) * 100;
    const difference = actual - target;

    if (percentage >= 90 && percentage <= 110) {
      return { 
        status: 'objetivo-cumplido', 
        color: 'text-green-700', 
        bgColor: 'bg-green-100',
        borderColor: 'border-green-400',
        percentage,
        difference,
        icon: '✅',
        description: 'Objetivo cumplido',
        recommendation: 'Mantener aporte actual'
      };
    } else if (percentage >= 80 && percentage < 90) {
      return { 
        status: 'ligeramente-bajo', 
        color: 'text-yellow-700', 
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-400',
        percentage,
        difference,
        icon: '⚠️',
        description: 'Ligeramente por debajo',
        recommendation: 'Considerar ajuste moderado al alza'
      };
    } else if (percentage > 110 && percentage <= 120) {
      return { 
        status: 'ligeramente-alto', 
        color: 'text-blue-700', 
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-400',
        percentage,
        difference,
        icon: '📈',
        description: 'Ligeramente por encima',
        recommendation: 'Monitorizar, considerar ajuste menor'
      };
    } else if (percentage < 80) {
      return { 
        status: 'deficitario', 
        color: 'text-red-700', 
        bgColor: 'bg-red-100',
        borderColor: 'border-red-400',
        percentage,
        difference,
        icon: '🔻',
        description: 'Significativamente por debajo',
        recommendation: 'Requiere incremento urgente del aporte'
      };
    } else if (percentage > 120) {
      return { 
        status: 'excesivo', 
        color: 'text-orange-700', 
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-400',
        percentage,
        difference,
        icon: '⬆️',
        description: 'Significativamente por encima',
        recommendation: 'Evaluar reducción del aporte'
      };
    }
  };

  const caloriesAdequacy = objectives ? getAdequacyStatus(totalCalories, objectives.calorieGoal) : null;
  const proteinAdequacy = objectives ? getAdequacyStatus(totalProtein, objectives.proteinGoal) : null;

  // Determinar el estado general del cumplimiento
  const getOverallStatus = () => {
    if (!objectives) return { status: 'sin-datos', color: 'text-gray-600', icon: '❓' };

    const calAdequate = caloriesAdequacy && ['objetivo-cumplido', 'ligeramente-bajo', 'ligeramente-alto'].includes(caloriesAdequacy.status);
    const protAdequate = proteinAdequacy && ['objetivo-cumplido', 'ligeramente-bajo', 'ligeramente-alto'].includes(proteinAdequacy.status);

    if (calAdequate && protAdequate) {
      return { status: 'cumplimiento-general', color: 'text-green-700', icon: '✅' };
    } else if (!calAdequate && !protAdequate) {
      return { status: 'deficiencia-general', color: 'text-red-700', icon: '🚨' };
    } else {
      return { status: 'cumplimiento-parcial', color: 'text-yellow-700', icon: '⚠️' };
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="mt-6 p-5 bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl shadow-lg">
      <h4 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
        🔄 Consolidación de Aportes - Nutrición Mixta
        <span className="ml-2 text-xl">{overallStatus.icon}</span>
      </h4>

      {/* Aportes parciales por vía */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 shadow-sm">
          <h5 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
            💧 Componente Enteral
          </h5>
          <div className="space-y-2">
            <p className="text-sm text-blue-700">
              <strong>Calorías:</strong> {neCalories.toFixed(1)} kcal/día
              {objectives && (
                <span className="text-xs ml-2">
                  ({((neCalories / objectives.calorieGoal) * 100).toFixed(1)}% del objetivo total)
                </span>
              )}
            </p>
            <p className="text-sm text-blue-700">
              <strong>Proteína:</strong> {neProtein.toFixed(1)} g/día
              {objectives && (
                <span className="text-xs ml-2">
                  ({((neProtein / objectives.proteinGoal) * 100).toFixed(1)}% del objetivo total)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 shadow-sm">
          <h5 className="text-sm font-semibold text-purple-800 mb-3 flex items-center">
            💉 Componente Parenteral
          </h5>
          <div className="space-y-2">
            <p className="text-sm text-purple-700">
              <strong>Calorías:</strong> {npCalories.toFixed(1)} kcal/día
              {objectives && (
                <span className="text-xs ml-2">
                  ({((npCalories / objectives.calorieGoal) * 100).toFixed(1)}% del objetivo total)
                </span>
              )}
            </p>
            <p className="text-sm text-purple-700">
              <strong>Proteína:</strong> {npProtein.toFixed(1)} g/día
              {objectives && (
                <span className="text-xs ml-2">
                  ({((npProtein / objectives.proteinGoal) * 100).toFixed(1)}% del objetivo total)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Total consolidado con análisis detallado */}
      <div className="bg-white p-5 rounded-xl border-3 border-orange-300 shadow-md">
        <h5 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
          📈 APORTE TOTAL CONSOLIDADO
          <span className={`ml-2 text-sm ${overallStatus.color}`}>
            {overallStatus.status === 'cumplimiento-general' ? '(Objetivos Cumplidos)' :
             overallStatus.status === 'deficiencia-general' ? '(Deficiencias Detectadas)' :
             overallStatus.status === 'cumplimiento-parcial' ? '(Cumplimiento Parcial)' :
             '(Sin Datos de Referencia)'}
          </span>
        </h5>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Análisis Calórico */}
          <div className={`p-4 rounded-lg border-2 ${caloriesAdequacy ? caloriesAdequacy.bgColor + ' ' + caloriesAdequacy.borderColor : 'bg-gray-100 border-gray-300'}`}>
            <div className="flex items-center justify-between mb-3">
              <h6 className="text-md font-semibold text-gray-800">Aporte Calórico Total</h6>
              {caloriesAdequacy && <span className="text-xl">{caloriesAdequacy.icon}</span>}
            </div>

            <div className="mb-2">
              <p className="text-2xl font-bold text-gray-900">
                {totalCalories.toFixed(1)} <span className="text-sm font-normal text-gray-600">kcal/día</span>
              </p>
              {nonNutritionalCalories > 0 && (
                <div className="text-xs text-gray-500 space-y-1 mt-1">
                  <p>• Nutricionales: {nutritionalCalories.toFixed(1)} kcal/día</p>
                  <p>• No nutricionales: {nonNutritionalCalories.toFixed(1)} kcal/día</p>
                </div>
              )}
            </div>

            {caloriesAdequacy && objectives && (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Objetivo:</strong> {objectives.calorieGoal} kcal/día
                </p>
                <p className={`text-sm font-medium ${caloriesAdequacy.color}`}>
                  {caloriesAdequacy.percentage.toFixed(1)}% del objetivo
                </p>
                <p className={`text-sm font-semibold ${caloriesAdequacy.color}`}>
                  {caloriesAdequacy.description}
                </p>
                <p className={`text-sm ${caloriesAdequacy.color}`}>
                  Diferencia: {caloriesAdequacy.difference > 0 ? '+' : ''}{caloriesAdequacy.difference.toFixed(1)} kcal
                </p>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    <strong>Recomendación:</strong> {caloriesAdequacy.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Análisis Proteico */}
          <div className={`p-4 rounded-lg border-2 ${proteinAdequacy ? proteinAdequacy.bgColor + ' ' + proteinAdequacy.borderColor : 'bg-gray-100 border-gray-300'}`}>
            <div className="flex items-center justify-between mb-3">
              <h6 className="text-md font-semibold text-gray-800">Aporte Proteico Total</h6>
              {proteinAdequacy && <span className="text-xl">{proteinAdequacy.icon}</span>}
            </div>

            <p className="text-2xl font-bold text-gray-900 mb-2">
              {totalProtein.toFixed(1)} <span className="text-sm font-normal text-gray-600">g/día</span>
            </p>

            {proteinAdequacy && objectives && (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Objetivo:</strong> {objectives.proteinGoal} g/día
                </p>
                <p className={`text-sm font-medium ${proteinAdequacy.color}`}>
                  {proteinAdequacy.percentage.toFixed(1)}% del objetivo
                </p>
                <p className={`text-sm font-semibold ${proteinAdequacy.color}`}>
                  {proteinAdequacy.description}
                </p>
                <p className={`text-sm ${proteinAdequacy.color}`}>
                  Diferencia: {proteinAdequacy.difference > 0 ? '+' : ''}{proteinAdequacy.difference.toFixed(1)} g
                </p>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    <strong>Recomendación:</strong> {proteinAdequacy.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen ejecutivo del cumplimiento */}
        {objectives && (
          <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-300">
            <h6 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
              📋 Evaluación General del Cumplimiento de Objetivos
              <span className="ml-2">{overallStatus.icon}</span>
            </h6>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Estado Calórico:</span> 
                  <span className={`ml-2 ${caloriesAdequacy?.color || 'text-gray-500'}`}>
                    {caloriesAdequacy?.description || 'No evaluado'}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Estado Proteico:</span> 
                  <span className={`ml-2 ${proteinAdequacy?.color || 'text-gray-500'}`}>
                    {proteinAdequacy?.description || 'No evaluado'}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Distribución Enteral:</span> 
                  <span className="ml-2 text-blue-600">
                    {((neCalories + neProtein) / (totalCalories + totalProtein) * 100).toFixed(1)}%
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Distribución Parenteral:</span> 
                  <span className="ml-2 text-purple-600">
                    {((npCalories + npProtein) / (totalCalories + totalProtein) * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
            </div>

            <div className={`mt-3 p-3 rounded-md border-l-4 ${
              overallStatus.status === 'cumplimiento-general' ? 'bg-green-50 border-green-400' :
              overallStatus.status === 'deficiencia-general' ? 'bg-red-50 border-red-400' :
              'bg-yellow-50 border-yellow-400'
            }`}>
              <p className={`text-sm font-medium ${overallStatus.color}`}>
                <strong>Conclusión:</strong> {
                  overallStatus.status === 'cumplimiento-general' 
                    ? 'Los objetivos nutricionales se están cumpliendo adecuadamente con la terapia mixta actual.'
                    : overallStatus.status === 'deficiencia-general'
                    ? 'Se detectan deficiencias significativas que requieren ajustes inmediatos en el plan nutricional.'
                    : 'Cumplimiento parcial de objetivos. Se recomienda evaluación específica de las deficiencias.'
                }
              </p>
            </div>
          </div>
        )}

        {!objectives && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
            <p className="text-sm text-gray-600 italic text-center">
              ℹ️ No se encontraron objetivos nutricionales de valoraciones anteriores para realizar la comparación.
              <br />
              Se recomienda establecer objetivos basados en las necesidades calculadas del paciente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function FollowUpAssessmentPage() {
  const { patientDocumentNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Datos del paciente pasados desde ViewAssessmentsPage
  const patientDataFromPrevious = location.state?.patientDataForFollowUp;

  const [firstAssessmentDate, setFirstAssessmentDate] = useState(null);
  const [calculatedDiseasePhase, setCalculatedDiseasePhase] = useState('hospitalizacionGeneral');
  const [manualDiseasePhaseOverride, setManualDiseasePhaseOverride] = useState(false);
  const [nutritionalObjectives, setNutritionalObjectives] = useState(null);
  const [previousWeight, setPreviousWeight] = useState(null);
  const [weightComparison, setWeightComparison] = useState(null);
  const [previousLabs, setPreviousLabs] = useState(null);
  const [labComparison, setLabComparison] = useState(null);
  const [refeedingRisk, setRefeedingRisk] = useState(null);
  const [refeedingCalculatorResults, setRefeedingCalculatorResults] = useState({});
  const [patientBasicInfo, setPatientBasicInfo] = useState({});
  const [fiScoreResults, setFiScoreResults] = useState(null);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [planText, setPlanText] = useState('');
  const [recalculationResults, setRecalculationResults] = useState(null);

  const [followUpData, setFollowUpData] = useState({
    assessmentType: 'follow-up', // Identificador del tipo de valoración
    followUpDate: new Date().toISOString().split('T')[0],

    // Información del paciente (heredada)
    patientName: patientDataFromPrevious?.patientName || '',
    documentNumber: patientDataFromPrevious?.documentNumber || patientDocumentNumber,

    // Campos del Módulo 1 agregados
    bodyTemperature: '',
    diseasePhase: 'hospitalizacionGeneral',
    respiratoryStatus: 'respEspontanea',
    nutritionRoute: 'oral',

    // Monitorización Clínica y Física
    followUp_clinicalChanges: '',

    // Estado Hemodinámico (similar a valoración inicial)
    followUp_hemodynamicStatus: 'estable',
    followUp_vasopressorUse: 'no',
    followUp_vasopressorDetails: '',
    followUp_uncontrolledShock: false,

    // Monitorización de NE
    followUp_enStartDate: '',
    followUp_enAccessRoute: '',
    followUp_enAdministrationType: '',
    followUp_enActualIntakeVolume: '',
    followUp_enCaloriesPerMl: '',
    followUp_enProteinPerMl: '',
    followUp_enTolerance: '',
    followUp_enInterruptions: '', // Razón y duración
    followUp_gastricResidualVolume: '',

    // Monitorización de NP
    followUp_npStartDate: '',
    followUp_npType: '',
    followUp_npSoyLipidEmulsion: 'no',
    followUp_npActualIntakeVolume: '',
    followUp_npCaloriesPerMl: '',
    followUp_npProteinPerMl: '',
    followUp_npTolerance: '',
    followUp_npInterruptions: '',
    followUp_npComplications: '',

    // Monitorización de Nutrición Mixta - Componente Enteral
    followUp_mixedNEStartDate: '',
    followUp_mixedNERouteType: 'gastrica',
    followUp_mixedNEModality: 'continua',
    followUp_mixedNEVolume: '',
    followUp_mixedNECaloriesPerMl: '',
    followUp_mixedNEProteinPerMl: '',
    followUp_mixedNETolerance: '',
    followUp_mixedNEInterruptions: '',
    followUp_mixedGastricResidualVolume: '',

    // Monitorización de Nutrición Mixta - Componente Parenteral
    followUp_mixedNPStartDate: '',
    followUp_mixedNPModality: 'continua',
    followUp_mixedNPSoyLipidEmulsion: 'no',
    followUp_mixedNPVolume: '',
    followUp_mixedNPCaloriesPerMl: '',
    followUp_mixedNPProteinPerMl: '',
    followUp_mixedNPTolerance: '',
    followUp_mixedNPInterruptions: '',
    followUp_mixedNPComplications: '',

    // Laboratorios de Seguimiento (mismos campos que módulo 1)
    followUp_lab_potassium: '',
    followUp_lab_phosphorus: '',
    followUp_lab_magnesium: '',
    followUp_lab_sodium: '',
    followUp_lab_glucose: '',
    followUp_lab_creatinine: '',
    followUp_lab_bun: '',
    followUp_lab_ast: '',
    followUp_lab_alt: '',
    followUp_lab_alkPhos: '',
    followUp_lab_triglycerides: '',
    followUp_lab_thiamine: '',
    followUp_lab_thiamine_unit: 'nmol/L',
    followUp_lab_thiamine_status: '',
    followUp_lab_crp: '',

    // Peso y antropometría de seguimiento
    followUp_currentWeight: '',
    followUp_weightChange: '',
    followUp_weightChangePercent: '',

    // Plan y observaciones
    followUp_planChanges: '',
    followUp_nextEvaluationDate: '',
    followUp_observations: '',

    // Campos adicionales para vía oral
    followUp_oralIntakePercentage: '',
    followUp_supplementIntake: '',

    // Campos para evaluación integrada de síndrome de realimentación
    refeedingSyndrome_symptoms: {},
    refeedingSyndrome_temporality: null,
    refeedingSyndrome_diagnosis: '',
    refeedingSyndrome_severity: '',
    refeedingSyndrome_details: '',

    // Campos para calorías no nutricionales
    hasActiveInfusions: false,
    hasPropofol: false,
    followUp_propofol_rate: '',
    followUp_propofol_duration: '',
    hasDextrose: false,
    followUp_dextrose_concentration: '',
    followUp_dextrose_volume: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Efecto unificado para cargar historial del paciente usando el nuevo servicio
  useEffect(() => {
    const loadPatientHistory = async () => {
      if (!currentUser || !patientDocumentNumber) {
        setError("Faltan datos para cargar el historial del paciente.");
        return;
      }

      try {
        console.log('=== CARGANDO HISTORIAL CON SERVICIO UNIFICADO ===');
        
        // 1. Usar el nuevo servicio para obtener historial normalizado
        const history = await getAndNormalizePatientHistory(patientDocumentNumber, currentUser.uid);

        if (history.length === 0) {
          setError("No se encontraron valoraciones para este paciente.");
          return;
        }

        // 2. La valoración más reciente es la primera (ya ordenada)
        const latestAssessment = history[0];
        // La primera valoración histórica es la última
        const firstAssessment = history[history.length - 1];

        console.log('Valoración más reciente:', latestAssessment);
        console.log('Primera valoración histórica:', firstAssessment);

        // 3. Extraer objetivos nutricionales usando la nueva función
        console.log('=== INTENTANDO EXTRAER OBJETIVOS NUTRICIONALES ===');
        console.log('Valoración más reciente completa:', latestAssessment);
        
        let objectives = extractNutritionalObjectives(latestAssessment);
        
        // Si no se encontraron objetivos en la valoración más reciente, buscar en la primera valoración
        if (!objectives && history.length > 1) {
          console.log('⚠️ No se encontraron objetivos en valoración reciente, buscando en primera valoración...');
          objectives = extractNutritionalObjectives(firstAssessment);
        }
        
        // Si aún no hay objetivos, buscar en todas las valoraciones
        if (!objectives && history.length > 2) {
          console.log('⚠️ Buscando objetivos en todo el historial...');
          for (let i = 0; i < history.length; i++) {
            objectives = extractNutritionalObjectives(history[i]);
            if (objectives) {
              console.log(`✅ Objetivos encontrados en valoración ${i + 1}:`, objectives);
              break;
            }
          }
        }
        
        if (objectives) {
          console.log('✅ Objetivos finales establecidos:', objectives);
          setNutritionalObjectives(objectives);
        } else {
          console.log('❌ No se pudieron extraer objetivos nutricionales de ninguna valoración');
          // Intentar una última búsqueda manual
          console.log('🔍 Realizando búsqueda manual en la estructura...');
          
          // Buscar en calculatorResults de la valoración más reciente
          if (latestAssessment.calculatorResults) {
            let manualCalories = null;
            let manualProtein = null;
            
            if (latestAssessment.calculatorResults.calories) {
              manualCalories = latestAssessment.calculatorResults.calories.adjusted_get || 
                              latestAssessment.calculatorResults.calories.get ||
                              latestAssessment.calculatorResults.calories.finalCalories;
            }
            
            if (latestAssessment.calculatorResults.protein) {
              const proteinResult = latestAssessment.calculatorResults.protein;
              if (proteinResult.totalGrams) {
                const match = String(proteinResult.totalGrams).match(/(\d+(?:\.\d+)?)/);
                manualProtein = match ? parseFloat(match[1]) : null;
              } else {
                manualProtein = proteinResult.targetValue || proteinResult.finalProtein;
              }
            }
            
            if (manualCalories || manualProtein) {
              const manualObjectives = {
                calorieGoal: manualCalories ? parseFloat(manualCalories) : null,
                proteinGoal: manualProtein ? parseFloat(manualProtein) : null,
                assessmentDate: latestAssessment.generalInfo?.assessmentDate || 'valoración anterior',
                source: 'extraccion-manual',
                assessmentType: latestAssessment.assessmentType || 'inicial'
              };
              console.log('✅ Objetivos extraídos manualmente:', manualObjectives);
              setNutritionalObjectives(manualObjectives);
            }
          }
        }

        // 4. Establecer datos básicos del paciente
        const patientInfo = firstAssessment.generalInfo || latestAssessment.generalInfo;
        if (patientInfo) {
          setPatientBasicInfo({
            ...patientInfo,
            // Asegurar campos críticos
            height: patientInfo.height,
            age: patientInfo.age,
            sex: patientInfo.sex,
            weight: patientInfo.weight,
            patientName: patientInfo.patientName,
            documentNumber: patientInfo.documentNumber
          });
        }

        // 5. Configurar datos del formulario
        setFollowUpData(prev => ({
          ...prev,
          patientName: latestAssessment.generalInfo?.patientName || '',
          documentNumber: latestAssessment.generalInfo?.documentNumber || patientDocumentNumber,
          // Pre-rellenar con datos de la valoración más reciente
          currentWeight: prev.currentWeight || latestAssessment.generalInfo?.weight || '',
          bodyTemperature: prev.bodyTemperature || latestAssessment.generalInfo?.bodyTemperature || '37',
          diseasePhase: prev.diseasePhase || latestAssessment.generalInfo?.diseasePhase || 'hospitalizacionGeneral'
        }));

        // 6. Configurar peso anterior para comparación
        setPreviousWeight({
          weight: parseFloat(latestAssessment.generalInfo?.weight || 0),
          date: latestAssessment.generalInfo?.assessmentDate || 'valoración anterior',
          type: latestAssessment.assessmentType?.includes('follow') ? 'Seguimiento' : 'Inicial'
        });

        // 7. Configurar fecha de primera valoración
        if (firstAssessment.generalInfo?.assessmentDate) {
          setFirstAssessmentDate(firstAssessment.generalInfo.assessmentDate);
          
          // Calcular fase automáticamente
          const autoPhase = determineDiseasePhase(
            firstAssessment.generalInfo.assessmentDate, 
            followUpData.followUpDate
          );
          setCalculatedDiseasePhase(autoPhase);
          
          if (!manualDiseasePhaseOverride) {
            setFollowUpData(prev => ({
              ...prev,
              diseasePhase: autoPhase
            }));
          }
        }

        console.log('✅ Historial cargado exitosamente con servicio unificado');

      } catch (error) {
        console.error("Error al cargar historial del paciente:", error);
        setError(error.message);
      }
    };

    loadPatientHistory();
  }, [currentUser, patientDocumentNumber, followUpData.followUpDate, manualDiseasePhaseOverride]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Si se cambia el peso actual, calcular comparación con peso anterior
    if (name === 'followUp_currentWeight' && value && previousWeight) {
      const currentWeight = parseFloat(value);
      const prevWeight = previousWeight.weight;

      if (!isNaN(currentWeight) && !isNaN(prevWeight)) {
        const weightDiff = currentWeight - prevWeight;
        const weightDiffPercent = (weightDiff / prevWeight) * 100;

        setWeightComparison({
          previous: prevWeight,
          current: currentWeight,
          difference: weightDiff,
          percentChange: weightDiffPercent,
          status: weightDiff > 0 ? 'aumento' : weightDiff < 0 ? 'pérdida' : 'sin cambio'
        });

        // Auto-llenar los campos de cambio de peso
        setFollowUpData(prev => ({
          ...prev,
          [name]: value,
          followUp_weightChange: weightDiff.toFixed(1),
          followUp_weightChangePercent: weightDiffPercent.toFixed(1)
        }));
        return;
      }
    }

    // Si se cambia la fecha de seguimiento, recalcular la fase automáticamente
    if (name === 'followUpDate' && firstAssessmentDate && !manualDiseasePhaseOverride) {
      const newPhase = determineDiseasePhase(firstAssessmentDate, value);
      setCalculatedDiseasePhase(newPhase);
      setFollowUpData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        diseasePhase: newPhase
      }));
      return;
    }

    // Si se cambia manualmente la fase de enfermedad, activar override
    if (name === 'diseasePhase') {
      setManualDiseasePhaseOverride(true);
    }

    // Lógica especial para tiamina - simplificada
    if (name === 'followUp_lab_thiamine') {
      const numValue = parseFloat(value);
      let status = '';

      if (value && !isNaN(numValue) && numValue > 0) {
        const unit = followUpData.followUp_lab_thiamine_unit || 'nmol/L';
        try {
          if (unit === 'nmol/L') {
            if (numValue >= 70 && numValue <= 180) {
              status = 'normal';
            } else if (numValue < 70) {
              status = 'bajo';
            } else {
              status = 'alto';
            }
          } else { // ng/mL
            if (numValue >= 21 && numValue <= 54) {
              status = 'normal';
            } else if (numValue < 21) {
              status = 'bajo';
            } else {
              status = 'alto';
            }
          }
        } catch (error) {
          console.error("Error calculando status de tiamina:", error);
          status = '';
        }
      }

      setFollowUpData(prev => ({
        ...prev,
        [name]: value,
        followUp_lab_thiamine_status: status
      }));
      return;
    }

    // Cambio de unidades de tiamina - sin conversión automática
    if (name === 'followUp_lab_thiamine_unit') {
      // Solo cambiar la unidad sin convertir el valor
      setFollowUpData(prev => ({
        ...prev,
        [name]: value,
        followUp_lab_thiamine_status: '' // Reset status para que el usuario reingrese el valor
      }));
      return;
    }

    setFollowUpData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Si se cambia algún laboratorio de electrolitos principales, calcular comparación
    const electrolytesKeys = ['followUp_lab_potassium', 'followUp_lab_phosphorus', 'followUp_lab_magnesium', 'followUp_lab_sodium', 'followUp_lab_thiamine'];
    if (electrolytesKeys.includes(name) && value && previousLabs) {
      calculateLabComparison();
    }
  };

  // Función específica para manejar cambios en el componente FollowUpSummaryModule
  const handleFollowUpDataChange = useCallback((field, value) => {
    console.log('handleFollowUpDataChange llamado con:', field, value);
    setFollowUpData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Función para calcular comparación de laboratorios
  const calculateLabComparison = useCallback(() => {
    if (!previousLabs) return;

    try {
      const currentLabs = {
        potassium: followUpData.followUp_lab_potassium,
        phosphorus: followUpData.followUp_lab_phosphorus,
        magnesium: followUpData.followUp_lab_magnesium,
        sodium: followUpData.followUp_lab_sodium,
        glucose: followUpData.followUp_lab_glucose,
        creatinine: followUpData.followUp_lab_creatinine,
        bun: followUpData.followUp_lab_bun,
        ast: followUpData.followUp_lab_ast,
        alt: followUpData.followUp_lab_alt,
        alkPhos: followUpData.followUp_lab_alkPhos,
        triglycerides: followUpData.followUp_lab_triglycerides,
        thiamine: followUpData.followUp_lab_thiamine,
        thiamine_unit: followUpData.followUp_lab_thiamine_unit,
        crp: followUpData.followUp_lab_crp
      };

      const comparison = {};
      let hasSignificantChanges = false;
      let electrolyteConcerns = [];

      // Lista de laboratorios para procesar
      const allLabKeys = ['potassium', 'phosphorus', 'magnesium', 'thiamine', 'sodium', 'glucose', 'creatinine', 'bun', 'ast', 'alt', 'alkPhos', 'triglycerides', 'crp'];

      // Procesar cada laboratorio
      allLabKeys.forEach(labKey => {
        let previousValue = null;
        let currentValue = null;

        try {
          // Obtener valor anterior
          if (previousLabs.labs[labKey] && previousLabs.labs[labKey] !== '' && previousLabs.labs[labKey] !== null) {
            previousValue = parseFloat(previousLabs.labs[labKey]);
          }

          // Obtener valor actual
          if (currentLabs[labKey] && currentLabs[labKey] !== '' && currentLabs[labKey] !== null) {
            currentValue = parseFloat(currentLabs[labKey]);
          }

          // Si hay valor actual, procesarlo
          if (!isNaN(currentValue) && currentValue !== null && currentValue > 0) {
            let status = 'sin-cambio';
            let concern = 'normal';
            let icon = '➡️';
            let color = 'text-gray-600';
            let difference = null;
            let percentChange = null;

            // Si también hay valor anterior, calcular cambio
            if (!isNaN(previousValue) && previousValue !== null && previousValue > 0) {
              difference = currentValue - previousValue;
              percentChange = (difference / previousValue) * 100;

              if (Math.abs(percentChange) >= 5) {
                hasSignificantChanges = true;
                
                if (percentChange > 5) {
                  status = 'aumento';
                  icon = '⬆️';
                  color = 'text-blue-600';
                } else if (percentChange < -5) {
                  status = 'disminucion';
                  icon = '⬇️';
                  color = 'text-red-600';
                }
              }
            } else {
              status = 'nuevo-valor';
              icon = '🆕';
              color = 'text-gray-600';
            }

            // Verificar preocupaciones específicas para electrolitos del síndrome de realimentación
            if (['potassium', 'phosphorus', 'magnesium', 'thiamine'].includes(labKey)) {
              let isLowValue = false;
              
              try {
                if (labKey === 'thiamine') {
                  const unit = currentLabs.thiamine_unit || 'nmol/L';
                  if (unit === 'ng/mL') {
                    isLowValue = currentValue < 21;
                  } else {
                    isLowValue = currentValue < 70;
                  }
                } else {
                  const normalRanges = {
                    potassium: { min: 3.5, max: 5.0 },
                    phosphorus: { min: 2.5, max: 4.5 },
                    magnesium: { min: 1.5, max: 2.5 }
                  };
                  const range = normalRanges[labKey];
                  if (range) {
                    isLowValue = currentValue < range.min;
                  }
                }

                if (isLowValue || (percentChange !== null && percentChange < -10)) {
                  concern = 'critico';
                  electrolyteConcerns.push({
                    name: labKey,
                    displayName: labKey === 'potassium' ? 'Potasio' : 
                               labKey === 'phosphorus' ? 'Fósforo' : 
                               labKey === 'magnesium' ? 'Magnesio' :
                               labKey === 'thiamine' ? 'Tiamina' : labKey,
                    currentValue,
                    previousValue: previousValue || 0,
                    percentChange: percentChange || 0,
                    isLow: isLowValue,
                    significantDrop: percentChange !== null && percentChange < -10
                  });
                } else if (labKey === 'thiamine') {
                  const unit = currentLabs.thiamine_unit || 'nmol/L';
                  let nearLowThreshold = false;
                  if (unit === 'ng/mL') {
                    nearLowThreshold = currentValue < 25;
                  } else {
                    nearLowThreshold = currentValue < 80;
                  }
                  
                  if (nearLowThreshold || (percentChange !== null && percentChange < -5)) {
                    concern = 'alerta';
                  }
                } else {
                  const normalRanges = {
                    potassium: { min: 3.5, max: 5.0 },
                    phosphorus: { min: 2.5, max: 4.5 },
                    magnesium: { min: 1.5, max: 2.5 }
                  };
                  const range = normalRanges[labKey];
                  if (range && (currentValue < (range.min + 0.5) || (percentChange !== null && percentChange < -5))) {
                    concern = 'alerta';
                  }
                }

                if (concern === 'critico') {
                  color = 'text-red-600';
                } else if (concern === 'alerta') {
                  color = 'text-yellow-600';
                }
              } catch (error) {
                console.error(`Error procesando ${labKey}:`, error);
                concern = 'normal';
              }
            }

            comparison[labKey] = {
              previous: previousValue,
              current: currentValue,
              difference,
              percentChange,
              status,
              concern,
              icon,
              color
            };
          }
        } catch (error) {
          console.error(`Error general procesando laboratorio ${labKey}:`, error);
        }
      });

      const comparisonData = {
        comparison,
        hasSignificantChanges,
        electrolyteConcerns,
        previousDate: previousLabs.date,
        previousType: previousLabs.type
      };

      setLabComparison(comparisonData);
    } catch (error) {
      console.error("Error en calculateLabComparison:", error);
    }
  }, [previousLabs?.labs, previousLabs?.date, previousLabs?.type, 
      followUpData.followUp_lab_potassium, followUpData.followUp_lab_phosphorus,
      followUpData.followUp_lab_magnesium, followUpData.followUp_lab_sodium, 
      followUpData.followUp_lab_thiamine, followUpData.followUp_lab_thiamine_unit]);

  // Ejecutar comparación cuando cambien los datos (con debounce para evitar múltiples ejecuciones)
  useEffect(() => {
    if (!previousLabs) return;
    
    const hasLabData = followUpData.followUp_lab_potassium ||
                      followUpData.followUp_lab_phosphorus ||
                      followUpData.followUp_lab_magnesium ||
                      followUpData.followUp_lab_sodium ||
                      followUpData.followUp_lab_thiamine;
    
    if (!hasLabData) return;

    const timeoutId = setTimeout(() => {
      calculateLabComparison();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [followUpData.followUp_lab_potassium, followUpData.followUp_lab_phosphorus,
      followUpData.followUp_lab_magnesium, followUpData.followUp_lab_sodium,
      followUpData.followUp_lab_thiamine, followUpData.followUp_lab_thiamine_unit,
      previousLabs]);

  

  const handleSaveFollowUp = async () => {
    if (!currentUser) {
      alert('Debe estar autenticado para guardar valoraciones de seguimiento.');
      return;
    }

    if (!followUpData.patientName || !followUpData.documentNumber) {
      alert('Faltan datos del paciente. Por favor complete la información.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const userId = currentUser.uid;
      const cleanedData = cleanUndefined(followUpData);

      // Crear el objeto generalInfo para la valoración de seguimiento
      const generalInfo = {
        patientName: cleanedData.patientName,
        documentNumber: cleanedData.documentNumber,
        assessmentDate: cleanedData.followUpDate,
        sex: patientDataFromPrevious?.sex || patientBasicInfo?.sex,
        age: patientDataFromPrevious?.age || patientBasicInfo?.age
      };

      // Crear una copia de cleanedData sin los campos redundantes en el nivel raíz
      const { patientName, documentNumber, ...cleanedDataWithoutRedundancy } = cleanedData;

      const followUpAssessmentData = {
        ...cleanedDataWithoutRedundancy,
        assessmentType: 'follow-up',
        generalInfo: generalInfo,
        savedByUser: currentUser.email,
        savedAtDate: new Date().toLocaleString(),
        firestoreTimestamp: serverTimestamp(),
        firstAssessmentDate: firstAssessmentDate,
        daysSinceFirstAssessment: firstAssessmentDate ? calculateDaysBetween(firstAssessmentDate, followUpData.followUpDate) : null,
        labComparison: labComparison ? cleanUndefined(labComparison) : null,
        refeedingCalculatorResults: refeedingCalculatorResults ? cleanUndefined(refeedingCalculatorResults) : null,
        previousLabsReference: previousLabs ? cleanUndefined(previousLabs) : null,
        fiScoreResults: fiScoreResults ? cleanUndefined(fiScoreResults) : null,
        diagnosisText: diagnosisText || '',
        planText: planText || '',
        // Fechas de próxima valoración
        nextAssessmentDate: followUpData.nextAssessmentDate || '',
        nextAssessmentTime: followUpData.nextAssessmentTime || ''
      };

      const assessmentsCollectionRef = collection(db, "artifacts", appId, "users", userId, "assessments");
      const docRef = await addDoc(assessmentsCollectionRef, followUpAssessmentData);

      alert('Valoración de seguimiento guardada exitosamente.');
      console.log('Valoración de seguimiento guardada con ID:', docRef.id);

      // Redirigir de vuelta a las valoraciones
      navigate('/valoraciones-guardadas');

    } catch (error) {
      console.error('Error al guardar valoración de seguimiento:', error);
      setError('Error al guardar la valoración de seguimiento. Intente más tarde.');
      alert('Error al guardar la valoración de seguimiento. Intente más tarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";

  const getDiseasePhaseText = (phase) => {
    const phases = {
      'hospitalizacionGeneral': 'Hospitalización General (No crítico)',
      'agudaTemprana': 'Fase Aguda Temprana (Días 1-2 UCI/Crítico)',
      'agudaTardia': 'Fase Aguda Tardía (Días 3-7 UCI/Crítico)',
      'recuperacion': 'Fase de Recuperación (Post-UCI/Sala General)'
    };
    return phases[phase] || phase;
  };

  

  // Funciones helper para el diagnóstico integrado de síndrome de realimentación
  const hasLowElectrolytes = useCallback(() => {
    const electrolytes = [
      { key: 'potassium', current: parseFloat(followUpData.followUp_lab_potassium), normal: { min: 3.5, max: 5.0 } },
      { key: 'phosphorus', current: parseFloat(followUpData.followUp_lab_phosphorus), normal: { min: 2.5, max: 4.5 } },
      { key: 'magnesium', current: parseFloat(followUpData.followUp_lab_magnesium), normal: { min: 1.5, max: 2.5 } }
    ];

    return electrolytes.some(e => !isNaN(e.current) && e.current < e.normal.min);
  }, [followUpData.followUp_lab_potassium, followUpData.followUp_lab_phosphorus, followUpData.followUp_lab_magnesium]);

  const getAffectedElectrolytes = useCallback(() => {
    const affected = [];
    
    // Verificar desde comparación de laboratorios si existe
    if (labComparison?.electrolyteConcerns) {
      labComparison.electrolyteConcerns.forEach(concern => {
        affected.push({
          key: concern.name.toLowerCase(),
          name: concern.displayName,
          currentValue: concern.currentValue.toFixed(1),
          previousValue: concern.previousValue.toFixed(1),
          percentChange: concern.percentChange.toFixed(1) + '%',
          isLow: concern.isLow,
          significantDrop: concern.significantDrop
        });
      });
    }

    // Verificar también valores bajos actuales
    const electrolytes = [
      { 
        key: 'potassium', 
        name: 'Potasio', 
        current: parseFloat(followUpData.followUp_lab_potassium), 
        previous: previousLabs?.labs?.potassium ? parseFloat(previousLabs.labs.potassium) : null,
        normal: { min: 3.5, max: 5.0 },
        unit: 'mEq/L'
      },
      { 
        key: 'phosphorus', 
        name: 'Fósforo', 
        current: parseFloat(followUpData.followUp_lab_phosphorus), 
        previous: previousLabs?.labs?.phosphorus ? parseFloat(previousLabs.labs.phosphorus) : null,
        normal: { min: 2.5, max: 4.5 },
        unit: 'mg/dL'
      },
      { 
        key: 'magnesium', 
        name: 'Magnesio', 
        current: parseFloat(followUpData.followUp_lab_magnesium), 
        previous: previousLabs?.labs?.magnesium ? parseFloat(previousLabs.labs.magnesium) : null,
        normal: { min: 1.5, max: 2.5 },
        unit: 'mg/dL'
      },
      { 
        key: 'thiamine', 
        name: 'Tiamina', 
        current: parseFloat(followUpData.followUp_lab_thiamine), 
        previous: previousLabs?.labs?.thiamine ? parseFloat(previousLabs.labs.thiamine) : null,
        normal: { min: 70, max: 180 }, // nmol/L por defecto
        unit: followUpData.followUp_lab_thiamine_unit || 'nmol/L'
      }
    ];

    electrolytes.forEach(e => {
      let isLowValue = false;
      
      if (e.key === 'thiamine' && !isNaN(e.current)) {
        // Para tiamina, verificar según la unidad
        if (e.unit === 'ng/mL') {
          isLowValue = e.current < 21;
        } else {
          isLowValue = e.current < 70;
        }
      } else if (!isNaN(e.current)) {
        isLowValue = e.current < e.normal.min;
      }

      if (isLowValue) {
        // Verificar si ya está en la lista
        const alreadyAdded = affected.some(a => a.key === e.key);
        if (!alreadyAdded) {
          const percentChange = e.previous ? ((e.previous - e.current) / e.previous) * 100 : 0;
          affected.push({
            key: e.key,
            name: e.name,
            currentValue: e.current.toFixed(1) + ' ' + e.unit,
            previousValue: e.previous ? e.previous.toFixed(1) + ' ' + e.unit : 'N/A',
            percentChange: e.previous ? percentChange.toFixed(1) + '%' : 'N/A',
            isLow: true,
            significantDrop: percentChange >= 10
          });
        }
      }
    });

    return affected;
  }, [labComparison, followUpData.followUp_lab_potassium, followUpData.followUp_lab_phosphorus, 
      followUpData.followUp_lab_magnesium, followUpData.followUp_lab_thiamine, 
      followUpData.followUp_lab_thiamine_unit, previousLabs]);

  const getSymptomsList = useCallback(() => ({
    potassium: [
      'Parálisis',
      'Debilidad',
      'Arritmias',
      'Cambios en la contracción',
      'Falla respiratoria',
      'Náuseas',
      'Vómitos',
      'Estreñimiento',
      'Rabdomiólisis',
      'Necrosis muscular'
    ],
    phosphorus: [
      'Parestesias',
      'Debilidad',
      'Delirio',
      'Desorientación',
      'Encefalopatía',
      'Parálisis arreflexica',
      'Convulsiones',
      'Coma',
      'Tetania',
      'Hipotensión',
      'Choque',
      'Disminución del volumen sistólico',
      'Disminución de la presión arterial media',
      'Aumento de la presión de cuña pulmonar',
      'Debilidad diafragmática',
      'Falla respiratoria',
      'Disnea',
      'Hemólisis',
      'Trombocitopenia',
      'Disfunción leucocitaria'
    ],
    magnesium: [
      'Debilidad',
      'Temblores',
      'Fasciculaciones musculares',
      'Alteración del estado mental',
      'Tetania',
      'Convulsiones',
      'Coma',
      'Arritmias',
      'Gastrointestinal',
      'Anorexia',
      'Náuseas',
      'Vómitos',
      'Estreñimiento'
    ],
    thiamine: [
      'Encefalopatía',
      'Acidosis láctica',
      'Nistagmo',
      'Neuropatía',
      'Demencia',
      'Síndrome de Wernicke',
      'Psicosis de Korsakoff',
      'Beriberi húmedo y seco',
      'Confusión',
      'Ataxia',
      'Oftalmoplejía',
      'Neuropatía periférica',
      'Cardiomiopatía',
      'Insuficiencia cardíaca',
      'Edema',
      'Fatiga extrema'
    ]
  }), []);

  const handleRefeedingSyndromeSymptomToggle = useCallback((electrolyte, symptom) => {
    setFollowUpData(prev => {
      const currentSymptoms = prev.refeedingSyndrome_symptoms || {};
      const electrolyteSymptoms = currentSymptoms[electrolyte] || [];
      
      const newElectrolyteSymptoms = electrolyteSymptoms.includes(symptom)
        ? electrolyteSymptoms.filter(s => s !== symptom)
        : [...electrolyteSymptoms, symptom];

      return {
        ...prev,
        refeedingSyndrome_symptoms: {
          ...currentSymptoms,
          [electrolyte]: newElectrolyteSymptoms
        }
      };
    });
  }, []);

  const calculateRefeedingSyndromeDiagnosis = useCallback(() => {
    const affectedElectrolytes = getAffectedElectrolytes();
    const symptoms = followUpData.refeedingSyndrome_symptoms || {};
    const temporality = followUpData.refeedingSyndrome_temporality;

    let hasSyndrome = false;
    let hasOrganDysfunction = false;
    let severity = '';
    let diagnosis = '';
    let details = '';

    // Verificar si hay disfunción orgánica (síntomas presentes)
    const totalSymptoms = Object.values(symptoms).reduce((total, symptomsArray) => total + (symptomsArray?.length || 0), 0);
    hasOrganDysfunction = totalSymptoms > 0;

    // Verificar si hay cambios electrolíticos significativos
    const hasSignificantElectrolyteChanges = affectedElectrolytes.some(e => 
      e.significantDrop || e.isLow
    );

    // Criterios para síndrome: alteraciones electrolíticas Y/O disfunción orgánica
    hasSyndrome = hasSignificantElectrolyteChanges || hasOrganDysfunction;

    // Determinar severidad
    if (hasSyndrome && hasOrganDysfunction) {
      const maxDrop = Math.max(...affectedElectrolytes
        .filter(e => e.percentChange !== 'N/A')
        .map(e => parseFloat(e.percentChange.replace('%', ''))));
      
      if (maxDrop > 30 || totalSymptoms >= 3) {
        severity = 'SEVERO';
      } else if (maxDrop >= 20 || totalSymptoms >= 2) {
        severity = 'MODERADO';
      } else {
        severity = 'LEVE';
      }
    }

    // Determinar diagnóstico final
    if (!temporality && hasSyndrome) {
      diagnosis = 'No se reúne el criterio de temporalidad para el diagnóstico de síndrome de realimentación. Se sugiere seguimiento y evaluación más detallada.';
      details = `Se detectaron alteraciones electrolíticas en ${affectedElectrolytes.length} electrolito(s) y ${totalSymptoms} síntoma(s), pero no se confirmó el criterio de temporalidad.`;
    } else if (temporality && hasSyndrome) {
      diagnosis = `SÍNDROME DE REALIMENTACIÓN ${severity}`;
      details = `Criterios cumplidos: ${affectedElectrolytes.length} electrolito(s) afectado(s), ${totalSymptoms} síntoma(s) documentado(s), criterio de temporalidad confirmado.`;
    } else if (temporality && hasSignificantElectrolyteChanges && !hasOrganDysfunction) {
      diagnosis = 'CAMBIOS ELECTROLÍTICOS SIN SÍNDROME DE REALIMENTACIÓN';
      details = `Se documentaron alteraciones electrolíticas sin manifestaciones clínicas asociadas.`;
    } else {
      diagnosis = 'SIN SÍNDROME DE REALIMENTACIÓN';
      details = `No se cumplen los criterios diagnósticos completos.`;
    }

    // Actualizar el estado
    setFollowUpData(prev => ({
      ...prev,
      refeedingSyndrome_diagnosis: diagnosis,
      refeedingSyndrome_severity: severity,
      refeedingSyndrome_details: details
    }));

    // También guardar para el resumen final
    setRefeedingCalculatorResults({
      diagnostico: {
        diagnostico: diagnosis,
        severity: severity,
        hasOrganDysfunction: hasOrganDysfunction,
        affectedElectrolytes: affectedElectrolytes.length,
        totalSymptoms: totalSymptoms,
        temporalityCriteriaMet: temporality,
        details: details
      }
    });

  }, [getAffectedElectrolytes, followUpData.refeedingSyndrome_symptoms, followUpData.refeedingSyndrome_temporality]);

  // Memoizar el callback para evitar re-renders
  const stableHandleRefeedingResult = useCallback((result) => {
    console.log("Resultado de calculadora de síndrome de realimentación:", result);
    setRefeedingCalculatorResults(result);
  }, []);

  // Manejador para FI Score - optimizado para evitar re-renders
  const handleFIScoreResult = useCallback((result) => {
    console.log("Resultado de FI Score:", result);
    try {
      setFiScoreResults(prevResults => {
        // Solo actualizar si hay cambios reales
        if (JSON.stringify(prevResults) !== JSON.stringify(result)) {
          return result;
        }
        return prevResults;
      });
    } catch (error) {
      console.error("Error al procesar resultado FI Score:", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-8 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 mb-4 sm:mb-0">
              Valoración de Seguimiento
            </h1>
            <Link 
              to="/valoraciones-guardadas" 
              className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-md transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver a Valoraciones
            </Link>
          </div>

          {patientDataFromPrevious && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Paciente:</strong> {patientDataFromPrevious.patientName} | 
                    <strong> Documento:</strong> {patientDataFromPrevious.documentNumber}
                    {firstAssessmentDate && (
                      <>
                        <br />
                        <strong>Primera Valoración:</strong> {firstAssessmentDate} | 
                        <strong> Días Transcurridos:</strong> {calculateDaysBetween(firstAssessmentDate, followUpData.followUpDate)}
                      </>
                    )}
                    {nutritionalObjectives && (
                      <>
                        <br />
                        <strong>🎯 Objetivos Nutricionales:</strong> {nutritionalObjectives.calorieGoal} kcal/día | {nutritionalObjectives.proteinGoal} g proteína/día
                        <span className="text-xs"> (Basado en valoración del {nutritionalObjectives.assessmentDate})</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </header>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <form className="space-y-6">
            {/* Información básica del seguimiento */}
            <section className="space-y-4 border-b border-slate-200 pb-6">
              <h3 className="text-lg font-medium text-gray-700">Información del Seguimiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700">Fecha de Seguimiento:</label>
                  <input
                    type="date"
                    name="followUpDate"
                    id="followUpDate"
                    value={followUpData.followUpDate}
                    onChange={handleInputChange}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="patientName" className="block text-sm font-medium text-gray-700">Nombre del Paciente:</label>
                  <input
                    type="text"
                    name="patientName"
                    id="patientName"
                    value={followUpData.patientName}
                    onChange={handleInputChange}
                    className={inputStyle}
                    readOnly
                  />
                </div>
                <div>
                  <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">Número de Documento:</label>
                  <input
                    type="text"
                    name="documentNumber"
                    id="documentNumber"
                    value={followUpData.documentNumber}
                    onChange={handleInputChange}
                    className={inputStyle}
                    readOnly
                  />
                </div>
              </div>
            </section>

            {/* Datos Clínicos del Módulo 1 */}
            <section className="space-y-4 border-b border-slate-200 pb-6">
              <h3 className="text-lg font-medium text-gray-700">Datos Clínicos Actuales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="diseasePhase" className="block text-sm font-medium text-gray-700">
                    Fase Enfermedad/Estancia:
                    {firstAssessmentDate && !manualDiseasePhaseOverride && (
                      <span className="text-xs text-green-600 ml-1">(Automática)</span>
                    )}
                  </label>
                  <select 
                    name="diseasePhase" 
                    id="diseasePhase" 
                    value={followUpData.diseasePhase} 
                    onChange={handleInputChange} 
                    className={inputStyle}
                  >
                    <option value="hospitalizacionGeneral">Hospitalización General (No crítico)</option>
                    <option value="agudaTemprana">Fase Aguda Temprana (Días 1-2 UCI/Crítico)</option>
                    <option value="agudaTardia">Fase Aguda Tardía (Días 3-7 UCI/Crítico)</option>
                    <option value="recuperacion">Fase de Recuperación (Post-UCI/Sala General)</option>
                  </select>
                  {firstAssessmentDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Sugerida: {getDiseasePhaseText(calculatedDiseasePhase)}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="respiratoryStatus" className="block text-sm font-medium text-gray-700">Estado Respiratorio:</label>
                  <select 
                    name="respiratoryStatus" 
                    id="respiratoryStatus" 
                    value={followUpData.respiratoryStatus} 
                    onChange={handleInputChange} 
                    className={inputStyle}
                  >
                    <option value="respEspontanea">Respiración Espontánea (sin soporte ventilatorio)</option>
                    <option value="vni">Ventilación No Invasiva (VNI)</option>
                    <option value="vmi">Ventilación Mecánica Invasiva (VMI)</option>
                  </select>
                </div>
              </div>

              {/* Estado Hemodinámico y Soporte Vasoactivo */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-md font-medium text-gray-700 mb-3">Estado Hemodinámico y Soporte Vasoactivo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="followUp_hemodynamicStatus" className="block text-sm font-medium text-gray-700">Estado Hemodinámico:</label>
                    <select 
                      name="followUp_hemodynamicStatus" 
                      id="followUp_hemodynamicStatus" 
                      value={followUpData.followUp_hemodynamicStatus} 
                      onChange={handleInputChange} 
                      className={inputStyle}
                    >
                      <option value="estable">Estable</option>
                      <option value="inestable">Inestable</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="followUp_vasopressorUse" className="block text-sm font-medium text-gray-700">Uso de Vasopresores:</label>
                    <select 
                      name="followUp_vasopressorUse" 
                      id="followUp_vasopressorUse" 
                      value={followUpData.followUp_vasopressorUse} 
                      onChange={handleInputChange} 
                      className={inputStyle}
                    >
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="bodyTemperature" className="block text-sm font-medium text-gray-700">Temperatura (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      name="bodyTemperature"
                      id="bodyTemperature"
                      value={followUpData.bodyTemperature}
                      onChange={handleInputChange}
                      className={inputStyle}
                      placeholder="Ej: 37.0"
                    />
                  </div>
                  <div>
                    <label htmlFor="followUp_clinicalChanges" className="block text-sm font-medium text-gray-700">Cambios Clínicos Observados:</label>
                    <textarea
                      name="followUp_clinicalChanges"
                      id="followUp_clinicalChanges"
                      rows="3"
                      value={followUpData.followUp_clinicalChanges}
                      onChange={handleInputChange}
                      className={inputStyle}
                      placeholder="Describa cambios clínicos relevantes..."
                    />
                  </div>
                </div>

                {followUpData.followUp_vasopressorUse === 'si' && (
                  <div className="mt-4 space-y-4 pl-4 border-l-2 border-blue-500">
                    <div>
                      <label htmlFor="followUp_vasopressorDetails" className="block text-sm font-medium text-gray-700">Dosis y tipo de vasopresor(es):</label>
                      <input
                        type="text"
                        name="followUp_vasopressorDetails"
                        id="followUp_vasopressorDetails"
                        value={followUpData.followUp_vasopressorDetails}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: Norepinefrina 0.1 mcg/kg/min"
                      />
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="followUp_uncontrolledShock"
                          name="followUp_uncontrolledShock"
                          type="checkbox"
                          checked={followUpData.followUp_uncontrolledShock}
                          onChange={handleInputChange}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="followUp_uncontrolledShock" className="font-medium text-gray-700">
                          Shock incontrolado / Dosis de vasopresores en aumento
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Peso y Antropometría de Seguimiento */}
            <section className="space-y-4 border-b border-slate-200 pb-6">
              <h3 className="text-lg font-medium text-gray-700">Peso y Cambios Antropométricos</h3>

              {/* Información del peso anterior */}
              {previousWeight && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📊 Peso de Referencia</h4>
                  <p className="text-sm text-blue-700">
                    <strong>Peso Anterior:</strong> {previousWeight.weight} kg 
                    ({previousWeight.type} del {previousWeight.date})
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="followUp_currentWeight" className="block text-sm font-medium text-gray-700">Peso Actual (kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    name="followUp_currentWeight"
                    id="followUp_currentWeight"
                    value={followUpData.followUp_currentWeight}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 70.5"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_weightChange" className="block text-sm font-medium text-gray-700">Cambio de Peso (kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    name="followUp_weightChange"
                    id="followUp_weightChange"
                    value={followUpData.followUp_weightChange}
                    onChange={handleInputChange}
                    className={`${inputStyle} ${weightComparison ? 'bg-gray-50' : ''}`}
                    placeholder="Ej: +2.5 o -1.8"
                    readOnly={!!weightComparison}
                  />
                  {weightComparison && (
                    <p className="text-xs text-gray-500 mt-1">Calculado automáticamente</p>
                  )}
                </div>
                <div>
                  <label htmlFor="followUp_weightChangePercent" className="block text-sm font-medium text-gray-700">% Cambio de Peso:</label>
                  <input
                    type="number"
                    step="0.1"
                    name="followUp_weightChangePercent"
                    id="followUp_weightChangePercent"
                    value={followUpData.followUp_weightChangePercent}
                    onChange={handleInputChange}
                    className={`${inputStyle} ${weightComparison ? 'bg-gray-50' : ''}`}
                    placeholder="Ej: +3.5 o -2.8"
                    readOnly={!!weightComparison}
                  />
                  {weightComparison && (
                    <p className="text-xs text-gray-500 mt-1">Calculado automáticamente</p>
                  )}
                </div>
              </div>

              {/* Resumen de comparación de peso */}
              {weightComparison && (
                <div className={`mt-4 p-4 rounded-md border-l-4 ${
                  weightComparison.status === 'aumento' ? 'bg-green-50 border-green-400' :
                  weightComparison.status === 'pérdida' ? 'bg-red-50 border-red-400' :
                  'bg-gray-50 border-gray-400'
                }`}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">📈 Análisis de Cambio de Peso</h4>
                  
                  {/* Información temporal */}
                  {previousWeight && (
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="text-blue-700">
                        <strong>📅 Período de análisis:</strong> Desde {previousWeight.date} hasta {followUpData.followUpDate}
                        <span className="ml-2 font-medium">
                          ({calculateDaysBetween(previousWeight.date, followUpData.followUpDate)} días transcurridos)
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Peso Anterior:</p>
                      <p className="font-semibold">{weightComparison.previous} kg</p>
                      {previousWeight && (
                        <p className="text-xs text-gray-500">({previousWeight.date})</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-600">Peso Actual:</p>
                      <p className="font-semibold">{weightComparison.current} kg</p>
                      <p className="text-xs text-gray-500">({followUpData.followUpDate})</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Diferencia:</p>
                      <p className={`font-semibold ${
                        weightComparison.status === 'aumento' ? 'text-green-700' :
                        weightComparison.status === 'pérdida' ? 'text-red-700' :
                        'text-gray-700'
                      }`}>
                        {weightComparison.difference > 0 ? '+' : ''}{weightComparison.difference.toFixed(1)} kg 
                        ({weightComparison.percentChange > 0 ? '+' : ''}{weightComparison.percentChange.toFixed(1)}%)
                      </p>
                      {previousWeight && (
                        <p className="text-xs text-gray-500">
                          en {calculateDaysBetween(previousWeight.date, followUpData.followUpDate)} días
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className={`text-sm font-medium ${
                      weightComparison.status === 'aumento' ? 'text-green-800' :
                      weightComparison.status === 'pérdida' ? 'text-red-800' :
                      'text-gray-800'
                    }`}>
                      {weightComparison.status === 'aumento' && '↗️ Ganancia de peso'}
                      {weightComparison.status === 'pérdida' && '↘️ Pérdida de peso'}
                      {weightComparison.status === 'sin cambio' && '➡️ Sin cambio significativo'}

                      {previousWeight && (
                        <span className="ml-2 text-xs text-gray-600">
                          en {calculateDaysBetween(previousWeight.date, followUpData.followUpDate)} días
                        </span>
                      )}

                      {Math.abs(weightComparison.percentChange) >= 5 && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Cambio ≥5% - Clínicamente significativo
                        </span>
                      )}
                    </p>

                    {/* Análisis de velocidad de cambio */}
                    {previousWeight && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <strong>Velocidad de cambio:</strong> {' '}
                          {(() => {
                            const daysDiff = calculateDaysBetween(previousWeight.date, followUpData.followUpDate);
                            const kgPerWeek = daysDiff > 0 ? (Math.abs(weightComparison.difference) / daysDiff * 7).toFixed(1) : '0';
                            const percentPerWeek = daysDiff > 0 ? (Math.abs(weightComparison.percentChange) / daysDiff * 7).toFixed(1) : '0';
                            
                            return (
                              <>
                                {kgPerWeek} kg/semana ({percentPerWeek}%/semana)
                                {parseFloat(kgPerWeek) > 2 && weightComparison.status === 'pérdida' && (
                                  <span className="ml-2 text-red-600 font-medium">⚠️ Pérdida rápida</span>
                                )}
                                {parseFloat(kgPerWeek) > 3 && weightComparison.status === 'aumento' && (
                                  <span className="ml-2 text-orange-600 font-medium">⚠️ Ganancia rápida</span>
                                )}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Módulo de Calorías No Nutricionales */}
            <section className="space-y-4 border-b border-slate-200 pb-6">
              <h3 className="text-lg font-medium text-gray-700">Calorías No Nutricionales</h3>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="hasActiveInfusions"
                    name="hasActiveInfusions"
                    type="checkbox"
                    checked={followUpData.hasActiveInfusions || false}
                    onChange={handleInputChange}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="hasActiveInfusions" className="font-medium text-gray-700">
                    El paciente tiene infusiones activas que aportan calorías no nutricionales
                  </label>
                  <p className="text-gray-500 text-xs">Activar si el paciente recibe propofol, dextrosa u otras infusiones calóricas</p>
                </div>
              </div>

              {followUpData.hasActiveInfusions && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h4 className="text-sm font-medium text-yellow-800 mb-3">Configuración de Infusiones Calóricas</h4>
                  
                  {/* Propofol */}
                  <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md">
                    <div className="flex items-start mb-3">
                      <div className="flex items-center h-5">
                        <input
                          id="hasPropofol"
                          name="hasPropofol"
                          type="checkbox"
                          checked={followUpData.hasPropofol || false}
                          onChange={handleInputChange}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="hasPropofol" className="font-medium text-gray-700">
                          Propofol (1.1 kcal/mL)
                        </label>
                      </div>
                    </div>

                    {followUpData.hasPropofol && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="followUp_propofol_rate" className="block text-sm font-medium text-gray-700">Tasa (mL/hora):</label>
                          <input
                            type="number"
                            step="0.1"
                            name="followUp_propofol_rate"
                            id="followUp_propofol_rate"
                            value={followUpData.followUp_propofol_rate || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                            placeholder="Ej: 10"
                          />
                        </div>
                        <div>
                          <label htmlFor="followUp_propofol_duration" className="block text-sm font-medium text-gray-700">Duración (horas/día):</label>
                          <input
                            type="number"
                            step="0.1"
                            name="followUp_propofol_duration"
                            id="followUp_propofol_duration"
                            value={followUpData.followUp_propofol_duration || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                            placeholder="Ej: 24"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="text-sm">
                            <p className="text-gray-600">Calorías calculadas:</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {((parseFloat(followUpData.followUp_propofol_rate) || 0) * 
                                (parseFloat(followUpData.followUp_propofol_duration) || 0) * 1.1).toFixed(1)} kcal/día
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dextrosa */}
                  <div className="p-3 bg-white border border-gray-200 rounded-md">
                    <div className="flex items-start mb-3">
                      <div className="flex items-center h-5">
                        <input
                          id="hasDextrose"
                          name="hasDextrose"
                          type="checkbox"
                          checked={followUpData.hasDextrose || false}
                          onChange={handleInputChange}
                          className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="hasDextrose" className="font-medium text-gray-700">
                          Dextrosa (3.4 kcal/g)
                        </label>
                      </div>
                    </div>

                    {followUpData.hasDextrose && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="followUp_dextrose_concentration" className="block text-sm font-medium text-gray-700">Concentración (%):</label>
                          <select
                            name="followUp_dextrose_concentration"
                            id="followUp_dextrose_concentration"
                            value={followUpData.followUp_dextrose_concentration || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="5">5%</option>
                            <option value="10">10%</option>
                            <option value="20">20%</option>
                            <option value="50">50%</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="followUp_dextrose_volume" className="block text-sm font-medium text-gray-700">Volumen (mL/día):</label>
                          <input
                            type="number"
                            name="followUp_dextrose_volume"
                            id="followUp_dextrose_volume"
                            value={followUpData.followUp_dextrose_volume || ''}
                            onChange={handleInputChange}
                            className={inputStyle}
                            placeholder="Ej: 1000"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="text-sm">
                            <p className="text-gray-600">Calorías calculadas:</p>
                            <p className="text-lg font-semibold text-green-600">
                              {(((parseFloat(followUpData.followUp_dextrose_concentration) || 0) / 100) * 
                                (parseFloat(followUpData.followUp_dextrose_volume) || 0) * 3.4).toFixed(1)} kcal/día
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resumen de calorías no nutricionales */}
                  {(followUpData.hasPropofol || followUpData.hasDextrose) && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">📊 Resumen de Calorías No Nutricionales</h5>
                      <div className="text-sm space-y-1">
                        {followUpData.hasPropofol && (
                          <p>
                            <strong>Propofol:</strong> {((parseFloat(followUpData.followUp_propofol_rate) || 0) * 
                            (parseFloat(followUpData.followUp_propofol_duration) || 0) * 1.1).toFixed(1)} kcal/día
                          </p>
                        )}
                        {followUpData.hasDextrose && (
                          <p>
                            <strong>Dextrosa:</strong> {(((parseFloat(followUpData.followUp_dextrose_concentration) || 0) / 100) * 
                            (parseFloat(followUpData.followUp_dextrose_volume) || 0) * 3.4).toFixed(1)} kcal/día
                          </p>
                        )}
                        <div className="pt-2 border-t border-gray-300">
                          <p className="font-semibold text-orange-600">
                            <strong>Total Calorías No Nutricionales: </strong>
                            {(
                              ((parseFloat(followUpData.followUp_propofol_rate) || 0) * 
                               (parseFloat(followUpData.followUp_propofol_duration) || 0) * 1.1) +
                              (((parseFloat(followUpData.followUp_dextrose_concentration) || 0) / 100) * 
                               (parseFloat(followUpData.followUp_dextrose_volume) || 0) * 3.4)
                            ).toFixed(1)} kcal/día
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Vía de Nutrición Actual */}
            <section className="space-y-4 border-b border-slate-200 pb-6">
              <h3 className="text-lg font-medium text-gray-700">Vía de Nutrición Actual</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nutritionRoute" className="block text-sm font-medium text-gray-700">Vía de Nutrición:</label>
                  <select 
                    name="nutritionRoute" 
                    id="nutritionRoute" 
                    value={followUpData.nutritionRoute} 
                    onChange={handleInputChange} 
                    className={inputStyle}
                  >
                    <option value="oral">Oral</option>
                    <option value="oralSNO">Oral con Suplementos (SNOs)</option>
                    <option value="enteralNE">Nutrición Enteral (NE)</option>
                    <option value="parenteralNP">Nutrición Parenteral (NP)</option>
                    <option value="mixta">Mixta (NE/NP)</option>
                    <option value="porDefinir">No Definida / Por Determinar</option>
                  </select>
                </div>
              </div>

              {/* Aquí se pueden agregar campos específicos según la vía de nutrición seleccionada */}
              {followUpData.nutritionRoute === 'enteralNE' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Monitorización Nutrición Enteral</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label htmlFor="followUp_enStartDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio NE:</label>
                      <input
                        type="date"
                        name="followUp_enStartDate"
                        id="followUp_enStartDate"
                        value={followUpData.followUp_enStartDate || ''}
                        onChange={handleInputChange}
                        className={inputStyle}
                      />
                      {followUpData.followUp_enStartDate && (
                        <p className="text-xs text-blue-600 mt-1">
                          Días formulada: {calculateDaysBetween(followUpData.followUp_enStartDate, followUpData.followUpDate)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="followUp_enRouteType" className="block text-sm font-medium text-gray-700">Tipo de Vía:</label>
                      <select
                        name="followUp_enRouteType"
                        id="followUp_enRouteType"
                        value={followUpData.followUp_enRouteType || 'gastrica'}
                        onChange={handleInputChange}
                        className={inputStyle}
                      >
                        <option value="gastrica">Gástrica</option>
                        <option value="yeyuno">Yeyuno</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="followUp_enModality" className="block text-sm font-medium text-gray-700">Modalidad de Administración:</label>
                      <select
                        name="followUp_enModality"
                        id="followUp_enModality"
                        value={followUpData.followUp_enModality || 'continua'}
                        onChange={handleInputChange}
                        className={inputStyle}
                      >
                        <option value="continua">Continua</option>
                        <option value="bolos">En Bolos</option>
                        <option value="mixta">Mixta (Continua + Bolos)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="followUp_enActualIntakeVolume" className="block text-sm font-medium text-gray-700">Volumen Real Administrado (mL/día):</label>
                      <input
                        type="number"
                        name="followUp_enActualIntakeVolume"
                        id="followUp_enActualIntakeVolume"
                        value={followUpData.followUp_enActualIntakeVolume}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: 1200"
                      />
                    </div>
                    <div>
                      <label htmlFor="followUp_enCaloriesPerMl" className="block text-sm font-medium text-gray-700">Concentración Calórica (kcal/mL):</label>
                      <input
                        type="number"
                        step="0.1"
                        name="followUp_enCaloriesPerMl"
                        id="followUp_enCaloriesPerMl"
                        value={followUpData.followUp_enCaloriesPerMl}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: 1.5"
                      />
                    </div>
                    <div>
                      <label htmlFor="followUp_enProteinPerMl" className="block text-sm font-medium text-gray-700">Concentración Proteica (g/mL):</label>
                      <input
                        type="number"
                        step="0.01"
                        name="followUp_enProteinPerMl"
                        id="followUp_enProteinPerMl"
                        value={followUpData.followUp_enProteinPerMl}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: 0.06"
                      />
                    </div>
                    <div>
                      <label htmlFor="followUp_enInterruptions" className="block text-sm font-medium text-gray-700">Interrupciones (Razón y Duración):</label>
                      <input
                        type="text"
                        name="followUp_enInterruptions"
                        id="followUp_enInterruptions"
                        value={followUpData.followUp_enInterruptions}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: Procedimientos - 4h"
                      />
                    </div>
                  </div>

                  <NutritionalCalculationDisplay 
                    volume={followUpData.followUp_enActualIntakeVolume}
                    caloriesPerMl={followUpData.followUp_enCaloriesPerMl}
                    proteinPerMl={followUpData.followUp_enProteinPerMl}
                    label="Nutrición Enteral"
                    objectives={nutritionalObjectives}
                    nonNutritionalCalories={calculateNonNutritionalCalories(followUpData)}
                  />
                </div>
              )}

              {followUpData.nutritionRoute === 'parenteralNP' && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Monitorización Nutrición Parenteral</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="followUp_npStartDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio NP:</label>
                      <input
                        type="date"
                        name="followUp_npStartDate"
                        id="followUp_npStartDate"
                        value={followUpData.followUp_npStartDate || ''}
                        onChange={handleInputChange}
                        className={inputStyle}
                      />
                      {followUpData.followUp_npStartDate && (
                        <p className="text-xs text-purple-600 mt-1">
                          Días formulada: {calculateDaysBetween(followUpData.followUp_npStartDate, followUpData.followUpDate)}
                        </p>
                                            )}
                    </div>
                    <div>
                      <label htmlFor="followUp_npModality" className="block text-sm font-medium text-gray-700">Modalidad:</label>
                      <select
                        name="followUp_npModality"
                        id="followUp_npModality"
                        value={followUpData.followUp_npModality || 'continua'}
                        onChange={handleInputChange}
                        className={inputStyle}
                      >
                        <option value="continua">Continua</option>
                        <option value="intermitente">Intermitente</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="followUp_npSoyLipidEmulsion" className="block text-sm font-medium text-gray-700">Usa Emulsiones Lipídicas IV a base de Soya:</label>
                      <select
                        name="followUp_npSoyLipidEmulsion"
                        id="followUp_npSoyLipidEmulsion"
                        value={followUpData.followUp_npSoyLipidEmulsion || 'no'}
                        onChange={handleInputChange}
                        className={inputStyle}
                      >
                        <option value="no">No</option>
                        <option value="si">Sí</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="followUp_npActualIntakeVolume" className="block text-sm font-medium text-gray-700">Volumen Real Administrado (mL/día):</label>
                      <input
                        type="number"
                        name="followUp_npActualIntakeVolume"
                        id="followUp_npActualIntakeVolume"
                        value={followUpData.followUp_npActualIntakeVolume}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: 1500"
                      />
                    </div>
                    <div>
                      <label htmlFor="followUp_npCaloriesPerMl" className="block text-sm font-medium text-gray-700">Concentración Calórica (kcal/mL):</label>
                      <input
                        type="number"
                        step="0.1"
                        name="followUp_npCaloriesPerMl"
                        id="followUp_npCaloriesPerMl"
                        value={followUpData.followUp_npCaloriesPerMl}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: 1.2"
                      />
                    </div>
                    <div>
                      <label htmlFor="followUp_npProteinPerMl" className="block text-sm font-medium text-gray-700">Concentración Proteica (g/mL):</label>
                      <input
                        type="number"
                        step="0.01"
                        name="followUp_npProteinPerMl"
                        id="followUp_npProteinPerMl"
                        value={followUpData.followUp_npProteinPerMl}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: 0.05"
                      />
                    </div>
                    <div>
                      <label htmlFor="followUp_npTolerance" className="block text-sm font-medium text-gray-700">Tolerancia:</label>
                      <input
                        type="text"
                        name="followUp_npTolerance"
                        id="followUp_npTolerance"
                        value={followUpData.followUp_npTolerance}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Buena/Regular/Mala"
                      />
                    </div>
                    <div>
                      <label htmlFor="followUp_npInterruptions" className="block text-sm font-medium text-gray-700">Interrupciones (Razón y Duración):</label>
                      <input
                        type="text"
                        name="followUp_npInterruptions"
                        id="followUp_npInterruptions"
                        value={followUpData.followUp_npInterruptions}
                        onChange={handleInputChange}
                        className={inputStyle}
                        placeholder="Ej: Cambio acceso vascular - 2h"
                      />
                    </div>
                  </div>

                  <NutritionalCalculationDisplay 
                    volume={followUpData.followUp_npActualIntakeVolume}
                    caloriesPerMl={followUpData.followUp_npCaloriesPerMl}
                    proteinPerMl={followUpData.followUp_npProteinPerMl}
                    label="Nutrición Parenteral"
                    objectives={nutritionalObjectives}
                    nonNutritionalCalories={calculateNonNutritionalCalories(followUpData)}
                  />
                </div>
              )}

              {(followUpData.nutritionRoute === 'oral' || followUpData.nutritionRoute === 'oralSNO') && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Monitorización Vía Oral</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="followUp_oralIntakePercentage" className="block text-sm font-medium text-gray-700">Porcentaje de Ingesta (%):</label>
                      <select
                        name="followUp_oralIntakePercentage"
                        id="followUp_oralIntakePercentage"
                        value={followUpData.followUp_oralIntakePercentage || ''}
                        onChange={handleInputChange}
                        className={inputStyle}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="0-25">0-25% (Muy pobre)</option>
                        <option value="26-50">26-50% (Pobre)</option>
                        <option value="51-75">51-75% (Regular)</option>
                        <option value="76-100">76-100% (Buena)</option>
                      </select>
                    </div>
                    {followUpData.nutritionRoute === 'oralSNO' && (
                      <div>
                        <label htmlFor="followUp_supplementIntake" className="block text-sm font-medium text-gray-700">Ingesta de Suplementos:</label>
                        <input
                          type="text"
                          name="followUp_supplementIntake"
                          id="followUp_supplementIntake"
                          value={followUpData.followUp_supplementIntake || ''}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Tipo y cantidad de suplementos"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {followUpData.nutritionRoute === 'mixta' && (
                <div className="mt-4 p-4 border border-orange-300 rounded-md bg-orange-50">
                  <h5 className="text-md font-medium text-orange-700 mb-3">Monitorización de Nutrición Mixta (NE + NP)</h5>

                  {/* Componente Enteral */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h6 className="text-sm font-medium text-blue-800 mb-3">Componente Enteral</h6>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label htmlFor="followUp_mixedNEStartDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio NE:</label>
                        <input
                          type="date"
                          name="followUp_mixedNEStartDate"
                          id="followUp_mixedNEStartDate"
                          value={followUpData.followUp_mixedNEStartDate || ''}
                          onChange={handleInputChange}
                          className={inputStyle}
                        />
                        {followUpData.followUp_mixedNEStartDate && (
                          <p className="text-xs text-blue-600 mt-1">
                            Días formulada: {calculateDaysBetween(followUpData.followUp_mixedNEStartDate, followUpData.followUpDate)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNERouteType" className="block text-sm font-medium text-gray-700">Tipo de Vía:</label>
                        <select
                          name="followUp_mixedNERouteType"
                          id="followUp_mixedNERouteType"
                          value={followUpData.followUp_mixedNERouteType || 'gastrica'}
                          onChange={handleInputChange}
                          className={inputStyle}
                        >
                          <option value="gastrica">Gástrica</option>
                          <option value="yeyuno">Yeyuno</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNEModality" className="block text-sm font-medium text-gray-700">Modalidad de Administración:</label>
                        <select
                          name="followUp_mixedNEModality"
                          id="followUp_mixedNEModality"
                          value={followUpData.followUp_mixedNEModality || 'continua'}
                          onChange={handleInputChange}
                          className={inputStyle}
                        >
                          <option value="continua">Continua</option>
                          <option value="bolos">En Bolos</option>
                          <option value="mixta">Mixta (Continua + Bolos)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="followUp_mixedNeVolume" className="block text-sm font-medium text-gray-700">Volumen Real Administrado (mL/día):</label>
                        <input
                          type="number"
                          name="followUp_mixedNeVolume"
                          id="followUp_mixedNeVolume"
                          value={followUpData.followUp_mixedNeVolume}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: 800"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNeCaloriesPerMl" className="block text-sm font-medium text-gray-700">Concentración Calórica (kcal/mL):</label>
                        <input
                          type="number"
                          step="0.1"
                          name="followUp_mixedNeCaloriesPerMl"
                          id="followUp_mixedNeCaloriesPerMl"
                          value={followUpData.followUp_mixedNeCaloriesPerMl}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: 1.5"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNeProteinPerMl" className="block text-sm font-medium text-gray-700">Concentración Proteica (g/mL):</label>
                        <input
                          type="number"
                          step="0.01"
                          name="followUp_mixedNeProteinPerMl"
                          id="followUp_mixedNeProteinPerMl"
                          value={followUpData.followUp_mixedNeProteinPerMl}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: 0.06"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNEInterruptions" className="block text-sm font-medium text-gray-700">Interrupciones (Razón y Duración):</label>
                        <input
                          type="text"
                          name="followUp_mixedNEInterruptions"
                          id="followUp_mixedNEInterruptions"
                          value={followUpData.followUp_mixedNEInterruptions || ''}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: Procedimientos - 4h"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Componente Parenteral */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                    <h6 className="text-sm font-medium text-purple-800 mb-3">Componente Parenteral</h6>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label htmlFor="followUp_mixedNPStartDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio NP:</label>
                        <input
                          type="date"
                          name="followUp_mixedNPStartDate"
                          id="followUp_mixedNPStartDate"
                          value={followUpData.followUp_mixedNPStartDate || ''}
                          onChange={handleInputChange}
                          className={inputStyle}
                        />
                        {followUpData.followUp_mixedNPStartDate && (
                          <p className="text-xs text-purple-600 mt-1">
                            Días formulada: {calculateDaysBetween(followUpData.followUp_mixedNPStartDate, followUpData.followUpDate)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNPModality" className="block text-sm font-medium text-gray-700">Modalidad:</label>
                        <select
                          name="followUp_mixedNPModality"
                          id="followUp_mixedNPModality"
                          value={followUpData.followUp_mixedNPModality || 'continua'}
                          onChange={handleInputChange}
                          className={inputStyle}
                        >
                          <option value="continua">Continua</option>
                          <option value="intermitente">Intermitente</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNPSoyLipidEmulsion" className="block text-sm font-medium text-gray-700">Usa Emulsiones Lipídicas IV a base de Soya:</label>
                        <select
                          name="followUp_mixedNPSoyLipidEmulsion"
                          id="followUp_mixedNPSoyLipidEmulsion"
                          value={followUpData.followUp_mixedNPSoyLipidEmulsion || 'no'}
                          onChange={handleInputChange}
                          className={inputStyle}
                        >
                          <option value="no">No</option>
                          <option value="si">Sí</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="followUp_mixedNpVolume" className="block text-sm font-medium text-gray-700">Volumen Real Administrado (mL/día):</label>
                        <input
                          type="number"
                          name="followUp_mixedNpVolume"
                          id="followUp_mixedNpVolume"
                          value={followUpData.followUp_mixedNpVolume}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: 500"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNpCaloriesPerMl" className="block text-sm font-medium text-gray-700">Concentración Calórica (kcal/mL):</label>
                        <input
                          type="number"
                          step="0.1"
                          name="followUp_mixedNpCaloriesPerMl"
                          id="followUp_mixedNpCaloriesPerMl"
                          value={followUpData.followUp_mixedNpCaloriesPerMl}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: 1.2"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNpProteinPerMl" className="block text-sm font-medium text-gray-700">Concentración Proteica (g/mL):</label>
                        <input
                          type="number"
                          step="0.01"
                          name="followUp_mixedNpProteinPerMl"
                          id="followUp_mixedNpProteinPerMl"
                          value={followUpData.followUp_mixedNpProteinPerMl}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: 0.05"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNPTolerance" className="block text-sm font-medium text-gray-700">Tolerancia:</label>
                        <input
                          type="text"
                          name="followUp_mixedNPTolerance"
                          id="followUp_mixedNPTolerance"
                          value={followUpData.followUp_mixedNPTolerance || ''}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Buena/Regular/Mala"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNPInterruptions" className="block text-sm font-medium text-gray-700">Interrupciones (Razón y Duración):</label>
                        <input
                          type="text"
                          name="followUp_mixedNPInterruptions"
                          id="followUp_mixedNPInterruptions"
                          value={followUpData.followUp_mixedNPInterruptions || ''}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Ej: Cambio acceso vascular - 2h"
                        />
                      </div>
                      <div>
                        <label htmlFor="followUp_mixedNPComplications" className="block text-sm font-medium text-gray-700">Complicaciones NP:</label>
                        <input
                          type="text"
                          name="followUp_mixedNPComplications"
                          id="followUp_mixedNPComplications"
                          value={followUpData.followUp_mixedNPComplications || ''}
                          onChange={handleInputChange}
                          className={inputStyle}
                          placeholder="Describa complicaciones si las hay"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consolidación de aportes mixtos */}
                  <MixedNutritionSummary 
                    neVolume={followUpData.followUp_mixedNeVolume}
                    neCaloriesPerMl={followUpData.followUp_mixedNeCaloriesPerMl}
                    neProteinPerMl={followUpData.followUp_mixedNeProteinPerMl}
                    npVolume={followUpData.followUp_mixedNpVolume}
                    npCaloriesPerMl={followUpData.followUp_mixedNpCaloriesPerMl}
                    npProteinPerMl={followUpData.followUp_mixedNpProteinPerMl}
                    objectives={nutritionalObjectives}
                    nonNutritionalCalories={calculateNonNutritionalCalories(followUpData)}
                  />
                </div>
              )}
            </section>

            {/* Escala de Tolerancia FI Score */}
            <FIScoreCalculator 
              showCalculator={
                followUpData.nutritionRoute === 'enteralNE' || 
                followUpData.nutritionRoute === 'mixta'
              }
              onFIScoreResult={handleFIScoreResult}
            />

            {/* Laboratorios de Seguimiento */}
            <section className="space-y-4 border-b border-slate-200 pb-6">
              <h3 className="text-lg font-medium text-gray-700">Laboratorios de Seguimiento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="followUp_lab_potassium" className="block text-sm font-medium text-gray-700">Potasio (mEq/L):</label>
                  <input
                    type="number"
                    step="0.1"
                    name="followUp_lab_potassium"
                    id="followUp_lab_potassium"
                    value={followUpData.followUp_lab_potassium}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 4.0"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_phosphorus" className="block text-sm font-medium text-gray-700">Fósforo (mg/dL):</label>
                  <input
                    type="number"
                    step="0.1"
                    name="followUp_lab_phosphorus"
                    id="followUp_lab_phosphorus"
                    value={followUpData.followUp_lab_phosphorus}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 3.5"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_magnesium" className="block text-sm font-medium text-gray-700">Magnesio (mg/dL):</label>
                  <input
                    type="number"
                    step="0.1"
                    name="followUp_lab_magnesium"
                    id="followUp_lab_magnesium"
                    value={followUpData.followUp_lab_magnesium}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 2.0"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_sodium" className="block text-sm font-medium text-gray-700">Sodio (mEq/L):</label>
                  <input
                    type="number"
                    step="1"
                    name="followUp_lab_sodium"
                    id="followUp_lab_sodium"
                    value={followUpData.followUp_lab_sodium}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 140"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_glucose" className="block text-sm font-medium text-gray-700">Glucosa (mg/dL):</label>
                  <input
                    type="number"
                    step="1"
                    name="followUp_lab_glucose"
                    id="followUp_lab_glucose"
                    value={followUpData.followUp_lab_glucose}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 90"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_creatinine" className="block text-sm font-medium text-gray-700">Creatinina (mg/dL):</label>
                  <input
                    type="number"
                    step="0.01"
                    name="followUp_lab_creatinine"
                    id="followUp_lab_creatinine"
                    value={followUpData.followUp_lab_creatinine}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 0.9"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_bun" className="block text-sm font-medium text-gray-700">BUN (mg/dL):</label>
                  <input
                    type="number"
                    step="1"
                    name="followUp_lab_bun"
                    id="followUp_lab_bun"
                    value={followUpData.followUp_lab_bun}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 15"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_ast" className="block text-sm font-medium text-gray-700">AST (U/L):</label>
                  <input
                    type="number"
                    step="1"
                    name="followUp_lab_ast"
                    id="followUp_lab_ast"
                    value={followUpData.followUp_lab_ast}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 25"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_alt" className="block text-sm font-medium text-gray-700">ALT (U/L):</label>
                  <input
                    type="number"
                    step="1"
                    name="followUp_lab_alt"
                    id="followUp_lab_alt"
                    value={followUpData.followUp_lab_alt}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 30"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_alkPhos" className="block text-sm font-medium text-gray-700">Fosf. Alcalina (U/L):</label>
                  <input
                    type="number"
                    step="1"
                    name="followUp_lab_alkPhos"
                    id="followUp_lab_alkPhos"
                    value={followUpData.followUp_lab_alkPhos}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 80"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_triglycerides" className="block text-sm font-medium text-gray-700">Triglicéridos (mg/dL):</label>
                  <input
                    type="number"
                    step="1"
                    name="followUp_lab_triglycerides"
                    id="followUp_lab_triglycerides"
                    value={followUpData.followUp_lab_triglycerides}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 120"
                  />
                </div>
                <div>
                  <label htmlFor="followUp_lab_crp" className="block text-sm font-medium text-gray-700">Proteína C Reactiva (mg/L):</label>
                  <input
                    type="number"
                    step="0.1"
                    name="followUp_lab_crp"
                    id="followUp_lab_crp"
                    value={followUpData.followUp_lab_crp}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="Ej: 5.0"
                  />
                </div>

                {/* Campo especial de Tiamina con conversión de unidades */}
                <div className="md:col-span-2 lg:col-span-4">
                  <label htmlFor="followUp_lab_thiamine" className="block text-sm font-medium text-gray-700">Tiamina:</label>
                  <div className="mt-1 flex space-x-2">
                    <div className="flex-grow relative rounded-md shadow-sm">
                      <input 
                        type="number" 
                        step="0.1"
                        name="followUp_lab_thiamine" 
                        id="followUp_lab_thiamine" 
                        value={followUpData.followUp_lab_thiamine} 
                        onChange={handleInputChange}
                        className={`${inputStyle} pr-16`}
                        placeholder={`Valor en ${followUpData.followUp_lab_thiamine_unit || 'nmol/L'}`}
                      />
                      {followUpData.followUp_lab_thiamine_status && (
                        <div className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                          followUpData.followUp_lab_thiamine_status === 'normal' ? 'text-green-600' : 
                          followUpData.followUp_lab_thiamine_status === 'bajo' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {followUpData.followUp_lab_thiamine_status.charAt(0).toUpperCase() + followUpData.followUp_lab_thiamine_status.slice(1)}
                        </div>
                      )}
                    </div>
                    <select
                      name="followUp_lab_thiamine_unit"
                      value={followUpData.followUp_lab_thiamine_unit || 'nmol/L'}
                      onChange={handleInputChange}
                      className="mt-1 block w-24 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="nmol/L">nmol/L</option>
                      <option value="ng/mL">ng/mL</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Valores de referencia: {followUpData.followUp_lab_thiamine_unit === 'ng/mL' ? '21-54 ng/mL' : '70-180 nmol/L'}
                  </p>
                </div>
              </div>

              {/* Análisis Comparativo de Laboratorios */}
              {labComparison && (
                <div className="mt-6 p-5 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl shadow-lg">
                  <h4 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                    🔬 Análisis Comparativo de Laboratorios
                    <span className="ml-2 text-sm text-gray-600">
                      (vs {labComparison.previousType} del {labComparison.previousDate})
                    </span>
                  </h4>

                  {/* Alertas de electrolitos críticos */}
                  {labComparison.electrolyteConcerns.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                      <h5 className="text-md font-semibold text-red-800 mb-3 flex items-center">
                        ⚠️ Cambios Críticos en Electrolitos - Riesgo de Síndrome de Realimentación
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {labComparison.electrolyteConcerns.map((concern, index) => (
                          <div key={index} className="p-3 bg-white border border-red-200 rounded-md">
                            <h6 className="font-semibold text-red-700 mb-2">{concern.displayName}</h6>
                            <div className="text-sm space-y-1">
                              <p>
                                <strong>Anterior:</strong> {concern.previousValue.toFixed(1)} → 
                                <strong className="ml-1">Actual:</strong> {concern.currentValue.toFixed(1)}
                              </p>
                              <p className="text-red-600 font-medium">
                                Cambio: {concern.percentChange.toFixed(1)}%
                                {concern.isLow && <span className="ml-2 bg-red-100 px-2 py-1 rounded text-xs">BAJO</span>}
                                {concern.significantDrop && <span className="ml-2 bg-orange-100 px-2 py-1 rounded text-xs">CAÍDA &gt;10%</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {refeedingRisk && (
                        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                          <p className="text-sm text-yellow-800">
                            <strong>⚠️ Alerta:</strong> El paciente tiene riesgo de síndrome de realimentación identificado 
                            ({refeedingRisk.riesgo?.nivel}) y presenta cambios significativos en electrolitos. 
                            Se recomienda evaluación inmediata con la calculadora específica.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tabla de todos los laboratorios */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 bg-white rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Laboratorio</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Valor Anterior</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Valor Actual</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Cambio</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(labComparison.comparison).map(([labKey, data]) => {
                          const labNames = {
                            potassium: 'Potasio (mEq/L)',
                            phosphorus: 'Fósforo (mg/dL)',
                            magnesium: 'Magnesio (mg/dL)',
                            sodium: 'Sodio (mEq/L)',
                            glucose: 'Glucosa (mg/dL)',
                            creatinine: 'Creatinina (mg/dL)',
                            bun: 'BUN (mg/dL)',
                            ast: 'AST (U/L)',
                            alt: 'ALT (U/L)',
                            alkPhos: 'Fosfatasa Alcalina (U/L)',
                            triglycerides: 'Triglicéridos (mg/dL)',
                            thiamine: `Tiamina (${followUpData.followUp_lab_thiamine_unit || 'nmol/L'})`,
                            crp: 'Proteína C Reactiva (mg/L)'
                          };

                          return (
                            <tr key={labKey} className={`${
                              data.concern === 'critico' ? 'bg-red-50' :
                              data.concern === 'alerta' ? 'bg-yellow-50' :
                              'hover:bg-gray-50'
                            }`}>
                              <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                                {labNames[labKey] || labKey}
                                {['potassium', 'phosphorus', 'magnesium', 'thiamine'].includes(labKey) && (
                                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">SR</span>
                                )}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                                {data.previous !== null ? data.previous.toFixed(labKey === 'creatinine' ? 2 : 1) : 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                                {data.current.toFixed(labKey === 'creatinine' ? 2 : 1)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                                <span className={data.color}>
                                  {data.difference !== null ? (
                                    <>
                                      {data.difference > 0 ? '+' : ''}{data.difference.toFixed(labKey === 'creatinine' ? 2 : 1)}
                                      <br />
                                      <span className="text-xs">
                                        ({data.percentChange > 0 ? '+' : ''}{data.percentChange.toFixed(1)}%)
                                      </span>
                                    </>
                                  ) : 'Nuevo valor'}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                                <span className={`${data.color} flex items-center justify-center`}>
                                  {data.icon}
                                  <span className="ml-1 text-xs">
                                    {data.status === 'aumento' ? 'Aumento' :
                                     data.status === 'disminucion' ? 'Disminución' :
                                     data.status === 'nuevo-valor' ? 'Nuevo' :
                                     'Sin cambio'}
                                  </span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumen de interpretación */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h6 className="text-sm font-semibold text-gray-700 mb-2">📋 Interpretación Clínica</h6>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• <strong>SR:</strong> Electrolitos involucrados en el síndrome de realimentación</p>
                      <p>• <strong>Cambios ≥5%:</strong> Considerados clínicamente significativos</p>
                      <p>• <strong>Cambios ≥10% en K, P, Mg:</strong> Criterio diagnóstico para síndrome de realimentación</p>
                      {labComparison.hasSignificantChanges && (
                        <p className="text-blue-600 font-medium">
                          ✓ Se detectaron cambios significativos que requieren monitorización estrecha
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Información de laboratorios anteriores disponibles */}
              {previousLabs && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📊 Laboratorios de Referencia</h4>
                  <p className="text-sm text-blue-700">
                    <strong>Fecha de Referencia:</strong> {previousLabs.date} ({previousLabs.type})
                    <br />
                    <strong>Parámetros Disponibles:</strong> {Object.keys(previousLabs.labs).length} laboratorios para comparación
                  </p>
                </div>
              )}
            </section>

            {/* Evaluación Integrada de Síndrome de Realimentación */}
            {(labComparison?.electrolyteConcerns?.length > 0 || hasLowElectrolytes()) && (
              <section className="space-y-4 border-b border-slate-200 pb-6">
                <h3 className="text-lg font-medium text-gray-700">Evaluación de Síndrome de Realimentación</h3>
                
                {refeedingRisk && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <p className="text-sm text-purple-700">
                      <strong>Riesgo Previo Identificado:</strong> {refeedingRisk.riesgo?.nivel}
                      <br />
                      <span className="text-xs">Se detectaron alteraciones electrolíticas que requieren evaluación diagnóstica.</span>
                    </p>
                  </div>
                )}

                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  {/* Criterios Electrolíticos Detectados */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-red-700 mb-3">
                      ⚠️ Alteraciones Electrolíticas Detectadas
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getAffectedElectrolytes().map((electrolyte, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <h6 className="font-semibold text-red-700 mb-2">{electrolyte.name}</h6>
                          <div className="text-sm space-y-1">
                            <p><strong>Valor actual:</strong> {electrolyte.currentValue}</p>
                            <p><strong>Valor anterior:</strong> {electrolyte.previousValue}</p>
                            <p className="text-red-600 font-medium">
                              Cambio: {electrolyte.percentChange}%
                              {electrolyte.isLow && <span className="ml-2 bg-red-100 px-2 py-1 rounded text-xs">BAJO</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Evaluación de Síntomas por Electrolito */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Evaluación de Síntomas Asociados
                    </h4>
                    <p className="text-sm text-blue-700 mb-4 italic">
                      Seleccione los signos o síntomas observados en el paciente que puedan estar asociados a las alteraciones electrolíticas detectadas:
                    </p>

                    {getAffectedElectrolytes().map((electrolyte, index) => (
                      <div key={index} className="mb-6 p-4 border rounded-md bg-yellow-50">
                        <h5 className="font-medium text-gray-700 mb-3">
                          Síntomas de deficiencia de {electrolyte.name}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {getSymptomsList()[electrolyte.key]?.map(symptom => (
                            <div key={symptom} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`rs-${electrolyte.key}-${symptom}`}
                                checked={followUpData.refeedingSyndrome_symptoms?.[electrolyte.key]?.includes(symptom) || false}
                                onChange={() => handleRefeedingSyndromeSymptomToggle(electrolyte.key, symptom)}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`rs-${electrolyte.key}-${symptom}`} className="ml-2 text-sm text-gray-700">
                                {symptom}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Criterio de Temporalidad */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h5 className="font-medium text-blue-800 mb-3">Criterio de Temporalidad</h5>
                    <p className="text-sm text-blue-700 mb-3">
                      ¿Las alteraciones electrolíticas y/o síntomas detectados ocurrieron dentro de los 5 días posteriores 
                      al inicio o incremento sustancial del aporte nutricional?
                    </p>
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="refeedingSyndrome_temporality"
                          value="yes"
                          checked={followUpData.refeedingSyndrome_temporality === true}
                          onChange={(e) => setFollowUpData(prev => ({...prev, refeedingSyndrome_temporality: true}))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sí</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="refeedingSyndrome_temporality"
                          value="no"
                          checked={followUpData.refeedingSyndrome_temporality === false}
                          onChange={(e) => setFollowUpData(prev => ({...prev, refeedingSyndrome_temporality: false}))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>

                  {/* Botón de Cálculo */}
                  <button
                    type="button"
                    onClick={calculateRefeedingSyndromeDiagnosis}
                    disabled={followUpData.refeedingSyndrome_temporality === null || followUpData.refeedingSyndrome_temporality === undefined}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Calcular Diagnóstico de Síndrome de Realimentación
                  </button>

                  {/* Resultado del Diagnóstico */}
                  {followUpData.refeedingSyndrome_diagnosis && (
                    <div className={`mt-6 p-4 rounded-lg border-2 ${
                      followUpData.refeedingSyndrome_diagnosis.includes('SÍNDROME DE REALIMENTACIÓN') && 
                      followUpData.refeedingSyndrome_temporality 
                        ? "bg-red-50 border-red-300"
                        : followUpData.refeedingSyndrome_diagnosis.includes('No se reúne el criterio')
                        ? "bg-orange-50 border-orange-300"
                        : "bg-green-50 border-green-300"
                    }`}>
                      <h4 className="text-lg font-semibold mb-2">Diagnóstico:</h4>
                      <p className={`text-lg font-bold mb-3 ${
                        followUpData.refeedingSyndrome_diagnosis.includes('SÍNDROME DE REALIMENTACIÓN') && 
                        followUpData.refeedingSyndrome_temporality 
                          ? "text-red-700"
                          : followUpData.refeedingSyndrome_diagnosis.includes('No se reúne el criterio')
                          ? "text-orange-700"
                          : "text-green-700"
                      }`}>
                        {followUpData.refeedingSyndrome_diagnosis}
                      </p>

                      {followUpData.refeedingSyndrome_severity && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-sm font-medium text-gray-700">
                            <strong>Severidad:</strong> {followUpData.refeedingSyndrome_severity}
                          </p>
                        </div>
                      )}

                      {followUpData.refeedingSyndrome_details && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-sm text-gray-700">
                            <strong>Detalles del análisis:</strong> {followUpData.refeedingSyndrome_details}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            

             
          </form>

          {/* Módulo de Recálculo Nutricional */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <FollowUpNutritionalRecalculationModule
              followUpPatientData={followUpData}
              initialPatientData={{
                weight: previousWeight?.weight || patientBasicInfo?.weight,
                height: patientBasicInfo?.height,
                age: patientBasicInfo?.age,
                sex: patientBasicInfo?.sex,
                assessmentDate: firstAssessmentDate,
                diseasePhase: followUpData.diseasePhase,
                respiratoryStatus: followUpData.respiratoryStatus,
                nutritionRoute: followUpData.nutritionRoute,
                recentIntakePercentage: patientBasicInfo?.recentIntakePercentage,
                ...patientBasicInfo
              }}
              initialAssessmentResults={{
                refeedingSyndrome: refeedingRisk,
                generalInfo: patientBasicInfo
              }}
              onRecalculationResult={setRecalculationResults}
            />
          </div>

          {/* Módulo de Consolidación */}
          <FollowUpSummaryModule 
            followUpData={followUpData}
            onFollowUpDataChange={handleFollowUpDataChange}
            nutritionalRecalculationResults={recalculationResults}
            weightComparison={weightComparison}
            labComparison={labComparison}
            fiScoreResults={fiScoreResults}
            refeedingCalculatorResults={refeedingCalculatorResults}
            nutritionalObjectives={nutritionalObjectives}
            firstAssessmentDate={firstAssessmentDate}
            previousWeight={previousWeight}
            previousLabs={previousLabs}
            diagnosisText={diagnosisText}
            onDiagnosisTextChange={setDiagnosisText}
            planText={planText}
            onPlanTextChange={setPlanText}
          />

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <Link
              to="/valoraciones-guardadas"
              className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={handleSaveFollowUp}
              disabled={isSaving}
              className={`px-6 py-3 rounded-md font-medium text-white shadow-md transition-colors ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
              }`}
            >
              {isSaving ? 'Guardando...' : 'Guardar Valoración de Seguimiento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}