const asyncHandler = require('express-async-handler');
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
 * FIX: Was doing extra Student.findOne({email}) to get userId even though
 *      req.user.id is already populated by the auth middleware from the JWT.
 * FIX: Removed console.log(userId).
 * FIX: Input sanitization — only allowed fields are written to DB.
 */
const createTransaction = asyncHandler(async (req, res) => {
  const { title, amount, type, category, date, isRecurring, frequency } = req.body;
  const userId = req.user.id; // FIX: use directly from JWT, no extra DB call

  if (!title || amount === undefined || !type || !category) {
    res.status(400);
    throw new Error('Please fill all the required fields');
  }

  if (!['income', 'expense'].includes(type)) {
    res.status(400);
    throw new Error('type must be either "income" or "expense"');
  }

  if (typeof amount !== 'number' || amount <= 0) {
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
      title,
      amount,
      type,
      category,
      frequency,
      date: date ? new Date(date) : new Date(),
    });
  }

  const newTransaction = await Transaction.create({
    user: userId,
    title,
    amount,
    type,
    category,
    date: date ? new Date(date) : new Date(),
    isRecurring: isRecurring || false,
  });

  res.status(201).json(newTransaction);
});

/**
 * GET /api/student/transaction/:id
 * FIX: Ownership check uses req.user.id correctly.
 */
const getTransaction = asyncHandler(async (req, res) => {
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
 * FIX: Input sanitization — only whitelisted fields can be updated,
 *      preventing MongoDB operator injection via req.body.
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }
  if (transaction.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Access denied — this transaction belongs to another user');
  }

  // Whitelist updatable fields to prevent injection
  const { title, amount, type, category, date } = req.body;
  const updatePayload = {};
  if (title !== undefined) updatePayload.title = title;
  if (amount !== undefined) updatePayload.amount = amount;
  if (type !== undefined) updatePayload.type = type;
  if (category !== undefined) updatePayload.category = category;
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
 */
const deleteTransaction = asyncHandler(async (req, res) => {
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

module.exports = { createTransaction, getTransactions, getTransaction, updateTransaction, deleteTransaction };
