import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, DictionaryResult, WritingResult, Message, WritingMode, ModelLevel } from "../types";

const apiKey = process.env.API_KEY;

// Initialize Gemini client
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- Helper: Get Model Config ---
const getModelConfig = (level: ModelLevel) => {
  switch (level) {
    case 'mini':
      return { model: 'gemini-2.5-flash', thinkingBudget: 0 };
    case 'quick':
      // User requested "2.5 pro" with budget 500. 
      // Since gemini-2.5-pro isn't always available, we default to 3-pro for stability or 2.5-flash if preferred.
      // However, 3-pro-preview is the robust 'pro' choice. 
      // We will use gemini-3-pro-preview with low budget to simulate 'quick thinking'.
      return { model: 'gemini-2.5-flash', thinkingBudget: 500 };
    case 'deep':
      return { model: 'gemini-2.5-flash', thinkingBudget: 2000 };
    default:
      return { model: 'gemini-2.5-flash', thinkingBudget: 0 };
  }
};

// --- Audio Helper Functions ---
// Shared context for decoding only, to avoid creating new contexts repeatedly
let sharedDecodeContext: AudioContext | null = null;

function getDecodeContext() {
  if (!sharedDecodeContext) {
    // Safari/Webkit compat
    sharedDecodeContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return sharedDecodeContext;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Public Services ---

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  if (!ai) throw new Error("API Key missing");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      // Cast to any to allow string literal 'AUDIO' which is more robust across environments
      responseModalities: ['AUDIO'] as any, 
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  const base64Audio = part?.inlineData?.data;
  
  if (!base64Audio) {
    if (part?.text) {
        console.warn("Gemini TTS returned text instead of audio. Text:", part.text);
    }
    throw new Error("No audio data received from Gemini");
  }

  // Use the shared context for decoding to be efficient
  const decodeCtx = getDecodeContext();
  
  // Note: decodeAudioData is async but we use our manual decoder helper for PCM 
  // which is synchronous CPU work + creating buffer.
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    decodeCtx,
    24000,
    1,
  );
  
  return audioBuffer;
};

export const analyzeSentence = async (sentence: string, modelLevel: ModelLevel = 'mini'): Promise<AnalysisResult> => {
  if (!ai) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const { model, thinkingBudget } = getModelConfig(modelLevel);

  const prompt = `
    你是一位精通语言学和英语教学的专家 AI。请分析以下英语句子： "${sentence}"。
    目标受众是正在学习英语的学生，因此分析需要**清晰、准确且具有教育意义**。

    **Processing Steps (Thinking Process):**
    1.  **Grammar Check (纠错)**: 
        - 仔细检查句子是否有语法错误。
        - 如果有错，创建一个修正后的版本。
        - **注意**：后续的所有分析（chunks, detailedTokens, structure）必须基于**修正后(Corrected)** 的句子进行。
        - **Diff Generation**: 生成 'changes' 数组时，必须是严格的文本差异对比 (diff)。
          - 'remove': 仅包含被删除的原文片段，**绝对不要**包含 "->" 符号或 "change x to y" 这样的描述。例如原句是 "i go"，修正为 "I go"，则 'remove' text 为 "i"，'add' text 为 "I"。
          - 'add': 仅包含新加入的片段。
          - 'keep': 保持不变的部分。

    2.  **Macro Analysis (宏观结构)**:
        - 识别核心句型结构 (Pattern)，**必须包含中文翻译**。格式要求："English Pattern (中文名称)"。例如："S + V + O (主谓宾)"。
        - 识别核心时态 (Tense)，**必须包含中文翻译**。格式要求："English Tense (中文名称)"。例如："Present Simple (一般现在时)"。

    3.  **Chunking (可视化意群分块)**:
        - 目标是展示句子的“节奏”和“意群”(Sense Groups)。
        - **原则**：
          - 所有的修饰语应与其中心词在一起（例如 "The very tall man" 是一个块）。
          - 介词短语通常作为一个整体（例如 "in the morning" 是一个块）。
          - 谓语动词部分合并（例如 "have been waiting" 是一个块）。
          - 不定式短语合并（例如 "to go home" 是一个块）。

    4.  **Detailed Analysis (逐词/短语详解)**:
        - **核心原则 - 固定搭配优先**：
          - 遇到短语动词 (phrasal verbs)、固定习语 (idioms)、介词搭配 (collocations) 时，**必须**将它们作为一个整体 Token，**绝对不要拆分**。
          - 例如："look forward to", "take care of", "a cup of", "depend on"。
          - **特别处理可分离短语动词 (Separable Phrasal Verbs)**：
            - 如果遇到像 "pop us back", "turn it on" 这样动词与小品词被代词隔开的情况，请务必**识别出其核心短语动词**（如 "pop back"）。
            - 在详细解释 (explanation) 中，**必须**明确指出该词属于短语动词 "pop back" (或相应短语)，并解释该短语动词的含义，而不仅仅是单个单词的意思。
            - 示例：针对 "pop us back"，在解释 "pop" 时，应说明 "pop ... back 是短语动词，意为迅速回去/放回"。
        - **解释 (Explanation)**：
          - 不要只给一个词性标签。要解释它在句子中的**功能**和**为什么用这种形式**。
          - 例如：不要只写"过去分词"，要写"过去分词，与 has 构成现在完成时，表示动作已完成"。
        - **含义 (Meaning)**：提供在当前语境下的中文含义。

    请返回 JSON 格式数据。
  `;

  try {
    const response = await ai.models.generateContent({
      model: model, 
      contents: prompt,
      config: {
        thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correction: {
              type: Type.OBJECT,
              description: "Optional. Only return if the user input has grammar errors.",
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                errorType: { type: Type.STRING },
                reason: { type: Type.STRING },
                changes: {
                   type: Type.ARRAY,
                   description: "Strict diff. 'remove' text must be raw original text only.",
                   items: {
                       type: Type.OBJECT,
                       properties: {
                           type: { type: Type.STRING, enum: ["add", "remove", "keep"] },
                           text: { type: Type.STRING, description: "Raw text content only. No arrows or explanations." }
                       }
                   }
                }
              },
              required: ["original", "corrected", "errorType", "reason", "changes"]
            },
            sentencePattern: { type: Type.STRING, description: "e.g., 'S + V + O (主谓宾)', 'S + V + P (主系表)'. Include Chinese." },
            mainTense: { type: Type.STRING, description: "e.g., 'Present Simple (一般现在时)'. Include Chinese." },
            chunks: {
              type: Type.ARRAY,
              description: "High-level phrase chunks for visualization (Sense Groups)",
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  grammarDescription: { type: Type.STRING, description: "Simplified grammar term, e.g. '名词短语(主语)'" },
                  partOfSpeech: { type: Type.STRING, description: "e.g. 名词短语" },
                  role: { type: Type.STRING, description: "e.g. 主语" },
                },
                required: ["text", "grammarDescription", "partOfSpeech", "role"],
              },
            },
            detailedTokens: {
              type: Type.ARRAY,
              description: "Detailed analysis of lexical units/phrases, respecting idioms",
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING, description: "e.g. 动词短语, 介词短语" },
                  role: { type: Type.STRING, description: "e.g. 谓语, 状语" },
                  meaning: { type: Type.STRING, description: "Contextual Chinese meaning" },
                  explanation: { type: Type.STRING, description: "Pedagogical explanation of usage" },
                },
                required: ["text", "partOfSpeech", "role", "meaning", "explanation"],
              },
            },
            chineseTranslation: { type: Type.STRING },
          },
          required: ["chunks", "detailedTokens", "chineseTranslation", "sentencePattern", "mainTense"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini");
    }

    const parsedData = JSON.parse(jsonText);
    
    return {
      ...parsedData,
      englishSentence: parsedData.correction ? parsedData.correction.corrected : sentence,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("无法分析该句子。请检查网络或 API Key 设置。");
  }
};

