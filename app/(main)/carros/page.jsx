'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
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
import { Pencil, Trash, Plus, QrCode } from 'lucide-react';
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

const PAGE_SIZE = 10;

export default function CarrosPage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [buses, setBuses] = useState([]);
  const [totalBuses, setTotalBuses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyName, setCompanyName] = useState('Carregando...');
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteBusId, setDeleteBusId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBus, setNewBus] = useState({ reference: '', seats: '' });
  const [editBus, setEditBus] = useState(null);

  useEffect(() => {
    fetchCompanyAndBuses();
  }, [currentPage]);

  const fetchCompanyAndBuses = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado.');

      const companyId = user?.user_metadata?.company_id;
      if (!companyId) throw new Error('Empresa não encontrada.');

      setCompanyId(companyId);

      const { data: companyData, error: companyError } = await supabase
        .from('bus_companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (companyError || !companyData) throw new Error('Erro ao carregar dados da empresa.');
      setCompanyName(companyData.name);

      const { data, error, count } = await supabase
        .from('buses')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBuses(data || []);
      setTotalBuses(count || 0);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar carros',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQrCode = async (reference) => {
    try {
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const root = createRoot(container);
      await new Promise(resolve => {
        root.render(
          <QRCodeSVG 
            value={reference} 
            size={200} // Keep this large for quality
            ref={(el) => {
              if (el) {
                const svgElement = container.querySelector('svg');
                if (svgElement) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = 200;
                  canvas.height = 200;
  
                  const img = new Image();
                  const svgString = new XMLSerializer().serializeToString(svgElement);
                  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                  const svgUrl = URL.createObjectURL(svgBlob);
  
                  img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    const pngUrl = canvas.toDataURL('image/png');
                    
                    const doc = new jsPDF();
                    doc.setFontSize(12); // Smaller font
                    doc.text(`Carro: ${reference}`, 15, 15);
                    // 50mm x 50mm QR code (approximately 2 inches)
                    doc.addImage(pngUrl, 'PNG', 15, 20, 50, 50);
                    doc.save(`Carro-${reference}.pdf`);
                    
                    URL.revokeObjectURL(svgUrl);
                    root.unmount();
                    document.body.removeChild(container);
                  };
                  
                  img.src = svgUrl;
                }
                resolve();
              }
            }}
          />
        );
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar QR code',
        description: 'Não foi possível gerar o PDF do QR code.',
      });
    }
  };

  const handleAddBus = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('buses')
        .insert([{ ...newBus, company_id: companyId }]);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Carro adicionado com sucesso.',
        className: 'bg-orange-100 border-orange-300 text-orange-700',
      });

      setNewBus({ reference: '', seats: '' });
      setIsAddDialogOpen(false);
      fetchCompanyAndBuses();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar carro',
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
        .from('buses')
        .delete()
        .eq('id', deleteBusId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Carro deletado com sucesso.',
        className: 'bg-orange-100 border-orange-300 text-orange-700',
      });

      setDeleteBusId(null);
      setIsDeleteDialogOpen(false);
      fetchCompanyAndBuses();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar carro',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState(null);

  const handleEditClick = (bus) => {
    setEditingBus(bus);
    setIsEditDialogOpen(true);
  };

  const handleUpdateBus = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('buses')
        .update({
          reference: editingBus.reference,
          seats: parseInt(editingBus.seats),
        })
        .eq('id', editingBus.id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Carro atualizado com sucesso.',
        className: 'bg-orange-100 border-orange-300 text-orange-700',
      });

      setIsEditDialogOpen(false);
      setEditingBus(null);
      fetchCompanyAndBuses();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar carro',
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
            Carros - {companyName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Carro
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50">
                <TableHead className="text-orange-600">Referência</TableHead>
                <TableHead className="text-orange-600">Assentos</TableHead>
                <TableHead className="text-orange-600">Data de Registro</TableHead>
                <TableHead className="text-orange-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buses.map((bus) => (
                <TableRow key={bus.id}>
                  <TableCell>{bus.reference}</TableCell>
                  <TableCell>{bus.seats}</TableCell>
                  <TableCell>
                    {new Date(bus.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="space-x-2">
                  <Button
          variant="ghost"
          size="sm"
          className="text-orange-600 hover:bg-orange-100"
          onClick={() => handleEditClick(bus)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-100"
                      onClick={() => {
                        setDeleteBusId(bus.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-100"
                      onClick={() => generateQrCode(bus.reference)}
                    >
                      <QrCode className="h-4 w-4" />
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
              Página {currentPage} de {Math.ceil(totalBuses / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage * PAGE_SIZE >= totalBuses}
            >
              Próxima
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Carro</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleUpdateBus} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referência</Label>
                <Input
                  value={editingBus?.reference || ''}
                  onChange={(e) => setEditingBus({ ...editingBus, reference: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Número de Assentos</Label>
                <Input
                  type="number"
                  value={editingBus?.seats || ''}
                  onChange={(e) => setEditingBus({ ...editingBus, seats: e.target.value })}
                  required
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction type="submit">Salvar Alterações</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Novo Carro</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleAddBus} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referência</Label>
                <Input
                  value={newBus.reference}
                  onChange={(e) => setNewBus({ ...newBus, reference: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Número de Assentos</Label>
                <Input
                  type="number"
                  value={newBus.seats}
                  onChange={(e) => setNewBus({ ...newBus, seats: e.target.value })}
                  required
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o carro.
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