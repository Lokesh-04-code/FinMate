
# FinMate - Smart Student Expensive tracker

A modern personal finance management app built with MERN stack to track income, expenses, and budgeting goals.

## ✨ Features

### 🔐 Authentication
- User registration and login
- JWT-based authentication
- Password encryption

### 💰 Transaction Management
- Add/edit/delete income & expenses
- Categorize transactions (Food, Travel, Rent, etc.)
- Custom tags for transactions

### 📊 Dashboard
- Income vs Expense summary
- Monthly/weekly breakdown
- Interactive charts (Pie/Bar graphs)
- Spending analysis by category

### 🎯 Budgeting
- Set monthly budget goals
- Real-time progress tracking
- Visual budget indicators

### 📜 Transaction History
- Filter by date, category, type
- Search functionality


## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React.js | Frontend framework |
| Recharts | Data visualization |
| TailwindCSS | Styling framework |
| Fetch Request | For requests |
| React Hook Form | Form management |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| MongoDB | Database |
| JWT | Authentication |

## 🚀 Installation

### Prerequisites
- Node.js (v16+)
- MongoDB (local)
- npm (v8+) 

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Lokesh-04-code/FinMate
   

## 📂 Project Structure 
```
finmate              # React frontend
│   ├── node_modules/     # Dependencies
│   ├── public/           # Static assets
│   └── src/
│       ├── assets/       # Images, fonts
│       ├── components/   # Reusable components
│       │   ├── Header.jsx
│       │   ├── MainContent.jsx
│       │   ├── SideBar.jsx
│       │   └── TotalContent.jsx
│       │
│       ├── Login_signup/ # Auth components
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   └── Signup.jsx
│       │
│       ├── Main_Content/ # App sections
│       │   ├── Budget/
│       │   ├── Dashboard/
│       │   ├── Transactions/
│       │   └── Transaction.jsx
│       │
│       ├── App.css       # Main styles
│       ├── App.jsx       # Root component
│       ├── index.css     # Global styles
│       └── main.jsx      # Entry point
│
├── backend/              # Node.js backend
│   ├── .vscode/         # Editor configuration
│   ├── config/          # Configuration files
│   ├── controllers/     # Business logic
│   │   ├── recursiveTransactionController.js
│   │   ├── studentController.js
│   │   └── transactionController.js
│   ├── middleware/      # Middleware
│   │   ├── errorHandling.js
│   │   └── validateTokenHandler.js
│   ├── models/          # Database models
│   │   ├── recursiveTransactionModel.js
│   │   ├── studentModel.js
│   │   └── transactionModel.js
│   ├── node_modules/    # Dependencies
│   └── routes/          # API endpoints
│       ├── recTransactionRoute.js
│       ├── studentRoutes.js
│       └── transactionRoute.js
│
└── README.md           # Project documentation
```



# FinMate Backend API Documentation

