const mongoose = require("mongoose");

const Transactionschema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Please add the user"],
    ref: "student", // FIX: was 'User' — model name is 'student'
  },
  title: {
    type: String,
    required: [true, "Please add the title"],
  },
  amount: {
    type: Number, // FIX: was String — amounts must be numeric
    required: [true, "Please add the amount"],
  },
  type: {
    type: String,
    required: [true, "Please add the type"],
    enum: ["income", "expense"], // FIX: added enum validation
  },
  category: {
    type: String,
    required: [true, "Please add the category"],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("transaction", Transactionschema);