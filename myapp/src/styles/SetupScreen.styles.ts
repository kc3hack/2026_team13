import { Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARALLAX_FACTOR = 0.3;
const PARALLAX_MAX_SCROLL = 500;
const PARALLAX_OFFSET = PARALLAX_MAX_SCROLL * PARALLAX_FACTOR;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT + PARALLAX_OFFSET,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 100,
    flexGrow: 1,
  },
  filmsTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: 50,
    zIndex: 10,
    opacity: 0.85,
  },
  filmsBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: 50,
    zIndex: 10,
    opacity: 0.85,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 10,
  },
  logo: {
    width: SCREEN_WIDTH * 0.55,
    height: 100,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 1,
  },
  formSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    color: '#FFFFFF',
  },
  optional: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
    fontSize: 13,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 6,
    lineHeight: 18,
  },
  linkText: {
    color: '#FFB347',
    textDecorationLine: 'underline',
  },
  buttonWrap: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 8,
  },
  buttonTouchable: {
    width: SCREEN_WIDTH * 0.65,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
