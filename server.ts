import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const COMPLIMENT_MODEL = 'gemini-4-hydrogen';

const COMPLIMENT_SYSTEM_INSTRUCTION = [
  'You are the warm, poetic Mountain Spirit watching over a cultivating serpent climbing alpine peaks.',
  'Always respond with ONE short, heartfelt, uplifting compliment directly addressing the serpent (8 to 16 words).',
  'Praise its grace, courage, patience, scales, combat mastery, or perseverance in the mountains.',
  'Never use hashtags, emojis, quotation marks, bullet points, or meta-commentary. Output only the single compliment sentence.',
].join(' ');

const TAUNT_SYSTEM_INSTRUCTION = [
  'You are the voice of a fierce cultivating serpent-to-human warrior fighting enemies high in the alpine peaks.',
  'Respond with ONE razor-sharp, charismatic in-character combat taunt spoken directly to the enemy (5 to 11 words).',
  'Tailor the taunt specifically to the enemy type (wolf pack hunter, armored crag boar, sky griffin/eagle, mythic peak guardian, nether earth wraith, or soul hall reaper) and the combat moment (engaging, parrying, staggering, or executing).',
  'Never use hashtags, emojis, quotation marks, bullet points, or meta-commentary. Output only the single taunt line.',
].join(' ');

interface ComplimentRequestBody {
  event?: string;
  stageTitle?: string;
  level?: number;
  realmName?: string;
  weather?: string;
  enemyName?: string;
  combo?: number;
  peaksVisited?: number;
  recentCompliments?: unknown;
}

