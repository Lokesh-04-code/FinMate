const express=require('express')
const route=express.Router();

const {createRecurringTransaction,deleteRecurringTransaction,updateRecurringTransaction,getRecTrannsactions,getRecurringTransaction}=require('../controllers/recursiveTansactionController')
const validateToken=require('../middleware/validateTokenHandler')
route.use(validateToken)
route.route('/').get(getRecTrannsactions).post(createRecurringTransaction)
route.route("/:id").get(getRecurringTransaction).put(updateRecurringTransaction).delete(deleteRecurringTransaction)

module.exports=route;