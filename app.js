const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const fs = require('fs')
const util = require('util');
const exec = util.promisify(require('child_process').exec);

AWS.config.update({ region: 'eu-west-2' });

exports.handler = async (event, context) => {
  const config = event.Records[0].s3
  const params = { Bucket: config.bucket.name, Key: config.object.key };

  const targetDir = '/tmp/';
  const captureFileName = `${config.object.key}-screenshot.jpg`;
  const destFileName = `${config.object.key}-holding-image.jpg`;

  try {
    await downloadObject(params, `${targetDir}/${config.object.key}`);
    await generateFrame(targetDir, config.object.key, captureFileName)

    const s3Object = {
      Body: readData(targetDir, captureFileName),
      Bucket: config.bucket.name,
      Key: destFileName
    }

    return await s3.putObject(s3Object).promise()

  } catch (error) {
    throw new Error(error);
  }
};


function readData(targetDir, captureFileName) {
  const capture = fs.readdirSync(targetDir).filter(file => file.indexOf(captureFileName) > -1)

  if (!capture.length > 0) {
    throw new Error(`File ${captureFileName} not found in ${targetDir}`);
  } else {
    return fs.readFileSync(`${targetDir}/${captureFileName}`);
  }
}

async function generateFrame(targetDir, key, captureFileName) {
  try {
    await exec(`${ffmpegPath} -i ${targetDir}/${key} -ss 00:00:00 -vframes 1 -q:v 20 ${targetDir}/${captureFileName}`);
  } catch (error) {
    throw new Error(error);
  }
}

function downloadObject(params, writeDest) {
  return new Promise((resolve, reject) => {
    s3.getObject(params)
      .createReadStream()
      .pipe(fs.createWriteStream(writeDest))
      .on('close', () => {
        resolve(writeDest)
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}