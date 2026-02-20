#!/bin/bash
cd "/Users/dipomdutta/Downloads/typezero 2"
npm run build
cd "/Users/dipomdutta/Downloads/typezero 3"
rm -rf dist
cp -r "/Users/dipomdutta/Downloads/typezero 2/dist" ./dist
zip -r typezero-theme-v8-fixed.zip .
mv typezero-theme-v8-fixed.zip /Users/dipomdutta/Downloads/typezero-theme-v8-fixed.zip
