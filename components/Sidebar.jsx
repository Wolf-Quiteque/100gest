'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Home,
  Ticket,
  Route,
  Bus,
  Users,
  Wallet,
  QrCode,
  Car,
  Power,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoutUser } from '@/lib/supabase/queries';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function Sidebar() {
  const [isWide, setIsWide] = useState(false);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Format user name
          const nameParts = user.user_metadata?.name?.split(' ') || [];
          const formattedName = nameParts.length > 1 
            ? `${nameParts[0]} ${nameParts[1][0]}.`
            : nameParts[0] || '';
          setUserName(formattedName.replace(/\b\w/g, c => c.toUpperCase()));

          // Fetch company name
          const { data: company } = await supabase
            .from('bus_companies')
            .select('name')
            .eq('id', user.user_metadata?.company_id)
            .single();

          setCompanyName(company?.name || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const toggleSidebar = () => setIsWide(!isWide);

  const menuItems = [
    { title: 'Home', icon: <Home className="h-5 w-5" />, path: '/dashboard' },
    { title: 'Bilhetes', icon: <Ticket className="h-5 w-5" />, path: '/bilhetes' },
    { title: 'Rotas', icon: <Route className="h-5 w-5" />, path: '/rotas' },
    { title: 'Carros', icon: <Bus className="h-5 w-5" />, path: '/carros' },
    { title: 'Funcionários', icon: <Users className="h-5 w-5" />, path: '/funcionarios' },
    { title: 'Finanças', icon: <Wallet className="h-5 w-5" />, path: '/financas' },
    { title: 'Leitor', icon: <QrCode className="h-5 w-5" />, path: '/leitor' },
    { title: 'Leitor Carro', icon: <Car className="h-5 w-5" />, path: '/leitor-carro' },
  ];

  return (
    <div className={`h-screen bg-orange-600 text-white transition-all duration-300 ${isWide ? 'w-64' : 'w-20'}`}  onMouseEnter={()=>{
      setIsWide(true)
    }}

    onMouseLeave={()=>{
      setIsWide(false)
    }}

  
>


      <div className="flex items-center justify-between p-4">
        <div className={`flex flex-col ${isWide ? 'block' : 'hidden'}`}>
          <h1 className="text-xl font-bold">100 D-Gest</h1>
          {companyName && <span className="text-sm opacity-75">{companyName}</span>}
        </div>
        <h1 className={`text-xl font-bold ${isWide ? 'hidden' : 'block'}`}>100</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="text-white hover:bg-orange-700"
        >
          {isWide ? '«' : '»'}
        </Button>
      </div>

      {/* User Profile */}
      <div className={`flex items-center p-4 border-b border-orange-500 ${isWide ? 'px-4' : 'justify-center'}`}>
        <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center mr-2">
          <span className="text-orange-600 font-bold text-sm">
            {userName.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div className={`${isWide ? 'block' : 'hidden'}`}>
          <p className="font-medium">{userName}</p>
        </div>
      </div>

      <nav className="mt-4">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
       
              <Link href={item.path}
             
                className={`flex items-center p-3 transition-colors duration-200 ${
                  pathname === item.path ? 'bg-orange-700' : 'hover:bg-orange-700'
                } ${isWide ? 'px-4' : 'justify-center'}`}
              >
                {item.icon}
                <span className={`ml-2 ${isWide ? 'block' : 'hidden'}`}>
                  {item.title}
                </span>
              </Link>
            </li>
          ))}

          <li>
            <button
              onClick={logoutUser}
              className={`w-full flex items-center p-3 hover:bg-orange-700 transition-colors duration-200 ${
                isWide ? 'px-4' : 'justify-center'
              }`}
            >
              <Power className="h-5 w-5" />
              <span className={`ml-2 ${isWide ? 'block' : 'hidden'}`}>
                Terminar Sessão
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}