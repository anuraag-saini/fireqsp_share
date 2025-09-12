'use client'

import { Clock, Users, MessageCircle, Heart } from 'lucide-react'

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="bg-blue-100 rounded-full p-6 w-24 h-24 mx-auto mb-8 flex items-center justify-center">
            <Users className="h-12 w-12 text-blue-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Community Hub
          </h1>
          
          <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Clock className="h-4 w-4 mr-2" />
            Coming Soon
          </div>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            We're building an amazing community space where QSP researchers, pharmaceutical 
            scientists, and biomedical professionals can connect, share insights, and collaborate.
          </p>
        </div>

        {/* What's Coming */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">What's Coming</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Discussion Forums</h3>
              <p className="text-gray-600 text-sm">
                Share your research findings, ask questions, and discuss QSP modeling challenges with peers.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expert Network</h3>
              <p className="text-gray-600 text-sm">
                Connect with leading researchers and industry experts in quantitative pharmacology.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Collaborative Projects</h3>
              <p className="text-gray-600 text-sm">
                Join forces on research projects and share validated interaction datasets.
              </p>
            </div>
          </div>
        </div>

        {/* Notify Me */}
        {/* <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-semibold mb-4">Be the First to Know</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Want to be notified when our community features launch? We'll send you an update 
            when the community hub goes live.
          </p>
          
          <div className="max-w-md mx-auto flex gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 border border-white border-opacity-20"
            />
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap">
              Notify Me
            </button>
          </div>
        </div> */}
      </div>
    </div>
  )
}