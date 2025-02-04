'use client';
import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, SwitchCamera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const PassengerCheckInPage = () => {
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [userMetadata, setUserMetadata] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannedPassenger, setScannedPassenger] = useState(null);
  const [html5QrCode, setHtml5QrCode] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment');

  useEffect(() => {
    const fetchUserMetadata = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Usuário não autenticado.');
        setUserMetadata({
          userId: user.id,
          companyId: user.user_metadata?.company_id,
          userName: user.user_metadata?.name,
        });
      } catch (err) {
        setError('Erro ao carregar dados do usuário: ' + err.message);
      }
    };
    fetchUserMetadata();
    const html5QrCode = new Html5Qrcode("qr-reader");
    setHtml5QrCode(html5QrCode);
    return () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(() => {
          // Ignorar erros de parada durante a limpeza
        });
      }
    };
  }, [isScanning]);

  const toggleCamera = async () => {
    try {
      if (isScanning) {
        await stopScanning();
        const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
        setCameraFacing(newFacing);
        await startScanning(newFacing);
      }
    } catch (err) {
      console.error('Erro ao alternar câmera:', err);
      setError('Erro ao trocar câmera. Por favor, tente novamente.');
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCode && isScanning) {
        await html5QrCode.stop();
        setIsScanning(false);
      }
    } catch (err) {
      console.error('Erro ao parar scanner:', err);
      setError('Erro ao parar scanner. Por favor, recarregue a página.');
    }
  };

  const startScanning = async (facing = cameraFacing) => {
    try {
      if (!html5QrCode) {
        throw new Error('Scanner não inicializado.');
      }
      if (isScanning) {
        await stopScanning();
      }
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };
      await html5QrCode.start(
        { facingMode: facing },
        config,
        handleScan,
        (err) => {
          console.warn(err);
        }
      );
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error('Erro ao iniciar scanner:', err);
      setError('Erro ao iniciar scanner. Verifique se a câmera está disponível.');
      setIsScanning(false);
    }
  };

  const handleScan = async (decodedText) => {
    try {
      setScanResult(decodedText);
      // Analisa o conteúdo do QR code
      const passengerData = JSON.parse(decodedText);

      // Obtém a atribuição atual do ônibus para o usuário
      const { data: userBus, error: busError } = await supabase
        .from('buses')
        .select('id')
        .eq('company_id', userMetadata.companyId)
        .single();

      if (busError || !userBus) throw new Error('Nenhum ônibus atribuído a este usuário.');

      // Verifica se o passageiro já fez check-in
      const { data: existingCheckin, error: checkinError } = await supabase
        .from('passenger_checkins')
        .select('id')
        .match({ 
          booking_id: passengerData.bookingId,
          ticket_id: passengerData.ticketId,
          bus_id: userBus.id 
        })
        .single();

      if (existingCheckin) {
        toast({
          title: "Passageiro já embarcou",
          description: `O passageiro ${passengerData.passengerName} já realizou check-in.`,
          variant: "destructive"
        });
        throw new Error('Passageiro já realizou check-in.');
      }

      // Salva o check-in
      const { error: insertError } = await supabase
        .from('passenger_checkins')
        .insert([
          {
            booking_id: passengerData.bookingId,
            ticket_id: passengerData.ticketId,
            passenger_name: passengerData.passengerName,
            route: passengerData.route,
            user_id: userMetadata.userId,
            bus_id: userBus.id,
            company_id: userMetadata.companyId,
            booking_date: passengerData.bookingDate
          },
        ]);

      if (insertError) throw insertError;

      // Para o scanner
      await stopScanning();

      // Mostra modal de sucesso
      setScannedPassenger(passengerData);
      setIsModalOpen(true);
    } catch (err) {
      setError('Erro ao processar QR code: ' + err.message);
      await stopScanning();
    }
  };

  const resetScanner = async () => {
    await stopScanning();
    setScanResult(null);
    setError(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-orange-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-600 text-center">
            Leitor de Check-in de Passageiros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full relative bg-gray-100 rounded-lg">
              <div id="qr-reader" className="w-full h-64" />
              {isScanning && (
                <Button
                  className="absolute top-2 right-2 bg-orange-600 hover:bg-orange-700"
                  onClick={toggleCamera}
                >
                  <SwitchCamera className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="text-center space-y-4">
              {!isScanning && !scanResult && (
                <Button 
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => startScanning()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Iniciar Scanner
                </Button>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Modal de Sucesso */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-600">
              Check-in de Passageiro Confirmado!
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Fiscal {userMetadata?.userName}, o check-in do passageiro foi realizado com sucesso!</p>
              <div className="mt-4 space-y-1">
                <p><strong>Passageiro:</strong> {scannedPassenger?.passengerName}</p>
                <p><strong>Rota:</strong> {scannedPassenger?.route}</p>
                <p><strong>Bilhete:</strong> {scannedPassenger?.ticketId}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => {
                setIsModalOpen(false);
                resetScanner();
              }}
            >
              Verificar Próximo Passageiro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PassengerCheckInPage;