# MERN Stack Feed Application

A full-stack social feed application built with the MERN stack (MongoDB, Express.js, React, Node.js) with real-time updates using Socket.IO.

## Features

- User authentication (Register/Login)
- Create, read, update, and delete posts
- Add comments to posts
- Real-time updates for new posts and comments
- Responsive design with Tailwind CSS

## Tech Stack

### Frontend
- React.js
- React Router for navigation
- Tailwind CSS for styling
- Axios for API requests
- Socket.IO client for real-time updates
- Vite as build tool

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Bcrypt for password hashing
- Socket.IO for real-time communication
- CORS for cross-origin requests

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd feed
```

### 2. Set up the backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

### 3. Set up the frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd feed-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

## Project Structure

```
feed/
├── backend/               # Backend server
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── .env              # Environment variables
│   ├── db.js             # Database connection
│   └── server.js         # Express server setup
│
└── feed-app/             # Frontend React application
    ├── public/           # Static files
    ├── src/
    │   ├── components/   # Reusable components
    │   ├── context/      # React context
    │   ├── pages/        # Page components
    │   ├── App.jsx       # Main App component
    │   └── main.jsx      # Entry point
    └── package.json      # Frontend dependencies
```

## Available Scripts

### Backend
- `npm start` - Start the backend server

### Frontend
- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Variables

### Backend (`.env`)
- `PORT` - Port for the backend server (default: 5000)
- `MONGODB_URI` - MongoDB connection string

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the MERN stack
- Real-time functionality powered by Socket.IO
- Styled with Tailwind CSS
