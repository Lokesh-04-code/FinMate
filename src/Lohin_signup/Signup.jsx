import React, { useState } from 'react';

const SignUp = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const handleSignUp = async () => {
        const payload = {
            username,
            email,
            password
        };

        try {
            const response = await fetch('http://localhost:5000/api/students/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                alert('User registered successfully!');
                // Redirect or clear fields if needed
            } else {
                alert(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Something went wrong!');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="w-full max-w-md p-8 glassmorphism rounded-3xl shadow-2xl">
            <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white">Fintech</h1>
            <p className="text-gray-200 mt-2 text-base">
                Create your account to start your financial journey
            </p>
            </div>
            <div className="space-y-6">
            <div>
                <label htmlFor="username" className="block text-xs font-medium text-gray-100">Username</label>
                <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full px-4 py-3 bg-gray-900/30 border border-gray-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-300"
                placeholder="Choose a username"
                />
            </div>
            <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-100">Email</label>
                <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-4 py-3 bg-gray-900/30 border border-gray-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-300"
                placeholder="Enter your email"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-100">Password</label>
                <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-3 bg-gray-900/30 border border-gray-500 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-300"
                placeholder="Create a password"
                />
            </div>
            <button
                onClick={handleSignUp}
                className="w-full py-3 bg-blue-700 text-white font-semibold text-sm rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition duration-300"
            >
                Sign Up
            </button>
            </div>
        </div>
        </div>
    );
};

export default SignUp;
