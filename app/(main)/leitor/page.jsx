"use client"

import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const LeitorPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState(null);

  // Simulate QR code scanning with a placeholder function
  const handleScan = () => {
    try {
      // In a real implementation, this would come from the QR scanner
      const mockQRData = "https://example.com/123";
      setScanResult(mockQRData);
      setIsScanning(false);
      setError(null);
    } catch (err) {
      setError("Erro ao ler QR code: " + err.message);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setIsScanning(true);
    setError(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-orange-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-600 text-center">
            Leitor de QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {isScanning ? (
              <div className="w-full h-64 relative bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-orange-500 rounded-lg pointer-events-none" />
                <Button 
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleScan}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Iniciar Scanner
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
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
              </div>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeitorPage;