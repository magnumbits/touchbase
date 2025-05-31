"use client";

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-orange-200 flex flex-col items-center justify-center p-4 font-sans">
      <main className="flex flex-col items-center justify-center text-center w-full flex-grow">
        {/* Hero Section */}
        <section className="w-full max-w-4xl py-16 md:py-24 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-orange-700">
            Touchbase
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-orange-600 max-w-2xl mx-auto">
            AI-Powered Voice Calls to Rekindle Old Friendships.
          </p>
          <p className="mt-8 text-lg text-gray-700 max-w-xl mx-auto">
            Thinking of old friends but dread the awkward first reach-out? Touchbase takes the stress out of reconnecting. Our AI, using your voice, makes the initial contact, shares warm memories, and even helps schedule a proper chat. Rekindle those connections, effortlessly.
          </p>
          <Link href="/clone-voice" 
            className="mt-10 inline-block px-8 py-4 bg-orange-500 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-orange-600 transition duration-300 transform hover:scale-105">
            Get Started
          </Link>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-16 md:py-24 bg-white/70 backdrop-blur-md rounded-xl shadow-lg mt-12 animate-fade-in">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-orange-700 text-center">
              How Touchbase Works
            </h2>
            <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
              Reconnect in just three simple steps.
            </p>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="flex flex-col items-center p-6 bg-orange-50 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
                <div className="text-5xl mb-4">🎙️</div>
                <h3 className="text-xl font-semibold text-orange-700 mb-2">1. Perfect Your Voice Clone</h3>
                <p className="text-gray-600 text-center">
                  A quick recording is all it takes. Our AI crafts a voice that's naturally you, ready to make the first move.
                </p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center p-6 bg-orange-50 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
                <div className="text-5xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-orange-700 mb-2">2. Detail Your Friendship</h3>
                <p className="text-gray-600 text-center">
                  Share key memories, how you know your friend, and context about your last interaction. This helps our AI craft a truly personal call.
                </p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center p-6 bg-orange-50 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-orange-700 mb-2">3. AI Connects & You Reconnect</h3>
                <p className="text-gray-600 text-center">
                  Our AI calls your friend using your voice and the context provided, has an uncanny chat, and schedules a longer call for you. Review the AI's call summary, then reconnect with your friend at the scheduled time!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full text-center py-8 mt-10 text-sm text-orange-600 opacity-80">
        Touchbase.fun &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
