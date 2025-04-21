import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function SpendingChart({ transactions = [] }) {
  // Filter only expense transactions
  const expenses = transactions.filter(t => t.type === 'expense');

  // Group expenses by category
  const categoryTotals = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
  });

  const labels = Object.keys(categoryTotals);
  const dataValues = Object.values(categoryTotals);

  const pieData = {
    labels: labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)'
        ]
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 10,  // Smaller box width
          padding: 5,    // Smaller padding between legend items
          font: {
            size: 12,    // Font size for legend text
          }
        }
      },
      title: {
        display: true,
        text: 'Spending by Category'
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full max-w-3xl">
      <h2 className="text-xl font-semibold mb-4">Spending Breakdown</h2>
      {expenses.length === 0 ? (
        <p>No expense data to show.</p>
      ) : (
        <div style={{ height: '400px' }}>
          <Pie data={pieData} options={options} />
        </div>
      )}
    </div>
  );
}

export default SpendingChart;
