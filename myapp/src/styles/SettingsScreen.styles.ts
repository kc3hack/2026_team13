import { StyleSheet } from 'react-native';

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
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: '#101010',
    borderBottomColor: '#2E2E2E',
  },
  backTouchable: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 20,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionCardDark: {
    backgroundColor: '#151515',
    borderColor: '#2E2E2E',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: 20,
  },
  dividerDark: {
    backgroundColor: '#2E2E2E',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 7,
    color: '#333',
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  inputDark: {
    backgroundColor: '#1F1F1F',
    borderColor: '#3A3A3A',
    color: '#F1F1F1',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    lineHeight: 18,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeBtnDark: {
    backgroundColor: '#252525',
  },
  volumeBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  volumeTrackWrap: {
    flex: 1,
    marginHorizontal: 14,
    alignItems: 'center',
  },
  volumeTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  volumeTrackDark: {
    backgroundColor: '#3A3A3A',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  volumePercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  footerDark: {
    borderTopColor: '#2E2E2E',
    backgroundColor: '#101010',
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F0F0F0',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
