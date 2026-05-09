"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({ activeChats: 0, converted: 0, aiResponses: 0 });

  useEffect(() => {
    // Check if user is authenticated via local storage token
    const token = localStorage.getItem("whatsappToken");
    
    if (!token) {
      toast.error("You must be logged in to view the dashboard");
      router.push("/sign-in");
    } else {
      fetchDashboardData();
    }
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      // For now, fetch all unread incoming messages as active chats
      const q = query(
        collection(db, "messages"),
        where("type", "==", "incoming"),
        where("status", "==", "unread")
      );
      const querySnapshot = await getDocs(q);
      
      // Count unique senders to get active chat count
      const uniqueSenders = new Set();
      querySnapshot.forEach((doc) => {
        uniqueSenders.add(doc.data().from);
      });

      setStats(prev => ({
        ...prev,
        activeChats: uniqueSenders.size
      }));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-bright">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bright">
      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 pt-28">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-display-sm text-on-surface">Dashboard</h1>
            <p className="text-body-lg text-on-surface-variant">Welcome back to your WhatsApp AI Sales Dashboard.</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem("whatsappToken");
              toast.success("Logged out successfully");
              router.push("/sign-in");
            }}
            className="px-6 py-2 bg-error/10 text-error font-bold rounded-xl hover:bg-error/20 transition-all"
          >
            Log Out
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">forum</span>
              </div>
              <h3 className="text-title-md font-bold">Active Chats</h3>
            </div>
            <p className="text-display-md text-on-surface">{stats.activeChats}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-success">done_all</span>
              </div>
              <h3 className="text-title-md font-bold">Leads Converted</h3>
            </div>
            <p className="text-display-md text-on-surface">{stats.converted}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container">settings_suggest</span>
              </div>
              <h3 className="text-title-md font-bold">AI Responses</h3>
            </div>
            <p className="text-display-md text-on-surface">{stats.aiResponses}</p>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-surface-variant rounded-full flex items-center justify-center mb-6 shadow-inner">
             <span className="material-symbols-outlined text-[40px] text-on-surface-variant">monitoring</span>
          </div>
          <h2 className="text-headline-sm font-bold mb-2">No active data yet</h2>
          <p className="text-body-md text-on-surface-variant max-w-md">
            Your WhatsApp AI is connected and ready. Data will appear here once customers start messaging your business number.
          </p>
        </div>
      </div>
    </div>
  );
}
