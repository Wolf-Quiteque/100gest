import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const getUserSession = async () => {
  const supabase = createClientComponentClient();

  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();

    // If no session exists, return null
    if (!session) return null;

    // Fetch additional user metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error fetching user:', userError);
      return null;
    }

    // Extract metadata from the user object
    const metadata = user?.user_metadata || {};

    // Return combined session and user information
    return {
      session,
      user: {
        id: user?.id,
        email: user?.email,
        metadata: {
          name: metadata.name, // Name from metadata
          role: metadata.role, // Role from metadata
          company_id: metadata.company_id, // Company ID from metadata
        },
      },
    };
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};