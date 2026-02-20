import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface DarkroomSkiaViewProps {
  photoUri: string;
  width: number;
  height: number;
}

export const DarkroomSkiaView: React.FC<DarkroomSkiaViewProps> = ({ photoUri, width, height }) => {
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // 1. ローカルの写真をBase64文字列に変換してHTMLに渡せるようにする
  useEffect(() => {
    const loadBase64 = async () => {
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
      loadBase64();
    }
  }, [photoUri]);

  // 写真の読み込み中はローディングを表示
  if (!base64Image || width === 0 || height === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  // 2. 埋め込むHTML（jquery.ripples を使用）
  const htmlContent = `
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
        const imageData = "${base64Image}";
        
        // Canvasを使って「黒背景 ＋ 白枠 ＋ 写真」を一枚の画像に合成する
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 端末の解像度より少し大きめに設定
        const w = window.innerWidth * 1.2;
        const h = window.innerHeight * 1.2;
        canvas.width = w;
        canvas.height = h;

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
        img.src = imageData;
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: '#000' }}
        scrollEnabled={false} // スクロール禁止
        bounces={false}       // バウンス禁止
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};