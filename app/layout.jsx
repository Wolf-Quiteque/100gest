"use client"
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getUserSession } from "@/lib/supabase/useSession";

import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";

import { Toaster } from "@/components/ui/toaster"



export default function RootLayout({ children }) {
  const router = useRouter()





  return (
    <html lang="en">
      <body
      
      >
        {children} <Toaster />
      </body>
    </html>
  );
}