## 📚 Table of Contents
1. [API Endpoints](#-api-endpoints)
2. [Models](#-database-models)
   - [Student Model](#student-model)
   - [Transaction Model](#transaction-model)
3. [Authentication](#-authentication-flow)
4. [Error Handling](#-error-handling)
5. [Environment Variables](#-environment-variables)
6. [Budget Tracker API Documentation](#-budget-tracker-api-documentation)

## 🌐 API Endpoints

### Student Routes
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/students/register` | POST | Register new student | No |
| `/api/students/login` | POST | Login student | No |
| `/api/students/current` | GET | Get current student data | Yes |
| `/api/students/update` | PUT | Update budget/categories | Yes |

### Transaction Routes
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/transactions` | POST | Create transaction | Yes |
| `/api/transactions` | GET | Get all transactions | Yes |
| `/api/transactions/:id` | GET | Get single transaction | Yes |
| `/api/transactions/:id` | PUT | Update transaction | Yes |
| `/api/transactions/:id` | DELETE | Delete transaction | Yes |

## 🗃 Database Models

### Student Model
```
{
  username: String,        // Required
  email: String,           // Required, Unique
  password: String,        // Required (hashed)
  currency: String,        // Default: "INR"
  budget: Number,          // Default: 0
  categories: {            // Default categories with 0 values
    Food: Number,
    Transport: Number,
    Healthcare: Number,
    Personal: Number,
    Education: Number,
    Clothes: Number,
    Utilities: Number,
    Other: Number
  },
  timestamps: true         // createdAt, updatedAt
} 
```
### transaction model
```
{
  user: ObjectId,          // Required (references Student)
  title: String,           // Required
  amount: String,          // Required
  type: String,            // Required
  category: String,        // Required
  date: Date,              // Default: current date
  isRecurring: Boolean,    // Default: false
  timestamps: true         // createdAt, updatedAt
}
```
## 🔐 Authentication Flow
### JWT Token Validation
```
const token = authHeader.split(' ')[1];
jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
  if(err) {
    res.status(401);
    throw new Error("User is not authorized");
  }
  req.user = decoded.user;
  next();
}); 
```
## Error Constants
```
// constants.js
module.exports = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};
```

## ⚠ Error Handling
### Error Handler Middleware
```
// errorHandling.js
switch(statusCode) {
  case constants.VALIDATION_ERROR:
    res.json({
      title: "Validation Failed",
      message: err.message,
      stackTrace: err.stack
    });
    break;
  // Other error cases...
}
```
## Environment Setup
### Create .env file:
```
PORT=5000
CONNECTION_STRING='######'
ACCESS_TOKEN_SECRET='######'
```
### to connect with the mongodb from vs code
#### use this string
```
mongodb+srv://admin:admin@lokeshcluster.hqievee.mongodb.net/
```


# Budget Tracker API Documentation

## Base URL
`http://localhost:5000/api`

## Authentication
All endpoints (except `/register` and `/login`) require a valid JWT token in the Authorization header:



---

## Student Endpoints

### `students/register`
- **Method**: POST  
- **Description**: Register a new student  
- **Expected Input**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```
#### Success Response:
```
{
  "_id": "string",
  "email": "string"
}
```
#### Error Responses:

- 400: Missing fields or student already registered

- 500: Server error

### `/students/login`

- **Method**: POST

- **Description**: Authenticate a student

- **Expected Input**:
```
{
  "email": "string",
  "password": "string"
}
```
#### Success Response:
```
{
  "status": "success",
  "token": "jwt_token"
}
```
#### Error Responses:

- 400: Missing fields

- 401: Invalid credentials

### `/students/current`
- **Method**: GET

- **Description**: Get current student profile

- **Headers** : Authorization: Bearer <token>

#### Success Response:
```
{
  "_id": "string",
  "username": "string",
  "email": "string",
  "budget": number,
  "categories": {
    "Food": number,
    "Transport": number,
    // ...other categories
  }
}
```
#### Error Responses:

- 401: Unauthorized

- 404: Student not found

## `students/update`
- **Method**: PUT

- **Description**: Update budget and categories

- **Headers**: Authorization: Bearer <token>

#### Expected Input:
```
{
  "budget": number,
  "categories": {
    "Food": number,
    "Transport": number,
    // ...other categories to update
  }
}
```
#### Success Response:
```
{
  "status": "success",
  "budget": number,
  "categories": {
    // updated categories
  }
}
```
#### Error Responses:

- 400: Invalid data

- 401: Unauthorized

- 404: Student not found

# Transaction Endpoints
### `/student/transaction`

- **Method**: POST

- **Description**: Create a new transaction

- **Headers**: Authorization: Bearer <token>

#### Expected Input:
```
{
  "title": "string",
  "amount": "string",
  "type": "string",
  "category": "string",
  "date": "date (optional)",
  "isRecurring": boolean,
  "frequency": "string (if recurring)"
}
```
#### Success Response:
```
{
  "transaction": {
    // transaction details
  }
}
```
#### Error Responses:

- 400: Missing required fields

- 401: Unauthorized

## `student/transaction`
- **Method**: GET

- **Description**: Get all transactions for user

- **Headers**: Authorization: Bearer <token>

#### Success Response:
```
[
  {
    // transaction details
  }
]
```
#### Error Responses:

- 401: Unauthorized

## `student/transaction/:id`
- **Method**: GET

- **Description**: Get single transaction

- **Headers**: Authorization: Bearer <token>

#### Success Response:
```
{
  // transaction details
}
```
#### Error Responses:

- 403: Not authorized to access

- 404: Transaction not found

## `student/transaction/:id`
- **Method**: PUT

- **Description**: Update transaction

- **Headers** : Authorization: Bearer <token>

- **Expected Input**: Transaction fields to update

#### Success Response:
```
{
  // updated transaction
}
```
#### Error Responses:

- 403: Not authorized

- 404: Transaction not found

### `student/transaction/:id`
- **Method**: DELETE

- **Description**: Delete transaction

- **Headers**: Authorization: Bearer <token>

#### Success Response:
```
{
  // deleted transaction
}
```
#### Error Responses:

- 403: Not authorized

- 404: Transaction not found
