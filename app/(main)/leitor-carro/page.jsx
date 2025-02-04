'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, SwitchCamera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const LeitorPage = () => {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [userMetadata, setUserMetadata] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannedBus, setScannedBus] = useState(null);
  const [html5QrCode, setHtml5QrCode] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment');

  // Add refs for processing state and debounce timer
  const isProcessing = useRef(false);
  const debounceTimer = useRef(null);
  const redirectTimer = useRef(null);

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
          // Ignore stop errors during cleanup
        });
      }
      // Clear any pending timers
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
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
      console.error('Error toggling camera:', err);
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
      console.error('Error stopping scanner:', err);
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
      console.error('Error starting scanner:', err);
      setError('Erro ao iniciar scanner. Verifique se a câmera está disponível.');
      setIsScanning(false);
    }
  };

  const handleScan = async (decodedText) => {
    // If already processing a scan or debounce timer is active, ignore this scan
    if (isProcessing.current) {
      return;
    }

    // Clear any existing timers
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
    }

    // Set processing flag
    isProcessing.current = true;

    try {
      setScanResult(decodedText);
      
      const { data: bus, error: busError } = await supabase
        .from('buses')
        .select('*')
        .eq('reference', decodedText)
        .single();

      if (busError || !bus) throw new Error('Ônibus não encontrado.');
      
      if (bus.company_id !== userMetadata.companyId) {
        throw new Error('Ônibus não pertence à sua empresa.');
      }

      const { error: logError } = await supabase
        .from('scan_logs')
        .insert([
          {
            user_id: userMetadata.userId,
            company_id: userMetadata.companyId,
            bus_id: bus.id,
          },
        ]);

      if (logError) throw logError;

      await stopScanning();
      setScannedBus(bus);
      setIsModalOpen(true);

      // Set redirect timer
      redirectTimer.current = setTimeout(() => {
        router.refresh();
      }, 1300);

    } catch (err) {
      setError('Erro ao processar QR code: ' + err.message);
      await stopScanning();
    }
  };

  const resetScanner = async () => {
    await stopScanning();
    setScanResult(null);
    setError(null);
    isProcessing.current = false;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-orange-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-600 text-center">
            Leitor de QR Code - CARRO
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

    
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-600">
              Registro Salvo com Sucesso!
            </DialogTitle>
            <DialogDescription>
              Olá, {userMetadata?.userName}! O registro do ônibus{' '}
              <span className="font-semibold">{scannedBus?.reference}</span> foi salvo.
              <br />
              Redirecionando para o painel em 1 segundo...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeitorPage;