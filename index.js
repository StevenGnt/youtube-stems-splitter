#!/usr/bin/env node

const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const argsParser = require('args-parser');
const commandExists = require('command-exists');
const sanitize = require('sanitize-filename');
const youtubedl = require('youtube-dl-exec');

function ensureDemucsIsInPath() {
    if (!commandExists.sync('demucs')) {
        throw new Error('"demucs" command is not available in the PATH.');
    }
}

async function getVideoInfo(url) {
    return await youtubedl(url, { dumpSingleJson: true });
}

async function downloadVideoAudio(url, output) {
    return youtubedl(url, { output, extractAudio: true, audioFormat: 'mp3' });
}

function splitStems(audioFile, outputDirectory) {
    return new Promise((resolve, reject) => {
        exec(
            `demucs "${audioFile}" --mp3 --out="${outputDirectory}"`,
            (error, stdout, stderr) => {
                const failure = error || stderr;

                failure
                    ? reject(failure)
                    : resolve(stdout);
            }
        );
    });
}

async function doTheThing() {
    console.info('Starting script');

    ensureDemucsIsInPath();

    const { url, output } = argsParser(process.argv);

    const tmpDir = path.join(os.tmpdir(), `youtube-stems-splitter-${crypto.randomUUID()}`);

    console.info('Temporary directory:', tmpDir);

    try {
        const { title } = await getVideoInfo(url);
        const safeTitle = sanitize(title);
        const tmpVideoAudioFilePath = path.join(tmpDir, `${safeTitle}.mp3`);
        const outputDirectory = path.join(output || process.cwd(), safeTitle)

        console.info(`Downloading video audio for ${title}`);
        await downloadVideoAudio(url, tmpVideoAudioFilePath);

        console.info('Splitting stems, output in', outputDirectory);
        await splitStems(tmpVideoAudioFilePath, outputDirectory)
    } catch (e) {
        console.error('An error occured', e);
    }

    console.info('Cleaning temporary files');
    fs.rmSync(tmpDir, { recursive: true });
}

doTheThing();
