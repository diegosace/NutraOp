import React, { useState, useEffect, useCallback, useMemo } from 'react';
import RefeedingSyndromeCalculator from './RefeedingSyndromeCalculator';

// --- Componente: CalfCircumferenceScreening (Implementado) ---
const CalfCircumferenceScreening = ({ onCalfResult, initialData = {}, savedResult = null }) => {
  const [ccInput, setCcInput] = useState(savedResult?.ccInput || '');
  const [ethnicity, setEthnicity] = useState(savedResult?.ethnicity || 'Total'); 
  const [lowBmiConcern, setLowBmiConcern] = useState(savedResult?.lowBmiConcern || false);
  const [result, setResult] = useState(savedResult?.result || {
    adjustedCC: null, classification: '', interpretation: '',
    adjustmentFactor: 0, adjustmentNote: '',
  });
  const [showLowBmiSection, setShowLowBmiSection] = useState(false);
  const [isLowBmiCheckboxDisabled, setIsLowBmiCheckboxDisabled] = useState(true);

  const patientSex = initialData.sex || 'hombre'; 
  const patientAge = parseInt(initialData.age, 10);
  const patientBmi = parseFloat(initialData.bmi);

  useEffect(() => {
    if (!isNaN(patientBmi) && patientBmi < 18.5) {
      setShowLowBmiSection(true);
      setIsLowBmiCheckboxDisabled(false);
    } else {
      setShowLowBmiSection(false);
      setIsLowBmiCheckboxDisabled(true);
      setLowBmiConcern(false); 
    }
  }, [patientBmi]);

  const calculateMuscleScreening = () => {
    const cc_medida = parseFloat(ccInput);
    let errorMessages = [];
    if (isNaN(cc_medida) || cc_medida <= 0) { 
      errorMessages.push("Circunferencia de pantorrilla inválida."); 
    }
    if (isNaN(patientAge) || patientAge <= 0) { 
      errorMessages.push("Edad del paciente inválida (desde Datos Generales)."); 
    }
    if (isNaN(patientBmi) || patientBmi <= 0) { 
      errorMessages.push("IMC del paciente inválido (desde Datos Generales)."); 
    }

    // Early return if there are validation errors
    if (errorMessages.length > 0) {
      setResult({
        adjustedCC: null, 
        classification: 'Error', 
        interpretation: `Error en datos: ${errorMessages.join(' ')} Asegúrese que los datos en Módulo 1 estén completos.`,
        adjustmentFactor: 0, 
        adjustmentNote: ''
      });
      if (onCalfResult) {
        onCalfResult({ classification: null, adjustedCC: null });
      }
      return;
    }

    if (errorMessages.length > 0) {
      setResult({
        adjustedCC: null, 
        classification: 'Error', 
        interpretation: `Error en datos: ${errorMessages.join(' ')} Asegúrese que los datos en Módulo 1 estén completos.`,
        adjustmentFactor: 0, 
        adjustmentNote: ''
      });
      if (onCalfResult) {
        onCalfResult({ classification: null, adjustedCC: null });
      }
      return;
    }
    let adjustmentFactor = 0; let adjustmentNote = "";
    if (patientBmi < 18.5) { if (lowBmiConcern) { adjustmentFactor = 0; adjustmentNote = "(No se aplica ajuste +4cm por condición clínica/pérdida de peso indicada para IMC bajo)"; } else { adjustmentFactor = 4.0; adjustmentNote = "(Ajuste +4cm para IMC bajo, asumiendo ausencia de condición relevante)"; } } 
    else if (patientBmi >= 18.5 && patientBmi <= 24.9) { adjustmentFactor = 0; adjustmentNote = "(IMC Normal, sin ajuste)"; } 
    else if (patientBmi >= 25 && patientBmi <= 29.9) { adjustmentFactor = -3.0; adjustmentNote = "(Ajuste por sobrepeso)"; } 
    else if (patientBmi >= 30 && patientBmi <= 39.9) { adjustmentFactor = -7.0; adjustmentNote = "(Ajuste por obesidad)"; } 
    else if (patientBmi >= 40) { adjustmentFactor = -12.0; adjustmentNote = "(Ajuste por obesidad severa)"; }
    let adjustedCC = cc_medida + adjustmentFactor; adjustedCC = Math.round(adjustedCC * 10) / 10;
    let cutoff_1SD, cutoff_2SD;
    if (patientSex === 'hombre' || patientSex === 'male') { if (ethnicity === 'MA') { cutoff_1SD = 33; cutoff_2SD = 31; } else { cutoff_1SD = 34; cutoff_2SD = 32; } } 
    else { if (ethnicity === 'MA' || ethnicity === 'OTHR') { cutoff_1SD = 32; cutoff_2SD = 30; } else { cutoff_1SD = 33; cutoff_2SD = 31; } }
    let classification = "", interpretation = "";
    if (adjustedCC >= cutoff_1SD) { classification = "Normal"; interpretation = `Estimación de masa muscular normal (CP ajustada: ${adjustedCC.toFixed(1)} cm). Continuar estilo de vida saludable.`; } 
    else if (adjustedCC < cutoff_1SD && adjustedCC >= cutoff_2SD) { classification = "Moderadamente Baja"; interpretation = `Estimación de masa muscular moderadamente baja (CP ajustada: ${adjustedCC.toFixed(1)} cm, umbral: ${cutoff_1SD} cm). Se recomienda evaluación médica más completa para valorar posible sarcopenia (ej. fuerza, rendimiento, DXA/BIA).`; } 
    else { classification = "Severamente Baja"; interpretation = `Estimación de masa muscular severamente baja (CP ajustada: ${adjustedCC.toFixed(1)} cm, umbral: ${cutoff_2SD} cm). Urge evaluación médica completa para confirmar posible sarcopenia.`; }
    const completeResult = { adjustedCC, classification, interpretation, adjustmentFactor, adjustmentNote };
    setResult(completeResult);
    if (onCalfResult) onCalfResult({ 
      classification, 
      adjustedCC,
      ccInput,
      ethnicity,
      lowBmiConcern,
      result: completeResult
    }); // Enviar resultado completo al padre
  };
  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  return ( <div className="p-4 sm:p-5 bg-white rounded-b-lg shadow-md animate-fadeIn border border-t-0 border-gray-200"> <h4 className="text-lg font-semibold text-indigo-700 mb-4">Cribado de Masa Muscular (Circ. Pantorrilla)</h4> <p className="text-xs text-gray-600 mb-3">Estimación ajustada por IMC, edad, etnia/raza y condición clínica. Los datos de Sexo, Edad e IMC se toman del Módulo 1.</p> <div className="space-y-4"> <div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-xs text-gray-700"> <p>Sexo: <strong className="text-indigo-600">{initialData.sex === 'male' ? 'Hombre' : (initialData.sex === 'female' ? 'Mujer' : 'N/A')}</strong></p> <p>Edad: <strong className="text-indigo-600">{initialData.age || 'N/A'}</strong> años</p> <p>IMC: <strong className="text-indigo-600">{initialData.bmi || 'N/A'}</strong> kg/m²</p> </div> <div> <label htmlFor="cc_input_calf" className="block text-sm font-medium text-gray-700 mb-1">Circunferencia de Pantorrilla (cm):</label> <input type="number" id="cc_input_calf" value={ccInput} onChange={(e) => setCcInput(e.target.value)} step="0.1" className={commonInputClass} placeholder="Ej: 35.5" /> </div> <div> <label htmlFor="ethnicity_calf" className="block text-sm font-medium text-gray-700 mb-1">Etnia/Raza:</label> <select id="ethnicity_calf" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className={commonInputClass}> <option value="Total">General / No especificado</option> <option value="NHW">Blanco no hispano (NHW)</option> <option value="NHB">Negro no hispano (NHB)</option> <option value="MA">Mexicano Americano (MA)</option> <option value="OTHR">Otro (OTHR)</option> </select> </div> {showLowBmiSection && ( <div className="flex items-start p-3 bg-amber-50 rounded-md border border-amber-200"> <div className="flex items-center h-5"> <input id="lowBmiClinicalConcern_calf" name="lowBmiClinicalConcern" type="checkbox" checked={lowBmiConcern} onChange={(e) => setLowBmiConcern(e.target.checked)} disabled={isLowBmiCheckboxDisabled} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded disabled:bg-gray-200 disabled:cursor-not-allowed" /> </div> <div className="ml-3 text-sm"> <label htmlFor="lowBmiClinicalConcern_calf" className={`font-medium ${isLowBmiCheckboxDisabled ? 'text-gray-400' : 'text-gray-700'}`}> El IMC es {'<'} 18.5 kg/m². Marcar si hay pérdida de peso/músculo o condición clínica relevante. </label> <p className="text-xs text-gray-500">Si se marca, no se aplicará ajuste +4cm a CP, para evitar enmascarar posible baja masa muscular.</p> </div> </div> )} <button onClick={calculateMuscleScreening} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out"> Calcular Estimación de Masa Muscular </button> </div> {result.classification && result.classification !== 'Error' && ( <div className="mt-6 pt-4 border-t border-gray-200"> <h3 className="text-lg font-semibold text-indigo-700 mb-3">Resultado del Cribado:</h3> <div className="bg-indigo-50 p-3 rounded-lg shadow space-y-1 text-sm text-gray-800"> <p>Circ. Pantorrilla Medida: <strong className="text-indigo-600">{ccInput ? parseFloat(ccInput).toFixed(1) : 'N/A'} cm</strong></p> <p>Factor de Ajuste por IMC: <strong className="text-indigo-600">{result.adjustmentFactor.toFixed(1)} cm</strong> <span className="text-xs text-gray-500">{result.adjustmentNote}</span></p> <p>Circ. Pantorrilla Ajustada: <strong className="text-indigo-600">{result.adjustedCC ? result.adjustedCC.toFixed(1) : 'N/A'} cm</strong></p> <p className="text-md">Clasificación de Masa Muscular: <strong className={`ml-1 ${ result.classification === "Normal" ? "text-green-600" : result.classification === "Moderadamente Baja" ? "text-orange-500" : result.classification === "Severamente Baja" ? "text-red-600" : "text-gray-700" }`}> {result.classification} </strong> </p> </div> <div className="mt-3 bg-gray-50 p-3 rounded-md text-xs text-gray-700"> <p className="font-semibold mb-1">Interpretación y Sugerencias:</p> <p>{result.interpretation}</p> </div> </div> )} {result.classification === 'Error' && ( <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{result.interpretation}</p> )} <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-md text-xs text-amber-700"> <p><strong>Importante:</strong> Esta calculadora es un método de <strong>cribado</strong> y NO diagnostica sarcopenia. Un diagnóstico definitivo requiere evaluación clínica completa.</p> <p className="mt-1">Puntos de corte y ajustes basados en Gonzalez et al., 2021 y otros consensos. Pueden variar para poblaciones específicas.</p> </div> </div> );
};

