// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Per-clip element recorder for the replay page.
 *
 * One getDisplayMedia() prompt → one shared tab-capture stream, cropped to the
 * stage element via Chrome's Region Capture API (CropTarget + track.cropTo).
 * Each fixture gets its own MediaRecorder on that cropped stream, so you end
 * up with one .webm per unit×fixture instead of one long video.
 *
 * Region Capture only works when the user picks *this tab* in the share
 * prompt (preferCurrentTab hints Chrome to offer it first). If cropTo isn't
 * available or the user picked a window/screen, we fall back to the uncropped
 * stream and warn — clips still work, they're just full-tab.
 */

export type RecorderState =
  | "idle"
  | "prompting"
  | "armed"
  | "recording"
  | "error";

export interface Clip {
  name: string;
  blob: Blob;
  url: string;
  bytes: number;
  durationMs: number;
}

// Region Capture isn't in lib.dom yet everywhere — narrow what we use.
interface CropTargetCtor {
  fromElement(el: Element): Promise<unknown>;
}
interface BrowserCaptureTrack extends MediaStreamTrack {
  cropTo?: (target: unknown) => Promise<void>;
}

export function createClipRecorder(opts: {
  onState: (s: RecorderState, err?: string) => void;
  onClip: (clip: Clip) => void;
}) {
  let stream: MediaStream | null = null;
  let cropped = false;
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let clipName = "";
  let clipStarted = 0;
  let armed = false;

  const setState = (s: RecorderState, err?: string) => opts.onState(s, err);

  /** Prompt for tab share once and crop the stream to `target`. */
  async function arm(target: HTMLElement): Promise<boolean> {
    if (armed) return true;
    setState("prompting");
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      } as MediaStreamConstraints & {
        preferCurrentTab?: boolean;
        selfBrowserSurface?: "include" | "exclude";
      });
    } catch (e) {
      setState("error", String(e));
      return false;
    }

    const track = stream.getVideoTracks()[0] as BrowserCaptureTrack | undefined;
    // Region Capture: crop to the stage element. Dynamic — follows the element
    // as it moves/resizes.
    try {
      const CropTarget = (globalThis as { CropTarget?: CropTargetCtor })
        .CropTarget;
      if (CropTarget && track?.cropTo) {
        const ct = await CropTarget.fromElement(target);
        await track.cropTo(ct);
        cropped = true;
      } else {
        console.warn(
          "[recorder] Region Capture not available — recording full tab."
        );
      }
    } catch (e) {
      console.warn(
        "[recorder] cropTo failed (did you pick a window/screen instead of this tab?) — recording full tab.",
        e
      );
    }

    // If the user stops sharing via the browser bar, disarm cleanly.
    track?.addEventListener("ended", () => disarm());

    armed = true;
    setState("armed");
    return true;
  }

  /** Start a new clip on the shared (cropped) stream. */
  function startClip(name: string) {
    if (!armed || !stream) return;
    if (rec) void stopClip(); // shouldn't happen, but be safe
    chunks = [];
    clipName = name;
    clipStarted = performance.now();
    const mime = pickMime();
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    rec.start(200);
    setState("recording");
  }

  /** Stop the current clip and emit it via onClip. Resolves when finalized. */
  function stopClip(): Promise<Clip | null> {
    const r = rec;
    if (!r) return Promise.resolve(null);
    rec = null;
    return new Promise((resolve) => {
      r.onstop = () => {
        const blob = new Blob(chunks, { type: r.mimeType || "video/webm" });
        const clip: Clip = {
          name: clipName,
          blob,
          url: URL.createObjectURL(blob),
          bytes: blob.size,
          durationMs: Math.round(performance.now() - clipStarted),
        };
        chunks = [];
        opts.onClip(clip);
        if (armed) setState("armed");
        resolve(clip);
      };
      try {
        if (r.state !== "inactive") r.stop();
        else r.onstop?.(new Event("stop"));
      } catch {
        resolve(null);
      }
    });
  }

  /** Stop everything and release the capture. */
  function disarm() {
    void stopClip();
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    armed = false;
    cropped = false;
    setState("idle");
  }

  return {
    arm,
    startClip,
    stopClip,
    disarm,
    get armed() {
      return armed;
    },
    get cropped() {
      return cropped;
    },
  };
}

export type ClipRecorder = ReturnType<typeof createClipRecorder>;

/* helpers */

function pickMime(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(c)
    )
      return c;
  }
  return undefined;
}

export function downloadClip(clip: Clip) {
  const a = document.createElement("a");
  a.href = clip.url;
  a.download = `${sanitize(clip.name)}.webm`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadAll(clips: Clip[]) {
  for (const c of clips) {
    downloadClip(c);
    // Small gap so Chrome doesn't coalesce/drop downloads.
    await new Promise((r) => setTimeout(r, 250));
  }
}

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
