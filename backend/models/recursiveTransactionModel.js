const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'student', // FIX: was 'User' — model name is 'student'
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  amount: {
    type: Number, // FIX: was String — amounts must be numeric
    required: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },
  category: String,
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'], // FIX: enum enforced at model level
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
