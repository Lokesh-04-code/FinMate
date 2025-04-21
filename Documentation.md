# API Routes Documentation

## Authentication Routes

### /api/v1/auth/signup

- **Method:** POST
- **Description:** Sends a verification email to the user for signup.
- **Expected Input:**
  ```json
  {
    "username": "string",
    "email": "string"
  }
  ```
- **Output:** Success or failure based on whether the email has been sent or not.
- **Error:** Fails to send the mail.

### /api/v1/auth/signup

- **Method:** GET
- **Description:** Verifies the token sent to the user.
- **Expected Input:** `token` (query parameter)
- **Output:** On success, sends the data in the token (Username, Email) and a new token (10 mins for user to create their password).
- **Error:** Fails to verify the token.

### /api/v1/auth/signup/verified

- **Method:** POST
- **Description:** Verifies the token and creates the user in the database.
- **Expected Input:**
  ```json
  {
    "token": "string",
    "password": "string"
  }
  ```
- **Output:** On success, returns JWT to the user.
- **Error:** Fails to verify the token or create the user.

### /api/v1/auth/login

- **Method:** POST
- **Description:** Logs in the user.
- **Expected Input:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Output:** On successful validation, returns JWT Token based on user id.
- **Error:** Fails to validate the credentials.

## User Routes

### /api/v1/user

- **Method:** GET
- **Description:** Gets details of the authenticated user.
- **Expected Input:** None
- **Output:** User details.
- **Error:** User not found or internal server error.

### /api/v1/user

- **Method:** PATCH
- **Description:** Updates details of the authenticated user.
- **Expected Input:**
  ```json
  {
    "name": "string (optional)",
    "email": "string (optional)",
    "imageURL": "string (optional)",
    "password": {
      "old": "string",
      "new": "string"
    }
  }
  ```
- **Output:** Updated user details.
- **Error:** User not found, old password does not match, or internal server error.

### /api/v1/user

- **Method:** DELETE
- **Description:** Deletes the authenticated user.
- **Expected Input:**
  ```json
  {
    "password": "string"
  }
  ```
- **Output:** Success message.
- **Error:** User not found, incorrect password, or internal server error.

## Event Routes

### /api/v1/event/createEvent

- **Method:** POST
- **Description:** Creates an event (Only for Admins and SuperAdmins).
- **Expected Input:**
  ```json
  {
    "title": "string",
    "description": "string",
    "venue": "string",
    "eventDate": "string",
    "startTime": "string",
    "endTime": "string",
    "bannerUrl": "string (optional)"
  }
  ```
- **Output:** Event details.
- **Error:** Fails to create the event.

### /api/v1/event/getPastEvents

- **Method:** GET
- **Description:** Gets past events (Public Route - No Auth Required).
- **Expected Input:** None
- **Expected Query Params:**
  ```json
  {
    "page": "number (optional)",
    "limit": "number (optional)"
  }
  ```
- **Output:** Past event details.
- **Error:** Reached EOF or internal server error.

### /api/v1/event/getUpcomingEvents

- **Method:** GET
- **Description:** Gets upcoming events (Public Route - No Auth Required).
- **Expected Input:** None
- **Expected Query Params:**
  ```json
  {
    "page": "number (optional)",
    "limit": "number (optional)"
  }
  ```
- **Output:** Upcoming event details.
- **Error:** Reached EOF or internal server error.

### /api/v1/event/viewEvent/:id

- **Method:** GET
- **Description:** Views a particular event (Public Route - No Auth Required).
- **Expected Input:** `eventId` (URL parameter)
- **Output:** Particular event details.
- **Error:** Event not found or internal server error.

### /api/v1/event/updateEvent/:id

- **Method:** PUT
- **Description:** Updates an event (Admin Only).
- **Expected Input:** `eventId` (URL parameter) and any event fields to update in the request body.
- **Output:** Updated event details.
- **Error:** Event not found or internal server error.

### /api/v1/event/deleteEvent/:id

- **Method:** DELETE
- **Description:** Deletes an event (Admin Only).
- **Expected Input:** `eventId` (URL parameter)
- **Output:** Confirmation message upon successful deletion.
- **Error:** Event not found or internal server error.

## Feedback Routes

### /api/v1/feedback/create-question

- **Method:** POST
- **Description:** Creates a feedback question.
- **Expected Input:**
  ```json
  {
    "questionText": "string",
    "questionType": "string",
    "additionalInfo": "string[]"
  }
  ```
- **Output:** Created question.
- **Error:** Fails to create the question.

### /api/v1/feedback/create-section

- **Method:** POST
- **Description:** Creates a feedback section.
- **Expected Input:**
  ```json
  {
    "sectionName": "string",
    "questionsToAdd": [
      {
        "questionID": "string",
        "order": "number"
      }
    ]
  }
  ```
- **Output:** Created section.
- **Error:** Fails to create the section.

### /api/v1/feedback/create-feedback

- **Method:** POST
- **Description:** Creates feedback.
- **Expected Input:**
  ```json
  {
    "eventId": "string",
    "sectionsToAdd": [
      {
        "sectionId": "string",
        "order": "number"
      }
    ]
  }
  ```
- **Output:** Success message.
- **Error:** Fails to create the feedback.

### /api/v1/feedback/feedback

- **Method:** GET
- **Description:** Gets feedback for an event.
- **Expected Input:** None
- **Expected Query Params:**
  ```json
  {
    "eventId": "string"
  }
  ```
- **Output:** Feedback details.
- **Error:** Feedback not found or internal server error.

### /api/v1/feedback/create-response

- **Method:** POST
- **Description:** Submits feedback response.
- **Expected Input:**
  ```json
  {
    "feedbackId": "string",
    "answers": [
      {
        "sectionInFeedbackID": "string",
        "questionInSectionID": "string",
        "reply": "string"
      }
    ]
  }
  ```
- **Output:** Success message.
- **Error:** Fails to submit the feedback response.

## Middleware

### AuthMiddleware

- **Description:** Middleware factory function to generate authentication middleware.
- **Usage Example:**
  ```javascript
  AuthMiddleware(); // Allows all roles
  AuthMiddleware([Roles.Admin, Roles.SuperAdmin]); // Allows only Admins and SuperAdmins
  AuthMiddleware([Roles.User]); // Allows only Users
  ```

## Utilities

### hashPassword

- **Description:** Hashes a given password using PBKDF2 and AES-GCM.
- **Input:** `password` (string)
- **Output:** Hashed password string in the format "salt:hash".

### verifyPassword

- **Description:** Verifies if a given password matches the stored hashed password.
- **Input:** `storedHash` (string), `passwordAttempt` (string)
- **Output:** Boolean indicating if the password matches.

### sendVerificationEmail

- **Description:** Sends a verification email to the user.
- **Input:**
  ```json
  {
    "username": "string",
    "to": "string",
    "emailBodyTemplate": "string",
    "subject": "string",
    "verificationLink": "string",
    "c": "Context"
  }
  ```
- **Output:** Response data from the email server indicating success or failure.

### getPrisma

- **Description:** Creates a Prisma client instance if it doesn't exist or returns the existing instance.
- **Input:** `databaseUrl` (string)
- **Output:** Prisma client instance.

## Constants

### Roles

- **Description:** Enum for roles used in the USER table in the database.
- **Values:**
  - User
  - Admin
  - SuperAdmin

### adminRoles

- **Description:** Array of admin roles.
- **Values:**
  - Roles.Admin
  - Roles.SuperAdmin

### replyTypes

- **Description:** Array of feedback types.
- **Values:**
  - FeedbackType.TEXT
  - FeedbackType.RATING
  - FeedbackType.MCQ
  - FeedbackType.MSQ

## Zod Schemas

### signUpData

- **Description:** Zod schema for signup data validation.
- **Fields:**
  ```json
  {
    "username": "string",
    "email": "string"
  }
  ```

### signUpVerified

- **Description:** Zod schema for signup verification data validation.
- **Fields:**
  ```json
  {
    "token": "string",
    "password": "string"
  }
  ```

### logInData

- **Description:** Zod schema for login data validation.
- **Fields:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```

### tokenData

- **Description:** Zod schema for token data validation.
- **Fields:**
  ```json
  {
    "username": "string",
    "email": "string",
    "exp": "number"
  }
  ```

### userDetailsSchema

- **Description:** Zod schema for user details validation.
- **Fields:**
  ```json
  {
    "name": "string (optional)",
    "email": "string (optional)",
    "imageURL": "string (optional)",
    "password": {
      "old": "string",
      "new": "string"
    }
  }
  ```

### deleteUserSchema

- **Description:** Zod schema for delete user validation.
- **Fields:**
  ```json
  {
    "password": "string"
  }
  ```

### createEventSchema

- **Description:** Zod schema for create event validation.
- **Fields:**
  ```json
  {
    "title": "string",
    "description": "string",
    "venue": "string",
    "eventDate": "string",
    "startTime": "string",
    "endTime": "string",
    "bannerUrl": "string (optional)"
  }
  ```

### feedbackQuestionSchema

- **Description:** Zod schema for feedback question validation.
- **Fields:**
  ```json
  {
    "question": "string",
    "questionType": "string",
    "additionalInfo": "string[] (optional)"
  }
  ```

### feedbackSectionSchema

- **Description:** Zod schema for feedback section validation.
- **Fields:**
  ```json
  {
    "sectionName": "string",
    "questionsToAdd": [
      {
        "questionID": "string",
        "order": "number"
      }
    ]
  }
  ```

### createFeedbackSchema

- **Description:** Zod schema for create feedback validation.
- **Fields:**
  ```json
  {
    "eventId": "string",
    "sectionsToAdd": [
      {
        "sectionId": "string",
        "order": "number"
      }
    ]
  }
  ```

### answerFeedbackSchema

- **Description:** Zod schema for answer feedback validation.
- **Fields:**
  ```json
  {
    "feedbackId": "string",
    "answers": [
      {
        "sectionInFeedbackID": "string",
        "questionInSectionID": "string",
        "reply": "string"
      }
    ]
  }
  ```
