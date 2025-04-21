const mongoose = require("mongoose");

const studentSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please add the name"],
  },
  email: {
    type: String,
    required: [true, "Please add the email"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Please add the password"],
  },
  currency: {
    type: String,
    default: "INR", // Optional, for currency converter
  },
  budget: {
    type: Number,
    default: 0,
  },
  categories: {
    Food: { type: Number, default: 0 },
    Transport: { type: Number, default: 0 },
    Healthcare: { type: Number, default: 0 },
    Personal: { type: Number, default: 0 },
    Education: { type: Number, default: 0 },
    Clothes: { type: Number, default: 0 },
    Utilities: { type: Number, default: 0 },
    Other: { type: Number, default: 0 },
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model("student", studentSchema);
