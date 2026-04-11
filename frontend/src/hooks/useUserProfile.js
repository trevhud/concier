import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useUserProfile = () => {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    title: '',
    gender: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      loadProfile()
    }
  }, [user, authLoading])

  const loadProfile = async () => {
    try {
      setLoading(true)
      
      // If user is not authenticated, clear profile and return
      if (!user) {
        setProfile({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          title: '',
          gender: ''
        })
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading profile:', error)
        setLoading(false)
        return
      }

      if (data) {
        setProfile({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          dateOfBirth: data.date_of_birth || '',
          title: data.title || '',
          gender: data.gender || ''
        })
      } else {
        // Pre-fill email from auth if available
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
        }))
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async (profileData) => {
    try {
      setSaving(true)
      
      if (!user) {
        console.error('Cannot save profile: user not authenticated')
        return false
      }
      
      const profileToSave = {
        user_id: user.id,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        date_of_birth: profileData.dateOfBirth,
        title: profileData.title,
        gender: profileData.gender,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profileToSave, { 
          onConflict: 'user_id',
          returning: 'minimal'
        })

      if (error) {
        console.error('Error saving profile:', error)
        return false
      }

      setProfile(profileData)
      return true
    } catch (error) {
      console.error('Error saving profile:', error)
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (updates) => {
    const newProfile = { ...profile, ...updates }
    setProfile(newProfile)
    saveProfile(newProfile)
  }

  return {
    profile,
    loading,
    saving,
    saveProfile,
    updateProfile,
    loadProfile,
    isAuthenticated: !!user,
    user
  }
}