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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash, Plus, Filter } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 10;

export default function RotasPage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [routes, setRoutes] = useState([]);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyName, setCompanyName] = useState('Carregando...');
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteRouteId, setDeleteRouteId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    origin: '',
    destination: '',
    departure_time: '',
    arrival_time: '',
    duration: '',
    base_price: '',
    total_seats: '',
    urbano: false,
  });

  // Filters
  const [filterUrbano, setFilterUrbano] = useState('all'); // 'all', 'urbano', 'interprovincial'
  const [filterOrigem, setFilterOrigem] = useState('');
  const [filterPartida, setFilterPartida] = useState('');

  useEffect(() => {
    fetchCompanyAndRoutes();
  }, [currentPage, filterUrbano, filterOrigem, filterPartida]);

  const fetchCompanyAndRoutes = async () => {
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

      // Fetch routes for the company with filters
      let query = supabase
        .from('bus_routes')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Apply urbano filter
      if (filterUrbano === 'urbano') {
        query = query.eq('urbano', true);
      } else if (filterUrbano === 'interprovincial') {
        query = query.eq('urbano', false);
      }

      // Apply origem filter
      if (filterOrigem) {
        query = query.ilike('origin', `%${filterOrigem}%`);
      }

      // Apply partida filter
      if (filterPartida) {
        query = query.ilike('departure_time', `%${filterPartida}%`);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRoutes(data || []);
      setTotalRoutes(count || 0);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar rotas',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bus_routes')
        .delete()
        .eq('id', deleteRouteId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Rota deletada com sucesso.',
        className: 'bg-orange-100 border-orange-300 text-orange-700',
      });

      setDeleteRouteId(null);
      setIsDeleteDialogOpen(false);
      fetchCompanyAndRoutes();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar rota',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bus_routes')
        .insert([
          {
            ...newRoute,
            company_id: companyId,
            base_price: parseFloat(newRoute.base_price),
            total_seats: parseInt(newRoute.total_seats),
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Rota adicionada com sucesso.',
        className: 'bg-orange-100 border-orange-300 text-orange-700',
      });

      setNewRoute({
        origin: '',
        destination: '',
        departure_time: '',
        arrival_time: '',
        duration: '',
        base_price: '',
        total_seats: '',
        urbano: false,
      });
      setIsAddDialogOpen(false);
      fetchCompanyAndRoutes();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar rota',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-600">
            Rotas - {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Rota
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Tipo de Rota</Label>
              <Select value={filterUrbano} onValueChange={setFilterUrbano}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="urbano">Urbano</SelectItem>
                  <SelectItem value="interprovincial">Interprovincial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Input
                placeholder="Filtrar por origem"
                value={filterOrigem}
                onChange={(e) => setFilterOrigem(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Partida</Label>
              <Input
                type="time"
                placeholder="Filtrar por partida"
                value={filterPartida}
                onChange={(e) => setFilterPartida(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50">
                <TableHead className="text-orange-600">Origem</TableHead>
                <TableHead className="text-orange-600">Destino</TableHead>
                <TableHead className="text-orange-600">Partida</TableHead>
                <TableHead className="text-orange-600">Chegada</TableHead>
                <TableHead className="text-orange-600">Duração</TableHead>
                <TableHead className="text-orange-600">Preço Base</TableHead>
                <TableHead className="text-orange-600">Assentos</TableHead>
                <TableHead className="text-orange-600">Urbano</TableHead>
                <TableHead className="text-orange-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell>{route.origin}</TableCell>
                  <TableCell>{route.destination}</TableCell>
                  <TableCell>{route.departure_time}</TableCell>
                  <TableCell>{route.arrival_time}</TableCell>
                  <TableCell>{route.duration}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'AOA',
                    }).format(route.base_price)}
                  </TableCell>
                  <TableCell>{route.total_seats}</TableCell>
                  <TableCell>{route.urbano ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-orange-600 hover:bg-orange-100"
                      onClick={() => {
                        // Implement edit functionality here
                        toast({
                          title: 'Editar Rota',
                          description: 'Funcionalidade de edição em desenvolvimento.',
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-100"
                      onClick={() => {
                        setDeleteRouteId(route.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
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
              Página {currentPage} de {Math.ceil(totalRoutes / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage * PAGE_SIZE >= totalRoutes}
            >
              Próxima
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Route Dialog */}
      <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Nova Rota</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleAddRoute} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Origem */}
              <div className="space-y-2">
                <Label>Origem</Label>
                <Input
                  value={newRoute.origin}
                  onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value })}
                  required
                />
              </div>

              {/* Destino */}
              <div className="space-y-2">
                <Label>Destino</Label>
                <Input
                  value={newRoute.destination}
                  onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value })}
                  required
                />
              </div>

              {/* Hora de Partida */}
              <div className="space-y-2">
                <Label>Hora de Partida</Label>
                <Input
                  type="time"
                  value={newRoute.departure_time}
                  onChange={(e) => setNewRoute({ ...newRoute, departure_time: e.target.value })}
                  required
                />
              </div>

              {/* Hora de Chegada */}
              <div className="space-y-2">
                <Label>Hora de Chegada</Label>
                <Input
                  type="time"
                  value={newRoute.arrival_time}
                  onChange={(e) => setNewRoute({ ...newRoute, arrival_time: e.target.value })}
                  required
                />
              </div>

              {/* Duração */}
              <div className="space-y-2">
                <Label>Duração</Label>
                <Input
                  value={newRoute.duration}
                  onChange={(e) => setNewRoute({ ...newRoute, duration: e.target.value })}
                  required
                />
              </div>

              {/* Preço Base */}
              <div className="space-y-2">
                <Label>Preço Base</Label>
                <Input
                  type="number"
                  value={newRoute.base_price}
                  onChange={(e) => setNewRoute({ ...newRoute, base_price: e.target.value })}
                  required
                />
              </div>

              {/* Total de Assentos */}
              <div className="space-y-2">
                <Label>Total de Assentos</Label>
                <Input
                  type="number"
                  value={newRoute.total_seats}
                  onChange={(e) => setNewRoute({ ...newRoute, total_seats: e.target.value })}
                  required
                />
              </div>

              {/* Urbano */}
              <div className="space-y-2">
                <Label>Urbano</Label>
                <Switch
                  checked={newRoute.urbano}
                  onCheckedChange={(checked) => setNewRoute({ ...newRoute, urbano: checked })}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction type="submit">Adicionar</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a rota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}