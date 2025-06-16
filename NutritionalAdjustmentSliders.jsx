
import React, { useState, useEffect } from 'react';

const NutritionalAdjustmentSliders = ({ 
  baseCalories = 0, 
  baseProtein = 0, 
  onAdjustmentChange = () => {},
  patientCondition = 'stable',
  isVisible = false,
  onClose = () => {}
}) => {
  const [caloriePercentage, setCaloriePercentage] = useState(100);
  const [proteinPercentage, setProteinPercentage] = useState(100);
  const [justification, setJustification] = useState('');

  // Resetear valores cuando se abra/cierre el componente
  useEffect(() => {
    if (isVisible) {
      setCaloriePercentage(100);
      setProteinPercentage(100);
      setJustification('');
    }
  }, [isVisible]);

  // Calcular valores ajustados en tiempo real
  const adjustedCalories = Math.round((baseCalories * caloriePercentage) / 100);
  const adjustedProtein = Math.round((baseProtein * proteinPercentage) / 100);

  // Definir rangos según condición clínica
  const getCalorieRange = () => {
    switch (patientCondition) {
      case 'critical':
      case 'refeeding_risk':
        return { min: 50, max: 80, recommended: 70 };
      case 'stable':
        return { min: 80, max: 120, recommended: 100 };
      case 'recovery':
        return { min: 100, max: 130, recommended: 110 };
      default:
        return { min: 70, max: 120, recommended: 100 };
    }
  };

  const getProteinRange = () => {
    switch (patientCondition) {
      case 'critical':
        return { min: 60, max: 100, recommended: 80 };
      case 'stable':
        return { min: 80, max: 120, recommended: 100 };
      case 'recovery':
      case 'anabolic':
        return { min: 100, max: 140, recommended: 120 };
      default:
        return { min: 80, max: 120, recommended: 100 };
    }
  };

  const calorieRange = getCalorieRange();
  const proteinRange = getProteinRange();

  // Función para obtener color según el porcentaje
  const getSliderColor = (percentage, range) => {
    if (percentage < range.min + 10) return 'bg-red-500';
    if (percentage < range.recommended - 10) return 'bg-yellow-500';
    if (percentage <= range.recommended + 10) return 'bg-green-500';
    if (percentage <= range.max - 10) return 'bg-blue-500';
    return 'bg-purple-500';
  };

  const handleApplyAdjustment = () => {
    const adjustmentData = {
      calories: {
        base: baseCalories,
        percentage: caloriePercentage,
        adjusted: adjustedCalories,
        change: adjustedCalories - baseCalories
      },
      protein: {
        base: baseProtein,
        percentage: proteinPercentage,
        adjusted: adjustedProtein,
        change: adjustedProtein - baseProtein
      },
      justification: justification,
      timestamp: new Date().toISOString(),
      appliedBy: 'manual_adjustment'
    };

    onAdjustmentChange(adjustmentData);
  };

  const handleReset = () => {
    setCaloriePercentage(100);
    setProteinPercentage(100);
    setJustification('');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-3">⚙️</span>
              Reajuste Manual de Objetivos Nutricionales
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Valores base */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-semibold text-blue-800 mb-2">📊 Valores de Referencia (100%)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Calorías Base</p>
                <p className="text-2xl font-bold text-blue-700">{baseCalories} kcal/día</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Proteínas Base</p>
                <p className="text-2xl font-bold text-emerald-700">{baseProtein} g/día</p>
              </div>
            </div>
          </div>

          {/* Controles de ajuste */}
          <div className="space-y-8">
            {/* Ajuste de Calorías */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-lg font-semibold text-orange-800">🔥 Ajuste Calórico</h5>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Porcentaje actual</p>
                  <p className="text-xl font-bold text-orange-700">{caloriePercentage}%</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{calorieRange.min}% (Mínimo)</span>
                  <span>{calorieRange.recommended}% (Recomendado)</span>
                  <span>{calorieRange.max}% (Máximo)</span>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min={calorieRange.min}
                    max={calorieRange.max}
                    value={caloriePercentage}
                    onChange={(e) => setCaloriePercentage(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, 
                        #ef4444 0%, #ef4444 ${((calorieRange.min + 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%,
                        #eab308 ${((calorieRange.min + 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%, 
                        #eab308 ${((calorieRange.recommended - 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%,
                        #22c55e ${((calorieRange.recommended - 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%, 
                        #22c55e ${((calorieRange.recommended + 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%,
                        #3b82f6 ${((calorieRange.recommended + 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%, 
                        #3b82f6 ${((calorieRange.max - 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%,
                        #8b5cf6 ${((calorieRange.max - 10 - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%, 
                        #8b5cf6 100%)`
                    }}
                  />
                  
                  {/* Marcadores de referencia */}
                  <div className="absolute top-0 w-full h-3 pointer-events-none">
                    <div 
                      className="absolute w-1 h-3 bg-gray-800"
                      style={{ left: `${((calorieRange.recommended - calorieRange.min) / (calorieRange.max - calorieRange.min)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded border">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Valor Ajustado</p>
                    <p className="text-xl font-bold text-orange-700">{adjustedCalories} kcal/día</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Diferencia</p>
                    <p className={`text-xl font-bold ${adjustedCalories - baseCalories >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {adjustedCalories - baseCalories >= 0 ? '+' : ''}{adjustedCalories - baseCalories} kcal
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className={`text-sm font-semibold ${
                      caloriePercentage < calorieRange.min + 10 ? 'text-red-600' :
                      caloriePercentage < calorieRange.recommended - 10 ? 'text-yellow-600' :
                      caloriePercentage <= calorieRange.recommended + 10 ? 'text-green-600' :
                      caloriePercentage <= calorieRange.max - 10 ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {caloriePercentage < calorieRange.min + 10 ? 'Muy Bajo' :
                       caloriePercentage < calorieRange.recommended - 10 ? 'Bajo' :
                       caloriePercentage <= calorieRange.recommended + 10 ? 'Óptimo' :
                       caloriePercentage <= calorieRange.max - 10 ? 'Alto' : 'Muy Alto'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ajuste de Proteínas */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-lg font-semibold text-emerald-800">🥩 Ajuste Proteico</h5>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Porcentaje actual</p>
                  <p className="text-xl font-bold text-emerald-700">{proteinPercentage}%</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{proteinRange.min}% (Mínimo)</span>
                  <span>{proteinRange.recommended}% (Recomendado)</span>
                  <span>{proteinRange.max}% (Máximo)</span>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min={proteinRange.min}
                    max={proteinRange.max}
                    value={proteinPercentage}
                    onChange={(e) => setProteinPercentage(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, 
                        #ef4444 0%, #ef4444 ${((proteinRange.min + 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%,
                        #eab308 ${((proteinRange.min + 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%, 
                        #eab308 ${((proteinRange.recommended - 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%,
                        #22c55e ${((proteinRange.recommended - 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%, 
                        #22c55e ${((proteinRange.recommended + 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%,
                        #3b82f6 ${((proteinRange.recommended + 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%, 
                        #3b82f6 ${((proteinRange.max - 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%,
                        #8b5cf6 ${((proteinRange.max - 10 - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%, 
                        #8b5cf6 100%)`
                    }}
                  />
                  
                  {/* Marcadores de referencia */}
                  <div className="absolute top-0 w-full h-3 pointer-events-none">
                    <div 
                      className="absolute w-1 h-3 bg-gray-800"
                      style={{ left: `${((proteinRange.recommended - proteinRange.min) / (proteinRange.max - proteinRange.min)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded border">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Valor Ajustado</p>
                    <p className="text-xl font-bold text-emerald-700">{adjustedProtein} g/día</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Diferencia</p>
                    <p className={`text-xl font-bold ${adjustedProtein - baseProtein >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {adjustedProtein - baseProtein >= 0 ? '+' : ''}{adjustedProtein - baseProtein} g
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className={`text-sm font-semibold ${
                      proteinPercentage < proteinRange.min + 10 ? 'text-red-600' :
                      proteinPercentage < proteinRange.recommended - 10 ? 'text-yellow-600' :
                      proteinPercentage <= proteinRange.recommended + 10 ? 'text-green-600' :
                      proteinPercentage <= proteinRange.max - 10 ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {proteinPercentage < proteinRange.min + 10 ? 'Muy Bajo' :
                       proteinPercentage < proteinRange.recommended - 10 ? 'Bajo' :
                       proteinPercentage <= proteinRange.recommended + 10 ? 'Óptimo' :
                       proteinPercentage <= proteinRange.max - 10 ? 'Alto' : 'Muy Alto'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Justificación clínica */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h5 className="text-lg font-semibold text-gray-800 mb-3">📝 Justificación Clínica</h5>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describa la razón clínica para este ajuste (ej: paciente en fase aguda temprana, requiere progresión gradual por riesgo de realimentación...)"
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows="4"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  Resetear a 100%
                </button>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyAdjustment}
                  disabled={!justification.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionalAdjustmentSliders;
