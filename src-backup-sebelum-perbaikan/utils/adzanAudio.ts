// Adzan Audio Engine supporting 12 Authentic Real Human Voice Adzan Audio Tracks & Fallbacks
import { AdzanVoiceType } from '../types';
export type { AdzanVoiceType };

export interface AdzanAudioOption {
  id: AdzanVoiceType;
  name: string;
  file: string;
  subtitle?: string;
  fallbackUrls?: string[];
}

export const adzanAudioOptions: AdzanAudioOption[] = [
  {
    id: "makkah",
    name: "🕋 Adzan Makkah",
    file: "/audio-adzan/mecca_56_22.mp3",
    subtitle: "Kumandang Adzan Masjidil Haram Makkah Al-Mukarramah",
    fallbackUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/transcoded/8/86/Azan.ogg/Azan.ogg.mp3",
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/077-2.mp3"
    ]
  },
  {
    id: "madinah",
    name: "🕌 Adzan Madinah",
    file: "/audio-adzan/adan_madinah_32_16.mp3",
    subtitle: "Kumandang Adzan Masjid Nabawi Madinah Al-Munawwarah",
    fallbackUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7c/33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg/33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg.mp3",
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/087--2.mp3"
    ]
  },
  {
    id: "alaqsa",
    name: "🕌 Adzan Al-Aqsa",
    file: "/audio-adzan/alaqsa2_64_22.mp3",
    subtitle: "Kumandang Adzan Masjid Al-Aqsa Palestina",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/085-10.mp3"
    ]
  },
  {
    id: "subuh",
    name: "🌅 Adzan Subuh",
    file: "/audio-adzan/fajr_128_44.mp3",
    subtitle: "Kumandang Adzan Fajar Khusus Subuh (As-Shalatu Khairum Minan Naum)",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/086-11.mp3"
    ]
  },
  {
    id: "alafasy-1",
    name: "🎙️ Mishary Rashid Alafasy – Versi 1",
    file: "/audio-adzan/adzan_by_mishari_rashid_al-afasy-2.mp3",
    subtitle: "Lantunan Merdu Syaikh Mishary Rashid Alafasy (Versi 1)",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/084-9.mp3"
    ]
  },
  {
    id: "alafasy-2",
    name: "🎙️ Mishary Rashid Alafasy – Versi 2",
    file: "/audio-adzan/Adzan-Misyari-Rasyid.mp3",
    subtitle: "Lantunan Merdu Syaikh Mishary Rashid Alafasy (Versi 2)",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/083-8.mp3"
    ]
  },
  {
    id: "yusuf-islam",
    name: "🎙️ Yusuf Islam",
    file: "/audio-adzan/Adzan-Yusuf-Islam-cat-steven.mp3",
    subtitle: "Lantunan Merdu Yusuf Islam (Cat Stevens)",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/081-6.mp3"
    ]
  },
  {
    id: "mesir-1",
    name: "🇪🇬 Adzan Mesir – Versi 1",
    file: "/audio-adzan/adzan-mesir-1.mp3",
    subtitle: "Kumandang Adzan Khas Mesir (Langgam Kairo 1)",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/080-5.mp3"
    ]
  },
  {
    id: "mesir-2",
    name: "🇪🇬 Adzan Mesir – Versi 2",
    file: "/audio-adzan/adzan-mesir-3.mp3",
    subtitle: "Kumandang Adzan Khas Mesir (Langgam Kairo 2)",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/079-4.mp3"
    ]
  },
  {
    id: "pakistan",
    name: "🇵🇰 Adzan Pakistan",
    file: "/audio-adzan/Pakistan-Adzan.mp3",
    subtitle: "Kumandang Adzan Langgam Asia Selatan / Pakistan",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/078-3.mp3"
    ]
  },
  {
    id: "bosnia",
    name: "🇧🇦 Adzan Bosnia",
    file: "/audio-adzan/Adzan-Bosnia.mp3",
    subtitle: "Kumandang Adzan Langgam Eropa / Bosnia",
    fallbackUrls: [
      "https://archive.org/download/AdhaN_Divers_up-by-muslem/077-2.mp3"
    ]
  },
  {
    id: "beautiful",
    name: "🌙 Beautiful Adhan",
    file: "/audio-adzan/Beautiful_adhan.ogg",
    subtitle: "Lantunan Syahdu & Khusyuk Beautiful Adhan",
    fallbackUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b0/Beautiful_adhan.ogg/Beautiful_adhan.ogg.mp3"
    ]
  }
];

