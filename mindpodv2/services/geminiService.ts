import { DialogueLine, QuizQuestion, Flashcard } from '../types';

// Add declaration for the browser's LanguageModel API
declare const LanguageModel: any;
declare const pdfjsLib: any;


// --- File Content Extraction Utility ---

/**
 * Extracts text from a file, with special handling for PDFs.
 * @param file The file to read.
 * @returns A promise that resolves with the extracted text content.
 */
const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type.startsWith('text/')) {
        return file.text();
    }

    if (file.type === 'application/pdf') {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error("PDF processing library is not available.");
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let allText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // Join text items with a space, and separate pages with double newlines
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                allText += pageText + '\n\n';
            } catch(pageError) {
                console.warn(`Could not extract text from page ${i}:`, pageError);
                // Continue to next page
            }
        }
        return allText;
    }
    
    // For other types like images, we can't extract text.
    throw new Error(`Unsupported file type for text extraction: ${file.type}`);
};


// --- On-Device AI Session Management ---

let generalSession: any = null;
let voiceSession: any = null;

/**
 * Checks if the on-device AI model is available.
 */
const canUseOnDeviceAI = async (): Promise<boolean> => {
    if (!('LanguageModel' in self)) {
        return false;
    }
    try {
        const availability = await LanguageModel.availability();
        return availability === 'available';
    } catch (e) {
        console.error("Error checking on-device AI availability:", e);
        return false;
    }
};

/**
 * Creates a new AI session with a given system instruction.
 */
const createSession = async (systemInstruction: string) => {
    if (!await canUseOnDeviceAI()) {
        throw new Error("On-device AI is not available.");
    }
    return LanguageModel.create({
        initialPrompts: [{ role: 'system', content: systemInstruction }],
    });
};

/**
 * Retrieves or creates a singleton session for general tasks.
 */
const getGeneralSession = async () => {
    if (!generalSession) {
        generalSession = await createSession(
            "You are a helpful and versatile assistant for studying, note-taking, and creativity."
        );
    }
    return generalSession;
};

/**
 * Retrieves or creates a singleton session for the voice assistant persona.
 */
const getVoiceSession = async () => {
    if (!voiceSession) {
        voiceSession = await createSession(`You are MindPod Voice Assistant — a friendly, calm study companion.
        Your job is to respond briefly, clearly, and helpfully using speech output.
        Rules:
        - Keep answers under 2 sentences unless the user asks for more detail.
        - Use simple words, avoid technical jargon.
        - If you don't know the answer, say so.`);
    }
    return voiceSession;
}

/**
 * A helper to safely parse JSON from the AI's text response.
 * It removes markdown fences that the model might add.
 */
const parseJsonResponse = <T>(text: string): T => {
    const cleanedText = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    try {
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse JSON response from on-device AI:", cleanedText, e);
        throw new Error("The AI returned a response that was not valid JSON.");
    }
};


// --- API Function Implementations ---

export const generateStory = async (prompt: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve(`This is a mocked story about "${prompt}". Once upon a time, in a land of code, a developer wanted to test an API. They wrote a beautiful story, and everyone was happy. The end.`);
    }
    try {
        const session = await getGeneralSession();
        const fullPrompt = `Generate a short, coherent, and engaging story based on the following theme: "${prompt}". The story should have at least two characters with dialogue.`;
        return await session.prompt(fullPrompt);
    } catch (error) {
        console.error("Error generating story:", error);
        throw new Error("Failed to generate story from on-device AI.");
    }
};

export const askAboutStory = async (story: string, question: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve(`This is a mocked answer to your question: "${question}". The AI is currently offline, but it thinks the hero is very brave.`);
    }
    try {
        const session = await getGeneralSession();
        const fullPrompt = `Based on the following story, provide a concise answer to the user's question.

      --- STORY ---
      ${story}
      --- END STORY ---

      Question: "${question}"`;
        return await session.prompt(fullPrompt);
    } catch (error) {
        console.error("Error asking about story:", error);
        throw new Error("Failed to get an answer from the on-device AI.");
    }
};

