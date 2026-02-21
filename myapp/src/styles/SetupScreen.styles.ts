import { Dimensions, Platform, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARALLAX_FACTOR = 0.3;
export const PARALLAX_MAX_SCROLL = 500;
export const PARALLAX_OFFSET = PARALLAX_MAX_SCROLL * PARALLAX_FACTOR;
const scale = Platform.OS === 'android' ? 0.9 : 1;
const edgeInset = Platform.OS === 'android' ? 6 : 0;
const s = (value: number) => Math.round(value * scale);

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
    paddingHorizontal: Platform.OS === 'android' ? s(32) : s(28),
    paddingTop: s(80),
    paddingBottom: s(100) + edgeInset,
    flexGrow: 1,
  },
  filmsTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: s(50),
    zIndex: 10,
    opacity: 0.85,
  },
  filmsBottom: {
    position: 'absolute',
    bottom: edgeInset,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: s(50),
    zIndex: 10,
    opacity: 0.85,
  },
  hero: {
    alignItems: 'center',
    marginBottom: s(28),
    marginTop: s(10),
  },
  logo: {
    width: SCREEN_WIDTH * 0.55,
    height: s(100),
    marginBottom: s(8),
  },
  tagline: {
    fontSize: s(15),
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: s(22),
    letterSpacing: s(1),
  },
  formSection: {
    marginBottom: s(8),
  },
  sectionHeader: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignSelf: 'flex-start',
    paddingHorizontal: s(12),
    paddingVertical: s(6),
    marginBottom: s(10),
  },
  sectionHeaderText: {
    fontSize: s(20),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: s(1),
  },
  sectionDescription: {
    fontSize: s(13),
    color: 'rgba(255,255,255,0.8)',
    lineHeight: s(20),
    marginBottom: s(20),
  },
  inputGroup: {
    marginBottom: s(18),
  },
  label: {
    fontSize: s(15),
    fontWeight: '700',
    marginBottom: s(6),
    color: '#FFFFFF',
  },
  optional: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
    fontSize: s(13),
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: s(8),
    paddingVertical: s(12),
    paddingHorizontal: s(14),
    fontSize: s(15),
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: s(12),
    color: 'rgba(255,255,255,0.65)',
    marginBottom: s(6),
    lineHeight: s(18),
  },
  linkText: {
    color: '#FFB347',
    textDecorationLine: 'underline',
  },
  buttonWrap: {
    marginTop: s(20),
    alignItems: 'center',
    paddingBottom: s(8),
  },
  buttonTouchable: {
    width: SCREEN_WIDTH * 0.65,
    height: s(64),
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