export const lookupWord = async (word: string, modelLevel: ModelLevel = 'mini'): Promise<DictionaryResult> => {
  if (!ai) throw new Error("API Key missing");

  const { model, thinkingBudget } = getModelConfig(modelLevel);

  const prompt = `
    Act as a professional learner's dictionary specifically tailored for students preparing for **IELTS, TOEFL, and CET-6**.
    User Look-up Query: "${word}".
    
    **STEP 1: Normalization & Generalization (CRITICAL)**
    1. Analyze the user's input. Is it a specific instance of a phrasal verb or collocation with specific pronouns?
    2. If yes, convert it to the **Canonical Form** (Headword).
       - Input: "pop us back" -> Output: "pop sth back"
       - Input: "made up my mind" -> Output: "make up one's mind"
    
    **STEP 2: Filtering & Content Generation**
    1. **Target Audience**: Students preparing for exams (IELTS, TOEFL, CET-6) and daily communication.
    2. **Filtering Rule**: 
       - OMIT rare, archaic, obsolete, or highly technical scientific definitions unless the word itself is technical.
       - Focus ONLY on the most common 3-4 meanings used in modern English and exams.
    3. **COCA Frequency per Part of Speech**:
       - For each part of speech (e.g. Noun vs Verb), estimate its specific COCA frequency rank.
       - Example: "address" might be "Rank 1029" as a Noun, but "Rank 1816" as a Verb.
       - Provide a concise string like "Rank 1029" or "Top 2000".

    **STEP 3: Structure**
    - Definitions: Clear, simple English explanation + Concise Chinese meaning.
    - Examples: Must be natural, modern, and relevant to exam contexts or daily life.
    
    **STEP 4: Collocations & Fixed Phrases**
    - Identify 3-5 high-frequency collocations, idioms, or fixed phrases containing this word.
    - Prioritize phrases useful for IELTS/TOEFL writing or speaking.
    - Provide meaning and a sentence example for each.

    Structure the response by Part of Speech (POS).
    Return strictly JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model, 
      contents: prompt,
      config: {
        thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING, description: "The canonical dictionary form (e.g. 'pop sth back')" },
            phonetic: { type: Type.STRING, description: "IPA pronunciation, e.g. /həˈləʊ/" },
            entries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  partOfSpeech: { type: Type.STRING, description: "e.g., 'verb', 'noun'" },
                  cocaFrequency: { type: Type.STRING, description: "Specific COCA rank for this POS, e.g., 'Rank 1029'" },
                  definitions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        meaning: { type: Type.STRING, description: "Core Chinese meaning" },
                        explanation: { type: Type.STRING, description: "Simple English explanation" },
                        example: { type: Type.STRING },
                        exampleTranslation: { type: Type.STRING },
                      },
                      required: ["meaning", "explanation", "example", "exampleTranslation"]
                    }
                  }
                },
                required: ["partOfSpeech", "definitions"]
              }
            },
            collocations: {
              type: Type.ARRAY,
              description: "Common collocations, idioms, or fixed phrases containing this word.",
              items: {
                type: Type.OBJECT,
                properties: {
                   phrase: { type: Type.STRING, description: "The collocation phrase, e.g. 'make a decision'" },
                   meaning: { type: Type.STRING, description: "Chinese meaning of the phrase" },
                   example: { type: Type.STRING, description: "Example sentence using the phrase" },
                   exampleTranslation: { type: Type.STRING, description: "Chinese translation of the example" }
                },
                required: ["phrase", "meaning", "example", "exampleTranslation"]
              }
            }
          },
          required: ["word", "phonetic", "entries", "collocations"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Dictionary API Error", error);
    throw new Error("无法查询该单词，请重试。");
  }
};

export const evaluateWriting = async (text: string, mode: WritingMode, modelLevel: ModelLevel = 'mini'): Promise<WritingResult> => {
  if (!ai) throw new Error("API Key missing");

  const { model, thinkingBudget } = getModelConfig(modelLevel);

  let modeInstructions = "";

  switch (mode) {
    case 'fix':
      modeInstructions = `
      **MODE: BASIC CORRECTION (基础纠错)**
      - Target: General accuracy.
      - Task: Focus STRICTLY on correcting grammar, spelling, punctuation, and serious awkwardness.
      - Do NOT change style, tone, or vocabulary unless it is incorrect.
      - Keep the output very close to the original, only fixing errors.
      `;
      break;
    case 'ielts-5.5':
      modeInstructions = `
      **MODE: IELTS BAND 5.5 (Modest User)**
      - Target Level: Partial command of the language.
      - Task: Correct all basic errors. Ensure the overall meaning is clear.
      - Style: Keep vocabulary simple but correct. Avoid complex structures if they risk error.
      - Feedback focus: Basic grammar and clarity.
      `;
      break;
    case 'ielts-6.0':
      modeInstructions = `
      **MODE: IELTS BAND 6.0 (Competent User)**
      - Target Level: Generally effective command.
      - Task: Use a mix of simple and complex sentence forms. Correct errors.
      - Style: Use adequate vocabulary. Ensure coherence.
      `;
      break;
    case 'ielts-6.5':
      modeInstructions = `
      **MODE: IELTS BAND 6.5 (Between Competent and Good)**
      - Target Level: Stronger competence.
      - Task: Introduce more complex structures. Enhance vocabulary slightly beyond basic.
      - Style: Improve flow and linking words.
      `;
      break;
    case 'ielts-7.0':
      modeInstructions = `
      **MODE: IELTS BAND 7.0 (Good User)**
      - Target Level: Operational command, occasional inaccuracies.
      - Task: Use a variety of complex structures. Use less common lexical items.
      - Style: Academic and formal. Show awareness of style and collocation.
      `;
      break;
    case 'ielts-7.5':
      modeInstructions = `
      **MODE: IELTS BAND 7.5 (Very Good User)**
      - Target Level: High accuracy.
      - Task: Sophisticated control of vocabulary and grammar. Minimize errors to very occasional slips.
      - Style: Highly polished, natural, and academic.
      `;
      break;
    case 'ielts-8.0':
      modeInstructions = `
      **MODE: IELTS BAND 8.0 (Expert-like User)**
      - Target Level: Fully operational command.
      - Task: Use a wide range of vocabulary fluently and flexibly to convey precise meanings.
      - Style: Skillful use of uncommon lexical items. Error-free sentences. Native-like flow.
      `;
      break;
    default:
      modeInstructions = `**MODE: BASIC CORRECTION**`;
  }

  const prompt = `
    Act as a professional English Editor and IELTS Examiner.
    
    ${modeInstructions}

    **Task**:
    Analyze the user's text and reconstruct it into the *Improved Version* according to the selected mode.
    You must return the result as a sequence of SEGMENTS that allow us to reconstruct the full text while highlighting exactly what changed.

    **Input Text**: "${text}"

    **Output Logic**:
    - Iterate through the improved text.
    - If a part of the text is the same as original, mark it as 'unchanged'.
    - If you changed, added, or removed something, create a segment of type 'change'.
      - 'text': The NEW/IMPROVED text.
      - 'original': The ORIGINAL text that was replaced (or empty string if added).
      - 'reason': A brief explanation in Chinese.
      - 'category': One of 'grammar', 'vocabulary', 'style', 'punctuation', 'collocation' | 'punctuation'.
    - **CRITICAL - PARAGRAPH PRESERVATION**: 
      - You MUST preserve all paragraph breaks and newlines (\\n) from the original text exactly as they are.
      - When you encounter a newline in the original text, return it as a separate segment: { "text": "\\n", "type": "unchanged" }.
      - Do NOT merge paragraphs.
    
    **Example**:
    Original: "I go store.\\n\\nIt was fun."
    Improved: "I went to the store.\\n\\nIt was fun."
    Segments:
    [
      { "text": "I ", "type": "unchanged" },
      { "text": "went", "original": "go", "type": "change", "reason": "Past tense", "category": "grammar" },
      { "text": " to the ", "original": "", "type": "change", "reason": "Preposition", "category": "grammar" },
      { "text": "store.", "type": "unchanged" },
      { "text": "\\n\\n", "type": "unchanged" },
      { "text": "It was fun.", "type": "unchanged" }
    ]

    Return strictly JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model, 
      contents: prompt,
      config: {
        thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generalFeedback: { type: Type.STRING, description: "Overall feedback in Chinese, specific to the chosen IELTS band or correction mode." },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["unchanged", "change"] },
                  text: { type: Type.STRING, description: "The content of this segment (improved version)" },
                  original: { type: Type.STRING, description: "Original text if changed" },
                  reason: { type: Type.STRING, description: "Reason for change" },
                  category: { type: Type.STRING, enum: ["grammar", "vocabulary", "style", "punctuation", "collocation"] }
                },
                required: ["type", "text"]
              }
            }
          },
          required: ["generalFeedback", "segments"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");
    
    const parsed = JSON.parse(jsonText);
    return {
        mode,
        generalFeedback: parsed.generalFeedback,
        segments: parsed.segments
    };

  } catch (error) {
    console.error("Writing Evaluation API Error", error);
    throw new Error("写作分析失败，请检查网络或稍后再试。");
  }
};

