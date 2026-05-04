/**
 * PhotoEditorModal - WhatsApp-style photo editor with draw and highlight.
 * Uses React Native Skia for drawing on the image, then exports to a temp file.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Canvas,
  useImage,
  Path,
  Image as SkiaImage,
  Skia,
  ImageFormat,
  useCanvasRef,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
} from '@shopify/react-native-skia';
import {
  writeAsStringAsync,
  EncodingType,
  cacheDirectory,
} from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOOLBAR_HEIGHT = 56;
const CANVAS_MAX = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT - TOOLBAR_HEIGHT - 80);

const COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#fbbf24', // highlight yellow
];

const STROKE_WIDTH = 4;
const HIGHLIGHT_WIDTH = 16;

export interface PhotoEditorModalProps {
  visible: boolean;
  imageUri: string;
  onSave: (editedImageUri: string) => void;
  onCancel: () => void;
}

interface Stroke {
  path: string; // SVG path string for serialization; we'll rebuild SkPath when rendering
  color: string;
  strokeWidth: number;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  visible,
  imageUri,
  onSave,
  onCancel,
}) => {
  const isMountedRef = useRef(true);
  // Only load image when modal is visible to avoid native access after unmount
  const imageSource = visible && imageUri ? imageUri : undefined;
  const image = useImage(imageSource ?? '');
  const canvasRef = useCanvasRef();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isHighlight, setIsHighlight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_MAX, height: CANVAS_MAX });

  const strokeWidth = isHighlight ? HIGHLIGHT_WIDTH : STROKE_WIDTH;
  const displayColor = isHighlight ? '#fbbf2480' : selectedColor;

  const strokeWidthRef = useRef(strokeWidth);
  const displayColorRef = useRef(displayColor);
  strokeWidthRef.current = strokeWidth;
  displayColorRef.current = displayColor;

  const buildPathFromPoints = useCallback((points: { x: number; y: number }[]): string => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPoints([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPoints((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setCurrentPoints((points) => {
          if (points.length >= 2) {
            let d = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
              d += ` L ${points[i].x} ${points[i].y}`;
            }
            setStrokes((prev) => [
              ...prev,
              {
                path: d,
                color: displayColorRef.current,
                strokeWidth: strokeWidthRef.current,
              },
            ]);
          } else if (points.length === 1) {
            // Single tap: draw a tiny line so a dot is visible
            const { x, y } = points[0];
            const d = `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
            setStrokes((prev) => [
              ...prev,
              {
                path: d,
                color: displayColorRef.current,
                strokeWidth: strokeWidthRef.current,
              },
            ]);
          }
          return [];
        });
      },
    })
  ).current;

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || !image || !isMountedRef.current) return;
    setSaving(true);
    try {
      // Defer snapshot to next frame so native canvas is fully committed (avoids SIGSEGV)
      const ref = canvasRef.current;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!isMountedRef.current) {
        setSaving(false);
        return;
      }
      const skImage = ref.makeImageSnapshot();
      if (!skImage || !isMountedRef.current) {
        if (isMountedRef.current) Alert.alert('Error', 'Could not capture image');
        setSaving(false);
        return;
      }
      const base64 = skImage.encodeToBase64(ImageFormat.JPEG, 90);
      if (!base64) {
        if (isMountedRef.current) Alert.alert('Error', 'Could not encode image');
        setSaving(false);
        return;
      }
      const filename = `edited_${Date.now()}.jpg`;
      const path = `${cacheDirectory}${filename}`;
      await writeAsStringAsync(path, base64, {
        encoding: EncodingType.Base64,
      });
      if (!isMountedRef.current) {
        setSaving(false);
        return;
      }
      const uri = Platform.OS === 'android' ? `file://${path}` : path;
      onSave(uri);
    } catch (e) {
      console.error('PhotoEditor save error:', e);
      if (isMountedRef.current) Alert.alert('Error', 'Failed to save edited photo');
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }, [canvasRef, image, onSave]);

  const handleCancel = useCallback(() => {
    setStrokes([]);
    setCurrentPoints([]);
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleCancel]);

  useEffect(() => {
    if (!image || !isMountedRef.current) return;
    try {
      const imgW = image.width();
      const imgH = image.height();
      if (imgW <= 0 || imgH <= 0) return;
      const scale = Math.min(CANVAS_MAX / imgW, CANVAS_MAX / imgH, 1);
      if (isMountedRef.current) {
        setCanvasSize({
          width: Math.round(imgW * scale),
          height: Math.round(imgH * scale),
        });
      }
    } catch (_) {
      // image may be disposed if unmounted
    }
  }, [image]);

  if (!visible) return null;

  const canvasW = canvasSize.width;
  const canvasH = canvasSize.height;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit photo{'\n'}
            <Text style={styles.headerSubtitle}>Draw & highlight</Text>
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.canvasWrap, { width: canvasW, height: canvasH }]} collapsable={false}>
          {image ? (
            <>
              {/* Touch layer behind canvas so it receives gestures; canvas has pointerEvents="none" so touches pass through */}
              <View
                style={[styles.touchLayer, { width: canvasW, height: canvasH }]}
                {...panResponder.panHandlers}
              />
              <View style={[styles.canvasOverlay, { width: canvasW, height: canvasH }]} pointerEvents="none">
                <Canvas
                  ref={canvasRef}
                  style={[styles.canvas, { width: canvasW, height: canvasH }]}
                >
                <SkiaImage
                  image={image}
                  x={0}
                  y={0}
                  width={canvasW}
                  height={canvasH}
                  fit="fill"
                />
                {strokes.map((s, i) => {
                  const path = Skia.Path.MakeFromSVGString(s.path);
                  if (!path) return null;
                  const paint = Skia.Paint();
                  paint.setStrokeWidth(s.strokeWidth);
                  paint.setStyle(PaintStyle.Stroke);
                  paint.setStrokeCap(StrokeCap.Round);
                  paint.setStrokeJoin(StrokeJoin.Round);
                  paint.setAntiAlias(true);
                  const color = Skia.Color(s.color);
                  paint.setColor(color);
                  return (
                    <Path
                      key={i}
                      path={path}
                      start={0}
                      end={1}
                      stroke={{ width: s.strokeWidth }}
                      paint={paint}
                    />
                  );
                })}
                {currentPoints.length >= 2 && (() => {
                  const path = Skia.Path.MakeFromSVGString(
                    buildPathFromPoints(currentPoints)
                  );
                  if (!path) return null;
                  const paint = Skia.Paint();
                  paint.setStrokeWidth(strokeWidth);
                  paint.setStyle(PaintStyle.Stroke);
                  paint.setStrokeCap(StrokeCap.Round);
                  paint.setStrokeJoin(StrokeJoin.Round);
                  paint.setAntiAlias(true);
                  paint.setColor(Skia.Color(displayColor));
                  return (
                    <Path
                      path={path}
                      start={0}
                      end={1}
                      stroke={{ width: strokeWidth }}
                      paint={paint}
                    />
                  );
                })()}
                </Canvas>
              </View>
            </>
          ) : (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.toolButton, isHighlight && styles.toolButtonActive]}
            onPress={() => setIsHighlight(true)}
          >
            <Ionicons name="brush" size={24} color={isHighlight ? '#3b82f6' : '#374151'} />
            <Text style={[styles.toolLabel, isHighlight && styles.toolLabelActive]}>
              Highlight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, !isHighlight && styles.toolButtonActive]}
            onPress={() => setIsHighlight(false)}
          >
            <Ionicons name="pencil" size={24} color={!isHighlight ? '#3b82f6' : '#374151'} />
            <Text style={[styles.toolLabel, !isHighlight && styles.toolLabelActive]}>
              Draw
            </Text>
          </TouchableOpacity>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorSwatchSelected,
                ]}
                onPress={() => {
                  setSelectedColor(c);
                  setIsHighlight(false);
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  canvasWrap: {
    alignSelf: 'center',
    marginVertical: 16,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  touchLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'transparent',
  },
  canvasOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  canvas: {
    backgroundColor: 'transparent',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#9ca3af',
  },
  toolbar: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  toolButtonActive: {},
  toolLabel: {
    fontSize: 15,
    color: '#374151',
  },
  toolLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#3b82f6',
  },
});
