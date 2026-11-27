$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frames = Join-Path $root "frames"
New-Item -ItemType Directory -Force -Path $frames | Out-Null

$ffmpeg = "C:\Users\Private\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.1-full_build\bin\ffmpeg.exe"
$ffprobe = "C:\Users\Private\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.1-full_build\bin\ffprobe.exe"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $ffmpeg)) { throw "ffmpeg was not found." }
if (-not (Test-Path $chrome)) { throw "Chrome was not found." }

$style = @'
html, body { margin: 0; width: 1920px; height: 1080px; background: #101318; color: #f2f4f7; font-family: "Segoe UI", sans-serif; }
.wrap { box-sizing: border-box; width: 1920px; height: 1080px; padding: 80px 88px; display: flex; flex-direction: column; justify-content: center; }
.kicker { color: #8eb4ff; font-size: 20px; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 22px; }
h1 { font-size: 64px; line-height: 1.08; font-weight: 650; letter-spacing: -1.2px; margin: 0; max-width: 1600px; }
.lede { margin-top: 22px; font-size: 30px; line-height: 1.35; color: #c5ccd6; max-width: 1500px; }
.row { display: flex; gap: 28px; margin-top: 56px; }
.panel { flex: 1; background: #1a1f27; border: 1px solid #2e3644; border-radius: 14px; padding: 32px 32px 28px; }
.panel h2 { margin: 0 0 12px; font-size: 32px; font-weight: 650; }
.panel p { margin: 0; font-size: 24px; line-height: 1.4; color: #c5ccd6; }
.stepno { color: #8eb4ff; font-size: 22px; letter-spacing: 0.08em; margin-bottom: 14px; }
.flow { display: flex; align-items: stretch; gap: 18px; margin-top: 48px; }
.node { flex: 1; min-height: 200px; background: #1a1f27; border: 1px solid #2e3644; border-radius: 14px; padding: 32px; box-sizing: border-box; }
.node strong { display: block; font-size: 32px; margin-bottom: 10px; }
.node span { display: block; font-size: 22px; line-height: 1.35; color: #c5ccd6; }
.arrow { width: 120px; flex: none; display: flex; flex-direction: column; justify-content: center; text-align: center; color: #8eb4ff; font-size: 40px; }
.arrow small { display: block; color: #a8b0bc; font-size: 16px; margin-top: 6px; }
.note { margin-top: 48px; font-size: 26px; line-height: 1.4; color: #c5ccd6; max-width: 1600px; }
table { width: 100%; border-collapse: collapse; margin-top: 36px; font-size: 26px; }
th { text-align: left; color: #a8b0bc; font-weight: 600; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 18px 14px; }
td { padding: 18px; border-top: 1px solid #2e3644; }
tr.called td { background: #17211c; }
tr.failed td { background: #24181a; }
.tag { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 20px; }
.tag.wait { color: #e2c27a; background: #2a2418; }
.tag.ok { color: #9dccb0; background: #173024; }
.tag.bad { color: #e3a3a8; background: #3a2024; }
.metrics { display: flex; gap: 28px; margin-top: 64px; }
.metric { flex: 1; background: #1a1f27; border: 1px solid #2e3644; border-radius: 14px; padding: 36px 32px; }
.metric b { display: block; font-size: 54px; letter-spacing: -1px; margin-bottom: 8px; }
.metric span { font-size: 24px; color: #c5ccd6; line-height: 1.35; }
.when { display: flex; gap: 28px; margin-top: 42px; }
.when .panel { min-height: 230px; }
ol { margin: 28px 0 0; padding-left: 32px; }
li { font-size: 26px; line-height: 1.45; color: #e8eaed; margin: 8px 0; }
code { font-family: Consolas, monospace; font-size: 0.92em; color: #d5e2ff; }
'@

function Write-Slide([string]$name, [string]$body) {
  $html = @"
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
$style
</style></head>
<body><div class="wrap">
$body
</div></body></html>
"@
  $path = Join-Path $frames "$name.html"
  [System.IO.File]::WriteAllText($path, $html, [System.Text.UTF8Encoding]::new($false))
  return $path
}

$slides = @(
  @{
    Name = "01-system"
    Speech = "This system places the calls. It is not a website. The phone numbers sit in n eight n. The agent and the guardrails sit in ElevenLabs. The South African number people see sits in Twilio. The workflow reads a number, uses it to place the call, then tells the table that this number has been called."
    Body = @'
<div class="kicker">Outbound calling system</div>
<h1>Read a number. Place the call. Mark it called.</h1>
<p class="lede">n8n holds the list. ElevenLabs holds the agent. Twilio holds the line people see.</p>
<div class="row">
  <div class="panel"><h2>n8n</h2><p>Reads pending rows from the Call queue, asks for the dial, then writes the row as called.</p></div>
  <div class="panel"><h2>ElevenLabs</h2><p>Runs the agent. The voice, the script, and the guardrails stay here.</p></div>
  <div class="panel"><h2>Twilio</h2><p>The South African number. It is imported into ElevenLabs once, then used for every call.</p></div>
</div>
'@
  },
  @{
    Name = "02-loop"
    Speech = "There are three steps. Step one is read. n eight n loads rows where the status is pending. Step two is use. n eight n sends that phone number to ElevenLabs. ElevenLabs dials it on the Twilio number, and the agent talks. Step three is write. n eight n sets that same row to called, and stores the conversation id and the Twilio call id. The next run skips any row that is already called."
    Body = @'
<div class="kicker">The loop</div>
<h1>Three steps, then the next number.</h1>
<div class="row">
  <div class="panel"><div class="stepno">01</div><h2>Read</h2><p>Load rows whose status is pending. If the queue is empty, the run stops.</p></div>
  <div class="panel"><div class="stepno">02</div><h2>Use</h2><p>Send the phone number to ElevenLabs. ElevenLabs dials it through Twilio.</p></div>
  <div class="panel"><div class="stepno">03</div><h2>Write</h2><p>Set that row to called. Store the conversation id, the call id, and the time.</p></div>
</div>
<p class="note">A row marked called is left alone the next time the workflow runs.</p>
'@
  },
  @{
    Name = "03-path"
    Speech = "n eight n does not ask Twilio to start the call. You connect the Twilio number to ElevenLabs one time, using the Twilio account S I D and the auth token. After that, each call is a single request from n eight n to ElevenLabs. The voice, the script, and the guardrails stay in ElevenLabs."
    Body = @'
<div class="kicker">How a call is placed</div>
<h1>One request leaves n8n.</h1>
<div class="flow">
  <div class="node"><strong>n8n</strong><span>Sends the number, the name, and the offer.</span></div>
  <div class="arrow">&rarr;<small>one request</small></div>
  <div class="node"><strong>ElevenLabs</strong><span>Accepts the dial and runs the agent.</span></div>
  <div class="arrow">&rarr;<small>places the call</small></div>
  <div class="node"><strong>Twilio</strong><span>The South African number rings the person.</span></div>
</div>
<p class="note">The Twilio Account SID and auth token are entered in ElevenLabs when the number is imported. The n8n workflow stores only the ElevenLabs key, the agent id, and the phone number id.</p>
'@
  },
  @{
    Name = "04-table"
    Speech = "Create a data table in n eight n named Call queue. You type the phone number, starting with plus two seven, the customer name, the offer, and the status pending. The workflow writes the time, the conversation id, and the call id. If the dial fails, the status becomes failed, and that number is not tried again until you set it back to pending."
    Body = @'
<div class="kicker">Call queue</div>
<h1>The same row, before and after.</h1>
<table>
  <thead><tr><th>Phone</th><th>Name</th><th>Offer</th><th>Status</th><th>What the workflow adds</th></tr></thead>
  <tbody>
    <tr><td>+27821234567</td><td>Thabo</td><td>Solar survey</td><td><span class="tag wait">pending</span></td><td>Waiting. You filled this in.</td></tr>
    <tr class="called"><td>+27821234567</td><td>Thabo</td><td>Solar survey</td><td><span class="tag ok">called</span></td><td>conversation id, call id, and the time</td></tr>
    <tr class="failed"><td>+27829876543</td><td>Ayesha</td><td>Solar survey</td><td><span class="tag bad">failed</span></td><td>last error. Set back to pending to retry.</td></tr>
  </tbody>
</table>
<p class="note">One row per phone number. The match back to the row is the phone number while it is still pending.</p>
'@
  },
  @{
    Name = "05-pace"
    Speech = "A timer runs every ten minutes and picks up only three pending rows. It places those calls one at a time, so it stays inside the ElevenLabs limit. The customer name and the offer travel with the call, so the agent can say them. In the ElevenLabs prompt, those fields are written as customer name and offer, inside double curly braces."
    Body = @'
<div class="kicker">Pace</div>
<h1>A few calls, one at a time.</h1>
<div class="metrics">
  <div class="metric"><b>10 min</b><span>How often the schedule looks for pending rows.</span></div>
  <div class="metric"><b>3</b><span>The most rows one run will pick up.</span></div>
  <div class="metric"><b>1</b><span>How many calls are placed at the same time.</span></div>
</div>
<p class="note">customer_name and offer from the row are sent with the dial. In the ElevenLabs agent, use {{customer_name}} and {{offer}} where the agent should say them. Narrow the schedule to calling hours, and set the n8n timezone to Johannesburg, before real use.</p>
'@
  },
  @{
    Name = "06-after"
    Speech = "The row is marked called as soon as ElevenLabs accepts the dial. The workflow does not wait for the person to hang up. When the call does finish, ElevenLabs can notify a second workflow, which writes a short result on that same row. To start, import both workflows, create the Call queue table, add the three n eight n variables, put in one test number, and run the first workflow by hand."
    Body = @'
<div class="kicker">After the dial</div>
<h1>Called is written when the dial is accepted.</h1>
<div class="when">
  <div class="panel"><div class="stepno">At once</div><h2>Place outbound calls</h2><p>ElevenLabs returns a conversation id. The row becomes called. This is the flag that stops a second dial.</p></div>
  <div class="panel"><div class="stepno">After hang-up</div><h2>Save call result</h2><p>The ElevenLabs webhook writes result_summary on the same row. It does not decide whether the number was called.</p></div>
</div>
<ol>
  <li>Import <code>place-outbound-calls.json</code> and <code>save-call-result.json</code>.</li>
  <li>Create the Call queue table and the three ElevenLabs variables.</li>
  <li>Add one test row with status pending, then run the first workflow by hand.</li>
</ol>
'@
  }
)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo } |
  Where-Object { $_.Culture.Name -like "en*" -and $_.Gender -eq "Female" } |
  Select-Object -First 1
if ($voice) { $synth.SelectVoice($voice.Name) }
$synth.Rate = -1
Write-Output ("Voice: " + $synth.Voice.Name)

$profile = Join-Path $env:TEMP "architecture-slide-chrome"
$concat = Join-Path $frames "concat.txt"
$lines = @()

foreach ($slide in $slides) {
  $htmlPath = Write-Slide $slide.Name $slide.Body
  $png = Join-Path $frames ($slide.Name + ".png")
  $wav = Join-Path $frames ($slide.Name + ".wav")
  $clip = Join-Path $frames ($slide.Name + ".mp4")
  $uri = ([Uri]$htmlPath).AbsoluteUri

  if (Test-Path $png) { Remove-Item $png -Force }
  $chromeArgs = @(
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1920,1080",
    "--no-first-run",
    "--disable-extensions",
    "--user-data-dir=$profile",
    "--screenshot=$png",
    $uri
  )
  & $chrome @chromeArgs | Out-Null
  if (-not (Test-Path $png)) { throw "Chrome did not write $png" }

  if (Test-Path $wav) { Remove-Item $wav -Force }
  $synth.SetOutputToWaveFile($wav)
  $ssml = "<speak version=`"1.0`" xml:lang=`"en-US`" xmlns=`"http://www.w3.org/2001/10/synthesis`"><break time=`"350ms`"/>$($slide.Speech)</speak>"
  $synth.SpeakSsml($ssml)
  $synth.SetOutputToNull()

  & $ffmpeg -y -loop 1 -framerate 30 -i $png -i $wav -vf "scale=1920:1080,format=yuv420p" -c:v libx264 -tune stillimage -preset veryfast -crf 20 -c:a aac -ar 44100 -ac 1 -b:a 96k -af "aresample=44100,apad=pad_dur=0.7" -shortest $clip
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed on $($slide.Name)" }
  $lines += "file '$($clip.Replace('\','/'))'"
  Write-Output "Built $($slide.Name)"
}
$synth.Dispose()

[System.IO.File]::WriteAllLines($concat, $lines)
$final = Join-Path $root "outbound-call-loop.mp4"
& $ffmpeg -y -f concat -safe 0 -i $concat -c copy $final
if ($LASTEXITCODE -ne 0) { throw "ffmpeg concat failed" }
& $ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 $final
Write-Output "VIDEO $final"
