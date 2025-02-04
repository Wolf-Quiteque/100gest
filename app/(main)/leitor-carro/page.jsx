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

const LeitorPage = () => {
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [userMetadata, setUserMetadata] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannedBus, setScannedBus] = useState(null);
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

    // Initialize QR code instance
    const html5QrCode = new Html5Qrcode("qr-reader");
    setHtml5QrCode(html5QrCode);

    // Cleanup on unmount
    return () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(() => {
          // Ignore stop errors during cleanup
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

      // Make sure scanner is stopped before starting
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
          // Only log errors, don't show to user unless critical
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
    try {
      setScanResult(decodedText);

      // Validate the scanned bus ID
      const { data: bus, error: busError } = await supabase
        .from('buses')
        .select('*')
        .eq('reference', decodedText)
        .single();

      if (busError || !bus) throw new Error('Ônibus não encontrado.');

      // Check if the bus belongs to the same company
      if (bus.company_id !== userMetadata.companyId) {
        throw new Error('Ônibus não pertence à sua empresa.');
      }

      // Save the scan log
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

      // Stop scanning
      await stopScanning();

      // Show success modal
      setScannedBus(bus);
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
              
              {scanResult && (
                <>
                  <Alert className="bg-orange-100 border-orange-300">
                    <AlertDescription className="text-orange-700">
                      QR Code lido com sucesso!
                    </AlertDescription>
                  </Alert>
                  <div>
                    <p className="text-lg font-semibold">Conteúdo Lido:</p>
                    <p className="text-orange-600">{scanResult}</p>
                  </div>
                  <Button 
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={resetScanner}
                  >
                    Ler Outro QR Code
                  </Button>
                </>
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

      {/* Success Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-600">
              Registro Salvo com Sucesso!
            </DialogTitle>
            <DialogDescription>
              Olá, {userMetadata?.userName}! O registro do ônibus{' '}
              <span className="font-semibold">{scannedBus?.reference}</span> foi salvo.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeitorPage;