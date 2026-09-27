// Microphone capture for the Record tab.
//
// Kept out of the component for the same reason tables.ts and history.ts are:
// it is hand-rolled browser machinery with its own invariants, and the tab
// should only have to say "start" and "stop".
//
// The awkward part is that MediaRecorder produces a *stream*, not a series of
// files: only the first chunk carries the container header, so chunk N on its
// own will not decode and Whisper cannot read it. Rather than reassemble
// headers by hand (fragile, and different per container) or re-send the whole
// recording every time (cost grows with the square of the lecture), the
// recorder is stopped and restarted on an interval, which makes every segment a
// complete, valid file. The MediaStream stays open across those restarts, so
// the student is only ever asked for the microphone once.

export type Segment = { blob: Blob; ext: string };

export type RecorderHandle = {
  /** Flushes the segment in progress, then releases the microphone. */
  stop: () => Promise<void>;
  /** Drops the segment in progress and releases the microphone. */
  cancel: () => void;
};

/** Its `message` is shown to the student as written. */
export class RecorderError extends Error {}

/**
 * Segments shorter than this are dropped rather than sent.
 *
 * Whisper rejects anything under 0.1s outright ("Audio file is too short"), and
 * stop() flushes whatever segment is in progress — so a student who stops
 * shortly after a segment boundary would send a fraction of a second and get a
 * transcription failure at the exact moment they finish. Only that trailing
 * flush can ever be short (every other segment runs the full interval), and a
 * sub-second tail is the sound of someone reaching for the Stop button, so
 * there is nothing worth keeping in it.
 */
const MIN_SEGMENT_MS = 1000;

/**
 * A segment is only sent if someone was heard in it. A silent segment is worse
 * than useless: Whisper hallucinates on quiet audio, from "Thank you." up to
 * whole paragraphs of YouTube sign-offs and emoji, which would land in the
 * student's notes as if the lecturer had said them.
 *
 * It used to be one peak level at 0.008, which is a single step of the 8-bit
 * meter, so the faintest flicker of room noise passed. Now the loudness (RMS)
 * is read every METER_MS against the room's own background level, tracked as
 * a slowly rising minimum, and a reading only counts as voice when it is
 * VOICE_OVER_FLOOR times that background and above VOICE_RMS_MIN. A steady fan
 * or hiss becomes the background and never counts; speech comes in bursts
 * above it. The segment needs MIN_VOICED_MS of such readings.
 */
const METER_MS = 100;
const VOICE_RMS_MIN = 0.004;
const VOICE_OVER_FLOOR = 3;
const MIN_VOICED_MS = 1000;
/** Per reading; the background can double in about 35 seconds of constant sound. */
const FLOOR_RISE = 1.002;

/** Whisper reads the container from the filename, so the extension travels with the mime. */
const CANDIDATES: [mime: string, ext: string][] = [
  ["audio/webm;codecs=opus", "webm"],
  ["audio/webm", "webm"],
  ["audio/mp4", "mp4"],
  ["audio/ogg;codecs=opus", "ogg"],
];

