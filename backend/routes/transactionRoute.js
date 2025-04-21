const express=require('express')
const route=express.Router();

const {createTransaction,getTransactions,getTransaction,updateTransaction,deleteTransaction}=require('../controllers/transactionController')
const validateToken=require('../middleware/validateTokenHandler')
route.use(validateToken)

route.route("/").post(createTransaction)
route.route("/").get(getTransactions)
route.route("/:id").get(getTransaction).put(updateTransaction).delete(deleteTransaction)

module.exports=route;