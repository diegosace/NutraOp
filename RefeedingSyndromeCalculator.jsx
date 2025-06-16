import React, { useState, useEffect, useMemo, useCallback } from 'react';

const RefeedingSyndromeCalculator = React.memo(({ onRefeedingResult, initialData = {}, showOnlyDiagnostic = false }) => {
  const [activeTab, setActiveTab] = useState(showOnlyDiagnostic ? 'diagnostic' : 'risk');
  const [riskFormData, setRiskFormData] = useState({
    subcutaneousFatLoss: 'none',
    muscleMassLoss: 'none',
    riskConditions: [],
  });

  const [diagnosticFormData, setDiagnosticFormData] = useState({
    currentLabs: {
      potassium: '',
      phosphorus: '',
      magnesium: '',
      sodium: '',
      thiamine: '',
    },
    symptoms: {
      potassium: [],
      phosphorus: [],
      magnesium: [],
      sodium: [],
      thiamine: [],
    },
    confirmed: false
  });

  const [riskResult, setRiskResult] = useState(null);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  // Memoizar initialData para evitar re-renders innecesarios
  const stableInitialData = useMemo(() => {
    return {
      bmi: initialData.bmi,
      weight: initialData.weight,
      loss1m_percent: initialData.loss1m_percent,
      loss3m_percent: initialData.loss3m_percent,
      loss6m_percent: initialData.loss6m_percent,
      lab_potassium: initialData.lab_potassium,
      lab_phosphorus: initialData.lab_phosphorus,
      lab_magnesium: initialData.lab_magnesium,
      lab_sodium: initialData.lab_sodium,
      lab_thiamine: initialData.lab_thiamine,
      lab_thiamine_unit: initialData.lab_thiamine_unit,
      lab_thiamine_status: initialData.lab_thiamine_status,
      recentIntakePercentage: initialData.recentIntakePercentage,
      reducedIntakeDays: initialData.reducedIntakeDays
    };
  }, [
    initialData.bmi,
    initialData.weight,
    initialData.loss1m_percent,
    initialData.loss3m_percent,
    initialData.loss6m_percent,
    initialData.lab_potassium,
    initialData.lab_phosphorus,
    initialData.lab_magnesium,
    initialData.lab_sodium,
    initialData.lab_thiamine,
    initialData.lab_thiamine_unit,
    initialData.lab_thiamine_status,
    initialData.recentIntakePercentage,
    initialData.reducedIntakeDays
  ]);

  // Effect para actualizar cuando cambien los datos del Módulo 1 (solo una vez)
  useEffect(() => {
    // Solo log cuando realmente hay datos relevantes y una sola vez
    const hasRelevantData = stableInitialData && Object.keys(stableInitialData).some(key => 
      stableInitialData[key] !== undefined && 
      stableInitialData[key] !== null && 
      stableInitialData[key] !== ''
    );

    if (hasRelevantData) {
      console.log("Datos iniciales cargados en RefeedingSyndromeCalculator:", stableInitialData);
    }
  }, []); // Solo ejecutar una vez al montar el componente

  // Callback estable para evitar re-renders
  const stableOnRefeedingResult = useCallback((result) => {
    if (onRefeedingResult && typeof onRefeedingResult === 'function') {
      onRefeedingResult(result);
    }
  }, [onRefeedingResult]);

  const symptomsList = {
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
    sodium: [
      'Edema',
      'Falla cardíaca congestiva',
      'Hipertensión'
    ],
    thiamine: [
      'Encefalopatía',
      'Acidosis láctica',
      'Nistagmo',
      'Neuropatía',
      'Demencia',
      'Síndrome de Wernicke',
      'Psicosis de Korsakoff',
      'Beriberi húmedo y seco'
    ]
  };

  const riskConditionsList = [
    { id: 'aids', label: 'Síndrome de inmunodeficiencia adquirida' },
    { id: 'addiction', label: 'Trastorno crónico por consumo de alcohol o drogas' },
    { id: 'dysphagia', label: 'Disfagia y trastornos de la motilidad esofágica' },
    { id: 'eatingDisorder', label: 'Trastornos de la conducta alimentaria' },
    { id: 'foodInsecurity', label: 'Inseguridad alimentaria y personas sin hogar' },
    { id: 'failureToThrive', label: 'Fracaso para prosperar' },
    { id: 'hyperemesis', label: 'Hiperémesis gravídica o vómitos prolongados' },
    { id: 'stressFactors', label: 'Factores estresantes importantes o cirugía sin nutrición' },
    { id: 'malabsorption', label: 'Estados de malabsorción' },
    { id: 'cancer', label: 'Cáncer' },
    { id: 'neurologicalImpairment', label: 'Deterioro neurológico avanzado' },
    { id: 'bariatricSurgery', label: 'Cirugía bariátrica previa' },
    { id: 'postopComplications', label: 'Pacientes postoperatorios con complicaciones' },
    { id: 'prolongedFasting', label: 'Ayuno prolongado' },
    { id: 'refugees', label: 'Refugiados' },
    { id: 'proteinMalnutrition', label: 'Desnutrición proteica' }
  ];

  const handleRiskCheckboxChange = (id) => {
    setRiskFormData(prev => ({
      ...prev,
      riskConditions: prev.riskConditions.includes(id)
        ? prev.riskConditions.filter(c => c !== id)
        : [...prev.riskConditions, id]
    }));
  };

  const handleRiskSelectChange = (e) => {
    setRiskFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleLabChange = (e) => {
    const { name, value } = e.target;
    setDiagnosticFormData(prev => {
      const newCurrentLabs = {
        ...prev.currentLabs,
        [name]: value
      };

      // Si se está actualizando la tiamina, verificar si es un valor bajo
      if (name === 'thiamine' && value) {
        const thiamineValue = parseFloat(value);
        const unit = prev.currentLabs.thiamine_unit || 'nmol/L';

        if (!isNaN(thiamineValue)) {
          let isLowThiamine = false;
          if (unit === 'ng/mL') {
            isLowThiamine = thiamineValue < 21;
          } else {
            isLowThiamine = thiamineValue < 70;
          }

          // Si la tiamina es baja y no hay síntomas seleccionados, mostrar automáticamente la sección
          if (isLowThiamine) {
            console.log('Tiamina baja detectada:', thiamineValue, unit);
          }
        }
      }

      return {
        ...prev,
        currentLabs: newCurrentLabs
      };
    });
  };

  const handleSymptomToggle = (electrolyte, symptom) => {
    setDiagnosticFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [electrolyte]: prev.symptoms[electrolyte].includes(symptom)
          ? prev.symptoms[electrolyte].filter(s => s !== symptom)
          : [...prev.symptoms[electrolyte], symptom]
      }
    }));
  };

  const calculateRisk = useCallback(() => {
    const bmi = parseFloat(stableInitialData.bmi);
    const loss1m = parseFloat(stableInitialData.loss1m_percent);
    const loss3m = parseFloat(stableInitialData.loss3m_percent);
    const loss6m = parseFloat(stableInitialData.loss6m_percent);
    const K = parseFloat(stableInitialData.lab_potassium);
    const P = parseFloat(stableInitialData.lab_phosphorus);
    const Mg = parseFloat(stableInitialData.lab_magnesium);
    const recentIntake = stableInitialData.recentIntakePercentage;
    const reducedIntakeDays = parseInt(stableInitialData.reducedIntakeDays);

    let riskLevel = "BAJO RIESGO";
    let riskFactors = [];
    let colorClass = "text-green-600";

    if (bmi < 16) {
      riskLevel = "RIESGO SIGNIFICATIVO";
      riskFactors.push("IMC < 16 kg/m²");
    }
    if (loss3m > 7.5 || loss6m > 10) {
      riskLevel = "RIESGO SIGNIFICATIVO";
      riskFactors.push("Pérdida de peso significativa");
    }
    if (recentIntake === '0-24' && reducedIntakeDays >= 7) {
      riskLevel = "RIESGO SIGNIFICATIVO";
      riskFactors.push("Ingesta nula/insignificante > 7 días");
    }
    if ((K < 3.5 && K > 0) || (P < 2.5 && P > 0) || (Mg < 1.5 && Mg > 0)) {
      riskLevel = "RIESGO SIGNIFICATIVO";
      riskFactors.push("Electrolitos bajos pre-alimentación");
    }

    let moderateRiskCriteria = 0;
    if (riskLevel !== "RIESGO SIGNIFICATIVO") {
      if (bmi >= 16 && bmi <= 18.5) moderateRiskCriteria++;
      if (loss1m >= 5) moderateRiskCriteria++;
      if (recentIntake === '0-24' && reducedIntakeDays >= 5) moderateRiskCriteria++;
      if (riskFormData.riskConditions.length > 0) moderateRiskCriteria++;

      if (moderateRiskCriteria >= 2) {
        riskLevel = "RIESGO MODERADO";
        colorClass = "text-yellow-600";
      }
    } else {
      colorClass = "text-red-600";
    }

    const calculatedResult = {
      riesgo: {
        nivel: riskLevel,
        factores: riskFactors,
        colorClass: colorClass
      }
    };

    setRiskResult(calculatedResult);
    stableOnRefeedingResult(calculatedResult);
  }, [stableInitialData.bmi, stableInitialData.loss1m_percent, stableInitialData.loss3m_percent, 
      stableInitialData.loss6m_percent, stableInitialData.lab_potassium, stableInitialData.lab_phosphorus, 
      stableInitialData.lab_magnesium, stableInitialData.recentIntakePercentage, 
      stableInitialData.reducedIntakeDays, riskFormData.riskConditions, stableOnRefeedingResult]);

  const calculateDiagnosis = useCallback(() => {
    const changes = {};
    const symptoms = {};
    let severity = "";
    let affectedElectrolytes = 0;
    let maxDecline = 0;
    let hasSyndrome = false;
    let hasElectrolyteChanges = false;
    let hasOrganDysfunction = false;
    let electrolytesWithDecline = [];

    // Calcular cambios en electrolitos principales (K, P, Mg)
    const mainElectrolytes = ['phosphorus', 'potassium', 'magnesium'];

    for (const electrolyte of mainElectrolytes) {
      const currentValue = diagnosticFormData.currentLabs[electrolyte];
      const initialValue = stableInitialData[`lab_${electrolyte}`];

      if (currentValue && initialValue) {
        const current = parseFloat(currentValue);
        const initial = parseFloat(initialValue);
        const percentChange = ((initial - current) / initial) * 100;

        changes[electrolyte] = {
          initial,
          current,
          percentChange,
          isLow: current < initial,
          hasSymptoms: diagnosticFormData.symptoms[electrolyte].length > 0
        };

        // Criterio: disminución ≥10% en cualquiera de los 3 electrolitos principales
        if (percentChange >= 10 && current < initial) {
          affectedElectrolytes++;
          maxDecline = Math.max(maxDecline, percentChange);
          hasElectrolyteChanges = true;
          electrolytesWithDecline.push(electrolyte);

          // Si hay síntomas asociados, se considera disfunción orgánica
          if (diagnosticFormData.symptoms[electrolyte].length > 0) {
            hasOrganDysfunction = true;
            symptoms[electrolyte] = diagnosticFormData.symptoms[electrolyte];
          }
        }
      }
    }

    // Verificar otros electrolitos (sodio) para completitud
    if (diagnosticFormData.currentLabs.sodium && stableInitialData.lab_sodium) {
      const current = parseFloat(diagnosticFormData.currentLabs.sodium);
      const initial = parseFloat(stableInitialData.lab_sodium);
      const percentChange = ((initial - current) / initial) * 100;

      changes.sodium = {
        initial,
        current,
        percentChange,
        isLow: current < initial,
        hasSymptoms: diagnosticFormData.symptoms.sodium.length > 0
      };

      if (diagnosticFormData.symptoms.sodium.length > 0) {
        symptoms.sodium = diagnosticFormData.symptoms.sodium;
      }
    }

    // Verificar deficiencia de tiamina
    let hasThiamineDeficiency = false;

    // Primero verificar si hay tiamina baja en Módulo 1
    if (stableInitialData.lab_thiamine_status === 'bajo' && stableInitialData.lab_thiamine && stableInitialData.lab_thiamine !== '' && stableInitialData.lab_thiamine !== null && stableInitialData.lab_thiamine !== undefined) {
      hasThiamineDeficiency = true;
      const thiamineValue = parseFloat(stableInitialData.lab_thiamine) || 0;
      const thiamineUnit = stableInitialData.lab_thiamine_unit || 'nmol/L';

      changes['thiamine'] = {
        initial: thiamineValue,
        current: thiamineValue,
        percentChange: 0,
        isLow: true,
        hasSymptoms: diagnosticFormData.symptoms.thiamine.length > 0,
        unit: thiamineUnit
      };

      if (diagnosticFormData.symptoms.thiamine.length > 0) {
        hasOrganDysfunction = true;
        symptoms['thiamine'] = diagnosticFormData.symptoms.thiamine;
      }
    }
    // Si no hay tiamina en Módulo 1, verificar laboratorio actual
    else if ((!stableInitialData.lab_thiamine || stableInitialData.lab_thiamine === '' || stableInitialData.lab_thiamine === null || stableInitialData.lab_thiamine === undefined) && diagnosticFormData.currentLabs.thiamine) {
      const thiamineValue = parseFloat(diagnosticFormData.currentLabs.thiamine);
      const thiamineUnit = diagnosticFormData.currentLabs.thiamine_unit || 'nmol/L';

      let isLowThiamine = false;
      if (thiamineUnit === 'ng/mL') {
        isLowThiamine = thiamineValue < 21;
      } else {
        isLowThiamine = thiamineValue < 70;
      }

      if (isLowThiamine) {
        hasThiamineDeficiency = true;
        changes['thiamine'] = {
          initial: thiamineValue,
          current: thiamineValue,
          percentChange: 0,
          isLow: true,
          hasSymptoms: diagnosticFormData.symptoms.thiamine.length > 0,
          unit: thiamineUnit
        };

        if (diagnosticFormData.symptoms.thiamine.length > 0) {
          hasOrganDysfunction = true;
          symptoms['thiamine'] = diagnosticFormData.symptoms.thiamine;
        }
      }
    }

    // Determinar si hay síndrome según criterios específicos:
    // 1. Disminución ≥10% en al menos 1 de los 3 electrolitos principales (K, P, Mg)
    // 2. O disfunción orgánica por deficiencia de tiamina
    // 3. Y ocurre dentro de 5 días (criterio de temporalidad)
    hasSyndrome = (hasElectrolyteChanges || (hasThiamineDeficiency && diagnosticFormData.symptoms.thiamine.length > 0));

    // Determinar severidad según criterios específicos
    if (hasSyndrome) {
      if (maxDecline > 30 || hasOrganDysfunction) {
        // Severo: >30% de disminución y/o disfunción orgánica
        severity = "SEVERO";
      } else if (maxDecline >= 20) {
        // Moderado: 20-30% de disminución
        severity = "MODERADO";
      } else if (maxDecline >= 10) {
        // Leve: 10-20% de disminución
        severity = "LEVE";
      }
    }

    // Determinar diagnóstico final
    let finalDiagnosis = "";
    let finalColorClass = "";
    let temporalityCriteriaMet = diagnosticFormData.confirmed === true;

    if (!temporalityCriteriaMet && hasSyndrome) {
      finalDiagnosis = "No se reúne el criterio de temporalidad para el diagnóstico de síndrome de realimentación. Se sugiere seguimiento y una evaluación más detallada.";
      finalColorClass = "text-orange-600";
    } else if (temporalityCriteriaMet && hasSyndrome) {
      finalDiagnosis = `SÍNDROME DE REALIMENTACIÓN ${severity}`;
      finalColorClass = severity === "SEVERO" ? "text-red-600" :
                       severity === "MODERADO" ? "text-orange-600" :
                       "text-yellow-600";
    } else if (temporalityCriteriaMet && hasElectrolyteChanges && !hasSyndrome) {
      finalDiagnosis = "CAMBIOS ELECTROLÍTICOS SIN SÍNDROME DE REALIMENTACIÓN";
      finalColorClass = "text-blue-600";
    } else {
      finalDiagnosis = "SIN SÍNDROME DE REALIMENTACIÓN";
      finalColorClass = "text-green-600";
    }

    const diagnosticResult = {
      diagnostico: {
        diagnostico: finalDiagnosis,
        cambios: changes,
        sintomas: symptoms,
        colorClass: finalColorClass,
        temporalityCriteriaMet: temporalityCriteriaMet,
        hasElectrolyteChanges: hasElectrolyteChanges,
        hasOrganDysfunction: hasOrganDysfunction,
        affectedElectrolytes: affectedElectrolytes,
        electrolytesWithDecline: electrolytesWithDecline,
        severity: severity
      }
    };

    setDiagnosticResult(diagnosticResult);
    stableOnRefeedingResult({
      ...riskResult,
      ...diagnosticResult
    });
  }, [stableInitialData.lab_potassium, stableInitialData.lab_phosphorus, stableInitialData.lab_magnesium,
      stableInitialData.lab_sodium, stableInitialData.lab_thiamine, stableInitialData.lab_thiamine_unit,
      stableInitialData.lab_thiamine_status, diagnosticFormData.currentLabs, diagnosticFormData.symptoms,
      diagnosticFormData.confirmed, riskResult, stableOnRefeedingResult]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md animate-fadeIn">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Síndrome de Realimentación
      </h3>

      {/* Tabs */}
      {!showOnlyDiagnostic && (
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('risk')}
              className={`${
                activeTab === 'risk'
                  ? 'border-[#5A98D6] text-[#5A98D6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Evaluación de Riesgo
            </button>
            <button
              onClick={() => setActiveTab('diagnostic')}
              className={`${
                activeTab === 'diagnostic'
                  ? 'border-[#5A98D6] text-[#5A98D6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Diagnóstico
            </button>
          </nav>
        </div>
      )}

      {!showOnlyDiagnostic && activeTab === 'risk' ? (
        <div className="space-y-4">
          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-xs text-gray-600 mb-3">
            <h4 className="font-medium text-[#5A98D6] mb-2">Variables desde Módulo 1:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <p>IMC: <strong className="text-[#5A98D6]">{stableInitialData.bmi || 'N/A'}</strong> kg/m²</p>
              <p>Pérdida peso 1m: <strong className="text-[#5A98D6]">{stableInitialData.loss1m_percent || 'N/A'}</strong>%</p>
              <p>Pérdida peso 3m: <strong className="text-[#5A98D6]">{stableInitialData.loss3m_percent || 'N/A'}</strong>%</p>
              <p>Pérdida peso 6m: <strong className="text-[#5A98D6]">{stableInitialData.loss6m_percent || 'N/A'}</strong>%</p>
              <p>Potasio: <strong className="text-[#5A98D6]">{stableInitialData.lab_potassium || 'N/A'}</strong> mEq/L</p>
              <p>Fósforo: <strong className="text-[#5A98D6]">{stableInitialData.lab_phosphorus || 'N/A'}</strong> mg/dL</p>
              <p>Magnesio: <strong className="text-[#5A98D6]">{stableInitialData.lab_magnesium || 'N/A'}</strong> mg/dL</p>
              <p>Ingesta reciente: <strong className="text-[#5A98D6]">{stableInitialData.recentIntakePercentage || 'N/A'}</strong></p>
              <p>Días ingesta reducida: <strong className="text-[#5A98D6]">{stableInitialData.reducedIntakeDays || 'N/A'}</strong></p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pérdida de Grasa Subcutánea
            </label>
            <select
              name="subcutaneousFatLoss"
              value={riskFormData.subcutaneousFatLoss}
              onChange={handleRiskSelectChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm"
            >
              <option value="none">Sin pérdida evidente</option>
              <option value="moderate">Moderada</option>
              <option value="severe">Severa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pérdida de Masa Muscular
            </label>
            <select
              name="muscleMassLoss"
              value={riskFormData.muscleMassLoss}
              onChange={handleRiskSelectChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm"
            >
              <option value="none">Sin pérdida evidente</option>
              <option value="mild">Leve</option>
              <option value="moderate">Moderada</option>
              <option value="severe">Severa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comorbilidades y Condiciones de Riesgo
            </label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md">
              {riskConditionsList.map(condition => (
                <div key={condition.id} className="flex items-start">
                  <input
                    type="checkbox"
                    id={condition.id}
                    checked={riskFormData.riskConditions.includes(condition.id)}
                    onChange={() => handleRiskCheckboxChange(condition.id)}
                    className="mt-1 h-4 w-4 text-[#5A98D6] focus:ring-[#5A98D6] border-gray-300 rounded"
                  />
                  <label htmlFor={condition.id} className="ml-2 text-sm text-gray-700">
                    {condition.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={calculateRisk}
            className="mt-6 w-full bg-[#5A98D6] hover:bg-[#4A88C6] text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5A98D6] focus:ring-opacity-50"
          >
            Calcular Riesgo de Síndrome de Realimentación
          </button>

          {riskResult && (
            <div className={`mt-6 p-4 rounded-lg border-2 ${
              riskResult.riesgo.nivel === "RIESGO SIGNIFICATIVO" ? "bg-red-50 border-red-300" :
              riskResult.riesgo.nivel === "RIESGO MODERADO" ? "bg-yellow-50 border-yellow-300" :
              "bg-green-50 border-green-300"
            }`}>
              <h4 className="text-lg font-semibold mb-2">Resultado:</h4>
              <p className={`text-2xl font-bold ${riskResult.riesgo.colorClass}`}>
                {riskResult.riesgo.nivel}
              </p>
              {riskResult.riesgo.factores.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium mb-1">Factores de riesgo identificados:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {riskResult.riesgo.factores.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (showOnlyDiagnostic || activeTab === 'diagnostic') ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Electrolitos Basales (Módulo 1):</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>Potasio: <strong>{stableInitialData.lab_potassium || 'N/A'}</strong> mEq/L</p>
              <p>Fósforo: <strong>{stableInitialData.lab_phosphorus || 'N/A'}</strong> mg/dL</p>
              <p>Magnesio: <strong>{stableInitialData.lab_magnesium || 'N/A'}</strong> mg/dL</p>
              <p>Sodio: <strong>{stableInitialData.lab_sodium || 'N/A'}</strong> mEq/L</p>
            </div>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Potasio Actual (mEq/L)
              </label>
              <input
                type="number"
                step="0.1"
                name="potassium"
                value={diagnosticFormData.currentLabs.potassium}
                onChange={handleLabChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm"
                placeholder="Ej: 3.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fósforo Actual (mg/dL)
              </label>
              <input
                type="number"
                step="0.1"
                name="phosphorus"
                value={diagnosticFormData.currentLabs.phosphorus}
                onChange={handleLabChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm"
                placeholder="Ej: 2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Magnesio Actual (mg/dL)
              </label>
              <input
                type="number"
                step="0.1"
                name="magnesium"
                value={diagnosticFormData.currentLabs.magnesium}
                onChange={handleLabChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm"
                placeholder="Ej: 1.8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sodio Actual (mEq/L)
              </label>
              <input
                type="number"
                step="0.1"
                name="sodium"
                value={diagnosticFormData.currentLabs.sodium}
                onChange={handleLabChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm"
                placeholder="Ej: 135"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Tiamina Actual
              </label>
              {stableInitialData.lab_thiamine && stableInitialData.lab_thiamine !== '' && stableInitialData.lab_thiamine !== null && stableInitialData.lab_thiamine !== undefined ? (
                // Mostrar valor del Módulo 1 como solo lectura
                <div className={`mt-1 p-3 rounded-md border-2 ${
                  stableInitialData.lab_thiamine_status === 'bajo' ? 'bg-red-50 border-red-300' :
                  stableInitialData.lab_thiamine_status === 'alto' ? 'bg-yellow-50 border-yellow-300' :
                  stableInitialData.lab_thiamine_status === 'normal' ? 'bg-green-50 border-green-300' :
                  'bg-gray-50 border-gray-300'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        Valor desde Módulo 1: <strong>{stableInitialData.lab_thiamine} {stableInitialData.lab_thiamine_unit || 'nmol/L'}</strong>
                      </p>
                      {stableInitialData.lab_thiamine_status && (
                        <p className={`text-xs font-medium ${
                          stableInitialData.lab_thiamine_status === 'normal' ? 'text-green-600' : 
stableInitialData.lab_thiamine_status === 'bajo' ? 'text-red-600' : 
                          stableInitialData.lab_thiamine_status === 'alto' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          Estado: {stableInitialData.lab_thiamine_status.charAt(0).toUpperCase() + stableInitialData.lab_thiamine_status.slice(1)}
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      stableInitialData.lab_thiamine_status === 'bajo' ? 'bg-red-100 text-red-800' :
                      stableInitialData.lab_thiamine_status === 'alto' ? 'bg-yellow-100 text-yellow-800' :
                      stableInitialData.lab_thiamine_status === 'normal' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Desde Módulo 1
                    </div>
                  </div>
                </div>
              ) : (
                // Permitir entrada manual si no hay valor en Módulo 1
                <div>
                  <div className="mt-1 flex space-x-2">
                    <div className="flex-grow relative">
                      <input
                        type="number"
                        step="0.1"
                        name="thiamine"
                        value={diagnosticFormData.currentLabs.thiamine}
                        onChange={handleLabChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm pr-16"
                        placeholder="Valor de tiamina actual"
                      />
                      {(() => {
                        if (diagnosticFormData.currentLabs.thiamine) {
                          const value = parseFloat(diagnosticFormData.currentLabs.thiamine);
                          const unit = diagnosticFormData.currentLabs.thiamine_unit || 'nmol/L';

                          if (!isNaN(value)) {
                            let status = '';
                            let statusColor = '';

                            if (unit === 'ng/mL') {
                              if (value >= 21 && value <= 54) {
                                status = 'Normal';
                                statusColor = 'text-green-600';
                              } else if (value < 21) {
                                status = 'Bajo';
                                statusColor = 'text-red-600';
                              } else {
                                status = 'Alto';
                                statusColor = 'text-yellow-600';
                              }
                            } else {
                              if (value >= 70 && value <= 180) {
                                status = 'Normal';
                                statusColor = 'text-green-600';
                              } else if (value < 70) {
                                status = 'Bajo';
                                statusColor = 'text-red-600';
                              } else {
                                status = 'Alto';
                                statusColor = 'text-yellow-600';
                              }
                            }

                            return (
                              <div className={`absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-medium ${statusColor}`}>
                                {status}
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                    <select
                      name="thiamine_unit"
                      value={diagnosticFormData.currentLabs.thiamine_unit || 'nmol/L'}
                      onChange={(e) => setDiagnosticFormData(prev => ({
                        ...prev,
                        currentLabs: {
                          ...prev.currentLabs,
                          thiamine_unit: e.target.value
                        }
                      }))}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-[#5A98D6] focus:ring-[#5A98D6] sm:text-sm"
                    >
                      <option value="nmol/L">nmol/L</option>
                      <option value="ng/mL">ng/mL</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Valores de referencia: {(diagnosticFormData.currentLabs.thiamine_unit || 'nmol/L') === 'ng/mL' ? '21-54 ng/mL' : '70-180 nmol/L'}
                  </p>
                  <p className="mt-1 text-xs text-blue-600 italic">
                    No se registró tiamina en el Módulo 1. Ingrese el valor actual si está disponible.
                  </p>
                </div>
              )}
            </div>
          </div>

          {Object.entries(diagnosticFormData.currentLabs).map(([electrolyte, value]) => {
            const initial = stableInitialData[`lab_${electrolyte}`];
            if (value && initial) {
              const current = parseFloat(value);
              const initialValue = parseFloat(initial);
              const percentChange = ((initialValue - current) / initialValue) * 100;
              const isLow = current < initialValue;

              if (isLow && percentChange > 10) {
                return (
                  <div key={electrolyte} className="mt-4 p-4 border rounded-md bg-yellow-50">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Síntomas de deficiencia de {electrolyte === 'potassium' ? 'Potasio' : 
                                                  electrolyte === 'phosphorus' ? 'Fósforo' : 
                                                  electrolyte === 'magnesium' ? 'Magnesio' : 
                                                  electrolyte === 'sodium' ? 'Sodio' : 
                                                  electrolyte === 'thiamine' ? 'Tiamina' : 
                                                  electrolyte.charAt(0).toUpperCase() + electrolyte.slice(1)}
                    </h5>
                    <p className="text-sm text-blue-700 mb-3 italic">
                      Por favor, seleccione uno o más de los signos o síntomas observados en el paciente que puedan estar asociados a alteraciones electrolíticas en el síndrome de realimentación severo.
                    </p>
                    <div className="space-y-2">
                      {symptomsList[electrolyte].map(symptom => (
                        <div key={symptom} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`${electrolyte}-${symptom}`}
                            checked={diagnosticFormData.symptoms[electrolyte].includes(symptom)}
                            onChange={() => handleSymptomToggle(electrolyte, symptom)}
                            className="h-4 w-4 text-[#5A98D6] focus:ring-[#5A98D6] border-gray-300 rounded"
                          />
                          <label htmlFor={`${electrolyte}-${symptom}`} className="ml-2 text-sm text-gray-700">
                            {symptom}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            }
            return null;
          })}

          {/* Síntomas de tiamina cuando está baja */}
          {(() => {
            let showThiamineSymptoms = false;
            let thiamineSource = '';
            let thiamineValue = '';
            let thiamineUnit = '';

            // Verificar tiamina del Módulo 1
            if (stableInitialData.lab_thiamine_status === 'bajo' && stableInitialData.lab_thiamine && stableInitialData.lab_thiamine !== '' && stableInitialData.lab_thiamine !== null && stableInitialData.lab_thiamine !== undefined) {
              showThiamineSymptoms = true;
              thiamineSource = 'Módulo 1';
              thiamineValue = stableInitialData.lab_thiamine || 'N/A';
              thiamineUnit = stableInitialData.lab_thiamine_unit || 'nmol/L';
            } 
            // Si no hay tiamina en Módulo 1, verificar laboratorio actual
            else if ((!stableInitialData.lab_thiamine || stableInitialData.lab_thiamine === '' || stableInitialData.lab_thiamine === null || stableInitialData.lab_thiamine === undefined) && diagnosticFormData.currentLabs.thiamine) {
              const value = parseFloat(diagnosticFormData.currentLabs.thiamine);
              const unit = diagnosticFormData.currentLabs.thiamine_unit || 'nmol/L';

              if (!isNaN(value)) {
                const isLowThiamine = unit === 'ng/mL' ? value < 21 : value < 70;

                if (isLowThiamine) {
                  showThiamineSymptoms = true;
                  thiamineSource = 'Laboratorio Actual';
                  thiamineValue = diagnosticFormData.currentLabs.thiamine;
                  thiamineUnit = unit;
                }
              }
            }

            return showThiamineSymptoms ? (
              <div className="mt-4 p-4 border rounded-md bg-red-50 border-red-300">
                <h5 className="font-medium text-red-700 mb-2">
                  Síntomas de Deficiencia de Tiamina (Detectada en {thiamineSource})
                </h5>
                <p className="text-sm text-red-600 mb-3">
                  Valor de tiamina: <strong>{thiamineValue} {thiamineUnit}</strong> - Clasificado como: <strong>BAJO</strong>
                </p>
                <p className="text-sm text-blue-700 mb-3 italic">
                  Por favor, seleccione uno o más de los signos o síntomas observados en el paciente que puedan estar asociados a alteraciones electrolíticas en el síndrome de realimentación severo.
                </p>
                <div className="space-y-2">
                  {symptomsList.thiamine.map(symptom => (
                    <div key={symptom} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`thiamine-${symptom}`}
                        checked={diagnosticFormData.symptoms.thiamine.includes(symptom)}
                        onChange={() => handleSymptomToggle('thiamine', symptom)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`thiamine-${symptom}`} className="ml-2 text-sm text-gray-700">
                        {symptom}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h5 className="font-medium text-blue-800 mb-2">Confirmación de Diagnóstico</h5>
            <p className="text-sm text-blue-700 mb-3">
              ¿Los cambios en los niveles de electrolitos y síntomas o signos asociados ocurre dentro de los 5 días posteriores a reiniciar o incrementar sustancialmente el aporte energético?
            </p>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="confirmed"
                  value="yes"
                  checked={diagnosticFormData.confirmed === true}
                  onChange={(e) => setDiagnosticFormData(prev => ({...prev, confirmed: true}))}
                  className="h-4 w-4 text-[#5A98D6] focus:ring-[#5A98D6] border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Sí</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="confirmed"
                  value="no"
                  checked={diagnosticFormData.confirmed === false}
                  onChange={(e) => setDiagnosticFormData(prev => ({...prev, confirmed: false}))}
                  className="h-4 w-4 text-[#5A98D6] focus:ring-[#5A98D6] border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          <button
            onClick={calculateDiagnosis}
            disabled={diagnosticFormData.confirmed === null || diagnosticFormData.confirmed === undefined}
            className="mt-4 w-full bg-[#5A98D6] hover:bg-[#4A88C6] text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5A98D6] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Evaluar Diagnóstico
          </button>

          {diagnosticResult && (
            <div className={`mt-6 p-4 rounded-lg border-2 ${
              diagnosticResult.diagnostico.diagnostico.includes('SÍNDROME DE REALIMENTACIÓN') && diagnosticResult.diagnostico.temporalityCriteriaMet
                ? "bg-red-50 border-red-300"
                : diagnosticResult.diagnostico.diagnostico.includes('No se reúne el criterio')
                ? "bg-orange-50 border-orange-300"
                : "bg-green-50 border-green-300"
            }`}>
              <h4 className="text-lg font-semibold mb-2">Diagnóstico:</h4>
              <p className={`text-lg font-bold ${diagnosticResult.diagnostico.colorClass} mb-3`}>
                {diagnosticResult.diagnostico.diagnostico}
              </p>

              {!diagnosticResult.diagnostico.temporalityCriteriaMet && diagnosticResult.diagnostico.hasElectrolyteChanges && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Nota:</strong> Se encontraron disminuciones ≥10% en electrolitos (K, P, Mg) {diagnosticResult.diagnostico.hasOrganDysfunction && 'y/o disfunción orgánica'}, pero no se confirmó el criterio de temporalidad (5 días posteriores al reinicio/incremento del aporte energético).
                  </p>
                </div>
              )}

              {(Object.entries(diagnosticResult.diagnostico.sintomas).length > 0 || Object.entries(diagnosticResult.diagnostico.cambios).length > 0) && (
                <div className="mt-4">
                  <div className="mb-4">
                    <p className="font-medium mb-2">Análisis de Electrolitos y Criterios de RS:</p>

                    {/* Mostrar criterios cumplidos */}
                    {diagnosticResult.diagnostico.electrolytesWithDecline && diagnosticResult.diagnostico.electrolytesWithDecline.length > 0 && (
                      <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-medium text-yellow-800">
                          ✓ Criterio electrolítico cumplido: Disminución ≥10% en {diagnosticResult.diagnostico.electrolytesWithDecline.length} electrolito(s) principal(es)
                        </p>
                        <p className="text-xs text-yellow-700">
                          Electrolitos afectados: {diagnosticResult.diagnostico.electrolytesWithDecline.map(e => 
                            e === 'potassium' ? 'Potasio' : 
                            e === 'phosphorus' ? 'Fósforo' : 
                            e === 'magnesium' ? 'Magnesio' : e
                          ).join(', ')}
                        </p>
                      </div>
                    )}

                    {diagnosticResult.diagnostico.hasOrganDysfunction && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-800">
                          ✓ Disfunción orgánica identificada (criterio de severidad)
                        </p>
                      </div>
                    )}

                    {Object.entries(diagnosticResult.diagnostico.cambios).map(([electrolyte, data]) => {
                      const isMainElectrolyte = ['potassium', 'phosphorus', 'magnesium'].includes(electrolyte);
                      const meetsDeclineCriteria = data.percentChange >= 10 && data.isLow && isMainElectrolyte;

                      return (
                        <div key={electrolyte} className={`mb-2 p-2 rounded ${meetsDeclineCriteria ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                          <p className="font-medium text-sm">
                            {electrolyte === 'potassium' ? 'Potasio' : 
                             electrolyte === 'phosphorus' ? 'Fósforo' : 
                             electrolyte === 'magnesium' ? 'Magnesio' : 
                             electrolyte === 'sodium' ? 'Sodio' : 
                             electrolyte === 'thiamine' ? 'Tiamina' : 
                             electrolyte.charAt(0).toUpperCase() + electrolyte.slice(1)}:
                            {meetsDeclineCriteria && <span className="ml-2 text-yellow-600 font-bold">⚠️ Criterio RS</span>}
                          </p>
                          <ul className="text-sm space-y-1">
                            {electrolyte !== 'thiamine' && (
                              <>
                                <li>Valor basal: {data.initial.toFixed(1)}</li>
                                <li>Valor actual: {data.current.toFixed(1)}</li>
                                <li>Cambio desde basal: {data.percentChange.toFixed(1)}%</li>
                              </>
                            )}
                            {electrolyte === 'thiamine' && (
                              <li>Valor: {data.initial.toFixed(1)} {data.unit} - <span className="text-red-600 font-medium">DEFICIENCIA</span></li>
                            )}
                            {data.isLow && data.percentChange >= 10 && isMainElectrolyte && (
                              <li className={`font-medium ${
                                data.percentChange > 30 ? "text-red-600" :
                                data.percentChange >= 20 ? "text-orange-600" :
                                "text-yellow-600"
                              }`}>
                                Disminución {
                                  data.percentChange > 30 ? "severa (>30%)" :
                                  data.percentChange >= 20 ? "moderada (20-30%)" :
                                  "leve (10-20%)"
                                } - Cumple criterio RS
                              </li>
                            )}
                            {data.hasSymptoms && (
                              <li className="text-red-600 font-medium">
                                ✓ Con síntomas/disfunción orgánica asociada
                              </li>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(diagnosticResult.diagnostico.sintomas).length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Manifestaciones clínicas identificadas:</p>
                      {Object.entries(diagnosticResult.diagnostico.sintomas).map(([electrolyte, symptoms]) => (
                        <div key={electrolyte} className="mb-2">
                          <p className="font-medium text-sm">{electrolyte === 'potassium' ? 'Potasio' : 
                                                               electrolyte === 'phosphorus' ? 'Fósforo' : 
                                                               electrolyte === 'magnesium' ? 'Magnesio' : 
                                                               electrolyte === 'sodium' ? 'Sodio' : 
                                                               electrolyte === 'thiamine' ? 'Tiamina' : 
                                                               electrolyte.charAt(0).toUpperCase() + electrolyte.slice(1)}:</p>
                          <ul className="list-disc list-inside text-sm">
                            {symptoms.map((symptom, index) => (
                              <li key={index}>{symptom}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
});

export default RefeedingSyndromeCalculator;