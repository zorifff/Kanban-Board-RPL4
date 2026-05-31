"use client";


import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const result = await signIn("credentials", {
      email, 
      password, 
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      router.push("/dashboard"); // Go to Dashboard if successful
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F5FEFF] to-[#AAC0E1] font-sans text-black">
      <div className="w-full max-w-[448px] bg-white rounded-2xl shadow-xl px-[32px] py-[40px] relative">
        
        {/* Header Section */}
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-[4px] mb-[24px]">
            {/* Logo icon */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <div className="w-2.5 h-9 absolute left-[5px] top-[6.66px] overflow-hidden">
                <div className="w-2.5 h-2 absolute left-0 top-0 bg-blue-500" />
                <div className="w-2.5 h-1.5 absolute left-0 top-[10px] bg-blue-500/80" />
                <div className="w-2.5 h-2.5 absolute left-0 top-[18.33px] bg-blue-500/60" />
                <div className="w-2.5 h-1.5 absolute left-0 top-[30px] bg-blue-500/40" />
              </div>
              <div className="w-2.5 h-9 absolute left-[20px] top-[6.66px] overflow-hidden">
                <div className="w-2.5 h-3 absolute left-0 top-0 bg-blue-400" />
                <div className="w-2.5 h-2 absolute left-0 top-[13.33px] bg-blue-400/70" />
                <div className="w-2.5 h-3.5 absolute left-0 top-[23.33px] bg-blue-400/50" />
              </div>
              <div className="w-2.5 h-9 absolute left-[35px] top-[6.66px] overflow-hidden">
                <div className="w-2.5 h-1.5 absolute left-0 top-0 bg-blue-300" />
                <div className="w-2.5 h-2 absolute left-0 top-[8.33px] bg-blue-300/80" />
                <div className="w-2.5 h-2 absolute left-0 top-[18.33px] bg-blue-300/60" />
                <div className="w-2.5 h-2.5 absolute left-0 top-[27.50px] bg-blue-300/50" />
              </div>
            </div>
            {/* Text */}
            <div className="flex flex-col mt-[3px]">
              <div className="flex items-center">
                <span className="text-blue-500 text-3xl font-bold font-['Inter'] leading-8">Four</span>
                <span className="text-blue-300 text-3xl font-bold font-['Inter'] leading-8">Ban</span>
              </div>
              <div className="text-blue-200 text-[10px] font-medium font-['Inter'] leading-[10px] tracking-[0.08em] mt-[2px]">
                ORGANIZE • FLOW • DELIVER
              </div>
            </div>
          </div>

          {/* Titles */}
          <h2 className="text-neutral-950 text-[28px] font-medium font-['Inter'] leading-9 text-center">
            Welcome Back
          </h2>
          <p className="text-gray-500 text-base font-normal font-['Inter'] leading-6 mt-2 text-center">
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="mt-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium border border-red-100 mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-neutral-950 text-base font-medium font-['Inter'] leading-6">Email</label>
            <div className="h-12 px-4 py-3 bg-zinc-100 rounded-[10px] border border-black/10 flex items-center overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <input 
                type="email"
                required
                className="w-full bg-transparent outline-none text-neutral-950 text-base font-normal font-['Inter'] placeholder:text-neutral-950/50"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-10">
            <label className="text-neutral-950 text-base font-medium font-['Inter'] leading-6">Password</label>
            <div className="h-12 px-4 py-3 bg-zinc-100 rounded-[10px] border border-black/10 flex items-center overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <input 
                type="password"
                required
                className="w-full bg-transparent outline-none text-neutral-950 text-base font-normal font-['Inter'] placeholder:text-neutral-950/50"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white rounded-[10px] flex justify-center items-center text-base font-medium font-['Inter'] leading-6 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 flex justify-center items-center gap-1">
          <span className="text-gray-500 text-base font-normal font-['Inter'] leading-6">Don't have an account?</span>
          <Link href="/signup" className="text-blue-900 text-base font-medium font-['Inter'] leading-6 hover:underline">
            Sign up now
          </Link>
        </div>

      </div>
    </div>
  );
}