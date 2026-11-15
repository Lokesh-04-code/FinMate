const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Transaction = require('../models/transactionModel');
const RecurringTransaction = require('../models/recursiveTransactionModel');

/**
 * GET /api/student/transaction
 * Returns only transactions belonging to the authenticated user.
 */
const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ user: req.user.id });
  res.status(200).json(transactions);
});

/**
 * POST /api/student/transaction
 * Creates a transaction strictly owned by req.user.id.
 */
const createTransaction = asyncHandler(async (req, res) => {
  const { title, amount, type, category, date, isRecurring, frequency } = req.body;
  const userId = req.user.id;

  if (!title || amount === undefined || !type || !category) {
    res.status(400);
    throw new Error('Please fill all the required fields');
  }

  if (!['income', 'expense'].includes(type)) {
    res.status(400);
    throw new Error('type must be either "income" or "expense"');
  }

  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    res.status(400);
    throw new Error('amount must be a positive number');
  }

  if (isRecurring) {
    if (!frequency || !['daily', 'weekly', 'monthly'].includes(frequency)) {
      res.status(400);
      throw new Error('frequency must be "daily", "weekly", or "monthly" for recurring transactions');
    }
    await RecurringTransaction.create({
      user: userId,
      title: title.trim(),
      amount: numericAmount,
      type,
      category: category.trim(),
      frequency,
      date: date ? new Date(date) : new Date(),
    });
  }

  const newTransaction = await Transaction.create({
    user: userId,
    title: title.trim(),
    amount: numericAmount,
    type,
    category: category.trim(),
    date: date ? new Date(date) : new Date(),
    isRecurring: isRecurring || false,
  });

  res.status(201).json(newTransaction);
});

/**
 * GET /api/student/transaction/:id
 * Strict authorization check: validates ID format and verifies owner.
 */
const getTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid transaction ID format');
  }

  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Access denied — this transaction belongs to another user');
  }

  res.status(200).json(transaction);
});

/**
 * PUT /api/student/transaction/:id
 * Whitelisted field update with strict user ownership.
 */
const updateTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid transaction ID format');
  }

  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Access denied — this transaction belongs to another user');
  }

  const { title, amount, type, category, date } = req.body;
  const updatePayload = {};

  if (title !== undefined) updatePayload.title = title.trim();
  if (amount !== undefined) {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      res.status(400);
      throw new Error('amount must be a positive number');
    }
    updatePayload.amount = num;
  }
  if (type !== undefined) {
    if (!['income', 'expense'].includes(type)) {
      res.status(400);
      throw new Error('type must be either "income" or "expense"');
    }
    updatePayload.type = type;
  }
  if (category !== undefined) updatePayload.category = category.trim();
  if (date !== undefined) updatePayload.date = new Date(date);

  const updatedTransaction = await Transaction.findByIdAndUpdate(
    req.params.id,
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  res.status(200).json(updatedTransaction);
});

/**
 * DELETE /api/student/transaction/:id
 * Strict authorization check: validates owner before deleting.
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid transaction ID format');
  }

  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Access denied — this transaction belongs to another user');
  }

  const deletedTransaction = await Transaction.findByIdAndDelete(req.params.id);
  res.status(200).json(deletedTransaction);
});

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
};
