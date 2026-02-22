import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Svg, { Path, Rect, G, Defs, ClipPath, Circle } from 'react-native-svg';

interface ShutterOverlayProps {
  /** SVG viewport width  */
  width: number;
  /** SVG viewport height */
  height: number;
  /** true = shutter open (blades retracted), false = closed */
  isOpen: boolean;
  /** Number of iris blades (default 10) */
  bladeCount?: number;
  /** Animation duration in ms (default 400) */
  duration?: number;
  /** Increment to trigger a shutter-click animation (close → open) */
  shutterTrigger?: number;
  /** Duration of the shutter-click close phase in ms (default 150) */
  clickCloseDuration?: number;
  /** Duration of the shutter-click open phase in ms (default 300) */
  clickOpenDuration?: number;
  /** Called when the shutter has fully closed */
  onClosed?: () => void;
}

/**
 * Animated camera‑iris / shutter overlay.
 *
 * Renders N triangular blades that open/close based on `isOpen`.
 * The iris is sized to cover the full rectangular preview area
 * and clipped to the preview bounds.
 */
export const ShutterOverlay: React.FC<ShutterOverlayProps> = ({
  width,
  height,
  isOpen,
  bladeCount = 10,
  duration = 400,
  shutterTrigger = 0,
  clickCloseDuration = 100,
  clickOpenDuration = 100,
  onClosed,
}) => {
  const cx = width / 2;
  const cy = height / 2;

  const extend = Math.max(width, height) * 1.5;
  const maxRadius = Math.sqrt(width * width + height * height) / 2;
  const angleStep = (Math.PI * 2) / bladeCount;

  const closedRadius = 2;
  const openRadius = maxRadius * 1.3;

  /* ── Animation state ─────────────────────────────────────────── */
  const isFirst = useRef(true);
  const isClickAnimating = useRef(false);
  const pendingClose = useRef(false);
  const anim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const [aperture, setAperture] = useState(isOpen ? openRadius : closedRadius);
  const [visible, setVisible] = useState(!isOpen);
  const prevTrigger = useRef(shutterTrigger);

  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      setAperture(closedRadius + (openRadius - closedRadius) * value);
    });
    return () => anim.removeListener(id);
  }, []);

  // Open / Close based on isOpen prop
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    // If a click animation is in progress, defer the close
    if (isClickAnimating.current) {
      if (!isOpen) {
        pendingClose.current = true;
      }
      return;
    }

    if (isOpen) {
      setVisible(true);
      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start(() => setVisible(false));
    } else {
      setVisible(true);
      Animated.timing(anim, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start(() => {
        onClosed?.();
      });
    }
  }, [isOpen]);

  // Shutter-click animation: close → open
  useEffect(() => {
    if (shutterTrigger === prevTrigger.current) return;
    prevTrigger.current = shutterTrigger;

    isClickAnimating.current = true;
    pendingClose.current = false;
    setVisible(true);
    anim.setValue(1);

    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0,
        duration: clickCloseDuration,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: clickOpenDuration,
        useNativeDriver: false,
      }),
    ]).start(() => {
      isClickAnimating.current = false;

      // If isOpen became false while clicking, play the close animation now
      if (pendingClose.current) {
        pendingClose.current = false;
        Animated.timing(anim, {
          toValue: 0,
          duration,
          useNativeDriver: false,
        }).start(() => {
          onClosed?.();
        });
      } else {
        setVisible(false);
      }
    });
  }, [shutterTrigger]);

  if (!visible) return null;

  /* ── Build blades with current aperture radius ───────────────── */
  const blades: string[] = [];

  for (let i = 0; i < bladeCount; i++) {
    const vx = cx + aperture * Math.cos(angleStep * i);
    const vy = cy - aperture * Math.sin(angleStep * i);

    const rot = -(Math.PI / 2 + angleStep / 2 + angleStep * i);
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const xf = (px: number, py: number) => ({
      x: vx + px * cosR - py * sinR,
      y: vy + px * sinR + py * cosR,
    });

    const a = xf(0, 0);
    const b = xf(extend, 0);
    const c = xf(extend * Math.cos(angleStep), extend * Math.sin(angleStep));

    blades.push(
      `M${a.x.toFixed(1)},${a.y.toFixed(1)} ` +
      `L${b.x.toFixed(1)},${b.y.toFixed(1)} ` +
      `L${c.x.toFixed(1)},${c.y.toFixed(1)}Z`,
    );
  }

  const fillA = '#1a1a1a';
  const fillB = '#111111';
  const bladeStroke = '#2a2a2a';

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id="shutterLensClip">
            <Rect x={0} y={0} width={width} height={height} />
          </ClipPath>
        </Defs>

        <G clipPath="url(#shutterLensClip)">
          {blades.map((d, i) => (
            <Path
              key={i}
              d={d}
              fill={i % 2 === 0 ? fillA : fillB}
              stroke={bladeStroke}
              strokeWidth={0.5}
            />
          ))}
        </G>

        {/* Centre pivot dot */}
        <Circle
          cx={cx}
          cy={cy}
          r={2.5}
          fill="#1a1a1a"
          stroke="#444"
          strokeWidth={0.5}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
