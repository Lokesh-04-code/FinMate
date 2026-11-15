import React, { useEffect, useState } from 'react';
import BudgetProgress from './BudgetProgress';
import UpdateBudget from './UpdateBudget';
import { authFetch } from '../../utils/api';

export default function BudgetPlanning() {
  const [transactions, setTransactions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rerender, setrerender] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user
        const userRes = await authFetch('/api/students/current');

        if (!userRes.ok) throw new Error('Failed to fetch user');
        const userData = await userRes.json();
        setCurrentUser(userData);

        // Fetch transactions
        const transRes = await authFetch('/api/student/transaction');

        if (!transRes.ok) throw new Error('Failed to fetch transactions');
        const transData = await transRes.json();
        setTransactions(transData.transactions || transData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [rerender]);

  if (loading) {
    return <p className="p-4">Loading data...</p>;
  }

  return (
    <>
      <BudgetProgress transactions={transactions} user={currentUser} rerender={setrerender}/>
      <UpdateBudget transactions={transactions} user={currentUser}  rerender={setrerender}/>
    </>
  );
}
