const asyncHandler = require('express-async-handler');
const RecurringTransaction = require('../models/recursiveTransactionModel');

/**
 * GET /api/student/rec
 * Returns only recurring transactions belonging to the authenticated user.
 */
const getRecTrannsactions = asyncHandler(async (req, res) => {
  const transactions = await RecurringTransaction.find({ user: req.user.id });
  res.status(200).json(transactions);
});

/**
 * GET /api/student/rec/:id
 */
const getRecurringTransaction = asyncHandler(async (req, res) => {
  const recurringTransaction = await RecurringTransaction.findById(req.params.id);

  if (!recurringTransaction) {
    res.status(404);
    throw new Error('Recurring transaction not found');
  }

  if (recurringTransaction.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Access denied — this transaction belongs to another user');
  }

  res.status(200).json(recurringTransaction);
});

/**
 * PUT /api/student/rec/:id
 * FIX: Whitelisted fields prevent MongoDB operator injection.
 */
const updateRecurringTransaction = asyncHandler(async (req, res) => {
  const recurringTransaction = await RecurringTransaction.findById(req.params.id);

  if (!recurringTransaction) {
    res.status(404);
    throw new Error('Recurring transaction not found');
  }

  if (recurringTransaction.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Access denied — this transaction belongs to another user');
  }

  // Whitelist updatable fields
  const { title, amount, type, category, frequency, date } = req.body;
  const updatePayload = {};
  if (title !== undefined) updatePayload.title = title;
  if (amount !== undefined) updatePayload.amount = amount;
  if (type !== undefined) updatePayload.type = type;
  if (category !== undefined) updatePayload.category = category;
  if (frequency !== undefined) updatePayload.frequency = frequency;
  if (date !== undefined) updatePayload.date = new Date(date);

  const updatedRecurringTransaction = await RecurringTransaction.findByIdAndUpdate(
    req.params.id,
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  res.status(200).json(updatedRecurringTransaction);
});

/**
 * DELETE /api/student/rec/:id
 */
const deleteRecurringTransaction = asyncHandler(async (req, res) => {
  const recurringTransaction = await RecurringTransaction.findById(req.params.id);

  if (!recurringTransaction) {
    res.status(404);
    throw new Error('Recurring transaction not found');
  }

  if (recurringTransaction.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Access denied — this transaction belongs to another user');
  }

  const deletedRecurringTransaction = await RecurringTransaction.findByIdAndDelete(req.params.id);
  res.status(200).json(deletedRecurringTransaction);
});

/**
 * POST /api/student/rec
 * FIX: Was referencing `Student` (capital S) but the import was `student` (lowercase)
 *      causing ReferenceError: Student is not defined.
 * FIX: Now uses req.user.id directly — no extra DB lookup needed.
 */
const createRecurringTransaction = asyncHandler(async (req, res) => {
  const { title, amount, type, category, frequency, date } = req.body;
  const userId = req.user.id; // FIX: use directly from JWT

  if (!title || amount === undefined || !type || !category || !frequency) {
    res.status(400);
    throw new Error('Please fill all required fields: title, amount, type, category, and frequency');
  }

  if (!['income', 'expense'].includes(type)) {
    res.status(400);
    throw new Error('type must be either "income" or "expense"');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400);
    throw new Error('amount must be a positive number');
  }

  if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
    res.status(400);
    throw new Error('frequency must be "daily", "weekly", or "monthly"');
  }

  const newRecurringTransaction = await RecurringTransaction.create({
    user: userId,
    title,
    amount,
    type,
    category,
    frequency,
    date: date ? new Date(date) : new Date(),
  });

  res.status(201).json(newRecurringTransaction);
});

module.exports = {
  createRecurringTransaction,
  deleteRecurringTransaction,
  updateRecurringTransaction,
  getRecTrannsactions,
  getRecurringTransaction,
};
