import ytDlp from 'yt-dlp-exec';
async function test() {
  try {
    const info = await ytDlp('https://www.tiktok.com/@mitnhatshop/video/7669774970737708295', {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificates: true,
    });
    console.log("Success! URL:", info.url || (info.requested_downloads && info.requested_downloads[0].url));
  } catch(e) {
    console.error(e);
  }
}
test();