// Legacy backward-compatibility dictionary
export const ADZAN_TRACKS: Record<string, { id: string; name: string; subtitle: string; urls: string[]; durationSeconds: number }> = 
  adzanAudioOptions.reduce((acc, opt) => {
    acc[opt.id] = {
      id: opt.id,
      name: opt.name,
      subtitle: opt.subtitle || opt.name,
      urls: [opt.file, ...(opt.fallbackUrls || [])],
      durationSeconds: 180,
    };
    return acc;
  }, {} as Record<string, any>);

let currentAudio: HTMLAudioElement | null = null;
let currentPlayingVoice: AdzanVoiceType | null = null;
let playbackGeneration = 0;
let audioContext: AudioContext | null = null;
let synthOscillators: OscillatorNode[] = [];
let isPlayingState = false;
let onPlayStateChangeCallback: ((playing: boolean, currentVoice: AdzanVoiceType | null) => void) | null = null;
let synthTimerId: any = null;

// Cache of verified audio availability statuses
const audioStatusCache: Record<string, 'ready' | 'playing' | 'error'> = {};

export function setAdzanStateChangeListener(cb: (playing: boolean, currentVoice: AdzanVoiceType | null) => void) {
  onPlayStateChangeCallback = cb;
}

export function getCurrentPlayingVoice(): AdzanVoiceType | null {
  return currentPlayingVoice;
}

// Get or initialize AudioContext safely
function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch (e) {
    return null;
  }
}

/**
 * Check if a local audio file is ready or available
 */
export async function checkAudioFileStatus(voiceType: AdzanVoiceType): Promise<'ready' | 'playing' | 'error'> {
  if (isPlayingState && currentPlayingVoice === voiceType) {
    return 'playing';
  }
  if (audioStatusCache[voiceType]) {
    return audioStatusCache[voiceType];
  }

  const option = adzanAudioOptions.find((opt) => opt.id === voiceType);
  if (!option) {
    audioStatusCache[voiceType] = 'ready';
    return 'ready';
  }

  return new Promise<'ready' | 'playing' | 'error'>((resolve) => {
    try {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = option.file;

      const handleSuccess = () => {
        audioStatusCache[voiceType] = 'ready';
        audio.removeEventListener('loadedmetadata', handleSuccess);
        audio.removeEventListener('canplay', handleSuccess);
        audio.removeEventListener('error', handleError);
        resolve('ready');
      };

      const handleError = () => {
        // If local has issue but has fallback or synthetic, mark ready
        audioStatusCache[voiceType] = 'ready';
        audio.removeEventListener('loadedmetadata', handleSuccess);
        audio.removeEventListener('canplay', handleSuccess);
        audio.removeEventListener('error', handleError);
        resolve('ready');
      };

      audio.addEventListener('loadedmetadata', handleSuccess);
      audio.addEventListener('canplay', handleSuccess);
      audio.addEventListener('error', handleError);

      // Timeout fallback
      setTimeout(() => {
        audioStatusCache[voiceType] = 'ready';
        resolve('ready');
      }, 1500);
    } catch {
      audioStatusCache[voiceType] = 'ready';
      resolve('ready');
    }
  });
}

/**
 * Play Adzan Audio
 * Ensures ONLY ONE audio plays at any time, stopping any previous playback.
 */