// --- Componente: NRSCalculator (Implementado) ---
const NRSCalculator = ({ onNRSResult, initialData = {}, savedResult = null }) => { 
  const [reducedIntake, setReducedIntake] = useState(() => {
    if (savedResult?.details?.reducedIntake) return savedResult.details.reducedIntake;
    // Inferir valor inicial basado en recentIntakePercentage
    switch(initialData.recentIntakePercentage) {
      case '0-24': return 'intake_0_25';
      case '25-49': return 'intake_25_50';
      case '50-75': return 'intake_50_75';
      default: return 'normal';
    }
  });
  const [diseaseSeverity, setDiseaseSeverity] = useState(savedResult?.details?.diseaseSeverity || '0'); 
  const [nrsScore, setNrsScore] = useState(savedResult?.score || null);

  // Actualizar cuando cambie recentIntakePercentage en initialData
  useEffect(() => {
    switch(initialData.recentIntakePercentage) {
      case '0-24':
        setReducedIntake('intake_0_25');
        break;
      case '25-49':
        setReducedIntake('intake_25_50');
        break;
      case '50-75':
        setReducedIntake('intake_50_75');
        break;
      default:
        setReducedIntake('normal');
    }
  }, [initialData.recentIntakePercentage]); const [nrsRiskLevel, setNrsRiskLevel] = useState(savedResult?.riskLevel || ''); 
  const [nrsRecommendation, setNrsRecommendation] = useState(savedResult?.recommendation || ''); 
  const [nutritionalStatusPointsDisplay, setNutritionalStatusPointsDisplay] = useState(savedResult?.details?.nutritionalStatusPoints || 0); 
  const [diseaseSeverityPointsDisplay, setDiseaseSeverityPointsDisplay] = useState(savedResult?.details?.diseaseSeverityPoints || 0); 
  const [agePointsDisplay, setAgePointsDisplay] = useState(savedResult?.details?.agePoint || 0);
  const calculateNRS = () => { const age = parseInt(initialData.age, 10); const bmi = parseFloat(initialData.bmi); const loss1m = parseFloat(initialData.loss1m_percent); const loss2m = parseFloat(initialData.loss2m_percent); const loss3m = parseFloat(initialData.loss3m_percent); let currentNutritionalStatusPoints = 0; if (reducedIntake === 'intake_0_25') { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 3); } else if (reducedIntake === 'intake_25_50') { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 2); } else if (reducedIntake === 'intake_50_75') { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 1); } if (!isNaN(bmi)) { if (bmi < 18.5) { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 3); } else if (bmi >= 18.5 && bmi < 20.5) { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 2); } } if (!isNaN(loss1m) && loss1m > 5) { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 3); } else if (!isNaN(loss3m) && loss3m > 15) { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 3); } else if (!isNaN(loss2m) && loss2m > 5) { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 2); } else if (!isNaN(loss3m) && loss3m > 5) { currentNutritionalStatusPoints = Math.max(currentNutritionalStatusPoints, 1); } setNutritionalStatusPointsDisplay(currentNutritionalStatusPoints); const currentDiseaseSeverityPoints = parseInt(diseaseSeverity, 10); setDiseaseSeverityPointsDisplay(currentDiseaseSeverityPoints); let currentAgePoint = 0; if (!isNaN(age) && age >= 70) { currentAgePoint = 1; } setAgePointsDisplay(currentAgePoint); const totalScore = currentNutritionalStatusPoints + currentDiseaseSeverityPoints + currentAgePoint; setNrsScore(totalScore); let riskLevel = '', recommendation = ''; if (totalScore <= 3) { riskLevel = "Bajo riesgo"; recommendation = "Reevaluar a intervalos semanales."; } else if (totalScore === 4) { riskLevel = "En riesgo"; recommendation = "Iniciar plan de atención nutricional (alimentos, suplementos orales, alimentación por sonda y/o nutrición parenteral según corresponda)."; } else if (totalScore >= 5 && totalScore <= 7) { riskLevel = "Alto riesgo"; recommendation = "Iniciar un plan de atención nutricional de intervención temprana."; } else if (totalScore > 7) { riskLevel = "Alto riesgo (Score > 7)"; recommendation = "Puntuación muy alta, iniciar plan de atención nutricional de intervención temprana y revisar urgentemente."; } else { riskLevel = "Puntuación inválida"; recommendation = "Revisar datos ingresados."; } setNrsRiskLevel(riskLevel); setNrsRecommendation(recommendation); if (onNRSResult) { onNRSResult({ score: totalScore, riskLevel, recommendation, details: { nutritionalStatusPoints: currentNutritionalStatusPoints, diseaseSeverityPoints: currentDiseaseSeverityPoints, agePoint: currentAgePoint, reducedIntake, diseaseSeverity, } }); } };
  const intakeOptions = [ { value: 'normal', label: 'Normal / Sin cambios significativos' }, { value: 'intake_50_75', label: 'Ingesta 50-75% de lo habitual en la última semana (+1 pt)' }, { value: 'intake_25_50', label: 'Ingesta 25-50% de lo habitual en la última semana (+2 pts)' }, { value: 'intake_0_25', label: 'Ingesta 0-25% de lo habitual en la última semana (+3 pts)' }, ];
  const diseaseSeverityOptions = [ { value: '0', label: 'Requerimientos normales (Score 0)' }, { value: '1', label: 'Leve (ej. Fractura cadera, crónicos con complicaciones agudas) (Score 1)' }, { value: '2', label: 'Moderada (ej. Cirugía abdominal mayor, ACV, Neumonía severa) (Score 2)' }, { value: '3', label: 'Severa (ej. Trauma craneoencefálico, UCI con APACHE >10) (Score 3)' }, ];
  return ( <div className="p-4 sm:p-5 bg-white rounded-b-lg shadow-md animate-fadeIn border border-t-0 border-gray-200"><h4 className="text-lg font-semibold text-sky-700 mb-4">Calculadora NRS-2002 (Detallada)</h4><div className="space-y-5"><div className="p-3 border border-gray-200 rounded-md bg-gray-50 text-xs text-gray-600 space-y-1"><p><strong>Datos de Antropometría (desde Módulo 1):</strong></p><p>- IMC: <strong>{initialData.bmi || 'N/A'}</strong> kg/m²</p><p>- % Pérdida Peso (1m): <strong>{initialData.loss1m_percent ? initialData.loss1m_percent + '%' : 'N/A'}</strong></p><p>- % Pérdida Peso (2m): <strong>{initialData.loss2m_percent ? initialData.loss2m_percent + '%' : 'N/A'}</strong></p><p>- % Pérdida Peso (3m): <strong>{initialData.loss3m_percent ? initialData.loss3m_percent + '%' : 'N/A'}</strong></p><p>- Edad: <strong>{initialData.age || 'N/A'}</strong> años</p></div><fieldset className="p-4 border border-sky-200 rounded-md bg-sky-50/70"><legend className="text-md font-semibold text-sky-600 mb-2 px-1">1. Deterioro del Estado Nutricional</legend><p className="text-xs text-gray-500 mb-3">El score de este apartado se basará en el IMC, % de pérdida de peso (ver arriba) y la reducción de ingesta que seleccione abajo. Se tomará el criterio más severo.</p><div><label htmlFor="nrs-reducedIntake" className="block text-sm font-medium text-gray-700 mb-1">Reducción de Ingesta Dietética (última semana):</label><select id="nrs-reducedIntake" name="reducedIntake" value={reducedIntake} onChange={(e) => setReducedIntake(e.target.value)} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">{intakeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div></fieldset><fieldset className="p-4 border border-sky-200 rounded-md bg-sky-50/70"><legend className="text-md font-semibold text-sky-600 mb-2 px-1">2. Gravedad de la Enfermedad (Estrés Metabólico)</legend><div><label htmlFor="nrs-diseaseSeverity" className="block text-sm font-medium text-gray-700 mb-1">Seleccione el grado de severidad:</label><select id="nrs-diseaseSeverity" name="diseaseSeverity" value={diseaseSeverity} onChange={(e) => setDiseaseSeverity(e.target.value)} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">{diseaseSeverityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div></fieldset><p className="text-xs text-gray-600 px-1"><strong>3. Ajuste por Edad:</strong> Se sumará 1 punto automáticamente si la edad (desde Datos Generales) es ≥ 70 años.</p></div><button onClick={calculateNRS} className="mt-6 w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50">Calcular NRS-2002</button>{nrsScore !== null && (<div className={`mt-6 p-4 border-2 rounded-md bg-opacity-80 ${nrsScore >= 5 ? 'border-red-400 bg-red-50' : (nrsScore === 4 ? 'border-yellow-400 bg-yellow-50' : 'border-green-400 bg-green-50')}`}><h4 className={`text-md font-semibold mb-2 ${nrsScore >= 5 ? 'text-red-700' : (nrsScore === 4 ? 'text-yellow-700' : 'text-green-700')}`}>Resultado NRS-2002:</h4><div className="text-sm space-y-1 mb-2"><p>Puntos por Deterioro Nutricional: <strong>{nutritionalStatusPointsDisplay}</strong></p><p>Puntos por Gravedad de Enfermedad: <strong>{diseaseSeverityPointsDisplay}</strong></p><p>Puntos por Edad (≥70 años): <strong>{agePointsDisplay}</strong></p></div><p className={`text-2xl font-bold ${nrsScore >= 5 ? 'text-red-600' : (nrsScore === 4 ? 'text-yellow-600' : 'text-green-600')}`}>Score Total: {nrsScore}</p><p className={`text-sm mt-1 font-semibold ${nrsScore >= 5 ? 'text-red-700' : (nrsScore === 4 ? 'text-yellow-700' : 'text-green-700')}`}>Nivel de Riesgo: {nrsRiskLevel}</p><div className="mt-2 pt-2 border-t border-gray-300"><p className="text-xs font-semibold text-gray-700">Recomendación:</p><p className="text-xs text-gray-600">{nrsRecommendation}</p></div></div>)}</div> );
};

// --- Componente: NutricScoreCalculator (Implementado) ---
const NutricScoreCalculator = ({ onNutricResult, initialData = {} }) => {
  const [nutricFormData, setNutricFormData] = useState({ apache: '0', sofa: '0', comorbidities: '0', daysInHospital: '0', il6: '', });
  const [agePoints, setAgePoints] = useState(0); const [ageDisplay, setAgeDisplay] = useState('Ingrese edad del paciente');
  const [nutricScore, setNutricScore] = useState(null); const [scoreType, setScoreType] = useState('mNUTRIC');
  const [nutricInterpretation, setNutricInterpretation] = useState(''); const [nutricClinicalImplication, setNutricClinicalImplication] = useState('');
  useEffect(() => { const age = parseInt(initialData.age, 10); if (!isNaN(age) && age >= 0) { let points = 0; if (age < 50) { points = 0; } else if (age >= 50 && age < 75) { points = 1; } else if (age >= 75) { points = 2; } setAgePoints(points); setAgeDisplay(`${initialData.age} años (${points} puntos)`); } else { setAgePoints(0); setAgeDisplay("Edad no válida o no ingresada en Datos Generales"); } }, [initialData.age]);
  const handleNutricInputChange = (e) => { const { name, value } = e.target; setNutricFormData(prev => ({ ...prev, [name]: value })); };
  const calculateNutric = () => { const patientAge = parseInt(initialData.age, 10); if (isNaN(patientAge) || patientAge < 0) { console.warn("Ingrese una edad válida en la sección 'Datos Generales' para calcular NUTRIC."); setNutricScore(null); setNutricInterpretation(''); setNutricClinicalImplication(''); return; } let currentAgePoints = 0; if (patientAge < 50) currentAgePoints = 0; else if (patientAge >= 50 && patientAge < 75) currentAgePoints = 1; else if (patientAge >= 75) currentAgePoints = 2; const apacheP = parseInt(nutricFormData.apache, 10); const sofaP = parseInt(nutricFormData.sofa, 10); const comorbiditiesP = parseInt(nutricFormData.comorbidities, 10); const daysInHospitalP = parseInt(nutricFormData.daysInHospital, 10); let il6P = 0; let currentScoreType = 'mNUTRIC'; if (nutricFormData.il6 !== '') { il6P = parseInt(nutricFormData.il6, 10); currentScoreType = 'NUTRIC'; } setScoreType(currentScoreType); const totalScore = currentAgePoints + apacheP + sofaP + comorbiditiesP + daysInHospitalP + il6P; setNutricScore(totalScore); let interpretation = "", clinicalImplication = ""; if (currentScoreType === 'NUTRIC') { if (totalScore <= 5) { interpretation = "Bajo Riesgo"; clinicalImplication = "La nutrición agresiva puede no ser tan crítica a corto plazo."; } else { interpretation = "Alto Riesgo"; clinicalImplication = "Mayor probabilidad de beneficio de terapia nutricional agresiva/óptima."; } } else { if (totalScore <= 4) { interpretation = "Bajo Riesgo"; clinicalImplication = "La nutrición agresiva puede no ser tan crítica a corto plazo."; } else { interpretation = "Alto Riesgo"; clinicalImplication = "Mayor probabilidad de beneficio de terapia nutricional agresiva/óptima."; } } setNutricInterpretation(interpretation); setNutricClinicalImplication(clinicalImplication); if (onNutricResult) { onNutricResult({ score: totalScore, type: currentScoreType, interpretation, clinicalImplication, agePoints: currentAgePoints, formData: nutricFormData }); } };
  const commonSelectClass = "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm";

return (
  <div className="p-4 sm:p-5 bg-white rounded-b-lg shadow-md animate-fadeIn border border-t-0 border-gray-200">
    <h4 className="text-lg font-semibold text-teal-700 mb-4">Calculadora NUTRIC / mNUTRIC Score</h4>
    <p className="text-xs text-gray-600 mb-3">Población Diana: Pacientes adultos críticamente enfermos en UCI. La edad se toma de los "Datos Generales".</p>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Puntos por Edad (Automático):</label>
        <input 
          type="text" 
          value={ageDisplay} 
          readOnly 
          className={`${commonSelectClass} bg-gray-100 cursor-not-allowed`} 
        />
      </div>

      <div>
        <label htmlFor="nutric_apache" className="block text-sm font-medium text-gray-700">APACHE II Score:</label>
        <select 
          id="nutric_apache" 
          name="apache" 
          value={nutricFormData.apache} 
          onChange={handleNutricInputChange} 
          className={commonSelectClass}
        >
          <option value="0">{'<15 (0 puntos)'}</option>
          <option value="1">{'15 - <20 (1 punto)'}</option>
          <option value="2">{'20 - 28 (2 puntos)'}</option>
          <option value="3">{'>28 (3 puntos)'}</option>
        </select>
      </div>

      <div>
        <label htmlFor="nutric_sofa" className="block text-sm font-medium text-gray-700">SOFA Score (inicial):</label>
        <select 
          id="nutric_sofa" 
          name="sofa" 
          value={nutricFormData.sofa} 
          onChange={handleNutricInputChange} 
          className={commonSelectClass}
        >
          <option value="0">{'<6 (0 puntos)'}</option>
          <option value="1">{'6 - <10 (1 punto)'}</option>
          <option value="2">{'≥10 (2 puntos)'}</option>
        </select>
      </div>

      <div>
        <label htmlFor="nutric_comorbidities" className="block text-sm font-medium text-gray-700">Número de Comorbilidades:</label>
        <select 
          id="nutric_comorbidities" 
          name="comorbidities" 
          value={nutricFormData.comorbidities} 
          onChange={handleNutricInputChange} 
          className={commonSelectClass}
        >
          <option value="0">0-1 (0 puntos)</option>
          <option value="1">≥2 (1 punto)</option>
        </select>
      </div>

      <div>
        <label htmlFor="nutric_daysInHospital" className="block text-sm font-medium text-gray-700">Días en Hospital hasta Admisión en UCI:</label>
        <select 
          id="nutric_daysInHospital" 
          name="daysInHospital" 
          value={nutricFormData.daysInHospital} 
          onChange={handleNutricInputChange} 
          className={commonSelectClass}
        >
          <option value="0">{'0 - <1 (0 puntos)'}</option>
          <option value="1">{'≥1 (1 punto)'}</option>
        </select>
      </div>

      <div>
        <label htmlFor="nutric_il6" className="block text-sm font-medium text-gray-700">IL-6 (pg/mL) (Opcional):</label>
        <select 
          id="nutric_il6" 
          name="il6" 
          value={nutricFormData.il6} 
          onChange={handleNutricInputChange} 
          className={commonSelectClass}
        >
          <option value="">No disponible (Calcular mNUTRIC)</option>
          <option value="0">{'0 - <400 (0 puntos)'}</option>
          <option value="1">{'≥400 (1 punto)'}</option>
        </select>
      </div>
    </div>

    <button 
      onClick={calculateNutric} 
      className="mt-6 w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:```python
shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
    >
      Calcular {nutricFormData.il6 === '' ? 'mNUTRIC' : 'NUTRIC'}
    </button>

    {nutricScore !== null && (
      <div className={`mt-6 p-4 border-2 rounded-md bg-opacity-80 ${((scoreType === 'NUTRIC' && nutricScore >=6) || (scoreType === 'mNUTRIC' && nutricScore >=5)) ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'}`}>
        <h4 className={`text-md font-semibold mb-1 ${((scoreType === 'NUTRIC' && nutricScore >=6) || (scoreType === 'mNUTRIC' && nutricScore >=5)) ? 'text-red-700' : 'text-green-700'}`}>
          Resultados {scoreType} Score
        </h4>
        <p className="text-xs text-gray-600">Edad del paciente: {initialData.age || 'N/A'} años (Puntos: {agePoints})</p>
        <p className={`text-2xl font-bold ${((scoreType === 'NUTRIC' && nutricScore >=6) || (scoreType === 'mNUTRIC' && nutricScore >=5)) ? 'text-red-600' : 'text-green-600'}`}>
          Score Total: {nutricScore}
        </p>
        <p className={`text-sm mt-1 font-semibold ${((scoreType === 'NUTRIC' && nutricScore >=6) || (scoreType === 'mNUTRIC' && nutricScore >=5)) ? 'text-red-700' : 'text-green-700'}`}>
          Interpretación: {nutricInterpretation}
        </p>
        <div className="mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs font-semibold text-gray-700">Implicaciones Clínicas:</p>
          <p className="text-xs text-gray-600">{nutricClinicalImplication}</p>
        </div>
      </div>
    )}
  </div>
);
};

// --- Componente: AdvancedCaloriesCalculator (Implementado) ---
const AdvancedCaloriesCalculator = ({ onCaloriesResult, initialData = {}, savedResult = null }) => {
  const [formulaChoice, setFormulaChoice] = useState(savedResult?.formula || 'mifflin');
  const [results, setResults] = useState(savedResult?.allResults || []);
  const [averageBasal, setAverageBasal] = useState(savedResult?.averageBasal || null);
  const [anthropometricData, setAnthropometricData] = useState({
    gender: initialData.sex || 'male',
    weight: initialData.weight || '',
    height: initialData.height || '',
    age: initialData.age || '',
  });
  const [activityLevel, setActivityLevel] = useState(savedResult?.details?.activityLevel || '1.2');
  const [clinicalCondition, setClinicalCondition] = useState(savedResult?.details?.clinicalCondition || 'none');
  const [surgeryType, setSurgeryType] = useState(savedResult?.details?.surgeryType || 'minor');
  const [infectionSeverity, setInfectionSeverity] = useState(savedResult?.details?.infectionSeverity || 'mild');
  const [traumaType, setTraumaType] = useState(savedResult?.details?.traumaType || 'skeletal_mild');
  const [burnsSct, setBurnsSct] = useState(savedResult?.details?.burnsSct || '');
  const [feverTemp, setFeverTemp] = useState(savedResult?.details?.feverTemp || initialData.bodyTemperature || '');
  const [hospitalActivityFactor, setHospitalActivityFactor] = useState(savedResult?.details?.hospitalActivityFactor || '1.0');
  const [altitude, setAltitude] = useState(savedResult?.details?.altitude || '');
  const [etco2, setEtco2] = useState(savedResult?.details?.etco2 || '');
  const [volumenMinuto, setVolumenMinuto] = useState(savedResult?.details?.volumenMinuto || '');
  const [temperaturaCorporalWeir, setTemperaturaCorporalWeir] = useState(savedResult?.details?.temperaturaCorporalWeir || initialData.bodyTemperature || '37');
  const [indirectCalorimetryValue, setIndirectCalorimetryValue] = useState(savedResult?.details?.indirectCalorimetryValue || '');
  const [estimatedPb, setEstimatedPb] = useState(null);

  const [errors, setErrors] = useState({});

  // Efecto para restaurar resultados guardados
  useEffect(() => {
    if (savedResult) {
      if (savedResult.allResults) setResults(savedResult.allResults);
      if (savedResult.averageBasal) setAverageBasal(savedResult.averageBasal);
    }
  }, [savedResult]);

  // Calcular calorías no nutricionales
  const calculateNonNutritionalCalories = useCallback(() => {
    let total = 0;

    // Propofol
    if (initialData.hasPropofol && initialData.propofol_rate && initialData.propofol_duration) {
      const rate = parseFloat(initialData.propofol_rate);
      const duration = parseFloat(initialData.propofol_duration);
      total += rate * duration * 1.1; // 1.1 kcal/mL
    }

    // Dextrosa
    if (initialData.hasDextrose && initialData.dextrose_concentration && initialData.dextrose_volume) {
      const concentration = parseFloat(initialData.dextrose_concentration);
      const volume = parseFloat(initialData.dextrose_volume);
      total += (concentration / 100) * volume * 3.4; // 3.4 kcal/g
    }

    return total;
  }, [initialData.hasPropofol, initialData.propofol_rate, initialData.propofol_duration, 
      initialData.hasDextrose, initialData.dextrose_concentration, initialData.dextrose_volume]);

  const nonNutritionalCalories = useMemo(() => calculateNonNutritionalCalories(), [calculateNonNutritionalCalories]);

  useEffect(() => {
    setAnthropometricData(prev => ({
      ...prev,
      gender: initialData.sex || prev.gender || 'male',
      weight: initialData.weight || prev.weight || '',
      height: initialData.height || prev.height || '',
      age: initialData.age || prev.age || '',
    }));
  }, [initialData]);

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
      if (isNaN(h) || h <= 0) newErrors.height = "Altura inválida";
      if (isNaN(a) || a <= 0 || a > 120) newErrors.age = "Edad inválida";
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
    if (showForFormulas(['indirect_calorimetry'])) {
      const calorimetryVal = parseFloat(indirectCalorimetryValue);
      if (isNaN(calorimetryVal) || calorimetryVal <= 0) newErrors.indirectCalorimetryValue = "Valor de calorimetría inválido";
    }
    // Para compare_all_four, la calorimetría indirecta es opcional, no validar si está vacía

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    let calculatedResults = [];
    let basalValuesForAverage = [];

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
        original_getd: Math.round(tdee)
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
        original_getd: Math.round(tdee)
      });
      basalValuesForAverage.push(bmr);
    }

    if (showForFormulas(['simple_kcal_kg', 'compare_all_four'])) {
      const ree = simpleKcalKgREE(w);
      calculatedResults.push({
        name: `Simple (25 kcal/kg)`,
        ree: Math.round(ree),
        original_ree: Math.round(ree)
      });
      basalValuesForAverage.push(ree);
    }

    if (showForFormulas(['indirect_calorimetry', 'compare_all_four'])) {
      const calorimetryVal = parseFloat(indirectCalorimetryValue);
      // Solo incluir si tiene valor válido
      if (!isNaN(calorimetryVal) && calorimetryVal > 0) {
        calculatedResults.push({
          name: 'Calorimetría Indirecta',
          ree: Math.round(calorimetryVal),
          original_ree: Math.round(calorimetryVal),
          details: 'Valor medido por dispositivo de calorimetría indirecta'
        });
        basalValuesForAverage.push(calorimetryVal);
      }
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
          details: `VCO2: ${weirData.vco2.toFixed(1)} mL/min, PB: ${weirData.pb_used.toFixed(1)} mmHg, PH2O: ${weirData.ph2o.toFixed(1)} mmHg`
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
      const totalCaloriesNeeded = primaryResult.getd || primaryResult.ree;
      const adjustedCaloriesNeeded = Math.max(0, totalCaloriesNeeded - nonNutritionalCalories);

      onCaloriesResult({
        formula: formulaChoice,
        tmb: primaryResult.tmb,
        get: totalCaloriesNeeded,
        adjustedGet: adjustedCaloriesNeeded,
        nonNutritionalCalories: nonNutritionalCalories,
        details: { ...primaryResult.details, activityLevel, clinicalCondition, surgeryType, infectionSeverity, traumaType, burnsSct, feverTemp, hospitalActivityFactor, altitude, etco2, volumenMinuto, temperaturaCorporalWeir, indirectCalorimetryValue },
        allResults: calculatedResults,
        averageBasal: averageBasal,
      });
    }
  };
const commonInputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-sm";
  const commonLabelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md animate-fadeIn border border-gray-200">
      <h3 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-2">
        Calculadora de Gasto Energético Avanzada
      </h3>
      <p className="text-xs text-center text-gray-500 mb-4">
        Seleccione fórmula, ingrese datos y ajuste según necesidad.
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
<option value="indirect_calorimetry">Calorimetría Indirecta (REE medido)</option>
<option value="compare_mh">Comparar Mifflin y Harris</option>
<option value="compare_mhw">Comparar Mifflin, Harris y Weir</option>
<option value="compare_all_four">Comparar y Promediar Todas (incluye Calorimetría Indirecta si disponible)</option>
</select>
</div>

{showForFormulas(['indirect_calorimetry', 'compare_all_four']) && (
<div className="space-y-3 p-3 border rounded-md bg-blue-50">
<h4 className="text-md font-semibold text-blue-700">Calorimetría Indirecta</h4>
<div>
<label htmlFor="adv-indirect-calorimetry" className={commonLabelClass}>
Gasto Energético en Reposo Medido (kcal/día){showForFormulas(['compare_all_four']) ? ' (Opcional)' : ''}:
</label>
<input 
type="number" 
id="adv-indirect-calorimetry" 
name="indirectCalorimetryValue" 
value={indirectCalorimetryValue} 
onChange={(e) => setIndirectCalorimetryValue(e.target.value)} 
placeholder="Ej: 1800" 
min="1" 
step="1" 
className={commonInputClass}
/>
{errors.indirectCalorimetryValue && <p className="text-red-500 text-xs mt-1">{errors.indirectCalorimetryValue}</p>}
<p className="text-xs text-gray-500 mt-1">
{showForFormulas(['compare_all_four']) 
  ? 'Opcional: Si está disponible, se incluirá en la comparación y promedio.'
  : 'Ingrese el valor de REE obtenido mediante calorimetría indirecta.'
}
</p>
</div>
</div>
)}

{showForFormulas(['mifflin', 'harris', 'simple_kcal_kg', 'compare_mh', 'compare_mhw', 'compare_all_four']) && (
<div className="space-y-3 p-3 border rounded-md bg-slate-50">
<h4 className="text-md font-semibold text-slate-700">Datos Antropométricos</h4>
{showForFormulas(['mifflin', 'harris', 'compare_mh', 'compare_mhw', 'compare_all_four']) && (
<div>
<label htmlFor="adv-gender" className={commonLabelClass}>Género:</label>
<select 
id="adv-gender" 
name="gender" 
value={anthropometricData.gender} 
onChange={(e) => setAnthropometricData(p => ({...p, gender: e.target.value}))} 
className={commonInputClass}
>
<option value="male">Hombre</option>
<option value="female">Mujer</option>
</select>
</div>
)}
<div>
<label htmlFor="adv-weight" className={commonLabelClass}>Peso (kg):</label>
<input 
type="number" 
id="adv-weight" 
name="weight" 
value={anthropometricData.weight} 
onChange={(e) => setAnthropometricData(p => ({...p, weight: e.target.value}))} 
placeholder="Ej: 70" 
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
type="number" 
id="adv-height" 
name="height" 
value={anthropometricData.height} 
onChange={(e) => setAnthropometricData(p => ({...p, height: e.target.value}))} 
placeholder="Ej: 175" 
min="1" 
step="1" 
className={commonInputClass}
/>
{errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
</div>
<div>
<label htmlFor="adv-age" className={commonLabelClass}>Edad (años):</label>
<input 
type="number" 
id="adv-age" 
name="age" 
value={anthropometricData.age} 
onChange={(e) => setAnthropometricData(p => ({...p, age: e.target.value}))} 
placeholder="Ej: 30" 
min="1" 
max="120" 
step="1" 
className={commonInputClass}
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
<option value="polytrauma">Politraumatismo (~1.35)</option>
</select>
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
Temperatura Corporal (°C) (Factor Fiebre):
</label>
<input 
type="number" 
id="adv-fever-temp" 
value={feverTemp} 
onChange={(e)=>setFeverTemp(e.target.value)} 
placeholder="Ej: 38.5 (opcional)" 
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
placeholder="Ej: 37" 
min="30" 
max="45" 
step="0.1" 
className={commonInputClass}
/>
{errors.temperaturaCorporalWeir && <p className="text-red-500 text-xs mt-1">{errors.temperaturaCorporalWeir}</p>}
</div>
</div>
)}

<button 
type="button" 
onClick={handleSubmit} 
className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
>
Calcular Gasto Energético
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
Resultados Estimados
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
{res.details && (
<p className="text-xs text-gray-500 mt-1">{res.details}</p>
)}
</>
)}
</div>
))}
</div>

{/* Balance Calórico */}
          {nonNutritionalCalories > 0 && results.length > 0 && !results[0].error && (
            <div className="mt-4 p-4 border border-orange-300 rounded-md bg-orange-50">
              <h4 className="font-semibold text-orange-800 mb-2">Balance Calórico</h4>
              <div className="space-y-1 text-sm">
                <p>Necesidades Calóricas Totales: <strong className="text-orange-700">{results[0].getd || results[0].ree} kcal/día</strong></p>
                <p>Calorías No Nutricionales: <strong className="text-orange-600">-{nonNutritionalCalories.toFixed(1)} kcal/día</strong></p>
                <div className="border-t border-orange-200 pt-2 mt-2">
                  <p className="font-semibold">Calorías Nutricionales Requeridas: <strong className="text-orange-800">{Math.max(0, (results[0].getd || results[0].ree) - nonNutritionalCalories).toFixed(1)} kcal/día</strong></p>
                </div>
              </div>
            </div>
          )}

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

<style>{`
.error-message { 
color: #dc2626; 
font-size: 0.75rem; 
margin-top: 0.1rem; 
} 
.clinical-section, .infusion-section { 
border: 1px dashed #9ca3af; 
padding: 0.75rem; 
margin-top:1rem; 
border-radius: 0.375rem; 
background-color: #f8fafc; 
} 
.clinical-section h3, .infusion-section h3 { 
font-weight: 600; 
color: #374151; 
margin-bottom: 0.75rem; 
}
`}</style>
</div>
);
};

