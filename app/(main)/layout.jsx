'use client'
import { getUserSession } from "@/lib/supabase/useSession";
import Sidebar from '@/components/Sidebar';
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
export default function MainLayout({ children }) {
  const router = useRouter()
  const [session,setSession] = useState("")


  const Getsession = async ()=>{
   
    const sessionData = await getUserSession();
  
    if (!sessionData) router.push("/")
      else setSession(sessionData)
  }

  useEffect(() => {
    Getsession()
  }, []);
  
  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto h-screen" >{children}</main>
    </div>
  )
}