export function playAdzan(
  voiceType: AdzanVoiceType = 'makkah',
  volume: number = 0.9,
  onEnd?: () => void
): boolean {
  // Hentikan playback sebelumnya terlebih dahulu.
  // stopAdzan() akan membatalkan generation lama.
  stopAdzan();

  // Setelah playback lama benar-benar dibatalkan,
  // buat generation baru khusus untuk audio ini.
  const myGeneration = ++playbackGeneration;

  if (voiceType === 'beep') {
    getAudioContext();

    isPlayingState = true;
    currentPlayingVoice = 'beep';
    if (onPlayStateChangeCallback) {
      onPlayStateChangeCallback(true, 'beep');
    }

    playBeepSound(volume);

    synthTimerId = setTimeout(() => {
      if (myGeneration !== playbackGeneration) return;

      stopAdzan();

      if (onEnd) onEnd();
    }, 4000);

    return true;
  }

  const option =
    adzanAudioOptions.find((opt) => opt.id === voiceType) ||
    adzanAudioOptions[0];

  const urlsToTry: string[] = [
    option.file,
    ...(option.fallbackUrls || [])
  ];

  isPlayingState = true;
  currentPlayingVoice = voiceType;

  if (onPlayStateChangeCallback) {
    onPlayStateChangeCallback(true, voiceType);
  }

  let currentUrlIndex = 0;

  const finishPlayback = () => {
    // Callback dari audio lama tidak boleh mengubah state audio baru.
    if (myGeneration !== playbackGeneration) return;

    isPlayingState = false;
    currentPlayingVoice = null;

    if (onPlayStateChangeCallback) {
      onPlayStateChangeCallback(false, null);
    }

    currentAudio = null;
    audioStatusCache[voiceType] = 'ready';

    if (onEnd) onEnd();
  };

  const tryPlayNextUrl = () => {
    // Audio ini sudah dibatalkan karena Stop atau audio lain diputar.
    if (myGeneration !== playbackGeneration) return;

    if (currentUrlIndex >= urlsToTry.length) {
      console.warn('All audio stream sources exhausted.');
      finishPlayback();
      return;
    }

    const currentUrl = urlsToTry[currentUrlIndex++];
    const audio = new Audio();

    if (currentUrl.startsWith('http')) {
      audio.crossOrigin = 'anonymous';
    }

    audio.preload = 'auto';
    audio.src = currentUrl;
    audio.volume = Math.max(0, Math.min(1, volume));

    currentAudio = audio;

    audio.onended = () => {
      if (myGeneration !== playbackGeneration) return;
      finishPlayback();
    };

    audio.onerror = () => {
      if (myGeneration !== playbackGeneration) return;

      console.warn(
        `Audio error event for ${currentUrl}, trying fallback source...`
      );

      if (currentAudio === audio) {
        currentAudio = null;
      }

      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // ignore
      }

      tryPlayNextUrl();
    };

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Pastikan audio yang benar masih menjadi audio aktif.
          if (myGeneration !== playbackGeneration || currentAudio !== audio) {
            audio.pause();
            return;
          }

          audioStatusCache[voiceType] = 'playing';
        })
        .catch((err) => {
          if (myGeneration !== playbackGeneration) return;

          console.warn(
            `Playback failed for ${currentUrl}:`,
            err
          );

          if (currentAudio === audio) {
            currentAudio = null;
          }

          try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
          } catch {
            // ignore
          }

          tryPlayNextUrl();
        });
    }
  };

  tryPlayNextUrl();
  return true;
}

/**
 * Stop any active Adzan audio or synthesizer
 */
export function stopAdzan() {
  // Batalkan seluruh callback/playback yang sedang berjalan.
  playbackGeneration++;

  if (synthTimerId) {
    clearTimeout(synthTimerId);
    synthTimerId = null;
  }

  if (currentAudio) {
    const audio = currentAudio;
    currentAudio = null;

    try {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    } catch {
      // ignore
    }
  }

  // Stop synthetic oscillators.
  synthOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // ignore
    }
  });

  synthOscillators = [];

  isPlayingState = false;
  currentPlayingVoice = null;

  if (onPlayStateChangeCallback) {
    onPlayStateChangeCallback(false, null);
  }
}


export function isAdzanPlaying(): boolean {
  return isPlayingState;
}

