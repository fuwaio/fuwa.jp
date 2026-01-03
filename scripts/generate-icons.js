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
        // 背景色のベース画像を作成し、その上にリサイズしたロゴを合成します
        const logo = await sharp('public/favicon.svg')
            .resize(300, 300)
            .toBuffer();

        await sharp({
            create: {
                width: 1200,
                height: 630,
                channels: 3,
                background: bg
            }
        })
            .composite([{ input: logo, gravity: 'center' }])
            .png()
            .toFile('public/ogp.png');

        console.log('✅ ogp.png generated');

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

generate();