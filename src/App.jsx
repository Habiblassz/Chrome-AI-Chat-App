import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from "react";
import "./App.css";

const SendIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 27 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round">
		<line x1="22" y1="2" x2="11" y2="13"></line>
		<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
	</svg>
);

const App = () => {
	const [inputText, setInputText] = useState("");
	const [messages, setMessages] = useState([]);
	const [detectedLanguage, setDetectedLanguage] = useState("");
	const [selectedLanguage, setSelectedLanguage] = useState("en");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [wordCount, setWordCount] = useState(0);
	const [showLanding, setShowLanding] = useState(true);
	const [browserSupported, setBrowserSupported] = useState(true);
	const chatEndRef = useRef(null);
	const textareaRef = useRef(null);

	useEffect(() => {
		const userAgent = navigator.userAgent;
		const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
		if (!isChrome) {
			setBrowserSupported(false);
		}
	}, []);

	useEffect(() => {
		if (chatEndRef.current) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	useEffect(() => {
		if (!showLanding && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [showLanding]);

	const handleInputChange = (e) => {
		const text = e.target.value;
		setInputText(text);
		setWordCount(text.split(/\s+/).filter((word) => word.length > 0).length);
	};

	const detectLanguage = useCallback(async (text) => {
		if (!text.trim()) return;

		try {
			if ("ai" in self && "languageDetector" in self.ai) {
				const languageDetector = await self.ai.languageDetector.create();
				const detectionResults = await languageDetector.detect(text);
				setDetectedLanguage(detectionResults[0].detectedLanguage);
			}
		} catch (err) {
			setError("An error occurred while detecting the language.");
		}
	}, []);

	const handleSend = useCallback(async () => {
		if (!inputText.trim()) {
			setError("Please enter some text.");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const timestamp = new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
			setMessages((prev) => [
				...prev,
				{
					text: inputText,
					sender: "user",
					timestamp,
				},
			]);

			await detectLanguage(inputText);
			setInputText("");
			setWordCount(0);
		} catch (err) {
			setError("An error occurred while processing your request.");
		} finally {
			setIsLoading(false);
		}
	}, [inputText, detectLanguage]);

	const handleSummarize = useCallback(async () => {
		if (wordCount < 150) {
			setError("Summarize requires at least 150 words.");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			// Ensure language detection is complete
			await detectLanguage(inputText);

			// Fallback: If detectedLanguage is not "en", check for common English words
			if (detectedLanguage !== "en") {
				const commonEnglishWords = [
					"the",
					"and",
					"of",
					"to",
					"a",
					"in",
					"that",
					"it",
					"is",
					"was",
				];
				const isLikelyEnglish = commonEnglishWords.some((word) =>
					inputText.toLowerCase().includes(word)
				);

				if (isLikelyEnglish) {
					setDetectedLanguage("en");
				} else {
					setError(
						"Summarize only works for English text during the origin trial."
					);
					return;
				}
			}

			// Proceed with summarization
			if ("ai" in self && "summarizer" in self.ai) {
				const summarizer = await self.ai.summarizer.create();
				const summaryResult = await summarizer.summarize(inputText);

				const timestamp = new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
				setMessages((prev) => [
					...prev,
					{
						text: summaryResult,
						sender: "ai",
						timestamp,
					},
				]);
				setInputText("");
				setWordCount(0);
			}
		} catch (err) {
			setError("An error occurred while summarizing the text.");
		} finally {
			setIsLoading(false);
		}
	}, [inputText, wordCount, detectedLanguage, detectLanguage]);

	useEffect(() => {
		if (detectedLanguage && inputText.trim()) {
			handleTranslate();
		}
	}, [detectedLanguage]);

	const handleTranslate = useCallback(async () => {
		if (!inputText.trim()) {
			setError("Please enter some text to translate.");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			// Ensure language detection is complete
			if (!detectedLanguage) {
				await detectLanguage(inputText);
			}

			// Fallback: If detectedLanguage is still not set, assume English
			const sourceLang = detectedLanguage || "en";

			// Check if source and target languages are the same
			if (sourceLang === selectedLanguage) {
				const timestamp = new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
				setMessages((prev) => [
					...prev,
					{
						text: inputText,
						sender: "ai",
						timestamp,
					},
				]);
				setInputText("");
				setWordCount(0);
				return;
			}

			// Proceed with translation
			if ("ai" in self && "translator" in self.ai) {
				// Check if the language pair is supported
				const translatorCapabilities = await self.ai.translator.capabilities();
				const languagePairSupport =
					translatorCapabilities.languagePairAvailable(
						sourceLang,
						selectedLanguage
					);

				if (languagePairSupport === "no") {
					setError(
						`Translation from ${sourceLang} to ${selectedLanguage} is not supported.`
					);
					return;
				}

				// Create the translator
				const translator = await self.ai.translator.create({
					sourceLanguage: sourceLang,
					targetLanguage: selectedLanguage,
					monitor(m) {
						m.addEventListener("downloadprogress", (e) => {
							console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
						});
					},
				});

				// Translate the text
				const translationResult = await translator.translate(inputText);

				// Display the final translation
				const timestamp = new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
				setMessages((prev) => [
					...prev,
					{
						text: translationResult,
						sender: "ai",
						timestamp,
					},
				]);
				setInputText("");
				setWordCount(0);
			}
		} catch (err) {
			setError("An error occurred while translating the text.");
		} finally {
			setIsLoading(false);
		}
	}, [inputText, detectedLanguage, selectedLanguage, detectLanguage]);

	const handleClear = useCallback(() => {
		setInputText("");
		setMessages([]);
		setDetectedLanguage("");
		setError("");
		setWordCount(0);
	}, []);

	const handleGetStarted = useCallback(() => {
		setShowLanding(false);
	}, []);

	const formattedMessages = useMemo(() => {
		return messages.map((msg) => ({
			...msg,
			timestamp: msg.timestamp,
		}));
	}, [messages]);

	return (
		<div className="app">
			{showLanding ? (
				<div className="landing-page">
					<div className="hero-section">
						<h1>ChatterMorph</h1>
						<p>Summarize, translate, and detect languages with ease.</p>
						<button onClick={handleGetStarted}>Get Started</button>
					</div>
					<div className="features-section">
						<h2>Key Features</h2>
						<div className="feature-cards">
							<div className="feature-card">
								<h3>Summarize</h3>
								<p>Condense long texts into concise summaries.</p>
							</div>
							<div className="feature-card">
								<h3>Translate</h3>
								<p>Translate text into multiple languages.</p>
							</div>
							<div className="feature-card">
								<h3>Language Detection</h3>
								<p>Detect the language of any text.</p>
							</div>
						</div>
					</div>
					<div className="footer">
						<p>© 2025 ChatterMorph. All rights reserved.</p>
					</div>
				</div>
			) : (
				<div className="chat-container">
					<h1>ChatterMorph</h1>
					<div className="chat-interface">
						<div className="chat-window">
							{formattedMessages.map((msg, index) => (
								<div
									key={index}
									className={`message ${
										msg.sender === "user" ? "user-message" : "ai-message"
									}`}>
									<div className="message-content">
										<p>{msg.text}</p>
										<span className="timestamp">{msg.timestamp}</span>
									</div>
								</div>
							))}
							{isLoading && (
								<div className="message ai-message">
									<div className="message-content">
										<div className="typing-indicator">
											<span className="dot"></span>
											<span className="dot"></span>
											<span className="dot"></span>
										</div>
									</div>
								</div>
							)}
							<div ref={chatEndRef}></div>
						</div>
						<div className="input-area">
							<div className="textarea-container">
								<textarea
									ref={textareaRef}
									value={inputText}
									onChange={handleInputChange}
									placeholder="Type your message..."
									disabled={isLoading}
								/>
								<button
									className="send-button"
									onClick={handleSend}
									disabled={isLoading}>
									<SendIcon />
								</button>
							</div>
							<div className="word-count">Words: {wordCount}</div>
						</div>
						<div className="actions">
							<select
								value={selectedLanguage}
								onChange={(e) => setSelectedLanguage(e.target.value)}
								disabled={isLoading}>
								<option value="en">English</option>
								<option value="pt">Portuguese</option>
								<option value="es">Spanish</option>
								<option value="ru">Russian</option>
								<option value="tr">Turkish</option>
								<option value="fr">French</option>
							</select>
							<button onClick={handleTranslate} disabled={isLoading}>
								Translate
							</button>
							<button
								onClick={handleSummarize}
								disabled={isLoading || wordCount < 150}>
								Summarize
							</button>
							<button
								onClick={handleClear}
								className="clear"
								disabled={isLoading}>
								Clear
							</button>
						</div>
						{!browserSupported && (
							<div className="error-message1">
								Your browser is not supported. Please use Chrome for the best
								experience.
							</div>
						)}
						{error && <div className="error-message">{error}</div>}
					</div>
				</div>
			)}
		</div>
	);
};

export default App;