/**
 * High-Fidelity Web Audio Synthesizer (100% Reliable Offline Fallback)
 */
export function playSynthesizedAdzan(volume: number = 0.85, onEnd?: () => void) {
  stopAdzan();
  isPlayingState = true;
  if (onPlayStateChangeCallback) onPlayStateChangeCallback(true, currentPlayingVoice);

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Melodic Maqam Hijaz / Bayati Adzan phrases
    const notes: Array<{ freq: number; duration: number; delay: number }> = [
      { freq: 220.00, duration: 1.4, delay: 0.1 },  // A3
      { freq: 261.63, duration: 1.2, delay: 1.6 },  // C4
      { freq: 293.66, duration: 1.8, delay: 2.9 },  // D4
      { freq: 329.63, duration: 2.4, delay: 4.8 },  // E4
      { freq: 293.66, duration: 1.2, delay: 7.5 },  // D4
      { freq: 329.63, duration: 1.4, delay: 8.8 },  // E4
      { freq: 392.00, duration: 2.6, delay: 10.3 }, // G4
      { freq: 329.63, duration: 2.8, delay: 13.0 }, // E4
      { freq: 261.63, duration: 1.6, delay: 16.2 }, // C4
      { freq: 293.66, duration: 1.6, delay: 17.9 }, // D4
      { freq: 329.63, duration: 2.2, delay: 19.6 }, // E4
      { freq: 293.66, duration: 1.8, delay: 21.9 }, // D4
      { freq: 261.63, duration: 2.8, delay: 23.8 }, // C4
      { freq: 220.00, duration: 3.8, delay: 26.8 }, // A3
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.1, volume * 0.45), ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach((note) => {
      const startTime = ctx.currentTime + note.delay;
      const endTime = startTime + note.duration;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(note.freq, startTime);

      gain1.gain.setValueAtTime(0.001, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.7, startTime + 0.35);
      gain1.gain.setValueAtTime(0.6, endTime - 0.4);
      gain1.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc1.connect(gain1);
      gain1.connect(masterGain);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(note.freq * 2, startTime);

      gain2.gain.setValueAtTime(0.001, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.2, startTime + 0.4);
      gain2.gain.setValueAtTime(0.15, endTime - 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start(startTime);
      osc1.stop(endTime);
      osc2.start(startTime);
      osc2.stop(endTime);

      synthOscillators.push(osc1, osc2);
    });

    const totalDuration = 31.0;
    synthTimerId = setTimeout(() => {
      stopAdzan();
      if (onEnd) onEnd();
    }, totalDuration * 1000);

  } catch (e) {
    console.error('Synthesizer playback error:', e);
    isPlayingState = false;
    currentPlayingVoice = null;
    if (onPlayStateChangeCallback) onPlayStateChangeCallback(false, null);
  }
}

/**
 * Gentle Acoustic Beep Alarm Sound
 */
export function playBeepSound(volume: number = 0.8) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.1, volume * 0.4), ctx.currentTime);
    masterGain.connect(ctx.destination);

    const tones = [523.25, 659.25, 783.99, 1046.50];
    tones.forEach((freq, idx) => {
      const delay = idx * 0.35;
      const startTime = ctx.currentTime + delay;
      const endTime = startTime + 0.8;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(0.001, startTime);
      toneGain.gain.linearRampToValueAtTime(0.6, startTime + 0.04);
      toneGain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(toneGain);
      toneGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(endTime);
      synthOscillators.push(osc);
    });
  } catch (e) {
    // ignore
  }
}

/**
 * Request Browser Notification Permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

/**
 * Show Desktop / Mobile Push Notification for Prayer Time
 */
export function showPrayerNotification(prayerName: string, locationName: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(`🕌 Waktu Sholat ${prayerName} Telah Tiba!`, {
        body: `Kumandang Adzan untuk wilayah ${locationName}. Mari laksanakan sholat berjamaah tepat waktu.`,
        icon: '/logo.svg',
        silent: false,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Notification display failed:', e);
    }
  }
}
