import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  textDarkPrimary: {
    color: '#F1F1F1',
  },
  textDarkSub: {
    color: '#C7C7C7',
  },
  controlDark: {
    backgroundColor: '#171717',
    borderColor: '#3A3A3A',
  },
  header: {
    width: '100%',
    paddingTop: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 10,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectionToggleButton: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectionToggleButtonText: {
    fontSize: 12,
    color: '#3A3A3A',
    fontWeight: '600',
  },
  tabsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    marginTop: 2,
  },
  tabsWrapDark: {
    borderBottomColor: '#2E2E2E',
  },
  tabItem: {
    width: '50%',
    maxWidth: 180,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    color: '#787878',
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1E1E1E',
    fontWeight: '700',
  },
  tabIndicator: {
    marginTop: 8,
    width: 76,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1E1E1E',
  },
  tabIndicatorDark: {
    backgroundColor: '#F1F1F1',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectionInfoText: {
    fontSize: 12,
    color: '#3A3A3A',
    marginBottom: 8,
    fontWeight: '600',
  },
  selectionActionBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 48 : 36,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    borderRadius: 14,
  },
  selectionActionBarDark: {
    backgroundColor: 'rgba(18,18,18,0.96)',
    borderTopColor: '#2E2E2E',
  },
  selectionActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  selectionActionButton: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectionActionButtonText: {
    fontSize: 12,
    color: '#3A3A3A',
    fontWeight: '600',
  },
  selectionActionDangerButton: {
    borderColor: '#E6C4C4',
  },
  selectionActionDangerText: {
    color: '#D63A3A',
  },
  sortButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortButtonDisabled: {
    opacity: 0.5,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#3A3A3A',
    fontWeight: '600',
  },
  list: {
    marginTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    width: '100%',
  },
  listView: {
    width: '100%',
    alignSelf: 'stretch',
  },
  listWithSelectionActions: {
    paddingBottom: Platform.OS === 'android' ? 148 : 106,
  },
  listRow: {
    width: '100%',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666666',
    fontSize: 14,
  },
  photoItem: {
    marginRight: 0,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  photoWrap: {
    position: 'relative',
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  photoWrapDark: {
    borderColor: '#000000',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  selectionBadgeActive: {
    backgroundColor: '#1E1E1E',
  },
  selectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  metaText: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 14,
  },
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
  },
  detailImage: {
    width: '100%',
    height: '78%',
  },
  detailBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: '11%',
    bottom: '11%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuBackdropDismiss: {
    flex: 1,
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  menuActionButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  menuActionText: {
    fontSize: 15,
    color: '#2B2B2B',
  },
  menuDangerButton: {
    marginTop: 2,
  },
  menuDangerText: {
    fontSize: 15,
    color: '#D63A3A',
    fontWeight: '600',
  },
  menuInfoWrap: {
    marginTop: 14,
  },
  menuInfoLabel: {
    fontSize: 12,
    color: '#888888',
  },
  menuInfoTopMargin: {
    marginTop: 10,
  },
  menuInfoValue: {
    fontSize: 14,
    color: '#1E1E1E',
    marginTop: 2,
  },
});
