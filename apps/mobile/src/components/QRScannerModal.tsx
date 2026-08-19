import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Alert, ActivityIndicator 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../theme/colors';
import { X, Flashlight, QrCode, RefreshCw } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_BOX_SIZE = SCREEN_WIDTH * 0.7;

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (token: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Cleanly reset scanner state every time the modal becomes visible
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorch(false);
    }
  }, [visible]);

  // Extract event token from raw scanned QR data
  const extractToken = (data: string): string => {
    const cleanData = data.trim();
    
    // Pattern 1: URL with /e/[token]
    const urlMatch = cleanData.match(/\/e\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // Pattern 2: Custom scheme getmymoment://e/[token]
    const schemeMatch = cleanData.match(/getmymoment:\/\/e\/([a-zA-Z0-9_-]+)/i);
    if (schemeMatch && schemeMatch[1]) {
      return schemeMatch[1];
    }

    // Pattern 3: Query parameter ?token=[token] or ?access_token=[token]
    const paramMatch = cleanData.match(/[?&](?:token|access_token)=([a-zA-Z0-9_-]+)/i);
    if (paramMatch && paramMatch[1]) {
      return paramMatch[1];
    }

    // Pattern 4: If scanned string is a full URL, take the trailing slug/token
    if (cleanData.startsWith('http://') || cleanData.startsWith('https://')) {
      const parts = cleanData.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.length >= 4) {
        return last;
      }
    }

    // Pattern 5: Raw alphanumeric token string
    return cleanData;
  };

  const handleBarcodeScanned = (scanningResult: any) => {
    if (scanned) return;
    const raw = typeof scanningResult === 'string' 
      ? scanningResult 
      : (scanningResult?.data || scanningResult?.raw || '');
    if (!raw) return;

    setScanned(true);
    const token = extractToken(raw);
    if (token) {
      onScanSuccess(token);
      onClose();
    } else {
      Alert.alert('Invalid QR Code', `Scanned: ${raw.slice(0, 40)}...\nNot a recognized event link.`, [
        { text: 'Try Again', onPress: () => setScanned(false) }
      ]);
    }
  };

  if (!visible) return null;

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <QrCode size={48} color={Colors.primary} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionDesc}>
              We need camera access to scan wedding standee QR codes and instantly find your event gallery.
            </Text>
            <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
              <Text style={styles.grantBtnText}>Grant Camera Access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'aztec',
              'ean13',
              'ean8',
              'pdf417',
              'upc_e',
              'datamatrix',
              'code39',
              'code93',
              'itf14',
              'codabar',
              'code128',
              'upc_a',
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        {/* Overlay with semi-transparent borders & clear viewfinder window */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.iconCircle}>
              <X size={20} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Scan Event QR Standee</Text>
            <TouchableOpacity 
              onPress={() => setTorch(!torch)} 
              style={[styles.iconCircle, torch && styles.iconCircleActive]}
            >
              <Flashlight size={20} color={torch ? Colors.gold : Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Center Target Box */}
          <View style={styles.centerArea}>
            <View style={styles.scanBox}>
              {/* 4 Corner Markers */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructionText}>
              Align the Standee QR code within the frame to enter
            </Text>
          </View>

          {/* Bottom Space */}
          <View style={styles.bottomArea}>
            <TouchableOpacity 
              onPress={() => setScanned(false)} 
              style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} color={Colors.white} />
              <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '700' }}>Tap to Re-Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingBottom: 20,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(217, 164, 65, 0.3)',
    borderColor: Colors.gold,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomArea: {
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  grantBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  grantBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  cancelBtn: {
    paddingVertical: 12,
    marginTop: 6,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
});
