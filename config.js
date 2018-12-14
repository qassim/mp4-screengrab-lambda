module.exports = {
  ffmpeg: {
    seek: process.env.SEEK_TIME || '00:00:00',
    jpgQuality: process.env.JPG_QUALITY || 5
  },
  imageSuffix: process.env.IMAGE_SUFFIX || '-holding-img.jpg',
  cacheControl: process.env.CACHE_CONTROL || 'max-age 31536000, public, immutable',
  maxFileSize: 1048576 // 10MB in bytes
}