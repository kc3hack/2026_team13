import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface DarkroomSkiaViewProps {
  photoUri?: string | null;
  width: number;
  height: number;
  useNativeRipple?: boolean;
  onWaterTouch?: () => void;
}

export const DarkroomSkiaView: React.FC<DarkroomSkiaViewProps> = ({ photoUri, width, height, useNativeRipple = false, onWaterTouch }) => {
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // 1. ローカルの写真をBase64文字列に変換してHTMLに渡せるようにする
  useEffect(() => {
    const loadBase64 = async () => {
      if (!photoUri) return;
      try {
        // ★ 修正: FileSystem.EncodingType.Base64 ではなく、直接 'base64' と指定します
        const base64 = await FileSystem.readAsStringAsync(photoUri, {
          encoding: 'base64',
        });
        setBase64Image(`data:image/jpeg;base64,${base64}`);
      } catch (error) {
        console.error("写真の読み込みに失敗しました", error);
      }
    };
    if (photoUri) {
      void loadBase64();
    } else {
      setBase64Image(null);
    }
  }, [photoUri]);

  // 写真の読み込み中はローディングを表示
  if (width === 0 || height === 0 || (photoUri && !base64Image)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  // 2. 埋め込むHTML（jquery.ripples を使用）
  const jqueryHtml = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #000; /* 背景は黒 */
          overflow: hidden;
        }
        /* 波紋をかけるコンテナ */
        #ripple-container {
          position: absolute;
          /* ゆらゆら動いた時に見切れないよう、画面よりひと回り大きく設定 */
          top: -10%;
          left: -10%;
          width: 120%;
          height: 120%;
          /* ゆらゆらと往復するアニメーション */
          animation: sway 8s ease-in-out infinite alternate;
        }
        
        /* ゆっくり漂う動き */
        @keyframes sway {
          0% { transform: translate(-2%, -2%); }
          100% { transform: translate(2%, 2%); }
        }
      </style>
    </head>
    <body>
      <div id="ripple-container"></div>

      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/jquery.ripples@0.6.3/dist/jquery.ripples.min.js"></script>
      
      <script>
        // React Native から渡された Base64 画像
        const imageData = "${base64Image ?? ''}";
        
        // Canvasを使って「黒背景 ＋ 白枠 ＋ 写真」を一枚の画像に合成する
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 端末の解像度より少し大きめに設定
        const w = window.innerWidth * 1.2;
        const h = window.innerHeight * 1.2;
        canvas.width = w;
        canvas.height = h;

        const drawAmbientOnly = () => {
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, '#020a03');
          grad.addColorStop(1, '#001404');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          ctx.globalAlpha = 0.15;
          for (let i = 0; i < 120; i += 1) {
            const px = Math.random() * w;
            const py = Math.random() * h;
            const pr = Math.random() * 1.8 + 0.2;
            ctx.beginPath();
            ctx.fillStyle = '#6cae75';
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        };

        const applyRipples = () => {
          // 合成した画像を背景としてセット
          const finalImage = canvas.toDataURL('image/jpeg', 0.9);
          const $container = $('#ripple-container');
          $container.css('background-image', 'url(' + finalImage + ')');
          $container.css('background-size', 'cover');
          $container.css('background-position', 'center');

          // 6. 待望の Ripples（波紋）エフェクトを適用！
          try {
            $container.ripples({
              resolution: 512,
              dropRadius: 20,
              perturbance: 0.04,
            });

            const bindTouchRipple = () => {
              const raw = document.getElementById('ripple-container');
              if (!raw) return;

              const handleTouch = (event) => {
                const rect = raw.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                $container.ripples('drop', x, y, 22, 0.05);

                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'waterTouch' }));
                }
              };

              raw.addEventListener('pointerdown', handleTouch, { passive: true });
            };

            bindTouchRipple();

            // 最初にチャプッと自動で波紋を起こす
            setTimeout(() => {
              $container.ripples('drop', w / 2, h / 2, 25, 0.05);
            }, 800);

            // 3秒ごとにランダムな場所で小さく波紋を起こす（生きているような水面）
            setInterval(() => {
              const x = Math.random() * w;
              const y = Math.random() * h;
              $container.ripples('drop', x, y, 15, 0.03);
            }, 3000);

          } catch (e) {
            console.error(e);
          }
        };

        const img = new Image();
        img.onload = () => {
          // 1. 背景を真っ黒に塗りつぶす
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);

          // 2. 写真と白枠のサイズ計算
          const photoMargin = 15; // 白の余白の太さ
          const maxW = w * 0.65;  // 画面に対する写真の幅の割合
          const maxH = h * 0.65;
          
          const imgRatio = img.width / img.height;
          const frameRatio = maxW / maxH;
          
          let drawW, drawH;
          if (imgRatio > frameRatio) {
            drawW = maxW;
            drawH = maxW / imgRatio;
          } else {
            drawH = maxH;
            drawW = maxH * imgRatio;
          }

          const centerX = w / 2;
          const centerY = h / 2;

          // 3. 白い余白（枠）を描画
          ctx.fillStyle = '#f5f5f5';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; // うっすら影をつける
          ctx.shadowBlur = 20;
          ctx.fillRect(
            centerX - drawW / 2 - photoMargin,
            centerY - drawH / 2 - photoMargin,
            drawW + photoMargin * 2,
            drawH + photoMargin * 2
          );

          // 4. 写真を描画（影を消してから）
          ctx.shadowColor = 'transparent';
          ctx.filter = 'blur(10px) brightness(5%) contrast(170%)';
          ctx.drawImage(img, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
          ctx.filter = 'none';

          // 5. 少し水に沈んでいる質感を出すフィルター
          ctx.fillStyle = 'rgba(40, 50, 60, 0.15)';
          ctx.fillRect(0, 0, w, h);
          applyRipples();
        };

        if (!imageData) {
          drawAmbientOnly();
          applyRipples();
        } else {
          img.src = imageData;
        }
      </script>
    </body>
    </html>
  `;

  const nativeHtml = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        html, body {
          margin: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }
        #ripple-canvas {
          width: 100%;
          height: 100%;
          touch-action: none;
          display: block;
          background: #000;
        }
      </style>
    </head>
    <body>
      <canvas id="ripple-canvas"></canvas>
      <script>
        const imageData = "${base64Image ?? ''}";
        const canvas = document.getElementById('ripple-canvas');
        const ctx = canvas.getContext('2d');
        const ripples = [];

        const state = {
          t: 0,
          w: 0,
          h: 0,
          cx: 0,
          cy: 0,
        };

        const img = new Image();
        let hasPhoto = false;

        const resize = () => {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(window.innerWidth * dpr);
          canvas.height = Math.floor(window.innerHeight * dpr);
          canvas.style.width = window.innerWidth + 'px';
          canvas.style.height = window.innerHeight + 'px';
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          state.w = window.innerWidth;
          state.h = window.innerHeight;
          state.cx = state.w / 2;
          state.cy = state.h / 2;
        };

        const pushRipple = (x, y, amp = 8, speed = 2.0) => {
          ripples.push({ x, y, r: 0, a: 0.35, amp, speed });
        };

        const drawAmbientBase = () => {
          const grad = ctx.createLinearGradient(0, 0, 0, state.h);
          grad.addColorStop(0, '#020a03');
          grad.addColorStop(1, '#001404');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, state.w, state.h);

          ctx.globalAlpha = 0.14;
          for (let i = 0; i < 90; i += 1) {
            const px = Math.random() * state.w;
            const py = Math.random() * state.h;
            const pr = Math.random() * 1.4 + 0.2;
            ctx.beginPath();
            ctx.fillStyle = '#6cae75';
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        };

        const drawPhotoWavy = () => {
          const maxW = state.w * 0.68;
          const maxH = state.h * 0.68;
          const photoMargin = 14;
          const imgRatio = img.width / img.height;
          const frameRatio = maxW / maxH;

          let drawW, drawH;
          if (imgRatio > frameRatio) {
            drawW = maxW;
            drawH = maxW / imgRatio;
          } else {
            drawH = maxH;
            drawW = maxH * imgRatio;
          }

          const px = state.cx - drawW / 2;
          const py = state.cy - drawH / 2;

          ctx.fillStyle = '#f5f5f5';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 18;
          ctx.fillRect(
            px - photoMargin,
            py - photoMargin,
            drawW + photoMargin * 2,
            drawH + photoMargin * 2
          );
          ctx.shadowColor = 'transparent';

          const slice = 3;
          for (let y = 0; y < drawH; y += slice) {
            const srcY = (y / drawH) * img.height;
            const srcH = (slice / drawH) * img.height;
            const worldY = py + y;
            let shift = 0;

            for (let i = 0; i < ripples.length; i += 1) {
              const rp = ripples[i];
              const dist = Math.hypot(state.cx - rp.x, worldY - rp.y);
              const band = Math.abs(dist - rp.r);
              if (band < 85) {
                const fade = 1 - band / 85;
                shift += Math.sin((band / 8) - (state.t * 0.05)) * rp.amp * fade * rp.a;
              }
            }

            ctx.drawImage(
              img,
              0,
              srcY,
              img.width,
              srcH,
              px + shift,
              worldY,
              drawW,
              slice
            );
          }

          ctx.fillStyle = 'rgba(25, 45, 35, 0.14)';
          ctx.fillRect(0, 0, state.w, state.h);
        };

        const drawRipples = () => {
          ctx.lineWidth = 1.6;
          for (let i = ripples.length - 1; i >= 0; i -= 1) {
            const rp = ripples[i];
            rp.r += rp.speed;
            rp.a *= 0.992;

            ctx.strokeStyle = 'rgba(145, 202, 160, ' + (rp.a * 0.7) + ')';
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
            ctx.stroke();

            if (rp.r > Math.max(state.w, state.h) * 1.4 || rp.a < 0.02) {
              ripples.splice(i, 1);
            }
          }
        };

        const draw = () => {
          state.t += 1;
          ctx.clearRect(0, 0, state.w, state.h);
          drawAmbientBase();
          if (hasPhoto) {
            drawPhotoWavy();
          }
          drawRipples();
          requestAnimationFrame(draw);
        };

        const onPointerDown = (event) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          pushRipple(x, y, 9, 2.2);

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'waterTouch' }));
          }
        };

        resize();
        window.addEventListener('resize', resize);
        canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
        pushRipple(state.cx, state.cy, 10, 2.1);
        setInterval(() => {
          pushRipple(state.cx, state.cy, 8, 1.8);
        }, 1800);

        if (imageData) {
          img.onload = () => {
            hasPhoto = true;
            draw();
          };
          img.src = imageData;
        } else {
          draw();
        }
      </script>
    </body>
    </html>
  `;

  const htmlContent = useNativeRipple ? nativeHtml : jqueryHtml;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: '#000' }}
        onMessage={(event) => {
          if (!onWaterTouch) return;

          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload?.type === 'waterTouch') {
              onWaterTouch();
            }
          } catch {
            // no-op
          }
        }}
        scrollEnabled={false} // スクロール禁止
        bounces={false}       // バウンス禁止
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};