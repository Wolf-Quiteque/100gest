'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileSpreadsheet, FilesIcon } from 'lucide-react';

const FinancasPage = () => {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('Carregando...');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [cancelledRevenue, setCancelledRevenue] = useState(0);
  const [revenueByRoute, setRevenueByRoute] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchCompanyAndFinancialData();
  }, [currentPage, itemsPerPage]);

  
  const fetchCompanyAndFinancialData = async () => {
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

      // Fetch total revenue (confirmed bookings)
      const { data: confirmedRevenue } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('bus_routes.company_id', companyId)
        .eq('booking_status', 'confirmed');

      const totalConfirmed = confirmedRevenue?.reduce((sum, booking) => sum + booking.total_price, 0) || 0;
      setTotalRevenue(totalConfirmed);

      // Fetch pending revenue
      const { data: pendingRevenueData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('bus_routes.company_id', companyId)
        .eq('booking_status', 'pending');

      const totalPending = pendingRevenueData?.reduce((sum, booking) => sum + booking.total_price, 0) || 0;
      setPendingRevenue(totalPending);

      // Fetch cancelled revenue
      const { data: cancelledRevenueData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('bus_routes.company_id', companyId)
        .eq('booking_status', 'cancelled');

      const totalCancelled = cancelledRevenueData?.reduce((sum, booking) => sum + booking.total_price, 0) || 0;
      setCancelledRevenue(totalCancelled);

      // Fetch revenue by route
      const { data: revenueByRouteData } = await supabase
        .from('bookings')
        .select('bus_routes(origin, destination), total_price')
        .eq('bus_routes.company_id', companyId)
        .eq('booking_status', 'confirmed');

      const revenueByRouteMap = revenueByRouteData?.reduce((acc, booking) => {
        const route = `${booking.bus_routes?.origin} → ${booking.bus_routes?.destination}`;
        acc[route] = (acc[route] || 0) + booking.total_price;
        return acc;
      }, {});

      setRevenueByRoute(
        Object.entries(revenueByRouteMap || {}).map(([route, revenue]) => ({
          rota: route,
          receita: revenue,
        }))
      );

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: bookingsData, count } = await supabase
        .from('bookings')
        .select('*, bus_routes(origin, destination)', { count: 'exact' })
        .eq('bus_routes.company_id', companyId)
        .order('created_at', { ascending: false })
        .range(from, to);

      setBookings(bookingsData || []);
      setTotalItems(count || 0);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados financeiros',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };


  const exportToExcel = () => {
    // Implementation would use a library like xlsx
    toast({
      title: 'Exportando para Excel',
      description: 'Seu arquivo será baixado em instantes.',
    });
  };

  const exportToPDF = () => {
    // Implementation would use a library like jspdf
    toast({
      title: 'Exportando para PDF',
      description: 'Seu arquivo será baixado em instantes.',
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-600 text-2xl">
            Finanças - {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Receita Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'AOA',
                  }).format(totalRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Receita Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'AOA',
                  }).format(pendingRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Receita Cancelada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'AOA',
                  }).format(cancelledRevenue)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-orange-100">
              <CardHeader>
                <CardTitle className="text-orange-600">Receita por Rota</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueByRoute}>
                    <XAxis dataKey="rota" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="receita" fill="#FFA500" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

        
        </CardContent>
      </Card>
            <Card className="border-orange-100">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-orange-600">Reservas</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-green-50 text-green-600 hover:bg-green-100"
                onClick={exportToExcel}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                className="bg-red-50 text-red-600 hover:bg-red-100"
                onClick={exportToPDF}
              >
                <FilesIcon className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-50">
                  <TableHead className="text-orange-600">Data</TableHead>
                  <TableHead className="text-orange-600">Rota</TableHead>
                  <TableHead className="text-orange-600">Passageiros</TableHead>
                  <TableHead className="text-orange-600">Preço Total</TableHead>
                  <TableHead className="text-orange-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {new Date(booking.booking_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {booking.bus_routes?.origin} → {booking.bus_routes?.destination}
                    </TableCell>
                    <TableCell>{booking.total_passengers}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'AOA',
                      }).format(booking.total_price)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${
                          booking.booking_status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : booking.booking_status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {booking.booking_status === 'confirmed'
                          ? 'Confirmado'
                          : booking.booking_status === 'pending'
                          ? 'Pendente'
                          : 'Cancelado'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">Itens por página:</p>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Última
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default FinancasPage;