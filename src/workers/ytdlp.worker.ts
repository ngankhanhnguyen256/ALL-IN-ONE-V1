// @ts-ignore
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.mjs";

let pyodide: any = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, url } = event.data;

  if (type === "INIT") {
    try {
      self.postMessage({ type: "STATUS", message: "Đang nạp lõi Pyodide (WebAssembly)..." });
      pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
      });
      self.postMessage({ type: "STATUS", message: "Đang cài đặt thư viện yt-dlp..." });
      await pyodide.loadPackage(["micropip", "ssl"]);
      const micropip = pyodide.pyimport("micropip");
      await micropip.install("yt-dlp");

      self.postMessage({ type: "READY" });
    } catch (error) {
      self.postMessage({ type: "ERROR", error: error.message });
    }
  }

  if (type === "EXTRACT") {
    try {
      self.postMessage({ type: "STATUS", message: "Đang phân tích link video (yt-dlp)..." });

      const pythonCode = `
import urllib.request
import urllib.parse
import json
from yt_dlp import YoutubeDL
import js

# Monkey patch urllib to bypass CORS using our own backend proxy
original_urlopen = urllib.request.urlopen

def patched_urlopen(url, data=None, timeout=None, *args, **kwargs):
    req_url = url.get_full_url() if isinstance(url, urllib.request.Request) else url
    if isinstance(req_url, str) and req_url.startswith('http'):
        if '/api/proxy?url=' not in req_url:
            # Using our local backend proxy to wrap the target URL
            proxy_url = js.self.location.origin + '/api/proxy?url=' + urllib.parse.quote(req_url)
            if isinstance(url, urllib.request.Request):
                headers = dict(url.headers)
                if 'Host' in headers:
                    del headers['Host']
                url = urllib.request.Request(
                    proxy_url, 
                    data=url.data, 
                    headers=headers, 
                    method=url.get_method()
                )
            else:
                url = proxy_url
    return original_urlopen(url, data=data, timeout=timeout, *args, **kwargs)

urllib.request.urlopen = patched_urlopen

ydl_opts = {
    'format': 'best[ext=mp4]/best',
    'quiet': True,
    'no_warnings': True,
    'extract_flat': False,
}

try:
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info('${url}', download=False)
        result = {
            'url': info.get('url'),
            'title': info.get('title', 'Video'),
            'duration': info.get('duration')
        }
        output = json.dumps(result)
except Exception as e:
    output = json.dumps({'error': str(e)})

output
`;

      const resultJson = await pyodide.runPythonAsync(pythonCode);
      const result = JSON.parse(resultJson);

      if (result.error) {
         throw new Error(result.error);
      }

      self.postMessage({ type: "SUCCESS", data: result });
    } catch (error) {
      self.postMessage({ type: "ERROR", error: error.message });
    }
  }
};
