import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { loginUser } from '../utils/api';
import GoogleOAuthButton from '../components/GoogleOAuthButton';

const Login = (props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            toast.warn('Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            await loginUser(email, password);
            toast.success('Login successful!');
            props.toggle((val) => !val);
        } catch (error) {
            toast.error(error.message || 'Login failed!');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSuccess = () => {
        props.toggle((val) => !val);
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-bg">
            <div className="w-full max-w-md p-8 glassmorphism rounded-2xl shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">FinMate</h1>
                    <p className="text-gray-300 mt-2">Smart Student Expense Tracker</p>
                </div>
                <div className="space-y-5">
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
                        disabled={loading}
                        className={`w-full py-3 text-white font-semibold rounded-lg transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                            loading
                                ? 'bg-blue-900 cursor-not-allowed'
                                : 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-500'
                        }`}
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>

                    {/* OAuth Divider */}
                    <div className="flex items-center my-4">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-300 text-xs uppercase tracking-wider">
                            or
                        </span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>

                    {/* Google OAuth 2.1 Sign-In Button */}
                    <GoogleOAuthButton onSuccess={handleOAuthSuccess} />

                    {loading && (
                        <div className="text-yellow-400 text-sm text-center mt-2">
                            ⏳ Please wait... the server may take up to 30 seconds to respond.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
