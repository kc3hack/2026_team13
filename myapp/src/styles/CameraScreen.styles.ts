import { Platform, StyleSheet } from 'react-native';

const scale = Platform.OS === 'android' ? 0.9 : 1;
const edgeInset = Platform.OS === 'android' ? 6 : 0;
const s = (value: number) => Math.round(value * scale);

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },

  /* ── Top bar (same as AlbumScreen) ── */
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? s(20) + edgeInset : s(10),
    right: edgeInset,
    left: '42%',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: s(24),
    gap: s(8),
  },
  filmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: s(6),
    paddingHorizontal: s(8),
    paddingVertical: s(3),
    gap: s(4),
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  filmBadgeImage: {
    width: s(18),
    height: s(18),
    resizeMode: 'contain',
  },
  filmBadgeCount: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: s(14),
    fontWeight: 'bold',
  },
  topBarButton: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: s(6),
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topBarButtonText: {
    color: '#ccc',
    fontSize: s(18),
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },

  /* ── Main layout ── */
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },

  /* ── Left panel (grip + dashboard, matching AlbumScreen) ── */
  leftPanel: {
    flex: 0.42,
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* Navigation bar (left edge) */
  gripDecor: {
    width: s(28),
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(10),
    marginLeft: s(4),
  },
  navSquare: {
    width: s(8),
    height: s(8),
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'transparent',
  },
  navSquareActive: {
    backgroundColor: '#888',
    borderColor: '#888',
  },
  gripLine: {
    width: 1,
    height: s(10),
    backgroundColor: '#333',
  },

  /* Dashboard (matching AlbumScreen padding) */
  dashboard: {
    flex: 1,
    alignSelf: 'stretch',
    paddingLeft: s(24),
    paddingTop: s(80),
    paddingRight: Platform.OS === 'android' ? s(8) : 0,
    justifyContent: 'flex-start',
  },
  systemText: {
    color: '#00ff00',
    fontFamily: 'Courier',
    fontSize: s(14),
    marginBottom: s(20),
    letterSpacing: 1,
  },
  instruments: {
    gap: s(15),
  },
  row: {
    flexDirection: 'row',
    gap: s(30),
  },
  controlsRow: {
    flexDirection: 'row',
    gap: s(30),
    marginTop: s(10),
  },
  label: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: s(12),
    marginBottom: s(5),
  },
  valueHighlight: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: s(18),
    fontWeight: 'bold',
  },
  valueText: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: s(16),
    width: s(45),
    textAlign: 'center',
  },
  dashboardBtn: {
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: s(5),
    paddingHorizontal: s(15),
    borderRadius: s(4),
    alignSelf: 'flex-start',
  },
  btnText: {
    color: '#ccc',
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
  },

  /* Film selection */
  filmSelectScroll: {
    width: '100%',
  },
  filmSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginBottom: s(4),
    paddingRight: s(6),
  },
  filmSelectBtn: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: s(4),
    paddingVertical: s(4),
    paddingHorizontal: s(4),
    alignItems: 'center',
    gap: s(2),
    width: s(60),
  },
  filmSelectBtnActive: {
    borderColor: '#00ff00',
    backgroundColor: 'rgba(0,255,0,0.08)',
  },
  filmSelectImage: {
    width: s(20),
    height: s(20),
    resizeMode: 'contain',
  },
  filmSelectLabel: {
    color: '#888',
    fontFamily: 'Courier',
    fontSize: s(9),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filmSelectLabelActive: {
    color: '#fff',
  },
  filmSelectCount: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: s(10),
  },
  filmSelectCountEmpty: {
    color: '#ff4444',
  },
  warningText: {
    color: '#ff4444',
    fontFamily: 'Courier',
    fontSize: s(11),
    marginTop: s(2),
  },
  hintText: {
    color: '#555',
    fontFamily: 'Courier',
    fontSize: s(11),
    marginTop: s(2),
  },

  /* ── Right side: camera rig ── */
  cameraRig: {
    flex: 0.58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: Platform.OS === 'android' ? s(24) : s(20),
  },
  previewContainer: {
    width: s(240),
    height: s(180),
    borderWidth: 2,
    borderColor: '#333',
    borderRightWidth: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderTopLeftRadius: s(8),
    borderBottomLeftRadius: s(8),
  },
  camera: {
    flex: 1,
  },
  crosshairVertical: {
    position: 'absolute',
    left: '50%',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  crosshairHorizontal: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  recDot: {
    position: 'absolute',
    top: s(8) + edgeInset,
    left: s(8) + edgeInset,
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: 'red',
  },
  grip: {
    width: s(80),
    height: s(180),
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderTopRightRadius: s(12),
    borderBottomRightRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: s(5),
  },
  shutterButton: {
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#ff4444',
  },
  shutterDisabled: {
    borderColor: '#333',
    backgroundColor: '#222',
  },
  shutterInnerDisabled: {
    backgroundColor: '#444',
  },
  cameraOff: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  cameraOffText: {
    color: '#444',
    fontFamily: 'Courier',
    fontSize: s(16),
    fontWeight: 'bold',
    letterSpacing: s(2),
  },
  permissionText: {
    color: '#ccc',
    fontFamily: 'Courier',
    fontSize: s(16),
    fontWeight: 'bold',
    letterSpacing: s(2),
    marginBottom: s(16),
  },
});