export const askAboutDocument = async (documentFile: File, question: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve(`This is a mocked answer about the document for the question: "${question}".`);
    }

    try {
        const documentText = await extractTextFromFile(documentFile);

        const session = await getGeneralSession();
        const fullPrompt = `You are an expert document analyst. A user has provided the content of a document and is asking a question about it. Based ONLY on the content of the document provided, answer the user's question concisely. If the answer cannot be found in the document, state that clearly.

        --- DOCUMENT CONTENT ---
        ${documentText.substring(0, 8000)}
        --- END DOCUMENT CONTENT ---

        Question: "${question}"`;
        return await session.prompt(fullPrompt);
    } catch (error) {
        console.error("Error asking about document:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to get an answer about the document: ${message}`);
    }
};


export const generateScriptFromStory = async (story: string): Promise<DialogueLine[]> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve([
            { character: "Narrator", line: "This is a mocked skit." },
            { character: "Developer", line: "Did the API call work?" },
            { character: "AI", line: "No, but I have this lovely sample script for you!" },
        ]);
    }
    try {
        const session = await getGeneralSession();
        const prompt = `
      Analyze the following story and convert it into a structured script format.
      The output MUST be ONLY a valid JSON array of objects, with no other text or explanation.
      Each object in the array represents a line of dialogue or narration and must have two properties: "character" and "line".
      - "character": The name of the character speaking. If it's narration, use the character name "Narrator".
      - "line": The text of the dialogue or narration.
      Extract all dialogue and narration from the story in the correct order.

      Story:
      ---
      ${story}
      ---
    `;

        const result = await session.prompt(prompt);
        return parseJsonResponse<DialogueLine[]>(result);

    } catch (error) {
        console.error("Error generating script:", error);
        throw new Error("Failed to generate script from story.");
    }
};

export const generateQuiz = async (documentFile: File): Promise<QuizQuestion[]> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve([
            { question: "This is a mock question about the content.", options: ["Option A", "Option B", "Correct Option C", "Option D"], correctAnswer: "Correct Option C", explanation: "This is a mock explanation because the on-device AI is not available." },
            { question: "What is the main theme of the document?", options: ["Theme 1", "Theme 2", "Mock Theme 3", "Theme 4"], correctAnswer: "Mock Theme 3", explanation: "This is another mock explanation." },
        ]);
    }

    try {
        const context = await extractTextFromFile(documentFile);
        const session = await getGeneralSession();
        const prompt = `
      Based on the following text, generate a multiple-choice quiz with 3 to 5 questions.
      The output MUST be ONLY a valid JSON array of objects, with no other text or explanation.
      Each object must have four properties: "question" (string), "options" (an array of 4 strings), "correctAnswer" (one of the strings from the options array), and "explanation" (a brief explanation for why the answer is correct).

      Text context:
      ---
      ${context.substring(0, 8000)}
      ---
    `;

        const result = await session.prompt(prompt);
        return parseJsonResponse<QuizQuestion[]>(result);

    } catch (error) {
        console.error("Error generating quiz:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to generate quiz from the provided text: ${message}`);
    }
};

export const summarizeText = async (text: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve("This is a mocked summary because the on-device AI is offline.");
    }
    try {
        const session = await getGeneralSession();
        const prompt = `Summarize the following text concisely. Capture the main points in one or two short paragraphs. Text to summarize: \n\n---\n${text}\n---`;
        return await session.prompt(prompt);
    } catch (error) {
        console.error("Error summarizing text:", error);
        throw new Error("Failed to get summary from on-device AI.");
    }
};

export const suggestTitle = async (text: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve("Mocked Title");
    }
    try {
        const session = await getGeneralSession();
        const prompt = `Based on the following note content, suggest a short, descriptive title (5 words or less). Respond with only the title text, nothing else. Content: \n\n---\n${text}\n---`;
        const result = await session.prompt(prompt);
        return result.replace(/["*]/g, '').trim();
    } catch (error) {
        console.error("Error suggesting title:", error);
        throw new Error("Failed to get title suggestion from on-device AI.");
    }
};

export const generateNotesFromDocument = async (documentFile: File): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve("## Mocked Notes\n\n- This is a note generated because the AI is offline.\n- It highlights the key feature of mocking responses.");
    }
    try {
        const documentText = await extractTextFromFile(documentFile);
        const session = await getGeneralSession();
        const prompt = `
      You are an expert academic assistant. Your task is to analyze the following document content and create a concise, well-structured set of notes in Markdown format.

      Follow these instructions:
      1.  **Identify Key Information:** Extract the main ideas, key facts, definitions, critical arguments, and important findings.
      2.  **Use Bullet Points:** Structure the notes primarily using bullet points (\`-\`) and nested bullet points for clarity.
      3.  **Create Sections:** If the document has clear headings or topics, use Markdown headings (\`## Topic\`) to group related notes.
      4.  **Highlight Key Terms:** Emphasize important terms, definitions, or formulas by making them bold (\`**term**\`).
      5.  **Summarize:** Keep the notes concise and to the point. Paraphrase where necessary to avoid direct copying of long sentences.
      6.  **Do not invent information:** Base all notes strictly on the provided text.

      Document Content (first 8000 characters):
      ---
      ${documentText.substring(0, 8000)}
      ---
    `;

        return await session.prompt(prompt);
    } catch (error) {
        console.error("Error generating notes from document:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to generate notes from the document: ${message}`);
    }
};

export const highlightKeyPoints = async (text: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve("- This is a mocked key point.\n- Mocking is an important feature.");
    }
    try {
        const session = await getGeneralSession();
        const prompt = `Analyze the following text and extract the key points. Return them as a Markdown bulleted list. Text: \n\n---\n${text}\n---`;
        return await session.prompt(prompt);
    } catch (error) {
        console.error("Error highlighting key points:", error);
        throw new Error("Failed to get key points from on-device AI.");
    }
};

export const generateFlashcards = async (text: string): Promise<Flashcard[]> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve([
            { front: "What is a mock response?", back: "A simulated response from an API used for testing when the real API is not available." },
            { front: "Why is mocking useful?", back: "It allows for development and testing without relying on a live API connection or incurring costs." },
        ]);
    }
    try {
        const session = await getGeneralSession();
        const prompt = `
            Based on the following text, generate a set of 3-5 flashcards for studying.
            The output MUST be ONLY a valid JSON array of objects, with no other text or explanation.
            Each object must have two properties: "front" (for the question or term) and "back" (for the answer or definition).

            Text to analyze:
            ---
            ${text}
            ---
        `;
        const result = await session.prompt(prompt);
        return parseJsonResponse<Flashcard[]>(result);
    } catch (error) {
        console.error("Error generating flashcards:", error);
        throw new Error("Failed to generate flashcards from the text.");
    }
};

export const generateTasksFromDocument = async (documentFile: File): Promise<string[]> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve([
            "Read mocked introduction",
            "Review mocked key concepts",
            "Practice with mocked examples",
        ]);
    }
    try {
        const documentText = await extractTextFromFile(documentFile);
        const session = await getGeneralSession();
        const prompt = `
      Analyze the following document text and generate a list of 3-5 actionable study checkpoints or tasks for a student.
      The tasks should be concise and clear, helping the user to break down the material.
      Examples: "Read pages 1-5: Introduction to X", "Note 3 key differences between Y and Z", "Review inheritance examples".
      Return the output as ONLY a valid JSON array of strings, with no other text or explanation.

      Document Text (first 8000 characters):
      ---
      ${documentText.substring(0, 8000)}
      ---
    `;

        const result = await session.prompt(prompt);
        return parseJsonResponse<string[]>(result);

    } catch (error) {
        console.error("Error generating tasks:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to generate tasks from the document: ${message}`);
    }
};

