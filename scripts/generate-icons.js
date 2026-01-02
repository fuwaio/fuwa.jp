import sharp from 'sharp';

async function generate() {
    const bg = { r: 0, g: 2, b: 5 }; // サイト背景色 #000205

    try {
        // 1. Apple Touch Icon (180x180) の生成
        await sharp('public/favicon.svg')
            .resize(180, 180)
            .flatten({ background: bg })
            .png()
            .toFile('public/apple-touch-icon.png');
        console.log('✅ apple-touch-icon.png generated');

        // 2. OGP画像 (1200x630) の生成
        // ロゴを中央に配置するため、まずリサイズしてからextend（余白追加）します
        await sharp('public/favicon.svg')
            .resize(300, 300) // 中央に置くロゴのサイズ
            .extend({
                top: 165,    // (630 - 300) / 2
                bottom: 165,
                left: 450,   // (1200 - 300) / 2
                right: 450,
                background: bg
            })
            .png()
            .toFile('public/ogp.png');
        console.log('✅ ogp.png generated');

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

generate();