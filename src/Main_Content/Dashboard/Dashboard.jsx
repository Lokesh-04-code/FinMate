import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import Cards from './cards';
import RecentTransactions from './RecentTransactions';
import SpendingChart from './SpendingChart';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('token'); 
        if (!token) {
          toast.error('You are not logged in. Please login first!');
          return;
        }

        const response = await fetch('http://localhost:5000/api/student/transaction', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || data);
          
        } else {
          throw new Error('Failed to fetch transactions');
        }
      } catch (error) {
        toast.error('Error fetching transactions');
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <div className="flex flex-col gap-[30px]">
      {/* Cards Section Animation */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Cards transactions={transactions} />
      </motion.div>

      {/* Grid Section Animation */}
      <motion.div
        className="grid grid-cols-2 gap-[40px] max-md:grid-cols-1"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
      >
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <SpendingChart transactions={transactions} />
        </motion.div>

        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <RecentTransactions transactions={transactions} />
        </motion.div>
      </motion.div>
    </div>
  );
}
