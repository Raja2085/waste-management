-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticates users to read all public profiles (needed for search and messaging)
CREATE POLICY "Allow public read access to users"
ON users
FOR SELECT
TO authenticated
USING (true);

-- Ensure users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (auth.uid() = id);

-- Ensure users can only insert their own profile (usually handled by signup)
CREATE POLICY "Users can insert own profile"
ON users
FOR INSERT
WITH CHECK (auth.uid() = id);
