const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');


const argsParser = require('args-parser');
const youtubedl = require('youtube-dl-exec');

function ensureDemucsIsInPath() {
    // @todo
}

async function getVideoInfo(url) {
    return await youtubedl(url, { dumpSingleJson: true });
}

async function downloadVideoAudio(url, output) {
    return youtubedl(url, {
        output,
        extractAudio: true,
        audioFormat: 'mp3',
    });
}

// @todo Use properly output directory
// @todo Use title to name files and/or directory
function splitStems(audioFile, outputDirectory, title) {
    return new Promise((resolve, reject) => {
        exec(`demucs "${audioFile}"`, (error, stdout, stderr) => {
            const failure = error || stderr;

            failure
                ? reject(failure)
                : resolve(stdout);
        });
    });
}

async function cleanTemporaryFiles(tmpDirectory) {
    return fs.rmSync(tmpDirectory, { recursive: true });
}

async function doTheThing() {
    console.info('Starting script');
    ensureDemucsIsInPath();
    const { url, output } = argsParser(process.argv);

    const outputDirectory = output || process.cwd();

    const tmpDir = path.join(os.tmpdir(), `youtube-stems-splitter-${crypto.randomUUID()}`);

    console.info('Temporary directory:', tmpDir);

    try {
        const { title, id } = await getVideoInfo(url);

        const tmpVideoAudioFilePath = path.join(tmpDir, `${id}.mp3`);

        console.info('Downloading video audio');
        await downloadVideoAudio(url, tmpVideoAudioFilePath);

        console.info('Splitting stems, output in', outputDirectory);
        await splitStems(tmpVideoAudioFilePath, outputDirectory, title)
    } catch (e) {
        console.error('An error occured', e);
    }

    console.info('Cleaning temporary files');
    await cleanTemporaryFiles(tmpDir);
}

doTheThing();
