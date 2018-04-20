yarn build
aws s3 sync --acl=public-read build/ s3://visa.poigraem.ru/
aws cloudfront create-invalidation --distribution-id E38PCOZLGS7SO9 --paths "/*"