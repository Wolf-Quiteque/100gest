'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAGE_SIZE = 10;

export default function BilhetesPage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [bookings, setBookings] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyName, setCompanyName] = useState('Carregando...');
  const [companyId, setCompanyId] = useState(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanyAndBookings();
  }, [currentPage, selectedDate]);

  const fetchCompanyAndBookings = async () => {
    setLoading(true);
    try {
      // Get company_id from session metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado.');

      const companyId = user?.user_metadata?.company_id;
      if (!companyId) throw new Error('Empresa não encontrada.');

      setCompanyId(companyId);

      // Fetch company name
      const { data: companyData, error: companyError } = await supabase
        .from('bus_companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (companyError || !companyData) throw new Error('Erro ao carregar dados da empresa.');
      setCompanyName(companyData.name);

      // Fetch bookings for the company
      let query = supabase
        .from('bookings')
        .select('*, bus_routes(origin, destination)', { count: 'exact' })
        .eq('bus_routes.company_id', companyId);

      if (selectedDate) {
        query = query.eq('booking_date', selectedDate.toISOString().split('T')[0]);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
      setTotalBookings(count || 0);

      // Fetch counts for confirmed and pending bookings
      const { count: confirmed } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('bus_routes.company_id', companyId)
        .eq('booking_status', 'confirmed');

      const { count: pending } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('bus_routes.company_id', companyId)
        .eq('booking_status', 'pending');

      setConfirmedCount(confirmed || 0);
      setPendingCount(pending || 0);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar bilhetes',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setCurrentPage(1); // Reset pagination when date changes
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-600">
            Bilhetes - {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Confirmados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{confirmedCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-100 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Filtrar por Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateChange}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          </div>

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
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {booking.booking_status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span>
              Página {currentPage} de {Math.ceil(totalBookings / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage * PAGE_SIZE >= totalBookings}
            >
              Próxima
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}