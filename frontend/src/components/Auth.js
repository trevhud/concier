import React, { useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { XMarkIcon } from '@heroicons/react/24/outline'

const AuthComponent = ({ onClose, title = "Sign in to save your profile" }) => {
  const { user } = useAuth()
  const [view, setView] = useState('sign_in')

  // If user is already signed in, show success message
  if (user) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-aman-stone-800 mb-2">
            Welcome back, {user.user_metadata?.full_name || user.email}!
          </h3>
          <p className="text-aman-stone-600 mb-4">
            You're signed in and your profile will be saved for future bookings.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-aman-stone-700 text-white rounded-lg hover:bg-aman-stone-800 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-serif font-semibold text-aman-stone-800 mb-2">
          {title}
        </h2>
        <p className="text-aman-stone-600 text-sm">
          Sign in to save your travel preferences and booking information for faster checkout next time.
        </p>
      </div>

      {/* Auth UI */}
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#78716c', // aman-stone-500
                brandAccent: '#57534e', // aman-stone-600
                brandButtonText: 'white',
                defaultButtonBackground: '#f5f5f4', // aman-stone-100
                defaultButtonBackgroundHover: '#e7e5e4', // aman-stone-200
                defaultButtonBorder: '#d6d3d1', // aman-stone-300
                defaultButtonText: '#44403c', // aman-stone-700
                dividerBackground: '#d6d3d1', // aman-stone-300
                inputBackground: 'white',
                inputBorder: '#d6d3d1', // aman-stone-300
                inputBorderHover: '#a8a29e', // aman-stone-400
                inputBorderFocus: '#78716c', // aman-stone-500
                inputText: '#1c1917', // aman-stone-900
                inputLabelText: '#57534e', // aman-stone-600
                inputPlaceholder: '#a8a29e', // aman-stone-400
                messageText: '#dc2626', // red-600
                messageTextDanger: '#dc2626', // red-600
                anchorTextColor: '#78716c', // aman-stone-500
                anchorTextHoverColor: '#57534e', // aman-stone-600
              },
              space: {
                spaceSmall: '4px',
                spaceMedium: '8px',
                spaceLarge: '16px',
                labelBottomMargin: '8px',
                anchorBottomMargin: '4px',
                emailInputSpacing: '4px',
                socialAuthSpacing: '4px',
                buttonPadding: '10px 15px',
                inputPadding: '10px 15px',
              },
              fontSizes: {
                baseBodySize: '13px',
                baseInputSize: '14px',
                baseLabelSize: '14px',
                baseButtonSize: '14px',
              },
              borderWidths: {
                buttonBorderWidth: '1px',
                inputBorderWidth: '1px',
              },
              radii: {
                borderRadiusButton: '6px',
                buttonBorderRadius: '6px',
                inputBorderRadius: '6px',
              },
            },
          },
          className: {
            anchor: 'text-aman-stone-500 hover:text-aman-stone-600',
            button: 'transition-all duration-200 hover:scale-[1.02]',
            container: 'space-y-4',
            divider: 'my-4',
            input: 'transition-all duration-200 focus:ring-2 focus:ring-aman-stone-500 focus:ring-opacity-20',
            label: 'font-medium',
            loader: 'border-aman-stone-500',
            message: 'text-sm',
          },
        }}
        providers={['google']}
        redirectTo={window.location.origin}
        onlyThirdPartyProviders={false}
        magicLink={true}
        showLinks={true}
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email address',
              password_label: 'Password',
              button_label: 'Sign in',
              loading_button_label: 'Signing in...',
              social_provider_text: 'Continue with {{provider}}',
              link_text: "Don't have an account? Sign up",
              confirmation_text: 'Check your email for the confirmation link',
            },
            sign_up: {
              email_label: 'Email address',
              password_label: 'Create a password',
              button_label: 'Sign up',
              loading_button_label: 'Signing up...',
              social_provider_text: 'Continue with {{provider}}',
              link_text: 'Already have an account? Sign in',
              confirmation_text: 'Check your email for the confirmation link',
            },
            magic_link: {
              email_input_label: 'Email address',
              button_label: 'Send magic link',
              loading_button_label: 'Sending magic link...',
              link_text: 'Send a magic link email',
              confirmation_text: 'Check your email for the magic link',
            },
          },
        }}
      />

      {/* Close button */}
      <div className="mt-6 text-center">
        <button
          onClick={onClose}
          className="text-aman-stone-500 hover:text-aman-stone-700 text-sm transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

export default AuthComponent