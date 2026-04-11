-- Create user_profiles table for storing user information
CREATE TABLE user_profiles (
  device_id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  title TEXT,
  gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Create an index on created_at for chronological queries
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);