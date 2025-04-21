import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import React from 'react';
import AnimatedSavingsBar from './AnimatedSavingBar';

const Cards = ({ transactions = [] }) => {
  // Parse amounts and compute totals
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    const amount = parseFloat(t.amount);
    if (t.type === 'income') totalIncome += amount;
    else if (t.type === 'expense') totalExpenses += amount;
  });

  const balance = totalIncome - totalExpenses;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const thisMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  let thisMonthIncome = 0;
  let thisMonthExpenses = 0;

  thisMonthTransactions.forEach(t => {
    const amount = parseFloat(t.amount);
    if (t.type === 'income') thisMonthIncome += amount;
    else if (t.type === 'expense') thisMonthExpenses += amount;
  });

  const thisMonthSavings = thisMonthIncome - thisMonthExpenses;
  const savingsRate = thisMonthIncome > 0 ? (thisMonthSavings / thisMonthIncome) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Balance */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Balance</p>
            <h3 className="text-2xl font-bold">₹{balance.toFixed(2)}</h3>
          </div>
          <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
          {balance >= 0 ? (
              <ArrowUpRight size={20} className="text-green-600" />
            ) : (
              <ArrowDownRight size={20} className="text-red-600" />
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <div>
            <p className="text-gray-500">Income</p>
            <p className="text-green-600 font-medium">₹{totalIncome.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500">Expenses</p>
            <p className="text-red-600 font-medium">₹{totalExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* This Month */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">This Month</p>
            <h3 className="text-2xl font-bold">₹{thisMonthSavings.toFixed(2)}</h3>
          </div>
          <div className={`p-3 rounded-full ${thisMonthSavings >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            {thisMonthSavings >= 0 ? (
              <ArrowUpRight size={20} className="text-green-600" />
            ) : (
              <ArrowDownRight size={20} className="text-red-600" />
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <div>
            <p className="text-gray-500">Income</p>
            <p className="text-green-600 font-medium">₹{thisMonthIncome.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500">Expenses</p>
            <p className="text-red-600 font-medium">₹{thisMonthExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Savings Rate</p>
            <h3 className="text-2xl font-bold">{savingsRate.toFixed(1)}%</h3>
          </div>
          <div
            className={`p-3 rounded-full ${
              savingsRate >= 30
                ? 'bg-green-100'
                : savingsRate >= 10
                ? 'bg-yellow-100'
                : 'bg-red-100'
            }`}
          >
            <TrendingUp
              size={20}
              className={
                savingsRate >= 30
                  ? 'text-green-600'
                  : savingsRate >= 10
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }
            />
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <AnimatedSavingsBar savingsRate={savingsRate} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cards;
