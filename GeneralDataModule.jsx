// src/components/assessment/GeneralDataModule.jsx
import React, { useState, useEffect, useCallback } from 'react';

function GeneralDataModule({ initialData = {}, onDataChange }) {
  const [formData, setFormData] = useState({
    // 1. Datos de Identificación del Paciente
    patientName: '',
    documentType: 'CC',
    documentNumber: '',
    age: '',
    sex: 'male',
    assessmentDate: new Date().toISOString().split('T')[0],
    reasonForConsultation: '',

    // 2. Datos Antropométricos Actuales
    weight: '',
    height: '',
    bmi: '',
    idealWeight: '',
    adjustedWeight: '',

    // 3. Historial de Peso y Pérdidas
    weight1m_ago: '',
    weight2m_ago: '',
    weight3m_ago: '',
    weight6m_ago: '',
    loss1m_percent: '',
    loss2m_percent: '',
    loss3m_percent: '',
    loss6m_percent: '',

    // 4. Estado Clínico y Enfermedad
    diseasePhase: 'hospitalizacionGeneral',
    bodyTemperature: '',
    respiratoryStatus: 'ingestaOralAdecuada',
    nutritionRoute: 'oral',
    hemodynamicStatus: 'estable',

    // 5. Soporte Vasopresor
    vasopressorUse: 'no',
    vasopressorDetails: '',
    uncontrolledShock: false,

    // 6. Ingesta Alimentaria
    recentIntakePercentage: 'normal',
    reducedIntakeDays: '',

    // 7. Alergias e Intolerancias
    hasAllergiesOrIntolerances: 'no',
    allergiesOrIntolerancesDetails: '',

    // 8. Calorías de Infusiones No Nutricionales
    hasPropofol: false,
    propofol_rate: '',
    propofol_duration: '',
    hasDextrose: false,
    dextrose_concentration: '',
    dextrose_volume: '',

    // 9. Laboratorios Basales
    lab_potassium: '',
    lab_phosphorus: '',
    lab_magnesium: '',
    lab_sodium: '',
    lab_glucose: '',
    lab_creatinine: '',
    lab_bun: '',
    lab_ast: '',
    lab_alt: '',
    lab_alkPhos: '',
    lab_triglycerides: '',
    lab_thiamine: '',
    lab_thiamine_unit: 'nmol/L',
    lab_thiamine_status: '',
    lab_crp: '',
  });

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const updatedFormData = { ...formData };
      let changed = false;
      for (const key in initialData) {
        if (Object.prototype.hasOwnProperty.call(initialData, key) && 
            initialData[key] !== undefined && 
            initialData[key] !== updatedFormData[key]) {
          updatedFormData[key] = initialData[key];
          changed = true;
        }
      }
       for (const key in formData) { 
          if (updatedFormData[key] === undefined && formData[key] !== undefined) {
              updatedFormData[key] = formData[key];
          }
      }
      const defaults = {
        documentType: 'CC', diseasePhase: 'hospitalizacionGeneral', bodyTemperature: '',
        respiratoryStatus: 'ingestaOralAdecuada', nutritionRoute: 'oral',
        hemodynamicStatus: 'estable', vasopressorUse: 'no', vasopressorDetails: '', uncontrolledShock: false,
        recentIntakePercentage: 'normal', reducedIntakeDays: '',
        hasAllergiesOrIntolerances: 'no', allergiesOrIntolerancesDetails: '', // Defaults para alergias
        hasPropofol: false, propofol_rate: '', propofol_duration: '', // Defaults para propofol
        hasDextrose: false, dextrose_concentration: '', dextrose_volume: '', // Defaults para dextrosa
        lab_potassium: '', lab_phosphorus: '', lab_magnesium: '', lab_sodium: '', lab_glucose: '', lab_creatinine: '', 
        lab_bun: '', lab_ast: '', lab_alt: '', lab_alkPhos: '', lab_triglycerides: '', lab_thiamine: '', 
        lab_thiamine_unit: 'nmol/L', lab_thiamine_status: '', lab_crp: '',
      };
      for (const key in defaults) {
        if (updatedFormData[key] === undefined) updatedFormData[key] = defaults[key];
      }

      if (changed) {
        setFormData(updatedFormData);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); 

  const calculateBMI = useCallback((weight, height) => { if (weight > 0 && height > 0) { const heightInMeters = height / 100; return (weight / (heightInMeters * heightInMeters)).toFixed(2); } return ''; }, []);
  const calculateWeightLossPercent = useCallback((initialWeight, currentWeight) => { if (initialWeight > 0 && currentWeight > 0 && parseFloat(initialWeight) > parseFloat(currentWeight)) { return (((parseFloat(initialWeight) - parseFloat(currentWeight)) / parseFloat(initialWeight)) * 100).toFixed(1); } return ''; }, []);
  const calculateIdealWeight = useCallback((heightCm, sex) => { if (heightCm > 0) { let idealW; if (sex === 'male') { idealW = heightCm - 100 - ((heightCm - 150) / 4); } else { idealW = heightCm - 100 - ((heightCm - 150) / 2.5); } return idealW > 0 ? idealW.toFixed(1) : ''; } return ''; }, []);
  const calculateAdjustedWeight = useCallback((currentWeight, idealWeightValue) => { const actualW = parseFloat(currentWeight); const idealW = parseFloat(idealWeightValue); if (actualW > 0 && idealW > 0) { if (actualW > (idealW * 1.20)) { return (idealW + 0.4 * (actualW - idealW)).toFixed(1); } return actualW.toFixed(1); } return ''; }, []);

  useEffect(() => {
    const { weight, height, sex, weight1m_ago, weight2m_ago, weight3m_ago, weight6m_ago,
            bmi: currentBmi, loss1m_percent: currentL1, loss2m_percent: currentL2, 
            loss3m_percent: currentL3, loss6m_percent: currentL6, 
            idealWeight: currentIW, adjustedWeight: currentAW 
          } = formData;
    const weightNum = parseFloat(weight); const heightNum = parseFloat(height);
    const weight1mNum = parseFloat(weight1m_ago); const weight2mNum = parseFloat(weight2m_ago); const weight3mNum = parseFloat(weight3m_ago); const weight6mNum = parseFloat(weight6m_ago);
    const newBmi = calculateBMI(weightNum, heightNum);
    const newLoss1m = calculateWeightLossPercent(weight1mNum, weightNum); const newLoss2m = calculateWeightLossPercent(weight2mNum, weightNum); const newLoss3m = calculateWeightLossPercent(weight3mNum, weightNum); const newLoss6m = calculateWeightLossPercent(weight6mNum, weightNum);
    const newIdealWeight = calculateIdealWeight(heightNum, sex); const newAdjustedWeight = calculateAdjustedWeight(weightNum, newIdealWeight);

    if ( newBmi !== currentBmi || newLoss1m !== currentL1 || newLoss2m !== currentL2 || newLoss3m !== currentL3 || newLoss6m !== currentL6 || newIdealWeight !== currentIW || newAdjustedWeight !== currentAW ) {
      const updatedCalculatedData = { bmi: newBmi, loss1m_percent: newLoss1m, loss2m_percent: newLoss2m, loss3m_percent: newLoss3m, loss6m_percent: newLoss6m, idealWeight: newIdealWeight, adjustedWeight: newAdjustedWeight, };
      setFormData(prevData => { const finalData = { ...prevData, ...updatedCalculatedData }; if (typeof onDataChange === 'function') { onDataChange(finalData); } return finalData; });
    }
  }, [ formData.weight, formData.height, formData.sex, formData.weight1m_ago, formData.weight2m_ago, formData.weight3m_ago, formData.weight6m_ago, calculateBMI, calculateWeightLossPercent, calculateIdealWeight, calculateAdjustedWeight, onDataChange, formData.bmi, formData.loss1m_percent, formData.loss2m_percent, formData.loss3m_percent, formData.loss6m_percent, formData.idealWeight, formData.adjustedWeight ]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => { 
      const updatedData = { ...prevData, [name]: type === 'checkbox' ? checked : value }; 
      if (name === 'recentIntakePercentage' && value === 'normal') {
        updatedData.reducedIntakeDays = '';
      }
      // Si se selecciona "No" para alergias, limpiar los detalles
      if (name === 'hasAllergiesOrIntolerances' && value === 'no') {
        updatedData.allergiesOrIntolerancesDetails = '';
      }
      
      // Si se deselecciona propofol, limpiar los campos relacionados
      if (name === 'hasPropofol' && !checked) {
        updatedData.propofol_rate = '';
        updatedData.propofol_duration = '';
      }
      
      // Si se deselecciona dextrosa, limpiar los campos relacionados
      if (name === 'hasDextrose' && !checked) {
        updatedData.dextrose_concentration = '';
        updatedData.dextrose_volume = '';
      }
      if (typeof onDataChange === 'function') { 
        onDataChange(updatedData); 
      } 
      return updatedData; 
    });
  };

  const inputStyle = "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const readOnlyStyle = `${inputStyle} bg-gray-100 cursor-not-allowed`;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-700 mb-5 border-b pb-2">
        Módulo 1: Datos Generales, Antropometría y Estado Clínico
      </h2>
      <form className="space-y-4">
        {/* Sección de Identificación */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Identificación del Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div><label htmlFor="patientName" className="block text-sm font-medium text-gray-700">Nombre:</label><input type="text" name="patientName" id="patientName" value={formData.patientName} onChange={handleInputChange} className={inputStyle} placeholder="Nombre completo"/></div>
                <div><label htmlFor="documentType" className="block text-sm font-medium text-gray-700">Tipo Documento:</label><select name="documentType" id="documentType" value={formData.documentType} onChange={handleInputChange} className={inputStyle}><option value="CC">Cédula Ciudadanía</option><option value="TI">Tarjeta Identidad</option><option value="RC">Registro Civil</option><option value="CE">Cédula Extranjería</option><option value="PA">Pasaporte</option><option value="Otro">Otro</option></select></div>
                <div><label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">Número Documento:</label><input type="text" name="documentNumber" id="documentNumber" value={formData.documentNumber} onChange={handleInputChange} className={inputStyle} placeholder="Número de identificación"/></div>
                <div><label htmlFor="assessmentDate" className="block text-sm font-medium text-gray-700">Fecha Valoración:</label><input type="date" name="assessmentDate" id="assessmentDate" value={formData.assessmentDate} onChange={handleInputChange} className={inputStyle}/></div>
                <div><label htmlFor="age" className="block text-sm font-medium text-gray-700">Edad (años):</label><input type="number" name="age" id="age" value={formData.age} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 30"/></div>
                <div><label htmlFor="sex" className="block text-sm font-medium text-gray-700">Sexo:</label><select name="sex" id="sex" value={formData.sex} onChange={handleInputChange} className={inputStyle}><option value="male">Masculino</option><option value="female">Femenino</option></select></div>
            </div>
        </section>

        {/* Motivo de consulta */}
        <section className="space-y-2 border-b border-slate-200 pb-4">
            <label htmlFor="reasonForConsultation" className="block text-sm font-medium text-gray-700">Motivo de la Consulta/Valoración:</label>
            <textarea name="reasonForConsultation" id="reasonForConsultation" rows="3" value={formData.reasonForConsultation} onChange={handleInputChange} className={`${inputStyle} w-full`} placeholder="Describa brevemente..."></textarea>
        </section>

        {/* Alergias e Intolerancias */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Alergias e Intolerancias</h3>
            <div>
                <label htmlFor="hasAllergiesOrIntolerances" className="block text-sm font-medium text-gray-700">¿Presenta alergias o intolerancias alimentarias conocidas?</label>
                <select name="hasAllergiesOrIntolerances" id="hasAllergiesOrIntolerances" value={formData.hasAllergiesOrIntolerances} onChange={handleInputChange} className={inputStyle}>
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                </select>
            </div>
            {formData.hasAllergiesOrIntolerances === 'si' && (
                <div>
                    <label htmlFor="allergiesOrIntolerancesDetails" className="block text-sm font-medium text-gray-700">Especifique cuáles:</label>
                    <textarea name="allergiesOrIntolerancesDetails" id="allergiesOrIntolerancesDetails" rows="2" value={formData.allergiesOrIntolerancesDetails} onChange={handleInputChange} className={`${inputStyle} w-full`} placeholder="Ej: Alergia al maní, intolerancia a la lactosa..."></textarea>
                </div>
            )}
        </section>

        {/* Antropometría y Datos Clínicos */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Antropometría y Datos Clínicos Básicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div><label htmlFor="weight" className="block text-sm font-medium text-gray-700">Peso Actual (kg):</label><input type="number" step="0.1" name="weight" id="weight" value={formData.weight} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 70.5"/></div>
                <div><label htmlFor="height" className="block text-sm font-medium text-gray-700">Talla (cm):</label><input type="number" step="0.1" name="height" id="height" value={formData.height} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 175"/></div>
                <div><label htmlFor="bodyTemperature" className="block text-sm font-medium text-gray-700">Temperatura (°C):</label><input type="number" step="0.1" name="bodyTemperature" id="bodyTemperature" value={formData.bodyTemperature} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 37.0"/></div>
                <div>
                    <label htmlFor="diseasePhase" className="block text-sm font-medium text-gray-700">Fase Enfermedad/Estancia:</label>
                    <select name="diseasePhase" id="diseasePhase" value={formData.diseasePhase} onChange={handleInputChange} className={inputStyle}>
                        <option value="hospitalizacionGeneral">Hospitalización General (No crítico)</option>
                        <option value="agudaTemprana">Fase Aguda Temprana (Días 1-2 UCI/Crítico)</option>
                        <option value="agudaTardia">Fase Aguda Tardía (Días 3-7 UCI/Crítico)</option>
                        <option value="recuperacion">Fase de Recuperación (Post-UCI/Sala General)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="respiratoryStatus" className="block text-sm font-medium text-gray-700">Estado Respiratorio:</label>
                    <select name="respiratoryStatus" id="respiratoryStatus" value={formData.respiratoryStatus} onChange={handleInputChange} className={inputStyle}>
                        <option value="respEspontanea">Respiración Espontánea (sin soporte ventilatorio)</option>
                        <option value="vni">Ventilación No Invasiva (VNI)</option>
                        <option value="vmi">Ventilación Mecánica Invasiva (VMI)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="nutritionRoute" className="block text-sm font-medium text-gray-700">Vía de Nutrición Actual:</label>
                    <select name="nutritionRoute" id="nutritionRoute" value={formData.nutritionRoute} onChange={handleInputChange} className={inputStyle}>
                        <option value="oral">Oral</option>
                        <option value="oralSNO">Oral con Suplementos (SNOs)</option>
                        <option value="enteralNE">Nutrición Enteral (NE)</option>
                        <option value="parenteralNP">Nutrición Parenteral (NP)</option>
                        <option value="mixta">Mixta (NE/NP)</option>
                        <option value="porDefinir">No Definida / Por Determinar</option>
                    </select>
                </div>
            </div>
        </section>

        {/* Estado Hemodinámico y Soporte Vasoactivo */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Estado Hemodinámico y Soporte Vasoactivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div><label htmlFor="hemodynamicStatus" className="block text-sm font-medium text-gray-700">Estado Hemodinámico:</label><select name="hemodynamicStatus" id="hemodynamicStatus" value={formData.hemodynamicStatus} onChange={handleInputChange} className={inputStyle}><option value="estable">Estable</option><option value="inestable">Inestable</option></select></div>
                <div><label htmlFor="vasopressorUse" className="block text-sm font-medium text-gray-700">Uso de Vasopresores:</label><select name="vasopressorUse" id="vasopressorUse" value={formData.vasopressorUse} onChange={handleInputChange} className={inputStyle}><option value="no">No</option><option value="si">Sí</option></select></div>
            </div>
            {formData.vasopressorUse === 'si' && (
                <div className="mt-4 space-y-4 pl-2 border-l-2 border-blue-500">
                    <div><label htmlFor="vasopressorDetails" className="block text-sm font-medium text-gray-700">Dosis y tipo de vasopresor(es) (Opcional):</label><input type="text" name="vasopressorDetails" id="vasopressorDetails" value={formData.vasopressorDetails} onChange={handleInputChange} className={inputStyle} placeholder="Ej: Norepinefrina 0.1 mcg/kg/min"/></div>
                    <div className="flex items-start"><div className="flex items-center h-5"><input id="uncontrolledShock" name="uncontrolledShock" type="checkbox" checked={formData.uncontrolledShock} onChange={handleInputChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"/></div><div className="ml-3 text-sm"><label htmlFor="uncontrolledShock" className="font-medium text-gray-700">Shock incontrolado / Dosis de vasopresores en aumento</label></div></div>
            </div>
            )}
        </section>

        {/* Calorías de Infusiones No Nutricionales */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Calorías de Infusiones No Nutricionales</h3>
            
            {/* Propofol */}
            <div className="space-y-3">
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id="hasPropofol"
                            name="hasPropofol"
                            type="checkbox"
                            checked={formData.hasPropofol}
                            onChange={handleInputChange}
                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                    </div>
                    <div className="ml-3">
                        <label htmlFor="hasPropofol" className="text-sm font-medium text-gray-700">
                            Infusión de Propofol
                        </label>
                        <p className="text-xs text-gray-500">1.1 kcal/mL</p>
                    </div>
                </div>

                {formData.hasPropofol && (
                    <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <label htmlFor="propofol_rate" className="block text-sm font-medium text-gray-700">Velocidad (mL/h):</label>
                            <input
                                type="number"
                                step="0.1"
                                name="propofol_rate"
                                id="propofol_rate"
                                value={formData.propofol_rate}
                                onChange={handleInputChange}
                                className={inputStyle}
                                placeholder="Ej: 10"
                            />
                        </div>
                        <div>
                            <label htmlFor="propofol_duration" className="block text-sm font-medium text-gray-700">Duración (horas/día):</label>
                            <input
                                type="number"
                                step="0.1"
                                name="propofol_duration"
                                id="propofol_duration"
                                value={formData.propofol_duration}
                                onChange={handleInputChange}
                                className={inputStyle}
                                placeholder="Ej: 24"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Dextrosa */}
            <div className="space-y-3">
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id="hasDextrose"
                            name="hasDextrose"
                            type="checkbox"
                            checked={formData.hasDextrose}
                            onChange={handleInputChange}
                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                    </div>
                    <div className="ml-3">
                        <label htmlFor="hasDextrose" className="text-sm font-medium text-gray-700">
                            Infusión de Dextrosa
                        </label>
                        <p className="text-xs text-gray-500">3.4 kcal/g de dextrosa</p>
                    </div>
                </div>

                {formData.hasDextrose && (
                    <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <label htmlFor="dextrose_concentration" className="block text-sm font-medium text-gray-700">Concentración (%):</label>
                            <input
                                type="number"
                                step="0.1"
                                name="dextrose_concentration"
                                id="dextrose_concentration"
                                value={formData.dextrose_concentration}
                                onChange={handleInputChange}
                                className={inputStyle}
                                placeholder="Ej: 5"
                            />
                        </div>
                        <div>
                            <label htmlFor="dextrose_volume" className="block text-sm font-medium text-gray-700">Volumen (mL/día):</label>
                            <input
                                type="number"
                                step="1"
                                name="dextrose_volume"
                                id="dextrose_volume"
                                value={formData.dextrose_volume}
                                onChange={handleInputChange}
                                className={inputStyle}
                                placeholder="Ej: 1000"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Resumen de calorías no nutricionales */}
            {(formData.hasPropofol || formData.hasDextrose) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Calorías No Nutricionales Estimadas:</h4>
                    <div className="text-sm text-yellow-700">
                        {formData.hasPropofol && formData.propofol_rate && formData.propofol_duration && (
                            <p>• Propofol: {(parseFloat(formData.propofol_rate) * parseFloat(formData.propofol_duration) * 1.1).toFixed(1)} kcal/día</p>
                        )}
                        {formData.hasDextrose && formData.dextrose_concentration && formData.dextrose_volume && (
                            <p>• Dextrosa: {((parseFloat(formData.dextrose_concentration) / 100) * parseFloat(formData.dextrose_volume) * 3.4).toFixed(1)} kcal/día</p>
                        )}
                        <p className="font-medium mt-1">
                            Total: {(() => {
                                let total = 0;
                                if (formData.hasPropofol && formData.propofol_rate && formData.propofol_duration) {
                                    total += parseFloat(formData.propofol_rate) * parseFloat(formData.propofol_duration) * 1.1;
                                }
                                if (formData.hasDextrose && formData.dextrose_concentration && formData.dextrose_volume) {
                                    total += (parseFloat(formData.dextrose_concentration) / 100) * parseFloat(formData.dextrose_volume) * 3.4;
                                }
                                return total.toFixed(1);
                            })()} kcal/día
                        </p>
                    </div>
                </div>
            )}
        </section>

        {/* Historial de Peso */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Historial de Peso (Opcional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4"> 
                <div><label htmlFor="weight1m_ago" className="block text-sm font-medium text-gray-700">Peso hace 1 mes (kg):</label><input type="number" step="0.1" name="weight1m_ago" id="weight1m_ago" value={formData.weight1m_ago} onChange={handleInputChange} className={inputStyle} placeholder="Opcional"/></div>
                <div><label htmlFor="weight2m_ago" className="block text-sm font-medium text-gray-700">Peso hace 2 meses (kg):</label><input type="number" step="0.1" name="weight2m_ago" id="weight2m_ago" value={formData.weight2m_ago} onChange={handleInputChange} className={inputStyle} placeholder="Opcional"/></div>
                <div><label htmlFor="weight3m_ago" className="block text-sm font-medium text-gray-700">Peso hace 3 meses (kg):</label><input type="number" step="0.1" name="weight3m_ago" id="weight3m_ago" value={formData.weight3m_ago} onChange={handleInputChange} className={inputStyle} placeholder="Opcional"/></div>
                <div><label htmlFor="weight6m_ago" className="block text-sm font-medium text-gray-700">Peso hace 6 meses (kg):</label><input type="number" step="0.1" name="weight6m_ago" id="weight6m_ago" value={formData.weight6m_ago} onChange={handleInputChange} className={inputStyle} placeholder="Opcional"/></div>
            </div>
        </section>

        {/* Ingesta Alimentaria Reciente */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Ingesta Alimentaria Reciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <label htmlFor="recentIntakePercentage" className="block text-sm font-medium text-gray-700">Porcentaje de Ingesta Estimada (últimos 7 días aprox.):</label>
                    <select name="recentIntakePercentage" id="recentIntakePercentage" value={formData.recentIntakePercentage} onChange={handleInputChange} className={inputStyle}>
                        <option value="normal">Normal / Adecuada ({'>'}75-100%)</option>
                        <option value="50-75">Reducida Leve (50-75%)</option>
                        <option value="25-49">Reducida Moderada (25-49%)</option>
                        <option value="0-24">Nula o Insignificante ({'<'}25%)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="reducedIntakeDays" className="block text-sm font-medium text-gray-700">Duración de Ingesta Alterada (días):</label>
                    <input type="number" name="reducedIntakeDays" id="reducedIntakeDays" value={formData.reducedIntakeDays} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 7" disabled={formData.recentIntakePercentage === 'normal'}/>
                    {formData.recentIntakePercentage === 'normal' && <p className="text-xs text-gray-500 mt-1">No aplica si la ingesta es normal.</p>}
                </div>
            </div>
        </section>

        {/* Laboratorios Basales */}
        <section className="space-y-4 border-b border-slate-200 pb-4">
            <h3 className="text-lg font-medium text-gray-700">Laboratorios Basales (Si disponibles)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div><label htmlFor="lab_potassium" className="block text-sm font-medium text-gray-700">Potasio (mEq/L):</label><input type="number" step="0.1" name="lab_potassium" id="lab_potassium" value={formData.lab_potassium} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 4.0"/></div>
                <div><label htmlFor="lab_phosphorus" className="block text-sm font-medium text-gray-700">Fósforo (mg/dL):</label><input type="number" step="0.1" name="lab_phosphorus" id="lab_phosphorus" value={formData.lab_phosphorus} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 3.5"/></div>
                <div><label htmlFor="lab_magnesium" className="block text-sm font-medium text-gray-700">Magnesio (mg/dL):</label><input type="number" step="0.1" name="lab_magnesium" id="lab_magnesium" value={formData.lab_magnesium} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 2.0"/></div>
                <div><label htmlFor="lab_sodium" className="block text-sm font-medium text-gray-700">Sodio (mEq/L):</label><input type="number" step="1" name="lab_sodium" id="lab_sodium" value={formData.lab_sodium} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 140"/></div>
              <div><label htmlFor="lab_glucose" className="block text-sm font-medium text-gray-700">Glucosa (mg/dL):</label><input type="number" step="1" name="lab_glucose" id="lab_glucose" value={formData.lab_glucose} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 90"/></div>
                <div><label htmlFor="lab_creatinine" className="block text-sm font-medium text-gray-700">Creatinina (mg/dL):</label><input type="number" step="0.01" name="lab_creatinine" id="lab_creatinine" value={formData.lab_creatinine} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 0.9"/></div>
                <div><label htmlFor="lab_bun" className="block text-sm font-medium text-gray-700">BUN (mg/dL):</label><input type="number" step="1" name="lab_bun" id="lab_bun" value={formData.lab_bun} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 15"/></div>
                <div><label htmlFor="lab_ast" className="block text-sm font-medium text-gray-700">AST (U/L):</label><input type="number" step="1" name="lab_ast" id="lab_ast" value={formData.lab_ast} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 25"/></div>
                <div><label htmlFor="lab_alt" className="block text-sm font-medium text-gray-700">ALT (U/L):</label><input type="number" step="1" name="lab_alt" id="lab_alt" value={formData.lab_alt} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 30"/></div>
                <div><label htmlFor="lab_alkPhos" className="block text-sm font-medium text-gray-700">Fosf. Alcalina (U/L):</label><input type="number" step="1" name="lab_alkPhos" id="lab_alkPhos" value={formData.lab_alkPhos} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 80"/></div>
                <div><label htmlFor="lab_triglycerides" className="block text-sm font-medium text-gray-700">Triglicéridos (mg/dL):</label><input type="number" step="1" name="lab_triglycerides" id="lab_triglycerides" value={formData.lab_triglycerides} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 120"/></div>
                <div><label htmlFor="lab_crp" className="block text-sm font-medium text-gray-700">Proteína C Reactiva (mg/L):</label><input type="number" step="0.1" name="lab_crp" id="lab_crp" value={formData.lab_crp} onChange={handleInputChange} className={inputStyle} placeholder="Ej: 5.0"/></div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label htmlFor="lab_thiamine" className="block text-sm font-medium text-gray-700">Tiamina:</label>
                  <div className="mt-1 flex space-x-2">
                    <div className="flex-grow relative rounded-md shadow-sm">
                      <input 
                        type="number" 
                        step="0.1"
                        name="lab_thiamine" 
                        id="lab_thiamine" 
                        value={formData.lab_thiamine} 
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = parseFloat(value);
                          let status = '';
                          
                          if (value && !isNaN(numValue)) {
                            if (formData.lab_thiamine_unit === 'nmol/L') {
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
                          }
                          
                          const updatedData = {
                            ...formData,
                            lab_thiamine: value,
                            lab_thiamine_status: status
                          };
                          
                          setFormData(updatedData);
                          
                          if (typeof onDataChange === 'function') {
                            onDataChange(updatedData);
                          }
                        }} 
                        className={`${inputStyle} pr-16`}
                        placeholder={`Valor en ${formData.lab_thiamine_unit || 'nmol/L'}`}
                      />
                      {formData.lab_thiamine_status && (
                        <div className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                          formData.lab_thiamine_status === 'normal' ? 'text-green-600' : 
                          formData.lab_thiamine_status === 'bajo' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {formData.lab_thiamine_status.charAt(0).toUpperCase() + formData.lab_thiamine_status.slice(1)}
                        </div>
                      )}
                    </div>
                    <select
                      name="lab_thiamine_unit"
                      value={formData.lab_thiamine_unit || 'nmol/L'}
                      onChange={(e) => {
                        const newUnit = e.target.value;
                        const currentValue = parseFloat(formData.lab_thiamine);
                        let convertedValue = '';
                        
                        if (!isNaN(currentValue)) {
                          if (newUnit === 'ng/mL' && formData.lab_thiamine_unit === 'nmol/L') {
                            convertedValue = (currentValue * 0.3).toFixed(1);
                          } else if (newUnit === 'nmol/L' && formData.lab_thiamine_unit === 'ng/mL') {
                            convertedValue = (currentValue / 0.3).toFixed(1);
                          } else {
                            convertedValue = currentValue.toString();
                          }
                        }
                        
                        // Recalcular el status con la nueva unidad
                        const numValue = parseFloat(convertedValue);
                        let newStatus = '';
                        
                        if (convertedValue && !isNaN(numValue)) {
                          if (newUnit === 'nmol/L') {
                            if (numValue >= 70 && numValue <= 180) {
                              newStatus = 'normal';
                            } else if (numValue < 70) {
                              newStatus = 'bajo';
                            } else {
                              newStatus = 'alto';
                            }
                          } else { // ng/mL
                            if (numValue >= 21 && numValue <= 54) {
                              newStatus = 'normal';
                            } else if (numValue < 21) {
                              newStatus = 'bajo';
                            } else {
                              newStatus = 'alto';
                            }
                          }
                        }
                        
                        const updatedData = {
                          ...formData,
                          lab_thiamine_unit: newUnit,
                          lab_thiamine: convertedValue,
                          lab_thiamine_status: newStatus
                        };
                        
                        setFormData(updatedData);
                        
                        if (typeof onDataChange === 'function') {
                          onDataChange(updatedData);
                        }
                      }}
                      className="mt-1 block w-24 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="nmol/L">nmol/L</option>
                      <option value="ng/mL">ng/mL</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Valores de referencia: {formData.lab_thiamine_unit === 'ng/mL' ? '21-54 ng/mL' : '70-180 nmol/L'}
                  </p>
                </div>
            </div>
        </section>

        {/* Datos Calculados Antropométricos */}
        <section className="calculated-data-section anthropometric-data-container">
            <h3 className="calculated-section-title-bar">Datos Calculados Antropométricos</h3>
            
            <div className="calculated-data-item">
                <span className="calculated-data-label">IMC (kg/m²):</span>
                <span className="calculated-data-value">{formData.bmi || 'Automático'}</span>
            </div>
            
            <div className="calculated-data-item">
                <span className="calculated-data-label">Peso Ideal (kg):</span>
                <span className="calculated-data-value">{formData.idealWeight ? `${formData.idealWeight} kg` : 'Automático'}</span>
            </div>
            
            <div className="calculated-data-item">
                <span className="calculated-data-label">Peso Ajustado (kg):</span>
                <span className="calculated-data-value">{formData.adjustedWeight ? `${formData.adjustedWeight} kg` : 'Automático'}</span>
            </div>
            
            <div className="calculated-data-item">
                <span className="calculated-data-label">% Pérdida Peso (1 mes):</span>
                <span className="calculated-data-value">{formData.loss1m_percent ? `${formData.loss1m_percent}%` : 'Automático'}</span>
            </div>
            
            <div className="calculated-data-item">
                <span className="calculated-data-label">% Pérdida Peso (2 meses):</span>
                <span className="calculated-data-value">{formData.loss2m_percent ? `${formData.loss2m_percent}%` : 'Automático'}</span>
            </div>
            
            <div className="calculated-data-item">
                <span className="calculated-data-label">% Pérdida Peso (3 meses):</span>
                <span className="calculated-data-value">{formData.loss3m_percent ? `${formData.loss3m_percent}%` : 'Automático'}</span>
            </div>
            
            <div className="calculated-data-item">
                <span className="calculated-data-label">% Pérdida Peso (6 meses):</span>
                <span className="calculated-data-value">{formData.loss6m_percent ? `${formData.loss6m_percent}%` : 'Automático'}</span>
            </div>
        </section>
      </form>
    </div>
  );
}

export default GeneralDataModule;