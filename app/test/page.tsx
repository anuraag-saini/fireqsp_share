'use client'

export default function TestPage() {
  const testProcessing = async () => {
    const response = await fetch('/api/test-processing', { method: 'POST' })
    const result = await response.json()
    console.log('Test result:', result)
    alert(JSON.stringify(result, null, 2))
  }

  return (
    <div className="p-8">
      <h1>Railway Test Page</h1>
      <button 
        onClick={testProcessing}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Test Background Processing
      </button>
    </div>
  )
}