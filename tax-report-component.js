// src/components/TaxReport.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const TaxReport = () => {
  const [reportData, setReportData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchIncomeYears = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/income', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const years = [...new Set(response.data.incomes.map(income => income.year))];
        setAvailableYears(years);
        
        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[0]);
        }
      } catch (err) {
        setError('Failed to fetch available years');
        console.error(err);
      }
    };
    
    fetchIncomeYears();
  }, []);
  
  useEffect(() => {
    const fetchTaxReport = async () => {
      if (!selectedYear) return;
      
      setLoading(true);
      setError('');
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/tax-report/${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReportData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch tax report');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaxReport();
  }, [selectedYear]);
  
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };
  
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`Tax Report for ${reportData.taxYear}`, 105, 15, { align: 'center' });
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });
    
    // Add user info
    doc.setFontSize(12);
    doc.text(`User: ${reportData.userDetails.username}`, 20, 30);
    doc.text(`Email: ${reportData.userDetails.email}`, 20, 37);
    
    // Add income section
    doc.setFontSize(16);
    doc.text('Income Information', 20, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Category', 'Amount']],
      body: [
        ['Primary Income', `$${reportData.incomeDetails.primaryIncome.toFixed(2)}`],
        ['Additional Income', `$${reportData.incomeDetails.additionalIncome.toFixed(2)}`],
        ['Total Income', `$${reportData.incomeDetails.totalIncome.toFixed(2)}`]
      ]
    });
    
    // Add purchases summary
    doc.setFontSize(16);
    doc.text('Purchase Summary', 20, doc.lastAutoTable.finalY + 15);
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Category', 'Value']],
      body: [
        ['Total Purchases', `$${reportData.purchaseDetails.totalPurchases.toFixed(2)}`],
        ['Number of Purchases', reportData.purchaseDetails.purchaseCount]
      ]
    });
    
    // Add tax calculation
    doc.setFontSize(16);
    doc.text('Tax Calculation', 20, doc.lastAutoTable.finalY + 15);
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Item', 'Amount']],
      body: [
        ['Basic Tax (20% of income)', `$${reportData.taxCalculation.basicTax.toFixed(2)}`],
        ['Purchase Deduction (5% of purchases)', `$${reportData.taxCalculation.purchaseDeduction.toFixed(2)}`],
        ['Final Tax Payable', `$${reportData.taxCalculation.finalTax.toFixed(2)}`]
      ]
    });
    
    // Save PDF
    doc.save(`tax-report-${reportData.taxYear}.pdf`);
  };
  
  const exportCSV = () => {
    if (!reportData) return;
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add header
    csvContent += 'Tax Report for ' + reportData.taxYear + '\r\n\r\n';
    
    // Add user info
    csvContent += 'User,' + reportData.userDetails.username + '\r\n';
    csvContent += 'Email,' + reportData.userDetails.email + '\r\n\r\n';
    
    // Add income section
    csvContent += 'Income Information\r\n';
    csvContent += 'Category,Amount\r\n';
    csvContent += 'Primary Income,$' + reportData.incomeDetails.primaryIncome.toFixed(2) + '\r\n';
    csvContent += 'Additional Income,$' + reportData.incomeDetails.additionalIncome.toFixed(2) + '\r\n';
    csvContent += 'Total Income,$' + reportData.incomeDetails.totalIncome.toFixed(2) + '\r\n\r\n';
    
    // Add purchases summary
    csvContent += 'Purchase Summary\r\n';
    csvContent += 'Total Purchases,$' + reportData.purchaseDetails.totalPurchases.toFixed(2) + '\r\n';
    csvContent += 'Number of Purchases,' + reportData.purchaseDetails.purchaseCount + '\r\n\r\n';
    
    // Add purchase details
    csvContent += 'Purchase Details\r\n';
    csvContent += 'Date,Category,Description,Amount\r\n';
    reportData.purchaseDetails.purchases.forEach(purchase => {
      csvContent += `${purchase.date},${purchase.category},"${purchase.description}",$${purchase.amount.toFixed(2)}\r\n`;
    });
    csvContent += '\r\n';
    
    // Add tax calculation
    csvContent += 'Tax Calculation\r\n';
    csvContent += 'Item,Amount\r\n';
    csvContent += 'Basic Tax (20% of income),$' + reportData.taxCalculation.basicTax.toFixed(2) + '\r\n';
    csvContent += 'Purchase Deduction (5% of purchases),$' + reportData.taxCalculation.purchaseDeduction.toFixed(2) + '\r\n';
    csvContent += 'Final Tax Payable,$' + reportData.taxCalculation.finalTax.toFixed(2) + '\r\n';
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tax-report-${reportData.taxYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Prepare pie chart data for income breakdown
  const incomeData = reportData ? [
    { name: 'Primary Income', value: reportData.incomeDetails.primaryIncome },
    { name: 'Additional Income', value: reportData.incomeDetails.additionalIncome }
  ].filter(item => item.value > 0) : [];
  
  // Prepare pie chart data for tax breakdown
  const taxData = reportData ? [
    { name: 'Tax Paid', value: reportData.taxCalculation.finalTax },
    { name: 'Income After Tax', value: reportData.incomeDetails.totalIncome - reportData.taxCalculation.finalTax }
  ] : [];
  
  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tax Report</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {availableYears.length > 0 ? (
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="year">
            Select Tax Year:
          </label>
          <select
            id="year"
            className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={selectedYear}
            onChange={handleYearChange}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      ) : null}
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading tax report...</p>
        </div>
      ) : !reportData ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No report data available for the selected year.</p>
        </div>
      ) : (
        <div>
          {/* Summary Section */}
          <div className="bg-blue-50 p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Tax Summary for {reportData.taxYear}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Income</h3>
                <p className="text-2xl font-bold text-blue-600">${reportData.incomeDetails.totalIncome.toFixed(2)}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Purchases</h3>
                <p className="text-2xl font-bold text-green-600">${reportData.purchaseDetails.totalPurchases.toFixed(2)}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Tax Payable</h3>
                <p className="text-2xl font-bold text-red-600">${reportData.taxCalculation.finalTax.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          {/* User Info Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">User Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><span className="font-semibold">Username:</span> {reportData.userDetails.username}</p>
              <p><span className="font-semibold">Email:</span> {reportData.userDetails.email}</p>
            </div>
          </div>
          
          {/* Income Details Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Income Details</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <table className="min-w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-semibold">Primary Income:</td>
                        <td className="py-2 text-right">${reportData.incomeDetails.primaryIncome.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-semibold">Additional Income:</td>
                        <td className="py-2 text-right">${reportData.incomeDetails.additionalIncome.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold">Total Income:</td>
                        <td className="py-2 text-right font-bold">${reportData.incomeDetails.totalIncome.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {incomeData.length > 1 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {incomeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Tax Calculation Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Tax Calculation</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <table className="min-w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-semibold">Basic Tax (20% of income):</td>
                        <td className="py-2 text-right">${reportData.taxCalculation.basicTax.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-semibold">Purchase Deduction (5% of purchases):</td>
                        <td className="py-2 text-right">-${reportData.taxCalculation.purchaseDeduction.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold">Final Tax Payable:</td>
                        <td className="py-2 text-right font-bold">${reportData.taxCalculation.finalTax.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taxData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {taxData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          
          {/* Purchase Summary Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Purchase Summary</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-4">
                <span className="font-semibold">Total Purchases:</span> ${reportData.purchaseDetails.totalPurchases.toFixed(2)} ({reportData.purchaseDetails.purchaseCount} items)
              </p>
              
              {reportData.purchaseDetails.purchases.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                        <th className="py-3 px-6 text-left">Date</th>
                        <th className="py-3 px-6 text-left">Category</th>
                        <th className="py-3 px-6 text-left">Description</th>
                        <th className="py-3 px-6 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm">
                      {reportData.purchaseDetails.purchases.map((purchase, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-6 text-left">{new Date(purchase.date).toLocaleDateString()}</td>
                          <td className="py-3 px-6 text-left">{purchase.category}</td>
                          <td className="py-3 px-6 text-left">{purchase.description || '-'}</td>
                          <td className="py-3 px-6 text-right">${parseFloat(purchase.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
          {/* Export Options */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={exportPDF}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Export as PDF
            </button>
            <button
              onClick={exportCSV}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Export as CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReport;