// --- Componente: AdvancedProteinCalculator (Actualizado para recibir riskAssessmentResults) ---
const AdvancedProteinCalculator = ({ onProteinResult, generalPatientData = {}, riskAssessmentResults = {}, savedResult = null }) => {
const [formData, setFormData] = useState({
peso: '', 
altura: '', 
sexo: 'masculino', 
estadoNutricional: 'bienNutrido', 
masaMuscular: 'normal',
faseEnfermedad: 'hospitalizacionGeneral',
quemaduras: false,
politraumatismo: false,
estadoRespiratorio: 'ingestaOralAdecuada',
rutaNutricion: 'oral',
});

const [calculatedData, setCalculatedData] = useState({
imc: null, ibw: null, abw: null,
primaryTargetValueText: '---', 
primaryTargetUnitText: 'g/kg/día',
primaryTargetTotalGramsText: '--- g/día', 
primaryTargetWeightBaseText: 'Base: ---',
primaryTargetSourceText: 'Fuente: ---', 
considerations: [],
otherRecommendationsHTMLStrings: [],
});

const [showConsiderations, setShowConsiderations] = useState(false);

// Estabilizar datos de entrada
const stablePatientData = useMemo(() => ({
  weight: generalPatientData.weight || '',
  height: generalPatientData.height || '',
  sex: generalPatientData.sex || 'masculino',
  diseasePhase: generalPatientData.diseasePhase || 'hospitalizacionGeneral',
  respiratoryStatus: generalPatientData.respiratoryStatus || 'ingestaOralAdecuada'
}), [
  generalPatientData.weight,
  generalPatientData.height,
  generalPatientData.sex,
  generalPatientData.diseasePhase,
  generalPatientData.respiratoryStatus
]);

useEffect(() => {
setFormData(prev => ({
...prev,
peso: stablePatientData.weight || prev.peso || '',
altura: stablePatientData.height || prev.altura || '',
sexo: stablePatientData.sex || prev.sexo|| 'masculino',
diseasePhase: stablePatientData.diseasePhase || prev.diseasePhase || 'hospitalizacionGeneral',
respiratoryStatus: stablePatientData.respiratoryStatus || prev.respiratoryStatus || 'ingestaOralAdecuada',
}));
}, [stablePatientData.weight, stablePatientData.height, stablePatientData.sex, stablePatientData.diseasePhase, stablePatientData.respiratoryStatus]);

// Crear referencias estables para los valores de riesgo usando useMemo
const riskValues = useMemo(() => ({
  nrsScore: riskAssessmentResults?.nrs?.score,
  glimDiagnosis: riskAssessmentResults?.glim?.diagnosis,
  calfClassification: riskAssessmentResults?.calfScreening?.classification
}), [
  riskAssessmentResults?.nrs?.score,
  riskAssessmentResults?.glim?.diagnosis,
  riskAssessmentResults?.calfScreening?.classification
]);

// Solo ejecutar cuando cambien los valores específicos de riesgo
useEffect(() => {
  let suggestedEstadoNutricional = 'bienNutrido';
  let suggestedMasaMuscular = 'normal';

  // Determinar estado nutricional basado en NRS-2002 primero
  if (typeof riskValues.nrsScore === 'number') {
    if (riskValues.nrsScore >= 3) {
      suggestedEstadoNutricional = 'riesgoNutricionalAlto';
    } else if (riskValues.nrsScore < 3) {
      suggestedEstadoNutricional = 'riesgoNutricionalBajo';
    }
  }

  // Si hay diagnóstico GLIM, tiene precedencia
  if (riskValues.glimDiagnosis && riskValues.glimDiagnosis.includes("Malnutrición diagnosticada")) {
    suggestedEstadoNutricional = 'desnutrido';
  }

  // Determinar masa muscular basado exclusivamente en el cribado de pantorrilla
  if (riskValues.calfClassification) {
    if (riskValues.calfClassification === "Severamente Baja") {
      suggestedMasaMuscular = 'bajaDetectada';
    } else if (riskValues.calfClassification === "Moderadamente Baja") {
      suggestedMasaMuscular = 'bajaDetectada';
    } else if (riskValues.calfClassification === "Normal") {
      suggestedMasaMuscular = 'normal';
    }
  }

  setFormData(prev => {
    // Solo actualizar si los valores han cambiado
    if (prev.estadoNutricional !== suggestedEstadoNutricional || prev.masaMuscular !== suggestedMasaMuscular) {
      return { 
        ...prev, 
        estadoNutricional: suggestedEstadoNutricional,
        masaMuscular: suggestedMasaMuscular 
      };
    }
    return prev;
  });
}, [riskValues.nrsScore, riskValues.glimDiagnosis, riskValues.calfClassification]);

useEffect(() => {
const pesoKg = parseFloat(formData.peso);
const alturaCm = parseFloat(formData.altura);
const sexoVal = formData.sexo;
let imcVal = null, ibwVal = null, abwVal = null;
if (pesoKg > 0 && alturaCm > 0) {
const alturaM = alturaCm / 100;
imcVal = pesoKg / (alturaM * alturaM);
const alturaPulgadas = alturaCm / 2.54;
if (alturaPulgadas > 60) { ibwVal = (sexoVal === 'masculino' ? 50 : 45.5) + 2.3 * (alturaPulgadas - 60); } 
else { ibwVal = sexoVal === 'masculino' ? 50 : 45.5; }
ibwVal = ibwVal > 0 ? ibwVal : null;
if (ibwVal && pesoKg > (ibwVal * 1.20)) { abwVal = ibwVal + 0.4 * (pesoKg - ibwVal); } 
else if (ibwVal) { abwVal = pesoKg; }
}
setCalculatedData(prev => ({ ...prev, imc: imcVal, ibw: ibwVal, abw: abwVal ? abwVal : (pesoKg > 0 ? pesoKg : null) }));
}, [formData.peso, formData.altura, formData.sexo]);

const handleInputChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value, })); };
const toggleConsiderations = () => setShowConsiderations(prev => !prev);

const calculateProteinRequirements = () => {
const peso = parseFloat(formData.peso); // Usar el peso del estado local del formulario
    const imc = calculatedData.imc; 
    const ibw = calculatedData.ibw;
    // Usar los datos clínicos de generalPatientData
    const currentDiseasePhase = generalPatientData.diseasePhase || formData.faseEnfermedad;
    // const currentRespiratoryStatus = generalPatientData.respiratoryStatus || formData.estadoRespiratorio;
    // const currentNutritionRoute = generalPatientData.nutritionRoute || formData.rutaNutricion;


let pesoBaseCalculo = peso; let tipoPesoBase = "Peso Actual";
if (imc && imc >= 30) { if (calculatedData.abw) { pesoBaseCalculo = calculatedData.abw; tipoPesoBase = "Peso Corporal Ajustado (ABW)"; } else if (ibw) { pesoBaseCalculo = ibw; tipoPesoBase = "Peso Corporal Ideal (IBW)"; } }
if (isNaN(pesoBaseCalculo) || pesoBaseCalculo <= 0) { console.warn("Peso base para cálculo de proteínas no es válido."); setCalculatedData(prev => ({ ...prev, primaryTargetValueText: 'Error', primaryTargetTotalGramsText: 'Error en peso', considerations: ["Verifique los datos de peso, altura y sexo."]})) ; return; }
let targetRange = { value: "1.2 - 2.5", unit: `g/kg ${tipoPesoBase}`, baseWeight: pesoBaseCalculo, weightType: tipoPesoBase, source: "Guías Generales Críticos" };
let currentConsiderations = []; let otrasRecsStrings = []; 
if (imc && imc >= 30) { if (calculatedData.abw) { targetRange = { value: "1.3", unit: "g/kg Peso Ajustado", baseWeight: calculatedData.abw, weightType: "Peso Corporal Ajustado (ABW)", source: "Guía ESPEN (Obesidad)"}; if (ibw) { let aspenObesityTargetValue = (imc < 40) ? 2.0 : 2.5; let aspenPrefix = (imc < 40) ? "" : "Hasta "; let totalGramsAspen = (aspenObesityTargetValue * ibw).toFixed(0); otrasRecsStrings.push(`<p><strong>Obesidad (ASPEN/SCCM):</strong> ${aspenPrefix}${aspenObesityTargetValue.toFixed(1)} g/kg IBW/día. (IBW: ${ibw.toFixed(1)} kg). <br/>Objetivo Total: <span class="font-semibold text-emerald-700">${aspenPrefix}${totalGramsAspen} g/día.</span></p>`); } } else if (ibw) { let aspenTargetVal = (imc < 40) ? 2.0 : 2.5; let aspenPrefix = (imc < 40) ? "" : "Hasta "; targetRange = { value: `${aspenPrefix}${aspenTargetVal.toFixed(1)}`, unit: "g/kg Peso Ideal (IBW)", baseWeight: ibw, weightType: "Peso Corporal Ideal (IBW)", source: "Guía ASPEN/SCCM (Obesidad)" }; } currentConsiderations.push(`Paciente con obesidad (IMC ${imc ? imc.toFixed(1) : 'N/A'}). Las recomendaciones varían. Se usó ${tipoPesoBase}.`); } 
else if (formData.quemaduras || formData.politraumatismo) { targetRange = { value: "2.0 - 2.5", unit: "g/kg peso actual", baseWeight: peso, weightType: "Peso Actual", source: "Sugerencia ASPEN/SCCM (Trauma/Quemaduras)"}; } 
    // Usar currentDiseasePhase de generalPatientData
else if (currentDiseasePhase === 'agudaTemprana' || currentDiseasePhase === 'agudaTardia') { targetRange = { value: "~1.3 (progresivo)", unit: "g/kg peso actual", baseWeight: peso, weightType: "Peso Actual", source: "Guía ESPEN (UCI)"}; }

const finalTargetValueText = String(targetRange.value || '');
const finalTargetUnitText = String(targetRange.unit || 'g/kg/día');
let finalTotalGramsDisplay = "--- g/día"; 
let targetValueForCalc = finalTargetValueText.replace("~","").replace("(progresivo)","").replace("Hasta ","");
if (targetValueForCalc.includes('-')) { const parts = targetValueForCalc.split('-').map(s => parseFloat(s.trim())); if (!isNaN(parts[0]) && !isNaN(parts[1]) && targetRange.baseWeight && !isNaN(targetRange.baseWeight)) { finalTotalGramsDisplay = `${(parts[0] * targetRange.baseWeight).toFixed(0)} - ${(parts[1] * targetRange.baseWeight).toFixed(0)} g/día`; } } 
else { const val = parseFloat(targetValueForCalc); if (!isNaN(val) && targetRange.baseWeight && !isNaN(targetRange.baseWeight)) { let prefix = ""; if (finalTargetValueText.includes('~')) prefix = "~"; if (finalTargetValueText.includes('(progresivo)')) prefix = "~ (progresivo) "; if (finalTargetValueText.includes('Hasta ')) prefix = "Hasta "; finalTotalGramsDisplay = `${prefix}${(val * targetRange.baseWeight).toFixed(0)} g/día`; } }

if (targetRange.source !== "Guías Generales Críticos" && !(imc && imc >=30)) { let totalGramsGeneralMin = (1.2 * peso).toFixed(0); let totalGramsGeneralMax = (2.5 * peso).toFixed(0); otrasRecsStrings.push(`<p><strong>Rango General (Críticos, peso actual):</strong> 1.2 - 2.5 g/kg/día. <br/>Objetivo Total: <span class="font-semibold text-emerald-700">${totalGramsGeneralMin} - ${totalGramsGeneralMax} g/día.</span></p>`); }
if (formData.quemaduras || formData.politraumatismo) { currentConsiderations.push(`Para pacientes con <strong>${formData.quemaduras ? "quemaduras" : ""}${formData.quemaduras && formData.politraumatismo ? " y " : ""}${formData.politraumatismo ? "politraumatismos" : ""}</strong>, las guías sugieren aporte proteico alto.`);}
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
if (onProteinResult) { onProteinResult({ target: targetRange, totalGrams: finalTotalGramsDisplay, considerations: currentConsiderations, otherRecs: otrasRecsStrings, formData: { ...formData, imc: calculatedData.imc, ibw: calculatedData.ibw, abw: calculatedData.abw } }); }
};

const commonInputClass = "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm";
const readOnlyInputStyle = commonInputClass + " bg-gray-100 cursor-not-allowed";
const infoTextStyle = "text-sm text-gray-600 bg-gray-50 p-2 border border-gray-200 rounded-md";

