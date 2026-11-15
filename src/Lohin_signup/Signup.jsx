import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { registerUser } from '../utils/api';
import GoogleOAuthButton from '../components/GoogleOAuthButton';

const SignUp = ({ toggle }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleSignUp = async () => {
        if (!username || !email || !password) {
            toast.warn('Please fill in all fields');
            return;
        }

        if (password.length < 8) {
            toast.warn('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        try {
            await registerUser(username, email, password);
            toast.success('Account created! Please sign in.');
            if (toggle) {
                toggle();
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSuccess = () => {
        if (toggle) toggle();
        else window.location.href = '/';
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
            <div className="space-y-5">
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
                placeholder="Create a password (min 8 characters)"
                />
            </div>
            <button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full py-3 bg-blue-700 text-white font-semibold text-sm rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition duration-300 disabled:bg-blue-900"
            >
                {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            {/* OAuth Divider */}
            <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-300 text-xs uppercase tracking-wider">
                    or
                </span>
                <div className="flex-grow border-t border-gray-600"></div>
            </div>

            {/* Google Sign-In */}
            <GoogleOAuthButton onSuccess={handleOAuthSuccess} />
            </div>
        </div>
        </div>
    );
};

export default SignUp;
