const asyncHandler=require('express-async-handler');
const student=require('../models/studentModel');
const Transaction = require("../models/transactionModel");
const RecurringTransaction=require('../models/recursiveTransactionModel')

const getTransactions=asyncHandler(async (req,res)=>{
const transactions=await Transaction.find({user:req.user.id})
res.status(200).json(transactions)
})

const createTransaction = asyncHandler(async (req, res) => {
   
    const { title, amount, type, category, date, isRecurring,frequency } = req.body;
   const {email}=req.user
   
  
    // Assuming you're using a middleware to authenticate and attach user info to req.user
    const student1 = await student.findOne({ email });
    const userId = student1.id;
    
     console.log(userId)
    if (!title || !amount || !type || !category) {
        res.status(400);
        throw new Error("Please fill all the required fields");
    }
    if(isRecurring){
    const newRcusiveTransaction=await RecurringTransaction.create({
        user:userId,
        title,
        amount,
        type,
        category,
        frequency,
        date:new Date()
    })
    }

    const newTransaction = await Transaction.create({
        user: userId,
        title,
        amount,
        type,
        category,
        date: date || new Date(), // use current date if not provided
        isRecurring: isRecurring || false,
    });

    res.status(201).json(newTransaction);
});

const getTransaction=asyncHandler(async (req,res)=>{
    const transaction=await Transaction.findById(req.params.id);
    if(!transaction){
        res.status(404);
        throw new Error("Tarnsaction not found");
    }
    if(transaction.user.toString()!==req.user.id){
        res.status(403);
        throw new Error("user not permitted to update the other transaction")
    }

    res.status(200).json(transaction)
});

const updateTransaction=asyncHandler(async(req,res)=>{
   const transaction=await Transaction.findById(req.params.id);
   if(!transaction){
    res.status(404);
    throw new Error("Transaction not found");
   }
   if(transaction.user.toString()!==req.user.id){
    res.status(403);
    throw new Error("user not permitted to update the other transaction")
}
const updatedTransaction=await Transaction.findByIdAndUpdate(req.params.id,req.body,{
    new:true,
})
res.status(200).json(updatedTransaction);

})

const deleteTransaction=asyncHandler(async(req,res)=>{
    const transaction=await Transaction.findById(req.params.id);
    if(!transaction){
     res.status(404);
     throw new Error("Transaction not found");
    }
    if(transaction.user.toString()!==req.user.id){
     res.status(403);
     throw new Error("user not permitted to update the other transaction")
 }
 const deletedTransaction=await Transaction.findByIdAndDelete(req.params.id)
 res.status(200).json(deletedTransaction);
})






module.exports={createTransaction,getTransactions,getTransaction,updateTransaction,deleteTransaction}