-- Migration: Fix auth trigger that causes signup 500 error
-- Issue: The on_auth_user_created_admin trigger was trying to auto-create admin profiles
-- for all new users, which was causing 500 errors during signup
-- Solution: Remove the trigger and update the function to be a no-op

-- Drop the problematic trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;

-- Update the function to be a no-op (do nothing)
CREATE OR REPLACE FUNCTION handle_new_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Disabled: Do not auto-create admin profiles for new users
  -- Admin accounts must be manually created by super admins
  RETURN NEW;
END;
$$;

-- Log the fix
-- SELECT 'Auth trigger disabled successfully' as status;
