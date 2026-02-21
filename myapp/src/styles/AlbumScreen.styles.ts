import { Platform, StyleSheet } from 'react-native';
const GRID_COLUMNS = 3;
const ITEM_MARGIN = 8;
const scale = Platform.OS === 'android' ? 0.9 : 1;
const edgeInset = Platform.OS === 'android' ? 6 : 0;
const s = (value: number) => Math.round(value * scale);
export const styles = StyleSheet.create({
  /* ── Root ── */
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },

  /* ── Top bar (film badges + refresh + settings) ── */
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
  filmBadgeEmoji: {
    fontSize: s(16),
    marginRight: s(6),
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

  /* ── Main two-column layout ── */
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },

  /* ── Left panel (grip + dashboard) ── */
  leftPanel: {
    flex: 0.42,
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* Navigation bar (left edge) */
  grip: {
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

  /* Dashboard */
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
    gap: s(12),
  },
  label: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: s(12),
    marginBottom: s(4),
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(8),
    marginBottom: s(4),
  },
  dashboardBtn: {
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: s(5),
    paddingHorizontal: s(14),
    borderRadius: s(4),
  },
  dashboardBtnActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnText: {
    color: '#888',
    fontFamily: 'cinecaption226',
    fontSize: s(13),
  },
  btnTextActive: {
    color: '#fff',
  },
  dangerBtn: {
    borderColor: '#ff4444',
  },
  dangerBtnText: {
    color: '#ff4444',
    fontFamily: 'cinecaption226',
    fontSize: s(13),
  },

  /* ── Pagination controls ── */
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(12),
    paddingVertical: s(8),
  },
  paginationButton: {
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: s(6),
    paddingHorizontal: s(12),
    borderRadius: s(4),
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationButtonText: {
    color: '#fff',
    fontFamily: 'cinecaption226',
    fontSize: s(16),
    fontWeight: 'bold',
  },
  paginationButtonTextDisabled: {
    color: '#666',
  },
  paginationText: {
    color: '#ccc',
    fontFamily: 'Courier',
    fontSize: s(13),
    minWidth: s(50),
    textAlign: 'center',
  },

  /* ── Right panel (photo grid) ── */
  rightPanel: {
    flex: 0.58,
    paddingTop: s(50),
  },
  list: {
    paddingHorizontal: Platform.OS === 'android' ? s(14) : s(12),
    paddingBottom: s(24) + edgeInset,
  },
  listRow: {
    justifyContent: 'flex-start',
    marginBottom: s(8),
  },

  /* Photo items */
  photoItem: {
    marginBottom: 0,
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: s(4),
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  photo: {
    backgroundColor: 'transparent',
  },
  photoBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  selectionBadge: {
    position: 'absolute',
    top: s(6) + edgeInset,
    right: s(6) + edgeInset,
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  selectionBadgeActive: {
    backgroundColor: '#00ff00',
    borderColor: '#00ff00',
  },
  selectionBadgeText: {
    color: '#000',
    fontSize: s(12),
    fontWeight: '700',
    lineHeight: s(14),
  },

  /* Photo meta text */
  metaText: {
    fontSize: s(10),
    color: '#888',
    fontFamily: 'cinecaption226',
    lineHeight: s(14),
    marginTop: s(1),
  },

  /* Empty state */
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontFamily: 'cinecaption226',
    fontSize: s(14),
  },

  /* ── Detail modal ── */
  detailContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  detailHeader: {
    height: s(52),
    paddingHorizontal: s(18),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailHeaderButton: {
    paddingHorizontal: s(8),
    paddingVertical: s(6),
  },
  detailHeaderText: {
    color: '#FFFFFF',
    fontSize: s(24),
    fontWeight: '600',
  },
  detailZoomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(10),
    marginTop: s(2),
    marginBottom: s(6),
  },
  detailZoomButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(20,20,20,0.75)',
    borderRadius: s(12),
    minWidth: s(48),
    paddingHorizontal: s(10),
    paddingVertical: s(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailZoomButtonText: {
    color: '#FFFFFF',
    fontSize: s(13),
    fontWeight: '700',
  },
  detailImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  detailImage: {
    width: '80%',
    height: '80%',
  },
  detailBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: '11%',
    bottom: '11%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  /* ── Action menu modal ── */
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 15,
  },
  menuBackdropDismiss: {
    flex: 1,
  },
  menuSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: s(16),
    borderTopRightRadius: s(16),
    paddingHorizontal: Platform.OS === 'android' ? s(24) : s(20),
    paddingTop: s(16),
    paddingBottom: s(24) + edgeInset,
  },
  menuTitle: {
    fontSize: s(16),
    color: '#fff',
    fontFamily: 'cinecaption226',
    marginBottom: s(8),
  },
  menuActionButton: {
    paddingVertical: s(12),
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuActionText: {
    fontSize: s(15),
    color: '#ccc',
    fontFamily: 'cinecaption226',
  },
  menuDangerButton: {
    marginTop: s(2),
  },
  menuDangerText: {
    fontSize: s(15),
    color: '#ff4444',
    fontFamily: 'cinecaption226',
  },
  menuInfoWrap: {
    marginTop: s(14),
  },
  menuInfoLabel: {
    fontSize: s(12),
    color: '#666',
    fontFamily: 'cinecaption226',
  },
  menuInfoTopMargin: {
    marginTop: s(10),
  },
  menuInfoValue: {
    fontSize: s(14),
    color: '#ccc',
    fontFamily: 'cinecaption226',
    marginTop: s(2),
  },
  detailSingleWrap: {
  flex: 1,
  backgroundColor: '#000', // モーダル背景（必要に応じて変更）
  alignItems: 'center',
  justifyContent: 'center',
    paddingHorizontal: s(16),
},
detailImageHeader: {
  width: '100%',
    paddingVertical: s(8),
  alignItems: 'center',
},
detailHeaderTitle: {
  color: '#fff',
    fontSize: s(16),
  fontWeight: '600',
},
detailHeaderDate: {
  color: '#ccc',
    fontSize: s(12),
    marginTop: s(4),
},
detailFooter: {
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'space-between',
    paddingVertical: s(12),
    paddingHorizontal: s(16),
},
detailFooterButton: {
    padding: s(8),
},
detailFooterText: {
  color: '#fff',
    fontSize: s(14),
},

  
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  gridItem: {
    width: `${100 / GRID_COLUMNS}%`,
    padding: ITEM_MARGIN / 2,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: s(8),
    backgroundColor: '#1f1f1f',
  },

  /* ── Detail photo modal (fallback overlay) ── */
  detailModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  detailModalDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  detailModalNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -s(70),
    zIndex: 11,
    width: s(70),
    height: s(140),
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalNavButtonLeft: {
    left: s(16) + edgeInset,
  },
  detailModalNavButtonRight: {
    right: s(16) + edgeInset,
  },
  detailModalNavButtonText: {
    color: '#fff',
    fontSize: s(60),
    fontWeight: 'bold',
  },
  detailModalCloseButton: {
    position: 'absolute',
    top: s(20) + edgeInset,
    left: s(20) + edgeInset,
    zIndex: 12,
    width: s(50),
    height: s(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalCloseButtonText: {
    color: '#fff',
    fontSize: s(36),
    fontWeight: 'bold',
  },  
});