return (
<div className="p-4 sm:p-6 bg-white rounded-lg shadow-md animate-fadeIn border border-gray-200">
<h3 className="text-xl font-semibold text-emerald-700 mb-5">Calculadora de Aporte Proteico en Paciente Clínico</h3>
<div id="protein-adv-form" className="space-y-5"></div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
<div>
<label htmlFor="protein-adv-peso" className="block text-sm font-medium text-gray-700">Peso Actual (kg):</label>
<input type="number" name="peso" id="protein-adv-peso" value={formData.peso} readOnly className={readOnlyInputStyle} />
<p className="text-xs text-gray-500 mt-1">Tomado de Datos Generales.</p>
</div>
<div>
<label htmlFor="protein-adv-altura" className="block text-sm font-medium text-gray-700">Altura (cm):</label>
<input type="number" name="altura" id="protein-adv-altura" value={formData.altura} readOnly className={readOnlyInputStyle} />
<p className="text-xs text-gray-500 mt-1">Tomado de Datos Generales.</p>
</div>
<div>
<label htmlFor="protein-adv-sexo" className="block text-sm font-medium text-gray-700">Sexo Biológico:</label>
<input type="text" id="protein-adv-sexo" value={formData.sexo === 'male' ? 'Masculino' : 'Femenino'} readOnly className={readOnlyInputStyle} />
<p className="text-xs text-gray-500 mt-1">Tomado de Datos Generales.</p>
</div>
<div>
<label htmlFor="protein-adv-imc" className="block text-sm font-medium text-gray-700">IMC (kg/m2):</label>
<input type="text" id="protein-adv-imc" value={calculatedData.imc ? calculatedData.imc.toFixed(1) : '---'} readOnly className={readOnlyInputStyle} />
</div>
<div>
<label htmlFor="protein-adv-displayIBW" className="block text-sm font-medium text-gray-700">Peso Ideal (IBW) (kg):</label>
<input type="text" id="protein-adv-displayIBW" value={calculatedData.ibw ? calculatedData.ibw.toFixed(1) : '---'} readOnly className={readOnlyInputStyle} />
</div>
<div>
<label htmlFor="protein-adv-displayABW" className="block text-sm font-medium text-gray-700">Peso Ajustado (ABW) (kg):</label>
<input type="text" id="protein-adv-displayABW" value={calculatedData.abw ? calculatedData.abw.toFixed(1) : '---'} readOnly className={readOnlyInputStyle} />
</div>
</div>

        <div className="p-3 border rounded-md bg-slate-100">
            <p className={infoTextStyle}><strong className="text-slate-700">Fase Enfermedad (de Módulo 1):</strong> {generalPatientData.diseasePhase || 'No especificada'}</p>
            <p className={infoTextStyle}><strong className="text-slate-700">Estado Respiratorio/Ingesta (de Módulo 1):</strong> {generalPatientData.respiratoryStatus || 'No especificado'}</p>
            <p className={infoTextStyle}><strong className="text-slate-700">Ruta Nutrición (de Módulo 1):</strong> {generalPatientData.nutritionRoute || 'No especificada'}</p>
        </div>

        <div>
<label htmlFor="protein-adv-estadoNutricional" className="block text-sm font-medium text-gray-700">Estado Nutricional Basal/Riesgo:</label>
<select name="estadoNutricional" id="protein-adv-estadoNutricional" value={formData.estadoNutricional} onChange={handleInputChange} className={commonInputClass}>
<option value="bienNutrido">Bien Nutrido</option>
<option value="riesgoNutricionalBajo">Riesgo Nutricional Bajo</option>
<option value="riesgoNutricionalAlto">Riesgo Nutricional Alto</option>
<option value="desnutrido">Desnutrido</option>
</select>
<p className="text-xs text-gray-500 mt-1">Sugerido por calculadoras de riesgo. Ajustar según juicio clínico.</p>
</div>
        <div>
<label htmlFor="protein-adv-masaMuscular" className="block text-sm font-medium text-gray-700">Masa Muscular Basal (Sugerido por Cribado Pantorrilla):</label>
<select name="masaMuscular" id="protein-adv-masaMuscular" value={formData.masaMuscular} onChange={handleInputChange} className={commonInputClass}>
<option value="normal">Normal/No evaluada</option>
<option value="bajaDetectada">Baja Masa Muscular Detectada</option>
</select>
<p className="text-xs text-gray-500 mt-1">Ajustar según juicio clínico y otros métodos de evaluación.</p>
</div>

        <div className="input-group">
<label className="block text-sm font-medium text-gray-700">Condiciones Específicas Adicionales:</label>
<div className="mt-2 space-x-4">
<label className="inline-flex items-center">
<input type="checkbox" name="quemaduras" checked={formData.quemaduras} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-emerald-600 rounded" />
<span className="ml-2 text-gray-700">Quemaduras</span>
</label>
<label className="inline-flex items-center">
<input type="checkbox" name="politraumatismo" checked={formData.politraumatismo} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-emerald-600 rounded" />
<span className="ml-2 text-gray-700">Politraumatismo</span>
</label>
</div>
</div>

        <button type="button" onClick={calculateProteinRequirements} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out">
Calcular Aporte Proteico
</button>

      {calculatedData.primaryTargetValueText !== '---' && (
        <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-300 shadow-md">
          <h3 className="text-lg font-semibold text-emerald-800 mb-2 flex items-center">
            <svg className="w-6 h-6 mr-2 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
            Objetivo Proteico Principal Sugerido
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
          <button type="button" onClick={toggleConsiderations} className="mt-4 text-sm text-emerald-600 hover:text-emerald-800 focus:outline-none font-medium flex items-center group">
            <svg className="w-5 h-5 mr-1.5 transition-transform duration-200 ease-in-out group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="hover:underline">{showConsiderations ? 'Ocultar' : 'Mostrar'} Consideraciones y Detalles</span>
            <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ease-in-out ${showConsiderations ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
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
            <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
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
        <p>Esta calculadora proporciona una sugerencia basada en evidencia y guías. <strong>No reemplaza el juicio clínico individualizado.</strong> La nutrición clínica es compleja. Las recomendaciones pueden variar.</p>
      </div>
      <style>{`
        .form-checkbox {
          border-color: #D1D5DB;
        }
        .form-checkbox:checked {
          background-color: #10B981;
          border-color: #059669;
        }
        .form-checkbox:focus {
          ring: 2px;
          ring-offset: 2px;
          ring-color: #059669;
        }
        `}</style>
    </div>
);
};


// --- Componente: GlimCriteriaEvaluator (Implementado) ---
const GlimCriteriaEvaluator = ({ onGlimResult, initialData = {}, calfScreeningResult = null }) => { 
const [glimFormData, setGlimFormData] = useState({ 
  pheno_weightLossSeverity: 'no', 
  pheno_muscleMass: 'no', 
  etio_reducedIntake: (() => {
    // Inferir valor inicial de reducción de ingesta
    if (initialData.recentIntakePercentage === '0-24') return 'si_severo';
    if (initialData.recentIntakePercentage === '25-49') return 'si_leve_mod';
    if (initialData.recentIntakePercentage === '50-75') return 'si_leve_mod';
    return 'no';
  })(), 
  etio_inflammation: 'no', 
  ethnicity: 'otros', 
});

// Actualizar cuando cambie recentIntakePercentage
useEffect(() => {
  setGlimFormData(prev => ({
    ...prev,
    etio_reducedIntake: (() => {
      if (initialData.recentIntakePercentage === '0-24') return 'si_severo';
      if (initialData.recentIntakePercentage === '25-49') return 'si_leve_mod';
      if (initialData.recentIntakePercentage === '50-75') return 'si_leve_mod';
      return 'no';
    })()
  }));
}, [initialData.recentIntakePercentage]);

const [glimDiagnosis, setGlimDiagnosis] = useState('No se cumplen criterios GLIM o faltan datos.'); 
const [glimSeverity, setGlimSeverity] = useState('No aplica');
const [bmiDisplay, setBmiDisplay] = useState('N/A'); 
const [weightLoss3mDisplay, setWeightLoss3mDisplay] = useState('N/A'); 
const [weightLoss6mDisplay, setWeightLoss6mDisplay] = useState('N/A');

useEffect(() => { 
setBmiDisplay(initialData.bmi ? `${initialData.bmi} kg/m²` : 'N/A'); 
setWeightLoss3mDisplay(initialData.loss3m_percent ? `${initialData.loss3m_percent}%` : 'N/A'); 
setWeightLoss6mDisplay(initialData.loss6m_percent ? `${initialData.loss6m_percent}%` : 'N/A'); 
}, [initialData.bmi, initialData.loss3m_percent, initialData.loss6m_percent]);

useEffect(() => {
if (calfScreeningResult && calfScreeningResult.classification) {
if (calfScreeningResult.classification === "Severamente Baja") {
setGlimFormData(prev => ({ ...prev, pheno_muscleMass: 'sev' }));
} else if (calfScreeningResult.classification === "Moderadamente Baja") {
setGlimFormData(prev => ({ ...prev, pheno_muscleMass: 'mod' }));
}
}
}, [calfScreeningResult]);


const handleGlimInputChange = (e) => { const { name, value } = e.target; setGlimFormData(prev => ({ ...prev, [name]: value })); };
const evaluateGlim = () => { const age = parseInt(initialData.age, 10); const bmi = parseFloat(initialData.bmi); let phenotypicCriteriaMet = 0; let isPhenoSevere = false; if (glimFormData.pheno_weightLossSeverity.startsWith('sev_')) { phenotypicCriteriaMet++; isPhenoSevere = true; } else if (glimFormData.pheno_weightLossSeverity.startsWith('mod_')) { phenotypicCriteriaMet++; } let bmiCriterionMet = 'no'; if (!isNaN(bmi) && !isNaN(age)) { if (glimFormData.ethnicity === 'asiatico') { if (age < 70) { if (bmi < 18.5) bmiCriterionMet = 'sev'; else if (bmi < 20) bmiCriterionMet = 'mod'; } else { if (bmi < 20) bmiCriterionMet = 'sev'; else if (bmi < 22) bmiCriterionMet = 'mod'; } } else { if (age < 70) { if (bmi < 18.5) bmiCriterionMet = 'sev'; else if (bmi < 20) bmiCriterionMet = 'mod'; } else { if (bmi < 20) bmiCriterionMet = 'sev'; else if (bmi < 22) bmiCriterionMet = 'mod'; } } } if (bmiCriterionMet === 'sev') { phenotypicCriteriaMet++; isPhenoSevere = true; } else if (bmiCriterionMet === 'mod') { phenotypicCriteriaMet++; } if (glimFormData.pheno_muscleMass === 'sev') { phenotypicCriteriaMet++; isPhenoSevere = true; } else if (glimFormData.pheno_muscleMass === 'mod') { phenotypicCriteriaMet++; } let etiologicCriteriaMet = 0; if (glimFormData.etio_reducedIntake !== 'no') { etiologicCriteriaMet++; } if (glimFormData.etio_inflammation !== 'no') { etiologicCriteriaMet++; } let finalDiagnosis = 'No se cumplen criterios GLIM o faltan datos.'; let finalSeverity = 'No aplica'; if (phenotypicCriteriaMet >= 1 && etiologicCriteriaMet >= 1) { if (isPhenoSevere) { finalDiagnosis = "Malnutrición diagnosticada"; finalSeverity = "Estadio 2: Malnutrición Severa"; } else { finalDiagnosis = "Malnutrición diagnosticada"; finalSeverity = "Estadio 1: Malnutrición Moderada"; } } setGlimDiagnosis(finalDiagnosis); setGlimSeverity(finalSeverity); if (onGlimResult) { onGlimResult({ diagnosis: finalDiagnosis, severity: finalSeverity, phenotypicCriteriaCount: phenotypicCriteriaMet, etiologicCriteriaCount: etiologicCriteriaMet, isPhenoSevere, formData: glimFormData, calculatedBmiSeverity: bmiCriterionMet }); } };
const commonSelectClass = "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm";
return ( <div className="p-4 sm:p-5 bg-white rounded-b-lg shadow-md animate-fadeIn border border-t-0 border-gray-200"><h4 className="text-lg font-semibold text-purple-700 mb-4">Evaluación de Criterios GLIM</h4><div className="p-3 border border-gray-200 rounded-md bg-gray-50 text-xs text-gray-600 space-y-1 mb-4"><p><strong>Datos de Referencia (desde Módulo 1):</strong></p><p>- IMC: <strong>{bmiDisplay}</strong></p><p>- % Pérdida Peso (3m): <strong>{weightLoss3mDisplay}</strong></p><p>- % Pérdida Peso (6m): <strong>{weightLoss6mDisplay}</strong></p><p>- Edad: <strong>{initialData.age || 'N/A'}</strong> años</p>{calfScreeningResult && calfScreeningResult.classification && <p className="mt-1 pt-1 border-t border-gray-300">- Cribado Pantorrilla: <strong className={calfScreeningResult.classification === "Normal" ? "text-green-600" : "text-orange-500"}>{calfScreeningResult.classification}</strong> (CP Ajustada: {calfScreeningResult.adjustedCC ? calfScreeningResult.adjustedCC.toFixed(1) + "cm" : "N/A"})</p>}</div><div className="space-y-6"><fieldset className="p-4 border border-purple-200 rounded-md bg-purple-50/70"><legend className="text-md font-semibold text-purple-600 mb-2 px-1">Criterios Fenotípicos (Se necesita ≥1)</legend><div className="space-y-3"><div><label htmlFor="glim_pheno_weightLossSeverity" className="block text-sm font-medium text-gray-700 mb-1">1. Pérdida de Peso No Voluntaria:</label><select id="glim_pheno_weightLossSeverity" name="pheno_weightLossSeverity" value={glimFormData.pheno_weightLossSeverity} onChange={handleGlimInputChange} className={commonSelectClass}><option value="no">No cumple criterio</option><option value="mod_5_6m">{'>5-10% en últimos 6 meses (Moderado)'}</option><option value="mod_10_mas_6m">{'>10-20% más allá de 6 meses (Moderado)'}</option><option value="sev_10_6m">{'>10% en últimos 6 meses (Severo)'}</option><option value="sev_20_mas_6m">{'>20% más allá de 6 meses (Severo)'}</option></select><p className="text-xs text-gray-500 mt-1">Ref: % Pérdida (3m): {weightLoss3mDisplay}, (6m): {weightLoss6mDisplay}</p></div><div><label className="block text-sm font-medium text-gray-700 mb-1">2. Bajo Índice de Masa Corporal (IMC):</label><input type="text" value={`IMC Calculado: ${bmiDisplay} (Edad: ${initialData.age || 'N/A'} años)`} readOnly className={`${commonSelectClass} bg-gray-100`} /><label htmlFor="glim_ethnicity" className="block text-xs font-medium text-gray-600 mt-1">Etnia (para puntos de corte de IMC):</label><select id="glim_ethnicity" name="ethnicity" value={glimFormData.ethnicity} onChange={handleGlimInputChange} className={`${commonSelectClass} text-xs`}><option value="otros">Otros</option><option value="asiatico">Asiático</option></select><p className="text-xs text-gray-500 mt-1">Severidad por IMC se determina automáticamente. Moderado: &lt;20 (&lt;70a) o &lt;22 (≥70a) [Asiático: &lt;20 (&lt;70a) o &lt;22 (≥70a)]. Severo: &lt;18.5 (&lt;70a) o &lt;20 (≥70a) [Asiático: &lt;18.5 (&lt;70a) o &lt;20 (≥70a)].</p></div><div><label htmlFor="glim_pheno_muscleMass" className="block text-sm font-medium text-gray-700 mb-1">3. Reducción de Masa Muscular:</label><select id="glim_pheno_muscleMass" name="pheno_muscleMass" value={glimFormData.pheno_muscleMass} onChange={handleGlimInputChange} className={commonSelectClass}><option value="no">No cumple criterio / No evaluado</option><option value="mod">Déficit Leve a Moderado</option><option value="sev">Déficit Severo</option></select><p className="text-xs text-gray-500 mt-1">Evaluar por métodos validados (DXA, BIA, antropometría, examen físico). <strong className="text-purple-600">Sugerencia basada en Cribado Pantorrilla: {calfScreeningResult && calfScreeningResult.classification ? calfScreeningResult.classification : "No disponible"}</strong></p></div></div></fieldset><fieldset className="p-4 border border-purple-200 rounded-md bg-purple-50/70"><legend className="text-md font-semibold text-purple-600 mb-2 px-1">Criterios Etiológicos (Se necesita ≥1)</legend><div className="space-y-3"><div><label htmlFor="glim_etio_reducedIntake" className="block text-sm font-medium text-gray-700 mb-1">1. Reducción de Ingesta o Asimilación:</label><select id="glim_etio_reducedIntake" name="etio_reducedIntake" value={glimFormData.etio_reducedIntake} onChange={handleGlimInputChange} className={commonSelectClass}><option value="no">No cumple criterio</option><option value="si_leve_mod">{'Leve-Moderada (ej. ≤50% req. >1sem, o cualquier reducción >2sem, o GI crónico con afectación leve-mod)'}</option><option value="si_severo">{'Severa (ej. <50% req. >1sem con severidad, o malabsorción severa)'}</option></select></div><div><label htmlFor="glim_etio_inflammation" className="block text-sm font-medium text-gray-700 mb-1">2. Inflamación / Carga de Enfermedad:</label><select id="glim_etio_inflammation" name="etio_inflammation" value={glimFormData.etio_inflammation} onChange={handleGlimInputChange} className={commonSelectClass}><option value="no">No cumple criterio</option><option value="si_cronica_leve_mod">Enfermedad crónica/condición con inflamación crónica leve-moderada</option><option value="si_aguda_severa">Enfermedad/lesión aguda con inflamación aguda/severa</option></select><p className="text-xs text-gray-500 mt-1">Confirmar por laboratorio (PCR) o juicio clínico.</p></div></div></fieldset></div><button onClick={evaluateGlim} className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50">Evaluar Criterios GLIM</button>{glimDiagnosis !== 'No se cumplen criterios GLIM o faltan datos.' && (<div className={`mt-6 p-4 border-2 rounded-md bg-opacity-80 ${glimSeverity.includes('Severa') ? 'border-red-400 bg-red-50' : (glimSeverity.includes('Moderada') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-gray-50')}`}><h4 className={`text-md font-semibold mb-2 ${glimSeverity.includes('Severa') ? 'text-red-700' : (glimSeverity.includes('Moderada') ? 'text-yellow-700' : 'text-gray-700')}`}>Resultado Evaluación GLIM:</h4><p className={`text-lg font-bold ${glimSeverity.includes('Severa') ? 'text-red-600' : (glimSeverity.includes('Moderada') ? 'text-yellow-600' : 'text-gray-600')}`}>{glimDiagnosis}</p>{glimDiagnosis.includes("diagnosticada") && (<p className={`text-sm mt-1 font-semibold ${glimSeverity.includes('Severa') ? 'text-red-700' : (glimSeverity.includes('Moderada') ? 'text-yellow-700' : 'text-gray-700')}`}>{glimSeverity}</p>)}<div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600"><p className="font-semibold">Recomendación:</p><p>{glimDiagnosis.includes("diagnosticada") ? `Se recomienda intervención nutricional guiada por la severidad (${glimSeverity}) y la etiología. Planificar y monitorizar.` : "Si hay sospecha clínica y el tamizaje de riesgo fue positivo, considerar reevaluación o investigar más a fondo."}</p></div></div>)}</div> );
};


