"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Send data to your Register API
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // 2. If account creation is successful, redirect to login page
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F5FEFF] to-[#AAC0E1] font-sans text-black py-4">
      <div className="w-full max-w-[448px] bg-white rounded-2xl shadow-xl px-[32px] py-[32px] relative mx-4">
        
        {/* Header Section */}
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-[4px] mb-[16px]">
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
            Create New Account
          </h2>
          <p className="text-gray-500 text-base font-normal font-['Inter'] leading-6 mt-1 text-center">
            Start managing your tasks better
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSignUp} className="mt-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-[10px] text-sm text-center font-medium border border-red-100 mb-3">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-neutral-950 text-sm font-medium font-['Inter']">Full Name</label>
            <div className="h-11 px-4 py-3 bg-zinc-100 rounded-[10px] border border-black/10 flex items-center overflow-hidden focus-within:border-[#0E2F76] focus-within:ring-1 focus-within:ring-[#0E2F76] transition-all">
              <input 
                type="text"
                required
                className="w-full bg-transparent outline-none text-neutral-950 text-sm font-normal font-['Inter'] placeholder:text-neutral-950/50"
                placeholder="Enter full name"
                value={formData.nama_lengkap}
                onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-neutral-950 text-sm font-medium font-['Inter']">Username</label>
            <div className="h-11 px-4 py-3 bg-zinc-100 rounded-[10px] border border-black/10 flex items-center overflow-hidden focus-within:border-[#0E2F76] focus-within:ring-1 focus-within:ring-[#0E2F76] transition-all">
              <input 
                type="text"
                required
                className="w-full bg-transparent outline-none text-neutral-950 text-sm font-normal font-['Inter'] placeholder:text-neutral-950/50"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-neutral-950 text-sm font-medium font-['Inter']">Email</label>
            <div className="h-11 px-4 py-3 bg-zinc-100 rounded-[10px] border border-black/10 flex items-center overflow-hidden focus-within:border-[#0E2F76] focus-within:ring-1 focus-within:ring-[#0E2F76] transition-all">
              <input 
                type="email"
                required
                className="w-full bg-transparent outline-none text-neutral-950 text-sm font-normal font-['Inter'] placeholder:text-neutral-950/50"
                placeholder="name@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-6">
            <label className="text-neutral-950 text-sm font-medium font-['Inter']">Password</label>
            <div className="h-11 px-4 py-3 bg-zinc-100 rounded-[10px] border border-black/10 flex items-center overflow-hidden focus-within:border-[#0E2F76] focus-within:ring-1 focus-within:ring-[#0E2F76] transition-all">
              <input 
                type="password"
                required
                className="w-full bg-transparent outline-none text-neutral-950 text-sm font-normal font-['Inter'] placeholder:text-neutral-950/50"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#0E2F76] hover:bg-blue-900 text-white rounded-[10px] flex justify-center items-center text-sm font-medium font-['Inter'] transition-colors disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Sign Up Now"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-5 flex justify-center items-center gap-1">
          <span className="text-gray-500 text-sm font-normal font-['Inter']">Already have an account?</span>
          <Link href="/login" className="text-[#0E2F76] text-sm font-medium font-['Inter'] hover:underline">
            Sign in here
          </Link>
        </div>

      </div>
    </div>
  );
}