import React, { useState, useRef } from 'react';
import { 
  Calculator, 
  Brain, 
  Activity, 
  BarChart2, 
  AlertCircle, 
  Download, 
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const CMD_Clinical_Assessment_Tool = () => {
  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    age: 65,
    gender: 'Male',
    diagnosis: 'MCI',
    mmse: 26,
    adas13: 18,
    hippocampus: 3500,
    icv: 1500000,
    fdg: 1.2,
    abeta: 800,
    tau: 250,
    ptau: 25,
    apoe4: 0
  });
  
  // Results state
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeSection, setActiveSection] = useState('input');
  const resultsSectionRef = useRef(null);
  
  // Reference data from analysis
  const diagnosticGroups = ['CN', 'EMCI', 'LMCI', 'AD'];
  const cmdReferenceData = {
    CN: { mean: 0.258, sd: 0.516, color: '#2E86AB' },
    EMCI: { mean: 0.109, sd: 0.541, color: '#A23B72' },
    LMCI: { mean: 0.143, sd: 0.553, color: '#F18F01' },
    AD: { mean: -0.699, sd: 0.602, color: '#C73E1D' }
  };
  
  const progressionRisk = {
    'High CMD (Resilient)': { 
      medianSurvival: '5.2 years', 
      annualConversion: '8%',
      color: '#2E86AB'
    },
    'Medium CMD': { 
      medianSurvival: '3.1 years', 
      annualConversion: '18%',
      color: '#FDAE61'
    },
    'Low CMD (Vulnerable)': { 
      medianSurvival: '1.3 years', 
      annualConversion: '42%',
      color: '#D7191C'
    }
  };
  
  const riskCategories = [
    { range: [1.0, Infinity], label: 'Very High Resilience', color: '#1a9850' },
    { range: [0.5, 1.0], label: 'High Resilience', color: '#66bd63' },
    { range: [0.0, 0.5], label: 'Moderate Resilience', color: '#a6d96a' },
    { range: [-0.5, 0.0], label: 'Moderate Vulnerability', color: '#fdae61' },
    { range: [-1.0, -0.5], label: 'High Vulnerability', color: '#f46d43' },
    { range: [-Infinity, -1.0], label: 'Very High Vulnerability', color: '#d73027' }
  ];

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = value;
    
    // Convert numeric values
    if (['age', 'mmse', 'adas13', 'hippocampus', 'icv', 'fdg', 'abeta', 'tau', 'ptau', 'apoe4'].includes(name)) {
      newValue = type === 'number' ? parseFloat(value) : value;
      if (isNaN(newValue)) return;
    }
    
    setFormData({
      ...formData,
      [name]: newValue
    });
  };
  
  // Calculate CMD metrics
  const calculateCMD = async () => {
    setIsCalculating(true);
    
    // Simulate calculation time for better UX
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // 1. Create cognitive composite score
    const mmseZ = (formData.mmse - 26.5) / 4.2; // Approximate population mean/SD
    const adas13Z = -((formData.adas13 - 20.1) / 8.7); // Inverted and standardized
    const cogComp = (mmseZ + adas13Z) / 2;
    
    // 2. Calculate hippocampal normalization
    const hippNorm = formData.hippocampus / formData.icv;
    
    // 3. Calculate MDS (Metabolic Dysregulation Score)
    // Approximate coefficients from the elastic net model
    const fdgZ = (formData.fdg - 1.2) / 0.16;
    const abetaZ = (formData.abeta - 980.5) / 454.6;
    const tauZ = (formData.tau - 290.3) / 136.6;
    
    // Approximate MDS calculation from coefficients
    const mds = (0.447 * fdgZ) + (-0.178 * tauZ) + (0.176 * abetaZ);
    
    // 4. Calculate CMD (residual from regression)
    // Using simplified coefficients from the paper's model
    const predictedCog = (0.817 * mds) + (322.3 * hippNorm) + (0.003 * formData.age) + (0.009 * (formData.gender === 'Male' ? 1 : 0)) - 1.703;
    const cmd = cogComp - predictedCog;
    
    // 5. Calculate risk metrics
    const hr = Math.exp(-0.728 * cmd); // Hazard ratio
    const riskGroup = cmd > 0.33 ? 'High CMD (Resilient)' : cmd < -0.33 ? 'Low CMD (Vulnerable)' : 'Medium CMD';
    const percentile = calculatePercentile(cmd, formData.diagnosis);
    
    // 6. Generate results
    const newResults = {
      cmd,
      mds,
      hippNorm,
      cogComp,
      hr,
      riskGroup,
      percentile,
      referenceValues: cmdReferenceData[formData.diagnosis] || cmdReferenceData['MCI']
    };
    
    setResults(newResults);
    setShowResults(true);
    setIsCalculating(false);
    
    // Scroll to results
    setTimeout(() => {
      if (resultsSectionRef.current) {
        resultsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };
  
  const calculatePercentile = (cmdValue, diagnosis) => {
    // Simple normal distribution percentile calculation using approximation
    const ref = cmdReferenceData[diagnosis] || cmdReferenceData['LMCI'];
    const z = (cmdValue - ref.mean) / ref.sd;
    
    // Approximation of normal CDF using error function approximation
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    
    if (z > 0) {
      return Math.round(100 * (1 - prob));
    } else {
      return Math.round(100 * prob);
    }
  };
  
  // Handle section changes
  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };
  
  // Generate clinical report using browser print
  const generateClinicalReport = () => {
    if (!results) {
      alert('Please complete an assessment before generating a report.');
      return;
    }

    // Create a new window for the report
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Please allow pop-ups for this website to generate the report.');
      return;
    }

    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CMD Clinical Assessment Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            color: #333;
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
          }
          .section {
            margin-bottom: 25px;
            padding: 15px;
            border-left: 4px solid #6366f1;
            background-color: #f8f9ff;
            border-radius: 0 8px 8px 0;
          }
          .section h2 {
            color: #4f46e5;
            margin-top: 0;
            font-size: 18px;
            font-weight: bold;
          }
          .data-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 5px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .data-label {
            font-weight: 600;
            color: #374151;
          }
          .data-value {
            color: #1f2937;
            font-weight: 500;
          }
          .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
          }
          .recommendation {
            background-color: #ecfdf5;
            padding: 10px;
            margin: 8px 0;
            border-radius: 6px;
            border-left: 3px solid #10b981;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .cmd-score {
            font-size: 24px;
            font-weight: bold;
            color: #4f46e5;
            text-align: center;
            padding: 10px;
            background-color: #e0e7ff;
            border-radius: 8px;
            margin: 10px 0;
          }
          @media print {
            body { margin: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CMD Clinical Assessment Report</h1>
          <p>Cognitive-Metabolic Decoupling for Alzheimer's Disease Risk Stratification</p>
        </div>

        <div class="section">
          <h2>PATIENT INFORMATION</h2>
          <div class="data-row">
            <span class="data-label">Patient ID:</span>
            <span class="data-value">${formData.patientId || 'Not specified'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Assessment Date:</span>
            <span class="data-value">${new Date().toLocaleDateString()}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Age:</span>
            <span class="data-value">${formData.age} years</span>
          </div>
          <div class="data-row">
            <span class="data-label">Biological Sex:</span>
            <span class="data-value">${formData.gender}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Current Diagnosis:</span>
            <span class="data-value">${formData.diagnosis}</span>
          </div>
          <div class="data-row">
            <span class="data-label">APOE-ε4 Alleles:</span>
            <span class="data-value">${formData.apoe4}</span>
          </div>
        </div>

        <div class="section">
          <h2>CMD ASSESSMENT RESULTS</h2>
          <div class="cmd-score">CMD Score: ${results.cmd.toFixed(2)}</div>
          <div class="data-row">
            <span class="data-label">Risk Category:</span>
            <span class="data-value">${getRiskCategoryLabel(results.cmd)}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Risk Group:</span>
            <span class="data-value">${results.riskGroup}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Percentile Rank:</span>
            <span class="data-value">${results.percentile}th percentile</span>
          </div>
          <div class="data-row">
            <span class="data-label">Hazard Ratio:</span>
            <span class="data-value">${results.hr.toFixed(2)}</span>
          </div>
        </div>

        <div class="section">
          <h2>BIOMARKER VALUES</h2>
          <div class="data-row">
            <span class="data-label">MMSE Score:</span>
            <span class="data-value">${formData.mmse}</span>
          </div>
          <div class="data-row">
            <span class="data-label">ADAS-13 Score:</span>
            <span class="data-value">${formData.adas13}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Hippocampal Volume:</span>
            <span class="data-value">${formData.hippocampus} mm³</span>
          </div>
          <div class="data-row">
            <span class="data-label">FDG-PET SUVR:</span>
            <span class="data-value">${formData.fdg}</span>
          </div>
          <div class="data-row">
            <span class="data-label">CSF Aβ42:</span>
            <span class="data-value">${formData.abeta} pg/mL</span>
          </div>
          <div class="data-row">
            <span class="data-label">CSF Total tau:</span>
            <span class="data-value">${formData.tau} pg/mL</span>
          </div>
          <div class="data-row">
            <span class="data-label">CSF p-tau181:</span>
            <span class="data-value">${formData.ptau} pg/mL</span>
          </div>
        </div>

        <div class="highlight">
          <h2>CLINICAL INTERPRETATION</h2>
          <p>This patient's CMD score of ${results.cmd.toFixed(2)} places them in the <strong>${results.riskGroup}</strong> category. Compared to patients with ${formData.diagnosis}, this patient ranks in the ${results.percentile}th percentile for cognitive resilience.</p>
          <p>The hazard ratio for progression to Alzheimer's Disease is ${results.hr.toFixed(2)} compared to the average patient with similar biomarker burden.</p>
        </div>

        <div class="section">
          <h2>RECOMMENDATIONS</h2>
          ${generateRecommendations(results).map((rec, index) => 
            `<div class="recommendation">${index + 1}. ${rec}</div>`
          ).join('')}
        </div>

        <div class="section">
          <h2>PROGRESSION RISK</h2>
          <div class="data-row">
            <span class="data-label">Median Survival:</span>
            <span class="data-value">${progressionRisk[results.riskGroup].medianSurvival}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Annual Conversion Risk:</span>
            <span class="data-value">${progressionRisk[results.riskGroup].annualConversion}</span>
          </div>
        </div>

        <div class="footer">
          <p><strong>CMD Clinical Assessment Tool</strong> &copy; ${new Date().getFullYear()}</p>
          <p>Based on the Cognitive-Metabolic Decoupling framework</p>
          <p>This tool is for clinical decision support only and should not replace professional medical judgment.</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
            Print Report
          </button>
        </div>
      </body>
      </html>
    `;

    reportWindow.document.write(reportContent);
    reportWindow.document.close();
  };
  
  const getRiskCategoryLabel = (cmdValue) => {
    for (const category of riskCategories) {
      if (cmdValue >= category.range[0] && cmdValue <= category.range[1]) {
        return category.label;
      }
    }
    return 'Unknown';
  };
  
  const generateRecommendations = (results) => {
    const recs = [];
    
    if (results.cmd > 0.5) {
      recs.push("Patient demonstrates strong cognitive resilience despite biological burden.");
      recs.push("Continue current monitoring schedule (annual cognitive assessment).");
      recs.push("Consider lifestyle interventions to maintain resilience factors.");
    } else if (results.cmd > 0) {
      recs.push("Patient shows moderate cognitive resilience to biological pathology.");
      recs.push("Schedule follow-up cognitive assessment in 6 months.");
      recs.push("Consider vascular risk factor optimization.");
    } else if (results.cmd > -0.5) {
      recs.push("Patient shows alignment between cognitive function and biological burden.");
      recs.push("Schedule follow-up cognitive assessment in 4 months.");
      recs.push("Consider consultation with memory disorders specialist.");
    } else {
      recs.push("Patient shows vulnerability to biological pathology with accelerated cognitive decline risk.");
      recs.push("Schedule follow-up cognitive assessment in 3 months.");
      recs.push("Strongly consider consultation with memory disorders specialist.");
      recs.push("Discuss advanced planning and caregiver support options.");
    }
    
    return recs;
  };
  
  // CMD Distribution data for visualization
  const cmdDistributionData = diagnosticGroups.map(group => {
    const stats = cmdReferenceData[group];
    return {
      name: group,
      mean: stats.mean,
      lower: stats.mean - stats.sd,
      upper: stats.mean + stats.sd,
      color: stats.color
    };
  });
  
  // CMD Risk Distribution for visualization
  const cmdRiskDistribution = [
    { range: 'Very High Resilience', cmd_min: 1.0, cmd_max: 3.0, color: '#1a9850' },
    { range: 'High Resilience', cmd_min: 0.5, cmd_max: 1.0, color: '#66bd63' },
    { range: 'Moderate Resilience', cmd_min: 0.0, cmd_max: 0.5, color: '#a6d96a' },
    { range: 'Moderate Vulnerability', cmd_min: -0.5, cmd_max: 0.0, color: '#fdae61' },
    { range: 'High Vulnerability', cmd_min: -1.0, cmd_max: -0.5, color: '#f46d43' },
    { range: 'Very High Vulnerability', cmd_min: -3.0, cmd_max: -1.0, color: '#d73027' }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-indigo-100 p-2 rounded-lg mr-3">
              <Brain className="h-8 w-8 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CMD Clinical Assessment Tool</h1>
              <p className="text-indigo-600">Cognitive-Metabolic Decoupling for Alzheimer's Disease Risk Stratification</p>
            </div>
          </div>
          <div className="flex items-center">
            <button 
              onClick={() => setShowResults(false)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Calculator className="mr-2 h-4 w-4" />
              New Assessment
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6 mb-8"
        >
          <div className="flex items-start">
            <div className="bg-blue-100 p-3 rounded-lg mr-4 mt-1">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">About CMD Assessment</h2>
              <p className="text-gray-600 mb-3">
                The Cognitive-Metabolic Decoupling (CMD) metric quantifies the mismatch between cognitive performance and biological burden in Alzheimer's disease.
              </p>
              <p className="text-gray-600 mb-3">
                This tool helps clinicians identify patients who may be more resilient or vulnerable to neurodegenerative processes based on multimodal biomarker integration.
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Clinical Utility:</span> Risk stratification, monitoring progression, identifying candidates for targeted interventions.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Input Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 cursor-pointer flex justify-between items-center"
              onClick={() => toggleSection('input')}
            >
              <div className="flex items-center">
                <Calculator className="h-5 w-5 text-white mr-2" />
                <h2 className="text-lg font-semibold text-white">Patient Data Entry</h2>
              </div>
              {activeSection === 'input' ? (
                <ChevronUp className="h-5 w-5 text-white" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white" />
              )}
            </div>
            
            <AnimatePresence>
              {(activeSection === 'input' || !showResults) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient Demographics */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <div className="bg-indigo-100 p-1 rounded mr-2">
                          <Activity className="h-4 w-4 text-indigo-600" />
                        </div>
                        Patient Demographics
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
                            Patient ID/Identifier
                          </label>
                          <input
                            type="text"
                            id="patientId"
                            name="patientId"
                            value={formData.patientId}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter patient identifier"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                              Age (years)
                            </label>
                            <input
                              type="number"
                              id="age"
                              name="age"
                              value={formData.age}
                              onChange={handleChange}
                              min="50"
                              max="95"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                              Biological Sex
                            </label>
                            <select
                              id="gender"
                              name="gender"
                              value={formData.gender}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">
                            Current Diagnosis
                          </label>
                          <select
                            id="diagnosis"
                            name="diagnosis"
                            value={formData.diagnosis}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="CN">Cognitively Normal (CN)</option>
                            <option value="EMCI">Early MCI (EMCI)</option>
                            <option value="LMCI">Late MCI (LMCI)</option>
                            <option value="AD">Alzheimer's Disease (AD)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="apoe4" className="block text-sm font-medium text-gray-700 mb-1">
                            APOE-ε4 Alleles (0, 1, or 2)
                          </label>
                          <select
                            id="apoe4"
                            name="apoe4"
                            value={formData.apoe4}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="0">0 alleles (non-carrier)</option>
                            <option value="1">1 allele (heterozygous)</option>
                            <option value="2">2 alleles (homozygous)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Biomarker Data */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <div className="bg-indigo-100 p-1 rounded mr-2">
                          <BarChart2 className="h-4 w-4 text-indigo-600" />
                        </div>
                        Biomarker Measurements
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="mmse" className="block text-sm font-medium text-gray-700 mb-1">
                              MMSE Score
                            </label>
                            <input
                              type="number"
                              id="mmse"
                              name="mmse"
                              value={formData.mmse}
                              onChange={handleChange}
                              min="0"
                              max="30"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="adas13" className="block text-sm font-medium text-gray-700 mb-1">
                              ADAS-13 Score
                            </label>
                            <input
                              type="number"
                              id="adas13"
                              name="adas13"
                              value={formData.adas13}
                              onChange={handleChange}
                              min="0"
                              max="85"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="hippocampus" className="block text-sm font-medium text-gray-700 mb-1">
                              Hippocampal Volume (mm³)
                            </label>
                            <input
                              type="number"
                              id="hippocampus"
                              name="hippocampus"
                              value={formData.hippocampus}
                              onChange={handleChange}
                              min="2000"
                              max="5000"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="icv" className="block text-sm font-medium text-gray-700 mb-1">
                              Intracranial Volume (mm³)
                            </label>
                            <input
                              type="number"
                              id="icv"
                              name="icv"
                              value={formData.icv}
                              onChange={handleChange}
                              min="1000000"
                              max="2000000"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="fdg" className="block text-sm font-medium text-gray-700 mb-1">
                              FDG-PET SUVR
                            </label>
                            <input
                              type="number"
                              id="fdg"
                              name="fdg"
                              value={formData.fdg}
                              onChange={handleChange}
                              step="0.1"
                              min="0.5"
                              max="2.0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="abeta" className="block text-sm font-medium text-gray-700 mb-1">
                              CSF Aβ42 (pg/mL)
                            </label>
                            <input
                              type="number"
                              id="abeta"
                              name="abeta"
                              value={formData.abeta}
                              onChange={handleChange}
                              min="200"
                              max="1500"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="tau" className="block text-sm font-medium text-gray-700 mb-1">
                              CSF Total tau (pg/mL)
                            </label>
                            <input
                              type="number"
                              id="tau"
                              name="tau"
                              value={formData.tau}
                              onChange={handleChange}
                              min="50"
                              max="1000"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="ptau" className="block text-sm font-medium text-gray-700 mb-1">
                              CSF p-tau181 (pg/mL)
                            </label>
                            <input
                              type="number"
                              id="ptau"
                              name="ptau"
                              value={formData.ptau}
                              onChange={handleChange}
                              min="5"
                              max="100"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={calculateCMD}
                      disabled={isCalculating}
                      className={`px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg font-medium flex items-center transition-all ${
                        isCalculating 
                          ? 'opacity-75 cursor-not-allowed' 
                          : 'hover:from-indigo-700 hover:to-purple-800 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {isCalculating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Calculating Assessment...
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-5 w-5" />
                          Generate CMD Assessment
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {showResults && results && (
            <motion.section
              ref={resultsSectionRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-md overflow-hidden mb-8"
            >
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Brain className="mr-2 h-6 w-6" />
                  CMD Assessment Results
                </h2>
              </div>
              
              <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-l-4 border-indigo-500 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-indigo-700 mb-1">CMD Score</h3>
                    <p className="text-3xl font-bold text-indigo-800">{results.cmd.toFixed(2)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {results.cmd > 0 ? 
                        `${getRiskCategoryLabel(results.cmd)} - Cognitive performance better than expected` : 
                        `${getRiskCategoryLabel(results.cmd)} - Cognitive performance worse than expected`}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-100 border-l-4 border-amber-500 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-amber-700 mb-1">Risk Category</h3>
                    <p className="text-2xl font-bold text-amber-800">{results.riskGroup}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {progressionRisk[results.riskGroup].annualConversion} annual conversion risk to AD
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-green-100 border-l-4 border-emerald-500 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-emerald-700 mb-1">Percentile Rank</h3>
                    <p className="text-3xl font-bold text-emerald-800">{results.percentile}th</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Compared to patients with {formData.diagnosis} diagnosis
                    </p>
                  </div>
                </div>
                
                {/* Visualizations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* CMD Distribution Chart */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <BarChart2 className="mr-2 h-5 w-5 text-indigo-600" />
                      CMD Distribution by Diagnostic Group
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={cmdDistributionData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            label={{ value: 'Diagnostic Group', position: 'insideBottom', offset: -5 }} 
                            tick={{ fill: '#4a5568' }}
                          />
                          <YAxis 
                            label={{ value: 'CMD Score', angle: -90, position: 'insideLeft' }} 
                            tick={{ fill: '#4a5568' }}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #cbd5e0', borderRadius: '4px' }}
                            formatter={(value) => [value.toFixed(2), 'CMD Score']}
                          />
                          <Legend />
                          
                          {/* Patient's CMD marker */}
                          <ReferenceLine 
                            y={results.cmd} 
                            stroke="#4a5568" 
                            strokeDasharray="3 3"
                            label={{ 
                              value: `Patient: ${results.cmd.toFixed(2)}`, 
                              position: 'right',
                              fill: '#4a5568',
                              fontSize: 12
                            }}
                          />
                          
                          {/* Group bars */}
                          {cmdDistributionData.map((group, index) => (
                            <Bar 
                              key={index}
                              dataKey="mean"
                              fill={group.color}
                              barSize={40}
                              name={group.name}
                              radius={[4, 4, 0, 0]}
                            >
                              <errorBar dataKey="lower" dataKeyError="upper" width={2} strokeWidth={1} stroke="rgba(0,0,0,0.2)" />
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Risk Assessment Chart */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-indigo-600" />
                      Individual Risk Assessment
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={cmdRiskDistribution}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis 
                            type="number" 
                            domain={[-3, 3]}
                            label={{ value: 'CMD Score', position: 'insideBottom', offset: -5 }} 
                            tick={{ fill: '#4a5568' }}
                          />
                          <YAxis 
                            dataKey="range" 
                            type="category" 
                            width={150}
                            tick={{ fill: '#4a5568', fontSize: 12 }}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #cbd5e0', borderRadius: '4px' }}
                            formatter={(value, name) => [value, name]}
                          />
                          
                          {/* Patient's CMD marker */}
                          <ReferenceLine 
                            x={results.cmd} 
                            stroke="#1a202c" 
                            strokeWidth={2}
                            label={{ 
                              value: `Patient: ${results.cmd.toFixed(2)}`, 
                              position: 'top',
                              fill: '#1a202c',
                              fontSize: 12
                            }}
                          />
                          
                          {/* Risk bars */}
                          {cmdRiskDistribution.map((range, index) => (
                            <Bar
                              key={index}
                              dataKey="cmd_max"
                              fill={range.color}
                              stackId="a"
                              barSize={30}
                              name={range.range}
                            />
                          ))}
                          
                          {cmdRiskDistribution.map((range, index) => (
                            <Bar
                              key={`min-${index}`}
                              dataKey="cmd_min"
                              fill="#e2e8f0"
                              stackId="a"
                              barSize={30}
                              name={range.range}
                              opacity={0.2}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Clinical Interpretation */}
                <div className="bg-indigo-50 rounded-lg p-6 mb-8">
                  <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center">
                    <AlertCircle className="mr-2 h-6 w-6 text-indigo-600" />
                    Clinical Interpretation & Recommendations
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-lg">
                      <h4 className="font-medium text-lg text-gray-900 mb-2">Risk Assessment Summary</h4>
                      <p className="text-gray-700">
                        This patient's CMD score of {results.cmd.toFixed(2)} places them in the <span className="font-medium">{results.riskGroup}</span> category. 
                        Compared to patients with {formData.diagnosis}, this patient ranks in the {results.percentile}th percentile for cognitive resilience.
                        The hazard ratio for progression to Alzheimer's Disease is {results.hr.toFixed(2)} compared to the average patient with similar biomarker burden.
                      </p>
                    </div>
                    
                    <div className="bg-white border-l-4 border-amber-500 p-4 rounded-r-lg">
                      <h4 className="font-medium text-lg text-gray-900 mb-2">Monitoring Recommendations</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        {generateRecommendations(results).map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-white border-l-4 border-green-500 p-4 rounded-r-lg">
                      <h4 className="font-medium text-lg text-gray-900 mb-2">Intervention Considerations</h4>
                      <p className="text-gray-700">
                        Based on the CMD profile, consider these personalized intervention strategies:
                      </p>
                      <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
                        <li>
                          {results.cmd > 0 
                            ? "Leverage resilience factors: Identify cognitive and lifestyle strengths that may be contributing to better-than-expected performance." 
                            : "Targeted interventions: Focus on modifiable risk factors that may help improve cognitive reserve relative to biological burden."
                          }
                        </li>
                        <li>
                          {results.cmd > 0.5
                            ? "Prevention focus: Emphasize maintenance of current cognitive status through continued engagement in cognitively stimulating activities."
                            : results.cmd > 0
                              ? "Early intervention: Consider cognitive training programs to strengthen compensatory mechanisms."
                              : "Accelerated intervention: Prioritize aggressive management of vascular risk factors and cognitive rehabilitation."
                          }
                        </li>
                        <li>
                          {results.cmd > 0
                            ? "Standard monitoring schedule is appropriate."
                            : "Consider more frequent cognitive assessments (every 3-4 months) to detect early signs of decline."
                          }
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="bg-white rounded-xl shadow-md p-6 mt-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Download className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Save or Share This Assessment</h3>
            <p className="text-gray-600 mb-4">
              This assessment can be saved as a PDF report for the patient's medical record or shared with other healthcare providers.
            </p>
            <button 
              onClick={generateClinicalReport}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center mx-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Generate Clinical Report
            </button>
            
            <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-500">
              <p>
                CMD Clinical Assessment Tool &copy; {new Date().getFullYear()} | Based on the Cognitive-Metabolic Decoupling framework
              </p>
              <p className="mt-1">
                This tool is for clinical decision support only and should not replace professional medical judgment.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default CMD_Clinical_Assessment_Tool;