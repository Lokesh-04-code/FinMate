const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {type:String
    ,required:true
  },
  amount: {
    type:String,
    required:true
},
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: String,
  frequency: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
