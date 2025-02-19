import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// SVG Arrow Icon for Send Button
const SendIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
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
	const [showLanding, setShowLanding] = useState(true); // Control landing page visibility
	const chatEndRef = useRef(null);

	// Auto-scroll to the bottom of the chat
	useEffect(() => {
		if (chatEndRef.current) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	const handleInputChange = (e) => {
		const text = e.target.value;
		setInputText(text);
		setWordCount(text.split(/\s+/).filter((word) => word.length > 0).length);
	};

	const detectLanguage = async (text) => {
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
	};

	const handleSend = async () => {
		if (!inputText.trim()) {
			setError("Please enter some text.");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			// Add user message to the chat
			setMessages((prev) => [
				...prev,
				{
					text: inputText,
					sender: "user",
					timestamp: new Date().toLocaleTimeString(),
				},
			]);

			// Detect Language
			await detectLanguage(inputText);
		} catch (err) {
			setError("An error occurred while processing your request.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSummarize = async () => {
		if (wordCount < 150) {
			setError("Summarize requires at least 150 words.");
			return;
		}

		// Summarizer API only supports English during the origin trial
		if (detectedLanguage !== "en") {
			setError(
				"Summarize only works for English text during the origin trial."
			);
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			if ("ai" in self && "summarizer" in self.ai) {
				const summarizer = await self.ai.summarizer.create();
				const summaryResult = await summarizer.summarize(inputText);

				// Add AI summary to the chat
				setMessages((prev) => [
					...prev,
					{
						text: summaryResult,
						sender: "ai",
						timestamp: new Date().toLocaleTimeString(),
					},
				]);
			}
		} catch (err) {
			setError("An error occurred while summarizing the text.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleTranslate = async () => {
		if (!inputText.trim()) {
			setError("Please enter some text to translate.");
			return;
		}

		// Detect language if not already detected
		if (!detectedLanguage) {
			await detectLanguage(inputText);
		}

		// If translating to the same language, return the input text
		if (detectedLanguage === selectedLanguage) {
			setMessages((prev) => [
				...prev,
				{
					text: inputText,
					sender: "ai",
					timestamp: new Date().toLocaleTimeString(),
				},
			]);
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			if ("ai" in self && "translator" in self.ai) {
				const translator = await self.ai.translator.create({
					sourceLanguage: detectedLanguage || "en", // Fallback to English if no language is detected
					targetLanguage: selectedLanguage,
				});
				const translationResult = await translator.translate(inputText);

				// Add AI translation to the chat
				setMessages((prev) => [
					...prev,
					{
						text: translationResult,
						sender: "ai",
						timestamp: new Date().toLocaleTimeString(),
					},
				]);
			}
		} catch (err) {
			setError("An error occurred while translating the text.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClear = () => {
		setInputText("");
		setMessages([]);
		setDetectedLanguage("");
		setError("");
		setWordCount(0);
	};

	const handleGetStarted = () => {
		setShowLanding(false); // Hide landing page and show the app
	};

	return (
		<div className="app">
			{showLanding ? (
				<div className="landing-page">
					<div className="hero-section">
						<h1>AI-Powered Text Processing</h1>
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
						<p>© 2023 AI Text Processor. All rights reserved.</p>
					</div>
				</div>
			) : (
				<>
					<h1>AI-Powered Text Processing</h1>
					<div className="chat-interface">
						<div className="chat-window">
							{messages.map((msg, index) => (
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
										<p className="typing-indicator">AI is typing...</p>
									</div>
								</div>
							)}
							<div ref={chatEndRef}></div>
						</div>
						<div className="input-area">
							<div className="textarea-container">
								<textarea
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
							<button onClick={handleClear} disabled={isLoading}>
								Clear
							</button>
						</div>
						{error && <div className="error-message">{error}</div>}
					</div>
				</>
			)}
		</div>
	);
};

export default App;
