const express = require('express');
const dotenv = require("dotenv").config();
const errorHandler = require('./middleware/errorHandling');

const connectDb = require('./config/dbConnection');
connectDb();
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
const validateTokenHandler =require('./middleware/validateTokenHandler')
app.use(express.json()); // Middleware to parse JSON

app.use(cors());
app.use('/api/students',require("./routes/studentRoutes"));
app.use('/api/student/transaction',require('./routes/transactionRoute'));
app.use('/api/student/rec',require('./routes/recTransactionRoute'))

// ✅ Register custom error handler LAST
app.use(errorHandler);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
