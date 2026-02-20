import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },

  /* ── Top bar (same as AlbumScreen) ── */
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 20 : 10,
    right: 0,
    left: '42%',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 24,
    gap: 8,
  },
  filmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  filmBadgeImage: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  filmBadgeCount: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topBarButton: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topBarButtonText: {
    color: '#ccc',
    fontSize: 18,
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
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginLeft: 4,
  },
  navSquare: {
    width: 8,
    height: 8,
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
    height: 10,
    backgroundColor: '#333',
  },

  /* Dashboard (matching AlbumScreen padding) */
  dashboard: {
    flex: 1,
    alignSelf: 'stretch',
    paddingLeft: 24,
    paddingTop: 80,
    justifyContent: 'flex-start',
  },
  systemText: {
    color: '#00ff00',
    fontFamily: 'Courier',
    fontSize: 14,
    marginBottom: 20,
    letterSpacing: 1,
  },
  instruments: {
    gap: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 30,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 10,
  },
  label: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: 12,
    marginBottom: 5,
  },
  valueHighlight: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: 'bold',
  },
  valueText: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: 16,
    width: 45,
    textAlign: 'center',
  },
  dashboardBtn: {
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 4,
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
    gap: 5,
  },

  /* Film selection */
  filmSelectScroll: {
    width: '100%',
  },
  filmSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingRight: 6,
  },
  filmSelectBtn: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 2,
    width: 60,
  },
  filmSelectBtnActive: {
    borderColor: '#00ff00',
    backgroundColor: 'rgba(0,255,0,0.08)',
  },
  filmSelectImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  filmSelectLabel: {
    color: '#888',
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filmSelectLabelActive: {
    color: '#fff',
  },
  filmSelectCount: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: 10,
  },
  filmSelectCountEmpty: {
    color: '#ff4444',
  },
  warningText: {
    color: '#ff4444',
    fontFamily: 'Courier',
    fontSize: 11,
    marginTop: 2,
  },
  hintText: {
    color: '#555',
    fontFamily: 'Courier',
    fontSize: 11,
    marginTop: 2,
  },

  /* ── Right side: camera rig ── */
  cameraRig: {
    flex: 0.58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
  },
  previewContainer: {
    width: 240,
    height: 180,
    borderWidth: 2,
    borderColor: '#333',
    borderRightWidth: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
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
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
  },
  grip: {
    width: 80,
    height: 180,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  shutterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  permissionText: {
    color: '#ccc',
    fontFamily: 'Courier',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
  },
});