export const generateCode = async (prompt: string, language: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve(`// Mocked ${language} code for: ${prompt}\nconsole.log("Hello from mocked code!");`);
    }
    try {
        const session = await getGeneralSession();
        const fullPrompt = `Generate a code snippet in ${language} based on the following prompt. Respond ONLY with the raw code, without any markdown formatting or explanations.
            
            Prompt: "${prompt}"`;
        return await session.prompt(fullPrompt);
    } catch (error) {
        console.error("Error generating code:", error);
        throw new Error("Failed to generate code from on-device AI.");
    }
};

export const explainCode = async (code: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve("This is a mocked explanation. The code appears to print a greeting to the console.");
    }
    try {
        const session = await getGeneralSession();
        const prompt = `Explain what the following code does, step by step. Provide a clear and concise explanation in Markdown format.
            
            Code:
            \`\`\`
            ${code}
            \`\`\``;
        return await session.prompt(prompt);
    } catch (error) {
        console.error("Error explaining code:", error);
        throw new Error("Failed to get explanation from on-device AI.");
    }
};

export const reviewCode = async (code: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve("## Mock Code Review\n\n- **Suggestion:** The code looks fine for a mock.\n- **Bugs:** No critical bugs found in the mocked code.");
    }
    try {
        const session = await getGeneralSession();
        const prompt = `Review the following code for potential bugs, errors, or improvements. Provide the feedback in Markdown format, highlighting suggestions for optimization and readability.
            
            Code:
            \`\`\`
            ${code}
            \`\`\``;
        return await session.prompt(prompt);
    } catch (error) {
        console.error("Error reviewing code:", error);
        throw new Error("Failed to get code review from on-device AI.");
    }
};

export const getVoiceAssistantReply = async (prompt: string): Promise<string> => {
    if (!await canUseOnDeviceAI()) {
        return Promise.resolve("I'm sorry, I'm running in offline mode and can't answer that question right now.");
    }
    try {
        const session = await getVoiceSession();
        return await session.prompt(prompt);
    } catch (error) {
        console.error("Error getting voice assistant reply:", error);
        return "I'm sorry, I encountered an error trying to respond.";
    }
};


export const getWordAssociation = async (previousWord: string, newWord: string): Promise<{ related: boolean; explanation: string; nextWord: string }> => {
    if (!await canUseOnDeviceAI()) {
        const isRelated = newWord.length > 0;
        return Promise.resolve({
            related: isRelated,
            explanation: isRelated ? "Nice one! That's a good connection." : "That seems a bit of a stretch.",
            nextWord: isRelated ? "Mock" : "",
        });
    }
    try {
        const session = await getGeneralSession();
        const prompt = `
      You are an AI for a word association game called "Word Weave". Your goal is to determine if two words are related and to provide the next word in the chain.

      The user was given the word: "${previousWord}".
      The user responded with the word: "${newWord}".

      Analyze the relationship. The connection can be semantic, thematic, phonetic, or creative, but it must be reasonable.

      Your response MUST be ONLY a valid JSON object with three properties, with no other text or explanation:
      1. "related": A boolean. \`true\` if a reasonable connection exists, \`false\` otherwise.
      2. "explanation": A very short, encouraging string (max 10 words). If related, praise the connection (e.g., "Nice one! That connects thematically."). If not, gently state why (e.g., "That seems a bit of a stretch.").
      3. "nextWord": If "related" is \`true\`, provide a new, single word that is related to "${newWord}". If "related" is \`false\`, this should be an empty string.
    `;

        const result = await session.prompt(prompt);
        return parseJsonResponse<{ related: boolean; explanation: string; nextWord: string }>(result);

    } catch (error) {
        console.error("Error getting word association:", error);
        throw new Error("Failed to get word association from on-device AI.");
    }
};