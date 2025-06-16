// src/components/assessment/SummaryModule.jsx
import React, { useState } from 'react';

const SummaryModule = ({ 
    generalPatientData = {}, 
    calculatorResults = {},
    diagnosisText, 
    onDiagnosisTextChange, 
    planText, 
    onPlanTextChange,
    nextAssessmentDate,
    onNextAssessmentDateChange,
    nextAssessmentTime,
    onNextAssessmentTimeChange
}) => {
  const gpData = generalPatientData || {};
  const calcResults = calculatorResults || {};
  const { nrs, nutric, glim, calfScreening, calories, protein, refeedingSyndrome } = calcResults || {};

  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [apiError, setApiError] = useState('');

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
    <h3 className={`text-lg font-semibold ${colorClass} mb-3 pb-2 border-b border-slate-200`}>{children}</h3>
  );

  const DataItem = ({ label, value, fullWidth = false }) => (
    <div className={`py-2 mb-2 ${fullWidth ? 'sm:col-span-2 md:col-span-3 lg:col-span-4' : ''}`}>
      <span className="font-medium text-gray-700">{label}:</span>{' '}
      <span className="text-gray-900 font-semibold">{value}</span>
    </div>
  );

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

  const generatePatientSummaryForIA = () => {
    let summary = `Datos del Paciente:\n`;
    summary += `- Nombre: ${gpData.patientName || 'N/A'}\n`;
    summary += `- Documento: ${gpData.documentType || 'N/A'} ${gpData.documentNumber || 'N/A'}\n`;
    summary += `- Edad: ${gpData.age || 'N/A'} años, Sexo: ${gpData.sex || 'N/A'}\n`;
    summary += `- Peso: ${gpData.weight || 'N/A'} kg, Talla: ${gpData.height || 'N/A'} cm, IMC: ${gpData.bmi || 'N/A'} kg/m²\n`;
    if(gpData.loss1m_percent) summary += `- % Pérdida peso (1m): ${gpData.loss1m_percent}%\n`;
    if(gpData.loss3m_percent) summary += `- % Pérdida peso (3m): ${gpData.loss3m_percent}%\n`;
    if(gpData.loss6m_percent) summary += `- % Pérdida peso (6m): ${gpData.loss6m_percent}%\n`;
    summary += `- Peso Ideal: ${gpData.idealWeight || 'N/A'} kg, Peso Ajustado: ${gpData.adjustedWeight || 'N/A'} kg\n`;
    summary += `- Fecha Valoración: ${gpData.assessmentDate || 'N/A'}\n`;
    summary += `- Motivo Consulta: ${gpData.reasonForConsultation || 'N/A'}\n`;

    summary += "\nEstado Clínico General:\n";
    summary += `- Fase Enfermedad: ${gpData.diseasePhase || 'N/A'}\n`;
    summary += `- Temperatura: ${gpData.bodyTemperature || 'N/A'}°C\n`;
    summary += `- Estado Respiratorio/Ingesta: ${gpData.respiratoryStatus || 'N/A'}\n`;
    summary += `- Ruta Nutrición: ${gpData.nutritionRoute || 'N/A'}\n`;
    summary += `- Estado Hemodinámico: ${gpData.hemodynamicStatus || 'N/A'}\n`;
    summary += `- Uso de Vasopresores: ${gpData.vasopressorUse || 'N/A'}${gpData.vasopressorUse === 'si' ? ` (${gpData.vasopressorDetails || 'Detalles no especificados'})` : ''}\n`;
    if(gpData.vasopressorUse === 'si' && gpData.uncontrolledShock) summary += `- Shock Incontrolado / Vasopresores en Aumento: SÍ\n`;
    if(gpData.hasAllergiesOrIntolerances === 'si') summary += `- Alergias/Intolerancias: ${gpData.allergiesOrIntolerancesDetails || 'Especificadas'}\n`;
    else summary += `- Alergias/Intolerancias: No\n`;


    summary += "\nLaboratorios Basales (si disponibles):\n";
    if(gpData.lab_potassium) summary += `- Potasio: ${gpData.lab_potassium} mEq/L\n`;
    if(gpData.lab_phosphorus) summary += `- Fósforo: ${gpData.lab_phosphorus} mg/dL\n`;
    if(gpData.lab_magnesium) summary += `- Magnesio: ${gpData.lab_magnesium} mg/dL\n`;
    if(gpData.lab_sodium) summary += `- Sodio: ${gpData.lab_sodium} mEq/L\n`;
    if(gpData.lab_glucose) summary += `- Glucosa: ${gpData.lab_glucose} mg/dL\n`;
    if(gpData.lab_creatinine) summary += `- Creatinina: ${gpData.lab_creatinine} mg/dL\n`;
    if(gpData.lab_bun) summary += `- BUN: ${gpData.lab_bun} mg/dL\n`;
    if(gpData.lab_ast) summary += `- AST: ${gpData.lab_ast} U/L\n`;
    if(gpData.lab_alt) summary += `- ALT: ${gpData.lab_alt} U/L\n`;
    if(gpData.lab_alkPhos) summary += `- Fosfatasa Alcalina: ${gpData.lab_alkPhos} U/L\n`;
    if(gpData.lab_triglycerides) summary += `- Triglicéridos: ${gpData.lab_triglycerides} mg/dL\n`;
    if(gpData.lab_thiamine) summary += `- Tiamina: ${gpData.lab_thiamine} ${gpData.lab_thiamine_unit || ''} (Estado: ${gpData.lab_thiamine_status || 'No clasificado'})\n`;

    summary += "\nResultados de Tamizaje/Diagnóstico Nutricional:\n";
    if(calfScreening && calfScreening.classification) summary += `- Cribado Pantorrilla: ${calfScreening.classification} (CP Ajustada: ${calfScreening.adjustedCC} cm)\n`;
    if(nrs && nrs.score !== null) summary += `- NRS-2002 Score: ${nrs.score} (${nrs.riskLevel})\n`;
    if(nutric && nutric.score !== null) summary += `- NUTRIC Score (${nutric.type || 'mNUTRIC'}): ${nutric.score} (${nutric.interpretation})\n`;
    if(glim && glim.diagnosis) summary += `- GLIM: ${glim.diagnosis} (${glim.severity})\n`;
    if(refeedingSyndrome && refeedingSyndrome.riesgo && refeedingSyndrome.riesgo.nivel) summary += `- Riesgo Síndrome Realimentación: ${refeedingSyndrome.riesgo.nivel}\n`;
    if(refeedingSyndrome && refeedingSyndrome.diagnostico && refeedingSyndrome.diagnostico.diagnostico) summary += `- Diagnóstico Síndrome Realimentación: ${refeedingSyndrome.diagnostico.diagnostico}\n`;

    summary += "\nRequerimientos Estimados:\n";
    if(calories && (calories.get || calories.ree || calories.tmb)) summary += `- Energía: ${calories.adjusted_get || calories.get || calories.ree} kcal/día (Fórmula: ${calories.formula || 'N/A'})\n`;
    if(protein && protein.target && protein.target.value) summary += `- Proteínas: ${protein.target.value} ${protein.target.unit} (Total: ${protein.totalGrams})\n`;

    return summary;
  }

  const handleGenerateDiagnosis = async () => { setIsLoadingDiagnosis(true); const patientFullSummary = generatePatientSummaryForIA(); const prompt = `Actúa como un nutricionista clínico experto. Basándote en la siguiente información completa del paciente, redacta un borrador conciso (máximo 3-4 párrafos) de un diagnóstico nutricional integrado. Enfócate en los hallazgos más relevantes, posibles deficiencias o excesos, y la interrelación entre los datos. Evita dar recomendaciones de tratamiento en este diagnóstico. Información del Paciente:\n${patientFullSummary}\nDiagnóstico Nutricional Integrado (Borrador):`; const generatedText = await callGeminiAPI(prompt); onDiagnosisTextChange(generatedText); setIsLoadingDiagnosis(false); };
  const handleSuggestPlan = async () => { setIsLoadingPlan(true); const patientFullSummary = generatePatientSummaryForIA(); const prompt = `Actúa como un nutricionista clínico experto. Basándote en la siguiente información completa del paciente y el diagnóstico nutricional integrado proporcionado, sugiere un borrador de un plan de intervención y recomendaciones nutricionales (máximo 4-5 párrafos). Incluye objetivos nutricionales específicos (calóricos, proteicos si aplica), tipo de soporte nutricional sugerido (oral, enteral, parenteral, suplementos), y recomendaciones generales de monitoreo y seguimiento. Información del Paciente:\n${patientFullSummary}\nDiagnóstico Nutricional Integrado:\n${diagnosisText || "No se ha generado un diagnóstico aún."}\nPlan de Intervención y Recomendaciones (Borrador):`; const generatedText = await callGeminiAPI(prompt); onPlanTextChange(generatedText); setIsLoadingPlan(false); };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl mt-8 border border-slate-200">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 text-center">
        Consolidado de Valoración Inicial
      </h2>
      {apiError && ( <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm"> <p className="font-semibold">Error de IA:</p> <p>{apiError}</p> </div> )}
      <div className="space-y-6">
        <section className="p-6 rounded-md border border-indigo-200" style={{backgroundColor: '#F0F2F9'}}>
          <SectionTitle colorClass="text-indigo-800">Datos Generales, Clínicos y Laboratorios Basales</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-1 text-sm mb-4">
            <DataItem label="Nombre" value={displayValue(gpData.patientName)} />
            <DataItem label="Tipo Doc." value={displayValue(gpData.documentType)} />
            <DataItem label="N° Doc." value={displayValue(gpData.documentNumber)} />
            <DataItem label="Edad" value={displayValue(gpData.age, 'años', 0)} />
            <DataItem label="Sexo" value={displayValue(gpData.sex === 'male' ? 'Masculino' : (gpData.sex === 'female' ? 'Femenino' : gpData.sex))} />
            <DataItem label="Fecha Valoración" value={displayValue(gpData.assessmentDate)} />
            <DataItem label="Peso Actual" value={displayValue(gpData.weight, 'kg')} />
            <DataItem label="Talla" value={displayValue(gpData.height, 'cm')} />
            <DataItem label="IMC" value={displayValue(gpData.bmi, 'kg/m²')} />
            <DataItem label="Peso Ideal" value={displayValue(gpData.idealWeight, 'kg')} />
            <DataItem label="Peso Ajustado" value={displayValue(gpData.adjustedWeight, 'kg')} />
            <DataItem label="Temperatura" value={displayValue(gpData.bodyTemperature, '°C')} />
            <DataItem label="% Pérdida Peso (1m)" value={displayValue(gpData.loss1m_percent, '%')} />
            <DataItem label="% Pérdida Peso (3m)" value={displayValue(gpData.loss3m_percent, '%')} />
            <DataItem label="% Pérdida Peso (6m)" value={displayValue(gpData.loss6m_percent, '%')} />
            <DataItem label="Fase Enfermedad" value={displayValue(
              gpData.diseasePhase === 'agudaTemprana' ? 'Aguda Temprana' :
              gpData.diseasePhase === 'agudaTardia' ? 'Aguda Tardía' :
              gpData.diseasePhase === 'hospitalizacionGeneral' ? 'Hospitalización General' :
              gpData.diseasePhase === 'recuperacion' ? 'Recuperación' :
              gpData.diseasePhase
            )} />
            <DataItem label="Estado Respiratorio/Ingesta" value={displayValue(
              gpData.respiratoryStatus === 'ingestaOralAdecuada' ? 'Ingesta Oral Adecuada' :
              gpData.respiratoryStatus === 'ingestaOralReducida' ? 'Ingesta Oral Reducida' :
              gpData.respiratoryStatus === 'respEspontanea' ? 'Respiración Espontánea' :
              gpData.respiratoryStatus === 'ventMecanica' ? 'Ventilación Mecánica' :
              gpData.respiratoryStatus
            )} />
            <DataItem label="Ruta Nutrición" value={displayValue(gpData.nutritionRoute)} />
            <DataItem label="Estado Hemodinámico" value={displayValue(gpData.hemodynamicStatus)} />
            <DataItem label="Uso Vasopresores" value={displayValue(gpData.vasopressorUse)} />
            {gpData.vasopressorUse === 'si' && <DataItem label="Detalle Vasopresores" value={displayValue(gpData.vasopressorDetails)} fullWidth={gpData.vasopressorDetails && gpData.vasopressorDetails.length > 30} />}
            {gpData.vasopressorUse === 'si' && <DataItem label="Shock Incontrolado" value={gpData.uncontrolledShock ? 'Sí' : 'No'} />}
            <DataItem label="Alergias/Intolerancias" value={gpData.hasAllergiesOrIntolerances === 'si' ? (gpData.allergiesOrIntolerancesDetails || 'Sí, no especificadas') : 'No'} fullWidth={gpData.hasAllergiesOrIntolerances === 'si' && gpData.allergiesOrIntolerancesDetails && gpData.allergiesOrIntolerancesDetails.length > 30} />

            <DataItem label="K sérico" value={displayValue(gpData.lab_potassium, 'mEq/L')} />
            <DataItem label="P sérico" value={displayValue(gpData.lab_phosphorus, 'mg/dL')} />
            <DataItem label="Mg sérico" value={displayValue(gpData.lab_magnesium, 'mg/dL')} />
            <DataItem label="Na sérico" value={displayValue(gpData.lab_sodium, 'mEq/L')} />
            <DataItem label="Glucosa" value={displayValue(gpData.lab_glucose, 'mg/dL')} />
            <DataItem label="Creatinina" value={displayValue(gpData.lab_creatinine, 'mg/dL')} />
            <DataItem label="BUN" value={displayValue(gpData.lab_bun, 'mg/dL')} />
            <DataItem label="AST" value={displayValue(gpData.lab_ast, 'U/L')} />
            <DataItem label="ALT" value={displayValue(gpData.lab_alt, 'U/L')} />
            <DataItem label="Fosf. Alcalina" value={displayValue(gpData.lab_alkPhos, 'U/L')} />
            <DataItem label="Triglicéridos" value={displayValue(gpData.lab_triglycerides, 'mg/dL')} />
            <DataItem label="Tiamina" value={
              gpData.lab_thiamine ? 
                <span>
                  {displayValue(gpData.lab_thiamine)} {gpData.lab_thiamine_unit || ''} 
                  {gpData.lab_thiamine_status && (
                    <span className={`ml-2 font-semibold ${
                      gpData.lab_thiamine_status === 'normal' ? 'text-green-600' : 
                      gpData.lab_thiamine_status === 'bajo' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      ({gpData.lab_thiamine_status.charAt(0).toUpperCase() + gpData.lab_thiamine_status.slice(1)})
                    </span>
                  )}
                </span> 
                : displayValue(null)
            } />
          </div>

          {/* Campo Motivo Consulta separado con mejor espaciado */}
          <div className="border-t border-indigo-200 pt-4 mt-2">
            <div className="py-2">
              <span className="font-medium text-gray-700">Motivo Consulta:</span>{' '}
              <span className="text-gray-900 font-semibold">{displayValue(gpData.reasonForConsultation)}</span>
            </div>
          </div>
        </section>

        <section className="p-5 rounded-md border border-red-200" style={{backgroundColor: '#FFEFF1'}}>
          <SectionTitle colorClass="text-red-800">Resultados de Tamizaje y Diagnóstico Nutricional</SectionTitle>
          <div className="space-y-2 text-sm">
            {calfScreening && calfScreening.classification ? ( <DataItem label="Cribado Pantorrilla" value={<>{displayValue(calfScreening.classification)} (CP Ajustada: {displayValue(calfScreening.adjustedCC, 'cm')})</>} /> ) : <DataItem label="Cribado Pantorrilla" value={displayValue(null)} />}
            {nrs && nrs.score !== null && nrs.riskLevel !== undefined ? ( <DataItem label="NRS-2002" value={<>Score {displayValue(nrs.score, '', 0)} ({displayValue(nrs.riskLevel)}) - <span className="text-xs">{displayValue(nrs.recommendation)}</span></>} /> ) : <DataItem label="NRS-2002" value={displayValue(null)} />}
            {nutric && nutric.score !== null && nutric.interpretation !== undefined ? ( <DataItem label={`NUTRIC Score (${nutric.type || 'mNUTRIC'})`} value={<>Score {displayValue(nutric.score, '', 0)} ({displayValue(nutric.interpretation)}) - <span className="text-xs">{displayValue(nutric.clinicalImplication)}</span></>} /> ) : <DataItem label="NUTRIC Score" value={displayValue(null)} />}
            {glim && glim.diagnosis ? ( <DataItem label="Criterios GLIM" value={<>{displayValue(glim.diagnosis)} ({displayValue(glim.severity)})</>} /> ) : <DataItem label="Criterios GLIM" value={displayValue(null)} />}
            {refeedingSyndrome && refeedingSyndrome.riesgo && refeedingSyndrome.riesgo.nivel ? ( <DataItem label="Riesgo Sínd. Realimentación" value={<span className={refeedingSyndrome.riesgo.colorClass}>{displayValue(refeedingSyndrome.riesgo.nivel)}</span>} /> ) : <DataItem label="Riesgo Sínd. Realimentación" value={displayValue(null)} />}
            {refeedingSyndrome && refeedingSyndrome.diagnostico && refeedingSyndrome.diagnostico.diagnostico ? ( <DataItem label="Diag. Sínd. Realimentación" value={<span className={refeedingSyndrome.diagnostico.colorClass}>{displayValue(refeedingSyndrome.diagnostico.diagnostico)}</span>} /> ) : <DataItem label="Diag. Sínd. Realimentación" value={displayValue(null)} />}

          </div>
        </section>

        <section className="p-5 rounded-md border border-green-200" style={{backgroundColor: '#E8F5E9'}}>
          <SectionTitle colorClass="text-green-800">Requerimientos Energéticos y Proteicos Estimados</SectionTitle>
          <div className="space-y-3 text-sm">
            {calories && (calories.get || calories.ree || calories.tmb) ? ( 
              <div className="space-y-1">
                <DataItem label="Gasto Energético" value={<>{displayValue(calories.adjusted_get || calories.get || calories.ree, 'kcal/día')} (Fórmula: {calories.formula || 'N/A'})</>} />
                {calories.infusionCalories > 0 && <p className="text-xs text-orange-700 ml-2 mt-1">(Se restaron {calories.infusionCalories} kcal de infusiones del GET/REE original)</p>}
              </div>
            ) : <DataItem label="Gasto Energético" value={displayValue(null)} />}
            
            {protein && protein.target && protein.target.value ? ( 
              <div className="space-y-1">
                <DataItem label="Proteínas Objetivo" value={<>{displayValue(protein.target.value)} {displayValue(protein.target.unit)}</>} /> 
                <DataItem label="Proteínas Totales (progresivo)" value={displayValue(protein.totalGrams, 'g/día')} /> 
                {protein.target.weightType && <p className="text-xs text-gray-600 ml-2 mt-1">Base: {displayValue(protein.target.weightType)} ({displayValue(protein.target.baseWeight, 'kg')})</p>}
              </div>
            ) : <DataItem label="Requerimiento Proteico" value={displayValue(null)} />}
          </div>
        </section>

        <section className="p-4 bg-slate-50 rounded-md">
          <div className="flex justify-between items-center mb-3">
            <SectionTitle>Diagnóstico Nutricional Integrado</SectionTitle>
            <button 
              type="button" 
              onClick={handleGenerateDiagnosis} 
              disabled={isLoadingDiagnosis} 
              className="btn-ia-diagnosis text-white font-bold border-none cursor-pointer flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:opacity-50"
              style={{
                backgroundColor: '#7B4B94',
                padding: '10px 18px',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => {
                if (!isLoadingDiagnosis) {
                  e.target.style.backgroundColor = '#6A3F84';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoadingDiagnosis) {
                  e.target.style.backgroundColor = '#7B4B94';
                }
              }}
            >
              {isLoadingDiagnosis ? ( 
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> 
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> 
                </svg> 
              ) : ( 
                <span className="mr-2" style={{verticalAlign: 'middle'}}>✨</span> 
              )} 
              Generar Diagnóstico (IA) 
            </button>
          </div>
          <textarea rows="6" className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm" placeholder="Escriba aquí el diagnóstico nutricional integrado o genere uno con IA..." value={diagnosisText} onChange={(e) => onDiagnosisTextChange(e.target.value)} disabled={isLoadingDiagnosis} />
        </section>

        <section className="p-4 bg-slate-50 rounded-md">
          <div className="flex justify-between items-center mb-3">
            <SectionTitle>Plan de Intervención y Recomendaciones</SectionTitle>
            <button 
              type="button" 
              onClick={handleSuggestPlan} 
              disabled={isLoadingPlan || !diagnosisText} 
              className="btn-ia-plan text-white font-bold border-none cursor-pointer flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:opacity-50"
              style={{
                backgroundColor: '#14B8A6',
                padding: '10px 18px',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => {
                if (!isLoadingPlan && diagnosisText) {
                  e.target.style.backgroundColor = '#0F766E';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoadingPlan && diagnosisText) {
                  e.target.style.backgroundColor = '#14B8A6';
                }
              }}
            >
              {isLoadingPlan ? ( 
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> 
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> 
                </svg> 
              ) : ( 
                <span className="mr-2" style={{verticalAlign: 'middle'}}>✨</span> 
              )} 
              Sugerir Plan (IA) 
            </button>
          </div>
          <textarea rows="8" className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm" placeholder="Detalle aquí el plan de acción, objetivos, tipo de soporte, suplementación, monitoreo, o genere sugerencias con IA..." value={planText} onChange={(e) => onPlanTextChange(e.target.value)} disabled={isLoadingPlan} />
           {!diagnosisText && <p className="text-xs text-orange-500 mt-1">Se recomienda generar o escribir un diagnóstico antes de sugerir un plan con IA.</p>}
        </section>

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
                  value={nextAssessmentDate || ''}
                  onChange={(e) => onNextAssessmentDateChange && onNextAssessmentDateChange(e.target.value)}
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
                  value={nextAssessmentTime || ''}
                  onChange={(e) => onNextAssessmentTimeChange && onNextAssessmentTimeChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            
            {nextAssessmentDate && (
              <div className="mt-3 p-3 bg-blue-100 rounded-md border border-blue-300">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-blue-800 font-medium text-sm">
                    Próxima valoración programada para: {(() => {
                      // Crear fecha local sin conversión de zona horaria
                      const [year, month, day] = nextAssessmentDate.split('-');
                      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      
                      return localDate.toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    })()}
                    {nextAssessmentTime && ` a las ${nextAssessmentTime}`}
                  </span>
                </div>
              </div>
            )}
            
            {!nextAssessmentDate && (
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
      </div>
    </div>
  );
};
export default SummaryModule;
