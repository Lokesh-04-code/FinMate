import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

function BudgetProgress({ user, transactions }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const budget = {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    categories: user.categories || {},
  };

  const validCategories = Object.keys(budget.categories);

  const filtered = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === budget.month && d.getFullYear() === budget.year && t.type === 'expense';
  });

  const totalSpent = filtered.reduce((sum, t) => sum + Number(t.amount), 0);
  const percentSpent = user.budget > 0 ? (totalSpent / user.budget) * 100 : 0;

  const spendingByCategory = {};
  filtered.forEach((t) => {
    const category = validCategories.includes(t.category) ? t.category : "Other";
    if (!spendingByCategory[category]) spendingByCategory[category] = 0;
    spendingByCategory[category] += Number(t.amount);
  });

  const getColor = (percent) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 70) return 'bg-orange-400';
    return 'bg-green-500';
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[month - 1];
  };

  return (
    <motion.div
      className="space-y-8 p-6"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Summary Box */}
      <motion.div
        className="bg-white p-6 rounded-lg shadow"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-800">
            💼 {getMonthName(budget.month)} {budget.year} Budget Summary
          </h2>
        </div>

        <div className="flex justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">Budget</p>
            <p className="text-lg font-bold text-gray-800">
              {user.currency} {user.budget.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Spent</p>
            <p className="text-lg font-bold text-gray-800">
              {user.currency} {totalSpent.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
          <motion.div
            className={`h-4 ${getColor(percentSpent)} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: animate ? `${Math.min(100, percentSpent)}%` : '0%' }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-700">
            Remaining: {user.currency} {(user.budget - totalSpent).toFixed(2)}
          </span>
          <span className={`font-bold ${getColor(percentSpent).replace('bg-', 'text-')}`}>
            {percentSpent.toFixed(0)}% spent
          </span>
        </div>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        className="bg-white p-6 rounded-lg shadow"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
        <div className="space-y-4">
          {Object.entries(budget.categories).map(([category, catBudget], i) => {
            const spent = spendingByCategory[category] || 0;
            const percent = catBudget > 0 ? (spent / catBudget) * 100 : 0;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <span className="text-sm text-gray-500">
                    {user.currency} {spent.toFixed(2)} / {user.currency} {catBudget.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-2 ${getColor(percent)} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: animate ? `${Math.min(100, percent)}%` : '0%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default BudgetProgress;
