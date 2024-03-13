# Tdarr_Plugins_DoVi

Tdarr plugins expanded with the ability to transcode Dolby Vision videos and remux them into MP4s compatible with LG TVs.

## Why

LG WebOS doesn't support playing back Dolby Vision content from mkv containers, only from mp4. This could be simply solved by remuxing with `ffmpeg` using the `-strict unofficial` flag as of version 6.0. But I also wanted to downscale the videos to 1080p to save space as I don't care about 4k, but most Dolby Vision content is only available in 4k.

## How it works

One cannot simply transcode the video stream to achieve this like with SDR content (or with HDR10 for that matter).

For Dolby Vision profile 7 is not supported at the moment, for profile 4, 5 and 8 the process is the following:

```mermaid
graph TD
A[Input File] --> B[Extract raw HEVC stream]
B --> C[Extract Dolby Vision RPU]
B --> D[Transcode video stream]
C & D --> E[Inject Dolby Vision RPU into transcoded video]
E --> F[Package raw stream into MP4]
A & F --> G[Remux with audio from original file]
```

Basically the Dolby Vision metadata has to be extracted first, then added back onto the transcoded video stream. This process can be done with profile 7 as well, it just involved some extra steps, but most content is not in profile 7.

This process is based on the excellent tool and writeup by [@gacopl](https://github.com/gacopl): [dvmkv2mp4](https://github.com/gacopl/dvmkv2mp4)

### Extracting the stream

The [Extract Streams](FlowPluginsTs/CommunityFlowPlugins/ffmpegCommand/ffmpegCommandExtractStreams/1.0.0/index.ts) plugin is responsible for this step. It will extract the HEVC stream and save it in the working directory with the same name as the original file but with `.hevc` extension. It will also extract all ASS and SRT subtitles and save them as `.srt` files in the `sub_streams` folder in the working directory for later use. The subtitle files will be annotated with their metadata (language, forced, sdh, default) that will be picked up by Jellyfin. The plugin also supports filtering subtitles based on language.

**Important:** to reorder streams before this plugin and have the video stream as the last stream. This is because all the subtitle streams have their own outputs defined in the middle of the ffmpeg command. Tdarr handles streams in order when building the ffmpeg command parameters and the video stream if not the last will not be matched to the proper output.

<details>
<summary>Example command</summary>

```sh
tdarr-ffmpeg -y \
    -i /path/to/input.mkv \
    -map 0:3 -c:s:0 copy /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/sub_streams/2.hun.default.forced.srt \
    -map 0:4 -c:s:0 copy /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/sub_streams/3.hun.srt \
    -map 0:5 -c:s:0 copy /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/sub_streams/4.eng.srt \
    -map 0:6 -c:s:0 copy /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/sub_streams/5.eng.sdh.srt \
    -map 0:0 -c:v copy -bsf:v hevc_mp4toannexb /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710332450149/input.hevc
```
</details>

### Extracting Dolby Vision RPU

The [Extract DoVi RPU](FlowPluginsTs/CommunityFlowPlugins/video/extractDoViRpu/1.0.0/index.ts) plugin is responsible for extracting Dolby Vision RPU data. To achieve this [dovi_tool](https://github.com/quietvoid/dovi_tool) is needed. The plugin will extract the RPU data from the HEVC stream and save it to the working directory as a `.rpu.bin` file for later use.

<details>
<summary>Example command</summary>

```sh
/usr/local/bin/dovi_tool \
    -c \    # Crop, remove letterbox
    -m 2 \  # Mode 2, converts the RPU to be profile 8.1 compatible.
    extract-rpu /shows/Transcode/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710332450149/input.hevc
    -o /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/dovi_tool/input.rpu.bin
```
</details>

### Transcoding video stream

I'm using Intel Kaby Lake CPUs (7th gen) to transcode video. There's one caveat I discovered here: while regular videos have no issues playing back if transcoded using quality based rate control methods supported by Intel Quicksync (CQP, ICQ) ([ffmpeg documentation](https://ffmpeg.org/ffmpeg-codecs.html#Ratecontrol-Method)) when used on Dolby Vision content it will result in a playback error. Thus for this purpose I have to fall back on good old VBR ratecontrol. I found that Netflix is using ~5Mbps for streaming 1080p Dolby Vision content, so I've set the same.

<details>
<summary>Example command</summary>

```sh
tdarr-ffmpeg -y \
    -hwaccel_output_format qsv -init_hw_device qsv:hw_any,child_device_type=vaapi -hwaccel qsv
    -i /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710332450149/input.hevc \
    -map 0:0 -c:0 hevc_qsv \
    -qp 22 \    # This is ignored by the hevc_qsv encoder, but tdarr puts it in either way
    -preset slow \  # Slow preset provides a good enough quality while not taking 3 and a half decades
    -vf scale_qsv=1920:-1 \ # Set resolution and calculate height to handle 16:9 and letterbox videos as well
    -pix_fmt + \    # Keep the same pixel format as the input
    -look_ahead_depth 100 -rdo 1 -mbbrc 1 -b_strategy 1 -adaptive_i 1 -adaptive_b 1 \   # QSV specific parameters, some of these are probably ignored when using VBR
    -b:v 5M \   # Target an average of 5M bitrate
    /shows/Transcode/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710332520936/input.hevc
```
</details>

### Injecting RPU into the transcoded stream

The [Inject DoVi RPU](FlowPluginsTs/CommunityFlowPlugins/video/injectDoViRpu/1.0.0/index.ts) plugin is responsible for injecting the RPU data back into the video stream. The process is the reverse of [extracting Dolby Vision RPU](#extracting-dolby-vision-rpu) using [dovi_tool](https://github.com/quietvoid/dovi_tool) again. Inject the previously saved RPU data from the `.rpu.bin` file, injects it into the transcoded stream from the previous step and save the resulting video stream as an `.rpu.hevc` file in the workspace.

<details>
<summary>Example command</summary>

```sh
/usr/local/bin/dovi_tool \
    -i /shows/Transcode/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710332520936/input.hevc \ # Transcoded video from previous step
    --rpu-in /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/dovi_tool/input.rpu.bin \
    extract-rpu /shows/Transcode/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710332450149/input.hevc \
    -o /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710333079164/input.rpu.hevc
```
</details>

### Package HEVC stream in MP4

For better compatibility I use [MP4Box](https://wiki.gpac.io/MP4Box/MP4Box/) to package the stream into an mp4 container. Anecdotally MP4Box handles this better than ffmpeg, at least at the time of writing. This is handled by the [Package DoVi mp4](FlowPluginsTs/CommunityFlowPlugins/video/packageDoViMp4/1.0.0/index.ts) plugin. This resulting mp4 will only have the video stream in it, it will be used in the next step along with the audio streams from the input file to remux into the final form.

<details>
<summary>Example command</summary>

```sh
/usr/local/bin/MP4Box \
    -add /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710333079164/input.rpu.hevc:dvp=8.1:xps_inband:hdr=none \
    -tmp /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710333091979/tmp \
    -brand mp42isom \
    -ab dby1 \
    -no-iod \
    -enable 1 \
    /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710333091934/input.rpu.hevc.mp4
```
</details>

### Remuxing into the final MP4

The [Remux DoVi MP4](FlowPluginsTs/CommunityFlowPlugins/ffmpegCommand/ffmpegCommandRemuxDoviMp4/1.0.0/index.ts) plugin is responsible for creating the right ffmpeg arguments to mux the correct streams together. The plugin will take the video stream from the mp4 file created in the previous step and mux it together with the audio streams from the original file. There are a couple of extra steps involved here: TrueHD audio streams are dropped as ffmpeg support for them in mp4 containers is experimental and I couldn't get it to work properly. Also metadata is copied from the original file.

Stream titles are handled differently in mp4 containers than in mkv, to deal with this the original audio stream titles are mapped to the `handler_name` metadata tag in the output file as Jellyfin [will use that](https://github.com/jellyfin/jellyfin/blob/v10.8.13/MediaBrowser.MediaEncoding/Probing/ProbeResultNormalizer.cs#L703-L711) to read stream titles as a fallback.

Chapter data is copied as part of the metadata, but [chapter titles are dropped](https://stackoverflow.com/a/60374650) as it will result in a data stream in the output file which I found to cause playback issues.

<details>
<summary>Example command</summary>

```sh
tdarr-ffmpeg -y \
    -i /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710333091934/input.rpu.hevc.mp4 \
    -i /path/to/input.mkv \ # Original file
    -map 0:0 -c:0 copy \    # Copy video from the previous mp4
    -map 1:a -c:a copy \    # Copy audio from original file
    -map_metadata 1 \       # Copy metadata from original file
    -map_metadata:c -1 \    # Drop chapter titles
    -dn \                   # Drop data streams
    -movflags +faststart \  # Add fast start flag, not strictly necessary
    -strict unofficial \    # Dolby Vision support is behind this flag
    /temp/tdarr-workDir-node-J2D7FNt5O-worker-open-ox-ts-1710332442638/1710333113706/input.mp4
```
</details>

## Other plugins

### Parse file with Radarr or Sonarr

The [Parse file with Radarr or Sonarr](FlowPluginsTs/CommunityFlowPlugins/tools/parseFileWithRadarrOrSonarr/1.0.0/index.ts) plugin is used to get additional info about the input file from Sonarr / Radarr. The library is handled by these two, so it's safe to assume they will have additional info about the files.

The plugin will save the info in a file named `arr.json` in the working directory.

```json
{
  "fileId": 1234,
  "originalPath": "/path/to/input.mkv",
  "releaseGroup": "AWESOMERLS",
  "sceneName": "My.Input.Movie.SceneName.2042.1080p.BluRay.x264-AWESOMERLS"
}
```

#### Configuration

Use library variable to provide configuration data for this plugin.

```
arr_api_key: y42k7kjg5f3htd6afktixqd8e5he2n84
arr_host: http://radarr.media.svc.cluster.local:7878
arr: radarr
```

These can be referenced in the plugin input like this: `{{{args.userVariables.library.arr_host}}}`

### Wait for rename from Radarr or Sonarr

The [Wait for rename from Radarr or Sonarr](FlowPluginsTs/CommunityFlowPlugins/tools/getNewPathFromRadarrOrSonarr/1.0.0/index.ts) plugin is responsible for checking in with Sonarr or Radarr to check if the transcoded file was imported properly. The purpose of this is to set the output path of the plugin flow in Tdarr to the path *arr imported the file to as they are handling naming for library files, Tdarr has no way of knowing the resulting filename. It will wait until the path *arr is reporting for the file is changed from the original path was, as read from `arr.json`.

It will try a certain number of times and wait for a set time between tries, both can be configured. It also support path mapping as the path known to *arr might be different than what Tdarr is using, this can be configured using the `path_mapping_from` (path used by *arr) and `path_mapping_to` (path used by Tdarr) parameters.

Same configuration recommendation goes as for [Parse file with Radarr or Sonarr](#configuration).

### Move Folder Content to Blachole

The [Move Folder Content to Blachole](FlowPluginsTs/CommunityFlowPlugins/file/moveToBlackhole/1.0.0/index.ts) plugin is responsible for moving the given file and previously extracted subtitle streams from `sub_streams` into the specified blackhole folder. It will also grab all files matching the specified extension (`.srt` for example) in the original folder and copy those to the blackhole folder as well. This is important in the case of handling mp4 files for example which would loose the associated external subtitles unless copied.

It will also change the release group on the file to `TDARR`, this is useful for making sure *arr always imports these files by setting it with a higher custom score.

The goal of this plugin is to put all the appropriate content in a folder watched by a blackhole downloader of Sonarr or Radarr.

For this to work the following is needed on *arr side:

1. A blackhole downloader watching the folder set as the output folder of this plugin
1. A custom format matching the `TDARR` release group
1. The Tdarr custom format configured with a positive score value in the quality profile used

When all of this is configured, Tdarr will move the final file and appropriate additional files into the blackhole folder, *arr will import it like it was freshly downloaded and place it in the library with the proper naming scheme.

### Check HDR type

The [Check HDR type](FlowPluginsTs/CommunityFlowPlugins/video/checkHDRType/1.0.0/index.ts) plugin is an extended version of the original [Check HDR Video](FlowPluginsTs/CommunityFlowPlugins/video/checkHdr/1.0.0/index.ts) plugin, supporting determining the HDR standard used by the file, not just if it is HDR or not.

Supports: Dolby Vision, HDR10+, HDR10 and SDR.

### Check DoVi Profile

The [Check DoVi Profile](FlowPluginsTs/CommunityFlowPlugins/video/checkDoViProfile/1.0.0/index.ts) plugin is responsible for determining the Dolby Vision profile of the given file. As mentioned in the [How it works](#how-it-works) section this setup doesn't support profile 7, so it is important to determine the profile used by the file.
Check DoVi profile

## Remuxing Dolby Vision content without transcoding

The [Remux DoVi MP4](FlowPluginsTs/CommunityFlowPlugins/ffmpegCommand/ffmpegCommandRemuxDoviMp4/1.0.0/index.ts) plugin can also handle remuxing an input mkv file into a playable mp4 file without transcoding the video. Use the [Set Container](FlowPluginsTs/CommunityFlowPlugins/ffmpegCommand/ffmpegCommandSetContainer/1.0.0/index.ts) plugin before to set the container to mp4 then this plugin to remux. Same as [previously](#remuxing-into-the-final-mp4) TrueHD audio streams are dropped and metadata is copied and mapped for audio streams.

I recommend to [extract](#extracting-the-stream) subtitle streams beforehand to keep them using the [blackhole](#move-folder-content-to-blachole) plugin.

<details>
<summary>Example command</summary>

```sh
tdarr-ffmpeg -y \
    -i /path/to/input.mkv \
    -map 0:0 -c:0 copy \
    -map 0:1 -c:1 copy \
    -map 0:2 -c:2 copy \
    -map_metadata 0 \
    -map_metadata:c -1 \
    -bsf:v hevc_mp4toannexb \
    -dn \
    -movflags +faststart \
    -strict unofficial \
    /temp/tdarr-workDir-node-J2D7FNt5O-worker-mean-moose-ts-1710205452909/1710205516754/input.mp4
```
</details>

## Using this in Tdarr

### Getting plugins from this repo

In order the use the plugins from this repository simply change the `Community plugins repository` option to `https://github.com/andrasmaroy/Tdarr_Plugins_DoVi/archive/master.zip` in the Tdarr options tabs then restart the Tdarr server then the nodes as well. On startup the server will pull the plugins from the given repository and the nodes when starting will pull the plugins from the server. Check the server logs before restarting the nodes to make sure the server finished updating the plugins.

### Using dovi_tool and MP4Box

`MP4Box` and `dovi_tool` are not part of the official Tdarr image, to solve this I've [extended](docker/Dockerfile) the official image with these tools. It is available at [packages](https://github.com/andrasmaroy/Tdarr_Plugins_DoVi/pkgs/container/tdarr_node).

### Tdarr flow

Everything discussed above comes together in a [Tdarr flow](https://docs.tdarr.io/docs/plugins/flow-plugins/basics). My setup is available exported as [flow.json](flow.json).

The flow on the high level is setup like so:

```mermaid
flowchart LR
   a[Input File] --> IsHDR{IsHDR}
   IsHDR --> |Dolby Vision| DVR
   IsHDR --> |HDR10| codec
   IsHDR --> |HDR| codec
   subgraph Dolby Vision
   DVR{Resolution}
   container{Container}
   DVR --> |At or below 1080p| container
   DVR --> |Above 1080p| Transcode --> Remux
   container --> |mkv| Remux
   end
   subgraph Regular
   codec{Is HEVC}
   codec --> |Yes| res{Resolution}
   codec --> |No| tc[Transcode]
   res --> |Above 1080p| tc
   end
   res --> |At or below 1080p| skip[Nothing to do]
   container --> |mp4| skip
   Remux & tc --> blackhole[Move to blackhole]
```

## References

* [dvmkv2mp4](https://github.com/gacopl/dvmkv2mp4) - Convert any Dolby Vision/HDR10+ MKV to MP4 that runs on many devices
* [dovi_tool](https://github.com/quietvoid/dovi_tool)
* [MP4Box](https://wiki.gpac.io/MP4Box/MP4Box/)
* [Discard data stream from container using ffmpeg](https://stackoverflow.com/a/60374650) - chapter titles creating a data stream in mp4s, how to drop that
* Couple of reddit posts:
    * How HDR works [post 1](https://old.reddit.com/r/ffmpeg/comments/s3cfsd/is_this_ffmpeg_command_retaining_hdr_4k_hevc_hdr/hslgohc/), [post 2](https://old.reddit.com/r/ffmpeg/comments/rv3sm5/downscaling_4k_hdr_10bit_to_1080p_but_maintaining/hr4omtp/), [post 3](https://old.reddit.com/r/ffmpeg/comments/wgols5/how_to_downscale_from_proper_4k_to_1080p_keeping/)
    * [Dolby Vision from MKV to MP4 using ffmpeg and mp4muxer](https://old.reddit.com/r/ffmpeg/comments/qe7oq1/dolby_vision_from_mkv_to_mp4_using_ffmpeg_and/)
    * [Trigger Radar to Rename after Transcode](https://old.reddit.com/r/Tdarr/comments/wlrksm/trigger_radar_to_rename_after_transcode/) - Setting up blackhole downloader in *arr in conjunction with Tdarr
    * [Convert DV Profile 7 to 8.1 using dovi_tool, mp4box and ffmpeg](https://old.reddit.com/r/ffmpeg/comments/11gu4o4/convert_dv_profile_7_to_81_using_dovi_tool_mp4box/jn5gman/)
* [Encoding UHD 4K HDR10 and HDR10+ Videos](https://codecalamity.com/encoding-uhd-4k-hdr10-videos-with-ffmpeg/#saving-dolby-vision) - Detailing the process of downscaling HDR videos
* [ffmpeg and hevc_qsv Intel Quick Sync settings](https://nelsonslog.wordpress.com/2022/08/22/ffmpeg-and-hevc_qsv-intel-quick-sync-settings/) - Quality settings for Quick Sync
* [ffmpeg Quick Sync documentation](https://trac.ffmpeg.org/wiki/Hardware/QuickSync)

<details>
<summary>Original readme</summary>

# Tdarr_Plugins

Visit the docs for more info:
https://docs.tdarr.io/docs/plugins/basics


### Development

Make sure NodeJS v16 is installed

Install dependencies:

`npm install`

Run ESLint:

`npm run lint:fix`

Check plugins using some extra custom rules:

`npm run checkPlugins`

Run tests:

`npm run test`


# Steps to write a Tdarr Flow plugin:

1. Clone this repo
2. Set env variable `pluginsDir` to the location of the plugins repo and run Tdarr Server and Node. E.g. `export pluginsDir=C:/Tdarr_Plugins`
3. Browse the typescript plugins here https://github.com/HaveAGitGat/Tdarr_Plugins/tree/master/FlowPluginsTs/CommunityFlowPlugins and make edits locally or create a new one locally: 
4. Make sure typescript is intalled with `npm i -g typescript` then run `tsc` to compile the changes.
5. Refresh the browser and Tdarr will pick up the changes

</details>
