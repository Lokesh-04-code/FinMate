import { motion } from 'framer-motion';
import React from 'react';

const Add_money = ({ setactivepage }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: '#2563eb' }} // slightly larger & deeper blue
        whileTap={{ scale: 0.95 }}
        onClick={() => setactivepage('AddTransaction')}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 ml-auto shadow-md"
      >
        <span className="text-xl">＋</span> Add Transaction
      </motion.button>
    </motion.div>
  );
};

export default Add_money;