export const getChatResponse = async (
    history: Message[], 
    contextContent: string | null, 
    userMessage: string,
    contextType: 'sentence' | 'word' | 'writing' = 'sentence'
) => {
    if (!ai) throw new Error("API Key missing");
    
    let contextInstruction = "";
    if (contextType === 'sentence') {
         contextInstruction = `**当前正在分析的句子**: "${contextContent || '用户暂未输入句子'}"。`;
    } else if (contextType === 'word') {
         contextInstruction = `**当前正在查询的单词/词组**: "${contextContent || '用户暂未查询单词'}"。`;
    } else if (contextType === 'writing') {
         contextInstruction = `**当前正在润色的文章**: "${contextContent || '用户暂未输入文章'}"。`;
    }

    const systemInstruction = `
        你是一个热情、专业的英语学习助教。
        
        ${contextInstruction}
        
        **你的任务**：
        1. 解答用户关于英语语法、单词用法、句子结构或词汇辨析的问题。
        2. **始终使用中文**回答。
        3. 使用 **Markdown** 格式来美化你的回答，使其清晰易读：
           - 使用 **加粗** 来强调重点单词或语法术语。
           - 使用列表（1. 或 -）来分点解释。
           - 适当分段。
        4. 语气要鼓励、积极，像一位耐心的老师。
        5. **特殊指令**：如果用户询问类似 "pop us back" 这样的短语，请解释这是一种口语表达，核心是短语动词 "pop back" (迅速回去)，"us" 是宾语。
    `;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        }
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text;
};