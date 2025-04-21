import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

function RecentTransactions({ transactions = [] }) {
  // Sorting the transactions by date and getting only the latest 5
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Function to show the time passed since the transaction
  function getTimeAgo(dateString) {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  }

  // If no transactions, show a message
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Recent Transactions</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No transactions yet. Add your first transaction!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-700">Recent Transactions</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {recentTransactions.map((transaction) => (
          <div key={transaction._id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`p-2 rounded-full mr-3 ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpRight size={16} className="text-green-600" />
                  ) : (
                    <ArrowDownRight size={16} className="text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{transaction.title || transaction.description}</p>
                  <p className="text-xs text-gray-500">
                    {transaction.category} · {getTimeAgo(transaction.date)}
                  </p>
                </div>
              </div>
              <span className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {transactions.length > 5 && (
        <div className="p-4 border-t border-gray-200">
          <a href="/transactions" className="text-blue-600 text-sm font-medium hover:text-blue-800">
            View all transactions
          </a>
        </div>
      )}
    </div>
  );
}

export default RecentTransactions;
