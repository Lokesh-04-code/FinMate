const express=require('express');
const router=express.Router();
const {registerStudent,loginStudent,currentStudent,categoryUpdate}=require('../controllers/studentController');
const validateToken = require('../middleware/validateTokenHandler');

router.post('/register',registerStudent);
router.put('/update',validateToken,categoryUpdate)
router.post('/login',loginStudent);
router.get('/current',validateToken,currentStudent);
module.exports=router;