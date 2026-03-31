// Commercial pricing simulation (what these would cost with paid models)
// Commercial pricing simulation for SceneForge

export const COMMERCIAL_PRICING = {
  // Image generation: DALL-E 3 standard 1024x1024
  image: {
    perImage: { credits: 40, usd: 0.04 },
    provider: 'DALL-E 3',
  },
  // Voice generation: ElevenLabs per 1K characters
  voice: {
    perThousandChars: { credits: 300, usd: 0.30 },
    provider: 'ElevenLabs',
  },
  // Scene decomposition: GPT-4o mini per 1K tokens (input+output)
  decompose: {
    perThousandTokens: { credits: 1.5, usd: 0.0015 },
    provider: 'GPT-4o mini',
  },
  // Video generation: Sora 5s clip
  video: {
    perClip: { credits: 1000, usd: 1.00 },
    provider: 'Sora',
  },
} as const;

export const FREE_PROVIDERS = {
  image: 'hf-sdxl',
  voice: 'web-speech',
  sceneDecompose: 'gemini-flash',
} as const;

export const PROVIDER_LABELS: Record<string, string> = {
  'hf-sdxl': 'HuggingFace SDXL',
  'web-speech': 'Web Speech API',
  'gemini-flash': 'Gemini Flash',
  'fallback-image': 'Preset (Fallback)',
};

export const MAX_PROJECTS = 3;
export const MAX_SCENES = 5;
export const MIN_SCENES = 3;

export const FALLBACK_IMAGES = [
  '/fallback/scene-1.jpg',
  '/fallback/scene-2.jpg',
  '/fallback/scene-3.jpg',
  '/fallback/scene-4.jpg',
  '/fallback/scene-5.jpg',
];

export const DEMO_PRESET_SCRIPT = `A lone astronaut discovers a mysterious signal on a distant planet.
She follows the signal through alien ruins, deciphering ancient messages.
The signal leads to a hidden chamber containing proof of a lost civilization.
She transmits the discovery back to Earth, changing humanity's understanding of the universe forever.`;

export const DEMO_PRESET_SCENES = [
  {
    description: 'Astronaut discovers mysterious signal on alien planet',
    imagePrompt: 'Cinematic wide shot, lone astronaut in orange spacesuit on red rocky alien planet, dramatic sunset sky, mysterious green signal beacon glowing in distance, dust particles in air, epic scale',
    voiceScript: 'In the silence of a distant world, Commander Chen detected something that would change everything.',
  },
  {
    description: 'Following the signal through ancient alien ruins',
    imagePrompt: 'Dark ancient alien ruins, crumbling stone structures covered in glowing blue symbols, astronaut exploring with helmet flashlight, thick atmospheric fog, mysterious and eerie, cinematic lighting',
    voiceScript: 'The signal led through crumbling ruins, each symbol telling a story older than human civilization.',
  },
  {
    description: 'Hidden chamber reveals proof of a lost civilization',
    imagePrompt: 'Ancient underground chamber, crystalline holographic displays activated by astronaut presence, alien artifacts glowing gold, warm golden light filling the space, awe-inspiring discovery moment',
    voiceScript: 'The chamber revealed a truth humanity had long suspected — we were never alone.',
  },
];

export const SCENE_DECOMPOSE_PROMPT_TEMPLATE = `You are a creative director decomposing a script into visual scenes.

Script:
{script}

Decompose this into {minScenes}-{maxScenes} scenes. Return a JSON array with exactly this structure:
[
  {
    "description": "Brief scene description (1-2 sentences)",
    "imagePrompt": "Detailed visual prompt for image generation (describe lighting, composition, style, mood)",
    "voiceScript": "Narration text for this scene (1-3 sentences)"
  }
]

Return only the JSON array, no other text.`;
