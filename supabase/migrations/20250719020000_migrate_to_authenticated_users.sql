-- Migration to support authenticated users instead of device IDs
-- Add user_id column and make it the primary key

-- Add user_id column with foreign key to auth.users
ALTER TABLE user_profiles 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the old primary key constraint on device_id first
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_pkey;

-- Now make device_id optional (for backward compatibility during transition)
ALTER TABLE user_profiles 
ALTER COLUMN device_id DROP NOT NULL;

-- Create unique index on user_id
CREATE UNIQUE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Create a new unique constraint on device_id (for existing records)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_device_id_unique UNIQUE (device_id);

-- Add constraint to ensure either device_id OR user_id is present (but not both null)
ALTER TABLE user_profiles 
ADD CONSTRAINT check_id_present CHECK (
  (device_id IS NOT NULL AND user_id IS NULL) OR 
  (device_id IS NULL AND user_id IS NOT NULL)
);

-- Add RLS (Row Level Security) policies for authenticated users
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);