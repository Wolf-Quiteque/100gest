
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();


function clearSessionData() {
  // Clear all cookies
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }

  // Clear localStorage
  localStorage.clear();

  // Clear sessionStorage
  sessionStorage.clear();
}


export async function logoutUser() {
    const { error } = await supabase.auth.signOut();
       clearSessionData();
  
    window.location.reload("/");
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }