'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const DashboardPage = () => {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('Carregando...');
  const [totalBuses, setTotalBuses] = useState(0);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [bookingStatusData, setBookingStatusData] = useState([]);
  const [routePassengerData, setRoutePassengerData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyAndStatistics();
  }, []);

  const fetchCompanyAndStatistics = async () => {
    setLoading(true);
    try {
      // Get company_id from session metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado.');

      const companyId = user?.user_metadata?.company_id;
      if (!companyId) throw new Error('Empresa não encontrada.');

      // Fetch company name
      const { data: companyData, error: companyError } = await supabase
        .from('bus_companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (companyError || !companyData) throw new Error('Erro ao carregar dados da empresa.');
      setCompanyName(companyData.name);

      // Fetch total buses
      const { count: busesCount } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      setTotalBuses(busesCount || 0);

      // Fetch total routes
      const { count: routesCount } = await supabase
        .from('bus_routes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      setTotalRoutes(routesCount || 0);

      // Fetch total checkins
      const { count: checkinsCount } = await supabase
        .from('passenger_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      setTotalCheckins(checkinsCount || 0);

      // Fetch total bookings
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('bus_routes.company_id', companyId);

      setTotalBookings(bookingsCount || 0);

      // Fetch booking status data
      const { data: bookingsStatus, error: bookingStatusError } = await supabase
        .from('bookings')
        .select('booking_status, count')
        .eq('bus_routes.company_id', companyId)
        .select(`
          booking_status,
          count(*) as count
        `)
        .group_by('booking_status');

      setBookingStatusData(
        bookingsStatus?.map((status) => ({
          name: status.booking_status === 'confirmed' ? 'Confirmados' : status.booking_status === 'pending' ? 'Pendentes' : 'Cancelados',
          value: status.count,
        })) || []
      );

        // Fetch route passenger data
        const { data: routePassengers, error: routePassengersError } = await supabase
          .from('passenger_checkins')
          .select(`
            route,
            count(*) as count
          `)
          .eq('company_id', companyId)
          .group_by('route');

      setRoutePassengerData(
        routePassengers?.map((route) => ({
          name: route.route,
          passageiros: route.count,
        })) || []
      );
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };


  // Colors for pie chart
  const COLORS = ['#FFA500', '#FFD700', '#FF6347'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-600 text-2xl">
            Dashboard - {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Ônibus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalBuses}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Rotas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalRoutes}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalCheckins}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalBookings}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-orange-100">
              <CardHeader>
                <CardTitle className="text-orange-600">Status das Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={bookingStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      label
                    >
                      {bookingStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-orange-100">
              <CardHeader>
                <CardTitle className="text-orange-600">Passageiros por Rota</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={routePassengerData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="passageiros" fill="#FFA500" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;