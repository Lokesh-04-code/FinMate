const asyncHandler=require("express-async-handler");
const Student=require("../models/studentModel");    
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");  

const registerStudent=asyncHandler(async (req,res)=>{
    console.log("Registering started");
    const  {username,email,password}=req.body;
    console.log(username,email,password);
    if(!username || !email || !password){
        res.status(400);
        throw new Error("Please fill all the fields");
    }
    console.log("data getted")
    const studentAvailable=await Student.findOne({email});
    console.log("student available check");
    if(studentAvailable){
        console.log("Student already registered");
        res.status(400);
        throw new Error("Student already registered");
    }
    console.log("before password");
    const hashPassword=await bcrypt.hash(password,10);
    console.log("after password");
    const student=await Student.create({
        username:username,
        email:email,
        password:hashPassword,
    });
    console.log(student);
    console.log("Student created successfully");
    if(student){
        res.status(201).json({_id:student._id,email:student.email});
    }
    else{
        res.status(400);
        throw new Error("Student data is not valid");
    }
});

const loginStudent=asyncHandler(async (req,res)=>{
   const {email,password}=req.body;
   console.log(email,password)
   if(!email && !password){
    res.status(400);
    throw new Error("please fill all the fields");
   }
   const user=await Student.findOne({email});
   if(user && (await bcrypt.compare(password,user.password))){
    const  accessToken=jwt.sign({
        user:{
            username:user.username,
            email:user.email,
            id:user.id,
        }
    },process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"2h"
    });
    res.status(200).json({status:"success",token:accessToken})
   }
   else{
    res.status(401);
    throw new Error("email or password is not valid")
   }
   

});

const currentStudent=asyncHandler(async (req,res)=>{
    const {email}=req.user;
    if(!email){
        res.status(400);
      throw new Error("Email is missing");
    }
    const student = await Student.findOne({ email });
    if(!student){
        res.status(404);
      throw new Error("student is missing");
    }
    res.status(200).json(student);

})
const categoryUpdate = asyncHandler(async (req, res) => {
  const { email } = req.user;
  const budget = req.body.budget;

  if (!email) {
    res.status(400);
    throw new Error("Email is missing");
  }

  const updatedCategories = req.body.categories;

  if (!updatedCategories || typeof updatedCategories !== 'object') {
    res.status(400);
    throw new Error("Invalid or missing category data");
  }

  // Build update object with dot notation for nested fields
  const updateFields = {};
  for (const key in updatedCategories) {
    updateFields[`categories.${key}`] = updatedCategories[key];
  }

  const student = await Student.findOneAndUpdate(
    { email },
    { $set: { budget, ...updateFields } }, // ✅ Combine budget and category updates here
    { new: true }
  );

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  res.status(200).json({
    status: "success",
    budget: student.budget,
    categories: student.categories,
  });
});

  

module.exports={registerStudent,loginStudent,currentStudent,categoryUpdate};