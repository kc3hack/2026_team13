import { Platform, StyleSheet } from 'react-native';
const GRID_COLUMNS = 3;
const ITEM_MARGIN = 8;
export const styles = StyleSheet.create({
  /* ── Root ── */
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },

  /* ── Top bar (film badges + refresh + settings) ── */
  topBar: {
    position: 'absolute',
    top: 10,
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
  filmBadgeEmoji: {
    fontSize: 14,
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

  /* Dashboard */
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
    gap: 12,
  },
  label: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: 12,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  dashboardBtn: {
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 4,
  },
  dashboardBtnActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnText: {
    color: '#888',
    fontFamily: 'cinecaption226',
    fontSize: 13,
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
    fontSize: 13,
  },

  /* ── Pagination controls ── */
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  paginationButton: {
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationButtonText: {
    color: '#fff',
    fontFamily: 'cinecaption226',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paginationButtonTextDisabled: {
    color: '#666',
  },
  paginationText: {
    color: '#ccc',
    fontFamily: 'Courier',
    fontSize: 13,
    minWidth: 50,
    textAlign: 'center',
  },

  /* ── Right panel (photo grid) ── */
  rightPanel: {
    flex: 0.58,
    paddingTop: 50,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  listRow: {
    justifyContent: 'flex-start',
    marginBottom: 8,
  },

  /* Photo items */
  photoItem: {
    marginBottom: 0,
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: 4,
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
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },

  /* Photo meta text */
  metaText: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'cinecaption226',
    lineHeight: 14,
    marginTop: 1,
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
    fontSize: 14,
  },

  /* ── Detail modal ── */
  detailContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  detailHeader: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailHeaderButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  detailHeaderText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  detailZoomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  detailZoomButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(20,20,20,0.75)',
    borderRadius: 12,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailZoomButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  menuTitle: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'cinecaption226',
    marginBottom: 8,
  },
  menuActionButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuActionText: {
    fontSize: 15,
    color: '#ccc',
    fontFamily: 'cinecaption226',
  },
  menuDangerButton: {
    marginTop: 2,
  },
  menuDangerText: {
    fontSize: 15,
    color: '#ff4444',
    fontFamily: 'cinecaption226',
  },
  menuInfoWrap: {
    marginTop: 14,
  },
  menuInfoLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'cinecaption226',
  },
  menuInfoTopMargin: {
    marginTop: 10,
  },
  menuInfoValue: {
    fontSize: 14,
    color: '#ccc',
    fontFamily: 'cinecaption226',
    marginTop: 2,
  },
  detailSingleWrap: {
  flex: 1,
  backgroundColor: '#000', // モーダル背景（必要に応じて変更）
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 16,
},
detailImageHeader: {
  width: '100%',
  paddingVertical: 8,
  alignItems: 'center',
},
detailHeaderTitle: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
detailHeaderDate: {
  color: '#ccc',
  fontSize: 12,
  marginTop: 4,
},
detailFooter: {
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 12,
  paddingHorizontal: 16,
},
detailFooterButton: {
  padding: 8,
},
detailFooterText: {
  color: '#fff',
  fontSize: 14,
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
    borderRadius: 8,
    backgroundColor: '#eee',
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
  },  detailModalNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -70,
    zIndex: 11,
    width: 70,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalNavButtonLeft: {
    left: 16,
  },
  detailModalNavButtonRight: {
    right: 16,
  },
  detailModalNavButtonText: {
    color: '#fff',
    fontSize: 60,
    fontWeight: 'bold',
  },
  detailModalCloseButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 12,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalCloseButtonText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },  
});
