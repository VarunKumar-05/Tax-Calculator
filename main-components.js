// src/components/Dashboard.js (continued)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [taxData, setTaxData] = useState(null);
  const [incomeData, setIncomeData] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const token = localStorage.getItem('token');
        
        // Fetch income data
        const incomeResponse = await axios.get('http://localhost:5000/api/income', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIncomeData(incomeResponse.data.incomes);
        
        // Fetch purchase data
        const purchaseResponse = await axios.get('http://localhost:5000/api/purchases', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPurchaseData(purchaseResponse.data.purchases);
        
        // If income data exists for the selected year, calculate tax
        const yearIncome = incomeResponse.data.incomes.find(income => income.year === selectedYear);
        if (yearIncome) {
          const taxResponse = await axios.post(
            'http://localhost:5000/api/calculate-tax',
            { year: selectedYear },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setTaxData(taxResponse.data);
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedYear]);
  
  // Get unique years from income data
  const availableYears = [...new Set(incomeData.map(income => income.year))];
  
  // Prepare chart data
  const chartData = taxData ? [
    { name: 'Total Income', amount: taxData.totalIncome },
    { name: 'Total Purchases', amount: taxData.totalPurchases },
    { name: 'Basic Tax', amount: taxData.taxDetails.basicTax },
    { name: 'Tax Deduction', amount: taxData.taxDetails.purchaseDeduction },
    { name: 'Final Tax', amount: taxData.taxDetails.finalTax }
  ] : [];
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {incomeData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No income data available. Please add your income details to get started.</p>
              <Link 
                to="/income" 
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Add Income
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="year">
                  Select Tax Year:
                </label>
                <select
                  id="year"
                  className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {taxData ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-blue-800">Total Income</h3>
                      <p className="text-2xl font-bold">${taxData.totalIncome.toFixed(2)}</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-green-800">Total Purchases</h3>
                      <p className="text-2xl font-bold">${taxData.totalPurchases.toFixed(2)}</p>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-red-800">Tax Payable</h3>
                      <p className="text-2xl font-bold">${taxData.taxDetails.finalTax.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Tax Breakdown</h2>
                    <div className="bg-gray-50 p-4 rounded-lg shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-600">Basic Tax (20% of income):</p>
                          <p className="font-semibold">${taxData.taxDetails.basicTax.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Purchase Deduction (5% of purchases):</p>
                          <p className="font-semibold">-${taxData.taxDetails.purchaseDeduction.toFixed(2)}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-gray-600">Final Tax Payable:</p>
                          <p className="text-xl font-bold">${taxData.taxDetails.finalTax.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Summary Chart</h2>
                    <div className="h-80 bg-white p-4 rounded-lg shadow">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                          <Legend />
                          <Bar dataKey="amount" name="Amount ($)" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <Link 
                      to="/tax-report" 
                      className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                    >
                      View Full Report
                    </Link>
                    <Link 
                      to="/purchases" 
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Manage Purchases
                    </Link>
                    <Link 
                      to="/income" 
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Update Income
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No tax data available for the selected year.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;

// src/components/Income.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Income = () => {
  const [incomes, setIncomes] = useState([]);
  const [formData, setFormData] = useState({
    primary_income: '',
    additional_income: '',
    year: new Date().getFullYear()
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    const fetchIncomes = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/income', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIncomes(response.data.incomes);
      } catch (err) {
        setError('Failed to fetch income data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIncomes();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'year' ? parseInt(value) : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/income',
        {
          primary_income: parseFloat(formData.primary_income),
          additional_income: parseFloat(formData.additional_income) || 0,
          year: formData.year
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add new income to the list
      setIncomes([response.data.income, ...incomes]);
      setSuccess('Income information saved successfully');
      
      // Reset form
      setFormData({
        primary_income: '',
        additional_income: '',
        year: new Date().getFullYear()
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save income information');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Income Information</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Income</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="primary_income">
                Primary Income ($)
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="primary_income"
                type="number"
                step="0.01"
                min="0"
                name="primary_income"
                placeholder="Primary Income"
                value={formData.primary_income}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="additional_income">
                Additional Income ($)
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="additional_income"
                type="number"
                step="0.01"
                min="0"
                name="additional_income"
                placeholder="Additional Income"
                value={formData.additional_income}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="year">
                Tax Year
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="year"
                type="number"
                name="year"
                min="2000"
                max="2050"
                value={formData.year}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="mt-4">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Income Information'}
            </button>
          </div>
        </form>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Income History</h2>
        
        {loading ? (
          <p className="text-gray-600">Loading income history...</p>
        ) : incomes.length === 0 ? (
          <p className="text-gray-600">No income records found. Add your first income information above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Year</th>
                  <th className="py-3 px-6 text-right">Primary Income</th>
                  <th className="py-3 px-6 text-right">Additional Income</th>
                  <th className="py-3 px-6 text-right">Total Income</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {incomes.map((income) => (
                  <tr key={income.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left">{income.year}</td>
                    <td className="py-3 px-6 text-right">${parseFloat(income.primary_income).toFixed(2)}</td>
                    <td className="py-3 px-6 text-right">${parseFloat(income.additional_income).toFixed(2)}</td>
                    <td className="py-3 px-6 text-right font-semibold">
                      ${(parseFloat(income.primary_income) + parseFloat(income.additional_income)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Income;

// src/components/PurchaseHistory.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    purchase_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/purchases', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPurchases(response.data.purchases);
      } catch (err) {
        setError('Failed to fetch purchase history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPurchases();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/purchases',
        {
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          purchase_date: formData.purchase_date
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add new purchase to the list
      setPurchases([response.data.purchase, ...purchases]);
      setSuccess('Purchase added successfully');
      
      // Reset form
      setFormData({
        amount: '',
        category: '',
        description: '',
        purchase_date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add purchase');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Calculate total purchases
  const totalPurchases = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount), 0);
  
  // Get categories for dropdown
  const categories = ['Groceries', 'Electronics', 'Clothing', 'Entertainment', 'Healthcare', 'Education', 'Housing', 'Transportation', 'Other'];
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Purchase History</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Purchase</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                Amount ($)
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="amount"
                type="number"
                step="0.01"
                min="0"
                name="amount"
                placeholder="Purchase Amount"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="purchase_date">
                Purchase Date
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="purchase_date"
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                Category
              </label>
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="description"
                type="text"
                name="description"
                placeholder="Purchase Description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Purchase'}
            </button>
          </div>
        </form>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Purchase List</h2>
          <div className="text-gray-700">
            <span className="font-bold">Total: </span>
            <span className="text-lg">${totalPurchases.toFixed(2)}</span>
          </div>
        </div>
        
        {loading ? (
          <p className="text-gray-600">Loading purchases...</p>
        ) : purchases.length === 0 ? (
          <p className="text-gray-600">No purchases found. Add your first purchase above.</p>
        ) : (
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
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left">{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                    <td className="py-3 px-6 text-left">{purchase.category || 'General'}</td>
                    <td className="py-3 px-6 text-left">{purchase.description || '-'}</td>
                    <td className="py-3 px-6 text-right font-semibold">${parseFloat(purchase.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistory;
