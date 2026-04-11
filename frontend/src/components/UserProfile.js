import React, { useState } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'

const UserProfile = ({ onProfileSaved, autoFill = false }) => {
  const { profile, loading, saving, saveProfile } = useUserProfile()
  const [formData, setFormData] = useState(profile)
  const [isOpen, setIsOpen] = useState(false)

  React.useEffect(() => {
    setFormData(profile)
  }, [profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await saveProfile(formData)
    if (success && onProfileSaved) {
      onProfileSaved(formData)
      setIsOpen(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const isProfileComplete = () => {
    return profile.firstName && profile.lastName && profile.email && profile.phone && 
           profile.dateOfBirth && profile.title && profile.gender
  }

  if (autoFill && isProfileComplete()) {
    return null
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-aman-stone-100 rounded-lg p-4">
        <div className="h-4 bg-aman-stone-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-aman-stone-200 rounded w-1/2"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-aman-stone-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-aman-stone-900">Passenger Information</h3>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-aman-gold-600 text-white rounded-md hover:bg-aman-gold-700 transition-colors text-sm"
          >
            {isProfileComplete() ? 'Edit Profile' : 'Complete Profile'}
          </button>
        )}
      </div>

      {!isOpen && isProfileComplete() && (
        <div className="space-y-2 text-sm text-aman-stone-600">
          <p><span className="font-medium">Name:</span> {profile.title} {profile.firstName} {profile.lastName}</p>
          <p><span className="font-medium">Email:</span> {profile.email}</p>
          <p><span className="font-medium">Phone:</span> {profile.phone}</p>
          <p><span className="font-medium">Date of Birth:</span> {profile.dateOfBirth}</p>
        </div>
      )}

      {(!isProfileComplete() || isOpen) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-aman-stone-700 mb-1">
                Title
              </label>
              <select
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-aman-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aman-gold-500 focus:border-aman-gold-500"
              >
                <option value="">Select title</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
                <option value="Prof">Prof</option>
              </select>
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-aman-stone-700 mb-1">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-aman-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aman-gold-500 focus:border-aman-gold-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-aman-stone-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-aman-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aman-gold-500 focus:border-aman-gold-500"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-aman-stone-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-aman-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aman-gold-500 focus:border-aman-gold-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-aman-stone-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-aman-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aman-gold-500 focus:border-aman-gold-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-aman-stone-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-aman-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aman-gold-500 focus:border-aman-gold-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-aman-stone-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-aman-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aman-gold-500 focus:border-aman-gold-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {isOpen && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-aman-stone-600 hover:text-aman-stone-800 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-aman-gold-600 text-white rounded-md hover:bg-aman-gold-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default UserProfile