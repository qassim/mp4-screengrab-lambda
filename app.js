const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const config = require('./config')

const AWS = require('aws-sdk');
const _s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const s3 = {
  putObject: (params) => _s3.putObject(params).promise(),
  headObject: (params) => _s3.headObject(params).promise()
}

const targetDir = '/tmp/';
const captureFileSuffix = config.imageSuffix;

exports.handler = async event => {

  const record = event.Records[0].s3
  const params = { Bucket: record.bucket.name, Key: record.object.key };
  const captureFileName = `${record.object.key}${captureFileSuffix}`;

  try {
    await isValidObject(params);
    await downloadSourceVideo(params, `${targetDir}/${record.object.key}`);
    await generateFrameCapture(targetDir, record.object.key, captureFileName)

    const s3Object = {
      Body: readFrameCapture(targetDir, captureFileName),
      Bucket: record.bucket.name,
      Key: captureFileName,
      CacheControl: config.cacheControl
    }

    return await s3.putObject(s3Object)

  } catch (error) {
    throw new Error(error);
  }
};


async function generateFrameCapture(targetDir, key, captureFileName) {
  try {
    await exec(`${ffmpegPath} -ss 00:00:00 -i ${targetDir}/${key} -vframes 1 -q:v 5 ${targetDir}/${captureFileName}`);
  } catch (error) {
    throw new Error(error);
  }
}

async function isValidObject(params) {
  try {
    const headObj = await s3.headObject(params);
    if (headObj.ContentType !== 'video/mp4') throw new Error(`Invalid content type: ${headObj.ContentType}`)
    if (headObj.ContentLength >= config.maxFileSize) throw new Error(`File too large: ${headObj.ContentLength} is >= ${config.maxFileSize}`)

    return true;
  } catch (error) {
    throw new Error(error);
  }
}

function readFrameCapture(targetDir, captureFileName) {
  const capture = fs.readdirSync(targetDir).filter(file => file.indexOf(captureFileName) > -1)

  if (!capture.length > 0) {
    throw new Error(`File ${captureFileName} not found in ${targetDir}`);
  } else {
    return fs.readFileSync(`${targetDir}/${captureFileName}`);
  }
}

function downloadSourceVideo(params, writeDest) {
  return new Promise((resolve, reject) => {
    _s3.getObject(params)
      .createReadStream()
      .pipe(fs.createWriteStream(writeDest))
      .on('close', resolve)
      .on('error', reject);
  });
}
