import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Upload, Play, RotateCcw, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const SchemeReportGenerator = () => {
  const [masterData, setMasterData] = useState(null);
  const [registerData, setRegisterData] = useState(null);
  const [uniqueSchemes, setUniqueSchemes] = useState([]);
  const [schemeColumn, setSchemeColumn] = useState(null);
  const [registerSchemeColumn, setRegisterSchemeColumn] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingLog, setProcessingLog] = useState([]);
  const [processStats, setProcessStats] = useState({ successful: 0, failed: 0 });
  const [showLog, setShowLog] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [failedSchemes, setFailedSchemes] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const NAVY_BLUE = 'FF000080';
  const SKY_BLUE = 'FF87CEEB';
  const WHITE = 'FFFFFFFF';
  const BLACK = 'FF000000';
  
  const COLUMNS_TO_REMOVE = [
    'INTEG MEMBER NUMBER', 'OTHER NUMBER', 'OFFICE BRANCH', 'CARD SERIAL',
    'CAT CODE', 'POOL NUMBER', 'INVOICE NUMBER', 'BILLING ID',
    'LOCAL CONVERSION RATE', 'POLICY CONVERSION RATE', 'IS ROAMER CLAIM',
    'ROAMER AMOUNT', 'ACTIONED_BY', 'COMMENT', 'INSURANCE SPLIT AMOUNT',
    'MEMBER SPLIT AMOUNT', 'GLOBAL INVOICE NUMBER', 'PRINCIPAL NAMES',
    'PRINCIPAL MEMBER NUMBER', 'PRINCIPAL OTHER NUMBER',
    'RELATIONSHIP TO PRINCIPAL', 'PHONE NUMBER', 'PHONE NUMBER2',
    'PARENT POOL', 'PARENT POOL DESCRIPTION'
  ];

  const addLog = (message) => {
    setProcessingLog(prev => [...prev, message]);
  };

  const calculateAgeBand = (dob) => {
    if (!dob) return 'N/A';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      if (today.getMonth() < birthDate.getMonth() || 
          (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age <= 17) return '0-17';
      if (age <= 35) return '18-35';
      if (age <= 55) return '36-55';
      return '55+';
    } catch {
      return 'N/A';
    }
  };

  const categorizeBenefit = (benefitDesc) => {
    if (!benefitDesc) return 'Outpatient';
    const desc = String(benefitDesc).toUpperCase();

    if (desc.includes('IN PATIENT')) {
      if (desc.includes('CHRONIC') || desc.includes('PRE-EXISTING')) return 'Chronic IP';
      if (desc.includes('DENTAL')) return 'Inpatient';
      if (desc.includes('OPTICAL')) return 'Inpatient';
      if (desc.includes('MATERNITY') || desc.includes('ANTENATAL')) return 'Maternity';
      return 'Inpatient';
    }
    if (desc.includes('OUTPATIENT') || desc.includes('OUT PATIENT')) {
      if (desc.includes('(INCLUSIVE OF')) return 'Outpatient';
      if (desc.includes('OPTICAL')) return 'Optical';
      if (desc.includes('CHRONIC') || desc.includes('PRE-EXISTING')) return 'Chronic OP';
      if (desc.includes('MATERNITY')) return 'Maternity';
      if (desc.includes('DENTAL')) return 'Dental';
      return 'Outpatient';
    }
    if (desc.includes('MATERNITY') || desc.includes('ANTENATAL')) return 'Maternity';
    if (desc.substring(0, 6) === 'DENTAL') return 'Dental';
    if (desc.substring(0, 7) === 'OPTICAL') return 'Optical';
    return 'Outpatient';
  };

  const determineRelationship = (memberNumber) => {
    if (!memberNumber) return 'Dependant';
    return String(memberNumber).slice(-2) === '00' ? 'Principal' : 'Dependant';
  };

  const toProperCase = (str) => {
    if (!str) return str;
    return String(str).toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      const date = new Date(dateValue);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]}-${date.getFullYear()}`;
    } catch {
      return 'N/A';
    }
  };

  const handleImportMasterData = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const schemeColumnNames = ['SCHEME', 'SCHEME NAME', 'COMPANY NAME', 'COMPANY'];
        let foundColumn = null;
        for (const col of schemeColumnNames) {
          if (data[0] && col in data[0]) {
            foundColumn = col;
            break;
          }
        }

        if (foundColumn) {
          setSchemeColumn(foundColumn);
          const schemes = [...new Set(data.map(row => row[foundColumn]).filter(Boolean))].sort();
          setUniqueSchemes(schemes);
          setMasterData(data);
          alert(`✅ Master data loaded!\n${schemes.length} unique schemes found`);
        } else {
          alert('❌ Could not find scheme column');
        }
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportRegisterData = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const registerSchemeColumnNames = ['Scheme Name', 'SCHEME NAME', 'COMPANY NAME', 'COMPANY', 'SCHEME'];
        let foundColumn = null;
        for (const col of registerSchemeColumnNames) {
          if (data[0] && col in data[0]) {
            foundColumn = col;
            break;
          }
        }

        if (foundColumn) {
          setRegisterSchemeColumn(foundColumn);
          setRegisterData(data);
          alert(`✅ Register data loaded!\n${data.length} records found`);
        } else {
          alert('❌ Could not find scheme column in register');
        }
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const getRegisterDataForScheme = (schemeName) => {
    if (!registerData || !registerSchemeColumn) return null;
    return registerData.find(row => 
      String(row[registerSchemeColumn]).trim().toUpperCase() === String(schemeName).trim().toUpperCase()
    ) || null;
  };

  const processSchemeData = (schemeName) => {
    let schemeData = masterData.filter(row => row[schemeColumn] === schemeName).map(row => ({...row}));
    if (schemeData.length === 0) return null;

    schemeData = schemeData.map(row => {
      const filtered = {...row};
      COLUMNS_TO_REMOVE.forEach(col => delete filtered[col]);
      return filtered;
    });

    schemeData = schemeData.map(row => ({
      ...row,
      'Age Bands': calculateAgeBand(row.DOB),
      'Benefits': categorizeBenefit(row['BENEFIT DESC']),
      'Relationships': determineRelationship(row['MEMBER NUMBER']),
      'PROVIDER NAME': toProperCase(row['PROVIDER NAME']),
      'Date': formatDate(row['TRANSACTION DATE'])
    }));

    const visitsMap = new Map();
    schemeData.forEach(row => {
      const key = `${row['MEMBER NUMBER']}-${row['TRANSACTION DATE']}-${row['PROVIDER NAME']}-${row.Benefits}`;
      if (!visitsMap.has(key)) {
        visitsMap.set(key, row);
      }
    });
    const visitsData = Array.from(visitsMap.values());

    return { schemeData, visitsData };
  };

  const createBenefitsUsage = (schemeData, visitsData) => {
    const pivotData = {};
    const benefitSet = new Set();
    
    schemeData.forEach(row => {
      const date = row.Date;
      if (!pivotData[date]) pivotData[date] = {};
      const benefit = row.Benefits;
      benefitSet.add(benefit);
      pivotData[date][benefit] = (pivotData[date][benefit] || 0) + (row.AMOUNT || 0);
    });

    const benefits = Array.from(benefitSet).sort();
    const sheetData = [['Month', ...benefits, 'Grand Total', 'Visits', 'Average Costs', 'Percentage']];
    
    let grandTotalAmount = 0;
    let grandTotalVisits = 0;
    const benefitTotals = benefits.map(() => 0);

    Object.entries(pivotData).forEach(([month, benefitsData]) => {
      const row = [month];
      let rowTotal = 0;
      
      benefits.forEach((benefit, idx) => {
        const amount = benefitsData[benefit] || 0;
        row.push(amount);
        rowTotal += amount;
        benefitTotals[idx] += amount;
      });
      
      const visits = visitsData.filter(v => formatDate(v['TRANSACTION DATE']) === month).length;
      const avgCost = visits > 0 ? rowTotal / visits : 0;
      
      row.push(rowTotal);
      row.push(visits);
      row.push(avgCost);
      row.push(0);
      
      grandTotalAmount += rowTotal;
      grandTotalVisits += visits;
      
      sheetData.push(row);
    });

    for (let i = 1; i < sheetData.length; i++) {
      const rowTotal = sheetData[i][benefits.length + 1];
      sheetData[i][benefits.length + 4] = grandTotalAmount > 0 ? rowTotal / grandTotalAmount : 0;
    }

    const grandTotalRow = ['Grand Total', ...benefitTotals, grandTotalAmount, grandTotalVisits, 
                           grandTotalVisits > 0 ? grandTotalAmount / grandTotalVisits : 0, 1];
    sheetData.push(grandTotalRow);

    return sheetData;
  };

  const createMemberUsage = (schemeData, visitsData) => {
    const pivotData = {};
    const benefitSet = new Set();
    
    schemeData.forEach(row => {
      const member = row['MEMBER NUMBER'];
      if (!pivotData[member]) pivotData[member] = {};
      const benefit = row.Benefits;
      benefitSet.add(benefit);
      pivotData[member][benefit] = (pivotData[member][benefit] || 0) + (row.AMOUNT || 0);
    });

    const benefits = Array.from(benefitSet).sort();
    const sheetData = [['Member No.', ...benefits, 'Grand Total', 'Visits', 'Average Costs', 'Percentage']];
    
    let grandTotalAmount = 0;
    let grandTotalVisits = 0;
    const benefitTotals = benefits.map(() => 0);

    Object.entries(pivotData).forEach(([member, benefitsData]) => {
      const row = [member];
      let rowTotal = 0;
      
      benefits.forEach((benefit, idx) => {
        const amount = benefitsData[benefit] || 0;
        row.push(amount);
        rowTotal += amount;
        benefitTotals[idx] += amount;
      });
      
      const visits = visitsData.filter(v => v['MEMBER NUMBER'] === member).length;
      const avgCost = visits > 0 ? rowTotal / visits : 0;
      
      row.push(rowTotal);
      row.push(visits);
      row.push(avgCost);
      row.push(0);
      
      grandTotalAmount += rowTotal;
      grandTotalVisits += visits;
      
      sheetData.push(row);
    });

    const totalValue = grandTotalAmount / 2;
    for (let i = 1; i < sheetData.length; i++) {
      const rowTotal = sheetData[i][benefits.length + 1];
      sheetData[i][benefits.length + 4] = totalValue > 0 ? rowTotal / totalValue : 0;
    }

    const grandTotalRow = ['Grand Total', ...benefitTotals, grandTotalAmount, grandTotalVisits,
                           grandTotalVisits > 0 ? grandTotalAmount / grandTotalVisits : 0, 1];
    sheetData.push(grandTotalRow);

    return sheetData;
  };

  const createHospitalsUsage = (schemeData, visitsData) => {
    const hospitalData = {};
    
    schemeData.forEach(row => {
      const hospital = row['PROVIDER NAME'] || 'Unknown';
      if (!hospitalData[hospital]) hospitalData[hospital] = { claims: 0, visits: 0 };
      hospitalData[hospital].claims += row.AMOUNT || 0;
    });

    visitsData.forEach(row => {
      const hospital = row['PROVIDER NAME'] || 'Unknown';
      if (hospitalData[hospital]) hospitalData[hospital].visits += 1;
    });

    const sheetData = [['Hospital Name.', 'Total Claims', 'Visits', 'Average Costs', 'Percentage']];
    
    let grandTotalClaims = 0;
    let grandTotalVisits = 0;

    Object.entries(hospitalData).forEach(([hospital, data]) => {
      const avgCost = data.visits > 0 ? data.claims / data.visits : 0;
      sheetData.push([hospital, data.claims, data.visits, avgCost, 0]);
      grandTotalClaims += data.claims;
      grandTotalVisits += data.visits;
    });

    const totalValues = grandTotalClaims / 2;
    for (let i = 1; i < sheetData.length; i++) {
      sheetData[i][4] = totalValues > 0 ? sheetData[i][1] / totalValues : 0;
    }

    const grandTotalRow = ['Grand Total', grandTotalClaims, grandTotalVisits,
                           grandTotalVisits > 0 ? grandTotalClaims / grandTotalVisits : 0, 1];
    sheetData.push(grandTotalRow);

    return sheetData;
  };

  const createLossRatio = (schemeData, schemeName) => {
    const distinctMembers = new Set(schemeData.map(row => row['MEMBER NUMBER'])).size;
    const totalClaimsIncurred = schemeData.reduce((sum, row) => sum + (row.AMOUNT || 0), 0);
    const maxTransactionDate = schemeData.reduce((max, row) => {
      const date = new Date(row['TRANSACTION DATE']);
      return date > max ? date : max;
    }, new Date(0));

    const registerRow = getRegisterDataForScheme(schemeName);

    const getValue = (colName, def = '') => {
      if (registerRow && colName in registerRow) {
        const val = registerRow[colName];
        if (val === null || val === undefined || val === '') return def;
        if (val instanceof Date) {
          const d = val;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
        }
        return val;
      }
      return def;
    };

    const formatMaxDate = (date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
    };

    const basicPremiums = getValue('BASIC PREMIUMS', 0);
    const earnedPremium = getValue('EARNED PREMIUM', 0);
    const lives = getValue('LIVES', distinctMembers);
    const startDate = getValue('Start Date', '');
    const endDate = getValue('End Date', '');
    const projectedClaims = getValue('PROJECTED CLAIMS', 0);
    const fyLossRatio = getValue('FY LOSS RATIO', 0);

    let expectedClaims = 0;
    if (startDate && endDate) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const valDate = maxTransactionDate;
        
        const daysStartToVal = Math.floor((valDate - start) / (1000 * 60 * 60 * 24));
        const daysValToEnd = Math.floor((end - valDate) / (1000 * 60 * 60 * 24));
        
        if (daysStartToVal > 0) {
          expectedClaims = (totalClaimsIncurred / daysStartToVal) * daysValToEnd;
        }
      } catch (e) {
        expectedClaims = 0;
      }
    }

    const totalExpenditure = totalClaimsIncurred + expectedClaims;
    
    const parseNumeric = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
      return 0;
    };

    const earnedPremiumNum = parseNumeric(earnedPremium);
    const currentLossRatio = earnedPremiumNum > 0 ? totalClaimsIncurred / earnedPremiumNum : 0;
    
    const livesNum = parseNumeric(lives);
    const incidenceRate = livesNum > 0 ? distinctMembers / livesNum : 0;

    const projectedLossRatio = parseNumeric(fyLossRatio) || (earnedPremiumNum > 0 ? totalExpenditure / earnedPremiumNum : 0);

    return [
      ['COMPANY NAME', schemeName],
      ['START DATE', startDate],
      ['END DATE', endDate],
      ['VALUATION DATE', formatMaxDate(maxTransactionDate)],
      ['', ''],
      ['POPULATION', lives],
      ['NUMBER OF CLAIMANTS', distinctMembers],
      ['INCIDENCE RATE', incidenceRate],
      ['', ''],
      ['LOSS RATIO COMPUTATION', ''],
      ['BASIC PREMIUM', basicPremiums],
      ['CLAIMS INCURRED', totalClaimsIncurred],
      ['EXPECTED CLAIMS', expectedClaims],
      ['TOTAL EXPENDITURE', totalExpenditure],
      ['CURRENT LOSS RATIO', currentLossRatio],
      ['PROJECTED LOSS RATIO', projectedLossRatio]
    ];
  };

  const applySheetFormatting = (worksheet) => {
    worksheet.views = [{ showGridLines: false }];

    worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      row.eachCell({ includeEmpty: false }, (cell, colIndex) => {
        const isHeader = rowIndex === 2;
        const cellValue = cell.value;
        const isGrandTotal = String(cellValue) === 'Grand Total';

        if (isHeader || isGrandTotal) {
          cell.font = { name: 'Garamond', size: 10, bold: true, color: { argb: WHITE } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
          cell.border = {
            top: { style: 'thin', color: { argb: BLACK } },
            bottom: { style: isHeader ? 'medium' : 'thin', color: { argb: BLACK } },
            left: { style: 'thin', color: { argb: BLACK } },
            right: { style: 'thin', color: { argb: BLACK } }
          };
          cell.numFmt = '#,##0.00';
        } else if (colIndex > 1) {
          const headerCell = worksheet.getRow(2).getCell(colIndex);
          const headerName = headerCell.value ? String(headerCell.value).toUpperCase() : '';
          
          let numFmt = '#,##0.00';
          let alignment = 'center';
          
          if (headerName.includes('PERCENTAGE')) {
            numFmt = '0.0%';
          } else if (headerName.includes('AVERAGE')) {
            numFmt = '#,##0';
          } else if (headerName.includes('VISITS')) {
            numFmt = '0';
          } else if (headerName.includes('MONTH') && colIndex === 2) {
            numFmt = 'mmm-yyyy';
            alignment = 'center';
          } else if (colIndex === 2) {
            alignment = 'left';
            numFmt = '@';
          }

          cell.font = { name: 'Garamond', size: 10, color: { argb: BLACK } };
          cell.alignment = { horizontal: alignment, vertical: 'middle', wrapText: false };
          cell.numFmt = numFmt;
          cell.border = {
            top: { style: 'thin', color: { argb: BLACK } },
            bottom: { style: 'thin', color: { argb: BLACK } },
            left: { style: 'thin', color: { argb: BLACK } },
            right: { style: 'thin', color: { argb: BLACK } }
          };
        }
      });
    });

    worksheet.columns.forEach((column, idx) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 40);
    });
  };

  const applyLossRatioFormatting = (worksheet, startRow = 6) => {
    worksheet.views = [{ showGridLines: false }];
    
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 25;

    worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      row.eachCell({ includeEmpty: false }, (cell, colIndex) => {
        if (colIndex === 1 || rowIndex < startRow) return;
        
        const cellValue = cell.value;
        
        if (cellValue === 'COMPANY NAME' || cellValue === 'POPULATION' || 
            cellValue === 'LOSS RATIO COMPUTATION' || cellValue === 'PROJECTED LOSS RATIO') {
          cell.font = { name: 'Garamond', size: 10, bold: true, color: { argb: BLACK } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SKY_BLUE } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: BLACK } },
            bottom: { style: 'thin', color: { argb: BLACK } },
            left: { style: 'thin', color: { argb: BLACK } },
            right: { style: 'thin', color: { argb: BLACK } }
          };
        } else if (colIndex === 2 && cellValue !== '') {
          cell.font = { name: 'Garamond', size: 10, color: { argb: BLACK } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: BLACK } },
            bottom: { style: 'thin', color: { argb: BLACK } },
            left: { style: 'thin', color: { argb: BLACK } },
            right: { style: 'thin', color: { argb: BLACK } }
          };
        } else if (colIndex === 3) {
          const metricCell = worksheet.getRow(rowIndex).getCell(2);
          const metricName = metricCell.value ? String(metricCell.value).toUpperCase() : '';
          
          let numFmt = '#,##0';
          if (metricName.includes('LOSS RATIO') || metricName.includes('INCIDENCE RATE')) {
            numFmt = '0%';
          } else if (metricName.includes('DATE')) {
            numFmt = 'dd-mmm-yyyy';
          }
          
          const fillColor = (metricName === 'PROJECTED LOSS RATIO') ? 
            { type: 'pattern', pattern: 'solid', fgColor: { argb: SKY_BLUE } } : {};
          
          cell.font = { name: 'Garamond', size: 10, color: { argb: BLACK } };
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = numFmt;
          if (fillColor.type) cell.fill = fillColor;
          cell.border = {
            top: { style: 'thin', color: { argb: BLACK } },
            bottom: { style: 'thin', color: { argb: BLACK } },
            left: { style: 'thin', color: { argb: BLACK } },
            right: { style: 'thin', color: { argb: BLACK } }
          };
        }
      });
    });
  };

  const createExcelReport = async (schemeName, schemeData, visitsData) => {
    const workbook = new ExcelJS.Workbook();

    // 1. Loss Ratio
    const lossRatioData = createLossRatio(schemeData, schemeName);
    const wsLoss = workbook.addWorksheet('Loss Ratio');
    
    // Insert empty rows for logo space (rows 1-4) and margin (row 5)
    for (let i = 0; i < 5; i++) {
      wsLoss.insertRow(1, []);
    }
    
    // Add data starting from row 6
    lossRatioData.forEach(row => {
      wsLoss.addRow([null, ...row]);
    });

    try {
      const response = await fetch('/assets/icealogo.png');
      if (response.ok) {
        const imageBlob = await response.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: 'png',
        });
        
        wsLoss.addImage(imageId, {
          tl: { col: 1, row: 0 },
          ext: { width: 150, height: 60 }
        });
      }
    } catch (error) {
      console.log('Logo not found, continuing without logo');
    }
    
    applyLossRatioFormatting(wsLoss, 6);

    // 2. Benefits Usage
    const benefitsData = createBenefitsUsage(schemeData, visitsData);
    const wsBenefits = workbook.addWorksheet('Benefits Usage');
    wsBenefits.insertRow(1, []);
    benefitsData.forEach(row => {
      wsBenefits.addRow([null, ...row]);
    });
    applySheetFormatting(wsBenefits);

    // 3. Member Usage
    const memberData = createMemberUsage(schemeData, visitsData);
    const wsMember = workbook.addWorksheet('Member Usage');
    wsMember.insertRow(1, []);
    memberData.forEach(row => {
      wsMember.addRow([null, ...row]);
    });
    applySheetFormatting(wsMember);

    // 4. Hospitals Usage
    const hospitalsData = createHospitalsUsage(schemeData, visitsData);
    const wsHospitals = workbook.addWorksheet('Hospitals Usage');
    wsHospitals.insertRow(1, []);
    hospitalsData.forEach(row => {
      wsHospitals.addRow([null, ...row]);
    });
    applySheetFormatting(wsHospitals);

    const filename = `${schemeName.replace(/[^a-z0-9]/gi, '_')}_Report.xlsx`;
    return { workbook, filename };
  };

  const triggerDownload = async (workbook, filename) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const processAllSchemes = async () => {
    if (!masterData) {
      alert('❌ Please import master data first');
      return;
    }
    if (!registerData) {
      alert('❌ Please import register data first');
      return;
    }

    setProcessing(true);
    setProcessingLog([]);
    setProcessStats({ successful: 0, failed: 0 });
    setDownloadProgress(0);
    setShowLog(true);
    setFailedSchemes([]);

    addLog(`🚀 PROCESSING ${uniqueSchemes.length} SCHEMES`);
    addLog('='.repeat(60));

    let successful = 0;
    let failed = 0;
    const failedList = [];
    const downloadQueue = [];

    for (let i = 0; i < uniqueSchemes.length; i++) {
      const scheme = uniqueSchemes[i];
      try {
        addLog(`\n📋 [${String(i + 1).padStart(2, ' ')}/${uniqueSchemes.length}] ${scheme}`);

        const processed = processSchemeData(scheme);
        if (!processed) {
          addLog('    ❌ No data found');
          failed++;
          failedList.push(scheme);
          continue;
        }

        const { schemeData, visitsData } = processed;
        addLog(`    📊 Records: ${schemeData.length.toLocaleString()}`);
        addLog(`    📊 Visits: ${visitsData.length.toLocaleString()}`);

        const registerRow = getRegisterDataForScheme(scheme);
        if (registerRow) {
          addLog('    📋 Register data: Found');
        } else {
          addLog('    ⚠️  Register data: Not found (will use defaults)');
        }

        const reportFile = await createExcelReport(scheme, schemeData, visitsData);
        downloadQueue.push(reportFile);
        addLog('    ✅ Report generated');
        successful++;
      } catch (error) {
        addLog(`    ❌ Error: ${error.message}`);
        failed++;
        failedList.push(scheme);
      }
    }

    setProcessStats({ successful, failed });
    setFailedSchemes(failedList);
    
    addLog('\n' + '='.repeat(60));
    addLog(`🎉 PROCESSING COMPLETE!`);
    addLog(`✅ Successful: ${successful}`);
    addLog(`❌ Failed: ${failed}`);
    
    if (failedList.length > 0) {
      addLog('\n⚠️  Failed schemes:');
      failedList.forEach(scheme => addLog(`   • ${scheme}`));
    }
    
    addLog('\n📥 Starting downloads...');

    for (let i = 0; i < downloadQueue.length; i++) {
      const { workbook, filename } = downloadQueue[i];
      await triggerDownload(workbook, filename);
      setDownloadProgress(i + 1);
      addLog(`    ✅ Downloaded ${i + 1}/${downloadQueue.length}: ${filename}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    addLog('\n🎉 All downloads completed!');
    setProcessing(false);
    alert(`✅ Processing Complete!\n\n${successful} reports generated successfully\n${failed} reports failed\n\nAll files downloaded to your Downloads folder.`);
  };

  const resetSystem = () => {
    setMasterData(null);
    setRegisterData(null);
    setUniqueSchemes([]);
    setSchemeColumn(null);
    setRegisterSchemeColumn(null);
    setProcessingLog([]);
    setProcessStats({ successful: 0, failed: 0 });
    setShowLog(false);
    setDownloadProgress(0);
    setFailedSchemes([]);
    alert('✅ System reset. Ready for new data.');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Multi-Scheme Report Generator</h1>
          <p className="text-blue-100 mt-2">Generates Reports for Coporate schemes only</p>
        </div>

        <div className="p-8">
          <div className="mb-6 p-5 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h2 className="font-bold text-blue-900 mb-3">📋 Instructions:</h2>
            <ol className="text-blue-800 text-sm space-y-2 ml-6 list-decimal">
              <li><strong>Import Master Data</strong> -  Excel file with all schemes' Smart utilization report</li>
              <li><strong>Import Register Data</strong> - Excel file with scheme details for Loss Ratio calculations</li>
              <li><strong>Process All Schemes</strong> - Generates formatted reports for each scheme with:
                <ul className="ml-6 mt-1 list-disc text-xs">
                  <li>Loss Ratio Report </li>
                  <li>Benefits Usage </li>
                  <li>Member Usage </li>
                  <li>Hospitals Usage </li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                {masterData ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                <span className="font-semibold text-gray-700">Master Data</span>
              </div>
              <p className="text-sm text-gray-600">{masterData ? `${uniqueSchemes.length} schemes` : 'Not loaded'}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                {registerData ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                <span className="font-semibold text-gray-700">Register Data</span>
              </div>
              <p className="text-sm text-gray-600">{registerData ? `${registerData.length} records` : 'Not loaded'}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <FileDown className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-700">Status</span>
              </div>
              <p className="text-sm text-gray-600">
                {processing ? `Processing... (${downloadProgress}/${processStats.successful})` : 'Ready'}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <label className="block">
              <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer inline-flex items-center gap-2 transition-colors font-semibold shadow-md hover:shadow-lg">
                <Upload className="w-5 h-5" />
                1. Import Master Data (Utilization File)
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleImportMasterData(e.target.files?.[0])}
                className="hidden"
              />
            </label>

            <label className="block">
              <span className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg cursor-pointer inline-flex items-center gap-2 transition-colors font-semibold shadow-md hover:shadow-lg">
                <Upload className="w-5 h-5" />
                2. Import Register Data (Premium File)
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleImportRegisterData(e.target.files?.[0])}
                className="hidden"
              />
            </label>

            <button
              onClick={processAllSchemes}
              disabled={!masterData || !registerData || processing}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-6 py-4 rounded-lg inline-flex items-center justify-center gap-2 transition-colors font-bold text-lg disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Play className="w-6 h-6" />
              {processing ? 'Processing All Schemes...' : '3. Process All Schemes & Generate Reports'}
            </button>

            <button
              onClick={resetSystem}
              disabled={processing}
              className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              Reset System
            </button>
          </div>

          {showLog && (
            <div className="border-2 border-gray-300 rounded-lg bg-gray-900 p-4 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-white text-lg">Processing Log</h3>
                {downloadProgress > 0 && (
                  <span className="text-sm text-blue-400 font-mono">
                    Downloads: {downloadProgress}/{processStats.successful}
                  </span>
                )}
              </div>
              <div className="bg-black p-4 rounded font-mono text-sm text-green-400 h-96 overflow-y-auto whitespace-pre-wrap break-words border border-green-900">
                {processingLog.join('\n')}
              </div>
              {downloadProgress > 0 && (
                <div className="mt-4 w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(downloadProgress / Math.max(processStats.successful, 1)) * 100}%` }}
                  ></div>
                </div>
              )}
              {processStats.successful > 0 && !processing && (
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 text-green-800 rounded-lg">
                  <div className="font-bold text-lg mb-2">📊 Final Results:</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">✅ Successful:</span> {processStats.successful}</div>
                    <div><span className="font-semibold">❌ Failed:</span> {processStats.failed}</div>
                  </div>
                  {failedSchemes.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                      <div className="font-semibold text-yellow-800 mb-1">⚠️ Failed Schemes:</div>
                      <div className="text-xs text-yellow-700 max-h-32 overflow-y-auto">
                        {failedSchemes.map((scheme, idx) => (
                          <div key={idx}>• {scheme}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded">
            <h3 className="font-bold text-gray-700 mb-2">✨ ExcelJS Features:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Margin Layout:</strong> One empty row at top, one empty column at left for all sheets</li>
              <li>• <strong>Exact Colors:</strong> Navy Blue (RGB 0,0,128) and Sky Blue (RGB 135,206,235)</li>
              <li>• <strong>Garamond Font:</strong> Size 10pt for all cells</li>
              <li>• <strong>Borders:</strong> Thin borders on all cells, medium bottom border on headers</li>
              <li>• <strong>Number Formats:</strong> #,##0.00 for currency, 0.0% for percentages, 0 for visits</li>
              <li>• <strong>Date Formats:</strong> dd-mmm-yyyy for dates, mmm-yyyy for months</li>
              <li>• <strong>Column Widths:</strong> Auto-fit based on content (max 40 characters)</li>
              <li>• <strong>Alignment:</strong> Headers centered, data appropriately aligned</li>
              <li>• <strong>Clean Layout:</strong> Gridlines hidden, only data tables visible</li>
              <li>• <strong>Logo:</strong> Company logo (icealogo.png) displayed on Loss Ratio sheet</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded">
              <p className="text-xs text-blue-700">
                <strong>📸 Logo Setup:</strong> Place your logo file at <code className="bg-blue-100 px-1 rounded">public/assets/icealogo.png</code>
              </p>
            </div>
          </div> */}
        </div>

        <div className="bg-gray-100 px-8 py-4 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 italic">
          Multi-Scheme Report Generator
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchemeReportGenerator;