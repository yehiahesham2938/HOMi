import { GoogleLoginBtn } from '../components/GoogleLoginBtn';

export const LoginPage = () => {
    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Mountain Background */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.5) 100%), 
                                         url('https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`
                    }}
                />

                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col h-full w-full p-10">
                    {/* Welcome Text */}
                    <div className="text-white">
                        <h1 className="text-3xl font-light tracking-wide leading-tight">Welcome</h1>
                        <h1 className="text-3xl font-light tracking-wide">Back,</h1>
                    </div>

                    {/* Logo & Tagline - Centered */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                    <defs>
                                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#ffffff" />
                                            <stop offset="100%" stopColor="#e2e8f0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Circular outline with stylized shape */}
                                    <ellipse cx="50" cy="50" rx="42" ry="42" fill="none" stroke="white" strokeWidth="2.5" />
                                    {/* Inner design - abstract leaf/curve */}
                                    <path
                                        d="M35 70 Q35 30 65 30 Q45 50 45 70 Z"
                                        fill="white"
                                    />
                                </svg>
                            </div>
                            <span className="text-white text-3xl font-medium tracking-wide">HOMI</span>
                        </div>

                        {/* Tagline */}
                        <p className="text-white/70 text-base text-center max-w-[280px] leading-relaxed">
                            Enter your personal details and start journey with us
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#0f172a] px-8 lg:px-16">
                <div className="w-full max-w-[400px]">
                    {/* Login Header */}
                    <div className="mb-10">
                        <h2 className="text-[28px] font-bold text-white mb-4">Login</h2>
                        <p className="text-gray-400 text-[15px]">
                            Measure the performance of cryptos,get big profits!
                        </p>
                    </div>

                    {/* Google Sign In Button - FUNCTIONAL */}
                    <div className="mb-10">
                        <GoogleLoginBtn />
                    </div>

                    {/* Divider */}
                    <div className="relative mb-10">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-600/40" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-[#0f172a] text-gray-500 text-[13px]">
                                Or Sign in with Email
                            </span>
                        </div>
                    </div>

                    {/* Email Input - Static/Disabled */}
                    <div className="mb-10">
                        <label className="block text-gray-400 text-[14px] mb-3">Email</label>
                        <input
                            type="email"
                            disabled
                            placeholder="mail@website.com"
                            className="w-full px-5 py-4 bg-[#1e293b] border border-[#334155] rounded-none 
                                     text-[15px] text-gray-300 placeholder-gray-500 cursor-not-allowed
                                     focus:outline-none"
                        />
                    </div>

                    {/* Password Input - Static/Disabled */}
                    <div className="mb-10">
                        <label className="block text-gray-400 text-[14px] mb-3">Password</label>
                        <input
                            type="password"
                            disabled
                            placeholder="Min. 8 character"
                            className="w-full px-5 py-4 bg-[#1e293b] border border-[#334155] rounded-none 
                                     text-[15px] text-gray-300 placeholder-gray-500 cursor-not-allowed
                                     focus:outline-none"
                        />
                    </div>

                    {/* Remember Me & Forgot Password - Static */}
                    <div className="flex items-center justify-between mb-10">
                        <label className="flex items-center gap-3 cursor-not-allowed">
                            <input
                                type="checkbox"
                                disabled
                                className="w-5 h-5 border-2 border-gray-500 bg-transparent appearance-none rounded-none"
                            />
                            <span className="text-gray-400 text-[14px]">Remember me</span>
                        </label>
                        <span className="text-gray-400 text-[14px] cursor-not-allowed">
                            Forget password?
                        </span>
                    </div>

                    {/* Login Button - Static/Disabled */}
                    <button
                        disabled
                        className="w-full py-4 bg-white text-[#0f172a] text-[15px] font-semibold rounded-none
                                 cursor-not-allowed border border-gray-200"
                    >
                        Login
                    </button>

                    {/* Create Account Link - Static */}
                    <p className="text-center mt-10 text-gray-400 text-[14px]">
                        Not registered yet?{' '}
                        <span className="text-white cursor-not-allowed font-medium">
                            Create an Account
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};
