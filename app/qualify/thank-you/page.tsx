import Link from 'next/link'

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-xs font-bold tracking-widest text-emerald-700 mb-3">NUMAT and SEAD</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank you</h1>
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Your inquiry has been submitted. The team will review your details and get back to you shortly.
        </p>
        <Link href="https://numat.ph" className="text-sm text-emerald-700 hover:text-emerald-800 underline">
          Return to numat.ph
        </Link>
      </div>
    </div>
  )
}
