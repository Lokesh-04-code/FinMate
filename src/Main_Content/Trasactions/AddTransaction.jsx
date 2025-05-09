import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const AddTransaction = () => {
  const token = localStorage.getItem('token');
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    category: '',
    amount: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("https://backendfinmate.onrender.com/api/student/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
     console.log(response)
      if (response.ok) {
        toast.success("Transaction saved successfully!");
        setFormData({
          title: '',
          type: '',
          category: '',
          amount: '',
          description: ''
        });
        
      } else {
        toast.error("Failed to save transaction.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while saving the transaction.");
    }
  };

  return (
    <>   
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    
     <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6"
    >
      <motion.h1
        className="text-2xl font-bold text-gray-800 mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Add New Transaction
      </motion.h1>

      <motion.form
        className="space-y-4"
        onSubmit={handleSubmit}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {[
          { label: 'Title', name: 'title', type: 'text', placeholder: 'e.g. Grocery shopping' },
          { label: 'Amount', name: 'amount', type: 'number', placeholder: '0.00' }
        ].map((input) => (
          <motion.div key={input.name} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{input.label}</label>
            <input
              type={input.type}
              name={input.name}
              value={formData[input.name]}
              onChange={handleChange}
              placeholder={input.placeholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </motion.div>
        ))}

        {/* Type Select */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            required
          >
            <option value="">Select Type</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </motion.div>

        {/* Category Select */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            required
          >
            <option value="">Select Category</option>
            <option value="Transport">🚗 Transport</option>
            <option value="Food">🍔 Food</option>
            <option value="Clothes">👕 Clothes</option>
            <option value="Personal">🧴 Personal</option>
            <option value="Education">📚 Education</option>
            <option value="Health">🏥 Health Care</option>
            <option value="Utilities">💡 Utilities</option>
            <option value="Other">🛠️ Other</option>
          </select>
        </motion.div>

        {/* Notes */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional details..."
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </motion.div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          Add Transaction
        </motion.button>
      </motion.form>
    </motion.div></>

  );
};

export default AddTransaction;
