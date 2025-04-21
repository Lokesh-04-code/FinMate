const asyncHandler=require('express-async-handler');
const student=require('../models/studentModel');
const RecurringTransaction=require('../models/recursiveTransactionModel')

const getRecTrannsactions=asyncHandler(async (req,res)=>{
    const  Transaction=await RecurringTransaction.find({user:req.user.id})
    res.status(200).json(Transaction)
})

const getRecurringTransaction = asyncHandler(async (req, res) => {
    const recurringTransaction = await RecurringTransaction.findById(req.params.id);
    
    if (!recurringTransaction) {
        res.status(404);
        throw new Error("Recurring transaction not found");
    }
    
    if (recurringTransaction.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error("User not permitted to access this recurring transaction");
    }

    res.status(200).json(recurringTransaction);
});

const updateRecurringTransaction = asyncHandler(async (req, res) => {
    const recurringTransaction = await RecurringTransaction.findById(req.params.id);

    if (!recurringTransaction) {
        res.status(404);
        throw new Error("Recurring transaction not found");
    }

    if (recurringTransaction.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error("User not permitted to update this recurring transaction");
    }

    const updatedRecurringTransaction = await RecurringTransaction.findByIdAndUpdate(req.params.id, req.body, {
        new: true,  // Ensures the updated document is returned
    });

    res.status(200).json(updatedRecurringTransaction);
});

const deleteRecurringTransaction = asyncHandler(async (req, res) => {
    const recurringTransaction = await RecurringTransaction.findById(req.params.id);

    if (!recurringTransaction) {
        res.status(404);
        throw new Error("Recurring transaction not found");
    }

    if (recurringTransaction.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error("User not permitted to delete this recurring transaction");
    }

    const deletedRecurringTransaction = await RecurringTransaction.findByIdAndDelete(req.params.id);
    
    res.status(200).json(deletedRecurringTransaction);
});



const createRecurringTransaction = asyncHandler(async (req, res) => {
    const { title, amount, type, category, frequency, date } = req.body;
    const { email } = req.user; // Assuming user info is in req.user

    // Find the student (user) by email
    const student1 = await Student.findOne({ email });
    const userId = student1.id;

    // Check if required fields are present
    if (!title || !amount || !type || !category || !frequency) {
        res.status(400);
        throw new Error("Please fill all the required fields (title, amount, type, category, and frequency)");
    }

    // Validate the frequency for the recurring transaction (daily, weekly, monthly)
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
        res.status(400);
        throw new Error("Invalid frequency for recurring transaction. Choose daily, weekly, or monthly.");
    }

    // Create the new recurring transaction
    const newRecurringTransaction = await RecurringTransaction.create({
        user: userId,
        title,
        amount,
        type,
        category,
        frequency,
        date: date || new Date(), // Use provided date or default to now
    });

    // Send back the recurring transaction response
    res.status(201).json(newRecurringTransaction);
});



module.exports={createRecurringTransaction,deleteRecurringTransaction,updateRecurringTransaction,getRecTrannsactions,getRecurringTransaction}