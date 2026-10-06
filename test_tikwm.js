async function test() {
  try {
    const fallbackUrl = 'https://www.tiktok.com/@mitnhatshop/video/7669774970737708295';
    const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(fallbackUrl)}&hd=1`);
    const tikwmData = await tikwmRes.json();
    console.log("Success! URL:", tikwmData.data.play);
  } catch(e) {
    console.error(e);
  }
}
test();
