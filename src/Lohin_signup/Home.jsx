import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-800 via-blue-600 to-blue-400 px-6">
        <div className="max-w-2xl bg-white/10 backdrop-blur-lg p-10 rounded-3xl shadow-2xl text-center">
            <h1 className="text-5xl font-bold text-white mb-4">Welcome to <span className="text-blue-200">FinMate</span></h1>
            <p className="text-lg text-gray-100 mb-8">
            Track, manage, and visualize your expenses effortlessly. Start your smart financial journey with FinMate!
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button
                onClick={() => navigate('/signup')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-lg font-semibold transition duration-300 shadow-md"
            >
                Sign Up
            </button>
            <button
                onClick={() => navigate('/login')}
                className="bg-white hover:bg-blue-100 text-blue-600 px-6 py-3 rounded-xl text-lg font-semibold transition duration-300 shadow-md"
            >
                Login
            </button>
            </div>
        </div>
        </div>
    );
};

export default Home;
