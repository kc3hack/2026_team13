import { Platform, StyleSheet } from 'react-native';

const scale = Platform.OS === 'android' ? 0.9 : 1;
const edgeInset = Platform.OS === 'android' ? 6 : 0;
const s = (value: number) => Math.round(value * scale);

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: s(50),
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  textDarkPrimary: {
    color: '#F1F1F1',
  },
  textDarkSub: {
    color: '#C7C7C7',
  },
  backButton: {
    position: 'absolute',
    top: s(36) + edgeInset,
    left: s(20) + edgeInset,
    padding: s(10),
    zIndex: 20,
  },
  backButtonText: {
    fontSize: s(16),
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: s(24),
    fontWeight: 'bold',
    marginBottom: s(16),
  },
  selectorWrap: {
    width: '100%',
    paddingHorizontal: Platform.OS === 'android' ? s(24) : s(20),
    marginBottom: s(20),
  },
  selectorTitle: {
    fontSize: s(14),
    color: '#2A2A2A',
    marginBottom: s(8),
    fontWeight: '600',
  },
  selectorRow: {
    paddingRight: s(20),
    gap: s(10),
  },
  filmChip: {
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: s(12),
    paddingVertical: s(10),
    paddingHorizontal: s(12),
    backgroundColor: '#FFFFFF',
  },
  filmChipDark: {
    backgroundColor: '#171717',
    borderColor: '#3A3A3A',
  },
  filmChipSelected: {
    borderColor: '#222222',
    backgroundColor: '#F3F3F3',
  },
  filmChipDisabled: {
    backgroundColor: '#F7F7F7',
    borderColor: '#E4E4E4',
  },
  filmChipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginBottom: s(2),
  },
  filmChipImage: {
    width: s(22),
    height: s(22),
    resizeMode: 'contain',
  },
  filmChipTitle: {
    color: '#222222',
    fontSize: s(14),
    fontWeight: '700',
  },
  filmChipTitleSelected: {
    color: '#111111',
  },
  filmChipTitleDisabled: {
    color: '#A6A6A6',
  },
  filmChipDesc: {
    color: '#666666',
    fontSize: s(12),
  },
  filmChipDescSelected: {
    color: '#3E3E3E',
  },
  filmChipDescDisabled: {
    color: '#A8A8A8',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: Platform.OS === 'android' ? s(32) : s(28),
    marginBottom: s(20) + edgeInset,
  },
  cameraButton: {
    width: '100%',
    minHeight: s(58),
    borderRadius: s(18),
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2B2B2B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.24,
    shadowRadius: s(10),
    elevation: 8,
  },
  cameraButtonDisabled: {
    backgroundColor: '#707070',
    borderColor: '#7D7D7D',
    shadowOpacity: 0,
    elevation: 0,
  },
  cameraButtonText: {
    color: '#FFFFFF',
    fontSize: s(20),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  imageWrap: {
    position: 'relative',
    width: s(200),
    height: s(200),
    marginTop: s(20),
    borderRadius: s(10),
    overflow: 'hidden',
  },
  image: {
    width: s(200),
    height: s(200),
  },
  imageBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
