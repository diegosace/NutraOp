import React, { useState, useEffect, useMemo, useCallback } from 'react';
import NutritionalAdjustmentSliders from './NutritionalAdjustmentSliders';

// Componente para mostrar el plan de realimentación cuando hay alto riesgo
const RefeedingSyndromeNutritionalPlan = ({ currentWeight, nonNutritionalCalories, followUpNeedsResults }) => {
  const [selectedDay, setSelectedDay] = useState('day1-3');

  const refeedingPlan = useMemo(() => {
    const baseCalories = currentWeight * 25; // Estimación base simple

    return {
      'day1-3': {
        label: 'Día 1-3: Inicio Muy Cauteloso',
        calories: Math.round(baseCalories * 0.5),
        protein: Math.round(currentWeight * 0.8),
        description: 'Inicio con 50% de requerimientos estimados',
        monitoring: ['Electrolitos cada 12h', 'Fosfato, magnesio, potasio', 'Signos neurológicos']
      },
      'day4-6': {
        label: 'Día 4-6: Progresión Gradual',
        calories: Math.round(baseCalories * 0.75),
        protein: Math.round(currentWeight * 1.0),
        description: 'Aumento gradual al 75% si estable',
        monitoring: ['Electrolitos diarios', 'Función cardíaca', 'Edema']
      },
      'day7-10': {
        label: 'Día 7-10: Objetivo Completo',
        calories: Math.round(baseCalories * 1.0),
        protein: Math.round(currentWeight * 1.3),
        description: 'Objetivo nutricional completo si tolera',
        monitoring: ['Electrolitos cada 48h', 'Ganancia de peso', 'Función orgánica']
      }
    };
  }, [currentWeight]);

  const currentPlan = refeedingPlan[selectedDay];
  const adjustedCalories = Math.max(0, currentPlan.calories - nonNutritionalCalories);

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h5 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
          ⚠️ Plan de Inicio y Progresión para Síndrome de Realimentación
        </h5>
        <p className="text-sm text-red-700 mb-3">
          <strong>ALTO RIESGO detectado.</strong> Se requiere inicio cauteloso y progresión gradual 
          con monitorización estricta de electrolitos y signos clínicos.
        </p>
      </div>

      <div className="flex space-x-2 mb-4">
        {Object.entries(refeedingPlan).map(([key, plan]) => (
          <button
            key={key}
            onClick={() => setSelectedDay(key)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              selectedDay === key
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {plan.label.split(':')[0]}
          </button>
        ))}
      </div>

      <div className="bg-white border border-red-200 rounded-lg p-4">
        <h6 className="font-semibold text-red-800 mb-2">{currentPlan.label}</h6>
        <p className="text-sm text-gray-600 mb-3">{currentPlan.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-orange-50 p-3 rounded border border-orange-200">
            <h7 className="font-medium text-orange-800">Objetivo Calórico</h7>
            <p className="text-2xl font-bold text-orange-700">{currentPlan.calories} kcal/día</p>
            {nonNutritionalCalories > 0 && (
              <div className="mt-2 text-sm">
                <p className="text-orange-600">Calorías no nutricionales: -{nonNutritionalCalories} kcal</p>
                <p className="font-medium text-orange-800">Aporte nutricional: {adjustedCalories} kcal/día</p>
              </div>
            )}
          </div>

          <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
            <h7 className="font-medium text-emerald-800">Objetivo Proteico</h7>
            <p className="text-2xl font-bold text-emerald-700">{currentPlan.protein} g/día</p>
            <p className="text-sm text-emerald-600">
              {(currentPlan.protein / currentWeight).toFixed(1)} g/kg/día
            </p>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <h7 className="font-medium text-blue-800 mb-2">Monitorización Requerida:</h7>
          <ul className="text-sm text-blue-700 space-y-1">
            {currentPlan.monitoring.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <h7 className="font-medium text-yellow-800 mb-2">⚠️ Precauciones Adicionales:</h7>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Suplementar inmediatamente: tiamina, complejo B, fósforo, magnesio</li>
          <li>• Monitorización cardíaca continua si disponible</li>
          <li>• Evaluar función renal y balance hídrico</li>
          <li>• Suspender progresión ante cualquier signo de intolerancia</li>
          <li>• Considerar inicio de realimentación solo cuando paciente esté estable</li>
        </ul>
      </div>
    </div>
  );
};

// Calculadora de calorías adaptada para seguimiento
const FollowUpAdvancedCaloriesCalculator = ({ onCaloriesResult, followUpData = {}, firstAssessmentData = {} }) => {
  const [formulaChoice, setFormulaChoice] = useState('mifflin');
  const [anthropometricData, setAnthropometricData] = useState({
    gender: firstAssessmentData.sex || 'male',
    weight: followUpData.followUp_currentWeight || '',
    height: firstAssessmentData.height || '',
    age: firstAssessmentData.age || '',
  });
  const [activityLevel, setActivityLevel] = useState('1.2');
  const [clinicalCondition, setClinicalCondition] = useState('none');
  const [surgeryType, setSurgeryType] = useState('minor');
  const [infectionSeverity, setInfectionSeverity] = useState('mild');
  const [traumaType, setTraumaType] = useState('skeletal_mild');
  const [burnsSct, setBurnsSct] = useState('');
  const [feverTemp, setFeverTemp] = useState(followUpData.bodyTemperature || '');
  const [hospitalActivityFactor, setHospitalActivityFactor] = useState('1.0');
  const [altitude, setAltitude] = useState('');
  const [etco2, setEtco2] = useState('');
  const [volumenMinuto, setVolumenMinuto] = useState('');
  const [temperaturaCorporalWeir, setTemperaturaCorporalWeir] = useState(followUpData.bodyTemperature || '37');
  const [estimatedPb, setEstimatedPb] = useState(null);
  const [showInfusions, setShowInfusions] = useState(true);
  const [propofolRate, setPropofolRate] = useState(followUpData.followUp_propofol_rate || '');
  const [propofolDuration, setPropofolDuration] = useState(followUpData.followUp_propofol_duration || '');
  const [dextroseConcentration, setDextroseConcentration] = useState(followUpData.followUp_dextrose_concentration || '');
  const [dextroseVolume, setDextroseVolume] = useState(followUpData.followUp_dextrose_volume || '');
  const [results, setResults] = useState([]);
  const [averageBasal, setAverageBasal] = useState(null);
  const [errors, setErrors] = useState({});

  // Actualizar datos antropométricos cuando cambien las props
  useEffect(() => {
    setAnthropometricData(prev => ({
      ...prev,
      gender: firstAssessmentData.sex || prev.gender || 'male',
      weight: followUpData.followUp_currentWeight || prev.weight || '',
      height: firstAssessmentData.height || prev.height || '',
      age: firstAssessmentData.age || prev.age || '',
    }));
  }, [firstAssessmentData, followUpData.followUp_currentWeight]);

  // Actualizar temperatura cuando cambie en followUpData
  useEffect(() => {
    if (followUpData.bodyTemperature) {
      setFeverTemp(followUpData.bodyTemperature);
      setTemperaturaCorporalWeir(followUpData.bodyTemperature);
    }
  }, [followUpData.bodyTemperature]);

  // Auto-llenar datos de infusiones no nutricionales desde followUpData
  useEffect(() => {
    if (followUpData.hasPropofol) {
      setPropofolRate(followUpData.followUp_propofol_rate || '');
      setPropofolDuration(followUpData.followUp_propofol_duration || '');
    } else {
      setPropofolRate('');
      setPropofolDuration('');
    }

    if (followUpData.hasDextrose) {
      setDextroseConcentration(followUpData.followUp_dextrose_concentration || '');
      setDextroseVolume(followUpData.followUp_dextrose_volume || '');
    } else {
      setDextroseConcentration('');
      setDextroseVolume('');
    }
  }, [
    followUpData.hasPropofol, 
    followUpData.followUp_propofol_rate, 
    followUpData.followUp_propofol_duration,
    followUpData.hasDextrose, 
    followUpData.followUp_dextrose_concentration, 
    followUpData.followUp_dextrose_volume
  ]);

  const showForFormulas = (formulaList) => formulaList.includes(formulaChoice);
  const isMifflinClinicalActive = useCallback(() => {
    return clinicalCondition !== 'none' || feverTemp !== '' || hospitalActivityFactor !== '1.0';
  }, [clinicalCondition, feverTemp, hospitalActivityFactor]);

  // Cálculo de presión barométrica basado en altitud
  useEffect(() => {
    const alt = parseFloat(altitude);
    if (altitude === '' || isNaN(alt)) {
      setEstimatedPb(760);
      return;
    }
    try {
      const P0_PASCALS = 101325;
      const LAPSE_RATE = 0.0065;
      const T0_KELVIN = 288.15;
      const GRAVITY = 9.80665;
      const MOLAR_MASS_AIR = 0.0289644;
      const GAS_CONSTANT = 8.31447;
      const term_Lh_T0 = (LAPSE_RATE * alt) / T0_KELVIN;
      if (term_Lh_T0 >= 1) {
        setEstimatedPb(null);
        return;
      }
      const base = (1 - term_Lh_T0);
      const exponent = (GRAVITY * MOLAR_MASS_AIR) / (GAS_CONSTANT * LAPSE_RATE);
      const pressurePascals = P0_PASCALS * Math.pow(base, exponent);
      setEstimatedPb(pressurePascals * 0.00750062);
    } catch (e) {
      setEstimatedPb(null);
    }
  }, [altitude]);

  // Funciones de cálculo
  const mifflinBMR = (g, w, h, a) => (g === 'male' ? (10 * w) + (6.25 * h) - (5 * a) + 5 : (10 * w) + (6.25 * h) - (5 * a) - 161);
  const harrisBMR = (g, w, h, a) => (g === 'male' ? 66.4730 + (13.7516 * w) + (5.0033 * h) - (6.7550 * a) : 655.0955 + (9.5634 * w) + (1.8496 * h) - (4.6756 * a));
  const simpleKcalKgREE = w => w * 25;
  const calculateGETD = (bmr_ree, activityF) => bmr_ree * activityF;

  const calculateWeirEtCO2REE = (pb, etco2_val, ve_val, temp_val) => {
    if (pb === null || isNaN(pb) || pb <= 0 || isNaN(etco2_val) || isNaN(ve_val) || isNaN(temp_val)) 
      return { vco2: NaN, ree: NaN, ph2o: NaN, pb_used: pb };

    const A = 8.07131, B = 1730.63, C = 233.426;
    const PH2O = Math.pow(10, A - (B / (C + temp_val)));
    if (pb <= PH2O) {
      console.error("PB estimada es <= PH2O.");
      return { vco2: NaN, ree: NaN, ph2o: PH2O, pb_used: pb };
    }
    const FECO2 = etco2_val / (pb - PH2O);
    const VCO2_ml_min = FECO2 * ve_val * 1000;
    const ree_kcal_day = VCO2_ml_min * 8.19;
    return { vco2: VCO2_ml_min, ree: ree_kcal_day, ph2o: PH2O, pb_used: pb };
  };

  const calculateInfusionCalories = () => {
    let totalCalories = 0;

    // Propofol
    if (propofolRate && propofolDuration) {
      const rate = parseFloat(propofolRate);
      const duration = parseFloat(propofolDuration);
      if (!isNaN(rate) && !isNaN(duration)) {
        totalCalories += rate * duration * 1.1; // 1.1 kcal/mL
      }
    }

    // Dextrosa
    if (dextroseConcentration && dextroseVolume) {
      const concentration = parseFloat(dextroseConcentration);
      const volume = parseFloat(dextroseVolume);
      if (!isNaN(concentration) && !isNaN(volume)) {
        totalCalories += (concentration / 100) * volume * 3.4; // 3.4 kcal/g
      }
    }

    return Math.round(totalCalories);
  };

  const handleSubmit = () => {
    setResults([]);
    setAverageBasal(null);
    let newErrors = {};

    const { gender, weight, height, age } = anthropometricData;
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);

    if (showForFormulas(['mifflin', 'harris', 'simple_kcal_kg', 'compare_mh', 'compare_mhw', 'compare_all_four'])) {
      if (isNaN(w) || w <= 0) newErrors.weight = "Peso inválido";
    }
    if (showForFormulas(['mifflin', 'harris', 'compare_mh', 'compare_mhw', 'compare_all_four'])) {
      if (isNaN(h) || h <= 0) newErrors.height = "Altura inválida (asegúrese de que esté registrada en la valoración inicial)";
      if (isNaN(a) || a <= 0 || a > 120) newErrors.age = "Edad inválida (asegúrese de que esté registrada en la valoración inicial)";
    }
    if (showForFormulas(['weir_etco2', 'compare_mhw', 'compare_all_four'])) {
      const etco2_val = parseFloat(etco2);
      const ve_val = parseFloat(volumenMinuto);
      const temp_weir_val = parseFloat(temperaturaCorporalWeir);
      if (isNaN(etco2_val) || etco2_val < 0) newErrors.etco2 = "EtCO2 inválido";
      if (isNaN(ve_val) || ve_val < 0) newErrors.volumenMinuto = "VE inválido";
      if (isNaN(temp_weir_val) || temp_weir_val < 30 || temp_weir_val > 45) newErrors.temperaturaCorporalWeir = "Temperatura inválida";
      if (altitude !== '' && isNaN(parseFloat(altitude))) newErrors.altitude = "Altitud inválida";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    let calculatedResults = [];
    let basalValuesForAverage = [];
    const infusionCalories = calculateInfusionCalories();

    if (showForFormulas(['mifflin', 'compare_mh', 'compare_mhw', 'compare_all_four'])) {
      const bmr = mifflinBMR(gender, w, h, a);
      let tdee = bmr;
      let details = `Factor Act. General: ${activityLevel}`;

      if (isMifflinClinicalActive()) {
        let clinicalFactor = 1.0;
        let feverFactorCalc = 1.0;
        details = "Ajustes Clínicos: ";

        if (clinicalCondition !== 'none') {
          if (clinicalCondition === 'surgery') clinicalFactor *= { minor: 1.1, major_elective: 1.2, major_complicated: 1.35 }[surgeryType];
          if (clinicalCondition === 'infection') clinicalFactor *= { mild: 1.15, moderate: 1.3, severe: 1.45 }[infectionSeverity];
          if (clinicalCondition === 'trauma') clinicalFactor *= { skeletal_mild: 1.15, head_injury: 1.45, polytrauma: 1.35 }[traumaType];
          if (clinicalCondition === 'cancer') clinicalFactor *= 1.27;
          if (clinicalCondition === 'burns') {
            const sct = parseFloat(burnsSct);
            if (!isNaN(sct) && sct >= 0 && sct <= 100) {
              clinicalFactor *= sct > 40 ? 1.9 : (sct >= 20 ? 1.65 : (sct > 0 ? 1.3 : 1.0));
            } else {
              newErrors.burnsSct = "SCT quemada inválida";
            }
          }
          details += `Condición (${clinicalCondition}) Factor: ${clinicalFactor.toFixed(2)}. `;
        }

        const tempF = parseFloat(feverTemp);
        if (!isNaN(tempF) && tempF > 37 && tempF >= 30 && tempF <= 45) {
          feverFactorCalc = 1 + (0.10 * (tempF - 37));
          details += `Fiebre (${tempF}°C) Factor: ${feverFactorCalc.toFixed(2)}. `;
        }

        const hospActFactor = parseFloat(hospitalActivityFactor);
        details += `Act. Hosp.: ${hospActFactor}.`;
        tdee = bmr * clinicalFactor * feverFactorCalc * hospActFactor;
      } else {
        tdee = calculateGETD(bmr, parseFloat(activityLevel));
      }

      calculatedResults.push({
        name: 'Mifflin-St Jeor',
        tmb: Math.round(bmr),
        getd: Math.round(tdee),
        details,
        original_getd: Math.round(tdee),
        adjusted_getd: Math.round(tdee - infusionCalories),
        infusionCalories
      });
      basalValuesForAverage.push(bmr);
    }

    if (showForFormulas(['harris', 'compare_mh', 'compare_mhw', 'compare_all_four'])) {
      const bmr = harrisBMR(gender, w, h, a);
      const tdee = calculateGETD(bmr, parseFloat(activityLevel));
      calculatedResults.push({
        name: 'Harris-Benedict',
        tmb: Math.round(bmr),
        getd: Math.round(tdee),
        details: `Factor Act. General: ${activityLevel}`,
        original_getd: Math.round(tdee),
        adjusted_getd: Math.round(tdee - infusionCalories),
        infusionCalories
      });
      basalValuesForAverage.push(bmr);
    }

    if (showForFormulas(['simple_kcal_kg', 'compare_all_four'])) {
      const ree = simpleKcalKgREE(w);
      calculatedResults.push({
        name: `Simple (25 kcal/kg)`,
        ree: Math.round(ree),
        original_ree: Math.round(ree),
        adjusted_ree: Math.round(ree - infusionCalories),
        infusionCalories
      });
      basalValuesForAverage.push(ree);
    }

    if (showForFormulas(['weir_etco2', 'compare_mhw', 'compare_all_four'])) {
      const etco2_val = parseFloat(etco2);
      const ve_val = parseFloat(volumenMinuto);
      const temp_weir_val = parseFloat(temperaturaCorporalWeir);
      const pbToUse = estimatedPb !== null ? estimatedPb : 760;
      const weirData = calculateWeirEtCO2REE(pbToUse, etco2_val, ve_val, temp_weir_val);

      if (!isNaN(weirData.ree)) {
        calculatedResults.push({
          name: 'Weir (EtCO2/VE)',
          ree: Math.round(weirData.ree),
          original_ree: Math.round(weirData.ree),
          adjusted_ree: Math.round(weirData.ree - infusionCalories),
          details: `VCO2: ${weirData.vco2.toFixed(1)} mL/min, PB: ${weirData.pb_used.toFixed(1)} mmHg, PH2O: ${weirData.ph2o.toFixed(1)} mmHg`,
          infusionCalories
        });
        basalValuesForAverage.push(weirData.ree);
      } else {
        calculatedResults.push({
          name: 'Weir (EtCO2/VE)',
          error: "Error en cálculo de Weir. Verifique datos."
        });
      }
    }

    setResults(calculatedResults);

    if (showForFormulas(['compare_mh', 'compare_mhw', 'compare_all_four']) && basalValuesForAverage.length > 0) {
      const sum = basalValuesForAverage.reduce((acc, val) => acc + val, 0);
      setAverageBasal(Math.round(sum / basalValuesForAverage.length));
    }

    if (onCaloriesResult && calculatedResults.length > 0) {
      const primaryResult = calculatedResults[0];
      const caloriesResult = {
        formula: formulaChoice,
        tmb: primaryResult.tmb,
        get: primaryResult.getd || primaryResult.ree,
        adjusted_get: primaryResult.adjusted_getd || primaryResult.adjusted_ree,
        infusionCalories,
        details: primaryResult,
        allResults: calculatedResults,
        averageBasal: averageBasal,
      };

      onCaloriesResult(caloriesResult);
    }
  };

  const commonInputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-sm";
  const commonLabelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md animate-fadeIn border border-gray-200">
      <h3 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-2">
        Recálculo de Gasto Energético
      </h3>
      <p className="text-xs text-center text-gray-500 mb-4">
        Calculadora adaptada para seguimiento nutricional usando datos actuales.
      </p>

      <div id="bmr-form-react" className="space-y-4">
        <div>
          <label htmlFor="formula-choice" className={commonLabelClass}>
            Fórmula a utilizar:
          </label>
          <select 
            id="formula-choice" 
            name="formula-choice" 
            value={formulaChoice} 
            onChange={(e) => { 
              setFormulaChoice(e.target.value); 
              setResults([]); 
              setAverageBasal(null); 
              setErrors({});
            }} 
            className={commonInputClass}
          >
            <option value="mifflin">Mifflin-St Jeor (TMB/GETD)</option>
            <option value="harris">Harris-Benedict (TMB/GETD)</option>
            <option value="weir_etco2">Fórmula de Weir (EtCO2/VE) (REE)</option>
            <option value="simple_kcal_kg">Simple (25 kcal/kg) (REE)</option>
            <option value="compare_mh">Comparar Mifflin y Harris</option>
            <option value="compare_mhw">Comparar Mifflin, Harris y Weir</option>
            <option value="compare_all_four">Comparar y Promediar Todas</option>
          </select>
        </div>

        {showForFormulas(['mifflin', 'harris', 'simple_kcal_kg', 'compare_mh', 'compare_mhw', 'compare_all_four']) && (
          <div className="space-y-3 p-3 border rounded-md bg-slate-50">
            <h4 className="text-md font-semibold text-slate-700">Datos Antropométricos</h4>
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p><strong>Datos desde seguimiento:</strong> Peso actual ({anthropometricData.weight || 'N/A'} kg), Temperatura ({feverTemp || 'N/A'}°C)</p>
              <p><strong>Datos desde valoración inicial:</strong> Altura, edad, sexo</p>
            </div>

            {showForFormulas(['mifflin', 'harris', 'compare_mh', 'compare_mhw', 'compare_all_four']) && (
              <div>
                <label htmlFor="adv-gender" className={commonLabelClass}>Género:</label>
                <input 
                  type="text"
                  value={anthropometricData.gender === 'male' ? 'Hombre' : 'Mujer'}
                  readOnly
                  className={`${commonInputClass} bg-gray-100 cursor-not-allowed`}
                />
              </div>
            )}

            <div>
              <label htmlFor="adv-weight" className={commonLabelClass}>Peso Actual (kg):</label>
              <input 
                type="number" 
                id="adv-weight" 
                name="weight" 
                value={anthropometricData.weight} 
                onChange={(e) => setAnthropometricData(p => ({...p, weight: e.target.value}))} 
                placeholder="Peso del seguimiento" 
                min="1" 
                step="0.1" 
                className={commonInputClass}
              />
              {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
            </div>

            {showForFormulas(['mifflin', 'harris', 'compare_mh', 'compare_mhw', 'compare_all_four']) && (
              <>
                <div>
                  <label htmlFor="adv-height" className={commonLabelClass}>Altura (cm):</label>
                  <input 
                    type="text"
                    value={`${anthropometricData.height} cm (desde valoración inicial)`}
                    readOnly
                    className={`${commonInputClass} bg-gray-100 cursor-not-allowed`}
                  />
                  {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
                </div>
                <div>
                  <label htmlFor="adv-age" className={commonLabelClass}>Edad (años):</label>
                  <input 
                    type="text"
                    value={`${anthropometricData.age} años (desde valoración inicial)`}
                    readOnly
                    className={`${commonInputClass} bg-gray-100 cursor-not-allowed`}
                  />
                  {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {showForFormulas(['mifflin', 'harris', 'compare_mh', 'compare_mhw', 'compare_all_four']) && !isMifflinClinicalActive() && (
          <div className="mt-3">
            <label htmlFor="adv-activity-level" className={commonLabelClass}>
              Nivel de Actividad Física (General):
            </label>
            <select 
              id="adv-activity-level" 
              name="activity-level" 
              value={activityLevel} 
              onChange={(e)=>setActivityLevel(e.target.value)} 
              className={commonInputClass}
            >
              <option value="1.2">Sedentario (1.2)</option>
              <option value="1.375">Act. Ligera (1.375)</option>
              <option value="1.55">Act. Moderada (1.55)</option>
              <option value="1.725">Act. Intensa (1.725)</option>
              <option value="1.9">Act. Muy Intensa (1.9)</option>
            </select>
          </div>
        )}

        {showForFormulas(['mifflin', 'compare_mh', 'compare_mhw', 'compare_all_four']) && (
          <div className="clinical-section space-y-3">
            <h3 className="text-md font-semibold">Ajustes Clínicos para Mifflin-St Jeor (Opcional)</h3>
            <div>
              <label htmlFor="clinical-condition" className={commonLabelClass}>
                Condición Clínica Principal:
              </label>
              <select 
                id="clinical-condition" 
                value={clinicalCondition} 
                onChange={(e)=>setClinicalCondition(e.target.value)} 
                className={commonInputClass}
              >
                <option value="none">Ninguna</option>
                <option value="surgery">Cirugía</option>
                <option value="infection">Infección/Sepsis</option>
                <option value="trauma">Traumatismo</option>
                <option value="burns">Quemaduras</option>
                <option value="cancer">Cáncer</option>
              </select>
            </div>

            {clinicalCondition === 'surgery' && (
              <div>
                <label htmlFor="surgery-type" className={commonLabelClass}>Tipo de Cirugía:</label>
                <select 
                  id="surgery-type" 
                  value={surgeryType} 
                  onChange={(e)=>setSurgeryType(e.target.value)} 
                  className={commonInputClass}
                >
                  <option value="minor">Menor (~1.1)</option>
                  <option value="major_elective">Mayor Electiva (~1.2)</option>
                  <option value="major_complicated">Mayor Complicada/Sepsis (~1.35)</option>
                </select>
              </div>
            )}

            {clinicalCondition === 'infection' && (
              <div>
                <label htmlFor="infection-severity" className={commonLabelClass}>Gravedad de Infección:</label>
                <select 
                  id="infection-severity" 
                  value={infectionSeverity} 
                  onChange={(e)=>setInfectionSeverity(e.target.value)} 
                  className={commonInputClass}
                >
                  <option value="mild">Leve (~1.15)</option>
                  <option value="moderate">Moderada (~1.3)</option>
                  <option value="severe">Grave/Sepsis (~1.45)</option>
                </select>
              </div>
            )}

            {clinicalCondition === 'trauma' && (
              <div>
                <label htmlFor="trauma-type" className={commonLabelClass}>Tipo de Traumatismo:</label>
                <select 
                  id="trauma-type" 
                  value={traumaType} 
                  onChange={(e)=>setTraumaType(e.target.value)} 
                  className={commonInputClass}
                >
                  <option value="skeletal_mild">Esquelético Leve (~1.15)</option>
                  <option value="head_injury">Craneoencefálico (~1.45)</option>
                  <option value="polytrauma">Politraumatismo (~1.35)</option>                </select>
              </div>
            )}

            {clinicalCondition === 'burns' && (
              <div>
                <label htmlFor="burns-sct" className={commonLabelClass}>% SCT Quemada:</label>
                <input 
                  type="number" 
                  id="burns-sct" 
                  value={burnsSct} 
                  onChange={(e)=>setBurnsSct(e.target.value)} 
                  placeholder="Ej: 30" 
                  min="0" 
                  max="100" 
                  className={commonInputClass}
                />
                {errors.burnsSct && <p className="text-red-500 text-xs mt-1">{errors.burnsSct}</p>}
              </div>
            )}

            <div>
              <label htmlFor="adv-fever-temp" className={commonLabelClass}>
                Temperatura Corporal Actual (°C):
              </label>
              <input 
                type="number" 
                id="adv-fever-temp" 
                value={feverTemp} 
                onChange={(e)=>setFeverTemp(e.target.value)} 
                placeholder="Desde datos de seguimiento" 
                min="30" 
                max="45" 
                step="0.1" 
                className={commonInputClass}
              />
              {errors.feverTemp && <p className="text-red-500 text-xs mt-1">{errors.feverTemp}</p>}
            </div>

            <div>
              <label htmlFor="hospital-activity-factor" className={commonLabelClass}>
                Factor de Actividad Hospitalaria:
              </label>
              <select 
                id="hospital-activity-factor" 
                value={hospitalActivityFactor} 
                onChange={(e)=>setHospitalActivityFactor(e.target.value)} 
                className={commonInputClass}
              >
                <option value="1.0">Ninguno (1.0)</option>
                <option value="1.05">Reposo Estricto (~1.05)</option>
                <option value="1.15">Act. Ligera Cama/Hab. (~1.15)</option>
              </select>
            </div>

            {isMifflinClinicalActive() && (
              <p className="text-xs text-gray-500 mt-1">
                Factor de Actividad General se ignora si se usan ajustes clínicos.
              </p>
            )}
          </div>
        )}

        {showForFormulas(['weir_etco2', 'compare_mhw', 'compare_all_four']) && (
          <div className="clinical-section space-y-3">
            <h3 className="text-md font-semibold">Datos para Fórmula de Weir (EtCO2/VE)</h3>
            <div>
              <label htmlFor="adv-altitude" className={commonLabelClass}>Altitud (metros):</label>
              <input 
                type="number" 
                id="adv-altitude" 
                value={altitude} 
                onChange={(e)=>setAltitude(e.target.value)} 
                placeholder="Ej: 0 (nivel del mar)" 
                step="any" 
                className={commonInputClass}
              />
              {errors.altitude && <p className="text-red-500 text-xs mt-1">{errors.altitude}</p>}
              <p className="text-xs text-gray-500 mt-1">
                PB Estimada: {estimatedPb !== null ? `${estimatedPb.toFixed(1)} mmHg` : 'Calculando...'}
              </p>
            </div>
            <div>
              <label htmlFor="adv-etco2" className={commonLabelClass}>EtCO2 (mmHg):</label>
              <input 
                type="number" 
                id="adv-etco2" 
                value={etco2} 
                onChange={(e)=>setEtco2(e.target.value)} 
                placeholder="Ej: 35" 
                min="0" 
                step="0.1" 
                className={commonInputClass}
              />
              {errors.etco2 && <p className="text-red-500 text-xs mt-1">{errors.etco2}</p>}
            </div>
            <div>
              <label htmlFor="adv-volumenMinuto" className={commonLabelClass}>
                Volumen Minuto Espirado (VE) (L/min):
              </label>
              <input 
                type="number" 
                id="adv-volumenMinuto" 
                value={volumenMinuto} 
                onChange={(e)=>setVolumenMinuto(e.target.value)} 
                placeholder="Ej: 6.0" 
                min="0" 
                step="0.1" 
                className={commonInputClass}
              />
              {errors.volumenMinuto && <p className="text-red-500 text-xs mt-1">{errors.volumenMinuto}</p>}
            </div>
            <div>
              <label htmlFor="adv-temperaturaCorporalWeir" className={commonLabelClass}>
                Temperatura Corporal (°C) (para Weir):
              </label>
              <input 
                type="number" 
                id="adv-temperaturaCorporalWeir" 
                value={temperaturaCorporalWeir} 
                onChange={(e)=>setTemperaturaCorporalWeir(e.target.value)} 
                placeholder="Desde datos de seguimiento" 
                min="30" 
                max="45" 
                step="0.1" 
                className={commonInputClass}
              />
              {errors.temperaturaCorporalWeir && <p className="text-red-500 text-xs mt-1">{errors.temperaturaCorporalWeir}</p>}
            </div>
          </div>
        )}

        {showInfusions && (
          <div className="infusion-section space-y-3">
            <h3 className="text-md font-semibold">Calorías de Infusiones No Nutricionales</h3>
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
              <p><strong>✅ Datos cargados automáticamente:</strong> Los valores de propofol y dextrosa se han tomado automáticamente desde los datos ingresados en el formulario de seguimiento. Puede modificarlos si es necesario.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="propofol-rate" className={commonLabelClass}>Propofol - Velocidad (mL/h):</label>
                <input 
                  type="number" 
                  id="propofol-rate" 
                  value={propofolRate} 
                  onChange={(e)=>setPropofolRate(e.target.value)} 
                  placeholder="Auto-cargado desde seguimiento" 
                  min="0" 
                  step="0.1" 
                  className={`${commonInputClass} ${propofolRate ? 'bg-green-50 border-green-300' : ''}`}
                />
                {propofolRate && (
                  <p className="text-xs text-green-600 mt-1">✅ Valor cargado automáticamente del seguimiento</p>
                )}
              </div>
              <div>
                <label htmlFor="propofol-duration" className={commonLabelClass}>Propofol - Duración (h):</label>
                <input 
                  type="number" 
                  id="propofol-duration" 
                  value={propofolDuration} 
                  onChange={(e)=>setPropofolDuration(e.target.value)} 
                  placeholder="Auto-cargado desde seguimiento" 
                  min="0" 
                  step="0.1" 
                  className={`${commonInputClass} ${propofolDuration ? 'bg-green-50 border-green-300' : ''}`}
                />
                {propofolDuration && (
                  <p className="text-xs text-green-600 mt-1">✅ Valor cargado automáticamente del seguimiento</p>
                )}
              </div>
              <div>
                <label htmlFor="dextrose-concentration" className={commonLabelClass}>Dextrosa - Concentración (%):</label>
                <input 
                  type="number" 
                  id="dextrose-concentration" 
                  value={dextroseConcentration} 
                  onChange={(e)=>setDextroseConcentration(e.target.value)} 
                  placeholder="Auto-cargado desde seguimiento" 
                  min="0" 
                  max="100" 
                  step="0.1" 
                  className={`${commonInputClass} ${dextroseConcentration ? 'bg-green-50 border-green-300' : ''}`}
                />
                {dextroseConcentration && (
                  <p className="text-xs text-green-600 mt-1">✅ Valor cargado automáticamente del seguimiento</p>
                )}
              </div>
              <div>
                <label htmlFor="dextrose-volume" className={commonLabelClass}>Dextrosa - Volumen (mL/día):</label>
                <input 
                  type="number" 
                  id="dextrose-volume" 
                  value={dextroseVolume} 
                  onChange={(e)=>setDextroseVolume(e.target.value)} 
                  placeholder="Auto-cargado desde seguimiento" 
                  min="0" 
                  step="1" 
                  className={`${commonInputClass} ${dextroseVolume ? 'bg-green-50 border-green-300' : ''}`}
                />
                {dextroseVolume && (
                  <p className="text-xs text-green-600 mt-1">✅ Valor cargado automáticamente del seguimiento</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-medium text-blue-800">
                Calorías Estimadas de Infusiones: {calculateInfusionCalories()} kcal/día
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Se descontarán automáticamente del gasto energético total calculado para obtener las necesidades nutricionales netas.
              </p>
              {calculateInfusionCalories() > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Valores tomados automáticamente del formulario de seguimiento
                </p>
              )}
            </div>
          </div>
        )}

        <button 
          type="button" 
          onClick={handleSubmit} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          Recalcular Gasto Energético
        </button>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
          <p className="font-semibold mb-1">Por favor, corrija los siguientes errores:</p>
          <ul className="list-disc list-inside">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-indigo-800 mb-3 text-center">
            Resultados Actualizados
          </h3>
          <div className="space-y-3">
            {results.map((res, index) => (
              <div key={index} className="p-3 border rounded-md bg-gray-50 shadow-sm">
                <h4 className="font-semibold text-gray-700">{res.name}</h4>
                {res.error ? (
                  <p className="text-red-600">{res.error}</p>
                ) : (
                  <>
                    {res.tmb !== undefined && (
                      <p className="text-sm">
                        TMB: <strong className="text-indigo-700">{res.tmb} kcal/día</strong>
                      </p>
                    )}
                    {res.ree !== undefined && (
                      <p className="text-sm">
                        REE: <strong className="text-indigo-700">{res.ree}</strong> kcal/día
                      </p>
                    )}
                    {res.getd !== undefined && (
                      <p className="text-sm">
                        GETD: <strong className="text-indigo-700">{res.getd}</strong> kcal/día
                      </p>
                    )}
                    {res.adjusted_getd !== undefined && (
                      <p className="text-sm">
                        GETD Ajustado: <strong className="text-green-700">{res.adjusted_getd}</strong> kcal/día
                        <span className="text-xs text-gray-500 ml-2">(Descontadas {res.infusionCalories} kcal de infusiones)</span>
                      </p>
                    )}
                    {res.adjusted_ree !== undefined && (
                      <p className="text-sm">
                        REE Ajustado: <strong className="text-green-700">{res.adjusted_ree}</strong> kcal/día
                        <span className="text-xs text-gray-500 ml-2">(Descontadas {res.infusionCalories} kcal de infusiones)</span>
                      </p>
                    )}
                    {res.details && (
                      <p className="text-xs text-gray-500 mt-1">{res.details}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {averageBasal !== null && (
            <div className="p-3 border border-blue-700 rounded-md bg-blue-100 text-center">
              <h4 className="font-semibold text-blue-800">
                Promedio Basal (TMB/REE de fórmulas seleccionadas)
              </h4>
              <p className="text-blue-700 text-lg font-bold">{averageBasal} kcal/día</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Calculadora de proteínas adaptada para seguimiento
const FollowUpAdvancedProteinCalculator = ({ onProteinResult, followUpData = {}, firstAssessmentData = {}, riskAssessmentResults = {} }) => {
  const [formData, setFormData] = useState({
    peso: followUpData.followUp_currentWeight || '',
    altura: firstAssessmentData.height || '',
    sexo: firstAssessmentData.sex || 'masculino',
    estadoNutricional: 'bienNutrido',
    masaMuscular: 'normal',
    faseEnfermedad: followUpData.diseasePhase || 'hospitalizacionGeneral',
    quemaduras: false,
    politraumatismo: false,
    estadoRespiratorio: followUpData.respiratoryStatus || 'ingestaOralAdecuada',
    rutaNutricion: followUpData.nutritionRoute || 'oral',
  });

  const [calculatedData, setCalculatedData] = useState({
    imc: null,
    ibw: null,
    abw: null,
    primaryTargetValueText: '---',
    primaryTargetUnitText: 'g/kg/día',
    primaryTargetTotalGramsText: '--- g/día',
    primaryTargetWeightBaseText: 'Base: ---',
    primaryTargetSourceText: 'Fuente: ---',
    considerations: [],
    otherRecommendationsHTMLStrings: [],
  });

  const [showConsiderations, setShowConsiderations] = useState(false);

  // Actualizar datos cuando cambien las props
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      peso: followUpData.followUp_currentWeight || prev.peso || '',
      altura: firstAssessmentData.height || prev.altura || '',
      sexo: firstAssessmentData.sex || prev.sexo || 'masculino',
      faseEnfermedad: followUpData.diseasePhase || prev.faseEnfermedad || 'hospitalizacionGeneral',
      estadoRespiratorio: followUpData.respiratoryStatus || prev.estadoRespiratorio || 'ingestaOralAdecuada',
      rutaNutricion: followUpData.nutritionRoute || prev.rutaNutricion || 'oral',
    }));
  }, [followUpData, firstAssessmentData]);

  // Efecto para sugerir estado nutricional y masa muscular basado en riskAssessmentResults
  useEffect(() => {
    let suggestedEstadoNutricional = 'bienNutrido';
    let suggestedMasaMuscular = 'normal';

    // Determinar estado nutricional basado en datos disponibles
    if (typeof riskAssessmentResults?.nrs?.score === 'number') {
      if (riskAssessmentResults.nrs.score >= 3) {
        suggestedEstadoNutricional = 'riesgoNutricionalAlto';
      } else if (riskAssessmentResults.nrs.score < 3) {
        suggestedEstadoNutricional = 'riesgoNutricionalBajo';
      }
    }

    // Si hay diagnóstico GLIM, tiene precedencia
    if (riskAssessmentResults?.glim?.diagnosis && riskAssessmentResults.glim.diagnosis.includes("Malnutrición diagnosticada")) {
      suggestedEstadoNutricional = 'desnutrido';
    }

    // Determinar masa muscular basado en el cribado de pantorrilla si está disponible
    if (riskAssessmentResults?.calfScreening?.classification) {
      if (riskAssessmentResults.calfScreening.classification === "Severamente Baja") {
        suggestedMasaMuscular = 'bajaDetectada';
      } else if (riskAssessmentResults.calfScreening.classification === "Moderadamente Baja") {
        suggestedMasaMuscular = 'bajaDetectada';
      } else if (riskAssessmentResults.calfScreening.classification === "Normal") {
        suggestedMasaMuscular = 'normal';
      }
    }

    setFormData(prev => ({
      ...prev,
      estadoNutricional: suggestedEstadoNutricional,
      masaMuscular: suggestedMasaMuscular
    }));
  }, [riskAssessmentResults?.nrs?.score, riskAssessmentResults?.glim?.diagnosis, riskAssessmentResults?.calfScreening?.classification]);

  // Calcular IMC, IBW, ABW
  useEffect(() => {
    const pesoKg = parseFloat(formData.peso);
    const alturaCm = parseFloat(formData.altura);
    const sexoVal = formData.sexo;
    let imcVal = null, ibwVal = null, abwVal = null;

    if (pesoKg > 0 && alturaCm > 0) {
      const alturaM = alturaCm / 100;
      imcVal = pesoKg / (alturaM * alturaM);
      const alturaPulgadas = alturaCm / 2.54;

      if (alturaPulgadas > 60) {
        ibwVal = (sexoVal === 'masculino' || sexoVal === 'male' ? 50 : 45.5) + 2.3 * (alturaPulgadas - 60);
      } else {
        ibwVal = sexoVal === 'masculino' || sexoVal === 'male' ? 50 : 45.5;
      }
      ibwVal = ibwVal > 0 ? ibwVal : null;

      if (ibwVal && pesoKg > (ibwVal * 1.20)) {
        abwVal = ibwVal + 0.4 * (pesoKg - ibwVal);
      } else if (ibwVal) {
        abwVal = pesoKg;
      }
    }

    setCalculatedData(prev => ({
      ...prev,
      imc: imcVal,
      ibw: ibwVal,
      abw: abwVal ? abwVal : (pesoKg > 0 ? pesoKg : null)
    }));
  }, [formData.peso, formData.altura, formData.sexo]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleConsiderations = () => setShowConsiderations(prev => !prev);

  const calculateProteinRequirements = () => {
    const peso = parseFloat(formData.peso);
    const imc = calculatedData.imc;
    const ibw = calculatedData.ibw;

    let pesoBaseCalculo = peso;
    let tipoPesoBase = "Peso Actual";

    if (imc && imc >= 30) {
      if (calculatedData.abw) {
        pesoBaseCalculo = calculatedData.abw;
        tipoPesoBase = "Peso Corporal Ajustado (ABW)";
      } else if (ibw) {
        pesoBaseCalculo = ibw;
        tipoPesoBase = "Peso Corporal Ideal (IBW)";
      }
    }

    if (isNaN(pesoBaseCalculo) || pesoBaseCalculo <= 0) {
      console.warn("Peso base para cálculo de proteínas no es válido.");
      setCalculatedData(prev => ({
        ...prev,
        primaryTargetValueText: 'Error',
        primaryTargetTotalGramsText: 'Error en peso',
        considerations: ["Verifique los datos de peso, altura y sexo."]
      }));
      return;
    }

    let targetRange = {
      value: "1.2 - 2.5",
      unit: `g/kg ${tipoPesoBase}`,
      baseWeight: pesoBaseCalculo,
      weightType: tipoPesoBase,
      source: "Guías Generales Críticos"
    };

    let currentConsiderations = [];
    let otrasRecsStrings = [];

    if (imc && imc >= 30) {
      if (calculatedData.abw) {
        targetRange = {
          value: "1.3",
          unit: "g/kg Peso Ajustado",
          baseWeight: calculatedData.abw,
          weightType: "Peso Corporal Ajustado (ABW)",
          source: "Guía ESPEN (Obesidad)"
        };

        if (ibw) {
          let aspenObesityTargetValue = (imc < 40) ? 2.0 : 2.5;
          let aspenPrefix = (imc < 40) ? "" : "Hasta ";
          let totalGramsAspen = (aspenObesityTargetValue * ibw).toFixed(0);
          otrasRecsStrings.push(`<p><strong>Obesidad (ASPEN/SCCM):</strong> ${aspenPrefix}${aspenObesityTargetValue.toFixed(1)} g/kg IBW/día. (IBW: ${ibw.toFixed(1)} kg). <br/>Objetivo Total: <span class="font-semibold text-emerald-700">${aspenPrefix}${totalGramsAspen} g/día.</span></p>`);
        }
      } else if (ibw) {
        let aspenTargetVal = (imc < 40) ? 2.0 : 2.5;
        let aspenPrefix = (imc < 40) ? "" : "Hasta ";
        targetRange = {
          value: `${aspenPrefix}${aspenTargetVal.toFixed(1)}`,
          unit: "g/kg Peso Ideal (IBW)",
          baseWeight: ibw,
          weightType: "Peso Corporal Ideal (IBW)",
          source: "Guía ASPEN/SCCM (Obesidad)"
        };
      }
      currentConsiderations.push(`Paciente con obesidad (IMC ${imc ? imc.toFixed(1) : 'N/A'}). Las recomendaciones varían. Se usó ${tipoPesoBase}.`);
    } else if (formData.quemaduras || formData.politraumatismo) {
      targetRange = {
        value: "2.0 - 2.5",
        unit: "g/kg peso actual",
        baseWeight: peso,
        weightType: "Peso Actual",
        source: "Sugerencia ASPEN/SCCM (Trauma/Quemaduras)"
      };
    } else if (formData.faseEnfermedad === 'agudaTemprana' || formData.faseEnfermedad === 'agudaTardia') {
      targetRange = {
        value: "~1.3 (progresivo)",
        unit: "g/kg peso actual",
        baseWeight: peso,
        weightType: "Peso Actual",
        source: "Guía ESPEN (UCI)"
      };
    }

    const finalTargetValueText = String(targetRange.value || '');
    const finalTargetUnitText = String(targetRange.unit || 'g/kg/día');
    let finalTotalGramsDisplay = "--- g/día";

    let targetValueForCalc = finalTargetValueText.replace("~", "").replace("(progresivo)", "").replace("Hasta ", "");

    if (targetValueForCalc.includes('-')) {
      const parts = targetValueForCalc.split('-').map(s => parseFloat(s.trim()));
      if (!isNaN(parts[0]) && !isNaN(parts[1]) && targetRange.baseWeight && !isNaN(targetRange.baseWeight)) {
        finalTotalGramsDisplay = `${(parts[0] * targetRange.baseWeight).toFixed(0)} - ${(parts[1] * targetRange.baseWeight).toFixed(0)} g/día`;
      }
    } else {
      const val = parseFloat(targetValueForCalc);
      if (!isNaN(val) && targetRange.baseWeight && !isNaN(targetRange.baseWeight)) {
        let prefix = "";
        if (finalTargetValueText.includes('~')) prefix = "~";
        if (finalTargetValueText.includes('(progresivo)')) prefix = "~ (progresivo) ";
        if (finalTargetValueText.includes('Hasta ')) prefix = "Hasta ";
        finalTotalGramsDisplay = `${prefix}${(val * targetRange.baseWeight).toFixed(0)} g/día`;
      }
    }

    if (targetRange.source !== "Guías Generales Críticos" && !(imc && imc >= 30)) {
      let totalGramsGeneralMin = (1.2 * peso).toFixed(0);
      let totalGramsGeneralMax = (2.5 * peso).toFixed(0);
      otrasRecsStrings.push(`<p><strong>Rango General (Críticos, peso actual):</strong> 1.2 - 2.5 g/kg/día. <br/>Objetivo Total: <span class="font-semibold text-emerald-700">${totalGramsGeneralMin} - ${totalGramsGeneralMax} g/día.</span></p>`);
    }

    if (formData.quemaduras || formData.politraumatismo) {
      currentConsiderations.push(`Para pacientes con <strong>${formData.quemaduras ? "quemaduras" : ""}${formData.quemaduras && formData.politraumatismo ? " y " : ""}${formData.politraumatismo ? "politraumatismos" : ""}</strong>, las guías sugieren aporte proteico alto.`);
    }

    currentConsiderations.push("Recordar que esta es una herramienta de apoyo y no reemplaza el juicio clínico.");

    setCalculatedData(prev => ({
      ...prev,
      primaryTargetValueText: finalTargetValueText,
      primaryTargetUnitText: finalTargetUnitText,
      primaryTargetTotalGramsText: finalTotalGramsDisplay,
      primaryTargetWeightBaseText: `Base: ${targetRange.weightType} (${targetRange.baseWeight && !isNaN(parseFloat(targetRange.baseWeight)) ? parseFloat(targetRange.baseWeight).toFixed(1) : 'N/A'} kg)`,
      primaryTargetSourceText: `Fuente: ${targetRange.source}`,
      considerations: currentConsiderations,
      otherRecommendationsHTMLStrings: otrasRecsStrings,
    }));

    const proteinResult = {
      target: targetRange,
      totalGrams: finalTotalGramsDisplay,
      considerations: currentConsiderations,
      otherRecs: otrasRecsStrings,
      formData: { ...formData, imc: calculatedData.imc, ibw: calculatedData.ibw, abw: calculatedData.abw }
    };

    if (onProteinResult) {
      onProteinResult(proteinResult);
    }
  };

  const commonInputClass = "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm";
  const readOnlyInputStyle = commonInputClass + " bg-gray-100 cursor-not-allowed";
  const infoTextStyle = "text-sm text-gray-600 bg-gray-50 p-2 border border-gray-200 rounded-md";

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md animate-fadeIn border border-gray-200">
      <h3 className="text-xl font-semibold text-emerald-700 mb-5">Recálculo de Aporte Proteico</h3>

      <div className="p-3 border rounded-md bg-emerald-50 mb-4">
        <p className="text-sm text-emerald-700">
          <strong>Datos desde seguimiento:</strong> Peso actual, fase de enfermedad, estado respiratorio, ruta de nutrición
        </p>
        <p className="text-sm text-emerald-700">
          <strong>Datos desde valoración inicial:</strong> Altura, edad, sexo
        </p>
      </div>

      <div id="protein-adv-form" className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="protein-adv-peso" className="block text-sm font-medium text-gray-700">Peso Actual (kg):</label>
            <input 
              type="number" 
              name="peso" 
              id="protein-adv-peso" 
              value={formData.peso} 
              onChange={handleInputChange}
              className={commonInputClass}
              placeholder="Peso actual del seguimiento"
            />
            <p className="text-xs text-gray-500 mt-1">Desde datos de seguimiento.</p>
          </div>

          <div>
            <label htmlFor="protein-adv-altura" className="block text-sm font-medium text-gray-700">Altura (cm):</label>
            <input 
              type="text" 
              value={`${formData.altura} cm (valoración inicial)`}
              readOnly 
              className={readOnlyInputStyle} 
            />
            <p className="text-xs text-gray-500 mt-1">Desde valoración inicial.</p>
          </div>

          <div>
            <label htmlFor="protein-adv-sexo" className="block text-sm font-medium text-gray-700">Sexo Biológico:</label>
            <input 
              type="text" 
              value={formData.sexo === 'male' ? 'Masculino' : 'Femenino'}
              readOnly 
              className={readOnlyInputStyle} 
            />
            <p className="text-xs text-gray-500 mt-1">Desde valoración inicial.</p>
          </div>

          <div>
            <label htmlFor="protein-adv-imc" className="block text-sm font-medium text-gray-700">IMC (kg/m²):</label>
            <input 
              type="text" 
              value={calculatedData.imc ? calculatedData.imc.toFixed(1) : '---'}
              readOnly 
              className={readOnlyInputStyle} 
            />
          </div>

          <div>
            <label htmlFor="protein-adv-displayIBW" className="block text-sm font-medium text-gray-700">Peso Ideal (IBW) (kg):</label>
            <input 
              type="text" 
              value={calculatedData.ibw ? calculatedData.ibw.toFixed(1) : '---'}
              readOnly 
              className={readOnlyInputStyle} 
            />
          </div>

          <div>
            <label htmlFor="protein-adv-displayABW" className="block text-sm font-medium text-gray-700">Peso Ajustado (ABW) (kg):</label>
            <input 
              type="text" 
              value={calculatedData.abw ? calculatedData.abw.toFixed(1) : '---'}
              readOnly 
              className={readOnlyInputStyle} 
            />
          </div>
        </div>

        <div className="p-3 border rounded-md bg-slate-100">
          <p className={infoTextStyle}><strong className="text-slate-700">Fase Enfermedad (seguimiento):</strong> {formData.faseEnfermedad || 'No especificada'}</p>
          <p className={infoTextStyle}><strong className="text-slate-700">Estado Respiratorio/Ingesta (seguimiento):</strong> {formData.estadoRespiratorio || 'No especificado'}</p>
          <p className={infoTextStyle}><strong className="text-slate-700">Ruta Nutrición (seguimiento):</strong> {formData.rutaNutricion || 'No especificada'}</p>
        </div>

        <div>
          <label htmlFor="protein-adv-estadoNutricional" className="block text-sm font-medium text-gray-700">Estado Nutricional Basal/Riesgo:</label>
          <select 
            name="estadoNutricional" 
            id="protein-adv-estadoNutricional" 
            value={formData.estadoNutricional} 
            onChange={handleInputChange} 
            className={commonInputClass}
          >
            <option value="bienNutrido">Bien Nutrido</option>
            <option value="riesgoNutricionalBajo">Riesgo Nutricional Bajo</option>
            <option value="riesgoNutricionalAlto">Riesgo Nutricional Alto</option>
            <option value="desnutrido">Desnutrido</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Sugerido por calculadoras de riesgo. Ajustar según juicio clínico.</p>
        </div>

        <div>
          <label htmlFor="protein-adv-masaMuscular" className="block text-sm font-medium text-gray-700">Masa Muscular Basal:</label>
          <select 
            name="masaMuscular" 
            id="protein-adv-masaMuscular" 
            value={formData.masaMuscular} 
            onChange={handleInputChange} 
            className={commonInputClass}
          >
            <option value="normal">Normal/No evaluada</option>
            <option value="bajaDetectada">Baja Masa Muscular Detectada</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Sugerido por cribado de pantorrilla. Ajustar según juicio clínico.</p>
        </div>

        <div className="input-group">
          <label className="block text-sm font-medium text-gray-700">Condiciones Específicas Adicionales:</label>
          <div className="mt-2 space-x-4">
            <label className="inline-flex items-center">
              <input 
                type="checkbox" 
                name="quemaduras" 
                checked={formData.quemaduras} 
                onChange={handleInputChange} 
                className="form-checkbox h-5 w-5 text-emerald-600 rounded" 
              />
              <span className="ml-2 text-gray-700">Quemaduras</span>
            </label>
            <label className="inline-flex items-center">
              <input 
                type="checkbox" 
                name="politraumatismo" 
                checked={formData.politraumatismo} 
                onChange={handleInputChange} 
                className="form-checkbox h-5 w-5 text-emerald-600 rounded" 
              />
              <span className="ml-2 text-gray-700">Politraumatismo</span>
            </label>
          </div>
        </div>

        <button 
          type="button" 
          onClick={calculateProteinRequirements} 
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out"
        >
          Recalcular Aporte Proteico
        </button>

        {calculatedData.primaryTargetValueText !== '---' && (
          <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-300 shadow-md">
            <h3 className="text-lg font-semibold text-emerald-800 mb-2 flex items-center">
              <svg className="w-6 h-6 mr-2 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              Objetivo Proteico Actualizado
            </h3>
            <p className="text-3xl font-bold text-emerald-700">
              <strong>{String(calculatedData.primaryTargetValueText || '')}</strong>
              <span className="text-xl font-medium text-emerald-600">
                {' ' + String(calculatedData.primaryTargetUnitText || '')}
              </span>
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{String(calculatedData.primaryTargetTotalGramsText || '')}</p>
            <p className="text-sm text-gray-500 mt-2">{String(calculatedData.primaryTargetWeightBaseText || '')}</p>
            <p className="text-xs text-gray-400 mt-1">{String(calculatedData.primaryTargetSourceText || '')}</p>

            <button 
              type="button" 
              onClick={toggleConsiderations} 
              className="mt-4 text-sm text-emerald-600 hover:text-emerald-800 focus:outline-none font-medium flex items-center group"
            >
              <svg className="w-5 h-5 mr-1.5 transition-transform duration-200 ease-in-out group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="hover:underline">{showConsiderations ? 'Ocultar' : 'Mostrar'} Consideraciones y Detalles</span>
              <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ease-in-out ${showConsiderations ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        )}

        {showConsiderations && calculatedData.considerations.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200 mt-2">
            <h3 className="text-md font-semibold text-gray-700 mb-3">📝 Consideraciones Clave y Fundamento:</h3>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
              {calculatedData.considerations.map((con, index) => (
                <li key={index}>{String(con || '').replace(/<[^>]+>/g, '')}</li>
              ))}
            </ul>
          </div>
        )}

        {calculatedData.otherRecommendationsHTMLStrings && calculatedData.otherRecommendationsHTMLStrings.length > 0 && (
          <div className="p-4 mt-4 rounded-lg bg-slate-50 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Otras Recomendaciones de Guías
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
              {calculatedData.otherRecommendationsHTMLStrings.map((htmlString, index) => (
                <div key={index}>{String(htmlString || '').replace(/<[^>]+>/g, '')}</div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm">
          <h4 className="font-bold mb-1">Advertencia Importante:</h4>
          <p>Esta calculadora proporciona una sugerencia basada en evidencia y guías para el contexto de seguimiento nutricional. <strong>No reemplaza el juicio clínico individualizado.</strong> Las recomendaciones pueden variar según la evolución del paciente.</p>
        </div>
      </div>
    </div>
  );
};

// Componente para calculadora de necesidades nutricionales en seguimiento
const FollowUpNutritionalNeedsCalculator = ({ 
  currentCalculationData, 
  nonNutritionalCalories, 
  onNeedsResults,
  refeedingRiskResult,
  followUpData,
  firstAssessmentData,
  riskAssessmentResults 
}) => {
  const [activeSubTab, setActiveSubTab] = useState('calorias');
  const [calculatorResults, setCalculatorResults] = useState({});
  const [hasExecutedCalculation, setHasExecutedCalculation] = useState(false);

  const handleCalculatorResults = (results) => {
    console.log('=== CALCULATOR RESULTS RECEIVED ===');
    console.log('Results:', results);
    
    setCalculatorResults(prev => {
      const newResults = {
        ...prev,
        ...results
      };

      // Procesar y enviar resultados consolidados al componente padre
      const processedResults = {
        calories: newResults.calories ? {
          ...newResults.calories,
          adjusted_get: newResults.calories.get ? Math.max(0, newResults.calories.get - nonNutritionalCalories) : null
        } : null,
        protein: newResults.protein || null
      };

      console.log('Processed results:', processedResults);

      // Solo enviar si tenemos al menos un resultado
      if (processedResults.calories || processedResults.protein) {
        if (onNeedsResults) {
          onNeedsResults(processedResults);
        }
      }

      return newResults;
    });
  };

  // Ejecutar cálculo automático solo una vez cuando los datos estén listos
  useEffect(() => {
    // Solo ejecuta el cálculo cuando los datos de entrada cambian, y nunca dos veces por render
    if (currentCalculationData.isValid && !hasExecutedCalculation) {
      console.log('=== EJECUTANDO CÁLCULO ÚNICO EN NEEDS CALCULATOR ===');
      setHasExecutedCalculation(true);
      
      // Validar datos críticos antes del cálculo
      const weight = parseFloat(currentCalculationData.weight);
      const height = parseFloat(currentCalculationData.height);
      const age = parseInt(currentCalculationData.age);
      const sex = currentCalculationData.sex;
      
      if (weight && height && age && sex) {
        const currentTemp = parseFloat(currentCalculationData.bodyTemperature) || 37;
        
        // Cálculo simplificado de TMB
        let bmr;
        if (sex === 'male') {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }
        
        // Factor de temperatura
        let tempFactor = 1.0;
        if (currentTemp > 37) {
          tempFactor = 1 + (0.10 * (currentTemp - 37));
        }
        
        const totalCalories = Math.round(bmr * 1.3 * tempFactor);
        
        const caloriesResult = {
          formula: 'mifflin-seguimiento',
          tmb: Math.round(bmr),
          get: totalCalories,
          adjusted_get: Math.max(0, totalCalories - nonNutritionalCalories),
          infusionCalories: nonNutritionalCalories,
          details: `TMB: ${Math.round(bmr)} kcal, Factor: ${(1.3 * tempFactor).toFixed(2)}`
        };

        // Proteínas según fase de enfermedad
        let proteinValue = 1.3;
        if (currentCalculationData.diseasePhase === 'agudaTardia') proteinValue = 1.5;
        
        const proteinTotal = Math.round(weight * proteinValue);
        const proteinResult = {
          target: {
            value: proteinValue.toString(),
            unit: 'g/kg peso actual',
            baseWeight: weight,
            weightType: 'Peso Actual',
            source: 'Recálculo automático seguimiento'
          },
          totalGrams: `${proteinTotal} g/día`,
          targetValue: proteinTotal
        };

        // Enviar resultados UNA SOLA VEZ
        handleCalculatorResults({
          calories: caloriesResult,
          protein: proteinResult
        });
      }
    }
  }, [currentCalculationData.isValid, hasExecutedCalculation])

  const renderCalculatorContent = () => {
    switch (activeSubTab) {
      case 'calorias':
        return (
          <FollowUpAdvancedCaloriesCalculator
            onCaloriesResult={(result) => handleCalculatorResults({ calories: result })}
            followUpData={followUpData}
            firstAssessmentData={firstAssessmentData}
          />
        );
      case 'proteinas':
        return (
          <FollowUpAdvancedProteinCalculator
            onProteinResult={(result) => handleCalculatorResults({ protein: result })}
            followUpData={followUpData}
            firstAssessmentData={firstAssessmentData}
            riskAssessmentResults={riskAssessmentResults}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
        <span className="mr-2">🔢</span>
        Recálculo de Necesidades Nutricionales
      </h4>

      <div className="mb-4 p-3 bg-white border border-blue-300 rounded-md">
        <p className="text-sm text-blue-700">
          <strong>Datos para cálculo:</strong> Peso actual de seguimiento ({currentCalculationData.weight || 'N/A'} kg), 
          temperatura corporal actual ({currentCalculationData.bodyTemperature || '37'}°C). 
          Edad, altura y género tomados de la valoración inicial.
        </p>
        {nonNutritionalCalories > 0 && (
          <p className="text-sm text-orange-600 mt-1">
            <strong>Ajuste automático:</strong> Se descontarán {nonNutritionalCalories} kcal/día de calorías no nutricionales.
          </p>
        )}
      </div>

      <div className="mb-3 sm:mb-4 border-b border-gray-300 flex flex-wrap -mt-2">
            <button 
              onClick={() => setActiveSubTab('calorias')}
              className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${
                activeSubTab === 'calorias' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } focus:outline-none focus:ring-1 focus:ring-emerald-500 flex items-center`}
            >
              Necesidades Calóricas
              {calculatorResults.calories && (
                <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </button>
            <button 
              onClick={() => setActiveSubTab('proteinas')}
              className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${
                activeSubTab === 'proteinas' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } focus:outline-none focus:ring-1 focus:ring-emerald-500 flex items-center`}
            >
              Necesidades Proteicas
              {calculatorResults.protein && (
                <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </button>
          </div>

      {renderCalculatorContent()}
    </div>
  );
};

// Función utilitaria para limpiar datos antiguos de localStorage
const cleanOldRecalculationData = () => {
  try {
    const keys = Object.keys(localStorage);
    const recalculationKeys = keys.filter(key => key.startsWith('recalculo_'));
    
    // Mantener solo los últimos 10 recálculos para evitar acumular datos
    if (recalculationKeys.length > 10) {
      const sortedKeys = recalculationKeys.sort();
      const keysToRemove = sortedKeys.slice(0, recalculationKeys.length - 10);
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Eliminado dato antiguo: ${key}`);
      });
    }
  } catch (error) {
    console.error('Error limpiando localStorage:', error);
  }
};

// Componente principal
const FollowUpNutritionalRecalculationModule = ({ 
  followUpPatientData = {}, 
  initialPatientData = {}, 
  initialAssessmentResults = {},
  currentWeight,
  bodyTemperature,
  onRecalculationResult,
  onObjectivesCalculated
}) => {
  const [refeedingRiskResult, setRefeedingRiskResult] = useState(null);
  const [followUpNeedsResults, setFollowUpNeedsResults] = useState({
    calories: null,
    protein: null
  });
  const [nonNutritionalCalories, setNonNutritionalCalories] = useState(0);
  const [showAdjustmentSliders, setShowAdjustmentSliders] = useState(false);
  const [manualAdjustment, setManualAdjustment] = useState(null);

  // Crear datos de cálculo actuales combinando datos iniciales con datos de seguimiento
  const currentCalculationData = useMemo(() => {
    console.log('=== CREANDO CURRENT CALCULATION DATA ===');
    console.log('followUpPatientData recibido:', followUpPatientData);
    console.log('initialPatientData recibido:', initialPatientData);
    console.log('initialAssessmentResults recibido:', initialAssessmentResults);

    // Verificar datos básicos específicos
    console.log('Altura desde initialPatientData:', initialPatientData?.height);
    console.log('Edad desde initialPatientData:', initialPatientData?.age);
    console.log('Sexo desde initialPatientData:', initialPatientData?.sex);
    console.log('Altura desde initialAssessmentResults.generalInfo:', initialAssessmentResults?.generalInfo?.height);
    console.log('Edad desde initialAssessmentResults.generalInfo:', initialAssessmentResults?.generalInfo?.age);
    console.log('Sexo desde initialAssessmentResults.generalInfo:', initialAssessmentResults?.generalInfo?.sex);

    // Temperatura corporal: tomar de seguimiento, luego inicial, luego default
    const bodyTemp = followUpPatientData.bodyTemperature || initialPatientData.bodyTemperature || '37';

    // Obtener peso actual - usar prop currentWeight primero, luego fallbacks
    let currentWeightValue = null;

    // Prioridad 1: currentWeight prop (del formulario principal)
    if (currentWeight && !isNaN(parseFloat(currentWeight)) && parseFloat(currentWeight) > 0) {
      currentWeightValue = parseFloat(currentWeight);
    }
    // Prioridad 2: followUp_currentWeight del formulario de seguimiento
    else if (followUpPatientData.followUp_currentWeight && !isNaN(parseFloat(followUpPatientData.followUp_currentWeight)) && parseFloat(followUpPatientData.followUp_currentWeight) > 0) {
      currentWeightValue = parseFloat(followUpPatientData.followUp_currentWeight);
    }
    // Prioridad 3: peso de la valoración inicial como fallback
    else if (initialPatientData.weight && !isNaN(parseFloat(initialPatientData.weight)) && parseFloat(initialPatientData.weight) > 0) {
      currentWeightValue = parseFloat(initialPatientData.weight);
    }
    // Prioridad 4: weight directo de followUpPatientData
    else if (followUpPatientData.weight && !isNaN(parseFloat(followUpPatientData.weight)) && parseFloat(followUpPatientData.weight) > 0) {
      currentWeightValue = parseFloat(followUpPatientData.weight);
    }

    // Si no hay peso válido, marcar como inválido
    if (!currentWeightValue || currentWeightValue <= 0) {
      console.log('Peso actual no disponible, datos insuficientes para cálculo');
      return {
        weight: null,
        height: initialPatientData.height || followUpPatientData.height || '170',
        age: initialPatientData.age || followUpPatientData.age || '40',
        sex: initialPatientData.sex || followUpPatientData.sex || 'male',
        bmi: null,
        bodyTemperature: bodyTemp,
        isValid: false,
        missingData: {
          weight: true
        }
      };
    }

    // Validar que tenemos datos básicos necesarios desde múltiples fuentes
    const currentHeight = initialPatientData.height || 
                         followUpPatientData.height || 
                         initialAssessmentResults?.generalInfo?.height || 
                         null;

    const currentAge = initialPatientData.age || 
                      followUpPatientData.age || 
                      initialAssessmentResults?.generalInfo?.age || 
                      null;

    const currentSex = initialPatientData.sex || 
                      followUpPatientData.sex || 
                      initialAssessmentResults?.generalInfo?.sex || 
                      null;

    console.log('Datos extraídos - altura:', currentHeight, 'edad:', currentAge, 'sexo:', currentSex);
    console.log('initialPatientData completo:', initialPatientData);
    console.log('Sources checked: initialPatientData, followUpPatientData, initialAssessmentResults.generalInfo');

    if (!currentHeight || !currentAge || !currentSex) {
      console.log('❌ DATOS BÁSICOS INCOMPLETOS ❌');
      console.log('Altura:', currentHeight, '(requerida)');
      console.log('Edad:', currentAge, '(requerida)');
      console.log('Sexo:', currentSex, '(requerido)');
      console.log('patientBasicInfo disponible:', Object.keys(initialPatientData || {}));
      console.log('initialAssessmentResults.generalInfo disponible:', Object.keys(initialAssessmentResults?.generalInfo || {}));

      // Si faltan datos críticos, usar valores por defecto pero marcar como inválido
      const fallbackData = {
        weight: currentWeight,
        height: currentHeight || '170',
        age: currentAge || '40', 
        sex: currentSex || 'male',
        bmi: null,
        bodyTemperature: bodyTemp,
        isValid: false,
        missingData: {
          height: !currentHeight,
          age: !currentAge,
          sex: !currentSex
        },
        hasFallbacks: true
      };

      console.log('Usando datos de fallback:', fallbackData);
      return fallbackData;
    }

    console.log('Peso calculado para currentCalculationData:', currentWeightValue);

    let bmi = null;
    if (currentWeightValue > 0 && parseFloat(currentHeight) > 0) {
      const heightM = parseFloat(currentHeight) / 100;
      bmi = (currentWeightValue / (heightM * heightM)).toFixed(1);
    }

    // Crear objeto de datos completo con todos los campos necesarios
    const calculationData = {
      // Datos básicos antropométricos
      weight: currentWeightValue,
      height: currentHeight,
      age: currentAge,
      sex: currentSex,
      bmi: bmi,
      isValid: true,

      // Temperatura corporal
      bodyTemperature: bodyTemp,

      // Fecha de valoración
      assessmentDate: initialPatientData.assessmentDate || followUpPatientData.assessmentDate,

      // Estados clínicos (preferir datos de seguimiento si están disponibles)
      diseasePhase: followUpPatientData.diseasePhase || initialPatientData.diseasePhase || 'hospitalizacionGeneral',
      respiratoryStatus: followUpPatientData.respiratoryStatus || initialPatientData.respiratoryStatus || 'respEspontanea',
      nutritionRoute: followUpPatientData.nutritionRoute || initialPatientData.nutritionRoute || 'oral',

      // Datos de pérdida de peso e ingesta (CRÍTICO: usar datos iniciales para síndrome de realimentación)
      recentIntakePercentage: initialPatientData.recentIntakePercentage || initialAssessmentResults?.generalInfo?.recentIntakePercentage || '',
      loss1m_percent: initialPatientData.loss1m_percent || initialAssessmentResults?.generalInfo?.loss1m_percent || '',
      loss2m_percent: initialPatientData.loss2m_percent || initialAssessmentResults?.generalInfo?.loss3m_percent || '',
      loss3m_percent: initialPatientData.loss3m_percent || initialAssessmentResults?.generalInfo?.loss3m_percent || '',
      loss6m_percent: initialPatientData.loss6m_percent || initialAssessmentResults?.generalInfo?.loss6m_percent || '',

      // Pesos históricos para cálculos
      weight1m_ago: initialPatientData.weight1m_ago || initialAssessmentResults?.generalInfo?.weight1m_ago,
      weight2m_ago: initialPatientData.weight2m_ago || initialAssessmentResults?.generalInfo?.weight2m_ago,
      weight3m_ago: initialPatientData.weight3m_ago || initialAssessmentResults?.generalInfo?.weight3m_ago,
      weight6m_ago: initialPatientData.weight6m_ago || initialAssessmentResults?.generalInfo?.weight6m_ago,

      // Ingesta reducida
      reducedIntakeDays: initialPatientData.reducedIntakeDays || initialAssessmentResults?.generalInfo?.reducedIntakeDays,

      // Laboratorios (usar los más recientes disponibles)
      lab_potassium: followUpPatientData.lab_potassium || followUpPatientData.followUp_lab_potassium || initialPatientData.lab_potassium,
      lab_phosphorus: followUpPatientData.lab_phosphorus || followUpPatientData.followUp_lab_phosphorus || initialPatientData.lab_phosphorus,
      lab_magnesium: followUpPatientData.lab_magnesium || followUpPatientData.followUp_lab_magnesium || initialPatientData.lab_magnesium,
      lab_sodium: followUpPatientData.lab_sodium || followUpPatientData.followUp_lab_sodium || initialPatientData.lab_sodium,
      lab_thiamine_unit: followUpPatientData.lab_thiamine_unit || followUpPatientData.followUp_lab_thiamine_unit || initialPatientData.lab_thiamine_unit,
      lab_thiamine: followUpPatientData.lab_thiamine || followUpPatientData.followUp_lab_thiamine || initialPatientData.lab_thiamine
    };

    console.log('currentCalculationData creado:', calculationData);
    return calculationData;
  }, [
    // Solo las dependencias esenciales que realmente deben disparar recálculo
    currentWeight,
    bodyTemperature,
    initialPatientData.weight,
    initialPatientData.height,
    initialPatientData.age,
    initialPatientData.sex,
    followUpPatientData.followUp_currentWeight
  ]);

  // Calcular calorías no nutricionales basándose en los datos de la página principal
  useEffect(() => {
    try {
      let totalNonNutritional = 0;

      // Propofol
      if (followUpPatientData.hasPropofol) {
        const rate = parseFloat(followUpPatientData.followUp_propofol_rate) || 0;
        const duration = parseFloat(followUpPatientData.followUp_propofol_duration) || 0;
        totalNonNutritional += rate * duration * 1.1; // 1.1 kcal/mL
      }

      // Dextrosa
      if (followUpPatientData.hasDextrose) {
        const concentration = parseFloat(followUpPatientData.followUp_dextrose_concentration) || 0;
        const volume = parseFloat(followUpPatientData.followUp_dextrose_volume) || 0;
        totalNonNutritional += (concentration / 100) * volume * 3.4; // 3.4 kcal/g
      }

      setNonNutritionalCalories(Math.round(totalNonNutritional));
    } catch (error) {
      console.error('Error calculating non-nutritional calories:', error);
      setNonNutritionalCalories(0);
    }
  }, [followUpPatientData.hasPropofol, followUpPatientData.followUp_propofol_rate, 
      followUpPatientData.followUp_propofol_duration, followUpPatientData.hasDextrose,
      followUpPatientData.followUp_dextrose_concentration, followUpPatientData.followUp_dextrose_volume]);

  const handleRefeedingResult = useCallback((result) => {
    try {
      setRefeedingRiskResult(result);
    } catch (error) {
      console.error('Error handling refeeding result:', error);
    }
  }, []);

  const handleNeedsResultsChange = useCallback((results) => {
    try {
      console.log('=== RECIBIENDO RESULTADOS EN HANDLE NEEDS RESULTS ===');
      console.log('Results recibidos:', results);

      setFollowUpNeedsResults(prev => {
        const newResults = {
          calories: results.calories || prev.calories,
          protein: results.protein || prev.protein
        };
        
        console.log('Actualizando followUpNeedsResults:', newResults);
        return newResults;
      });

      // Notificar objetivos nutricionales calculados
      if (onObjectivesCalculated && (results.calories || results.protein)) {
        const calorieGoal = results.calories?.adjusted_get || results.calories?.get || 0;
        let proteinGoal = 0;
        
        // Extraer valor numérico de proteínas
        if (results.protein?.totalGrams) {
          const proteinString = results.protein.totalGrams.toString();
          const proteinMatch = proteinString.match(/(\d+(?:\.\d+)?)/);
          proteinGoal = proteinMatch ? parseFloat(proteinMatch[1]) : 0;
        } else if (results.protein?.targetValue) {
          proteinGoal = parseFloat(results.protein.targetValue) || 0;
        }

        console.log('=== NOTIFICANDO OBJETIVOS CALCULADOS ===');
        console.log('Calorías:', calorieGoal);
        console.log('Proteínas:', proteinGoal);
        
        onObjectivesCalculated({
          calorieGoal: calorieGoal,
          proteinGoal: proteinGoal,
          assessmentDate: new Date().toISOString().split('T')[0],
          source: 'follow-up-recalculation',
          details: {
            calories: results.calories,
            protein: results.protein
          }
        });
      }
    } catch (error) {
      console.error('Error handling needs results:', error);
    }
  }, [onObjectivesCalculated]);

  const handleManualAdjustment = useCallback((adjustmentData) => {
    try {
      setManualAdjustment(adjustmentData);
      setShowAdjustmentSliders(false);

      // Aplicar el ajuste a los resultados actuales
      setFollowUpNeedsResults(prev => ({
        calories: prev.calories ? {
          ...prev.calories,
          adjusted_get: adjustmentData.calories.adjusted,
          manual_adjustment: true,
          adjustment_percentage: adjustmentData.calories.percentage,
          adjustment_justification: adjustmentData.justification
        } : null,
        protein: prev.protein ? {
          ...prev.protein,
          totalGrams: `${adjustmentData.protein.adjusted} g/día`,
          manual_adjustment: true,
          adjustment_percentage: adjustmentData.protein.percentage,
          adjustment_justification: adjustmentData.justification
        } : null
      }));
    } catch (error) {
      console.error('Error handling manual adjustment:', error);
    }
  }, []);

  const resetManualAdjustment = useCallback(() => {
    setManualAdjustment(null);
    // Restaurar valores originales sin ajuste manual
    setFollowUpNeedsResults(prev => ({
      calories: prev.calories ? {
        ...prev.calories,
        adjusted_get: prev.calories.get ? Math.max(0, prev.calories.get - nonNutritionalCalories) : null,
        manual_adjustment: false,
        adjustment_percentage: undefined,
        adjustment_justification: undefined
      } : null,
      protein: prev.protein ? {
        ...prev.protein,
        manual_adjustment: false,
        adjustment_percentage: undefined,
        adjustment_justification: undefined
      } : null
    }));
  }, [nonNutritionalCalories]);

  // El cálculo automático se maneja únicamente desde FollowUpNutritionalNeedsCalculator
  // para evitar duplicaciones y conflictos

  // Efectos para notificar cambios al componente padre
  useEffect(() => {
    try {
      // Solo ejecutar si tenemos datos válidos Y resultados de recálculo
      if (onRecalculationResult && currentCalculationData.isValid && 
          (followUpNeedsResults.calories || followUpNeedsResults.protein)) {
        
        const resultData = {
          refeedingRisk: refeedingRiskResult,
          nutritionalNeeds: {
            calories: followUpNeedsResults.calories,
            protein: followUpNeedsResults.protein
          },
          nonNutritionalCalories: nonNutritionalCalories,
          currentData: currentCalculationData,
          manualAdjustment: manualAdjustment,
          // Asegurar que los datos estén en la estructura correcta
          hasRecalculation: true,
          recalculationDate: new Date().toISOString().split('T')[0],
          source: 'follow-up-nutritional-recalculation'
        };
        
        console.log('=== ENVIANDO RESULTADOS AL PADRE ===');
        console.log('Datos de recálculo:', resultData);
        
        // localStorage se usa ÚNICAMENTE como respaldo, nunca para mostrar datos
        // Solo se guarda al completar exitosamente el flujo de seguimiento
        
        onRecalculationResult(resultData);
      }
    } catch (error) {
      console.error('Error in recalculation result callback:', error);
    }
  }, [refeedingRiskResult, followUpNeedsResults, nonNutritionalCalories, currentCalculationData.isValid, manualAdjustment, onRecalculationResult, currentCalculationData.documentNumber, followUpPatientData.documentNumber]);

  const refeedingRiskLevel = refeedingRiskResult?.riesgo?.nivel || "";

  // Obtener valores base para el ajuste manual
  const getBaseValues = () => {
    const baseCalories = followUpNeedsResults.calories?.adjusted_get || followUpNeedsResults.calories?.get || 0;
    const baseProtein = followUpNeedsResults.protein?.target?.baseWeight && followUpNeedsResults.protein?.target?.value 
      ? Math.round(parseFloat(followUpNeedsResults.protein.target.value.replace(/[^\d.]/g, '')) * followUpNeedsResults.protein.target.baseWeight)
      : 0;

    return { baseCalories, baseProtein };
  };

  // Determinar condición del paciente para rangos de ajuste
  const getPatientCondition = () => {
    if (refeedingRiskLevel === "ALTO RIESGO" || refeedingRiskLevel === "RIESGO SIGNIFICATIVO") {
      return 'refeeding_risk';
    }

    const diseasePhase = currentCalculationData.diseasePhase || followUpPatientData.diseasePhase;
    if (diseasePhase === 'agudaTemprana' || diseasePhase === 'agudaTardia') {
      return 'critical';
    }
    if (diseasePhase === 'recuperacion') {
      return 'recovery';
    }

    return 'stable';
  };

  const renderNutritionalNeedsCalculator = () => {
    // Verificar que tenemos datos válidos antes de renderizar
    if (!currentCalculationData.isValid) {
      const missingData = currentCalculationData.missingData || {};
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
            <span className="mr-2">⚠️</span>
            Datos Básicos Requeridos
          </h4>

          {(!currentCalculationData.weight || currentCalculationData.weight <= 0) && (
            <div className="mb-3 p-3 bg-white border border-yellow-300 rounded">
              <p className="text-yellow-700 font-medium">Peso Actual Requerido</p>
              <p className="text-sm text-yellow-600">
                <strong>Peso de la valoración inicial:</strong> {initialPatientData.weight || 'No disponible'} kg
              </p>
              <p className="text-xs text-yellow-500 mt-1">
                Ingrese el peso actual en el formulario de seguimiento para continuar.
              </p>
            </div>
          )}

          {(missingData.height || missingData.age || missingData.sex) && (
            <div className="p-3 bg-white border border-red-300 rounded">
              <p className="text-red-700 font-medium">Datos de la Valoración Inicial Faltantes:</p>
              <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                {missingData.height && <li>Altura no registrada en valoración inicial</li>}
                {missingData.age && <li>Edad no registrada en valoración inicial</li>}
                {missingData.sex && <li>Sexo no registrado en valoración inicial</li>}
              </ul>
              <p className="text-xs text-red-500 mt-2">
                Estos datos son necesarios para calcular las necesidades nutricionales. Verifique que la valoración inicial esté completa.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Si hay alto riesgo de realimentación, mostrar el plan especial
    if (refeedingRiskLevel === "RIESGO SIGNIFICATIVO" || refeedingRiskLevel === "ALTO RIESGO") {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
            <span className="mr-2">⚠️</span>
            Plan de Realimentación (Alto Riesgo Detectado)
          </h4>
          <RefeedingSyndromeNutritionalPlan 
            currentWeight={parseFloat(currentCalculationData.weight)}
            nonNutritionalCalories={nonNutritionalCalories}
            followUpNeedsResults={followUpNeedsResults}
          />
        </div>
      );
    }

    // Calculadora de necesidades nutricionales completa
    return (
      <FollowUpNutritionalNeedsCalculator 
        currentCalculationData={currentCalculationData}
        nonNutritionalCalories={nonNutritionalCalories}
        onNeedsResults={handleNeedsResultsChange}
        refeedingRiskResult={refeedingRiskResult}
        followUpData={followUpPatientData}
        firstAssessmentData={initialPatientData}
        riskAssessmentResults={initialAssessmentResults}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Calculadora de Necesidades Nutricionales */}
      {renderNutritionalNeedsCalculator()}

      {/* Resumen de Resultados */}
      {(followUpNeedsResults.calories || followUpNeedsResults.protein) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-blue-800">📋 Resumen de Recálculo</h4>

            {/* Botón de reajuste manual */}
            <div className="flex space-x-2">
              {manualAdjustment && (
                <button
                  onClick={resetManualAdjustment}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Restaurar Original
                </button>
              )}
              <button
                onClick={() => setShowAdjustmentSliders(true)}
                disabled={!followUpNeedsResults.calories && !followUpNeedsResults.protein}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <span className="mr-2">⚙️</span>
                Reajuste Manual de Objetivos
              </button>
            </div>
          </div>

          {/* Indicador de ajuste manual aplicado */}
          {manualAdjustment && (
            <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-md">
              <div className="flex items-center mb-2">
                <span className="mr-2">⚙️</span>
                <span className="font-medium text-purple-800">Ajuste Manual Aplicado</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-purple-700">Calorías:</span> {manualAdjustment.calories.percentage}% 
                  <span className={`ml-1 ${manualAdjustment.calories.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({manualAdjustment.calories.change >= 0 ? '+' : ''}{manualAdjustment.calories.change} kcal)
                  </span>
                </div>
                <div>
                  <span className="text-purple-700">Proteínas:</span> {manualAdjustment.protein.percentage}% 
                  <span className={`ml-1 ${manualAdjustment.protein.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({manualAdjustment.protein.change >= 0 ? '+' : ''}{manualAdjustment.protein.change} g)
                  </span>
                </div>
              </div>
              {manualAdjustment.justification && (
                <p className="text-xs text-purple-600 mt-2">
                  <strong>Justificación:</strong> {manualAdjustment.justification}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {followUpNeedsResults.calories && (
              <div className="bg-white p-3 rounded border border-blue-200">
                <h5 className="font-medium text-blue-700 mb-2 flex items-center">
                  Necesidades Calóricas Actualizadas
                  {followUpNeedsResults.calories.manual_adjustment && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Ajustado</span>
                  )}
                </h5>
                <p className="text-2xl font-bold text-blue-800">
                  {followUpNeedsResults.calories.adjusted_get || followUpNeedsResults.calories.get} kcal/día
                </p>
                <p className="text-sm text-blue-600">
                  Fórmula: {followUpNeedsResults.calories.formula}
                  {nonNutritionalCalories > 0 && ` (Ajustado por ${nonNutritionalCalories} kcal no nutricionales)`}
                </p>
                {followUpNeedsResults.calories.manual_adjustment && (
                  <p className="text-xs text-purple-600 mt-1">
                    Ajuste manual: {followUpNeedsResults.calories.adjustment_percentage}%
                  </p>
                )}
              </div>
            )}

            {followUpNeedsResults.protein && (
              <div className="bg-white p-3 rounded border border-emerald-200">
                <h5 className="font-medium text-emerald-700 mb-2 flex items-center">
                  Necesidades Proteicas Actualizadas
                  {followUpNeedsResults.protein.manual_adjustment && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Ajustado</span>
                  )}
                </h5>
                <p className="text-2xl font-bold text-emerald-800">
                  {followUpNeedsResults.protein.totalGrams}
                </p>
                <p className="text-sm text-emerald-600">
                  {followUpNeedsResults.protein.target?.value} {followUpNeedsResults.protein.target?.unit}
                </p>
                {followUpNeedsResults.protein.manual_adjustment && (
                  <p className="text-xs text-purple-600 mt-1">
                    Ajuste manual: {followUpNeedsResults.protein.adjustment_percentage}%
                  </p>
                )}
              </div>
            )}
          </div>

          {refeedingRiskResult && (
            <div className="mt-4 p-3 bg-white rounded border border-yellow-200">
              <h5 className="font-medium text-yellow-700 mb-2">Estado de Riesgo de Realimentación</h5>
              <p className={`font-bold ${refeedingRiskResult.riesgo?.colorClass || 'text-gray-600'}`}>
                {refeedingRiskResult.riesgo?.nivel || 'No evaluado'}
              </p>
              {refeedingRiskResult.riesgo?.factores?.length > 0 && (
                <ul className="text-sm text-yellow-700 mt-2">
                  {refeedingRiskResult.riesgo.factores.map((factor, index) => (
                    <li key={index}>• {factor}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Componente de ajuste manual con barras deslizantes */}
      <NutritionalAdjustmentSliders
        baseCalories={getBaseValues().baseCalories}
        baseProtein={getBaseValues().baseProtein}
        onAdjustmentChange={handleManualAdjustment}
        patientCondition={getPatientCondition()}
        isVisible={showAdjustmentSliders}
        onClose={() => setShowAdjustmentSliders(false)}
      />
    </div>
  );
};

export default FollowUpNutritionalRecalculationModule;