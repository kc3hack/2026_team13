import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
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
    top: 36,
    left: 20,
    padding: 10,
    zIndex: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectorWrap: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  selectorTitle: {
    fontSize: 14,
    color: '#2A2A2A',
    marginBottom: 8,
    fontWeight: '600',
  },
  selectorRow: {
    paddingRight: 20,
    gap: 10,
  },
  filmChip: {
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    gap: 6,
    marginBottom: 2,
  },
  filmChipImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  filmChipTitle: {
    color: '#222222',
    fontSize: 14,
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
    fontSize: 12,
  },
  filmChipDescSelected: {
    color: '#3E3E3E',
  },
  filmChipDescDisabled: {
    color: '#A8A8A8',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  cameraButton: {
    width: '100%',
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2B2B2B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
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
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  imageWrap: {
    position: 'relative',
    width: 200,
    height: 200,
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: 200,
    height: 200,
  },
  imageBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