// --- Componente SpecificCalculatorsModule ---
function SpecificCalculatorsModule({ onResultsChange, generalPatientData = {}, riskAssessmentResults = {}, showOnlyRisk = false, showOnlyNeeds = false }) { 
// Debug para verificar que los datos se están recibiendo
console.log('SpecificCalculatorsModule - generalPatientData recibido:', generalPatientData);

// Validar y completar datos faltantes
const safeGeneralPatientData = {
  weight: generalPatientData.weight || '',
  height: generalPatientData.height || '',
  age: generalPatientData.age || '',
  sex: generalPatientData.sex || 'male',
  bmi: generalPatientData.bmi || null,
  bodyTemperature: generalPatientData.bodyTemperature || '37',
  assessmentDate: generalPatientData.assessmentDate || null,
  diseasePhase: generalPatientData.diseasePhase || 'hospitalizacionGeneral',
  respiratoryStatus: generalPatientData.respiratoryStatus || 'respEspontanea',
  nutritionRoute: generalPatientData.nutritionRoute || 'oral',
  recentIntakePercentage: generalPatientData.recentIntakePercentage || '',
  loss1m_percent: generalPatientData.loss1m_percent || '',
  loss2m_percent: generalPatientData.loss2m_percent || '',
  loss3m_percent: generalPatientData.loss3m_percent || '',
  loss6m_percent: generalPatientData.loss6m_percent || '',
  ...generalPatientData // Mantener cualquier dato adicional
};

const [activeMainTab, setActiveMainTab] = useState(() => {
  if (showOnlyRisk) return 'riesgo';
  if (showOnlyNeeds) return 'necesidades';
  return 'riesgo';
});
const [activeRiskSubTab, setActiveRiskSubTab] = useState('calf'); 
const [activeNeedsSubTab, setActiveNeedsSubTab] = useState('calorias');
const [calfScreeningResult, setCalfScreeningResult] = useState(riskAssessmentResults.calfScreening || null);

// Estado persistente para conservar resultados
const [persistentResults, setPersistentResults] = useState(riskAssessmentResults || {});

// Efecto para sincronizar con props cuando cambian
useEffect(() => {
  if (riskAssessmentResults && Object.keys(riskAssessmentResults).length > 0) {
    console.log('SpecificCalculatorsModule - Sincronizando con riskAssessmentResults:', riskAssessmentResults);
    setPersistentResults(riskAssessmentResults);
  }
}, [riskAssessmentResults]); 

const handleNRSData = (nrsData) => { 
  console.log('SpecificCalculatorsModule - handleNRSData:', nrsData);
  const newResults = {...persistentResults, nrs: nrsData};
  setPersistentResults(newResults);
  if (onResultsChange) onResultsChange(newResults); 
};

const handleNutricData = (nutricData) => { 
  console.log('SpecificCalculatorsModule - handleNutricData:', nutricData);
  const newResults = {...persistentResults, nutric: nutricData};
  setPersistentResults(newResults);
  if (onResultsChange) onResultsChange(newResults); 
};

const handleGlimData = (glimData) => { 
  console.log('SpecificCalculatorsModule - handleGlimData:', glimData);
  const newResults = {...persistentResults, glim: glimData};
  setPersistentResults(newResults);
  if (onResultsChange) onResultsChange(newResults); 
};

const handleRefeedingData = (refeedingData) => { 
  console.log('SpecificCalculatorsModule - handleRefeedingData:', refeedingData);
  const newResults = {...persistentResults, refeedingSyndrome: refeedingData};
  setPersistentResults(newResults);
  if (onResultsChange) onResultsChange(newResults); 
};

const handleCaloriesData = (caloriesData) => { 
  console.log('SpecificCalculatorsModule - handleCaloriesData:', caloriesData);
  const newResults = {...persistentResults, calories: caloriesData};
  setPersistentResults(newResults);
  if (onResultsChange) onResultsChange(newResults); 
};

const handleProteinData = (proteinData) => { 
  console.log('SpecificCalculatorsModule - handleProteinData:', proteinData);
  const newResults = {...persistentResults, protein: proteinData};
  setPersistentResults(newResults);
  if (onResultsChange) onResultsChange(newResults); 
};

// Nuevo manejador para el resultado del cribado de pantorrilla
const handleCalfData = (calfData) => {
console.log('SpecificCalculatorsModule - handleCalfData:', calfData);
setCalfScreeningResult(calfData); 
const newResults = {...persistentResults, calfScreening: calfData};
setPersistentResults(newResults);
if (onResultsChange) onResultsChange(newResults);
};

const riskCalculators = [
{ id: 'calf', name: 'Cribado Pantorrilla', component: <CalfCircumferenceScreening onCalfResult={handleCalfData} initialData={safeGeneralPatientData} savedResult={persistentResults.calfScreening} /> }, 
{ id: 'nrs', name: 'NRS-2002', component: <NRSCalculator onNRSResult={handleNRSData} initialData={safeGeneralPatientData} savedResult={persistentResults.nrs} /> }, 
{ id: 'nutric', name: 'NUTRIC Score', component: <NutricScoreCalculator onNutricResult={handleNutricData} initialData={safeGeneralPatientData} savedResult={persistentResults.nutric} /> }, 
{ id: 'glim', name: 'Criterios GLIM', component: <GlimCriteriaEvaluator onGlimResult={handleGlimData} initialData={safeGeneralPatientData} calfScreeningResult={calfScreeningResult} savedResult={persistentResults.glim} /> },
{ id: 'refeeding', name: 'Sínd. Realimentación', component: <RefeedingSyndromeCalculator onRefeedingResult={handleRefeedingData} initialData={safeGeneralPatientData} savedResult={persistentResults.refeedingSyndrome} /> },
];

const renderRiskContent = () => {
const calculator = riskCalculators.find(calc => calc.id === activeRiskSubTab);
return calculator ? calculator.component : null;
};

const renderMainContent = () => {
// Si showOnlyRisk es true, mostrar solo la sección de riesgo
if (showOnlyRisk) {
return (
<div className="animate-fadeInSubtle">
<div className="mb-3 sm:mb-4 border-b border-gray-300 flex flex-wrap -mt-2">
{riskCalculators.map(calc => (
<button key={calc.id} onClick={() => setActiveRiskSubTab(calc.id)}
className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${activeRiskSubTab === calc.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} focus:outline-none focus:ring-1 focus:ring-sky-500`}>
{calc.name}
</button>
))}
</div>
{renderRiskContent()}
</div>
);
}

// Si showOnlyNeeds es true, mostrar solo la sección de necesidades
if (showOnlyNeeds) {
return (
<div className="animate-fadeInSubtle">
<div className="mb-3 sm:mb-4 border-b border-gray-300 flex flex-wrap -mt-2">
<button 
onClick={() => setActiveNeedsSubTab('calorias')}
className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${activeNeedsSubTab === 'calorias' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} focus:outline-none focus:ring-1 focus:ring-emerald-500`}>
Necesidades Calóricas
</button>
<button 
onClick={() => setActiveNeedsSubTab('proteinas')}
className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${activeNeedsSubTab === 'proteinas' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} focus:outline-none focus:ring-1 focus:ring-emerald-500`}>
Necesidades Proteicas
</button>
</div>
{renderNeedsContent()}
</div>
);
}

// Comportamiento normal con ambas secciones
switch (activeMainTab) {
case 'riesgo':
return (
<div className="animate-fadeInSubtle">
<div className="mb-3 sm:mb-4 border-b border-gray-300 flex flex-wrap -mt-2">
{riskCalculators.map(calc => (
<button key={calc.id} onClick={() => setActiveRiskSubTab(calc.id)}
className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${activeRiskSubTab === calc.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} focus:outline-none focus:ring-1 focus:ring-sky-500`}>
{calc.name}
</button>
))}
</div>
{renderRiskContent()}
</div>
);
case 'necesidades':
return (
<div className="animate-fadeInSubtle">
<div className="mb-3 sm:mb-4 border-b border-gray-300 flex flex-wrap -mt-2">
<button 
onClick={() => setActiveNeedsSubTab('calorias')}
className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${activeNeedsSubTab === 'calorias' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} focus:outline-none focus:ring-1 focus:ring-emerald-500`}>
Necesidades Calóricas
</button>
<button 
onClick={() => setActiveNeedsSubTab('proteinas')}
className={`py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 rounded-t-sm ${activeNeedsSubTab === 'proteinas' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} focus:outline-none focus:ring-1 focus:ring-emerald-500`}>
Necesidades Proteicas
</button>
</div>
{renderNeedsContent()}
</div>
);
default:
return <p className="text-red-500">Pestaña no reconocida.</p>;
}
};

const renderNeedsContent = () => {
switch (activeNeedsSubTab) {
case 'calorias':
          return (
            <AdvancedCaloriesCalculator
              onCaloriesResult={handleCaloriesData}
              initialData={safeGeneralPatientData}
              savedResult={persistentResults.calories}
            />
          );
        case 'proteinas':
          return (
            <AdvancedProteinCalculator
              onProteinResult={handleProteinData}
              generalPatientData={safeGeneralPatientData}
              riskAssessmentResults={persistentResults}
              savedResult={persistentResults.protein}
            />
          );
default:
return null;
}
};

const mainTabs = [
{ id: 'riesgo', name: 'Riesgo y Diagnóstico Nutricional' },
{ id: 'necesidades', name: 'Necesidades Nutricionales' },
];

// Si solo se debe mostrar una sección específica, no mostrar pestañas principales
const shouldShowMainTabs = !showOnlyRisk && !showOnlyNeeds;

return (
<div className="bg-slate-100 p-3 sm:p-5 rounded-xl shadow-xl w-full mt-6 border border-slate-200">
{shouldShowMainTabs && (
<div className="border-b border-slate-300">
<nav className="-mb-px flex flex-wrap gap-x-1 sm:gap-x-3" aria-label="Tabs">
{mainTabs.map((tab) => (
<button key={tab.id} onClick={() => setActiveMainTab(tab.id)}
className={`whitespace-nowrap py-3 px-1.5 sm:py-4 sm:px-3 text-xs xxs:text-sm sm:text-base font-semibold border-b-[3px] transition-all duration-150 ${activeMainTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-400'} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 rounded-t-md`}
aria-current={activeMainTab === tab.id ? 'page' : undefined}>
{tab.name}
</button>
))}
</nav>
</div>
)}
<div className={`py-4 sm:py-5 min-h-[300px] bg-white ${shouldShowMainTabs ? 'rounded-b-lg' : 'rounded-lg'} shadow-sm`}>
{renderMainContent()}
</div>
<style>{`
.form-input-custom { display: block; width: 100%; margin-top: 0.25rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; line-height: 1.25rem; color: #374151; background-color: #fff; border: 1px solid #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.form-input-custom:focus { outline: 2px solid transparent; outline-offset: 2px; } 
#nrs-reducedIntake:focus, #nrs-diseaseSeverity:focus {border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);} /* Sky */

/* Estilos de focus para AdvancedCaloriesCalculator */
#formula-choice:focus, #adv-gender:focus, #adv-weight:focus, #adv-height:focus, #adv-age:focus, #adv-activity-level:focus,
#clinical-condition:focus, #surgery-type:focus, #infection-severity:focus, #trauma-type:focus, #burns-sct:focus, #adv-fever-temp:focus, #hospital-activity-factor:focus,
#adv-altitude:focus, #adv-etco2:focus, #adv-volumenMinuto:focus, #adv-temperaturaCorporalWeir:focus,
#adv-indirect-calorimetry:focus, #propofol-rate:focus, #propofol-duration:focus, #dextrose-concentration:focus, #dextrose-volume:focus { 
border-color: #6366F1; /* Indigo-500 */
box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

/* Estilos de focus para AdvancedProteinCalculator */
#protein-adv-peso:focus, #protein-adv-altura:focus, #protein-adv-sexo:focus, 
#protein-adv-estadoNutricional:focus, #protein-adv-masaMuscular:focus, #protein-adv-faseEnfermedad:focus,
#protein-adv-estadoRespiratorio:focus, #protein-adv-rutaNutricion:focus { 
border-color: #10B981; /* Emerald-500 */
box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

/* Estilos de focus para CalfCircumferenceScreening */
#cc_input_calf:focus, #ethnicity_calf:focus {
border-color: #6366F1; /* Indigo-500, igual que AdvancedCalories para consistencia o elige otro */
box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}


#nutric_apache:focus, #nutric_sofa:focus, #nutric_comorbidities:focus, #nutric_daysInHospital:focus, #nutric_il6:focus { border-color: #14B8A6; box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3); } /* Teal */
#glim_pheno_weightLossSeverity:focus, #glim_ethnicity:focus, #glim_pheno_muscleMass:focus, #glim_etio_reducedIntake:focus, #glim_etio_inflammation:focus { border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3); } /* Purple */

.animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
.animate-fadeInSubtle { animation: fadeInSubtle 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInSubtle { from { opacity: 0.7; } to { opacity: 1; } }
.xxs\\:text-sm { font-size: 0.8rem; line-height: 1rem; }
@media (min-width: 400px) { .xxs\\:text-sm { font-size: 0.875rem; line-height: 1.25rem; } }
`}</style>
</div>
);
}

export default SpecificCalculatorsModule;