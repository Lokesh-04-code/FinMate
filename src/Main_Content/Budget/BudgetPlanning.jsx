import React, { useEffect, useState } from 'react';
import BudgetProgress from './BudgetProgress';
import UpdateBudget from './UpdateBudget';

export default function BudgetPlanning() {
  const [transactions, setTransactions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rerender,setrerender]=useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage.');
        return;
      }

      try {
        // Fetch current user
        const userRes = await fetch('https://backendfinmate.onrender.com/api/students/current', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!userRes.ok) throw new Error('Failed to fetch user');
        const userData = await userRes.json();
        console.log(userData)
        setCurrentUser(userData);
        

        // Fetch transactions
        const transRes = await fetch('https://backendfinmate.onrender.com/api/student/transaction', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!transRes.ok) throw new Error('Failed to fetch transactions');
        const transData = await transRes.json();
        console.log(transData)
        setTransactions( transData); // Adjust if your backend returns { transactions: [...] }
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
