# Image Resize Service - AWS Serverless

A serverless image resizing service with full caching features, CDN support, and multi-format image support.

## 🎯 Features

✅ **API Endpoint**: `https://domain/resize/path/to/image.jpg?width=100&height=100`  
✅ **Auto Resize**: Automatically resize images by width/height
✅ **Smart Caching**: Cache resized images on S3
✅ **CDN Support**: CloudFront distribution for high performance
✅ **Multi-format**: Supports JPG, PNG, WebP
✅ **IaC**: Uses Serverless Framework

## 🏗️ Architecture

```
User → CloudFront (CDN) → API Gateway → Lambda Function → S3
          │                                                   │
          └─────────── Cache Hit ──────────────────────────┘
```

### Components:
- **Lambda**: Handles image resizing with Sharp
- **S3**: Stores original and resized images
- **CloudFront**: CDN for caching and acceleration
- **API Gateway**: REST API endpoint

## 📦 Prerequisites

```bash
# Install Node.js 18+
node --version

# Install Serverless Framework
npm install -g serverless

# Configure AWS credentials
aws configure
```

## 🚀 Deployment Steps

### 1. Clone và Install Dependencies

```bash
# Create project directory
mkdir image-resize-service
cd image-resize-service

# Copy all files (handler.ts, serverless.yml, package.json, tsconfig.json)

# Install dependencies
npm install
```

### 2. Deploy to AWS

```bash
# Deploy to dev environment
npm run deploy

# Deploy to production
serverless deploy --stage prod
```

### 3. Upload Test Images

```bash
# Get bucket name from deployment output
aws s3 cp test-image.jpg s3://image-resize-service-images-dev/test-image.jpg
aws s3 cp sample.png s3://image-resize-service-images-dev/sample.png
```

## 🧪 Testing

### Via API Gateway (Direct)
```bash
# Get API URL from deployment output
curl "https://xxxx.execute-api.us-east-1.amazonaws.com/dev/resize/test-image.jpg?width=200&height=200"
```

### Via CloudFront (CDN - Recommended)
```bash
# Get CloudFront URL from deployment output
curl "https://xxxx.cloudfront.net/resize/test-image.jpg?width=300&height=300"
```

### Example URLs:
```
# Resize by width only
https://your-cloudfront-domain.net/resize/test-image.jpg?width=500

# Resize by height only
https://your-cloudfront-domain.net/resize/test-image.jpg?height=300

# Resize by both
https://your-cloudfront-domain.net/resize/test-image.jpg?width=400&height=400
```

## 📊 Performance

- **First request (cache miss)**: ~1-2s (resize + cache)
- **Cached requests**: ~50-100ms (S3 cache)
- **CDN cached**: ~10-20ms (CloudFront edge)

Check `X-Cache` header:
- `MISS`: First time, image resized
- `HIT`: Served from cache

## 🔧 Configuration

### Environment Variables (in serverless.yml)
- `BUCKET_NAME`: Original images bucket
- `CACHE_BUCKET`: Resized images cache bucket

### Limits
- Max dimension: 4000px
- Max Lambda memory: 1024MB
- Max Lambda timeout: 30s

## 📝 API Response Headers

```
Content-Type: image/jpeg or image/png
Cache-Control: public, max-age=31536000
X-Cache: HIT or MISS
```

## 🛠️ Troubleshooting

### Image not found (404)
```bash
# Check if image exists in S3
aws s3 ls s3://image-resize-service-images-dev/
```

### Lambda timeout
```bash
# Check logs
serverless logs -f resize -t
```

### Invalid format
Ensure image is JPG, PNG, or WebP format.

## 🗑️ Cleanup

```bash
# Remove all resources
npm run remove

# Or
serverless remove
```

## 📚 Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18
- **Image Processing**: Sharp
- **AWS Services**: Lambda, S3, CloudFront, API Gateway
- **IaC**: Serverless Framework