interface TauntRequestBody {
  enemyKind?: string;
  enemyName?: string;
  enemyFaction?: string;
  isBoss?: boolean;
  moment?: string;
  stageTitle?: string;
  level?: number;
  realmName?: string;
  hasGun?: boolean;
  weather?: string;
  recentTaunts?: unknown;
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeText(val: unknown, maxLen: number, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const cleaned = val.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
  return cleaned || fallback;
}

function buildComplimentPrompt(body: ComplimentRequestBody): string {
  const event = sanitizeText(body.event, 40, 'roaming');
  const stageTitle = sanitizeText(body.stageTitle, 48, 'Valley Serpent');
  const realmName = sanitizeText(body.realmName, 40, 'Dou Zhi Qi');
  const weather = sanitizeText(body.weather, 32, 'mist');
  const enemyName = sanitizeText(body.enemyName, 48, '');
  const level =
    typeof body.level === 'number' && Number.isFinite(body.level)
      ? Math.max(1, Math.min(12, Math.round(body.level)))
      : 1;
  const combo =
    typeof body.combo === 'number' && Number.isFinite(body.combo)
      ? Math.max(0, Math.min(999, Math.round(body.combo)))
      : 0;
  const peaksVisited =
    typeof body.peaksVisited === 'number' && Number.isFinite(body.peaksVisited)
      ? Math.max(0, Math.min(12, Math.round(body.peaksVisited)))
      : 0;

  const recentList = Array.isArray(body.recentCompliments)
    ? body.recentCompliments
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(-5)
        .map((s) => s.trim().slice(0, 120))
    : [];

  const momentMap: Record<string, string> = {
    expedition_start: 'The serpent just began a fresh climb across the mountain trails.',
    roaming: 'The serpent is gliding steadily across the alpine ridges with calm focus.',
    combo: `The serpent chained a graceful ${combo}x essence streak.`,
    combat_parry: enemyName
      ? `The serpent just executed a crisp counter-parry clash against ${enemyName}!`
      : 'The serpent just executed a crisp counter-parry clash mid-duel!',
    combat_victory: enemyName
      ? `The serpent triumphed in a fierce duel against ${enemyName}!`
      : 'The serpent triumphed in a fierce duel against a mountain foe!',
    peak_conquered: `The serpent just conquered Trial Peak #${peaksVisited} high in the range!`,
    climate_endured: `The serpent presses onward fearlessly through ${weather} weather.`,
    evolution: `The serpent just ascended to Level ${level} (${stageTitle}) in the ${realmName} realm!`,
  };

  const momentLine = momentMap[event] ?? momentMap.roaming;
  const avoidLine =
    recentList.length > 0
      ? `\nAvoid repeating phrasing from these recent compliments:\n- ${recentList.join('\n- ')}`
      : '';

  return [
    `Serpent form: Level ${level} ${stageTitle} (${realmName} realm).`,
    `Current climate: ${weather}. Trial Peaks conquered: ${peaksVisited}/12.`,
    `Moment: ${momentLine}`,
    'Give the serpent a fresh, warm, vivid compliment for this moment.',
  ].join('\n') + avoidLine;
}

function buildTauntPrompt(body: TauntRequestBody): string {
  const enemyKind = sanitizeText(body.enemyKind, 32, 'wolf');
  const enemyName = sanitizeText(body.enemyName, 48, 'Dire Mountain Wolf');
  const enemyFaction = sanitizeText(body.enemyFaction, 32, 'beast');
  const moment = sanitizeText(body.moment, 24, 'engage');
  const stageTitle = sanitizeText(body.stageTitle, 48, 'Valley Serpent');
  const realmName = sanitizeText(body.realmName, 40, 'Dou Zhi Qi');
  const weather = sanitizeText(body.weather, 32, 'mist');
  const isBoss = Boolean(body.isBoss);
  const hasGun = Boolean(body.hasGun);
  const level =
    typeof body.level === 'number' && Number.isFinite(body.level)
      ? Math.max(1, Math.min(12, Math.round(body.level)))
      : 1;

  const recentList = Array.isArray(body.recentTaunts)
    ? body.recentTaunts
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(-5)
        .map((s) => s.trim().slice(0, 100))
    : [];

  const enemyArchetypeMap: Record<string, string> = {
    wolf: 'a fang-baring pack predator relying on reckless lunges and claws',
    boar: 'a heavy iron-tusked crag brute hiding behind thick granite hide and blind charges',
    eagle: 'an arrogant sky talon predator swooping down from the mountain gales',
    guardian: 'an ancient mythic Trial Peak Guardian colossus defending the sacred summit',
    wraith: 'a spectral Ghost Clan shadow assassin creeping out of nether mist and chains',
    soul_elder: 'a high-ranking Soul Hall Reaper boss wielding dark soul-harvesting chains',
  };

  const momentMap: Record<string, string> = {
    engage: `Locking eyes and trading strikes with ${enemyName} in close combat.`,
    parry: `Just deflected ${enemyName}'s telegraph strike with a frame-perfect Counter-Parry Clash!`,
    stagger: `Just shattered ${enemyName}'s posture guard, leaving them reeling and exposed!`,
    execute: `Delivering the finishing blow to vanquish ${enemyName}!`,
  };

  const archetype = enemyArchetypeMap[enemyKind] ?? enemyArchetypeMap.wolf;
  const momentDesc = momentMap[moment] ?? momentMap.engage;
  const weaponNote = hasGun
    ? 'Wielding both serpent cultivation arts and a runic hand cannon in half-human form.'
    : 'Coiled in serpent form using fangs, venom breath, and tail strikes.';
  const avoidLine =
    recentList.length > 0
      ? `\nDo not repeat or closely echo these recent taunts:\n- ${recentList.join('\n- ')}`
      : '';

  return [
    `Speaker: Level ${level} ${stageTitle} (${realmName} realm). ${weaponNote}`,
    `Target Enemy: ${enemyName} (type: ${enemyKind}, faction: ${enemyFaction}${isBoss ? ', BOSS' : ''}) — ${archetype}.`,
    `Combat Moment: ${momentDesc} Climate: ${weather}.`,
    'Deliver one short, punchy combat taunt (5 to 11 words) mocking or challenging this specific enemy type.',
  ].join('\n') + avoidLine;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.post('/api/compliment', async (req: Request, res: Response) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Add it in Settings > Secrets to enable live compliments.',
      });
      return;
    }

    try {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as ComplimentRequestBody;
      const prompt = buildComplimentPrompt(body);

      const response = await ai.models.generateContent({
        model: COMPLIMENT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: COMPLIMENT_SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const rawText = (response.text ?? '').replace(/^["'“”]+|["'“”]+$/g, '').replace(/\s+/g, ' ').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'The model returned an empty compliment response.',
        });
        return;
      }

      res.json({
        compliment: rawText.slice(0, 180),
        model: COMPLIMENT_MODEL,
      });
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
          ? err.status
          : 500;
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to generate a compliment from Gemini.';
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  app.post('/api/taunt', async (req: Request, res: Response) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Add it in Settings > Secrets to enable live combat taunts.',
      });
      return;
    }

    try {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as TauntRequestBody;
      const prompt = buildTauntPrompt(body);

      const response = await ai.models.generateContent({
        model: COMPLIMENT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: TAUNT_SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const rawText = (response.text ?? '').replace(/^["'“”]+|["'“”]+$/g, '').replace(/\s+/g, ' ').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'The model returned an empty combat taunt response.',
        });
        return;
      }

      res.json({
        taunt: rawText.slice(0, 120),
        model: COMPLIMENT_MODEL,
      });
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
          ? err.status
          : 500;
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to generate a combat taunt from Gemini.';
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serpent Peaks server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Serpent Peaks server:', err);
  process.exit(1);
});
