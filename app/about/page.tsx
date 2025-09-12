'use client'

import { useUser } from '@clerk/nextjs'
import { ArrowRight, Target, Zap, Shield, Users, BookOpen, FlaskConical } from 'lucide-react'

export default function AboutPage() {
  const { isSignedIn } = useUser()

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            About FireQSP
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            FireQSP is an AI-powered platform that extracts biological interactions from scientific literature 
            to accelerate Quantitative Systems Pharmacology (QSP) model development.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-12">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed">
                We democratize access to complex biomedical knowledge by transforming dense scientific literature 
                into structured, actionable data. Our platform enables researchers and pharmaceutical companies 
                to rapidly build comprehensive QSP models without spending months manually extracting interactions 
                from hundreds of papers.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">How FireQSP Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload PDFs</h3>
              <p className="text-gray-600">
                Upload scientific papers, review articles, or any biomedical literature in PDF format.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Extraction</h3>
              <p className="text-gray-600">
                Advanced AI models identify and extract biological interactions, mechanisms, and pathways.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FlaskConical className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Build Models</h3>
              <p className="text-gray-600">
                Select relevant interactions and export structured data for QSP model development.
              </p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Key Features</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <Shield className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">High Accuracy AI</h3>
                <p className="text-gray-600 text-sm">
                  State-of-the-art language models trained specifically for biomedical literature analysis.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Users className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Disease-Specific Models</h3>
                <p className="text-gray-600 text-sm">
                  Specialized extraction models for different therapeutic areas and disease contexts.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Target className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Interactive Selection</h3>
                <p className="text-gray-600 text-sm">
                  Review and curate extracted interactions with confidence scores and source references.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Zap className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Network Visualization</h3>
                <p className="text-gray-600 text-sm">
                  Generate interactive network diagrams to visualize biological pathways and interactions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Who Uses FireQSP</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Pharmaceutical Companies</h3>
              <p className="text-gray-700 mb-4">
                Accelerate drug discovery and development by rapidly building comprehensive QSP models 
                for target identification, mechanism understanding, and clinical trial design.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Target validation and mechanism elucidation</li>
                <li>• Biomarker identification and pathway analysis</li>
                <li>• Competitive intelligence and literature monitoring</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Academic Researchers</h3>
              <p className="text-gray-700 mb-4">
                Focus on hypothesis generation and experimental design rather than spending months 
                on manual literature review and data extraction.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Systematic literature reviews and meta-analyses</li>
                <li>• Grant writing and research proposal development</li>
                <li>• Cross-disciplinary collaboration and knowledge sharing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Technology Stack</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">AI & Machine Learning</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Advanced language models (GPT-4)</li>
                <li>• Biomedical entity recognition</li>
                <li>• Relationship extraction algorithms</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Data Processing</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• PDF text extraction and parsing</li>
                <li>• Multi-document batch processing</li>
                <li>• Structured data normalization</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Platform</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Cloud-native architecture</li>
                <li>• Real-time processing pipeline</li>
                <li>• Enterprise-grade security</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-semibold mb-4">Ready to Accelerate Your Research?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Join researchers and pharmaceutical companies who are already using FireQSP to transform 
            how they build QSP models and understand biological systems.
          </p>
          
          {isSignedIn ? (
            <a
              href="/dashboard"
              className="inline-flex items-center bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          ) : (
            <a
              href="/sign-up"
              className="inline-flex items-center bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}