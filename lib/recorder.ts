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
 * Peak level, 0-1, below which a segment counts as silence and is not sent.
 *
 * A silent segment is worse than useless. Whisper hallucinates filler on
 * silence — two seconds of digital silence comes back as "you", and longer
 * stretches produce things like "Thank you." — so a quiet spell in a lecture
 * would inject words the lecturer never said into the student's notes, and pay
 * per request to do it. Deliberately conservative: real rooms have a noise
 * floor well above digital silence, and dropping speech would be far worse
 * than occasionally paying for a quiet segment.
 */
const SILENCE_PEAK = 0.008;

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
}: {
  segmentMs: number;
  onSegment: (segment: Segment) => void;
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
  let peak = 0;
  try {
    audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const frame = new Uint8Array(analyser.fftSize);
    meter = setInterval(() => {
      analyser.getByteTimeDomainData(frame);
      for (let i = 0; i < frame.length; i += 1) {
        const level = Math.abs(frame[i] - 128) / 128;
        if (level > peak) peak = level;
      }
    }, 200);
  } catch {
    // No metering available: fall back to sending every segment rather than
    // risk dropping real speech.
    audioCtx = null;
  }
  const heardSomething = () => audioCtx === null || peak >= SILENCE_PEAK;

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
    peak = 0;
    current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      current = null;
      const worthSending =
        chunks.length > 0 && Date.now() - startedAt >= MIN_SEGMENT_MS && heardSomething();
      if (worthSending) onSegment({ blob: new Blob(chunks, { type: mime }), ext });
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
