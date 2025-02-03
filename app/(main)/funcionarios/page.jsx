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
import { Plus, Search, Pencil, Trash } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 10;

export default function FuncionariosPage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyName, setCompanyName] = useState('Carregando...');
  const [companyId, setCompanyId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    address: '',
    phone_number: '',
    id_number: '',
    role: '',
  });

  useEffect(() => {
    fetchCompanyAndEmployees();
  }, [currentPage, searchTerm]);

  const fetchCompanyAndEmployees = async () => {
    setLoading(true);
    try {
      // Get current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado.');
      
      setCurrentUserId(user.id);
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

      // Fetch employees for the company
      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
      setTotalEmployees(count || 0);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar funcionários',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate required fields
      if (!newEmployee.name || !newEmployee.email || !newEmployee.role) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmployee.email,
        password: '100destinos2025',
        options: {
          data: {
            name: newEmployee.name,
            role: newEmployee.role,
            company_id: companyId,
          },
        },
      });

      if (authError) throw authError;

      // Insert employee into the database
      const { error } = await supabase
        .from('employees')
        .insert([{
          name: newEmployee.name,
          email: newEmployee.email,
          address: newEmployee.address,
          phone_number: newEmployee.phone_number,
          id_number: newEmployee.id_number,
          role: newEmployee.role,
          company_id: companyId,
          user_id: authData.user.id,
        }]);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Funcionário adicionado com sucesso.',
        className: 'bg-orange-100 border-orange-300 text-orange-700',
      });

      setNewEmployee({
        name: '',
        email: '',
        address: '',
        phone_number: '',
        id_number: '',
        role: '',
      });
      setIsDialogOpen(false);
      fetchCompanyAndEmployees();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar funcionário',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Prevent self-deletion
      const employeeToDelete = employees.find(e => e.id === deleteEmployeeId);
      if (employeeToDelete?.user_id === currentUserId) {
        throw new Error('Você não pode deletar sua própria conta');
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', deleteEmployeeId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Funcionário deletado com sucesso.',
        className: 'bg-orange-100 border-orange-300 text-orange-700',
      });

      setDeleteEmployeeId(null);
      setIsDeleteDialogOpen(false);
      fetchCompanyAndEmployees();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar funcionário',
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
            Funcionários - {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Pesquisar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-orange-200 focus:ring-orange-500"
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Funcionário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Funcionário</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <Input
                    placeholder="Nome Completo *"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    required
                    className="border-orange-200 focus:ring-orange-500"
                  />
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    required
                    className="border-orange-200 focus:ring-orange-500"
                  />
                  <Input
                    placeholder="Endereço"
                    value={newEmployee.address}
                    onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                    className="border-orange-200 focus:ring-orange-500"
                  />
                  <Input
                    placeholder="Telefone"
                    value={newEmployee.phone_number}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone_number: e.target.value })}
                    className="border-orange-200 focus:ring-orange-500"
                  />
                  <Input
                    placeholder="Número de Identificação"
                    value={newEmployee.id_number}
                    onChange={(e) => setNewEmployee({ ...newEmployee, id_number: e.target.value })}
                    className="border-orange-200 focus:ring-orange-500"
                  />
                  <Select
                    value={newEmployee.role}
                    onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
                    required
                  >
                    <SelectTrigger className="border-orange-200">
                      <SelectValue placeholder="Selecione o Cargo *" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Motorista</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="mechanic">Mecânico</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={loading}
                  >
                    {loading ? 'Adicionando...' : 'Adicionar Funcionário'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50">
                <TableHead className="text-orange-600">Nome</TableHead>
                <TableHead className="text-orange-600">Email</TableHead>
                <TableHead className="text-orange-600">Telefone</TableHead>
                <TableHead className="text-orange-600">Cargo</TableHead>
                <TableHead className="text-orange-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone_number}</TableCell>
                  <TableCell>
                    {employee.role === 'driver' && 'Motorista'}
                    {employee.role === 'supervisor' && 'Supervisor'}
                    {employee.role === 'mechanic' && 'Mecânico'}
                    {employee.role === 'admin' && 'Administrador'}
                  </TableCell>
                  <TableCell>
                    {employee.user_id !== currentUserId && (
                      <>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:bg-orange-100"
                          onClick={() => {
                            // Implement edit functionality here
                            toast({
                              title: 'Editar Funcionário',
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
                            setDeleteEmployeeId(employee.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
              Página {currentPage} de {Math.ceil(totalEmployees / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage * PAGE_SIZE >= totalEmployees}
            >
              Próxima
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o funcionário.
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