import { Platform, StyleSheet } from 'react-native';

const scale = Platform.OS === 'android' ? 0.9 : 1;
const s = (value: number) => Math.round(value * scale);

export const styles = StyleSheet.create({
  darkroomRightPanel: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#000',
  },
  // ★ 追加: 右パネル内で全画面を覆うコンテナ
  fullscreenContent: {
    ...StyleSheet.absoluteFillObject,
  },
  fullscreenImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  fullscreenSkiaWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    overflow: 'hidden',
  },
  emptyBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  // ... (残りのスタイルは変更なし) ...
  emptyBackgroundText: {
    color: '#333',
    fontSize: s(24),
    fontFamily: 'Courier',
    fontWeight: 'bold',
    letterSpacing: s(4),
  },
  overlayCenter: {
    backgroundColor: 'rgba(5, 5, 5, 0.7)',
    paddingVertical: s(30),
    paddingHorizontal: s(20),
    borderRadius: s(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
    width: '85%',
  },
  timerLabel: {
    color: '#8B0000',
    fontSize: s(14),
    letterSpacing: s(3),
    marginBottom: s(8),
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  timerText: {
    color: '#D41414',
    fontSize: s(54),
    fontWeight: '900',
    letterSpacing: s(2),
    fontFamily: 'monospace',
    textShadowColor: 'rgba(200, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: s(15),
    textAlign: 'center',
    width: '100%',
  },
  processingText: {
    marginTop: s(16),
    color: '#C5B7B7',
    fontSize: s(14),
    letterSpacing: s(1),
    fontFamily: 'Courier',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(14),
    backgroundColor: '#050505',
  },
  loadingText: {
    color: '#E8D3D3',
    fontSize: s(14),
    fontWeight: '600',
    letterSpacing: s(1),
  },
  statusValue: {
    color: '#fff',
    fontSize: s(16),
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginBottom: s(24),
  },
  infoValue: {
    color: '#ccc',
    fontSize: s(14),
    fontFamily: 'Courier',
  },
  actionBtnText: {
    color: '#ccc',
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontSize: s(13),
  }
});