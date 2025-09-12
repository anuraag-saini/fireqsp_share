'use client'

import { Clock, BookOpen, MessageSquare, Mail, Phone } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="bg-green-100 rounded-full p-6 w-24 h-24 mx-auto mb-8 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Help & Support
          </h1>
          
          <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Clock className="h-4 w-4 mr-2" />
            Coming Soon
          </div>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            We're building a comprehensive help center with documentation, tutorials, 
            and support resources to help you get the most out of FireQSP.
          </p>
        </div>

        {/* What's Coming */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">What's Coming</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="bg-blue-100 rounded-full p-3 w-12 h-12 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
                <p className="text-gray-600 text-sm">
                  Comprehensive guides covering all platform features, from basic PDF upload 
                  to advanced interaction analysis and export options.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="bg-purple-100 rounded-full p-3 w-12 h-12 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Tutorials</h3>
                <p className="text-gray-600 text-sm">
                  Step-by-step video guides showing how to extract interactions, 
                  interpret confidence scores, and build QSP models.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="bg-green-100 rounded-full p-3 w-12 h-12 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">FAQ Database</h3>
                <p className="text-gray-600 text-sm">
                  Answers to commonly asked questions about AI extraction accuracy, 
                  data export formats, and platform limitations.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="bg-orange-100 rounded-full p-3 w-12 h-12 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Support</h3>
                <p className="text-gray-600 text-sm">
                  Direct access to our support team for technical questions 
                  and personalized assistance with your research projects.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Temporary Support */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Need Help Now?</h2>
          
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              While we're building our comprehensive help center, you can reach out to us directly 
              for any questions or technical support.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@fireqsp.com"
                className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Mail className="h-5 w-5 mr-2" />
                Email Support
              </a>
              
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Try the Platform
              </a>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-semibold mb-4 text-center">Quick Tips to Get Started</h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white bg-opacity-90 rounded-lg p-4 text-gray-800">
              <h3 className="font-semibold mb-2 text-gray-900">Best PDF Formats</h3>
              <p className="text-gray-700 text-sm">
                Text-based PDFs work best. Scanned documents may have lower extraction accuracy.
              </p>
            </div>
            
            <div className="bg-white bg-opacity-90 rounded-lg p-4 text-gray-800">
              <h3 className="font-semibold mb-2 text-gray-900">Review Interactions</h3>
              <p className="text-gray-700 text-sm">
                Always review extracted interactions and confidence scores before using in models.
              </p>
            </div>
            
            <div className="bg-white bg-opacity-90 rounded-lg p-4 text-gray-800">
              <h3 className="font-semibold mb-2 text-gray-900">Multiple Files</h3>
              <p className="text-gray-700 text-sm">
                Upload multiple related papers for more comprehensive interaction networks.
              </p>
            </div>
            
            <div className="bg-white bg-opacity-90 rounded-lg p-4 text-gray-800">
              <h3 className="font-semibold mb-2 text-gray-900">Export Options</h3>
              <p className="text-gray-700 text-sm">
                Use the network diagram view to visualize interactions before building models.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}