function pickMime(): { mime: string; ext: string } | null {
  for (const [mime, ext] of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  return null;
}

function friendly(err: unknown): RecorderError {
  switch (err instanceof Error ? err.name : "") {
    case "NotAllowedError":
    case "SecurityError":
      return new RecorderError(
        "Grasp needs microphone access to record. Allow it in your browser, then try again."
      );
    case "NotFoundError":
    case "OverconstrainedError":
      return new RecorderError("No microphone found. Connect one and try again.");
    case "NotReadableError":
      return new RecorderError("Your microphone is already in use by another app.");
    default:
      return new RecorderError("Grasp could not start recording. Check your microphone and try again.");
  }
}

export async function startSegmentedRecording({
  segmentMs,
  onSegment,
  onQuiet,
}: {
  segmentMs: number;
  onSegment: (segment: Segment) => void;
  /** A full-length segment was too quiet to be worth sending. */
  onQuiet: () => void;
}): Promise<RecorderHandle> {
  if (
    typeof window === "undefined" ||
    typeof MediaRecorder === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    throw new RecorderError("This browser can't record audio. Try Chrome, Edge or Safari.");
  }

  const picked = pickMime();
  if (!picked) {
    throw new RecorderError("This browser can't record in a format Grasp can transcribe.");
  }
  const { mime, ext } = picked;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (err) {
    throw friendly(err);
  }

  let active = true;
  let current: MediaRecorder | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let finished: (() => void) | null = null;

  // A level meter tapped off the same stream, so a segment can be judged silent
  // without decoding the encoded blob back out again. Nothing is connected to
  // the context's destination, so this never plays the lecture back aloud.
  let audioCtx: AudioContext | null = null;
  let meter: ReturnType<typeof setInterval> | null = null;
  let voicedMs = 0;
  // The background level carries across segments, so each does not relearn it.
  let floor = Infinity;
  try {
    audioCtx = new AudioContext();
    // Some browsers create it suspended outside a click, which would read as
    // silence throughout and drop every segment.
    void audioCtx.resume().catch(() => {});
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const frame = new Float32Array(analyser.fftSize);
    let lastTick = performance.now();
    meter = setInterval(() => {
      // A hidden tab's timers slow to about once a second, so a reading stands
      // for the time since the last one, not a fixed METER_MS; otherwise a
      // lecture recorded from another tab would never reach MIN_VOICED_MS.
      const now = performance.now();
      const elapsed = Math.min(now - lastTick, 1000);
      lastTick = now;
      analyser.getFloatTimeDomainData(frame);
      let sum = 0;
      for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
      const rms = Math.sqrt(sum / frame.length);
      floor = Math.max(1e-5, Math.min(rms, floor * FLOOR_RISE));
      if (rms > VOICE_RMS_MIN && rms > floor * VOICE_OVER_FLOOR) voicedMs += elapsed;
    }, METER_MS);
  } catch {
    // No metering available: fall back to sending every segment rather than
    // risk dropping real speech.
    audioCtx = null;
  }
  const heardSomething = () => audioCtx === null || voicedMs >= MIN_VOICED_MS;

  const release = () => {
    if (meter) clearInterval(meter);
    meter = null;
    void audioCtx?.close().catch(() => {});
    audioCtx = null;
    stream.getTracks().forEach((track) => track.stop());
  };

  // One entry point for "a segment ended": it either starts the next segment or,
  // if we are stopping, resolves stop()'s promise. Deciding here rather than in
  // stop() is what keeps this correct when the interval timer and the student's
  // Stop land in the same tick — whichever gets there first, the other still
  // passes through this check exactly once.
  function startSegment() {
    if (!active) {
      finished?.();
      finished = null;
      return;
    }

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const startedAt = Date.now();
    voicedMs = 0;
    current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      current = null;
      const longEnough = chunks.length > 0 && Date.now() - startedAt >= MIN_SEGMENT_MS;
      if (longEnough && heardSomething()) onSegment({ blob: new Blob(chunks, { type: mime }), ext });
      else if (longEnough) onQuiet();
      startSegment();
    };

    rec.start();
    timer = setTimeout(() => {
      if (rec.state === "recording") rec.stop();
    }, segmentMs);
  }

  startSegment();

  return {
    async stop() {
      if (!active) return;
      active = false;
      if (timer) clearTimeout(timer);

      await new Promise<void>((resolve) => {
        finished = resolve;
        if (current && current.state !== "inactive") {
          current.stop(); // onstop emits the last segment, then resolves this
        } else {
          // Caught in the gap between two segments: nothing to flush.
          finished = null;
          resolve();
        }
      });

      release();
    },

    cancel() {
      active = false;
      if (timer) clearTimeout(timer);
      if (current) {
        // Detached first, so the segment in progress is discarded rather than
        // transcribed after the student has already thrown the recording away.
        current.onstop = null;
        if (current.state !== "inactive") current.stop();
        current = null;
      }
      release();
    },
  };
}
