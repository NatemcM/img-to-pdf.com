# Vendored OpenCV.js

`opencv.js` is a custom CSP-safe build of OpenCV 4.12.0 (core + imgproc modules only).

The stock build from docs.opencv.org calls `new Function()` during embind
initialization, which violates this site's Content-Security-Policy
(`script-src` has `wasm-unsafe-eval` but deliberately NOT `unsafe-eval`).
This build disables all dynamic JS execution.

## Rebuild instructions

Requires Docker. Takes ~20 minutes.

```bash
git clone --depth 1 --branch 4.12.0 https://github.com/opencv/opencv.git
cd opencv

# Restrict the build to the modules the scan feature uses
sed -i.bak "s/^white_list = makeWhiteList.*/white_list = makeWhiteList([core, imgproc])/" \
  platforms/js/opencv_js.config.py

docker run --rm -v "$PWD":/src -w /src emscripten/emsdk:3.1.64 \
  emcmake python3 ./platforms/js/build_js.py build_js \
  --build_wasm --build_flags="-sDYNAMIC_EXECUTION=0"

cp build_js/bin/opencv.js <repo>/static/vendor/opencv.js
```

Verify the result contains no dynamic evaluation before committing:

```bash
grep -c "new Function" static/vendor/opencv.js   # must print 0
```
