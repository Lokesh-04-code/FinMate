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
    required: [
      function () {
        return this.authProvider === 'local' || !this.authProvider;
      },
      "Please add the password",
    ],
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  googleId: {
    type: String,
  },
  currency: {
    type: String,
    default: "INR",
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
  },
  // Stores hashed refresh tokens for server-side session invalidation.
  // Each entry: { tokenHash, expiresAt }
  refreshTokens: [
    {
      tokenHash: { type: String, required: true },
      expiresAt: { type: Date, required: true },
    },
  ],
}, {
  timestamps: true,
});

module.exports = mongoose.model("student", studentSchema);
