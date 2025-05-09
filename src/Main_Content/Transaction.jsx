import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('https://backendfinmate.onrender.com/api/student/transaction', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch transactions');
        const data = await response.json();
        setTransactions(data.transactions || data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load transactions!');
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = [...transactions];
    if (typeFilter !== 'All') {
      filtered = filtered.filter(txn => txn.type.toLowerCase() === typeFilter.toLowerCase());
    }
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(txn => txn.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'Newest' ? dateB - dateA : dateA - dateB;
    });
    setFilteredTransactions(filtered);
  }, [transactions, typeFilter, categoryFilter, sortOrder]);

  const handleDelete = async (transactionId) => {
    try {
      const response = await fetch(`https://backendfinmate.onrender.com/api/student/transaction/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      setTransactions(transactions.filter(txn => txn._id !== transactionId));
      toast.success('Transaction deleted successfully!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction.');
    }
  };

  const startEditing = (txn) => {
    setEditingId(txn._id);
    setEditData({
      title: txn.title,
      category: txn.category,
      date: txn.date.slice(0, 10),
      description: txn.description,
      amount: txn.amount,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (txnId) => {
    try {
      const response = await fetch(`https://backendfinmate.onrender.com/api/student/transaction/${txnId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) throw new Error('Failed to update transaction');

      const updatedTxn = await response.json();
      setTransactions(transactions.map(txn => txn._id === txnId ? updatedTxn : txn));
      cancelEditing();
      toast.success('Transaction updated successfully!');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction.');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <ToastContainer position="top-right" autoClose={2000} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transactions</h1>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">🧰 Filters</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded p-2 w-full">
            <option>All</option>
            <option>Income</option>
            <option>Expense</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded p-2 w-full">
            <option>All</option>
            <option>Transport</option>
            <option>Food</option>
            <option>Clothes</option>
            <option>Personal</option>
            <option>Education</option>
            <option>Health Care</option>
            <option>Utilities</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border rounded p-2 w-full">
            <option>Newest</option>
            <option>Oldest</option>
          </select>
        </div>
      </div>

      {/* Transactions */}
      <div className="flex flex-col gap-4">
        {filteredTransactions.length === 0 ? (
          <p>No transactions found for selected filters.</p>
        ) : (
          filteredTransactions.map((txn) => (
            <div
              key={txn._id}
              className={`flex justify-between items-center p-4 rounded-xl shadow-md border-l-4 ${
                txn.type === 'income' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}
            >
              {editingId === txn._id ? (
                <div className="flex flex-col w-full">
                  <input type="text" name="title" value={editData.title} onChange={handleEditChange} className="mb-2 p-2 rounded border" />
                  <input type="text" name="category" value={editData.category} onChange={handleEditChange} className="mb-2 p-2 rounded border" />
                  <input type="date" name="date" value={editData.date} onChange={handleEditChange} className="mb-2 p-2 rounded border" />
                  <textarea name="description" value={editData.description} onChange={handleEditChange} className="mb-2 p-2 rounded border" />
                  <input type="number" name="amount" value={editData.amount} onChange={handleEditChange} className="mb-2 p-2 rounded border" />
                </div>
              ) : (
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-800">{txn.title}</h3>
                  <p className="text-sm text-gray-600">{txn.category}</p>
                  <p className="text-xs text-gray-500">{new Date(txn.date).toLocaleDateString()}</p>
                  <p className="text-gray-700 mt-1">{txn.description}</p>
                  <span className={`mt-2 text-lg font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{txn.amount}
                  </span>
                </div>
              )}

              <div className="flex gap-3 items-start ml-4">
                {editingId === txn._id ? (
                  <>
                    <button
                      className="text-green-600 hover:text-green-800"
                      onClick={() => handleEditSubmit(txn._id)}
                      title="Save"
                    >
                      <Save size={20} />
                    </button>
                    <button
                      className="text-gray-600 hover:text-gray-800"
                      onClick={cancelEditing}
                      title="Cancel"
                    >
                      <X size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => startEditing(txn)}
                      title="Edit"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(txn._id)}
                      title="Delete"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
