-- Clean up any problematic auth triggers and functions
-- This ensures signup works without errors

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS handle_new_admin() CASCADE;

-- Verify no auth triggers are interfering
-- The only auth-related trigger should be the built-in Supabase ones
