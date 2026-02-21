import { Platform, StyleSheet } from 'react-native';

const scale = Platform.OS === 'android' ? 0.9 : 1;
const s = (value: number) => Math.round(value * scale);

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? s(24) : s(20),
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: s(14),
    padding: s(20),
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  title: {
    fontSize: s(26),
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: s(20),
  },
  inputGroup: {
    marginBottom: s(14),
  },
  label: {
    fontSize: s(14),
    color: '#2D2D2D',
    marginBottom: s(6),
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D7D7D7',
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    backgroundColor: '#FFFFFF',
    color: '#1F1F1F',
  },
  okButton: {
    marginTop: s(8),
    borderRadius: s(10),
    backgroundColor: '#0A84FF',
    paddingVertical: s(12),
    alignItems: 'center',
  },
  okButtonText: {
    color: '#FFFFFF',
    fontSize: s(16),
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
