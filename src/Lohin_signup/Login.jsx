import React, { useState } from 'react';
import { toast } from 'react-toastify';

const Login = (props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        const loginData = {
            email: email,
            password: password,
        };

        try {
            const response = await fetch('http://localhost:5000/api/students/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });
           
            const result = await response.json();

            if (response.ok) {
                toast.success('Login successful!');
                props.toggle((val)=>!val);
                console.log(result); // token or user data
                // Optionally save token to localStorage and redirect
                localStorage.setItem('token', result.token);
                console.log(result.token)
                // window.location.href = '/dashboard'; 
            } else {
                toast.error(result.message || 'Login failed!');
            }
        } catch (error) {
           
            toast.error('An error occurred. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-bg">
            <div className="w-full max-w-md p-8 glassmorphism rounded-2xl shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">FinMate</h1>
                    <p className="text-gray-300 mt-2">Smart Student Expense Tracker</p>
                </div>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-200">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300"
                            placeholder="Enter your email"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-200">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300"
                            placeholder="Enter your password"
                        />
                    </div>
                    <button
                        onClick={handleLogin}
                        className="w-full py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-300"
                    >
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
