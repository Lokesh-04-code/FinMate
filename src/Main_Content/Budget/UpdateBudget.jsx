import React, { useEffect, useState } from 'react';

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Healthcare', 'Personal',
  'Education', 'Clothes', 'Utilities', 'Other'
];

function UpdateBudget({ user ,rerender}) {
  const token = localStorage.getItem('token');
  const [totalAmount, setTotalAmount] = useState(user?.budget?.toString() || '0');
  const [categoryAmounts, setCategoryAmounts] = useState({});
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const initial = {};
    EXPENSE_CATEGORIES.forEach(cat => {
      initial[cat] = user?.categories?.[cat]?.toString() || '';
    });
    setCategoryAmounts(initial);
  }, [user]);

  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    let allocated = 0;
    for (let key in categoryAmounts) {
      allocated += parseFloat(categoryAmounts[key]) || 0;
    }
    setRemaining(total - allocated);
  }, [totalAmount, categoryAmounts]);

  function handleCategoryChange(category, value) {
    setCategoryAmounts(prev => ({
      ...prev,
      [category]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const data = {
      budget: parseFloat(totalAmount) || 0,
      categories: {}
    };

    EXPENSE_CATEGORIES.forEach(cat => {
      data.categories[cat] = parseFloat(categoryAmounts[cat]) || 0;
    });

    try {
      const res = await fetch('http://localhost:5000/api/students/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Use token from props or localStorage
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to update budget');
      }

      const updatedUser = await res.json();
      alert('✅ Budget updated successfully!');
      rerender((val)=>!val)
      console.log('Updated User:', updatedUser);
    } catch (err) {
      console.error(err);
      alert('❌ Failed to update budget.');
    }
  }

  return (
    <div className="max-w-3xl p-6">
      <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg mb-6">
        <h1 className="text-3xl font-semibold">Update Budget</h1>
        <p className="text-blue-100 mt-1 text-sm">Plan and manage your monthly budget efficiently.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Total Budget */}
        <div>
          <label className="block text-sm font-medium text-blue-800 mb-1">Total Budget</label>
          <input
            type="number"
            value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)}
            className="w-full border border-blue-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            step="0.01"
            min="0"
          />
        </div>

        {/* Category Allocations */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-blue-800">Category Allocation</h3>
            <span className={`font-bold text-sm ${remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              Remaining: ₹{remaining.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXPENSE_CATEGORIES.map(category => (
              <div key={category}>
                <label className="block text-sm font-medium text-blue-700 mb-1">{category}</label>
                <input
                  type="number"
                  value={categoryAmounts[category] || ''}
                  onChange={e => handleCategoryChange(category, e.target.value)}
                  className="w-full border border-blue-300 rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  step="0.01"
                  min="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-md"
          >
            Save Budget
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateBudget;
