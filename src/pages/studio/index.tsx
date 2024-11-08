import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FaCheckCircle, FaCopy, FaExclamationCircle } from "react-icons/fa";

const isValidAudioUrl = (url: string) => {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === "https:" && parsedUrl.hostname === "cdn.jaylen.nyc";
    } catch {
        return false;
    }
};

export default function AudioStudio() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { file } = router.query;

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<number>(0);
    const [endTime, setEndTime] = useState<number | null>(null);
    // const [offsetTime, setOffsetTime] = useState<number>(0);
    const [newAudioUrl, setNewAudioUrl] = useState<string | null>(null);
    const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (typeof file === "string" && isValidAudioUrl(file)) {
            setAudioUrl(file);
            setErrorMessage(null);
            console.log("Found file:", file);
        } else {
            console.error("Invalid audio URL.");
            setErrorMessage("Invalid audio URL. Please check the link and try again.");
        }
    }, [file]);

    const handleTrimAudio = async () => {
        if (!audioUrl || endTime === null || startTime >= endTime) {
            setErrorMessage("Please set a valid start and end time.");
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/AudioTrim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    audioUrl,
                    startTime,
                    endTime,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                setErrorMessage(`Error from the server: ${errorText}`);
                return;
            }

            const data = await response.json();
            if (data.success) {
                setNewAudioUrl(data.trimmedAudioUrl);
            } else {
                setErrorMessage("Audio trimming failed. Please try again.");
            }
        } catch (error) {
            console.error("Error trimming audio:", error);
            setErrorMessage("An error occurred while trimming the audio. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUploadNewAudio = async () => {
        if (!newAudioUrl) return;
        setIsUploading(true);
        setErrorMessage(null);

        try {
            const keyResponse = await fetch("/api/getKey");
            const { tixteApiKey } = await keyResponse.json();
            const audioResponse = await fetch(newAudioUrl);
            const audioBlob = await audioResponse.blob();
            const audioFile = new File([audioBlob], `Trimmed_Audio_${Date.now()}.mp3`, {
                type: "audio/mpeg",
            });

            const formData = new FormData();
            formData.append(
                "payload_json",
                JSON.stringify({
                    domain: "cdn.jaylen.nyc",
                    name: audioFile.name,
                }),
            );
            formData.append("file", audioFile);

            const uploadResponse = await fetch("https://api.tixte.com/v1/upload", {
                method: "POST",
                headers: { Authorization: tixteApiKey },
                body: formData,
            });

            const uploadData = await uploadResponse.json();
            if (uploadData.success) {
                setUploadedAudioUrl(uploadData.data.direct_url);
            } else {
                setErrorMessage("Failed to upload audio to Tixte.");
            }
        } catch (error) {
            console.error("Error uploading trimmed audio:", error);
            setErrorMessage("An error occurred while uploading the trimmed audio.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (uploadedAudioUrl) {
            navigator.clipboard.writeText(uploadedAudioUrl).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            });
        }
    };

    if (status === "loading") return <p className="text-white">Loading...</p>;

    if (!session) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-black to-gray-900 text-white">
                <Head>
                    <title>Unauthorized</title>
                </Head>
                <h1 className="mb-2 text-3xl font-extrabold">Audio Studio</h1>
                <p className="text-sm text-gray-400">Please authorize with Discord to continue.</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-black to-gray-900 text-white">
            <Head>
                <title>{audioUrl}</title>
            </Head>
            <h1 className="mb-6 text-4xl font-bold">Audio Studio</h1>
            <p className="mb-4 text-gray-400">Trim and offset your audio files with ease.</p>

            {errorMessage && (
                <div className="mb-4 flex items-center rounded bg-red-600 p-3 text-white">
                    <FaExclamationCircle className="mr-2" />
                    {errorMessage}
                </div>
            )}

            {audioUrl ? (
                <>
                    <audio
                        controls
                        src={audioUrl}
                        className="my-4 w-full max-w-md rounded-lg shadow-lg"
                    >
                        Your browser does not support the audio element.
                    </audio>

                    <div className="w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="start-time" className="text-gray-200">
                                Start Time (seconds)
                            </label>
                            <input
                                type="number"
                                id="start-time"
                                value={startTime}
                                min="0"
                                step="any"
                                className="w-24 rounded bg-gray-800 p-2"
                                onChange={e => setStartTime(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="end-time" className="text-gray-200">
                                End Time (seconds)
                            </label>
                            <input
                                type="number"
                                id="end-time"
                                value={endTime ?? ""}
                                min={startTime}
                                step="any"
                                className="w-24 rounded bg-gray-800 p-2"
                                onChange={e => setEndTime(parseFloat(e.target.value) || null)}
                            />
                        </div>

                        <button
                            onClick={handleTrimAudio}
                            disabled={isProcessing}
                            className={`mt-6 w-full rounded-lg py-3 text-center font-semibold ${
                                isProcessing ? "bg-gray-700" : "bg-blue-600 hover:bg-blue-500"
                            } text-white`}
                        >
                            {isProcessing ? "Processing..." : "Trim & Offset Audio"}
                        </button>

                        {newAudioUrl && (
                            <div className="mt-4">
                                <button
                                    onClick={handleUploadNewAudio}
                                    disabled={isUploading}
                                    className={`w-full rounded-lg px-4 py-3 text-center font-semibold ${
                                        isUploading
                                            ? "bg-gray-700"
                                            : "bg-gray-600 hover:bg-gray-500"
                                    } text-white`}
                                >
                                    {isUploading ? "Uploading..." : "Upload Processed Audio"}
                                </button>
                                <audio
                                    controls
                                    src={newAudioUrl}
                                    className="mt-4 w-full max-w-md rounded"
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        )}
                    </div>

                    {uploadedAudioUrl && (
                        <div className="mt-8">
                            <p className="text-gray-400">Uploaded Audio URL:</p>
                            <div className="flex items-center space-x-2 rounded bg-gray-800 p-3">
                                <span className="truncate text-white">{uploadedAudioUrl}</span>
                                <button
                                    onClick={handleCopyToClipboard}
                                    className="text-blue-500 hover:text-blue-300"
                                >
                                    {isCopied ? <FaCheckCircle /> : <FaCopy />}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <p className="text-gray-400">
                    No valid audio file provided. Please check the URL and try again.
                </p>
            )}
        </div>
    );
}
